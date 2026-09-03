import { Component, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

function readReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function readDarkMode() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function useMediaPreference(query, read) {
  const [matches, setMatches] = useState(() => read())

  useEffect(() => {
    const media = window.matchMedia(query)
    const update = () => setMatches(media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [query])

  return matches
}

function heightAt(x, z) {
  const ridge = Math.exp(-((x + 0.9) ** 2 * 0.23 + (z - 0.2) ** 2 * 0.55)) * 1.55
  const shoulder = Math.exp(-((x - 2.4) ** 2 * 0.5 + (z + 1.2) ** 2 * 0.8)) * 0.82
  const grain = Math.sin(x * 1.35) * 0.14 + Math.cos(z * 1.7) * 0.12 + Math.sin((x + z) * 2.2) * 0.06
  return ridge + shoulder + grain - 0.45
}

function Terrain({ active, dark }) {
  const group = useRef(null)
  const { invalidate } = useThree()

  const terrain = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(9.5, 7, 54, 42)
    const positions = geometry.attributes.position

    for (let index = 0; index < positions.count; index += 1) {
      const x = positions.getX(index)
      const y = positions.getY(index)
      positions.setZ(index, heightAt(x, y))
    }

    positions.needsUpdate = true
    geometry.computeVertexNormals()
    return geometry
  }, [])

  const routeGeometry = useMemo(() => {
    const points = [
      [-3.4, -2.3],
      [-2.15, -1.3],
      [-0.75, -0.25],
      [0.25, 0.9],
      [1.65, 1.55],
      [3.1, 2.25],
    ].map(([x, z]) => new THREE.Vector3(x, heightAt(x, z) + 0.12, z))
    const curve = new THREE.CatmullRomCurve3(points)
    return new THREE.TubeGeometry(curve, 84, 0.035, 8, false)
  }, [])

  useEffect(() => {
    invalidate()
    return () => {
      terrain.dispose()
      routeGeometry.dispose()
    }
  }, [invalidate, routeGeometry, terrain])

  useFrame((state, delta) => {
    if (!active || !group.current) return
    const targetX = -0.12 + state.pointer.y * 0.045
    const targetZ = state.pointer.x * 0.055
    group.current.rotation.x = THREE.MathUtils.damp(group.current.rotation.x, targetX, 3.5, delta)
    group.current.rotation.z = THREE.MathUtils.damp(group.current.rotation.z, targetZ, 3.5, delta)
  })

  return (
    <group ref={group} rotation={[-0.12, 0, 0]}>
      <mesh geometry={terrain} rotation={[-Math.PI / 2, 0, 0]}>
        <meshStandardMaterial color={dark ? '#253443' : '#cbd9e8'} roughness={0.92} metalness={0.02} />
      </mesh>
      <mesh geometry={terrain} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.018, 0]}>
        <meshBasicMaterial color={dark ? '#54769b' : '#7897b7'} wireframe transparent opacity={0.32} />
      </mesh>
      <mesh geometry={routeGeometry}>
        <meshBasicMaterial color={dark ? '#72a6e8' : '#245fa8'} />
      </mesh>
    </group>
  )
}

class SceneBoundary extends Component {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    if (this.state.failed) {
      return <p className="route-map__error">Terrengmodellen er ikke tilgjengelig på denne enheten.</p>
    }
    return this.props.children
  }
}

export default function FieldMapCanvas() {
  const host = useRef(null)
  const [active, setActive] = useState(true)
  const reduced = useMediaPreference('(prefers-reduced-motion: reduce)', readReducedMotion)
  const dark = useMediaPreference('(prefers-color-scheme: dark)', readDarkMode)
  const hasWebGL = typeof WebGLRenderingContext !== 'undefined'

  useEffect(() => {
    const node = host.current
    if (!node) return undefined
    const observer = new IntersectionObserver(([entry]) => setActive(entry.isIntersecting), {
      rootMargin: '120px 0px',
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  if (!hasWebGL) {
    return <p className="route-map__error">Terrengmodellen krever WebGL.</p>
  }

  return (
    <div className="route-map__canvas" ref={host}>
      <SceneBoundary>
        <Canvas
          camera={{ position: [0, 5.2, 7.7], fov: 34, near: 0.1, far: 40 }}
          dpr={[1, 1.45]}
          frameloop={active && !reduced ? 'always' : 'demand'}
          gl={{ antialias: false, powerPreference: 'high-performance', alpha: true }}
        >
          <ambientLight intensity={dark ? 1.1 : 1.45} />
          <directionalLight position={[-4, 7, 5]} intensity={dark ? 2.5 : 2.1} color="#d9e7f5" />
          <Terrain active={active && !reduced} dark={dark} />
        </Canvas>
      </SceneBoundary>
    </div>
  )
}

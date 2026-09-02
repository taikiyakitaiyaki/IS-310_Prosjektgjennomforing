import { Suspense, useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { team } from '../../Model/site.js'

const ROUTE_POINTS = [
  [-4.8, -4.8],
  [-3.1, -2.7],
  [-1.4, -1.05],
  [0.5, 1.2],
  [2.7, 3.65],
]

function terrainHeight(x, y) {
  const summit = Math.exp(-Math.pow(x * 0.33, 2)) * 1.54
  const leftShoulder = Math.exp(-Math.pow((x + 3.2) * 0.54, 2)) * 0.65
  const rightShoulder = Math.exp(-Math.pow((x - 2.5) * 0.64, 2)) * 0.44
  const grain = Math.sin(x * 1.72 + y * 0.48) * 0.13 + Math.cos(y * 1.24 - x * 0.38) * 0.09
  return (summit + leftShoulder + rightShoulder + grain) * (0.3 + (y + 6) / 11.5)
}

function buildTerrain(lowPower) {
  const geometry = new THREE.PlaneGeometry(16, 12, lowPower ? 48 : 76, lowPower ? 36 : 56)
  const position = geometry.attributes.position
  for (let i = 0; i < position.count; i += 1) {
    position.setZ(i, terrainHeight(position.getX(i), position.getY(i)))
  }
  geometry.computeVertexNormals()
  return geometry
}

function buildRoute() {
  const points = ROUTE_POINTS.map(([x, y]) => new THREE.Vector3(x, y, terrainHeight(x, y) + 0.1))
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 72, 0.026, 5, false)
}

function buildParticles(count) {
  const data = new Float32Array(count * 3)
  for (let i = 0; i < count; i += 1) {
    data[i * 3] = (Math.random() - 0.5) * 17
    data[i * 3 + 1] = Math.random() * 7 - 1.5
    data[i * 3 + 2] = (Math.random() - 0.5) * 11
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(data, 3))
  return geometry
}

function AlpineField({ lowPower, reduced }) {
  const field = useRef(null)
  const snow = useRef(null)
  const peaks = useRef(null)
  const terrain = useMemo(() => buildTerrain(lowPower), [lowPower])
  const routeLine = useMemo(buildRoute, [])
  const particles = useMemo(() => buildParticles(lowPower ? 140 : 360), [lowPower])

  useEffect(() => () => {
    terrain.dispose()
    routeLine.dispose()
    particles.dispose()
  }, [terrain, routeLine, particles])

  useFrame((state, delta) => {
    const scrollable = Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
    const target = Math.min(1, window.scrollY / scrollable)
    if (field.current) {
      field.current.rotation.z = THREE.MathUtils.damp(
        field.current.rotation.z,
        reduced ? -0.035 : -0.035 + state.pointer.x * 0.042,
        3,
        delta,
      )
      field.current.position.z = THREE.MathUtils.damp(field.current.position.z, -2.8 + target * 2.1, 2.4, delta)
      field.current.position.x = THREE.MathUtils.damp(field.current.position.x, state.pointer.x * 0.22, 2.2, delta)
    }
    if (snow.current && !reduced) snow.current.rotation.y += delta * 0.016
    if (peaks.current) {
      peaks.current.rotation.y = THREE.MathUtils.damp(peaks.current.rotation.y, target * 0.42, 2.2, delta)
      peaks.current.position.y = THREE.MathUtils.damp(peaks.current.position.y, -0.65 + target * 0.95, 2.2, delta)
    }
    state.camera.position.x = THREE.MathUtils.damp(state.camera.position.x, state.pointer.x * 0.42, 2.4, delta)
    state.camera.position.y = THREE.MathUtils.damp(state.camera.position.y, 2.7 + target * 0.75, 2.4, delta)
    state.camera.lookAt(0, 0.15, -1.25)
  })

  return (
    <>
      <color attach="background" args={['#04060c']} />
      <fog attach="fog" args={['#04060c', 6.5, 18]} />
      <ambientLight intensity={0.66} />
      <directionalLight position={[-4, 7, 4]} color="#b9d3ee" intensity={2.15} />
      <pointLight position={[5, 2, 2]} color="#ff5a1e" intensity={16} distance={9} />

      <group ref={field} rotation={[-Math.PI / 2, 0, -0.035]} position={[0, -2.3, -2.8]}>
        <mesh geometry={terrain}>
          <meshStandardMaterial color="#0b1728" roughness={0.94} metalness={0.1} />
        </mesh>
        <mesh geometry={terrain} position={[0, 0, 0.015]}>
          <meshBasicMaterial color="#6fd6e8" wireframe transparent opacity={0.22} />
        </mesh>
        <mesh geometry={routeLine}>
          <meshBasicMaterial color="#ff5a1e" toneMapped={false} />
        </mesh>
        {ROUTE_POINTS.slice(1).map(([x, y], index) => (
          <mesh key={`${x}-${y}`} position={[x, y, terrainHeight(x, y) + 0.12]}>
            <sphereGeometry args={[0.07 + index * 0.012, 10, 10]} />
            <meshBasicMaterial color={index === 3 ? '#eef4fb' : '#ff5a1e'} toneMapped={false} />
          </mesh>
        ))}
      </group>

      <group ref={peaks} position={[0, -0.65, -4.8]}>
        {team.members.map((member, index) => (
          <mesh
            key={member.id}
            position={[(index - 2) * 0.82, Math.abs(index - 2) * -0.1, Math.abs(index - 2) * -0.24]}
            rotation={[0, (member.seed % 31) * 0.03, 0]}
            scale={[0.7 + (member.seed % 9) * 0.02, 0.8 + (member.seed % 11) * 0.035, 0.7]}
          >
            <coneGeometry args={[0.34, 1.28, 5, 2]} />
            <meshStandardMaterial
              color={index === 2 ? '#dcebf8' : '#4f6f91'}
              roughness={0.82}
              flatShading
              transparent
              opacity={0.6}
            />
          </mesh>
        ))}
      </group>

      {!reduced && (
        <points ref={snow} geometry={particles}>
          <pointsMaterial color="#eef4fb" size={0.018} transparent opacity={0.42} sizeAttenuation />
        </points>
      )}
    </>
  )
}

export default function ExpeditionCanvas({ profile, active }) {
  return (
    <Canvas
      dpr={profile.lowPower ? 1 : [1, 1.5]}
      camera={{ position: [0, 2.8, 7.7], fov: 42, near: 0.1, far: 32 }}
      frameloop={profile.reduced || !active ? 'demand' : 'always'}
      gl={{ antialias: !profile.lowPower, alpha: false, powerPreference: 'high-performance' }}
      fallback={<div className="webgl-fallback" />}
    >
      <Suspense fallback={null}>
        <AlpineField lowPower={profile.lowPower} reduced={profile.reduced} />
      </Suspense>
    </Canvas>
  )
}

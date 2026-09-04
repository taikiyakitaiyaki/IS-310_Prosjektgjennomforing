import { Component, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useMotion } from '../lib/motion.jsx'
import { mix, usePalette, WHITE } from '../lib/palette.js'
import { flatRoute, HEIGHT_FIELD, ridgeHeight } from '../lib/terrain.js'

/* ===========================================================================
   Ambisjonsnivå: the ridge, and the route up it.

   A contour map of a single peak that develops as the section scrolls in, and
   a route line that draws itself all the way to the summit - the section's own
   claim, made in the same landscape the landing scene opens with.

   The camera also orbits the summit with the pointer, so the ridge turns as the
   visitor moves across it.

   The scene lives entirely inside its section: one WebGL context, mounted only
   once the section is near, and rendering only while it is on screen. It reads
   the pointer from the window and never accepts an event on its own canvas, so
   it cannot swallow a click or a scroll.
   =========================================================================== */

const PLANE_WIDTH = 18
const PLANE_DEPTH = 13

/* Segment counts only shape the silhouette. The contour lines come from the
   height field itself, so they stay crisp on the low-power profile too. */
const TERRAIN_SEGMENTS = { full: [132, 96], low: [76, 56] }
const ROUTE_SEGMENTS = { full: [240, 8], low: [130, 6] }

const CONTOUR_BANDS = 8
const ROUTE_RADIUS = 0.045

const TERRAIN_VERTEX = /* glsl */ `
  ${HEIGHT_FIELD}

  varying vec2 vField;
  varying vec3 vSurfaceNormal;
  varying vec2 vPlaneUv;
  varying float vDepth;

  void main() {
    vec2 field = position.xz;

    /* The normal comes from the field's own slope rather than from the mesh, so
       the shading does not coarsen along with the segment count. */
    float eps = 0.06;
    float slopeX = ridgeHeight(field + vec2(eps, 0.0)) - ridgeHeight(field - vec2(eps, 0.0));
    float slopeZ = ridgeHeight(field + vec2(0.0, eps)) - ridgeHeight(field - vec2(0.0, eps));

    vField = field;
    vPlaneUv = uv;
    vSurfaceNormal = normalize(vec3(-slopeX, 2.0 * eps, -slopeZ));

    vec4 viewPosition = modelViewMatrix * vec4(position.x, position.y + ridgeHeight(field), position.z, 1.0);
    vDepth = -viewPosition.z;

    gl_Position = projectionMatrix * viewPosition;
  }
`

const TERRAIN_FRAGMENT = /* glsl */ `
  ${HEIGHT_FIELD}

  uniform vec3 uFill;
  uniform vec3 uLine;
  uniform vec3 uSummit;
  uniform float uBands;
  uniform float uReveal;
  uniform vec2 uHaze;

  varying vec2 vField;
  varying vec3 vSurfaceNormal;
  varying vec2 vPlaneUv;
  varying float vDepth;

  void main() {
    /* Re-read the height per pixel instead of interpolating it across the
       triangle: the isolines are then the field's real level sets rather than a
       faceted approximation of them. */
    float height = ridgeHeight(vField);

    float band = height * uBands + 0.5;
    float fraction = fract(band);
    float slope = fwidth(band);

    /* Distance to the nearest band edge, measured in pixels, gives a contour of
       even weight everywhere on screen and antialiases it for free. The floor on
       the slope matters: on ground that is both nearly flat and sitting right on
       a band edge the ratio is otherwise indeterminate, and a whole patch smears
       into a blot instead of drawing a line. */
    float pixels = min(fraction, 1.0 - fraction) / max(slope, 0.015);
    float major = 1.0 - step(0.5, mod(floor(band), 5.0));
    float weight = mix(0.85, 1.75, major);
    float line = 1.0 - smoothstep(weight, weight + 1.15, pixels);

    /* Where a pixel spans most of a band the lines are closer together than the
       screen can resolve, and drawing them anyway only produces moiré. Let them
       dissolve into the ground tone instead. */
    line *= 1.0 - smoothstep(0.24, 0.62, slope);

    /* And a contour means nothing on ground with no slope to it: at a summit or
       a hollow that happens to sit level with a band, the level set is a patch
       rather than a line. Fade those out by how steep the ground actually is. */
    float steepness = length(vSurfaceNormal.xz) / max(vSurfaceNormal.y, 1e-4);
    line *= smoothstep(0.02, 0.085, steepness);

    float light = clamp(dot(normalize(vSurfaceNormal), normalize(vec3(-0.42, 0.86, 0.34))), 0.0, 1.0);
    vec3 ground = mix(uFill, uSummit, smoothstep(0.74, 1.06, height));

    /* Distance haze, so the map thins out into its own horizon rather than
       stopping at whatever edge the section crops it to. */
    float haze = 1.0 - smoothstep(uHaze.x, uHaze.y, vDepth);

    /* A backstop for the sheet's real edges, in case a viewport ever frames
       wide enough to reach them. */
    float frame = smoothstep(0.0, 0.04, vPlaneUv.x) * smoothstep(1.0, 0.96, vPlaneUv.x)
                * smoothstep(0.0, 0.04, vPlaneUv.y) * smoothstep(1.0, 0.96, vPlaneUv.y);

    float groundAlpha = 0.05 + 0.2 * light;
    float lineAlpha = line * mix(0.32, 0.62, major);
    float alpha = max(groundAlpha, lineAlpha) * frame * haze * uReveal;

    if (alpha < 0.002) discard;

    gl_FragColor = vec4(mix(ground, uLine, line), alpha);
  }
`

const ROUTE_VERTEX = /* glsl */ `
  varying vec2 vTubeUv;
  varying float vDepth;

  void main() {
    vTubeUv = uv;

    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    vDepth = -viewPosition.z;

    gl_Position = projectionMatrix * viewPosition;
  }
`

/* A tube's u runs along its length, which is all the drawing needs: everything
   past the current progress is simply not there yet. */
const ROUTE_FRAGMENT = /* glsl */ `
  uniform vec3 uLine;
  uniform vec3 uSummit;
  uniform float uRoute;
  uniform float uReveal;
  uniform vec2 uHaze;

  varying vec2 vTubeUv;
  varying float vDepth;

  void main() {
    if (vTubeUv.x > uRoute) discard;

    float head = smoothstep(uRoute - 0.045, uRoute, vTubeUv.x);

    /* Fade the first stretch in rather than showing the tube's blunt end: the
       route should come up out of the low ground, not begin at a cut. */
    float tail = smoothstep(0.0, 0.07, vTubeUv.x);

    /* The same haze as the ground it is drawn on, so the line never outlives
       the terrain underneath it. */
    float haze = 1.0 - smoothstep(uHaze.x, uHaze.y, vDepth);
    float alpha = uReveal * haze * tail * (0.9 + 0.1 * head);

    gl_FragColor = vec4(mix(uLine, uSummit, head * 0.85), alpha);
  }
`

function buildTerrain([columns, rows]) {
  const geometry = new THREE.PlaneGeometry(PLANE_WIDTH, PLANE_DEPTH, columns, rows)
  geometry.rotateX(-Math.PI / 2)
  return geometry
}

function buildRoute([tubular, radial]) {
  const flat = flatRoute()

  /* Resample the flat path densely and lift every sample onto the surface. Six
     control points interpolated in 3D would cut straight through the shoulders
     between them; this keeps the line on the ground the whole way up. */
  const samples = 180
  const onSurface = []
  for (let index = 0; index <= samples; index += 1) {
    const point = flat.getPoint(index / samples)
    onSurface.push(new THREE.Vector3(point.x, ridgeHeight(point.x, point.z) + 0.05, point.z))
  }

  const climb = new THREE.CatmullRomCurve3(onSurface, false, 'centripetal')
  return new THREE.TubeGeometry(climb, tubular, ROUTE_RADIUS, radial, false)
}

/* --------------------------------------------------------------------------
   Framing. The scene sits in a band whose aspect ratio runs from roughly 4:1 on
   a desktop to 1:1 on a phone, so the camera is placed by how much of the ridge
   it should show rather than by a fixed position.
   -------------------------------------------------------------------------- */

/* Tilted rather than overhead: a map seen flat on loses the ridge's silhouette,
   and with it the depth gradient the haze needs to find a horizon. Around forty
   degrees keeps both, and the contour shader handles what compresses at range. */
const FRAME_START = {
  target: new THREE.Vector3(0.95, 0, 0.95),
  direction: new THREE.Vector3(0.14, 0.8, 1).normalize(),
  zoom: 1.12,
}

const FRAME_END = {
  target: new THREE.Vector3(-0.45, 0.3, 0.35),
  direction: new THREE.Vector3(-0.05, 0.95, 0.86).normalize(),
  zoom: 0.95,
}

const UP = new THREE.Vector3(0, 1, 0)

/* How far the pointer may swing the camera around the ridge, in radians. Wide
   enough that the peak visibly turns against the plain behind it, short of the
   point where the map starts to feel like it is being dragged around. */
const ORBIT_YAW = 0.2
const ORBIT_PITCH = 0.11
const MIN_ELEVATION = 0.42
const MAX_ELEVATION = 1.28

/* How much ground the frame should hold. A portrait canvas has to be framed by
   depth instead of width - fitting a landscape's worth of width into a narrow
   frame pushes the camera so far back that the ridge becomes a detail. */
const SHOWN_DEPTH = 12

function shownWidth(aspect) {
  return THREE.MathUtils.lerp(9.5, 14, THREE.MathUtils.clamp((aspect - 0.9) / 2, 0, 1))
}

function cameraDistance(fov, aspect, zoom) {
  const halfHeight = Math.tan(THREE.MathUtils.degToRad(fov) / 2)
  const forWidth = (shownWidth(aspect) * zoom) / 2 / (halfHeight * aspect)
  const forDepth = (SHOWN_DEPTH * zoom) / 2 / halfHeight
  return Math.min(forWidth, forDepth)
}

/* The ridge takes the site colours and derives its own three from them: a
   faint ground tone, the accent for the contours, and a light cap for the top
   of the mountain. */
function ridgePalette({ surface, text, accent }) {
  const fill = mix(surface, text, 0.16)
  return { fill, line: accent, summit: mix(fill, WHITE, 0.62) }
}

function Ridge({ active, host, lowPower, palette, still }) {
  const { invalidate } = useThree()

  const scene = useMemo(() => {
    const uniforms = {
      uFill: { value: new THREE.Vector3() },
      uLine: { value: new THREE.Vector3() },
      uSummit: { value: new THREE.Vector3() },
      uBands: { value: CONTOUR_BANDS },
      uReveal: { value: 0 },
      uRoute: { value: 0 },
      uHaze: { value: new THREE.Vector2(12, 26) },
    }

    return {
      uniforms,
      terrainGeometry: buildTerrain(lowPower ? TERRAIN_SEGMENTS.low : TERRAIN_SEGMENTS.full),
      routeGeometry: buildRoute(lowPower ? ROUTE_SEGMENTS.low : ROUTE_SEGMENTS.full),
      terrainMaterial: new THREE.ShaderMaterial({
        uniforms,
        vertexShader: TERRAIN_VERTEX,
        fragmentShader: TERRAIN_FRAGMENT,
        transparent: true,
        side: THREE.DoubleSide,
      }),
      /* Depth-tested but not depth-writing, and drawn after the surface, so the
         stretches of route that run behind the ridge stay behind it. */
      routeMaterial: new THREE.ShaderMaterial({
        uniforms,
        vertexShader: ROUTE_VERTEX,
        fragmentShader: ROUTE_FRAGMENT,
        transparent: true,
        depthWrite: false,
      }),
    }
  }, [lowPower])

  useEffect(
    () => () => {
      scene.terrainGeometry.dispose()
      scene.routeGeometry.dispose()
      scene.terrainMaterial.dispose()
      scene.routeMaterial.dispose()
    },
    [scene],
  )

  useEffect(() => {
    scene.uniforms.uFill.value.copy(palette.fill)
    scene.uniforms.uLine.value.copy(palette.line)
    scene.uniforms.uSummit.value.copy(palette.summit)
    invalidate()
  }, [invalidate, palette, scene])

  const progress = useRef(0)
  const target = useRef(0)
  const snap = useRef(true)
  const client = useRef({ x: 0, y: 0, present: false })
  const pointer = useRef({ x: 0, y: 0 })
  const eased = useRef({ x: 0, y: 0 })
  const lookAt = useMemo(() => new THREE.Vector3(), [])
  const direction = useMemo(() => new THREE.Vector3(), [])
  const scratch = useMemo(
    () => ({
      forward: new THREE.Vector3(),
      right: new THREE.Vector3(),
      up: new THREE.Vector3(),
      ray: new THREE.Vector3(),
      hit: new THREE.Vector3(),
    }),
    [],
  )

  /* Reduced motion pins the drawing to its finished state: still, but never
     absent. Otherwise the section's position is read fresh every rendered
     frame, in the frame loop below, rather than from a scroll listener. */
  useEffect(() => {
    if (!still) return
    target.current = 1
    snap.current = true
    invalidate()
  }, [invalidate, still])

  /* Nothing was rendered while the section was away, so catch up in one step
     rather than easing from a state the visitor never saw. */
  useEffect(() => {
    if (!active) {
      snap.current = true
      return
    }
    invalidate()
  }, [active, invalidate])

  useEffect(() => {
    if (!active || still) return undefined

    /* A mouse, not a finger: on a touch screen the last tap would leave the
       ridge stuck at whatever angle it was pushed to. */
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return undefined

    /* Store the raw position and normalise it against the canvas in the frame
       loop instead of here - reading layout on every pointer event costs a
       reflow per event, and once per rendered frame is enough. */
    const move = (event) => {
      client.current.x = event.clientX
      client.current.y = event.clientY
      client.current.present = true
    }

    /* Let the ridge settle back to the framing the scroll chose when the
       pointer leaves the page entirely, or the window loses focus. */
    const release = (event) => {
      if (event.type === 'blur' || !event.relatedTarget) client.current.present = false
    }

    window.addEventListener('pointermove', move, { passive: true })
    document.addEventListener('pointerout', release, { passive: true })
    window.addEventListener('blur', release)
    return () => {
      window.removeEventListener('pointermove', move)
      document.removeEventListener('pointerout', release)
      window.removeEventListener('blur', release)
      /* Forget the last position on the way out, so scrolling back to the
         section does not snap it to an angle set minutes ago. */
      client.current.present = false
    }
  }, [active, client, still])

  useFrame((state, delta) => {
    /* A tab returning from the background hands back one enormous delta. */
    const step = Math.min(delta, 0.05)

    const node = host.current

    /* Where the section sits, mapped from the moment its top edge enters at
       the bottom of the viewport (0) to the moment that edge reaches the top
       of it (1). Deliberately not measured against the section leaving the
       viewport: this is the last section on the page, so "leaving" is a
       position scrolling can never reach and the route would stop halfway up
       the mountain. The section is a full viewport tall (see .topic--scene),
       which is what makes the top of this range reachable.

       Read from the section's own rectangle against the viewport the page is
       actually shown in - inside an embed, the embed's - and read here, once
       per rendered frame, rather than on every scroll event. */
    if (!still && node) {
      const section = node.closest('section') || node
      const rect = section.getBoundingClientRect()
      const viewport = window.innerHeight || 1
      target.current = THREE.MathUtils.clamp((viewport - rect.top) / viewport, 0, 1)
    }

    /* Where the pointer sits relative to the middle of the map, -1 to 1 on each
       axis. Measured against the canvas rather than the window so the ridge
       answers to the pointer's position over itself, and held at neutral when
       there is no pointer on the page at all. */
    if (client.current.present && node) {
      const rect = node.getBoundingClientRect()
      if (rect.width > 1 && rect.height > 1) {
        pointer.current.x = THREE.MathUtils.clamp(
          (client.current.x - (rect.left + rect.width / 2)) / (rect.width / 2),
          -1,
          1,
        )
        pointer.current.y = THREE.MathUtils.clamp(
          (client.current.y - (rect.top + rect.height / 2)) / (rect.height / 2),
          -1,
          1,
        )
      }
    } else {
      pointer.current.x = 0
      pointer.current.y = 0
    }

    if (snap.current) {
      progress.current = target.current
      eased.current.x = pointer.current.x
      eased.current.y = pointer.current.y
      snap.current = false
    } else {
      progress.current = THREE.MathUtils.damp(progress.current, target.current, 4.5, step)
      eased.current.x = THREE.MathUtils.damp(eased.current.x, pointer.current.x, 3.6, step)
      eased.current.y = THREE.MathUtils.damp(eased.current.y, pointer.current.y, 3.6, step)
    }

    /* The scene sits in the lower part of a section that is a viewport tall, so
       nothing of it is on screen until the section is roughly half way up. The
       drawing is paced to that, and finishes a little before the page bottom. */
    const shown = progress.current
    scene.uniforms.uReveal.value = THREE.MathUtils.smoothstep(shown, 0.42, 0.7)
    scene.uniforms.uRoute.value = THREE.MathUtils.smoothstep(shown, 0.52, 0.92)

    const rise = THREE.MathUtils.smoothstep(shown, 0.4, 0.98)
    const aspect = state.size.width / Math.max(state.size.height, 1)
    const camera = state.camera

    lookAt.lerpVectors(FRAME_START.target, FRAME_END.target, rise)
    direction.copy(FRAME_START.direction).lerp(FRAME_END.direction, rise).normalize()

    /* Swing the camera around the ridge to follow the pointer. Done in polar
       terms on purpose: it orbits the summit instead of sliding past it, which
       is what makes the peak and the plain move against each other and read as
       depth, and it leaves the distance the scroll chose untouched. The
       elevation is clamped so the view can never drop below the ground or tip
       over the top of the mountain, whatever the pointer does. */
    const azimuth = Math.atan2(direction.x, direction.z) + eased.current.x * ORBIT_YAW
    const elevation = THREE.MathUtils.clamp(
      Math.asin(THREE.MathUtils.clamp(direction.y, -1, 1)) - eased.current.y * ORBIT_PITCH,
      MIN_ELEVATION,
      MAX_ELEVATION,
    )
    const flat = Math.cos(elevation)
    direction.set(flat * Math.sin(azimuth), Math.sin(elevation), flat * Math.cos(azimuth))

    const zoom = THREE.MathUtils.lerp(FRAME_START.zoom, FRAME_END.zoom, rise)
    const distance = cameraDistance(camera.fov, aspect, zoom)

    camera.position.copy(lookAt).addScaledVector(direction, distance)
    camera.lookAt(lookAt)

    /* Put the haze exactly where the ground leaves the top of the frame, rather
       than at a guessed multiple of the camera distance: trace the top edge of
       the view down to the ground and fade out just before it. Otherwise the
       terrain meets the top of the canvas as a cut line, and the framing moves
       enough during the scroll that no fixed range covers it. */
    scratch.forward.copy(direction).negate()
    scratch.right.crossVectors(scratch.forward, UP).normalize()
    scratch.up.crossVectors(scratch.right, scratch.forward).normalize()
    scratch.ray
      .copy(scratch.forward)
      .addScaledVector(scratch.up, Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2))
      .normalize()

    let horizon = distance * 2.2
    if (scratch.ray.y < -1e-3) {
      scratch.hit.copy(camera.position).addScaledVector(scratch.ray, -camera.position.y / scratch.ray.y)
      horizon = scratch.hit.sub(camera.position).dot(scratch.forward)
    }

    scene.uniforms.uHaze.value.set(horizon * 0.62, horizon * 0.99)
  })

  return (
    <>
      <mesh
        geometry={scene.terrainGeometry}
        material={scene.terrainMaterial}
        frustumCulled={false}
        renderOrder={0}
      />
      <mesh
        geometry={scene.routeGeometry}
        material={scene.routeMaterial}
        frustumCulled={false}
        renderOrder={1}
      />
    </>
  )
}

/* The map is decoration. If this device cannot draw it, the section reads
   perfectly well without it. */
class SceneBoundary extends Component {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    return this.state.failed ? null : this.props.children
  }
}

/* Hoisted, not inlined: a fresh object here on every render makes the canvas
   re-apply its camera, context and pixel ratio, and each of those schedules a
   frame - including while the section is off screen and should be idle. */
const CAMERA = { fov: 30, near: 0.1, far: 80, position: [0, 8, 12] }
const CONTEXT = { alpha: true, antialias: true, powerPreference: 'high-performance', stencil: false }
const DPR_RANGE = [1, 1.6]
/* The canvas sets pointer-events on itself, so refuse them here rather than
   relying on the wrapper's inherited none. */
const CANVAS_STYLE = { pointerEvents: 'none' }

function hasWebGL2() {
  try {
    return Boolean(document.createElement('canvas').getContext('webgl2'))
  } catch {
    return false
  }
}

export default function RidgeCanvas() {
  const host = useRef(null)
  const { still, lowPower } = useMotion()
  const [active, setActive] = useState(false)
  const [supported] = useState(hasWebGL2)
  const colours = usePalette()
  const palette = useMemo(() => ridgePalette(colours), [colours])

  useEffect(() => {
    const node = host.current
    if (!node) return undefined

    const observer = new IntersectionObserver(([entry]) => setActive(entry.isIntersecting), {
      rootMargin: '15% 0px',
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  if (!supported) return null

  return (
    <div className="ridge" ref={host}>
      <SceneBoundary>
        <Canvas
          camera={CAMERA}
          dpr={lowPower ? 1 : DPR_RANGE}
          frameloop={active && !still ? 'always' : 'demand'}
          gl={CONTEXT}
          style={CANVAS_STYLE}
        >
          <Ridge active={active} host={host} lowPower={lowPower} palette={palette} still={still} />
        </Canvas>
      </SceneBoundary>
    </div>
  )
}

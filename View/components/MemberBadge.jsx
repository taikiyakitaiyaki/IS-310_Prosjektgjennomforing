import { Component, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { members, site } from '../../Model/site.js'
import { cx } from '../lib/cx.js'

/* ===========================================================================
   A member's badge on a lanyard, in 3D - the kind of card each of them wears
   at Kartverket: their photo, name and role on the front, the group on the
   back. It drops in from above and swings into place; a hand can take it and
   fling it, and a press turns it over. A strip of foil and a glare catch the
   light as it turns.

   The lanyard is a chain of points held to its length (Verlet integration)
   and the card one more point hanging from its end, so the drop, the swing,
   the throw and the settling are all the same few lines of physics - no
   physics engine. The card is one quad with one shader: its rounded corners,
   the slot the clip goes through, front or back by which side faces the
   camera, the foil and the glare. Frames are only drawn while it moves; a
   badge hanging still costs nothing.
   =========================================================================== */

/* The card, in the scene's units: an upright badge, 2:3. */
const CARD = { width: 1, height: 1.5, radius: 0.07 }
const BLEED = 0.02
/* The slot near the top the clip goes through, from the card's top edge. */
const SLOT = { from: 0.085, halfWidth: 0.11, halfHeight: 0.022 }
/* The card's face is drawn this many pixels across. */
const FACE = { width: 1024, height: 1536 }

/* The lanyard: fixed above the top of the stage, LINKS points down to the
   clip, the card hanging HANG below the clip on the stiff metal of it. */
const ANCHOR = new THREE.Vector2(0, 2.7)
const LINKS = 9
const ROPE = 1.95
const SEG = ROPE / LINKS
const CLIP = 0.14
const HANG = CLIP + CARD.height / 2 - SLOT.from
const BAND = 0.13

/* The physics: one step is 1/120 s, a frame takes as many as it needs. The
   card weighs more than the lanyard, so it leads and the band follows. */
const STEP = 1 / 120
const GRAVITY = 16
const ITERATIONS = 14
/* The air it moves through: thin while it swings, so a throw carries, and
   thicker as it slows - like friction at the clip - so the last small
   swings die away quickly instead of going on for seconds. Speeds are per
   step, in the scene's units. */
const DAMPING = { swinging: 0.985, settling: 0.95, from: 0.0005, to: 0.006 }
/* How readily it turns about its own upright axis - a little more than once
   back and forth before it faces you again, steadier as it comes to rest. */
const TURN = { stiffness: 26, damping: 3.4, settling: 9, push: 2.2 }

const CAMERA = { position: [0, 0.1, 4.8], rotation: [0, 0, 0], fov: 30, near: 0.1, far: 30 }
const CONTEXT = { alpha: true, antialias: true, depth: true, stencil: false, powerPreference: 'low-power' }
const FONT = 'Manrope, system-ui, sans-serif'
const GREEN = '#2f5130'
const PAPER = '#f6f4ef'
const NIGHT = '#191b21'

const VERTEX = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const FRAGMENT = /* glsl */ `
  uniform sampler2D uFront;
  uniform sampler2D uBack;
  varying vec2 vUv;
  varying vec3 vNormal;

  float roundedBox(vec2 p, vec2 halfSize, float radius) {
    vec2 q = abs(p) - halfSize + radius;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - radius;
  }

  void main() {
    vec2 size = vec2(${CARD.width.toFixed(3)}, ${CARD.height.toFixed(3)});
    vec2 quad = size + ${(2 * BLEED).toFixed(3)};
    vec2 p = (vUv - 0.5) * quad;
    vec2 uv = p / size + 0.5;

    /* The card's outline, and the slot punched through it for the clip. */
    float d = roundedBox(p, size * 0.5, ${CARD.radius.toFixed(3)});
    float slot = roundedBox(p - vec2(0.0, size.y * 0.5 - ${SLOT.from.toFixed(3)}),
      vec2(${SLOT.halfWidth.toFixed(3)}, ${SLOT.halfHeight.toFixed(3)}), ${SLOT.halfHeight.toFixed(3)});
    float edge = fwidth(d);
    float alpha = (1.0 - smoothstep(-edge, edge, d)) * smoothstep(-edge, edge, slot);
    if (alpha < 0.02) discard;

    /* Seen from behind, the back is read the right way round. */
    vec3 n = normalize(gl_FrontFacing ? vNormal : -vNormal);
    vec2 face = gl_FrontFacing ? uv : vec2(1.0 - uv.x, uv.y);
    vec4 tex = gl_FrontFacing ? texture2D(uFront, face) : texture2D(uBack, face);
    vec3 color = tex.rgb;

    /* Foil wherever the face is left part-transparent: a rainbow that runs
       across it and shifts as the card turns. */
    float foil = 1.0 - tex.a;
    float hue = fract(face.x * 0.9 + face.y * 0.6 + n.x * 1.3 + n.y * 0.9);
    vec3 rainbow = 0.55 + 0.45 * cos(6.28318 * (hue + vec3(0.0, 0.33, 0.67)));
    color = mix(color, color * 0.55 + rainbow * 0.6, foil);

    /* A glare that sweeps across as it turns, a darker rim for an edge, and
       a little less light the further it turns from you. */
    float glare = 1.0 - smoothstep(0.0, 0.2, abs(face.x * 0.8 + face.y * 0.6 - 0.75 - n.x * 0.9));
    color += glare * 0.1;
    color *= mix(0.82, 1.0, smoothstep(0.0, 0.014, -d));
    color *= 0.78 + 0.22 * abs(n.z);

    gl_FragColor = vec4(color, alpha);
    #include <colorspace_fragment>
  }
`

const initials = (name) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .filter((letter) => /\p{Lu}/u.test(letter))
    .slice(0, 2)
    .join('')

function canvas(width, height) {
  const node = document.createElement('canvas')
  node.width = width
  node.height = height
  return [node, node.getContext('2d')]
}

function roundRect(context, x, y, width, height, radius) {
  context.beginPath()
  context.roundRect(x, y, width, height, radius)
}

/* Text set to fit `room` pixels across, starting at `size`. */
function fit(context, text, weight, size, room) {
  let px = size
  context.font = `${weight} ${px}px ${FONT}`
  while (px > 16 && context.measureText(text).width > room) {
    px -= 2
    context.font = `${weight} ${px}px ${FONT}`
  }
}

/* The foil strip: drawn, then made part-transparent - the shader reads that
   transparency as foil. */
function foilStrip(context, y, label, dark) {
  const { width } = FACE
  roundRect(context, 88, y, width - 176, 74, 18)
  context.fillStyle = dark ? '#2a2e36' : '#dcd8cf'
  context.fill()
  context.fillStyle = dark ? 'rgba(255,255,255,0.7)' : 'rgba(25,27,33,0.7)'
  context.font = `700 26px ${FONT}`
  context.letterSpacing = '8px'
  context.textAlign = 'center'
  context.fillText(label, width / 2, y + 47)
  context.letterSpacing = '0px'
  context.globalCompositeOperation = 'destination-out'
  roundRect(context, 88, y, width - 176, 74, 18)
  context.fillStyle = 'rgba(0,0,0,0.55)'
  context.fill()
  context.globalCompositeOperation = 'source-over'
}

/* The front: the group's band, the photo, who they are, the foil. */
function drawFront(person, photo) {
  const [node, context] = canvas(FACE.width, FACE.height)
  const { width } = FACE
  const name = person.fullName ?? person.name

  context.fillStyle = PAPER
  context.fillRect(0, 0, width, FACE.height)
  context.fillStyle = GREEN
  context.fillRect(0, 0, width, 300)

  context.fillStyle = '#ffffff'
  context.textAlign = 'left'
  context.font = `800 84px ${FONT}`
  context.letterSpacing = '10px'
  context.fillText(site.name, 88, 236)
  context.letterSpacing = '4px'
  context.textAlign = 'right'
  context.font = `600 30px ${FONT}`
  context.globalAlpha = 0.8
  context.fillText(site.courseCode, width - 88, 200)
  context.fillText(site.group.toUpperCase(), width - 88, 240)
  context.globalAlpha = 1
  context.letterSpacing = '0px'

  /* The photo, cropped to fill its frame, in from the edges. */
  const frame = { x: 212, y: 344, width: 600, height: 800 }
  roundRect(context, frame.x, frame.y, frame.width, frame.height, 28)
  context.save()
  context.clip()
  context.fillStyle = '#d8d3c8'
  context.fillRect(frame.x, frame.y, frame.width, frame.height)
  if (photo) {
    const scale = Math.max(frame.width / photo.naturalWidth, frame.height / photo.naturalHeight)
    const w = photo.naturalWidth * scale
    const h = photo.naturalHeight * scale
    context.drawImage(photo, frame.x + (frame.width - w) / 2, frame.y + (frame.height - h) / 2, w, h)
  } else {
    context.fillStyle = '#9b958a'
    context.textAlign = 'center'
    context.font = `800 220px ${FONT}`
    context.fillText(initials(name), width / 2, frame.y + frame.height / 2 + 80)
  }
  context.restore()

  context.textAlign = 'center'
  context.fillStyle = NIGHT
  fit(context, name, 800, 70, width - 176)
  context.fillText(name, width / 2, 1236)
  if (person.role) {
    context.fillStyle = '#4d4942'
    fit(context, person.role, 500, 38, width - 176)
    context.fillText(person.role, width / 2, 1296)
  }
  if (person.study) {
    context.fillStyle = '#7a756c'
    fit(context, person.study, 500, 28, width - 176)
    context.fillText(person.study, width / 2, 1342)
  }

  foilStrip(context, 1392, members.detail.badgeMember.toUpperCase(), false)
  return node
}

/* The back: their initials large, and the group the card belongs to. */
function drawBack(person) {
  const [node, context] = canvas(FACE.width, FACE.height)
  const { width, height } = FACE
  const name = person.fullName ?? person.name

  context.fillStyle = NIGHT
  context.fillRect(0, 0, width, height)
  context.strokeStyle = 'rgba(255,255,255,0.035)'
  context.lineWidth = 2
  for (let x = -height; x < width; x += 36) {
    context.beginPath()
    context.moveTo(x, height)
    context.lineTo(x + height, 0)
    context.stroke()
  }
  context.fillStyle = GREEN
  context.fillRect(0, 0, width, 300)

  context.textAlign = 'center'
  context.fillStyle = '#ffffff'
  context.font = `800 84px ${FONT}`
  context.letterSpacing = '10px'
  context.fillText(site.name, width / 2 + 5, 236)
  context.letterSpacing = '0px'

  context.font = `800 340px ${FONT}`
  context.lineWidth = 4
  context.strokeStyle = 'rgba(255,255,255,0.22)'
  context.strokeText(initials(name), width / 2, 860)

  context.fillStyle = 'rgba(255,255,255,0.85)'
  fit(context, name, 700, 54, width - 176)
  context.fillText(name, width / 2, 1060)
  context.fillStyle = 'rgba(255,255,255,0.55)'
  context.font = `500 30px ${FONT}`
  context.fillText(`${site.group} · ${site.course}`, width / 2, 1116)

  foilStrip(context, 1392, site.name, true)
  return node
}

/* The lanyard's band: the group's name along it, over and over. */
function drawBand() {
  const [node, context] = canvas(1024, 128)
  context.fillStyle = GREEN
  context.fillRect(0, 0, 1024, 128)
  context.fillStyle = 'rgba(246,244,239,0.92)'
  context.font = `800 54px ${FONT}`
  context.letterSpacing = '12px'
  context.textAlign = 'center'
  context.fillText(`${site.name}  ·`, 256, 84)
  context.fillText(`${site.name}  ·`, 768, 84)
  return node
}

/* Brushed metal for the clip, as a matcap: no lights needed. */
function drawMetal() {
  const [node, context] = canvas(256, 256)
  const gradient = context.createRadialGradient(96, 84, 10, 128, 128, 140)
  gradient.addColorStop(0, '#ffffff')
  gradient.addColorStop(0.35, '#c9ccd2')
  gradient.addColorStop(0.75, '#6f747d')
  gradient.addColorStop(1, '#2b2e33')
  context.fillStyle = gradient
  context.fillRect(0, 0, 256, 256)
  return node
}

/* A soft round shadow for the wall behind the card. */
function drawShadow() {
  const [node, context] = canvas(128, 128)
  const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64)
  gradient.addColorStop(0, 'rgba(0,0,0,0.55)')
  gradient.addColorStop(1, 'rgba(0,0,0,0)')
  context.fillStyle = gradient
  context.fillRect(0, 0, 128, 128)
  return node
}

function texture(node, anisotropy) {
  const map = new THREE.CanvasTexture(node)
  map.colorSpace = THREE.SRGBColorSpace
  map.anisotropy = anisotropy
  return map
}

/* --- The physics ----------------------------------------------------------- */

function restingPose() {
  const points = Array.from({ length: LINKS + 1 }, (_, i) => new THREE.Vector2(ANCHOR.x, ANCHOR.y - SEG * i))
  const card = points[LINKS].clone().add(new THREE.Vector2(0, -HANG))
  return { points, card }
}

/* Lifted up and out to the side, taut and at rest: let go, it swings down
   into place. */
function liftedPose() {
  const direction = new THREE.Vector2(0.82, 0.57)
  const points = Array.from({ length: LINKS + 1 }, (_, i) => ANCHOR.clone().addScaledVector(direction, SEG * i))
  const card = points[LINKS].clone().addScaledVector(direction, HANG)
  return { points, card }
}

function settle(motion, pose) {
  motion.points = pose.points
  motion.prev = pose.points.map((point) => point.clone())
  motion.card = pose.card
  motion.cardPrev = pose.card.clone()
  motion.spin = 0
  motion.calm = 0
  motion.asleep = false
}

/* Keep two points `length` apart, each moving its share of the way. A
   lanyard can go slack, so its links only ever pull; the clip is stiff. */
function keep(a, b, length, shareA, shareB, slack) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const distance = Math.hypot(dx, dy) || 1e-6
  if (slack && distance <= length) return
  const k = (distance - length) / distance
  a.x += dx * k * shareA
  a.y += dy * k * shareA
  b.x -= dx * k * shareB
  b.y -= dy * k * shareB
}

function verlet(point, prev, fall, damping) {
  const vx = (point.x - prev.x) * damping
  const vy = (point.y - prev.y) * damping
  prev.copy(point)
  point.x += vx
  point.y += vy - fall
}

function step(motion) {
  const fall = GRAVITY * STEP * STEP
  const speed = Math.hypot(motion.card.x - motion.cardPrev.x, motion.card.y - motion.cardPrev.y)
  const swing = THREE.MathUtils.smoothstep(speed, DAMPING.from, DAMPING.to)
  const damping = THREE.MathUtils.lerp(DAMPING.settling, DAMPING.swinging, swing)
  for (let i = 1; i <= LINKS; i += 1) verlet(motion.points[i], motion.prev[i], fall, damping)
  if (motion.held) {
    motion.cardPrev.copy(motion.card)
    motion.card.lerp(motion.held.target, 0.35)
  } else {
    verlet(motion.card, motion.cardPrev, fall, damping)
  }
  for (let k = 0; k < ITERATIONS; k += 1) {
    motion.points[0].copy(ANCHOR)
    for (let i = 1; i <= LINKS; i += 1) keep(motion.points[i - 1], motion.points[i], SEG, i === 1 ? 0 : 0.5, i === 1 ? 1 : 0.5, true)
    keep(motion.points[LINKS], motion.card, HANG, motion.held ? 1 : 0.8, motion.held ? 0 : 0.2, false)
  }

  /* Turning about its own upright axis: a spring back to facing you (or
     away, once turned over), pushed by moving sideways. */
  const target = motion.flipped ? Math.PI : 0
  const sideways = (motion.card.x - motion.cardPrev.x) / STEP
  const turnDamping = THREE.MathUtils.lerp(TURN.settling, TURN.damping, swing)
  motion.spin += (-(motion.yaw - target) * TURN.stiffness - motion.spin * turnDamping + sideways * TURN.push) * STEP
  motion.yaw += motion.spin * STEP
  const upward = (motion.card.y - motion.cardPrev.y) / STEP
  motion.pitch += (THREE.MathUtils.clamp(-upward * 0.06, -0.35, 0.35) - motion.pitch) * 0.08
}

function moving(motion) {
  if (motion.held) return true
  let fastest = Math.hypot(motion.card.x - motion.cardPrev.x, motion.card.y - motion.cardPrev.y)
  for (let i = 1; i <= LINKS; i += 1) {
    fastest = Math.max(fastest, Math.hypot(motion.points[i].x - motion.prev[i].x, motion.points[i].y - motion.prev[i].y))
  }
  const target = motion.flipped ? Math.PI : 0
  return (
    fastest > 1.5e-4 ||
    Math.abs(motion.yaw - target) > 2e-3 ||
    Math.abs(motion.spin) > 2e-2 ||
    Math.abs(motion.pitch) > 2e-3
  )
}

/* --- The scene --------------------------------------------------------------- */

function catmull(p0, p1, p2, p3, t, out) {
  const t2 = t * t
  const t3 = t2 * t
  out.set(
    0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
    0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
  )
}

const SAMPLES = LINKS * 5

function Badge({ person, still, onReady }) {
  const { gl, camera, invalidate } = useThree()
  const card = useRef(null)
  const clip = useRef(null)
  const shadow = useRef(null)
  const motion = useRef(null)
  const clock = useRef(0)

  if (!motion.current) {
    motion.current = { yaw: 0, spin: 0, pitch: 0, flipped: false, held: null, calm: 0, asleep: false }
    settle(motion.current, still ? restingPose() : liftedPose())
  }

  const anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy())
  const shared = useMemo(
    () => ({
      band: Object.assign(texture(drawBand(), anisotropy), { wrapS: THREE.RepeatWrapping }),
      metal: texture(drawMetal(), 1),
      shadow: texture(drawShadow(), 1),
      clipGeometry: new RoundedBoxGeometry(0.17, 0.24, 0.04, 2, 0.03),
    }),
    [anisotropy],
  )
  useEffect(
    () => () => {
      shared.band.dispose()
      shared.metal.dispose()
      shared.shadow.dispose()
      shared.clipGeometry.dispose()
    },
    [shared],
  )

  /* The faces, drawn again for each person; the photo is drawn in as soon
     as it has arrived. */
  const faces = useMemo(() => {
    const front = texture(drawFront(person, null), anisotropy)
    const back = texture(drawBack(person), anisotropy)
    return { front, back }
  }, [anisotropy, person])
  useEffect(() => {
    let live = true
    const photo = new Image()
    photo.decoding = 'async'
    photo.onload = () => {
      if (!live) return
      faces.front.image = drawFront(person, photo)
      faces.front.needsUpdate = true
      invalidate()
    }
    photo.src = person.src
    return () => {
      live = false
      faces.front.dispose()
      faces.back.dispose()
    }
  }, [faces, invalidate, person])

  const uniforms = useMemo(() => ({ uFront: { value: faces.front }, uBack: { value: faces.back } }), [faces])

  /* Each new person drops in afresh, the right way round. */
  useEffect(() => {
    const m = motion.current
    m.flipped = false
    m.yaw = 0
    m.pitch = 0
    settle(m, still ? restingPose() : liftedPose())
    invalidate()
  }, [invalidate, person, still])

  /* The lanyard's band: a flat strip along the chain, rebuilt each frame it
     moves. */
  const ribbon = useMemo(() => {
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array((SAMPLES + 1) * 2 * 3)
    const uvs = new Float32Array((SAMPLES + 1) * 2 * 2)
    const index = []
    for (let i = 0; i < SAMPLES; i += 1) {
      const a = i * 2
      index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
    geometry.setIndex(index)
    return { geometry, positions, uvs, samples: Array.from({ length: SAMPLES + 1 }, () => new THREE.Vector2()) }
  }, [])
  useEffect(() => () => ribbon.geometry.dispose(), [ribbon])

  const draw = useCallback(() => {
    const m = motion.current
    const end = m.points[LINKS]
    const v = new THREE.Vector2().subVectors(m.card, end)
    const swing = Math.atan2(v.x, -v.y)

    card.current.position.set(m.card.x, m.card.y, 0)
    card.current.rotation.set(m.pitch, m.yaw, swing, 'ZXY')

    /* The clip runs from the end of the band down through the slot. */
    const down = new THREE.Vector2(Math.sin(swing), -Math.cos(swing))
    const middle = end.clone().addScaledVector(down, (CLIP + 0.02) / 2)
    clip.current.position.set(middle.x, middle.y, 0)
    clip.current.rotation.set(0, m.yaw, swing, 'ZXY')

    shadow.current.position.set(m.card.x + 0.18, m.card.y - 0.22, -0.6)
    shadow.current.rotation.z = swing

    /* The band through the chain, as a smooth curve. */
    const { samples, positions, uvs, geometry } = ribbon
    const pts = m.points
    for (let s = 0; s <= SAMPLES; s += 1) {
      const t = (s / SAMPLES) * LINKS
      const i = Math.min(LINKS - 1, Math.floor(t))
      catmull(pts[Math.max(0, i - 1)], pts[i], pts[i + 1], pts[Math.min(LINKS, i + 2)], t - i, samples[s])
    }
    let along = 0
    for (let s = 0; s <= SAMPLES; s += 1) {
      const before = samples[Math.max(0, s - 1)]
      const after = samples[Math.min(SAMPLES, s + 1)]
      const tx = after.x - before.x
      const ty = after.y - before.y
      const length = Math.hypot(tx, ty) || 1
      const sx = (-ty / length) * (BAND / 2)
      const sy = (tx / length) * (BAND / 2)
      if (s > 0) along += samples[s].distanceTo(samples[s - 1])
      const o = s * 6
      positions[o] = samples[s].x + sx
      positions[o + 1] = samples[s].y + sy
      positions[o + 2] = -0.01
      positions[o + 3] = samples[s].x - sx
      positions[o + 4] = samples[s].y - sy
      positions[o + 5] = -0.01
      const u = s * 4
      const repeat = along / (BAND * 8)
      uvs[u] = repeat
      uvs[u + 1] = 1
      uvs[u + 2] = repeat
      uvs[u + 3] = 0
    }
    geometry.attributes.position.needsUpdate = true
    geometry.attributes.uv.needsUpdate = true
  }, [ribbon])

  useEffect(() => {
    draw()
    invalidate()
    const frame = requestAnimationFrame(() => onReady())
    return () => cancelAnimationFrame(frame)
  }, [draw, invalidate, onReady])

  useFrame((_, delta) => {
    const m = motion.current
    if (still) {
      m.yaw = m.flipped ? Math.PI : 0
      draw()
      return
    }
    if (!m.asleep) {
      clock.current = Math.min(clock.current + delta, STEP * 8)
      while (clock.current >= STEP) {
        step(m)
        clock.current -= STEP
      }
    }
    draw()
    /* Once nothing has moved by more than a pixel or so a second for half a
       second, it is put to sleep: held where it hangs, and nothing more is
       drawn until a hand wakes it. */
    m.calm = moving(m) ? 0 : m.calm + 1
    m.asleep = !m.held && m.calm > 30
    if (!m.asleep) invalidate()
  })

  /* --- The hand ----------------------------------------------------------- */

  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), [])
  const hit = useMemo(() => new THREE.Vector3(), [])
  const toWorld = (ray) => (ray.intersectPlane(plane, hit) ? new THREE.Vector2(hit.x, hit.y) : null)
  const wake = () => {
    motion.current.asleep = false
    motion.current.calm = 0
    invalidate()
  }

  const down = (event) => {
    event.stopPropagation()
    const point = toWorld(event.ray)
    if (!point) return
    event.target.setPointerCapture(event.pointerId)
    const m = motion.current
    m.held = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      offset: point.clone().sub(m.card),
      target: m.card.clone(),
      moved: false,
    }
    gl.domElement.style.cursor = 'grabbing'
    wake()
  }
  const move = (event) => {
    const m = motion.current
    if (m.held && event.pointerId === m.held.id) {
      if (Math.hypot(event.clientX - m.held.x, event.clientY - m.held.y) > 6) m.held.moved = true
      if (still) return
      const point = toWorld(event.ray)
      if (point) m.held.target = point.sub(m.held.offset)
      wake()
      return
    }
    /* A pointer passing over the card nudges it, a little. */
    if (still || event.pointerType === 'touch') return
    const point = toWorld(event.ray)
    if (!point) return
    if (m.lastHover) {
      m.cardPrev.x -= (point.x - m.lastHover.x) * 0.06
      m.cardPrev.y -= (point.y - m.lastHover.y) * 0.03
    }
    m.lastHover = point
    wake()
  }
  const up = (event) => {
    const m = motion.current
    if (!m.held || event.pointerId !== m.held.id) return
    if (!m.held.moved) m.flipped = !m.flipped
    m.held = null
    gl.domElement.style.cursor = 'grab'
    wake()
  }
  const over = () => {
    if (!motion.current.held) gl.domElement.style.cursor = 'grab'
  }
  const out = () => {
    motion.current.lastHover = null
    if (!motion.current.held) gl.domElement.style.cursor = ''
  }

  /* On a touch screen a finger on the card takes the card, and anywhere else
     scrolls the profile as usual. */
  useEffect(() => {
    const node = gl.domElement
    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2()
    const start = (event) => {
      const touch = event.touches[0]
      const rect = node.getBoundingClientRect()
      pointer.set(((touch.clientX - rect.left) / rect.width) * 2 - 1, -((touch.clientY - rect.top) / rect.height) * 2 + 1)
      raycaster.setFromCamera(pointer, camera)
      if (card.current && raycaster.intersectObject(card.current).length) event.preventDefault()
    }
    node.addEventListener('touchstart', start, { passive: false })
    return () => node.removeEventListener('touchstart', start)
  }, [camera, gl])

  return (
    <>
      <mesh ref={shadow} renderOrder={0}>
        <planeGeometry args={[CARD.width * 1.5, CARD.height * 1.25]} />
        <meshBasicMaterial map={shared.shadow} transparent depthWrite={false} opacity={0.45} />
      </mesh>
      <mesh geometry={ribbon.geometry} frustumCulled={false}>
        <meshBasicMaterial map={shared.band} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={clip} geometry={shared.clipGeometry}>
        <meshMatcapMaterial matcap={shared.metal} />
      </mesh>
      <mesh
        ref={card}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onPointerOver={over}
        onPointerOut={out}
      >
        <planeGeometry args={[CARD.width + 2 * BLEED, CARD.height + 2 * BLEED]} />
        <shaderMaterial
          vertexShader={VERTEX}
          fragmentShader={FRAGMENT}
          uniforms={uniforms}
          side={THREE.DoubleSide}
          transparent
        />
      </mesh>
    </>
  )
}

class SceneBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch() {
    this.props.onFailure()
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

function ContextGuard({ onFailure }) {
  const { gl } = useThree()
  useEffect(() => {
    const lost = () => onFailure()
    gl.domElement.addEventListener('webglcontextlost', lost)
    return () => gl.domElement.removeEventListener('webglcontextlost', lost)
  }, [gl, onFailure])
  return null
}

export default function MemberBadge({ person, still, lowPower, onFailure }) {
  const [fonts, setFonts] = useState(false)
  const [ready, setReady] = useState(false)
  const markReady = useCallback(() => setReady(true), [])

  /* The faces are lettered once, so they wait for the site's own type. */
  useEffect(() => {
    let live = true
    Promise.all([document.fonts.load(`800 84px ${FONT}`), document.fonts.load(`500 38px ${FONT}`)])
      .catch(() => {})
      .then(() => {
        if (live) setFonts(true)
      })
    return () => {
      live = false
    }
  }, [])

  return (
    <div className={cx('badge3d', ready && 'is-ready')}>
      <SceneBoundary onFailure={onFailure}>
        <Canvas camera={CAMERA} dpr={lowPower ? [1, 1.5] : [1, 2]} frameloop="demand" flat gl={CONTEXT}>
          <ContextGuard onFailure={onFailure} />
          {fonts ? <Badge person={person} still={still} onReady={markReady} /> : null}
        </Canvas>
      </SceneBoundary>
    </div>
  )
}

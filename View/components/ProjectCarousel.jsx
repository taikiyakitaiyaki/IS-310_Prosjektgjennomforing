import { Component, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { credit } from '../lib/credit.js'
import { cx } from '../lib/cx.js'

/* ===========================================================================
   Prosjekter in 3D: the projects as tall cards standing in an arc on a
   polished floor, the one in front nearest and the rest falling back to
   either side, each mirrored in the floor beneath it. The arc turns one
   project at a time; a hand can drag it, a swipe or a sideways trackpad
   stroke can turn it, and a card pressed comes to the front.

   Every card is one quad with one shader, drawn twice - upright, and upside
   down under the floor fading away - so the whole stage is a dozen draw
   calls. The shader cuts the rounded corners itself and lays the lettering
   over the loop, from a strip drawn once on a 2D canvas.

   Frames are drawn only when something has changed: the arc on its way to a
   card, a hand on it, or a loop with a new frame. Standing still, between
   turns, it costs nothing.
   =========================================================================== */

/* A card is 9:16 - a phone held upright - in the scene's own units, standing
   on the floor at y = 0. The quad reaches a little past it on every side so
   the soft edge the shader gives the corners is never cut off. */
const CARD = { width: 1.125, height: 2, radius: 0.075 }
const BLEED = 0.03

/* The lettering stands on the lower part of the card, drawn once into a
   strip that covers this share of its height. */
const LABEL_SHARE = 0.36
const LABEL = { width: 720, height: Math.round(720 * (16 / 9) * LABEL_SHARE) }
const FONT = 'Manrope, system-ui, sans-serif'

/* The arc. Each step to the side moves a card SPREAD across and DEPTH back
   and turns it toward the outside by up to TILT radians, so the row reads as
   the outside of a ring with the nearest card in front. */
const SPREAD = 1.32
const DEPTH = 0.62
const TILT = 0.22

/* Cards dim a little as they fall back, and have faded out completely
   before they wrap round to the other end, so the ring has no seam. */
const DIM = 0.7
const FADE = [2.35, 2.95]

/* How long a turn of one card takes, in seconds: unhurried when the arc
   turns on its own, quicker when it answers a hand. A turn eases out of the
   card it leaves and into the one it arrives at, and ends exactly on time -
   so nothing is drawn once it is there. A turn of several cards takes a
   little longer. */
const DURATION = { auto: 1.8, user: 1 }

/* How strongly the dark floor gives a card back, as polished stone does. */
const MIRROR = 0.42

/* Only the card in front plays its loop - from the moment it is more than
   halfway there - so one video is decoding at a time; the others show their
   posters. */
const PLAYING_REACH = 0.6

/* The camera stands level with the lower third of the cards and looks
   straight ahead, so their sides stay upright. It is close enough that the
   card in front fills most of the stage's height - its top a little under
   the stage's upper edge - and the arc reaches nearly to the sides, with the
   reflections just room enough to fade out below. */
const CAMERA = { position: [0, 0.67, 5.8], rotation: [0, 0, 0], fov: 28, near: 0.1, far: 40 }
const CONTEXT = { alpha: true, antialias: true, depth: false, stencil: false, powerPreference: 'low-power' }
const DPR = [1, 2]
const LOW_DPR = [1, 1.5]

const LOOP = /\.(mp4|webm)$/i
const HAS_FRAME_CALLBACK = typeof HTMLVideoElement !== 'undefined' && 'requestVideoFrameCallback' in HTMLVideoElement.prototype

const VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const FRAGMENT = /* glsl */ `
  uniform sampler2D uMedia;
  uniform sampler2D uLabel;
  uniform float uHasMedia;
  uniform float uDecode;
  uniform vec2 uCover;
  uniform vec3 uTop;
  uniform vec3 uBottom;
  uniform vec2 uSize;
  uniform vec2 uQuad;
  uniform float uRadius;
  uniform float uLight;
  uniform float uOpacity;
  uniform float uReflection;
  uniform float uMirror;
  varying vec2 vUv;

  float roundedBox(vec2 p, vec2 halfSize, float radius) {
    vec2 q = abs(p) - halfSize + radius;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - radius;
  }

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }

  void main() {
    /* Where on the card this is: p in the scene's units from its centre,
       uv from its lower left corner. */
    vec2 p = (vUv - 0.5) * uQuad;
    vec2 uv = p / uSize + 0.5;
    float d = roundedBox(p, uSize * 0.5, uRadius);
    float edge = fwidth(d);
    float inside = 1.0 - smoothstep(-edge, edge, d);

    /* A card without its loop yet is lit in its own colour, brightest at
       the top. */
    vec3 color = mix(uBottom, uTop, smoothstep(0.0, 1.0, uv.y));
    color += uTop * 0.35 * (1.0 - smoothstep(0.0, 0.8, distance(uv, vec2(0.5, 0.95))));
    vec3 media = texture2D(uMedia, (uv - 0.5) * uCover + 0.5).rgb;
    /* A loop's frames arrive still sRGB-encoded - three.js decodes video
       only in its own materials - so they are decoded here, as a picture is
       by the GPU. Otherwise a playing loop is paler than its own poster. */
    media = mix(media, sRGBTransferEOTF(vec4(media, 1.0)).rgb, uDecode);
    color = mix(color, media, uHasMedia);

    /* Darker toward the foot, where the lettering stands. Over a loop or a
       picture - which can be as white as a blank page - the shade is deeper,
       reaches its full depth already under the name, and is measured as the
       eye sees it rather than in linear light, where even a strong shade
       leaves white a pale grey. So the lettering reads on anything. */
    float soft = 0.45 * (1.0 - smoothstep(0.0, 0.5, uv.y));
    float deep = 0.75 * (1.0 - smoothstep(0.1, 0.56, uv.y));
    color *= mix(1.0 - soft, pow(1.0 - deep, 2.2), uHasMedia);
    vec4 label = texture2D(uLabel, vec2(uv.x, clamp(uv.y / ${LABEL_SHARE.toFixed(3)}, 0.0, 1.0)));
    color = label.rgb + color * (1.0 - label.a);
    color *= uLight;

    /* Under the floor the same card stands upside down, strongest where it
       meets its own foot and gone two fifths of the way up - before the
       stage's lower edge, which would otherwise cut it off. */
    float alpha = inside * uOpacity;
    alpha *= mix(1.0, uMirror * pow(1.0 - clamp(uv.y / 0.42, 0.0, 1.0), 1.5), uReflection);
    if (alpha < 0.003) discard;

    gl_FragColor = vec4(color, alpha);
    #include <colorspace_fragment>
    /* A trace of noise keeps the long gradients from banding. */
    gl_FragColor.rgb += (hash(gl_FragCoord.xy) - 0.5) / 255.0;
  }
`

const smoothstep = (from, to, value) => {
  const t = Math.min(Math.max((value - from) / (to - from), 0), 1)
  return t * t * (3 - 2 * t)
}

/* How far card `value` stands from the front, in cards, negative to the
   left. The arc is a ring, so it wraps into -count/2..count/2. */
const around = (value, count) => value - count * Math.round(value / count)

/* The distance from the front with the point rounded off, so the arc has no
   kink where the front card turns. */
const soft = (p) => Math.sqrt(p * p + 0.16) - 0.4

/* The name, who made it, and - until there is a loop - that one is coming,
   centred at the foot of a transparent strip. */
function drawLabel(project, labels) {
  const canvas = document.createElement('canvas')
  canvas.width = LABEL.width
  canvas.height = LABEL.height
  const context = canvas.getContext('2d')
  const centre = LABEL.width / 2
  const room = LABEL.width - 120

  const fit = (text, weight, size) => {
    let px = size
    context.font = `${weight} ${px}px ${FONT}`
    while (px > 14 && context.measureText(text).width > room) {
      px -= 2
      context.font = `${weight} ${px}px ${FONT}`
    }
    return px
  }

  context.textAlign = 'center'
  context.fillStyle = '#ffffff'
  context.shadowColor = 'rgba(0, 0, 0, 0.5)'
  context.shadowBlur = 22
  context.shadowOffsetY = 2

  let baseline = LABEL.height - 60
  const byline = credit(project.by)
  fit(byline, 500, 30)
  context.globalAlpha = 0.85
  context.fillText(byline, centre, baseline)

  baseline -= 52
  const size = fit(project.name, 700, 68)
  context.globalAlpha = 1
  context.fillText(project.name, centre, baseline)

  /* Over the name: that its loop is still coming, or else - when its code is
     public - that pressing the card opens it. */
  const mark = !project.media ? labels.pending : project.repo ? labels.repo : null
  if (mark) {
    context.font = `700 20px ${FONT}`
    context.letterSpacing = '6px'
    context.globalAlpha = 0.72
    context.fillText(mark.toUpperCase(), centre, baseline - size - 16)
  }
  return canvas
}

/* The loop fills the card the way object-fit: cover would. */
function cover(card, width, height) {
  const media = width / height
  const frame = CARD.width / CARD.height
  card.uniforms.uCover.value.set(media > frame ? frame / media : 1, media > frame ? 1 : media / frame)
}

function makeCard(project, labels, geometry, blank, anisotropy) {
  const label = new THREE.CanvasTexture(drawLabel(project, labels))
  label.colorSpace = THREE.SRGBColorSpace
  label.premultiplyAlpha = true
  label.anisotropy = anisotropy

  const top = new THREE.Color(project.color || '#8c93a1')
  const uniforms = {
    uMedia: { value: blank },
    uLabel: { value: label },
    uHasMedia: { value: 0 },
    uDecode: { value: 0 },
    uCover: { value: new THREE.Vector2(1, 1) },
    uTop: { value: top },
    uBottom: { value: top.clone().multiplyScalar(0.3) },
    uSize: { value: new THREE.Vector2(CARD.width, CARD.height) },
    uQuad: { value: new THREE.Vector2(CARD.width + 2 * BLEED, CARD.height + 2 * BLEED) },
    uRadius: { value: CARD.radius },
    uLight: { value: 1 },
    uOpacity: { value: 1 },
    uReflection: { value: 0 },
    uMirror: { value: MIRROR },
  }
  const settings = { vertexShader: VERTEX, fragmentShader: FRAGMENT, transparent: true, depthTest: false, depthWrite: false }

  /* The reflection shares every uniform but the one that makes it a
     reflection, so whatever the card does, it does too. */
  const material = new THREE.ShaderMaterial({ ...settings, uniforms })
  const mirrorMaterial = new THREE.ShaderMaterial({ ...settings, uniforms: { ...uniforms, uReflection: { value: 1 } } })
  const mesh = new THREE.Mesh(geometry, material)
  const mirror = new THREE.Mesh(geometry, mirrorMaterial)
  mirror.scale.y = -1

  return { project, label, uniforms, material, mirrorMaterial, mesh, mirror, wake: null, rest: null, wantsPlay: false }
}

function Stage({ items, labels, target, eager, still, live, rig, shelf, onSteer, onReady }) {
  const { gl, size, invalidate } = useThree()
  const count = items.length

  const geometry = useMemo(
    () => new THREE.PlaneGeometry(CARD.width + 2 * BLEED, CARD.height + 2 * BLEED).translate(0, CARD.height / 2, 0),
    [],
  )
  const blank = useMemo(() => {
    const texture = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1)
    texture.needsUpdate = true
    return texture
  }, [])
  const cards = useMemo(() => {
    const anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy())
    return items.map((project) => makeCard(project, labels, geometry, blank, anisotropy))
  }, [blank, geometry, gl, items, labels])

  useEffect(
    () => () => {
      cards.forEach((card) => {
        card.label.dispose()
        card.material.dispose()
        card.mirrorMaterial.dispose()
      })
    },
    [cards],
  )
  useEffect(
    () => () => {
      geometry.dispose()
      blank.dispose()
    },
    [blank, geometry],
  )

  /* The pictures arrive on their own time; a card shows its colour until its
     own has. A loop's card shows its poster - its first frame - and its video
     is only made, and fetched, the first time the card comes to the front.
     A loop is drawn on each new frame it has, about thirty a second, rather
     than on every frame of the screen. */
  useEffect(() => {
    const anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy())
    const undo = cards.map((card) => {
      const { media: src, poster } = card.project
      if (!src) return null
      const loop = LOOP.test(src)

      let picture = null
      let cancelled = false
      const still = loop ? poster : src
      if (still) {
        new THREE.TextureLoader().load(still, (loaded) => {
          if (cancelled) {
            loaded.dispose()
            return
          }
          picture = loaded
          loaded.colorSpace = THREE.SRGBColorSpace
          loaded.anisotropy = anisotropy
          /* A loop that has already started keeps its own frames. */
          if (card.uniforms.uMedia.value !== blank) return
          cover(card, loaded.image.width, loaded.image.height)
          card.uniforms.uMedia.value = loaded
          card.uniforms.uHasMedia.value = 1
          invalidate()
        })
      }

      let video = null
      let texture = null
      const loaded = () => {
        cover(card, video.videoWidth, video.videoHeight)
        card.uniforms.uMedia.value = texture
        card.uniforms.uHasMedia.value = 1
        card.uniforms.uDecode.value = 1
        texture.needsUpdate = true
        invalidate()
      }
      const frame = () => {
        invalidate()
        if (!video.paused) video.requestVideoFrameCallback(frame)
      }
      const played = () => {
        if (HAS_FRAME_CALLBACK) video.requestVideoFrameCallback(frame)
      }
      if (loop) {
        card.wake = () => {
          if (video) return video
          video = document.createElement('video')
          video.muted = true
          video.loop = true
          video.playsInline = true
          video.preload = 'auto'
          video.setAttribute('muted', '')
          video.setAttribute('playsinline', '')
          video.src = src
          shelf.current?.append(video)
          texture = new THREE.VideoTexture(video)
          texture.colorSpace = THREE.SRGBColorSpace
          video.addEventListener('loadeddata', loaded)
          video.addEventListener('play', played)
          return video
        }
        card.rest = () => video?.pause()
      }

      return () => {
        cancelled = true
        picture?.dispose()
        if (video) {
          video.removeEventListener('loadeddata', loaded)
          video.removeEventListener('play', played)
          video.pause()
          video.removeAttribute('src')
          video.load()
          video.remove()
          texture.dispose()
        }
        card.wake = null
        card.rest = null
        card.wantsPlay = false
        card.uniforms.uMedia.value = blank
        card.uniforms.uHasMedia.value = 0
        card.uniforms.uDecode.value = 0
      }
    })
    return () => undo.forEach((step) => step?.())
  }, [blank, cards, gl, invalidate, shelf])

  /* What the hand on the stage needs from the scene: how to ask for a frame,
     and how far a drag has to go to move one card. */
  useEffect(() => {
    rig.current.invalidate = invalidate
  }, [invalidate, rig])
  useEffect(() => {
    const z = -DEPTH * soft(1)
    const halfView = Math.tan(THREE.MathUtils.degToRad(CAMERA.fov / 2))
    rig.current.pxPerItem = (SPREAD / (CAMERA.position[2] - z) / halfView) * (size.height / 2)
  }, [rig, size.height])

  useEffect(() => {
    invalidate()
  }, [eager, invalidate, live, still, target])

  useEffect(() => {
    invalidate()
    const frame = requestAnimationFrame(() => onReady())
    return () => cancelAnimationFrame(frame)
  }, [invalidate, onReady])

  useFrame((_, delta) => {
    const motion = rig.current
    const step = Math.min(delta, 1 / 20)

    if (!motion.dragging) {
      if (still) {
        motion.position = target
        motion.velocity = 0
        motion.goal = target
      } else {
        /* A new card to turn to: the turn starts from wherever the arc is,
           at whatever speed it already has - a hand letting go, or a turn
           cut short by the next - so it never jolts. */
        if (motion.goal !== target) {
          motion.goal = target
          motion.from = motion.position
          motion.slope = motion.velocity
          motion.progress = 0
          const distance = Math.abs(target - motion.position)
          motion.duration = (eager ? DURATION.user : DURATION.auto) * (1 + 0.3 * Math.max(0, distance - 1))
        }
        if (motion.progress < 1) {
          /* A cubic from where it was to the card, leaving at the speed it
             had and arriving at rest. */
          const s = (motion.progress = Math.min(1, motion.progress + step / motion.duration))
          const s2 = s * s
          const s3 = s2 * s
          const lean = motion.slope * motion.duration
          motion.position =
            (2 * s3 - 3 * s2 + 1) * motion.from + (s3 - 2 * s2 + s) * lean + (3 * s2 - 2 * s3) * motion.goal
          motion.velocity =
            ((6 * s2 - 6 * s) * motion.from + (3 * s2 - 4 * s + 1) * lean + (6 * s - 6 * s2) * motion.goal) /
            motion.duration
          if (s >= 1) {
            motion.position = motion.goal
            motion.velocity = 0
          }
        }
      }
    }

    let playing = false
    cards.forEach((card, index) => {
      const p = around(index - motion.position, count)
      const reach = Math.abs(p)
      const { mesh, mirror, uniforms } = card

      mesh.position.set(SPREAD * p, 0, -DEPTH * soft(p))
      mesh.rotation.y = TILT * Math.tanh(p * 1.4)
      mirror.position.copy(mesh.position)
      mirror.rotation.y = mesh.rotation.y

      const opacity = 1 - smoothstep(FADE[0], FADE[1], reach)
      uniforms.uOpacity.value = opacity
      uniforms.uLight.value = DIM + (1 - DIM) * (1 - smoothstep(0, 1.4, reach))
      mesh.visible = opacity > 0.002
      mirror.visible = mesh.visible

      if (card.wake) {
        const wants = live && !still && reach < PLAYING_REACH
        if (wants !== card.wantsPlay) {
          card.wantsPlay = wants
          if (wants) card.wake().play().catch(() => {})
          else card.rest()
        }
        playing ||= wants
      }
    })

    const moving = motion.dragging || motion.goal !== target || motion.position !== motion.goal
    if (moving || (playing && !HAS_FRAME_CALLBACK)) invalidate()
  })

  /* A press on a card to the side brings it to the front; on the card in
     front, it opens the project's code in a new tab, if that is public. */
  const press = (index) => (event) => {
    if (event.delta > 8 || cards[index].uniforms.uOpacity.value < 0.3) return
    event.stopPropagation()
    const motion = rig.current
    const p = around(index - motion.position, count)
    if (Math.abs(p) < 0.5) {
      const { repo } = cards[index].project
      if (repo) window.open(repo, '_blank', 'noopener,noreferrer')
      return
    }
    onSteer(Math.round(motion.position + p))
  }
  /* The hand shows wherever a press does something. */
  const point = (index, on) => () => {
    const front = Math.abs(around(index - rig.current.position, count)) < 0.5
    gl.domElement.style.cursor = on && (!front || cards[index].project.repo) ? 'pointer' : ''
  }

  return cards.map((card, index) => (
    <group key={card.project.name}>
      <primitive
        object={card.mesh}
        onClick={press(index)}
        onPointerOver={point(index, true)}
        onPointerOut={point(index, false)}
      />
      <primitive object={card.mirror} />
    </group>
  ))
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

export default function ProjectCarousel({ items, labels, target, eager, still, lowPower, onSteer, onHold, onFailure }) {
  const host = useRef(null)
  const shelf = useRef(null)
  /* Where the arc is, between the cards, how fast it is going and the turn
     it is in - shared by the scene, which turns it toward the target, and
     the hand on the stage, which moves it directly. */
  const rig = useRef({
    position: target,
    velocity: 0,
    goal: target,
    from: target,
    slope: 0,
    progress: 1,
    duration: 1,
    dragging: false,
    pxPerItem: 200,
    invalidate: () => {},
  })
  const [fonts, setFonts] = useState(false)
  const [ready, setReady] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [inView, setInView] = useState(false)
  const [visible, setVisible] = useState(() => !document.hidden)
  const markReady = useCallback(() => setReady(true), [])

  /* The lettering is drawn once, so it waits for the site's own type. */
  useEffect(() => {
    let live = true
    Promise.all([document.fonts.load(`700 68px ${FONT}`), document.fonts.load(`500 30px ${FONT}`)])
      .catch(() => {})
      .then(() => {
        if (live) setFonts(true)
      })
    return () => {
      live = false
    }
  }, [])

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting))
    observer.observe(host.current)
    const visibility = () => setVisible(!document.hidden)
    document.addEventListener('visibilitychange', visibility)
    return () => {
      observer.disconnect()
      document.removeEventListener('visibilitychange', visibility)
    }
  }, [])

  /* The hand. A drag sideways turns the arc under it, and letting go sends
     it on to the card it was heading for. A drag that is more up than
     across is left to the page, which scrolls. A sideways stroke on a
     trackpad turns it too; Lenis is told to leave those alone. */
  useEffect(() => {
    const node = host.current
    const motion = rig.current
    let press = null
    let wheelRest = 0
    const toCards = (px) => px / Math.max(motion.pxPerItem, 1)

    const hold = (on) => {
      motion.dragging = on
      setDragging(on)
      onHold(on)
    }
    /* Let go: on to the nearest card the way it was heading - a fresh turn
       even if that is the card it started from, so it never rests between
       two. */
    const land = (velocity, from = motion.position) => {
      motion.velocity = still ? 0 : velocity
      motion.goal = Number.NaN
      /* A flick carries a little further than the hand went, but never
         more than a card past it - so a quick swipe of about a card's width
         moves one card, and a long one as many as it covered. */
      const start = Math.round(from)
      const reach = Math.max(1, Math.ceil(Math.abs(motion.position - from)))
      const nearest = Math.round(motion.position + velocity * 0.08)
      hold(false)
      onSteer(Math.min(Math.max(nearest, start - reach), start + reach))
      motion.invalidate()
    }

    const down = (event) => {
      if (event.button !== 0) return
      press = { id: event.pointerId, x: event.clientX, y: event.clientY, from: motion.position, moving: false, trail: [] }
    }
    const move = (event) => {
      if (!press || event.pointerId !== press.id) return
      const dx = event.clientX - press.x
      const dy = event.clientY - press.y
      if (!press.moving) {
        if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy) * 1.2) return
        press.moving = true
        press.x = event.clientX
        press.from = motion.position
        node.setPointerCapture?.(event.pointerId)
        hold(true)
      }
      motion.position = press.from - toCards(event.clientX - press.x)
      press.trail.push({ t: event.timeStamp, p: motion.position })
      while (press.trail.length > 2 && event.timeStamp - press.trail[0].t > 100) press.trail.shift()
      motion.invalidate()
    }
    const up = (event) => {
      if (!press || event.pointerId !== press.id) return
      if (press.moving) {
        const first = press.trail[0]
        const last = press.trail[press.trail.length - 1]
        const span = last && first ? (last.t - first.t) / 1000 : 0
        land(span > 0.01 ? (last.p - first.p) / span : 0, press.from)
      }
      press = null
    }
    const wheel = (event) => {
      if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return
      event.preventDefault()
      if (!motion.dragging) hold(true)
      motion.velocity = 0
      motion.position += toCards(event.deltaX * (event.deltaMode === 1 ? 16 : 1))
      motion.invalidate()
      clearTimeout(wheelRest)
      wheelRest = setTimeout(() => land(0), 140)
    }

    node.addEventListener('pointerdown', down)
    node.addEventListener('pointermove', move)
    node.addEventListener('pointerup', up)
    node.addEventListener('pointercancel', up)
    node.addEventListener('wheel', wheel, { passive: false })
    return () => {
      node.removeEventListener('pointerdown', down)
      node.removeEventListener('pointermove', move)
      node.removeEventListener('pointerup', up)
      node.removeEventListener('pointercancel', up)
      node.removeEventListener('wheel', wheel)
      clearTimeout(wheelRest)
      if (motion.dragging) hold(false)
    }
  }, [onHold, onSteer, still])

  return (
    <div className={cx('carousel3d', ready && 'is-ready', dragging && 'is-dragging')} ref={host} data-lenis-prevent-horizontal>
      <div className="carousel3d__shelf" ref={shelf} />
      <SceneBoundary onFailure={onFailure}>
        <Canvas camera={CAMERA} dpr={lowPower ? LOW_DPR : DPR} frameloop="demand" flat gl={CONTEXT}>
          <ContextGuard onFailure={onFailure} />
          {fonts ? (
            <Stage
              items={items}
              labels={labels}
              target={target}
              eager={eager}
              still={still}
              live={inView && visible}
              rig={rig}
              shelf={shelf}
              onSteer={onSteer}
              onReady={markReady}
            />
          ) : null}
        </Canvas>
      </SceneBoundary>
    </div>
  )
}

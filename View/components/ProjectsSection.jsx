import { lazy, useCallback, useEffect, useRef, useState } from 'react'
import { projects } from '../../Model/site.js'
import { credit } from '../lib/credit.js'
import { useMotion } from '../lib/motion.jsx'
import { hasWebGL2 } from '../lib/webgl.js'
import SceneSlot from './SceneSlot.jsx'

const LazyProjectCarousel = lazy(() => import('./ProjectCarousel.jsx'))

/* ===========================================================================
   Prosjekter: the projects as tall cards in a turning arc (ProjectCarousel),
   with what the one in front is under it and the buttons that turn it.

   The arc turns on its own while it is in view, one project at a time, and
   holds still while the pointer rests on it, while a hand is on it, when
   the visitor pauses it, or when they asked for less motion. Without WebGL
   the projects stand in a plain row instead, scrolled sideways.
   =========================================================================== */

/* A new project comes to the front this long after the last one did. */
const INTERVAL = 4800

const LOOP = /\.(mp4|webm)$/i
const LABELS = { pending: projects.pendingLabel }

function Arrow({ back }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d={back ? 'M10 3 5 8l5 5' : 'M6 3l5 5-5 5'} />
    </svg>
  )
}

function PlayPause({ playing }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d={playing ? 'M6 4v8M10 4v8' : 'M5.5 3.5v9l7-4.5z'} />
    </svg>
  )
}

/* A loop in the plain row plays only while most of it is on screen, and
   nothing of it is fetched before then. A visitor who asked for less motion
   gets it standing, with controls to play it if they want to. */
function Loop({ src, poster, label }) {
  const ref = useRef(null)
  const { still } = useMotion()

  useEffect(() => {
    const node = ref.current
    if (!node || still) return undefined
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) node.play().catch(() => {})
        else node.pause()
      },
      { threshold: 0.5 },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [still])

  return (
    <video
      className="project__media"
      ref={ref}
      src={src}
      poster={poster ?? undefined}
      aria-label={label}
      muted
      loop
      playsInline
      preload={still ? 'metadata' : 'none'}
      controls={still}
    />
  )
}

function ProjectMedia({ project }) {
  if (!project.media) return <span className="project__pending">{projects.pendingLabel}</span>
  if (LOOP.test(project.media)) return <Loop src={project.media} poster={project.poster} label={project.name} />
  return <img className="project__media" src={project.media} alt={project.name} loading="lazy" decoding="async" />
}

/* Without WebGL - or if it gives out - the projects stand in a row that runs
   off the side of the page: the browser's own sideways scroll, snapped to
   the cards, with buttons under it that step one card at a time. */
function ProjectsRow() {
  const track = useRef(null)
  const [atStart, setAtStart] = useState(true)
  const [atEnd, setAtEnd] = useState(false)
  const { still } = useMotion()

  useEffect(() => {
    const node = track.current
    let frame = 0
    const measure = () => {
      frame = 0
      setAtStart(node.scrollLeft <= 1)
      setAtEnd(node.scrollLeft >= node.scrollWidth - node.clientWidth - 1)
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure)
    }
    measure()
    node.addEventListener('scroll', schedule, { passive: true })
    const resize = new ResizeObserver(schedule)
    resize.observe(node)
    return () => {
      node.removeEventListener('scroll', schedule)
      resize.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [])

  const step = (direction) => {
    const node = track.current
    const card = node.querySelector('.project')
    const gap = parseFloat(getComputedStyle(card.parentElement).columnGap) || 0
    node.scrollBy({ left: direction * (card.offsetWidth + gap), behavior: still ? 'auto' : 'smooth' })
  }

  return (
    <div className="projects">
      <div
        className="projects__track"
        ref={track}
        role="region"
        aria-label={projects.label}
        tabIndex={0}
        data-lenis-prevent-horizontal
      >
        <ul className="projects__list">
          {projects.items.map((project) => (
            <li className="project" key={project.name}>
              <div className="project__frame">
                <ProjectMedia project={project} />
              </div>
              <h3 className="project__name">{project.name}</h3>
              <p className="project__about">{project.about}</p>
              <p className="project__by">
                {credit(project.by)}
              </p>
            </li>
          ))}
        </ul>
      </div>

      {atStart && atEnd ? null : (
        <div className="projects__controls">
          <button
            type="button"
            className="projects__step"
            onClick={() => step(-1)}
            disabled={atStart}
            aria-label={projects.previous}
          >
            <Arrow back />
          </button>
          <button
            type="button"
            className="projects__step"
            onClick={() => step(1)}
            disabled={atEnd}
            aria-label={projects.next}
          >
            <Arrow />
          </button>
        </div>
      )}
    </div>
  )
}

export default function ProjectsSection() {
  const { still, lowPower } = useMotion()
  const root = useRef(null)
  const [supported] = useState(hasWebGL2)
  const [failed, setFailed] = useState(false)
  /* Which project is in front, counted on without wrapping - the arc is a
     ring, and turning past the last one simply goes on to the first. */
  const [target, setTarget] = useState(0)
  /* Whether the last turn was asked for, rather than the arc's own: it then
     moves more briskly, and the line under it is read out. */
  const [eager, setEager] = useState(false)
  const [playing, setPlaying] = useState(true)
  const [held, setHeld] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [inView, setInView] = useState(false)
  const [visible, setVisible] = useState(() => !document.hidden)
  const threeD = supported && !failed

  useEffect(() => {
    const node = root.current
    if (!node) return undefined
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.25 })
    observer.observe(node)
    const visibility = () => setVisible(!document.hidden)
    document.addEventListener('visibilitychange', visibility)
    return () => {
      observer.disconnect()
      document.removeEventListener('visibilitychange', visibility)
    }
  }, [threeD])

  /* The arc's own turn: one project along, INTERVAL after the last change of
     any kind, so a press or a drag starts the wait over. */
  useEffect(() => {
    if (!threeD || still || !playing || held || hovered || !inView || !visible) return undefined
    const timer = setTimeout(() => {
      setEager(false)
      setTarget((value) => value + 1)
    }, INTERVAL)
    return () => clearTimeout(timer)
  }, [held, hovered, inView, playing, still, target, threeD, visible])

  const steer = useCallback((next) => {
    setEager(true)
    setTarget(next)
  }, [])
  const fail = useCallback(() => setFailed(true), [])

  if (!threeD) return <ProjectsRow />

  const count = projects.items.length
  const current = ((target % count) + count) % count
  const project = projects.items[current]

  return (
    <div className="showcase" ref={root} role="group" aria-roledescription="karusell" aria-label={projects.label}>
      <SceneSlot
        className="showcase__stage"
        aria-hidden="true"
        onPointerEnter={(event) => setHovered(event.pointerType === 'mouse')}
        onPointerLeave={() => setHovered(false)}
      >
        <LazyProjectCarousel
          items={projects.items}
          labels={LABELS}
          target={target}
          eager={eager}
          still={still}
          lowPower={lowPower}
          onSteer={steer}
          onHold={setHeld}
          onFailure={fail}
        />
      </SceneSlot>

      <div className="showcase__caption" aria-live={eager ? 'polite' : 'off'}>
        <p className="showcase__about" key={current}>
          <span className="visually-hidden">{project.name}. </span>
          {project.about}
          <span className="visually-hidden">
            {' '}
            {credit(project.by)}.
          </span>
        </p>
      </div>

      <div className="showcase__controls">
        <button type="button" className="projects__step" onClick={() => steer(target - 1)} aria-label={projects.previous}>
          <Arrow back />
        </button>
        {still ? null : (
          <button
            type="button"
            className="projects__step"
            onClick={() => setPlaying((value) => !value)}
            aria-label={playing ? projects.pause : projects.play}
          >
            <PlayPause playing={playing} />
          </button>
        )}
        <button type="button" className="projects__step" onClick={() => steer(target + 1)} aria-label={projects.next}>
          <Arrow />
        </button>
      </div>
    </div>
  )
}

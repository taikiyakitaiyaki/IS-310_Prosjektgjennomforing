import {
  StrictMode,
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { createRoot } from 'react-dom/client'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ReactLenis, useLenis } from 'lenis/react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { contact, film, manifest, nav, route, site, SUMMIT_M, team } from './Model/site.js'
import './View/css/base.css'
import './View/css/site.css'

gsap.registerPlugin(ScrollTrigger, useGSAP)
ScrollTrigger.config({ limitCallbacks: true, ignoreMobileResize: true })

const LazyExpeditionCanvas = lazy(() => import('./View/components/ExpeditionCanvas.jsx'))

function SmoothScrollBridge() {
  const lenis = useLenis()

  useEffect(() => {
    if (!lenis) return undefined
    const update = (time) => lenis.raf(time * 1000)
    lenis.on('scroll', ScrollTrigger.update)
    gsap.ticker.add(update)
    gsap.ticker.lagSmoothing(0)
    ScrollTrigger.refresh()

    return () => {
      lenis.off('scroll', ScrollTrigger.update)
      gsap.ticker.remove(update)
    }
  }, [lenis])

  return null
}

function usePerformanceProfile() {
  const [profile, setProfile] = useState({ reduced: false, lowPower: false })

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => {
      const memory = navigator.deviceMemory || 8
      const cores = navigator.hardwareConcurrency || 8
      setProfile({ reduced: media.matches, lowPower: memory < 4 || cores < 4 })
    }
    update()
    media.addEventListener?.('change', update)
    return () => media.removeEventListener?.('change', update)
  }, [])

  return profile
}

function useAnchorNavigation() {
  const lenis = useLenis()
  return useCallback((event, id) => {
    const target = document.getElementById(id)
    if (!target || !lenis) return
    event.preventDefault()
    lenis.scrollTo(target, { offset: -16, duration: 1.25 })
    window.history.replaceState(null, '', `#${id}`)
  }, [lenis])
}

function Header() {
  const [open, setOpen] = useState(false)
  const navigate = useAnchorNavigation()

  const goTo = (event, id) => {
    setOpen(false)
    navigate(event, id)
  }

  return (
    <header className="site-header">
      <a className="brand" href="#landing" onClick={(event) => goTo(event, 'landing')} aria-label="Gruppe 11, tilbake til toppen">
        <span>G11</span><i aria-hidden="true" />
      </a>
      <nav className={open ? 'site-nav is-open' : 'site-nav'} aria-label="Hovednavigasjon">
        {nav.map((item, index) => (
          <a key={item.id} href={`#${item.id}`} onClick={(event) => goTo(event, item.id)}>
            <span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>{item.label}
          </a>
        ))}
      </nav>
      <button
        className="menu-toggle"
        type="button"
        aria-label={open ? 'Lukk meny' : 'Åpne meny'}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span /><span />
      </button>
    </header>
  )
}

function Landing() {
  return (
    <section className="landing" id="landing" aria-labelledby="landing-title">
      <div className="hero-bg" data-us-project="h1QfJCx9UZWIygGIzksa"></div>
      <div className="landing__veil" aria-hidden="true" />
      <div className="landing__frame shell">
        <div className="landing__top meta hero-intro">
          <span>{site.course}</span>
          <span>UiA · {site.year}</span>
        </div>
        <div className="landing__copy">
          <p className="meta meta--ice hero-intro">Ekspedisjon 11 / Basecamp</p>
          <h1 id="landing-title" aria-label="Vi går hele veien">
            <span className="reveal-line"><span>Vi går</span></span>
            <span className="reveal-line"><span>hele veien.</span></span>
          </h1>
          <p className="hero-intro">{site.creed}</p>
        </div>
        <div className="landing__foot meta hero-intro">
          <span>Scroll for å begynne</span>
          <span aria-hidden="true">↓ 0000 M</span>
        </div>
      </div>
    </section>
  )
}

function SectionMark({ index, camp, altitude }) {
  return (
    <div className="section-mark meta" data-reveal>
      <span>{index} / {camp}</span>
      <span>{String(altitude).padStart(4, '0')} M</span>
    </div>
  )
}

function ManifestSection() {
  return (
    <section className="manifest section shell" id="manifest" aria-labelledby="manifest-title">
      <SectionMark index={manifest.index} camp={manifest.camp} altitude={manifest.altitude} />
      <div className="manifest__lead">
        <p className="meta meta--ice" data-reveal>Felles retning</p>
        <h2 id="manifest-title" aria-label={manifest.headline.join(' ')}>
          {manifest.headline.map((line, index) => (
            <span className="reveal-line" key={line}><span>{index === 2 ? <em>{line}</em> : line}</span></span>
          ))}
        </h2>
        <p className="lead" data-reveal>{manifest.lead}</p>
      </div>
      <blockquote data-reveal>“{manifest.aside}”</blockquote>
      <div className="principles">
        {manifest.principles.map((principle) => (
          <article className="principle" key={principle.n} data-reveal>
            <span className="principle__number meta">{principle.n}</span>
            <h3>{principle.title}</h3>
            <p>{principle.body}</p>
            <span className="principle__arrow" aria-hidden="true">↗</span>
          </article>
        ))}
      </div>
    </section>
  )
}

function RouteSection() {
  return (
    <section className="route-section section shell" id="ruten" aria-labelledby="route-title">
      <div className="route-section__intro">
        <SectionMark index={route.index} camp={route.camp} altitude={route.camps[0].altitude} />
        <div className="route-section__sticky">
          <p className="meta meta--ice" data-reveal>Metode / fire etapper</p>
          <h2 id="route-title" data-reveal>{route.headline.split('\n').map((line) => <span key={line}>{line}</span>)}</h2>
          <p className="lead" data-reveal>{route.lead}</p>
        </div>
      </div>
      <div className="route-list">
        {route.camps.map((camp) => (
          <article className="route-camp" key={camp.n} data-camp={camp.title} data-altitude={camp.altitude}>
            <div className="route-camp__top meta">
              <span>Leir {camp.n}</span>
              <span>{String(camp.altitude).padStart(4, '0')} M</span>
            </div>
            <div className="route-camp__title">
              <span className="route-camp__index">{camp.n}</span>
              <h3>{camp.title}</h3>
            </div>
            <p>{camp.body}</p>
            <ul aria-label={`Fokusområder for ${camp.title}`}>
              {camp.markers.map((marker) => <li key={marker}>{marker}</li>)}
            </ul>
          </article>
        ))}
      </div>
    </section>
  )
}

function TeamSection({ onSelect }) {
  return (
    <section className="team-section section shell" id="laget" aria-labelledby="team-title">
      <SectionMark index={team.index} camp={team.camp} altitude={2050} />
      <div className="team-section__head">
        <h2 id="team-title" data-reveal>{team.headline.split('\n').map((line) => <span key={line}>{line}</span>)}</h2>
        <p className="lead" data-reveal>{team.lead}</p>
      </div>
      <div className="member-list">
        {team.members.map((member, index) => (
          <button className="member-row" type="button" key={member.id} onClick={() => onSelect(member)} data-reveal>
            <span className="member-row__index meta">{String(index + 1).padStart(2, '0')}</span>
            <span className="member-row__name">{member.name}</span>
            <span className="member-row__role meta">{member.role}</span>
            <span className="member-row__signal" style={{ '--seed': member.seed }} aria-hidden="true">
              <i /><i /><i />
            </span>
            <span className="member-row__action" aria-hidden="true">Åpne ↗</span>
          </button>
        ))}
      </div>
    </section>
  )
}

function TeamDialog({ member, onClose }) {
  const closeRef = useRef(null)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    if (!member) return undefined
    const previous = document.activeElement
    const onKey = (event) => event.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    window.setTimeout(() => closeRef.current?.focus(), 30)
    return () => {
      document.removeEventListener('keydown', onKey)
      previous?.focus?.()
    }
  }, [member, onClose])

  return (
    <AnimatePresence>
      {member && (
        <motion.div
          className="member-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.35 }}
          onMouseDown={(event) => event.target === event.currentTarget && onClose()}
        >
          <motion.div
            className="member-modal__panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="member-modal-title"
            initial={{ y: reduceMotion ? 0 : '100%' }}
            animate={{ y: 0 }}
            exit={{ y: reduceMotion ? 0 : '100%' }}
            transition={{ duration: reduceMotion ? 0 : 0.65, ease: [0.76, 0, 0.24, 1] }}
          >
            <div className="member-modal__top meta">
              <span>Peak ID / {member.seed}</span>
              <button ref={closeRef} type="button" onClick={onClose}>Lukk ×</button>
            </div>
            <div className="member-modal__body">
              <div className="member-modal__peak" aria-hidden="true"><i /><i /><i /><i /></div>
              <div>
                <p className="meta meta--signal">{member.role}</p>
                <h2 id="member-modal-title">{member.name}</h2>
                <p className="lead">{member.bio}</p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function FilmSection() {
  return (
    <section className="film-section section shell" id="film" aria-labelledby="film-title">
      <SectionMark index={film.index} camp={film.camp} altitude={2280} />
      <div className="film-frame" data-reveal>
        <div className="film-frame__scan" aria-hidden="true" />
        <div className="film-frame__top meta"><span>Feltlogg / 04</span><span>REC — STANDBY</span></div>
        <div className="film-frame__center">
          <span className="film-frame__play" aria-hidden="true">▶</span>
          <p className="meta">00:00:00</p>
        </div>
        <div className="film-frame__copy">
          <p className="meta meta--signal">{film.status}</p>
          <h2 id="film-title">{film.headline}</h2>
          <p>{film.lead}</p>
        </div>
      </div>
    </section>
  )
}

function ContactSection() {
  return (
    <section className="contact-section section" id="kontakt" aria-labelledby="contact-title">
      <div className="shell">
        <SectionMark index={contact.index} camp={contact.camp} altitude={SUMMIT_M} />
        <p className="meta meta--ice" data-reveal>Toppen / åpen kanal</p>
        <h2 id="contact-title">
          {contact.headline.map((line, index) => (
            <span className="reveal-line" key={line}><span>{index === 1 ? <em>{line}</em> : line}</span></span>
          ))}
        </h2>
        <p className="lead" data-reveal>{contact.lead}</p>
        <a className="contact-link" href={`mailto:${site.email}`} data-reveal>
          <span>{site.email}</span><span aria-hidden="true">↗</span>
        </a>
      </div>
    </section>
  )
}

function ScrollHUD() {
  const altitude = useRef(null)
  const label = useRef(null)
  const progress = useRef(null)

  useLenis(({ scroll, limit }) => {
    const value = Math.max(0, Math.min(1, limit ? scroll / limit : 0))
    if (altitude.current) altitude.current.textContent = String(Math.round(value * SUMMIT_M)).padStart(4, '0')
    if (progress.current) progress.current.style.transform = `scaleY(${value})`
    if (label.current) {
      label.current.textContent = value < 0.14 ? 'Basecamp' : value < 0.36 ? 'Manifest' : value < 0.68 ? 'Ruten' : value < 0.84 ? 'Laget' : value < 0.94 ? 'Film' : 'Toppen'
    }
  })

  return (
    <aside className="scroll-hud" aria-label="Høyde og lesefremdrift">
      <div className="scroll-hud__rail"><i ref={progress} /></div>
      <div className="scroll-hud__readout">
        <span ref={label} className="meta">Basecamp</span>
        <strong><span ref={altitude}>0000</span><small>M</small></strong>
      </div>
    </aside>
  )
}

function Cursor() {
  const cursor = useRef(null)

  useEffect(() => {
    const fine = window.matchMedia('(pointer: fine)')
    if (!fine.matches || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
    const node = cursor.current
    const target = { x: -50, y: -50 }
    const current = { x: -50, y: -50 }
    let frame = 0
    document.body.classList.add('has-custom-cursor')

    const move = (event) => {
      target.x = event.clientX
      target.y = event.clientY
    }
    const hover = (event) => node?.classList.toggle('is-active', Boolean(event.target.closest('a, button')))
    const render = () => {
      current.x += (target.x - current.x) * 0.18
      current.y += (target.y - current.y) * 0.18
      if (node) node.style.transform = `translate3d(${current.x}px, ${current.y}px, 0)`
      frame = requestAnimationFrame(render)
    }
    window.addEventListener('pointermove', move, { passive: true })
    document.addEventListener('pointerover', hover, { passive: true })
    frame = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('pointermove', move)
      document.removeEventListener('pointerover', hover)
      document.body.classList.remove('has-custom-cursor')
    }
  }, [])

  return <div className="cursor" ref={cursor} aria-hidden="true"><i /></div>
}

function JourneyWorld({ profile }) {
  const [ready, setReady] = useState(false)
  const [active, setActive] = useState(false)
  const world = useRef(null)

  useEffect(() => {
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(() => setReady(true), { timeout: 1200 })
      return () => window.cancelIdleCallback(id)
    }
    const id = window.setTimeout(() => setReady(true), 550)
    return () => window.clearTimeout(id)
  }, [])

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setActive(entry.isIntersecting),
      { rootMargin: '160px 0px' },
    )
    if (world.current) observer.observe(world.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div className="journey__world" ref={world} aria-hidden="true">
      <Suspense fallback={<div className="webgl-fallback" />}>
        {ready && <LazyExpeditionCanvas profile={profile} active={active} />}
      </Suspense>
    </div>
  )
}

function Experience({ profile }) {
  const root = useRef(null)
  const [selectedMember, setSelectedMember] = useState(null)
  const closeMember = useCallback(() => setSelectedMember(null), [])

  useGSAP(() => {
    if (profile.reduced) return
    const intro = gsap.timeline({ delay: 0.15 })
    intro.fromTo('.landing h1 .reveal-line > span', { yPercent: 108 }, { yPercent: 0, duration: 1.15, stagger: 0.11, ease: 'power4.out' })
      .fromTo('.hero-intro', { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.75, stagger: 0.08, ease: 'power2.out' }, '-=0.72')

    ScrollTrigger.batch('[data-reveal]', {
      start: 'top 88%',
      once: true,
      onEnter: (elements) => gsap.fromTo(elements, { y: 44, opacity: 0 }, {
        y: 0,
        opacity: 1,
        duration: 0.85,
        stagger: 0.06,
        ease: 'power3.out',
        clearProps: 'transform,opacity',
      }),
    })

    gsap.utils.toArray('.manifest h2 .reveal-line > span, .contact-section h2 .reveal-line > span').forEach((line) => {
      gsap.fromTo(line, { yPercent: 105 }, {
        yPercent: 0,
        duration: 1.05,
        ease: 'power4.out',
        scrollTrigger: { trigger: line, start: 'top 92%', once: true },
      })
    })

    gsap.utils.toArray('.route-camp').forEach((camp) => {
      gsap.fromTo(camp, { opacity: 0.26, y: 70 }, {
        opacity: 1,
        y: 0,
        ease: 'none',
        scrollTrigger: { trigger: camp, start: 'top 92%', end: 'top 50%', scrub: 0.35 },
      })
    })
  }, { scope: root, dependencies: [profile.reduced], revertOnUpdate: true })

  useEffect(() => {
    if (selectedMember) document.body.classList.add('modal-open')
    else document.body.classList.remove('modal-open')
    return () => document.body.classList.remove('modal-open')
  }, [selectedMember])

  return (
    <div ref={root}>
      <SmoothScrollBridge />
      <Header />
      <ScrollHUD />
      <Cursor />
      <main>
        <Landing />
        <div className="journey">
          <JourneyWorld profile={profile} />
          <ManifestSection />
          <RouteSection />
          <TeamSection onSelect={setSelectedMember} />
          <FilmSection />
        </div>
        <ContactSection />
      </main>
      <footer className="site-footer shell meta">
        <span>© {site.year} {site.group}</span>
        <span>{site.course}</span>
        <a href="#landing">Til basecamp ↑</a>
      </footer>
      <TeamDialog member={selectedMember} onClose={closeMember} />
    </div>
  )
}

function App() {
  const profile = usePerformanceProfile()
  return (
    <ReactLenis
      root
      options={{
        autoRaf: false,
        lerp: profile.lowPower ? 0.14 : 0.085,
        duration: 1.2,
        smoothWheel: !profile.reduced,
        syncTouch: false,
        wheelMultiplier: 0.9,
      }}
    >
      <Experience profile={profile} />
    </ReactLenis>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

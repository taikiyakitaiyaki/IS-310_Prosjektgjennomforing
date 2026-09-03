import { StrictMode, Suspense, lazy, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { LazyMotion, domAnimation, useReducedMotion } from 'motion/react'
import * as m from 'motion/react-m'
import { contact, film, manifest, nav, route, site } from './Model/site.js'
import { MotionProvider } from './View/lib/motion.jsx'
import './View/css/base.css'
import './View/css/site.css'

const LazyUnicornHero = lazy(() => import('./View/components/UnicornHero.jsx'))
const LazyFieldMap = lazy(() => import('./View/components/FieldMapCanvas.jsx'))

const revealEase = [0.16, 1, 0.3, 1]

function Reveal({ children, className = '', delay = 0 }) {
  const reduce = useReducedMotion()

  return (
    <m.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.72, delay, ease: revealEase }}
    >
      {children}
    </m.div>
  )
}

function Header() {
  const [visible, setVisible] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const landing = document.getElementById('landing')
    if (!landing) return undefined

    const observer = new IntersectionObserver(([entry]) => setVisible(!entry.isIntersecting), {
      threshold: 0.04,
    })
    observer.observe(landing)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!open) return undefined
    const close = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [open])

  return (
    <header className={`site-header ${visible ? 'is-visible' : ''}`}>
      <a className="brand" href="#landing" aria-label="Gruppe 11, tilbake til toppen">
        G11
      </a>
      <button
        className="menu-toggle"
        type="button"
        aria-controls="site-navigation"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? 'Lukk' : 'Meny'}
      </button>
      <nav id="site-navigation" className={`site-nav ${open ? 'is-open' : ''}`} aria-label="Hovednavigasjon">
        {nav.map((item) => (
          <a key={item.id} href={`#${item.id}`} onClick={() => setOpen(false)}>
            {item.label}
          </a>
        ))}
      </nav>
    </header>
  )
}

function Landing() {
  return (
    <section className="landing" id="landing" aria-labelledby="landing-title">
      <div className="landing__sky" aria-hidden="true" />
      <Suspense fallback={null}>
        <LazyUnicornHero />
      </Suspense>
      <h1 id="landing-title" className="visually-hidden">
        {site.group} - vi går hele veien
      </h1>
    </section>
  )
}

function MediaFigure({ src, alt, width, height, className = '', caption, eager = false }) {
  const [state, setState] = useState('loading')

  return (
    <figure className={`media ${className} is-${state}`}>
      <div className="media__frame">
        {state === 'loading' ? <span className="media__skeleton" aria-hidden="true" /> : null}
        {state === 'error' ? (
          <p className="media__error" role="status">
            Bildet kunne ikke lastes.
          </p>
        ) : (
          <img
            src={src}
            alt={alt}
            width={width}
            height={height}
            loading={eager ? 'eager' : 'lazy'}
            decoding="async"
            onLoad={() => setState('ready')}
            onError={() => setState('error')}
          />
        )}
      </div>
      {caption ? <figcaption>{caption}</figcaption> : null}
    </figure>
  )
}

function ManifestSection() {
  return (
    <section className="manifest section" id="manifest" aria-labelledby="manifest-title">
      <div className="shell manifest__grid">
        <Reveal className="manifest__copy">
          <p className="eyebrow">{manifest.eyebrow}</p>
          <h2 id="manifest-title">
            {manifest.headline.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </h2>
          <p className="section-lead">{manifest.lead}</p>
        </Reveal>

        <MediaFigure
          className="manifest__media"
          src="/media/team-ridge.webp"
          alt="Fem studenter går samlet over en værutsatt fjellrygg"
          width="1672"
          height="941"
          caption="Vi kommer lengst når alle bærer."
        />

        <Reveal className="manifest__quote" delay={0.08}>
          <blockquote>«{manifest.quote}»</blockquote>
        </Reveal>

        <div className="principles" aria-label="Slik arbeider vi">
          {manifest.principles.map((principle, index) => (
            <Reveal className={`principle principle--${index + 1}`} delay={index * 0.07} key={principle.title}>
              <h3>{principle.title}</h3>
              <p>{principle.body}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

function DeferredFieldMap() {
  const host = useRef(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const node = host.current
    if (!node) return undefined
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        setReady(true)
        observer.disconnect()
      },
      { rootMargin: '240px 0px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <div className="route-map" ref={host} aria-label="Interaktiv terrengmodell av prosjektets rute">
      <Suspense fallback={<div className="route-map__fallback" aria-hidden="true" />}>
        {ready ? <LazyFieldMap /> : <div className="route-map__fallback" aria-hidden="true" />}
      </Suspense>
      <p className="route-map__caption">Flytt pekeren for å lese terrenget.</p>
    </div>
  )
}

function RouteSection() {
  const reduce = useReducedMotion()

  return (
    <section className="route-section section" id="ruten" aria-labelledby="route-title">
      <div className="shell">
        <Reveal className="section-heading">
          <h2 id="route-title">{route.headline}</h2>
          <p className="section-lead">{route.lead}</p>
        </Reveal>

        <div className="route-layout">
          <div className="route-layout__visual">
            <DeferredFieldMap />
            <MediaFigure
              className="route-process"
              src="/media/process-table.webp"
              alt="Studenter samarbeider over skisser og et rutekart på et arbeidsbord"
              width="1100"
              height="1374"
              caption="Planen blir bedre når den ligger åpent på bordet."
            />
          </div>

          <ol className="route-stages">
            {route.stages.map((stage) => (
              <m.li
                key={stage.title}
                initial={reduce ? false : { y: 24 }}
                whileInView={{ y: 0 }}
                viewport={{ amount: 0.55 }}
                transition={{ duration: 0.45 }}
              >
                <h3>{stage.title}</h3>
                <p>{stage.body}</p>
                <ul aria-label={`Fokus for ${stage.title}`}>
                  {stage.markers.map((marker) => (
                    <li key={marker}>{marker}</li>
                  ))}
                </ul>
              </m.li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}

function FilmSection() {
  return (
    <section className="film-section section" id="film" aria-labelledby="film-title">
      <div className="shell film-grid">
        <MediaFigure
          className="film-media"
          src="/media/field-film.webp"
          alt="En student filmer to medstudenter på en tåkete fjellsti"
          width="1536"
          height="1024"
        />
        <Reveal className="film-copy">
          <p className="film-status">{film.status}</p>
          <h2 id="film-title">{film.headline}</h2>
          <p className="section-lead">{film.lead}</p>
          <p className="film-empty">{film.empty}</p>
        </Reveal>
      </div>
    </section>
  )
}

function ContactSection() {
  return (
    <section className="contact-section section" id="kontakt" aria-labelledby="contact-title">
      <div className="shell contact-grid">
        <Reveal className="contact-copy">
          <h2 id="contact-title">{contact.headline}</h2>
          <p className="section-lead">{contact.lead}</p>
          <a className="contact-button" href={`mailto:${site.email}`}>
            {contact.cta}
          </a>
        </Reveal>
        <p className="contact-address">
          <span>{site.email}</span>
          <span>{site.course}</span>
        </p>
      </div>
    </section>
  )
}

function App() {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionProvider>
        <a className="skip-link" href="#manifest">
          Hopp til innholdet
        </a>
        <Header />
        <main>
          <Landing />
          <ManifestSection />
          <RouteSection />
          <FilmSection />
          <ContactSection />
        </main>
        <footer className="site-footer shell">
          <span>{site.group}</span>
          <span>© {site.year}</span>
          <a href="#landing">Til toppen</a>
        </footer>
      </MotionProvider>
    </LazyMotion>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

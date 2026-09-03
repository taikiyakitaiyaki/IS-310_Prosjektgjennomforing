import { StrictMode, Suspense, lazy, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { plan, sections, site } from './Model/site.js'
import { MotionProvider } from './View/lib/motion.jsx'
import './View/css/base.css'
import './View/css/site.css'

const LazyUnicornHero = lazy(() => import('./View/components/UnicornHero.jsx'))

function Landing() {
  return (
    <section className="landing" aria-labelledby="landing-title">
      <div className="landing__sky" aria-hidden="true" />
      <Suspense fallback={null}>
        <LazyUnicornHero />
      </Suspense>
      <h1 id="landing-title" className="visually-hidden">
        {site.group} - vi går hele veien
      </h1>
      <nav className="hero-titles" aria-label="Gå til en del av siden">
        {sections.map((section) => (
          <a key={section.id} href={`#${section.id}`}>
            {section.title}
          </a>
        ))}
      </nav>
    </section>
  )
}

function PlanSection() {
  const [imageState, setImageState] = useState('loading')

  return (
    <section className="plan" aria-labelledby="plan-title">
      <div className={`plan__media is-${imageState}`}>
        {imageState === 'loading' ? <span className="plan__skeleton" aria-hidden="true" /> : null}
        {imageState === 'error' ? (
          <p className="plan__error" role="status">
            Bildet kunne ikke lastes.
          </p>
        ) : (
          <img
            src={plan.image.src}
            alt={plan.image.alt}
            width={plan.image.width}
            height={plan.image.height}
            loading="lazy"
            decoding="async"
            onLoad={() => setImageState('ready')}
            onError={() => setImageState('error')}
          />
        )}
      </div>

      <div className="plan__content">
        <div className="plan__intro">
          <h2 id="plan-title">{plan.title}</h2>
          <p>{plan.body}</p>
        </div>

        <ul className="plan__markers" aria-label="Planens tre fokusområder">
          {plan.markers.map((marker) => (
            <li key={marker}>{marker}</li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function TopicSections() {
  return (
    <div className="topics">
      {sections.map((section, index) => (
        <section className="topic" id={section.id} aria-labelledby={`${section.id}-title`} key={section.id}>
          <span className="topic__index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
          <h2 id={`${section.id}-title`}>{section.title}</h2>
        </section>
      ))}
    </div>
  )
}

function App() {
  return (
    <MotionProvider>
      <main>
        <Landing />
        <PlanSection />
        <TopicSections />
      </main>
    </MotionProvider>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

import { StrictMode, Suspense, lazy, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { plan, site } from './Model/site.js'
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

function App() {
  return (
    <MotionProvider>
      <main>
        <Landing />
        <PlanSection />
      </main>
    </MotionProvider>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

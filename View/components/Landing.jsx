import { Suspense, lazy, useRef } from 'react'
import { controls, sections, site } from '../../Model/site.js'
import { gsap, useGSAP } from '../lib/gsap.js'
import { useMotion } from '../lib/motion.jsx'

const LazyUnicornHero = lazy(() => import('./UnicornHero.jsx'))

/* ===========================================================================
   The landing: the Unicorn scene, and the four titles that are the way in.

   The scene is kept exactly as the opening experience. What is added around
   it: the titles rise out of their lines once the cover lifts, they lean
   toward the pointer, and on the way out the mountain sinks more slowly than
   the page while the titles leave faster - the two layers at different depths
   is what makes the fold read as space rather than as a cut. The mist along
   the bottom edge is how the scene hands over to the page.
   =========================================================================== */

const FINE_POINTER = '(hover: hover) and (pointer: fine)'

export default function Landing() {
  const root = useRef(null)
  const depth = useRef(null)
  const titles = useRef(null)
  const { still } = useMotion()

  useGSAP(
    () => {
      if (still) return undefined

      gsap
        .timeline({
          scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom top', scrub: true },
        })
        .to(depth.current, { yPercent: 24, scale: 1.08, ease: 'none' }, 0)
        .to(titles.current, { yPercent: -36, autoAlpha: 0, ease: 'none' }, 0)

      /* A mouse, not a finger: a title that leans toward a fingertip only
         moves after the tap, which is too late to mean anything. */
      if (!window.matchMedia(FINE_POINTER).matches) return undefined

      const cleanups = gsap.utils.toArray('.hero-title', root.current).map((link) => {
        const toX = gsap.quickTo(link, 'x', { duration: 0.65, ease: 'power3' })
        const toY = gsap.quickTo(link, 'y', { duration: 0.65, ease: 'power3' })

        const move = (event) => {
          const rect = link.getBoundingClientRect()
          toX((event.clientX - (rect.left + rect.width / 2)) * 0.12)
          toY((event.clientY - (rect.top + rect.height / 2)) * 0.22)
        }
        const leave = () => {
          toX(0)
          toY(0)
        }

        link.addEventListener('pointermove', move)
        link.addEventListener('pointerleave', leave)
        return () => {
          link.removeEventListener('pointermove', move)
          link.removeEventListener('pointerleave', leave)
        }
      })

      return () => cleanups.forEach((undo) => undo())
    },
    { dependencies: [still], revertOnUpdate: true, scope: root },
  )

  return (
    <section className="landing" aria-labelledby="landing-title" ref={root}>
      <div className="landing__sky" aria-hidden="true" />

      <div className="landing__depth" ref={depth}>
        <Suspense fallback={null}>
          <LazyUnicornHero />
        </Suspense>
      </div>

      <h1 id="landing-title" className="visually-hidden">
        {site.group} - {site.tagline.toLowerCase()}
      </h1>

      <nav className="hero-titles" aria-label={controls.heroNav} ref={titles}>
        {sections.map((section, index) => (
          <a key={section.id} className="hero-title" href={`#${section.id}`} style={{ '--i': index }}>
            <span className="hero-title__mask">
              <span className="hero-title__word">{section.title}</span>
            </span>
          </a>
        ))}
      </nav>

      <div className="landing__mist" aria-hidden="true" />
    </section>
  )
}

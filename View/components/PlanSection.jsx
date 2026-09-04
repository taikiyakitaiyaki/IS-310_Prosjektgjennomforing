import { useRef, useState } from 'react'
import { controls, plan } from '../../Model/site.js'
import { gsap, useGSAP } from '../lib/gsap.js'
import { useMotion } from '../lib/motion.jsx'
import { SplitWords, useReveal } from '../lib/reveal.jsx'
import { cx } from '../lib/cx.js'
import ContourMap from './ContourMap.jsx'

/* ===========================================================================
   Vi sketcher en plan.

   The photograph of the table on one side; on the other, the heading over the
   map of the ridge - which sketches itself, contour by contour and then the
   route, as the section is scrolled into place. The photograph uncovers from
   the bottom as it arrives and drifts a little slower than the page after
   that, so the two columns sit at different depths.
   =========================================================================== */

export default function PlanSection() {
  const root = useRef(null)
  const drift = useRef(null)
  const [mediaRef, inView] = useReveal()
  const [imageState, setImageState] = useState('loading')
  const { still } = useMotion()

  useGSAP(
    () => {
      if (still) return
      gsap.fromTo(
        drift.current,
        { yPercent: -7 },
        {
          yPercent: 7,
          ease: 'none',
          scrollTrigger: { trigger: root.current, start: 'top bottom', end: 'bottom top', scrub: true },
        },
      )
    },
    { dependencies: [still], revertOnUpdate: true, scope: root },
  )

  return (
    <section className="plan" aria-labelledby="plan-title" ref={root}>
      <div className={cx('plan__media', `is-${imageState}`, inView && 'is-in')} ref={mediaRef}>
        {/* The uncovering happens on this inner window, never on the element
            the observer watches: a fully clipped target is never seen. */}
        <div className="plan__window">
          <div className="plan__drift" ref={drift}>
            {imageState === 'loading' ? <span className="plan__skeleton" aria-hidden="true" /> : null}
            {imageState === 'error' ? (
              <p className="plan__error" role="status">
                {controls.imageError}
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
        </div>
      </div>

      <div className="plan__content">
        <ContourMap className="plan__map" />
        <SplitWords as="h2" id="plan-title" text={plan.title} className="plan__title" />
      </div>
    </section>
  )
}

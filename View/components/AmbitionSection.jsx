import { lazy } from 'react'
import { ambition, contact } from '../../Model/site.js'
import BlurProse from './BlurProse.jsx'
import SceneSlot from './SceneSlot.jsx'

const LazyParticleGlobe = lazy(() => import('./ParticleGlobe.jsx'))
const LazyParticleStream = lazy(() => import('./ParticleStream.jsx'))

/* ===========================================================================
   Ambisjonsnivå: the ambitions come into focus on either side of the
   turning particle globe, with the contact line at the foot.

   The contact line belongs to the page rather than to the ambitions, but it
   stands inside this section all the same: the section is exactly one screen
   tall, and anything after it would push its heading up under the
   navigation at the bottom of the scroll.
   =========================================================================== */
export default function AmbitionSection() {
  return (
    <>
      <SceneSlot className="ambition__background" aria-hidden="true">
        <LazyParticleStream />
      </SceneSlot>

      <BlurProse className="ambition__prose ambition__prose--left" paragraphs={[ambition.left]} />

      <SceneSlot className="ambition__scene" aria-hidden="true">
        <LazyParticleGlobe />
      </SceneSlot>

      <BlurProse className="ambition__prose ambition__prose--right" paragraphs={[ambition.right]} />

      <footer className="contact" aria-label={contact.label}>
        {contact.items.map((item) => (
          <a
            className="contact__item"
            href={item.href}
            key={item.label}
            {...(item.href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : null)}
          >
            <span className="contact__label">{item.label}:</span> {item.value}
          </a>
        ))}
      </footer>
    </>
  )
}

import { lazy } from 'react'
import { ambition } from '../../Model/site.js'
import { Reveal } from '../lib/reveal.jsx'
import SceneSlot from './SceneSlot.jsx'

const LazyRidgeCanvas = lazy(() => import('./RidgeCanvas.jsx'))

/* ===========================================================================
   Ambisjonsnivå: the heading, the claim and the goals set against it on the
   left, and the ridge below whose route climbs to the summit to prove it.

   The claim is the line; the goals are what it means in practice, so they read
   as prose at reading size rather than as display type.
   =========================================================================== */
export default function AmbitionSection() {
  return (
    <>
      <div className="ambition__intro">
        <Reveal as="p" className="ambition__body" delay={160}>
          {ambition.body}
        </Reveal>

        <Reveal className="ambition__goals" delay={260}>
          <h3 className="ambition__goals-title">{ambition.goalsTitle}</h3>
          <ul className="ambition__goals-list">
            {ambition.goals.map((goal) => (
              <li key={goal}>{goal}</li>
            ))}
          </ul>
        </Reveal>
      </div>

      <SceneSlot className="topic__scene" aria-hidden="true">
        <LazyRidgeCanvas />
      </SceneSlot>
    </>
  )
}

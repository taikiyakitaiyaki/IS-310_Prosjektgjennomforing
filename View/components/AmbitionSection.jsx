import { lazy } from 'react'
import { ambition } from '../../Model/site.js'
import { Reveal } from '../lib/reveal.jsx'
import SceneSlot from './SceneSlot.jsx'

const LazyRidgeCanvas = lazy(() => import('./RidgeCanvas.jsx'))

/* ===========================================================================
   Ambisjonsnivå: the heading, the claim set against it on the left, and the
   ridge below whose route climbs to the summit to prove it.
   =========================================================================== */
export default function AmbitionSection() {
  return (
    <>
      <Reveal as="p" className="ambition__body" delay={160}>
        {ambition.body}
      </Reveal>
      <SceneSlot className="topic__scene" aria-hidden="true">
        <LazyRidgeCanvas />
      </SceneSlot>
    </>
  )
}

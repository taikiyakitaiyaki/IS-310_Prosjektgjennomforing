import { controls } from '../../Model/site.js'
import { useMotion } from '../lib/motion.jsx'

/* ===========================================================================
   One switch for everything on the page that moves on its own: the landing
   scene, the crossfading group photo, the ridge, the eased scroll. It sits in
   the same corner on every screen so it can be found while the hero is
   playing, which is when it is most likely to be wanted.

   A visitor who asked the system for reduced motion already has all of it
   stopped, so for them the switch would do nothing and is not shown.
   =========================================================================== */
export default function PauseToggle() {
  const { reduced, pausedByUser, togglePaused } = useMotion()

  if (reduced) return null

  return (
    <button
      type="button"
      className="pause-toggle"
      aria-pressed={pausedByUser}
      aria-label={pausedByUser ? controls.playLabel : controls.pauseLabel}
      onClick={togglePaused}
    >
      <span className="pause-toggle__mark" aria-hidden="true" />
      <span aria-hidden="true">{pausedByUser ? controls.play : controls.pause}</span>
    </button>
  )
}

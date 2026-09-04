import { useRef } from 'react'
import { controls } from '../../Model/site.js'
import { useMotion } from '../lib/motion.jsx'

/* ===========================================================================
   One switch for everything on the page that moves on its own: the landing
   scene, the crossfading group photo, the ridge, the eased scroll. It sits in
   the same corner on every screen so it can be found while the hero is
   playing, which is when it is most likely to be wanted.

   The site opens still, so this starts as a play button. While it offers to
   start things a note follows the cursor saying what that will cost - the
   moving version of this page is the expensive one, and it is only fair to say
   so before it is switched on.

   A visitor who asked the system for reduced motion already has all of it
   stopped, so for them the switch would do nothing and is not shown.
   =========================================================================== */
export default function PauseToggle() {
  const { reduced, pausedByUser, togglePaused } = useMotion()
  const hint = useRef(null)

  /* Written straight to custom properties on the note rather than through
     state: following a cursor should cost one style write per move, not a
     re-render of the one control that lives on every screen of the site. */
  const follow = (event) => {
    if (event.pointerType !== 'mouse') return

    const node = hint.current
    if (!node) return

    node.style.setProperty('--x', `${event.clientX}px`)
    node.style.setProperty('--y', `${event.clientY}px`)
  }

  if (reduced) return null

  return (
    <button
      type="button"
      className="pause-toggle"
      aria-pressed={pausedByUser}
      aria-label={pausedByUser ? controls.playLabel : controls.pauseLabel}
      /* The note is a mouse affordance; this is how everyone else is told. */
      aria-describedby={pausedByUser ? 'pause-toggle-hint' : undefined}
      onClick={togglePaused}
      onPointerEnter={follow}
      onPointerMove={follow}
    >
      <span className="pause-toggle__mark" aria-hidden="true" />
      <span aria-hidden="true">{pausedByUser ? controls.play : controls.pause}</span>

      {pausedByUser ? (
        <span className="pause-toggle__hint" id="pause-toggle-hint" ref={hint}>
          {controls.playHint}
        </span>
      ) : null}
    </button>
  )
}

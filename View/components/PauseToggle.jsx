import { useRef } from 'react'
import { controls } from '../../Model/site.js'
import { useLandingInView } from '../lib/landing.js'
import { useMotion } from '../lib/motion.jsx'
import { cx } from '../lib/cx.js'

/* ===========================================================================
   The switch over the landing scene - the published 3D scene that opens the
   site, and the one genuinely expensive thing on the page. Everything else the
   site does, the ridge and the crossfades and the scrubbed timelines, is cheap
   enough to keep running whichever way this sits.

   It stays in the same corner on every screen so it can be found while the
   scene is playing, which is when it is most likely to be wanted.

   The site opens still, so this starts as a play button. While it offers to
   start things a note follows the cursor saying what that will cost - the
   moving version of this page is the expensive one, and it is only fair to say
   so before it is switched on.

   A visitor who asked the system for reduced motion already has all of it
   stopped, so for them the switch would do nothing and is not shown.
   =========================================================================== */
export default function PauseToggle() {
  /* The heavy 3D scene has been replaced with lightweight vector graphics,
     so the pause/performance warning toggle is no longer needed. */
  return null
}

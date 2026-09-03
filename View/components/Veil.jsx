import { useEffect, useState } from 'react'
import { useMotion } from '../lib/motion.jsx'

/* ===========================================================================
   The cover the page opens from.

   It holds for as long as the web font takes to arrive - capped, so a slow
   connection never leaves the visitor staring at a blank sheet - and then
   lifts, at which point the hero titles come up behind it. `is-ready` on the
   root element is what everything waiting on that moment listens for.

   A visitor who asked for reduced motion gets the page at once, with no cover.
   =========================================================================== */

const FONT_WAIT = 1400
const LIFT = 1300

export default function Veil() {
  const { reduced } = useMotion()
  const [gone, setGone] = useState(reduced)

  useEffect(() => {
    const root = document.documentElement

    if (reduced) {
      root.classList.add('is-ready')
      setGone(true)
      return undefined
    }

    let done = false
    let lift = null
    const finish = () => {
      if (done) return
      done = true
      root.classList.add('is-ready')
      lift = window.setTimeout(() => setGone(true), LIFT)
    }

    const cap = window.setTimeout(finish, FONT_WAIT)
    const fonts = document.fonts?.ready
    if (fonts) fonts.then(finish)

    return () => {
      window.clearTimeout(cap)
      if (lift) window.clearTimeout(lift)
    }
  }, [reduced])

  return gone ? null : <div className="veil" aria-hidden="true" />
}

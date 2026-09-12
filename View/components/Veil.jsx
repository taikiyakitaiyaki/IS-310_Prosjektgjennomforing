import { useEffect, useState } from 'react'
import { useMotion } from '../lib/motion.jsx'

/* ===========================================================================
   The cover the page opens from.

   Shown only on the very first visit to the top of the page in a session.
   On refresh, when entering via an anchor link, or when already scrolled down,
   it is immediately skipped so the visitor is never blocked by a grey curtain.
   =========================================================================== */

const FONT_WAIT = 1400
const LIFT = 1300

function shouldSkipVeil(reduced) {
  if (reduced) return true
  if (typeof window === 'undefined') return true

  const alreadyOpened = sessionStorage.getItem('site_opened')
  const hasHash = window.location.hash.length > 1
  const isScrolled = window.scrollY > 50

  return Boolean(alreadyOpened || hasHash || isScrolled)
}

export default function Veil() {
  const { reduced } = useMotion()
  const [gone, setGone] = useState(() => shouldSkipVeil(reduced))

  useEffect(() => {
    const root = document.documentElement

    if (shouldSkipVeil(reduced)) {
      root.classList.add('is-ready')
      setGone(true)
      return undefined
    }

    // Mark that the site has opened in this session
    sessionStorage.setItem('site_opened', '1')

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

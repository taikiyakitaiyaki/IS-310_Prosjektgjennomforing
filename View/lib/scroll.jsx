import { createContext, use, useCallback, useEffect, useRef } from 'react'
import { ScrollTrigger } from './gsap.js'
import { useMotion } from './motion.jsx'

/* ===========================================================================
   Native hardware-accelerated scroll.
   Lenis smooth-wheel has been completely removed to eliminate input latency,
   artificial damping, and sluggishness on all devices (especially Mac trackpads).
   =========================================================================== */

const ScrollContext = createContext(null)

function targetFor(hash) {
  const id = decodeURIComponent(hash.replace(/^#/, ''))
  return id ? document.getElementById(id) : document.documentElement
}

export function SmoothScroll({ children }) {
  const { still } = useMotion()
  const stillRef = useRef(still)
  useEffect(() => {
    stillRef.current = still
  }, [still])

  /* Sync ScrollTrigger with native browser scroll */
  useEffect(() => {
    ScrollTrigger.refresh()
  }, [])

  /* Deliberately stable, and that stability is load-bearing: the effect below
     jumps to the address bar's section, and it must run when the page arrives
     and at no other time. Give this callback a dependency and every pause or
     resume would rebuild it, re-run that effect, and drag the visitor back to
     whichever section they last opened from the navigation. */
  const scrollTo = useCallback((target, { immediate = false } = {}) => {
    const node = typeof target === 'string' ? targetFor(target) : target
    if (!node) return

    const behavior = immediate || stillRef.current ? 'auto' : 'smooth'
    if (node === document.documentElement) {
      window.scrollTo({ top: 0, behavior })
    } else {
      node.scrollIntoView({ block: 'start', behavior })
    }
  }, [])

  /* A link straight to a section: the browser tried to honour it before React
     had rendered anything, so do it again once the page exists - and once more
     when the web font lands, since that is what settles the layout.

     On arrival only. The hash keeps changing as the visitor uses the
     navigation, so anything that re-ran this later would read a stale
     destination and move the page out from under them. */
  useEffect(() => {
    if (window.location.hash.length < 2) return undefined

    let cancelled = false
    const jump = () => {
      if (cancelled) return
      const node = targetFor(window.location.hash)
      if (node && node !== document.documentElement) scrollTo(node, { immediate: true })
    }

    const frame = requestAnimationFrame(() => requestAnimationFrame(jump))
    const fonts = document.fonts?.ready
    if (fonts) fonts.then(jump)

    return () => {
      cancelled = true
      cancelAnimationFrame(frame)
    }
  }, [scrollTo])

  /* Every in-page anchor on the site goes through one handler. */
  useEffect(() => {
    const onClick = (event) => {
      if (event.defaultPrevented || event.button !== 0) return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

      const anchor = event.target.closest('a[href^="#"]')
      if (!anchor) return

      const hash = anchor.getAttribute('href')
      const node = targetFor(hash)
      if (!node) return

      event.preventDefault()
      scrollTo(node)

      if (node === document.documentElement) {
        window.history.pushState(null, '', window.location.pathname + window.location.search)
      } else {
        window.history.pushState(null, '', hash)
        /* Move keyboard focus along with the view, without a second scroll. */
        if (!node.hasAttribute('tabindex')) node.setAttribute('tabindex', '-1')
        node.focus({ preventScroll: true })
      }
    }

    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [scrollTo])

  return <ScrollContext value={{ scrollTo }}>{children}</ScrollContext>
}

export function useScrollTo() {
  const value = use(ScrollContext)
  if (!value) throw new Error('useScrollTo must be used inside <SmoothScroll>')
  return value.scrollTo
}

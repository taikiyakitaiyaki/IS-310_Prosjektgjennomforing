import { createContext, use, useCallback, useEffect, useRef } from 'react'
import Lenis from 'lenis'
import 'lenis/dist/lenis.css'
import { gsap, ScrollTrigger } from './gsap.js'
import { useMotion } from './motion.jsx'

/* ===========================================================================
   How the page scrolls.

   On a desktop with a mouse the scroll is eased through Lenis, which is what
   lets the scroll-driven scenes feel continuous rather than stepped. Everywhere
   else the scroll is left native: on touch screens the browser's own physics
   are better than anything scripted, a visitor who asked for reduced motion
   gets exactly the scroll they asked for, and inside an embed the wheel must
   keep reaching the host page once this one runs out - a smoothed scroll would
   swallow it at the bottom edge.

   In-page anchors are handled here too, so the hero titles and the navigation
   behave the same whichever scroll is in charge, and a link straight to a
   section (#medlemmer) lands on it even though the section is rendered after
   the browser has already tried to jump there.
   =========================================================================== */

const ScrollContext = createContext(null)

function isEmbedded() {
  try {
    return window.self !== window.top
  } catch {
    return true
  }
}

function targetFor(hash) {
  const id = decodeURIComponent(hash.replace(/^#/, ''))
  return id ? document.getElementById(id) : document.documentElement
}

export function SmoothScroll({ children }) {
  const { still, lowPower } = useMotion()
  const lenis = useRef(null)

  /* Read through a ref rather than closed over, so that pausing and resuming
     does not rebuild `scrollTo` below. Only event handlers read it, so a
     render's worth of lag cannot be observed. */
  const stillRef = useRef(still)
  useEffect(() => {
    stillRef.current = still
  }, [still])

  useEffect(() => {
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches
    if (still || lowPower || isEmbedded() || !fine) return undefined

    const instance = new Lenis({
      lerp: 0.085,
      smoothWheel: true,
      syncTouch: false,
      autoRaf: false,
      anchors: false,
    })
    lenis.current = instance
    window.__lenis = instance

    /* One clock for everything: Lenis steps on GSAP's ticker, and tells
       ScrollTrigger whenever it has moved the page. */
    instance.on('scroll', ScrollTrigger.update)
    const tick = (time) => instance.raf(time * 1000)
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)

    return () => {
      gsap.ticker.remove(tick)
      instance.destroy()
      lenis.current = null
      delete window.__lenis
      ScrollTrigger.refresh()
    }
  }, [still, lowPower])

  /* Deliberately stable, and that stability is load-bearing: the effect below
     jumps to the address bar's section, and it must run when the page arrives
     and at no other time. Give this callback a dependency and every pause or
     resume would rebuild it, re-run that effect, and drag the visitor back to
     whichever section they last opened from the navigation. */
  const scrollTo = useCallback((target, { immediate = false } = {}) => {
    const node = typeof target === 'string' ? targetFor(target) : target
    if (!node) return

    /* Both paths read scroll-margin-top from the stylesheet on their own, so
       how far under the navigation a section comes to rest is set in one
       place, in CSS, and never passed as an offset from here. */
    if (lenis.current) {
      lenis.current.scrollTo(node === document.documentElement ? 0 : node, { immediate, force: immediate })
      return
    }

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

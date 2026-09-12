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

  /* Native scroll restoration */
  useEffect(() => {
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'auto'
    }
    ScrollTrigger.refresh()
  }, [])

  /* Preserve scroll position across refreshes when no hash is present */
  useEffect(() => {
    if (window.location.hash.length >= 2) return undefined

    let timer = null
    const onScroll = () => {
      if (timer) return
      timer = setTimeout(() => {
        timer = null
        if (window.scrollY > 0) {
          sessionStorage.setItem('scroll_y', String(window.scrollY))
        }
      }, 100)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (timer) clearTimeout(timer)
    }
  }, [])

  useEffect(() => {
    if (window.location.hash.length >= 2) return undefined

    const saved = sessionStorage.getItem('scroll_y')
    if (saved) {
      const top = parseInt(saved, 10)
      if (top > 0) {
        const html = document.documentElement
        const prevBehavior = html.style.scrollBehavior
        html.style.scrollBehavior = 'auto'
        window.scrollTo({ top, behavior: 'auto' })
        requestAnimationFrame(() => {
          html.style.scrollBehavior = prevBehavior
          ScrollTrigger.refresh()
        })
      }
    }
  }, [])

  /* Deliberately stable: jumps to the address bar's section */
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

  /* A link straight to a section: jump immediately without smooth crawl on load */
  useEffect(() => {
    if (window.location.hash.length < 2) return undefined

    let cancelled = false
    const jump = () => {
      if (cancelled) return
      const node = targetFor(window.location.hash)
      if (node && node !== document.documentElement) {
        const html = document.documentElement
        const prevBehavior = html.style.scrollBehavior
        html.style.scrollBehavior = 'auto'
        node.scrollIntoView({ block: 'start', behavior: 'auto' })
        requestAnimationFrame(() => {
          html.style.scrollBehavior = prevBehavior
          ScrollTrigger.refresh()
        })
      }
    }

    const frame = requestAnimationFrame(() => requestAnimationFrame(jump))
    const fonts = document.fonts?.ready
    if (fonts) fonts.then(jump)

    return () => {
      cancelled = true
      cancelAnimationFrame(frame)
    }
  }, [])

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

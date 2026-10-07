import { useEffect, useState } from 'react'
import { controls, sections, site } from '../../Model/site.js'
import { useLandingInView } from '../lib/landing.js'
import { cx } from '../lib/cx.js'

/* ===========================================================================
   The navigation that takes over once the hero titles have scrolled away.

   It draws nothing behind itself: white type with a little shadow, the night and the photographs alike. The current
   section is underlined.
   =========================================================================== */

/* How far the page has to move one way before the nav follows. Smaller moves
   add up rather than count, so the last pixels of a smoothed or
   rubber-banded scroll cannot flicker it. */
const TUCK_SLACK = 10
/* The page also moves without anyone scrolling it: as pictures and scenes
   above arrive, the browser shifts it a few pixels to keep the reading
   place still. Upward movement with no wheel, finger or key behind it only
   brings the nav back past this much. */
const DRIFT = 60
const INPUT_WINDOW = 400

export default function SiteNav() {
  const [active, setActive] = useState(null)
  const [tucked, setTucked] = useState(false)

  /* The navigation is what the landing hands over to, so it appears exactly
     when the landing leaves. */
  const visible = !useLandingInView()

  /* Out of the way while the page is read downward, and back the moment it is
     scrolled up - which is when a visitor goes looking for it. While a
     member's profile is open the page is locked (MemberProfile sets
     `overflow: hidden` on body) and the nav stays as it was. */
  useEffect(() => {
    let last = window.scrollY
    let frame = 0
    let input = -Infinity
    const read = () => {
      frame = 0
      const y = window.scrollY
      const end = document.documentElement.scrollHeight - window.innerHeight
      if (document.body.style.overflow === 'hidden' || y < 0 || y > end) {
        last = Math.min(Math.max(y, 0), end)
        return
      }
      const moved = y - last
      const asked = performance.now() - input < INPUT_WINDOW
      if (moved >= TUCK_SLACK) setTucked(true)
      else if (-moved >= (asked ? TUCK_SLACK : DRIFT)) setTucked(false)
      else return
      last = y
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(read)
    }
    const onInput = () => {
      input = performance.now()
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    for (const type of ['wheel', 'touchmove', 'keydown']) window.addEventListener(type, onInput, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      for (const type of ['wheel', 'touchmove', 'keydown']) window.removeEventListener(type, onInput)
      cancelAnimationFrame(frame)
    }
  }, [])

  /* Whichever section is crossing the upper-middle band of the viewport is
     the current one; none of them there means none is marked. */
  useEffect(() => {
    const nodes = sections.map((section) => document.getElementById(section.id)).filter(Boolean)
    if (!nodes.length) return undefined

    const crossing = new Set()
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) crossing.add(entry.target.id)
          else crossing.delete(entry.target.id)
        }
        const current = sections.find((section) => crossing.has(section.id))
        setActive(current ? current.id : null)
      },
      { rootMargin: '-38% 0px -57% 0px', threshold: 0 },
    )
    nodes.forEach((node) => observer.observe(node))
    return () => observer.disconnect()
  }, [])

  return (
    <nav
      className={cx('site-nav', visible && 'is-visible', tucked && 'is-tucked')}
      aria-label={controls.nav}
      aria-hidden={!visible}
      inert={!visible}
    >
      <a className="site-nav__brand" href="#" aria-label={controls.top}>
        {site.name}
      </a>

      <ul className="site-nav__links">
        {sections.map((section) => (
          <li key={section.id}>
            <a href={`#${section.id}`} aria-current={active === section.id ? 'true' : undefined}>
              {section.title}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}

import { useEffect, useState } from 'react'
import { controls, sections, site } from '../../Model/site.js'
import { useLandingInView } from '../lib/landing.js'
import { cx } from '../lib/cx.js'

/* ===========================================================================
   The navigation that takes over once the hero titles have scrolled away.

   It draws nothing behind itself: white type with a little shadow, which is
   enough over the fog, the night and the photographs alike. The current
   section is underlined.
   =========================================================================== */

export default function SiteNav() {
  const [active, setActive] = useState(null)

  /* The navigation is what the landing hands over to, so it appears exactly
     when the landing leaves. */
  const visible = !useLandingInView()

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
      className={cx('site-nav', visible && 'is-visible')}
      aria-label={controls.nav}
      aria-hidden={!visible}
      inert={!visible}
    >
      <a className="site-nav__brand" href="#" aria-label={controls.top}>
        {site.group}
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

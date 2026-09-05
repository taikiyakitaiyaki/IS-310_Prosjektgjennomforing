import { useEffect, useState } from 'react'

/* ===========================================================================
   Whether the landing scene is on screen.

   Two controls turn on this same fact and have to agree about it: the
   navigation arrives once the landing has gone, and the pause switch belongs
   to the landing and leaves with it. One observer, one answer, so a change to
   where the line falls moves both.
   =========================================================================== */
export function useLandingInView() {
  /* True to begin with: the landing is the first thing on the page, and the
     observer's first callback only arrives after a frame. */
  const [inView, setInView] = useState(true)

  useEffect(() => {
    const landing = document.querySelector('.landing')
    if (!landing) return undefined

    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      threshold: 0,
    })
    observer.observe(landing)
    return () => observer.disconnect()
  }, [])

  return inView
}

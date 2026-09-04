import { useEffect, useRef, useState } from 'react'
import UnicornScene from 'unicornstudio-react'
import { useMotion } from '../lib/motion.jsx'
import { cx } from '../lib/cx.js'

/* The published Unicorn Studio scene that opens the site. */
const PROJECT_ID = 'guBlT2Qaq2k0cGgNYT4I'

/* ===========================================================================
   The landing scene.

   It runs its own WebGL context, so it is only allowed to render while it is
   actually on screen - once the visitor has scrolled past the fold that GPU
   time belongs to the terrain below. It also stops when the visitor asks the
   site to hold still.

   It sizes itself from the element it is given, never from the window, so it
   fills whatever frame the site is shown in.
   =========================================================================== */
export default function UnicornHero() {
  const frame = useRef(null)
  const { still, lowPower } = useMotion()
  const [onScreen, setOnScreen] = useState(true)
  const [failed, setFailed] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [holdStill, setHoldStill] = useState(false)
  const [overdue, setOverdue] = useState(false)

  /* The scene fades up when it reports itself loaded. Should that report never
     come, it is shown anyway after a while - a canvas the visitor cannot see
     is worse than one that pops in. */
  useEffect(() => {
    const id = window.setTimeout(() => setOverdue(true), 6000)
    return () => window.clearTimeout(id)
  }, [])

  /* Reduced motion means stop moving, not disappear: pausing from the first
     render leaves an empty canvas and the mountain is never seen at all.

     The wait has to hang off the scene's own load event rather than a timer -
     the SDK is a ~900 kB chunk plus remote assets, and any fixed delay is a
     race that pauses an empty canvas on a slow connection. */
  useEffect(() => {
    if (!loaded || !still) {
      setHoldStill(false)
      return undefined
    }
    const id = window.setTimeout(() => setHoldStill(true), 600)
    return () => window.clearTimeout(id)
  }, [loaded, still])

  useEffect(() => {
    const node = frame.current
    if (!node) return undefined

    const observer = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting), {
      /* A little slack, so scrolling back up restarts the scene before the
         visitor can see it was ever stopped. */
      rootMargin: '20% 0px',
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <div className={cx('landing__scene', (loaded || overdue) && 'is-loaded')} ref={frame} aria-hidden="true">
      {failed ? null : (
        <UnicornScene
          projectId={PROJECT_ID}
          production
          width="100%"
          height="100%"
          scale={lowPower ? 0.75 : 1}
          dpi={lowPower ? 1 : 1.5}
          fps={lowPower ? 30 : 60}
          paused={holdStill || !onScreen}
          className="landing__unicorn"
          altText=""
          ariaLabel=""
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      )}
    </div>
  )
}

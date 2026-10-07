import { useRef, useState } from 'react'
import { controls, landing, sections, site } from '../../Model/site.js'
import { follow, release } from '../lib/follow.js'
import { gsap, useGSAP } from '../lib/gsap.js'
import { useMotion } from '../lib/motion.jsx'
import { cx } from '../lib/cx.js'
import Chevron from './Chevron.jsx'

/* ===========================================================================
   The landing: the group photograph, and the four titles that are the way in.

   The photograph fills the fold and settles in over the sky once it has
   arrived. It follows the pointer a little inside its frame and swells under
   it, the way every picture of the group does. Under it a chevron points
   down to the rest of the page; nothing in the fold is pressed.

   The titles sit in a row along the top, over the bare wall above the group:
   they rise out of their lines once the cover lifts, they lean toward the
   pointer, and on the way out the photograph sinks more slowly than the page
   while the titles leave faster - the two layers at different depths is what
   makes the fold read as space rather than as a cut. The photograph ends
   where the page begins, on a clean edge.
   =========================================================================== */

const FINE_POINTER = '(hover: hover) and (pointer: fine)'

export default function Landing() {
  const root = useRef(null)
  const depth = useRef(null)
  const titles = useRef(null)
  const hint = useRef(null)
  /* The photograph, and the cutout of the group over it. The word between
     them waits for the cutout: shown any sooner it would stand in front of
     the faces for a moment. */
  const [loaded, setLoaded] = useState(false)
  const [cut, setCut] = useState(false)
  const { still } = useMotion()

  /* A picture that was already in the cache can be complete before React
     gets its load listener on; this catches that case, and the listener the
     other. */
  const whenComplete = (mark) => (node) => {
    if (node?.complete && node.naturalWidth) mark(true)
  }

  useGSAP(
    () => {
      if (still) return undefined

      gsap
        .timeline({
          scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom top', scrub: true },
        })
        .to(depth.current, { yPercent: 24, scale: 1.08, ease: 'none' }, 0)
        .to([titles.current, hint.current], { yPercent: -36, autoAlpha: 0, ease: 'none' }, 0)

      /* A mouse, not a finger: a title that leans toward a fingertip only
         moves after the tap, which is too late to mean anything. */
      if (!window.matchMedia(FINE_POINTER).matches) return undefined

      const cleanups = gsap.utils.toArray('.hero-title', root.current).map((link) => {
        const toX = gsap.quickTo(link, 'x', { duration: 0.65, ease: 'power3' })
        const toY = gsap.quickTo(link, 'y', { duration: 0.65, ease: 'power3' })

        const move = (event) => {
          const rect = link.getBoundingClientRect()
          toX((event.clientX - (rect.left + rect.width / 2)) * 0.12)
          toY((event.clientY - (rect.top + rect.height / 2)) * 0.22)
        }
        const leave = () => {
          toX(0)
          toY(0)
        }

        link.addEventListener('pointermove', move)
        link.addEventListener('pointerleave', leave)
        return () => {
          link.removeEventListener('pointermove', move)
          link.removeEventListener('pointerleave', leave)
        }
      })

      return () => cleanups.forEach((undo) => undo())
    },
    { dependencies: [still], revertOnUpdate: true, scope: root },
  )

  return (
    /* The pointer is followed from the section rather than from the button:
       the titles sit over the picture, and a button that lost the pointer
       every time it crossed one would let the picture spring back each
       time. The two numbers are inherited down to the image. */
    <section
      className="landing"
      aria-labelledby="landing-title"
      style={{ '--titles': sections.length }}
      ref={root}
      onPointerMove={still ? undefined : follow}
      onPointerLeave={still ? undefined : release}
    >
      <div className="landing__sky" aria-hidden="true" />

      <div className="landing__depth" ref={depth}>
        <div className={cx('landing__photo', loaded && 'is-loaded', cut && 'is-cut')}>
          <img
            src={landing.photo.src}
            alt={landing.photo.alt}
            width={landing.photo.width}
            height={landing.photo.height}
            /* The first thing on the page: nothing should be fetched ahead
               of it. */
            fetchPriority="high"
            decoding="async"
            ref={whenComplete(setLoaded)}
            onLoad={() => setLoaded(true)}
          />
          <div className="landing__shade" aria-hidden="true" />

          {/* Layers in document order: the photograph, the shade that
              darkens the wall under the titles, the word, and the group cut
              out of the same photograph laid over all of it - so the word
              reads as standing behind them, in front of the wall. The
              cutout is the same picture again and says nothing new. */}
          <span className="landing__word" aria-hidden="true">
            {landing.word}
          </span>
          <img
            className="landing__front"
            src={landing.front.src}
            alt=""
            width={landing.front.width}
            height={landing.front.height}
            fetchPriority="high"
            decoding="async"
            ref={whenComplete(setCut)}
            onLoad={() => setCut(true)}
          />
        </div>
      </div>

      <h1 id="landing-title" className="visually-hidden">
        {site.group} - {site.tagline.toLowerCase()}
      </h1>

      {/* The scroll cue: a chevron pointing down to the rest of the page.
          Nothing to press - the page is the way down. The wrapper is what the
          scroll moves and what clips the arrival. */}
      <div className="landing__hint" aria-hidden="true" ref={hint}>
        <div className="landing__cue">
          <Chevron className="landing__hint-mark" direction="down" />
        </div>
      </div>

      <nav className="hero-titles" aria-label={controls.heroNav} ref={titles}>
        {sections.map((section, index) => (
          <a key={section.id} className="hero-title" href={`#${section.id}`} style={{ '--i': index }}>
            <span className="hero-title__mask">
              <span className="hero-title__word">{section.title}</span>
            </span>
          </a>
        ))}
      </nav>
    </section>
  )
}

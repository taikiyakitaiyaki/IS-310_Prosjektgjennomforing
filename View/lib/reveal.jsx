import { useEffect, useRef, useState } from 'react'
import { cx } from './cx.js'

/* ===========================================================================
   Things that arrive as the page is scrolled to them, and arrive again if the
   visitor scrolls back to them.

   Two shared observers do the work for every element on the page. They watch
   for different things on purpose:

     in   - has the element come far enough into the viewport to count
     out  - has it gone properly away again, well past the edge

   Keeping those two lines apart is what stops the flicker. If one line did
   both jobs, an element resting near it would arrive and leave on every small
   scroll. Instead an element reveals once it is a little way in, and only
   re-arms once it is a fifth of a screen outside - a gap no ordinary scroll
   sits inside.

   The motion itself is plain CSS on the classes set here, which keeps it on
   the compositor and lets the reduced-motion rule in base.css switch all of it
   off in one place.
   =========================================================================== */

let observers = null
const shows = new WeakMap()
const hides = new WeakMap()

function getObservers() {
  if (!observers) {
    observers = {
      /* A little way into the viewport before it counts, so the element is
         actually seen arriving rather than already sitting at the edge. */
      in: new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) shows.get(entry.target)?.()
          }
        },
        { rootMargin: '0px 0px -10% 0px', threshold: 0.08 },
      ),
      /* And a good way outside it before it is put back, so that nothing
         resets while any part of it can still be seen. */
      out: new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) hides.get(entry.target)?.()
          }
        },
        { rootMargin: '20% 0px 20% 0px', threshold: 0 },
      ),
    }
  }
  return observers
}

function watch(node, show, hide) {
  const { in: enters, out: leaves } = getObservers()

  shows.set(node, show)
  hides.set(node, hide)
  enters.observe(node)
  leaves.observe(node)

  return () => {
    shows.delete(node)
    hides.delete(node)
    enters.unobserve(node)
    leaves.unobserve(node)
  }
}

/* True while the element is in view, false once it is well outside again. */
export function useReveal() {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return undefined
    return watch(
      node,
      () => setInView(true),
      () => setInView(false),
    )
  }, [])

  return [ref, inView]
}

/* A block that fades and lifts into place. `delay` staggers siblings. */
export function Reveal({ as: Tag = 'div', className, delay = 0, style, children, ...rest }) {
  const [ref, inView] = useReveal()

  return (
    <Tag
      ref={ref}
      className={cx('reveal', inView && 'is-in', className)}
      style={delay ? { ...style, '--d': `${delay}ms` } : style}
      {...rest}
    >
      {children}
    </Tag>
  )
}

/* A heading whose words rise out of their own line, one after the other. The
   words stay in the document as ordinary text - the spans only give each one a
   box to move inside - so the heading reads normally to assistive technology. */
export function SplitWords({ as: Tag = 'h2', text, className, delay = 0, stagger = 70, ...rest }) {
  const [ref, inView] = useReveal()
  const words = text.split(' ')

  return (
    <Tag ref={ref} className={cx('split', inView && 'is-in', className)} {...rest}>
      {words.map((word, index) => (
        /* The space has to sit between the masks, not inside one: trailing
           white space inside an inline block is dropped at the line end. */
        <span key={`${word}-${index}`}>
          {index > 0 ? ' ' : null}
          <span className="split__mask">
            <span className="split__word" style={{ '--d': `${delay + index * stagger}ms` }}>
              {word}
            </span>
          </span>
        </span>
      ))}
    </Tag>
  )
}

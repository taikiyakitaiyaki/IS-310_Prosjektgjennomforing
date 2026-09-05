import { useEffect, useRef, useState } from 'react'
import { members } from '../../Model/site.js'
import { useMotion } from '../lib/motion.jsx'

/* ===========================================================================
   The panel a portrait opens: the same face again, larger, with whatever is
   known about the person beside it.

   Built on <dialog> rather than a div with a role, because the element brings
   the hard parts with it - Escape closes, focus moves in and comes back to the
   portrait that was clicked, and the page behind goes inert so a stray tab
   cannot wander off into it.

   Any field left empty in the model is left out here rather than printed as a
   blank row, so an entry that is still being written never looks broken.
   =========================================================================== */

const { detail } = members

/* How far a press has to travel before it counts as a drag rather than a click. */
const DRAG_THRESHOLD = 4

/* The line down the panel that words light up as they rise past. */
const READING_LINE = 0.78

/* Words light one after another rather than all at once: this is how much of
   the paragraph's travel each one takes to come up. */
const WORD_SPAN = 0.16

/* The description lights word by word as it is scrolled up the panel: dim
   ahead of the reading line, full strength behind it. The whole thing is one
   custom property written on the paragraph, and the words work out their own
   share of it in CSS - so a scroll costs one style write, whatever the word
   count.

   A paragraph that already sits above the line when the panel opens is simply
   lit. Nothing can be left stranded half-read: on a tall screen the panel does
   not scroll at all, and the text has to be legible anyway. */
function LitText({ text, scroller, shown, still }) {
  const paragraph = useRef(null)
  const words = text.split(' ')

  useEffect(() => {
    const node = paragraph.current
    const port = scroller.current
    if (!node || !port) return undefined

    if (still) {
      node.style.setProperty('--lit', '1')
      return undefined
    }

    const update = () => {
      const portBox = port.getBoundingClientRect()
      const box = node.getBoundingClientRect()
      const line = portBox.top + portBox.height * READING_LINE
      const travelled = (line - box.top) / Math.max(box.height, 1)
      node.style.setProperty('--lit', Math.min(Math.max(travelled, 0), 1).toFixed(4))
    }

    update()
    port.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      port.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [scroller, shown, still, text])

  return (
    <p className="member-panel__about" ref={paragraph}>
      {words.map((word, index) => (
        <span
          className="member-panel__word"
          /* Spread across the progress up to one span short of the end, so the
             last word finishes lighting exactly as the paragraph finishes its
             travel. Running these to 1.0 instead leaves the closing words
             permanently half-lit. */
          style={{
            '--from': (
              (index / Math.max(words.length - 1, 1)) *
              (1 - WORD_SPAN)
            ).toFixed(4),
          }}
          key={`${word}-${index}`}
        >
          {index < words.length - 1 ? `${word} ` : word}
        </span>
      ))}
    </p>
  )
}

export default function MemberPanel({ person, onClose }) {
  const dialog = useRef(null)
  const { still } = useMotion()

  /* The panel keeps showing whoever it last showed while it slides out. The
     content is only ever replaced by the next person, never emptied, so the
     closing animation has something to animate. A closed dialog is not
     rendered to anyone, so what it still holds cannot be read or tabbed into. */
  const [shown, setShown] = useState(null)

  useEffect(() => {
    if (person) setShown(person)
  }, [person])

  useEffect(() => {
    const node = dialog.current
    if (!node) return

    if (person && !node.open) node.showModal()
    if (!person && node.open) node.close()
  }, [person])

  /* Escape and the backdrop both close the dialog on their own; this is how
     the state that opened it hears about that. */
  useEffect(() => {
    const node = dialog.current
    if (!node) return undefined

    const closed = () => onClose()
    node.addEventListener('close', closed)
    return () => node.removeEventListener('close', closed)
  }, [onClose])

  /* A click that lands on the dialog itself rather than on anything inside it
     is a click on the backdrop. */
  const backdrop = (event) => {
    if (event.target === dialog.current) onClose()
  }

  /* --- Grab and drag to scroll -------------------------------------------
     Press anywhere in the panel and move, and the content follows the hand:
     drag up, the panel scrolls down. Mouse only - a finger already drags the
     panel natively and the two would fight over the same gesture.

     A press that never travels further than a few pixels is a click, not a
     drag, so links and the close button keep working; past that threshold the
     click that ends the gesture is swallowed, or letting go over the backdrop
     would shut the panel the visitor was reading. */
  const drag = useRef({ id: null, startY: 0, startTop: 0, moved: false })

  const dragStart = (event) => {
    if (event.pointerType !== 'mouse' || event.button !== 0) return

    const node = dialog.current
    if (!node || node.scrollHeight <= node.clientHeight) return

    drag.current = {
      id: event.pointerId,
      startY: event.clientY,
      startTop: node.scrollTop,
      moved: false,
    }
  }

  const dragMove = (event) => {
    const state = drag.current
    const node = dialog.current
    if (state.id !== event.pointerId || !node) return

    const travel = event.clientY - state.startY

    if (!state.moved) {
      if (Math.abs(travel) < DRAG_THRESHOLD) return
      state.moved = true
      node.classList.add('is-dragging')
      node.setPointerCapture(event.pointerId)
    }

    node.scrollTop = state.startTop - travel
  }

  const dragEnd = (event) => {
    const state = drag.current
    const node = dialog.current
    if (state.id !== event.pointerId) return

    if (node) {
      node.classList.remove('is-dragging')
      if (node.hasPointerCapture(event.pointerId)) node.releasePointerCapture(event.pointerId)
    }

    state.id = null
  }

  /* Runs before the backdrop handler and before any link, and only ever after
     a gesture that actually moved. */
  const swallowClick = (event) => {
    if (!drag.current.moved) return

    drag.current.moved = false
    event.preventDefault()
    event.stopPropagation()
  }

  const interests = shown?.interests?.filter(Boolean) ?? []
  const description = shown?.description?.trim()
  const bare = !shown?.age && interests.length === 0 && !description
  const title = shown ? (shown.fullName ?? shown.name) : ''

  /* A link with an address is a link; one without is shown as waiting rather
     than as a button that goes nowhere. */
  const links = detail.linkOrder.map((entry) => ({
    ...entry,
    href: shown?.links?.[entry.key]?.trim() ?? '',
  }))

  return (
    <dialog
      className="member-panel"
      ref={dialog}
      /* Lenis eases the whole window and swallows the wheel to do it, which
         left this panel unable to scroll while the page behind it moved
         instead. This is how Lenis is told to keep its hands off. */
      data-lenis-prevent=""
      onClick={backdrop}
      onClickCapture={swallowClick}
      onPointerDown={dragStart}
      onPointerMove={dragMove}
      onPointerUp={dragEnd}
      onPointerCancel={dragEnd}
      aria-label={shown ? `${detail.open} ${title}` : undefined}
    >
      {shown ? (
        <div className="member-panel__sheet">
          {/* A bar of no height at all, so the button hangs over the picture
              rather than taking a row above it, and stays put when a long
              entry scrolls underneath. */}
          <div className="member-panel__bar">
            <button type="button" className="member-panel__close" onClick={onClose}>
              <span aria-hidden="true">×</span>
              <span className="visually-hidden">{detail.close}</span>
            </button>
          </div>

          <img
            className="member-panel__photo"
            src={shown.src}
            alt=""
            width={members.portrait.width}
            height={members.portrait.height}
            decoding="async"
          />

          <div className="member-panel__text">
            <h2 className="member-panel__name">{title}</h2>

            {shown.role ? <p className="member-panel__role">{shown.role}</p> : null}
            {shown.study ? <p className="member-panel__study">{shown.study}</p> : null}

            {shown.age ? (
              <p className="member-panel__age">
                {detail.age}: {shown.age} {detail.years}
              </p>
            ) : null}

            {interests.length > 0 ? (
              <section className="member-panel__block">
                <h3 className="member-panel__label">{detail.interests}</h3>
                <ul className="member-panel__interests">
                  {interests.map((interest) => (
                    <li key={interest}>{interest}</li>
                  ))}
                </ul>
              </section>
            ) : null}

            {description ? (
              <section className="member-panel__block">
                <h3 className="member-panel__label">{detail.about}</h3>
                <LitText text={description} scroller={dialog} shown={shown} still={still} />
              </section>
            ) : null}

            {bare ? <p className="member-panel__empty">{detail.empty}</p> : null}

            <section className="member-panel__block">
              <h3 className="member-panel__label">{detail.links}</h3>
              <ul className="member-panel__links">
                {links.map((link) => (
                  <li key={link.key}>
                    {link.href ? (
                      <a
                        className="member-panel__link"
                        href={link.href}
                        target="_blank"
                        /* noreferrer as well as noopener: the new tab has no
                           business knowing where it was opened from. */
                        rel="noopener noreferrer"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <span className="member-panel__link is-pending">
                        {link.label}
                        <span className="member-panel__link-note">{detail.linkPending}</span>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      ) : null}
    </dialog>
  )
}

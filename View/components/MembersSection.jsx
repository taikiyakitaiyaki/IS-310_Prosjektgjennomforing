import { useEffect, useRef, useState } from 'react'
import { members } from '../../Model/site.js'
import { useMotion } from '../lib/motion.jsx'
import { useReveal } from '../lib/reveal.jsx'
import { cx } from '../lib/cx.js'
import MemberPanel from './MemberPanel.jsx'

/* ===========================================================================
   Medlemmer: the group showcase above, the five of them below.
   =========================================================================== */

const SWAP_INTERVAL = 5200

/* The group showcase: photograph on the left, "om oss" text on the right.
   Crossfading frames sit in the picture frame; when scrolled into view,
   the image transitions to the left while the story unrolls to the right. */
function GroupShowcase() {
  const { still } = useMotion()
  const host = useRef(null)
  const [showcaseRef, inView] = useReveal()
  const [onScreen, setOnScreen] = useState(false)
  const [shown, setShown] = useState(0)
  const photos = members.group.photos
  const { panel } = members.group
  const intro = panel.intro?.trim()
  const paragraphs = (panel.paragraphs ?? []).map((text) => text?.trim()).filter(Boolean)

  useEffect(() => {
    const node = host.current
    if (!node) return undefined

    const observer = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting))
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (still || !onScreen || photos.length < 2) return undefined

    const id = window.setInterval(
      () => setShown((current) => (current + 1) % photos.length),
      SWAP_INTERVAL,
    )
    return () => window.clearInterval(id)
  }, [onScreen, photos.length, still])

  return (
    <div className={cx('members__showcase', inView && 'is-in')} ref={showcaseRef}>
      <figure className="members__visual">
        <div className="members__frame" ref={host} role="img" aria-label={members.group.label}>
          {photos.map((photo, index) => (
            <img
              key={photo.src}
              src={photo.src}
              alt=""
              width={photo.width}
              height={photo.height}
              loading="lazy"
              decoding="async"
              className={index === shown ? 'is-shown' : undefined}
            />
          ))}
        </div>
        <figcaption className="members__caption">{members.group.label}</figcaption>
      </figure>

      <div className="members__info">
        {panel.subtitle ? <span className="members__kicker">{panel.subtitle}</span> : null}
        {panel.title ? <h3 className="members__heading">{panel.title}</h3> : null}
        {intro ? <p className="members__intro">{intro}</p> : null}
        {paragraphs.map((text, idx) => (
          <p className="members__body" key={idx}>
            {text}
          </p>
        ))}
      </div>
    </div>
  )
}

/* The portrait follows the pointer by a few pixels inside its frame. Written
   straight to a custom property on the element rather than through state, so
   the whole thing is one style write and never re-renders anything. */
function follow(event) {
  if (event.pointerType !== 'mouse') return
  const node = event.currentTarget
  const rect = node.getBoundingClientRect()
  node.style.setProperty('--mx', ((event.clientX - rect.left) / rect.width - 0.5).toFixed(3))
  node.style.setProperty('--my', ((event.clientY - rect.top) / rect.height - 0.5).toFixed(3))
}

function release(event) {
  const node = event.currentTarget
  node.style.setProperty('--mx', '0')
  node.style.setProperty('--my', '0')
}

function Portrait({ person, index, onOpen }) {
  const [ref, inView] = useReveal()
  const { still } = useMotion()
  const pending = !person.src

  return (
    <li
      className={cx('member', pending && 'member--pending', inView && 'is-in')}
      style={{ '--d': `${index * 90}ms` }}
      ref={ref}
      onPointerMove={pending || still ? undefined : follow}
      onPointerLeave={pending || still ? undefined : release}
    >
      {pending ? (
        <span className="member__pending">{members.pendingLabel}</span>
      ) : (
        /* The whole portrait is the control that opens the panel. It carries
           its own name rather than reading the caption, so the button says
           what it does instead of only who it shows. */
        <button
          type="button"
          className="member__open"
          aria-label={`${members.detail.open} ${person.fullName ?? person.name}`}
          onClick={() => onOpen(person)}
        >
          <figure className="member__figure">
            <div className="member__photo">
              <img
                src={person.src}
                alt=""
                width={members.portrait.width}
                height={members.portrait.height}
                loading="lazy"
                decoding="async"
              />
              <span className="member__corner-hint" aria-hidden="true">
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2.5 9.5L9.5 2.5M9.5 2.5H4.5M9.5 2.5V7.5" />
                </svg>
              </span>
            </div>
            <figcaption className="member__caption">
              <span className="member__name">{person.name}</span>
              <span className="member__action">
                <span>{members.detail.actionLabel}</span>
                <span className="member__arrow" aria-hidden="true">→</span>
              </span>
            </figcaption>
          </figure>
        </button>
      )}
    </li>
  )
}

export default function MembersSection() {
  /* Which portrait is open, or null. One panel serves all five: the person is
     what changes, not the panel. */
  const [opened, setOpened] = useState(null)

  return (
    <div className="members">
      <GroupShowcase />

      <ul className="members__row">
        {members.people.map((person, index) => (
          <Portrait
            person={person}
            index={index}
            onOpen={setOpened}
            key={person.name ?? `pending-${index}`}
          />
        ))}
      </ul>

      <MemberPanel person={opened} onClose={() => setOpened(null)} />
    </div>
  )
}

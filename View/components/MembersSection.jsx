import { useEffect, useRef, useState } from 'react'
import { members } from '../../Model/site.js'
import { useMotion } from '../lib/motion.jsx'
import { useReveal } from '../lib/reveal.jsx'
import { cx } from '../lib/cx.js'

/* ===========================================================================
   Medlemmer: the group above, the five of them below.
   =========================================================================== */

const SWAP_INTERVAL = 5200

/* Two frames of the same group, crossfading. Both sit in the frame at once and
   only their opacity moves, so the swap costs a composite rather than a layout
   and never shifts the page. The frame uncovers from the bottom as it arrives. */
function GroupPhotos() {
  const { still } = useMotion()
  const host = useRef(null)
  const [figure, inView] = useReveal()
  const [onScreen, setOnScreen] = useState(false)
  const [shown, setShown] = useState(0)
  const photos = members.group.photos

  useEffect(() => {
    const node = host.current
    if (!node) return undefined

    const observer = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting))
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  /* Hold on one frame when the visitor has asked the site to sit still - the
     site-wide reduced-motion rule cuts the fade to nothing, so a swap that kept
     running would read as a jump cut. Stop while the section is off screen too;
     there is nobody to see it. */
  useEffect(() => {
    if (still || !onScreen || photos.length < 2) return undefined

    const id = window.setInterval(
      () => setShown((current) => (current + 1) % photos.length),
      SWAP_INTERVAL,
    )
    return () => window.clearInterval(id)
  }, [onScreen, photos.length, still])

  return (
    <figure className={cx('members__group', inView && 'is-in')} ref={figure}>
      {/* One image as far as assistive technology is concerned: the two frames
          are the same group, and announcing a swap between them would be noise. */}
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

function Portrait({ person, index }) {
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
          </div>
          <figcaption className="member__name">{person.name}</figcaption>
        </figure>
      )}
    </li>
  )
}

export default function MembersSection() {
  return (
    <div className="members">
      <GroupPhotos />

      <ul className="members__row">
        {members.people.map((person, index) => (
          <Portrait person={person} index={index} key={person.name ?? `pending-${index}`} />
        ))}
      </ul>
    </div>
  )
}

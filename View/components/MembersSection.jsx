import { useEffect, useRef, useState } from 'react'
import { members } from '../../Model/site.js'
import { follow, release } from '../lib/follow.js'
import { gsap, useGSAP } from '../lib/gsap.js'
import { useMotion } from '../lib/motion.jsx'
import { portraitId, warmPortrait } from '../lib/portrait.js'
import { useReveal } from '../lib/reveal.jsx'
import { cx } from '../lib/cx.js'
import LitText from './LitText.jsx'
import MemberProfile from './MemberProfile.jsx'

/* ===========================================================================
   Medlemmer: the group and the words about us side by side above, the five
   of them below.
   =========================================================================== */

const SWAP_INTERVAL = 5200

/* The group's frames, crossfading in turn. They all sit in the frame at once and
   only their opacity moves, so the swap costs a composite rather than a layout
   and never shifts the page. The frame uncovers from the bottom as it arrives,
   and inside it the picture drifts a little slower than the page - held taller
   than its window so the drift never shows an edge. */
function GroupPhotos() {
  const { still } = useMotion()
  const host = useRef(null)
  const drift = useRef(null)
  const [figure, inView] = useReveal()
  const [onScreen, setOnScreen] = useState(false)
  const [shown, setShown] = useState(0)
  const photos = members.group.photos
  const caption = photos[shown]?.label ?? members.group.label

  useGSAP(
    () => {
      if (still) return
      gsap.fromTo(
        drift.current,
        { yPercent: -5 },
        {
          yPercent: 5,
          ease: 'none',
          scrollTrigger: { trigger: figure.current, start: 'top bottom', end: 'bottom top', scrub: true },
        },
      )
    },
    { dependencies: [still], revertOnUpdate: true, scope: figure },
  )

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
      {/* One image as far as assistive technology is concerned: every frame is
          the same group, and announcing a swap between them would be noise. */}
      <div className="members__frame" ref={host} role="img" aria-label={members.group.label}>
        <div className="members__drift" ref={drift}>
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
              style={photo.position ? { objectPosition: photo.position } : undefined}
            />
          ))}
        </div>
      </div>
      {/* The caption follows the frame showing. Keyed on its words, so a
          change mounts a fresh span and the fade-in plays again. */}
      <figcaption className="members__caption">
        <span className="members__caption-text" key={caption}>
          {caption}
        </span>
      </figcaption>
    </figure>
  )
}

/* Who we are, beside the picture of us. The question heads the whole section,
   so the column is the answer alone; the paragraphs light word by word as
   they are scrolled up to reading height. Whatever is empty in the model is
   left out rather than printed blank. */
function GroupText() {
  const { about } = members.group
  const intro = about.intro?.trim()
  const paragraphs = (about.paragraphs ?? []).map((text) => text?.trim()).filter(Boolean)

  return (
    <div className="members__text">
      {intro ? <LitText text={intro} className="members__body" /> : null}
      {paragraphs.map((text) => (
        <LitText text={text} className="members__body" key={text.slice(0, 40)} />
      ))}
    </div>
  )
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
        /* The whole portrait is the control that opens it up. It carries its
           own name rather than reading the caption, so the button says what
           it does instead of only who it shows. A pointer resting on it, or
           focus arriving, fetches the large copy ahead of the press. */
        <button
          type="button"
          className="member__open"
          aria-label={`${members.detail.open} ${person.fullName ?? person.name}`}
          aria-haspopup="dialog"
          onClick={() => onOpen(person)}
          onPointerEnter={() => warmPortrait(person)}
          onFocus={() => warmPortrait(person)}
        >
          <figure className="member__figure">
            {/* The frame is what flies: Flip finds it in the profile again by
                the same id. */}
            <div className="member__photo" data-flip-id={portraitId(person)}>
              <img
                src={person.src}
                alt=""
                width={members.portrait.width}
                height={members.portrait.height}
                loading="lazy"
                decoding="async"
              />
              {/* Four corner marks, like a map sheet's, that open out to the
                  edges of the picture under the pointer - the picture is
                  about to grow past them. */}
              <span className="member__marks" aria-hidden="true" />
            </div>
            <figcaption className="member__name">{person.name}</figcaption>
          </figure>
        </button>
      )}
    </li>
  )
}

export default function MembersSection() {
  /* The row, where every portrait leaves from and lands back in; the profile
     they open up into; and whether they are away from the row right now, in
     which case the row holds their empty places for them. */
  const row = useRef(null)
  const profile = useRef(null)
  const [lifted, setLifted] = useState(false)

  return (
    <div className="members">
      {/* The picture on the left, the words on the right; one above the other
          on a phone. */}
      <div className="members__about">
        <GroupPhotos />
        <GroupText />
      </div>

      <ul className={cx('members__row', lifted && 'is-lifted')} ref={row}>
        {members.people.map((person, index) => (
          <Portrait
            person={person}
            index={index}
            onOpen={(chosen) => profile.current?.open(chosen)}
            key={person.name ?? `pending-${index}`}
          />
        ))}
      </ul>

      <MemberProfile ref={profile} row={row} onLift={setLifted} />
    </div>
  )
}

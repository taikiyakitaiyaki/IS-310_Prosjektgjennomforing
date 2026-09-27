import { useEffect, useId, useLayoutEffect, useRef } from 'react'
import { members, site } from '../../Model/site.js'
import { follow, release } from '../lib/follow.js'
import { useMotion } from '../lib/motion.jsx'
import { useReveal } from '../lib/reveal.jsx'
import { useScrollBy } from '../lib/scroll.jsx'
import { cx } from '../lib/cx.js'

/* ===========================================================================
   A portrait that opens into a single profile page about the person.

   The portrait is the card's cover. Pressed, it lifts out of the row and
   grows into one page - photo, name and everything about them, set in the
   site's own type rather than a book's pages. Escape or a press anywhere
   else closes it, and it settles back into the row.

   Only a transform and an opacity ever move, so the open and close run on
   the compositor rather than the main thread.
   =========================================================================== */

const { detail } = members

/* Room kept between the card and the edges of the screen, and the height of
   the close button's row beneath it. */
const EDGE = 16
const CONTROLS = 24

/* The lift: how long, and on what curve. */
const LIFT = 620
const LIFT_EASE = 'cubic-bezier(0.16, 1, 0.3, 1)'

/* Where the profile is read, and how it gets there. Measured from the
   layout, which no transform has touched, relative to the portrait's own
   box. Centred on the portrait and held inside the row; never taller than
   the screen leaves room for - past that it scrolls within itself. `down`
   is the transform that shrinks the laid-out card so it lies exactly over
   the portrait. */
function placeFor(item, lift) {
  const box = item.getBoundingClientRect()
  const row = item.parentElement.getBoundingClientRect()
  const width = item.offsetWidth
  const height = lift.offsetHeight
  const nav = Math.max(0, document.querySelector('.site-nav')?.getBoundingClientRect().bottom ?? 0)

  const across = Math.max(width, Math.min(560, row.width))
  const cardHeight = Math.min(Math.round(across * 1.2), window.innerHeight - nav - 2 * EDGE - CONTROLS)
  const centre = box.left + width / 2
  const left = Math.min(Math.max(centre - across / 2, row.left), row.right - across)

  const x = left - box.left
  const y = height / 2 - cardHeight / 2
  const shrink = width / across

  return {
    x,
    y,
    across,
    cardHeight,
    height,
    down: `translate(${-x}px, ${-y}px) scale(${shrink})`,
    top: box.top + y,
    bottom: box.top + y + cardHeight + CONTROLS,
  }
}

export default function MemberBook({ person, index, open, onOpen, onClose }) {
  const [ref, inView] = useReveal()
  const { still } = useMotion()
  const scrollBy = useScrollBy()
  const lift = useRef(null)
  const card = useRef(null)
  const cover = useRef(null)
  const place = useRef(null)
  const lifting = useRef(null)
  const wasOpen = useRef(false)
  const focusTo = useRef(null)
  const cardId = useId()
  const pending = !person.src

  const name = person.fullName ?? person.name
  const about = person.description?.trim()
  const skills = person.skills?.trim()
  const interests = person.interests?.trim()
  const hobbies = person.hobbies?.trim()
  const links = detail.linkOrder.map((entry) => ({ ...entry, href: person.links?.[entry.key]?.trim() ?? '' }))

  const openCard = () => {
    const item = ref.current
    if (!item || !lift.current) return

    if (!('raised' in item.dataset)) place.current = placeFor(item, lift.current)
    const at = place.current

    /* A card opened near the top or foot of the screen would run past it;
       the page moves just far enough to show all of it, below the nav. */
    const top = Math.max(0, document.querySelector('.site-nav')?.getBoundingClientRect().bottom ?? 0)
    if (at.bottom > window.innerHeight - EDGE) {
      scrollBy(Math.min(at.bottom - (window.innerHeight - EDGE), at.top - top - EDGE))
    } else if (at.top < top + EDGE) {
      scrollBy(at.top - top - EDGE)
    }

    focusTo.current = 'card'
    onOpen()
  }

  const close = (withFocus) => {
    focusTo.current = withFocus ? 'cover' : null
    onClose()
  }

  const shut = () => {
    const item = ref.current
    if (item) delete item.dataset.raised
    place.current = null
  }

  /* The lift: up out of the row, or back down into it, from wherever it has
     got to. */
  const moveLift = (up, delay) => {
    const node = lift.current
    const at = place.current
    const running = lifting.current
    const from = running ? getComputedStyle(node).transform : up ? at.down : 'none'
    running?.cancel()
    lifting.current = null

    if (still) {
      if (!up) shut()
      return
    }

    const animation = node.animate([{ transform: from }, { transform: up ? 'none' : at.down }], {
      duration: LIFT,
      easing: LIFT_EASE,
      delay: running ? 0 : delay,
      fill: 'both',
    })
    lifting.current = animation
    animation.onfinish = () => {
      if (lifting.current !== animation) return
      lifting.current = null
      if (!up) shut()
      animation.cancel()
    }
  }

  /* Before the page is painted, so the card never flashes up ahead of its
     movement. */
  useLayoutEffect(() => {
    const item = ref.current
    if (!item || !lift.current || open === wasOpen.current) return
    wasOpen.current = open

    if (open) {
      const at = place.current
      if (!at) return
      item.style.setProperty('--card-x', `${at.x}px`)
      item.style.setProperty('--card-y', `${at.y}px`)
      item.style.setProperty('--card-w', `${at.across}px`)
      item.style.setProperty('--card-h-open', `${at.cardHeight}px`)
      item.style.setProperty('--card-h', `${at.height}px`)
      item.dataset.raised = ''
      moveLift(true, 0)
    } else {
      moveLift(false, 0)
    }
  }, [open, still])

  /* --- Focus, keys, and letting go -------------------------------------- */

  useEffect(() => {
    if (focusTo.current === 'card' && open) card.current?.focus({ preventScroll: true })
    if (focusTo.current === 'cover' && !open) cover.current?.focus({ preventScroll: true })
    focusTo.current = null
  }, [open])

    /* While it is open: lock the page so only the card's own content scrolls.
     The site scrolls through Lenis on desktop, which animates the page on
     its own clock and doesn't know about this card - locking `body` alone
     doesn't stop it, and it swallows wheel/trackpad input before the card
     ever sees it. `lenis.stop()` pauses that scroll engine while the card
     is open, and `data-lenis-prevent` (on .profile__scroll, below) tells
     Lenis to leave the card's own scrolling alone. The `overflow: hidden`
     covers the cases where Lenis never started - touch, reduced motion, or
     an embedded page - so the page is locked either way. */
  useEffect(() => {
    if (!open) return undefined
    const { body } = document
    const previousOverflow = body.style.overflow
    body.style.overflow = 'hidden'
    window.__lenis?.stop()

    return () => {
      body.style.overflow = previousOverflow
      window.__lenis?.start()
    }
  }, [open])

  /* While it is open: a press anywhere off the card, or Escape, shuts it. */
  useEffect(() => {
    if (!open) return undefined
    const item = ref.current

    const onPointerDown = (event) => {
      if (!item?.contains(event.target)) close(false)
    }
    const onKeyDown = (event) => {
      if (event.key === 'Escape') close(item?.contains(document.activeElement))
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  })

  return (
    <li
      className={cx('member', pending && 'member--pending', inView && 'is-in', open && 'is-open')}
      style={{ '--d': `${index * 90}ms` }}
      ref={ref}
      onPointerMove={pending || still || open ? undefined : follow}
      onPointerLeave={pending || still ? undefined : release}
    >
      {pending ? (
        <span className="member__pending">{members.pendingLabel}</span>
      ) : (
        <>
          <div className="member__lift" ref={lift}>
            <button
              type="button"
              className="member__open"
              ref={cover}
              aria-label={`${detail.open} ${name}`}
              aria-expanded={open}
              aria-controls={cardId}
              inert={open}
              onClick={openCard}
            >
              <span className="member__photo">
                <img
                  src={person.src}
                  alt=""
                  width={members.portrait.width}
                  height={members.portrait.height}
                  loading="lazy"
                  decoding="async"
                />
                <span className="member__read" aria-hidden="true">
                  <span className="member__read-word">{detail.read}</span>
                </span>
              </span>
            </button>

            <div className="profile" id={cardId} ref={card} role="group" aria-label={`${detail.book} ${name}`} tabIndex={-1} inert={!open}>
              <button type="button" className="profile__close" onClick={() => close(true)}>
                {detail.close}
                <span className="profile__close-mark" aria-hidden="true" />
              </button>

              <div className="profile__scroll" data-lenis-prevent>
                <header className="profile__head">
                  <span className="profile__portrait">
                    <img
                      src={person.src}
                      alt=""
                      width={members.portrait.width}
                      height={members.portrait.height}
                      loading="lazy"
                      decoding="async"
                    />
                  </span>
                  <div className="profile__id">
                    <p className="profile__name">{name}</p>
                    {person.role ? <p className="profile__role">{person.role}</p> : null}
                    {person.study ? <p className="profile__study">{person.study}</p> : null}
                  </div>
                </header>

                <section className="profile__section">
                  <h3 className="profile__title">{detail.about}</h3>
                  <p className={cx('profile__text', !about && 'profile__text--pending')}>{about || detail.pending}</p>
                </section>

                <section className="profile__section">
                  <h3 className="profile__title">{detail.skills}</h3>
                  <p className={cx('profile__text', !skills && 'profile__text--pending')}>{skills || detail.pending}</p>
                </section>

                {interests || hobbies ? (
                  <section className="profile__section">
                    <h3 className="profile__title">{!interests && hobbies ? detail.hobbies : detail.interests}</h3>
                    {interests ? <p className="profile__text">{interests}</p> : null}
                    {hobbies ? (
                      <>
                        {interests ? <p className="profile__label">{detail.hobbies}</p> : null}
                        <p className="profile__text">{hobbies}</p>
                      </>
                    ) : null}
                  </section>
                ) : null}

                <section className="profile__section">
                  <h3 className="profile__title">{detail.links}</h3>
                  <ul className="profile__links">
                    {links.map((link) =>
                      link.href ? (
                        <li key={link.key}>
                          <a className="profile__link" href={link.href} target="_blank" rel="noopener noreferrer">
                            <span>{link.label}</span>
                            <svg className="profile__arrow" viewBox="0 0 12 12" aria-hidden="true">
                              <path d="M3 9 9 3M4.5 3H9v4.5" />
                            </svg>
                          </a>
                        </li>
                      ) : (
                        <li key={link.key}>
                          <span className="profile__link is-pending">
                            <span>{link.label}</span>
                            <span className="profile__note">{detail.linkPending}</span>
                          </span>
                        </li>
                      ),
                    )}
                  </ul>
                </section>
              </div>
            </div>
          </div>

          <p className="member__name" aria-hidden="true">
            {person.name}
          </p>
        </>
      )}
    </li>
  )
}
import { lazy, Suspense, useCallback, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { members, site } from '../../Model/site.js'
import { useMotion } from '../lib/motion.jsx'
import { hasWebGL2 } from '../lib/webgl.js'
import { cx } from '../lib/cx.js'

const LazyMemberBadge = lazy(() => import('./MemberBadge.jsx'))

/* ===========================================================================
   A member's profile: their badge on its lanyard in 3D on one side
   (MemberBadge), everything about them on the other - on a phone, the badge
   above and the words below. One at a time, over the page; the arrows at the
   foot, or the arrow keys, go on to the next member without closing.

   Escape, the close button or a press outside it closes it, and the focus
   goes back to the portrait that opened it. While it is open the page behind
   holds still and the keyboard stays inside it.
   =========================================================================== */

const { detail } = members
/* The members who have a profile to show, in the row's order. */
const people = members.people.filter((person) => person?.src)
const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'

/* Without WebGL, the badge is a plain card with the photo on it. */
function StillBadge({ person }) {
  return (
    <div className="profile-dialog__card">
      <span className="profile-dialog__card-band">{site.name}</span>
      <img src={person.src} alt="" width={members.portrait.width} height={members.portrait.height} />
      <span className="profile-dialog__card-name">{person.fullName ?? person.name}</span>
    </div>
  )
}

function Chapter({ title, text }) {
  const value = text?.trim()
  return (
    <section className="profile-dialog__chapter">
      <h3 className="profile-dialog__title">{title}</h3>
      <p className={cx('profile-dialog__text', !value && 'is-pending')}>{value || detail.pending}</p>
    </section>
  )
}

export default function MemberProfile({ index, onSelect, onClose, onReturn }) {
  const { still, lowPower } = useMotion()
  const [supported] = useState(hasWebGL2)
  const [failed, setFailed] = useState(false)
  /* The person on screen - kept through the closing fade after `index` has
     gone back to null. */
  const [shown, setShown] = useState(index)
  const [leaving, setLeaving] = useState(false)
  const panel = useRef(null)
  const nameId = useId()
  const fail = useCallback(() => setFailed(true), [])

  useEffect(() => {
    if (index !== null) {
      setShown(index)
      setLeaving(false)
    } else if (shown !== null) {
      setLeaving(true)
    }
  }, [index])

  const open = shown !== null

  /* Gone once its fade has finished, and the focus back on the portrait of
     whoever was shown last. */
  const gone = useCallback(() => {
    onReturn(shown)
    setShown(null)
    setLeaving(false)
  }, [onReturn, shown])
  const finished = (event) => {
    if (leaving && event.target === event.currentTarget) gone()
  }
  useEffect(() => {
    if (leaving && still) gone()
  }, [gone, leaving, still])

  /* While it is open the page behind holds still: Lenis is paused and the
     body cannot scroll. SiteNav reads the same lock and leaves the menu as
     it was. */
  useEffect(() => {
    if (!open) return undefined
    const { body } = document
    const previous = body.style.overflow
    body.style.overflow = 'hidden'
    window.__lenis?.stop()
    panel.current?.focus({ preventScroll: true })
    return () => {
      body.style.overflow = previous
      window.__lenis?.start()
    }
  }, [open])

  const position = open ? people.indexOf(members.people[shown]) : -1
  const step = useCallback(
    (by) => {
      if (position < 0) return
      const next = people[(position + by + people.length) % people.length]
      onSelect(members.people.indexOf(next))
    },
    [onSelect, position],
  )

  /* Escape closes, the arrow keys go to the previous or next member, and
     Tab goes round inside the profile rather than out to the page. */
  useEffect(() => {
    if (!open || leaving) return undefined
    const keydown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault()
        step(event.key === 'ArrowLeft' ? -1 : 1)
      } else if (event.key === 'Tab') {
        const items = [...panel.current.querySelectorAll(FOCUSABLE)]
        if (!items.length) return
        const first = items[0]
        const last = items[items.length - 1]
        if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', keydown)
    return () => document.removeEventListener('keydown', keydown)
  }, [leaving, onClose, open, step])

  if (!open) return null

  const person = members.people[shown]
  const name = person.fullName ?? person.name
  const previous = people[(position - 1 + people.length) % people.length]
  const next = people[(position + 1) % people.length]
  const links = detail.linkOrder.map((entry) => ({ ...entry, href: person.links?.[entry.key]?.trim() ?? '' }))
  const interests = person.interests?.trim()
  const hobbies = person.hobbies?.trim()

  return createPortal(
    <div className={cx('profile-dialog', leaving && 'is-leaving')} onAnimationEnd={finished}>
      <div className="profile-dialog__backdrop" onClick={onClose} aria-hidden="true" />

      <div
        className="profile-dialog__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={nameId}
        tabIndex={-1}
        ref={panel}
        data-lenis-prevent
      >
        <div className="profile-dialog__stage" aria-hidden="true">
          {supported && !failed ? (
            <Suspense fallback={null}>
              <LazyMemberBadge person={person} still={still} lowPower={lowPower} onFailure={fail} />
            </Suspense>
          ) : (
            <StillBadge person={person} />
          )}
          {supported && !failed ? <p className="profile-dialog__hint">{still ? detail.hintStill : detail.hint}</p> : null}
        </div>

        <div className="profile-dialog__info" key={shown}>
          <p className="profile-dialog__count">
            {detail.member} {position + 1} {detail.of} {people.length}
          </p>
          <h2 className="profile-dialog__name" id={nameId}>
            {name}
          </h2>
          {person.role ? <p className="profile-dialog__role">{person.role}</p> : null}
          {person.study ? <p className="profile-dialog__study">{person.study}</p> : null}

          <div className="profile-dialog__chapters">
            <Chapter title={detail.about} text={person.description} />
            <Chapter title={detail.skills} text={person.skills} />
            {interests ? <Chapter title={detail.interests} text={interests} /> : null}
            {hobbies ? <Chapter title={detail.hobbies} text={hobbies} /> : null}

            <section className="profile-dialog__chapter">
              <h3 className="profile-dialog__title">{detail.links}</h3>
              <ul className="profile-dialog__links">
                {links.map((link) =>
                  link.href ? (
                    <li key={link.key}>
                      <a className="profile-dialog__link" href={link.href} target="_blank" rel="noopener noreferrer">
                        {link.label}
                        <svg viewBox="0 0 12 12" aria-hidden="true">
                          <path d="M3 9 9 3M4.5 3H9v4.5" />
                        </svg>
                      </a>
                    </li>
                  ) : (
                    <li key={link.key}>
                      <span className="profile-dialog__link is-pending">
                        {link.label}
                        <span className="profile-dialog__note">{detail.linkPending}</span>
                      </span>
                    </li>
                  ),
                )}
              </ul>
            </section>
          </div>

          {people.length > 1 ? (
            <nav className="profile-dialog__steps" aria-label={detail.otherMembers}>
              <button type="button" className="profile-dialog__step" onClick={() => step(-1)}>
                <svg viewBox="0 0 16 16" aria-hidden="true">
                  <path d="M10 3 5 8l5 5" />
                </svg>
                <span>
                  <span className="visually-hidden">{detail.previous}: </span>
                  {previous.name}
                </span>
              </button>
              <button type="button" className="profile-dialog__step" onClick={() => step(1)}>
                <span>
                  <span className="visually-hidden">{detail.next}: </span>
                  {next.name}
                </span>
                <svg viewBox="0 0 16 16" aria-hidden="true">
                  <path d="M6 3l5 5-5 5" />
                </svg>
              </button>
            </nav>
          ) : null}
        </div>

        <button type="button" className="profile-dialog__close" onClick={onClose}>
          {detail.close}
          <span className="profile-dialog__close-mark" aria-hidden="true" />
        </button>
      </div>
    </div>,
    document.body,
  )
}

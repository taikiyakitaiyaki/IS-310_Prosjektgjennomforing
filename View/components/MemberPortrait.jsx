import { members } from '../../Model/site.js'
import { follow, release } from '../lib/follow.js'
import { useMotion } from '../lib/motion.jsx'
import { useReveal } from '../lib/reveal.jsx'
import { cx } from '../lib/cx.js'

/* ===========================================================================
   A member in the row: their portrait, which leans a little toward the
   pointer and says LES when pointed at, and their first name under it.
   Pressed, it opens their profile (MemberProfile) over the page.
   =========================================================================== */

const { detail } = members

export default function MemberPortrait({ person, index, onOpen, onPrepare, buttonRef }) {
  const [ref, inView] = useReveal()
  const { still } = useMotion()
  const pending = !person.src
  const name = person.fullName ?? person.name

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
        <>
          <button
            type="button"
            className="member__open"
            ref={buttonRef}
            aria-label={`${detail.open} ${name}`}
            aria-haspopup="dialog"
            onClick={onOpen}
            onPointerEnter={onPrepare}
            onFocus={onPrepare}
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

          <p className="member__name" aria-hidden="true">
            {person.name}
          </p>
        </>
      )}
    </li>
  )
}

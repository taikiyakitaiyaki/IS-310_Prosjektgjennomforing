import { Fragment, useEffect, useId, useImperativeHandle, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { members, sections } from '../../Model/site.js'
import { follow, release } from '../lib/follow.js'
import { Flip, gsap, useGSAP } from '../lib/gsap.js'
import { useMotion } from '../lib/motion.jsx'
import { portraitId, warmPortrait } from '../lib/portrait.js'
import { useScrollHalt } from '../lib/scroll.jsx'
import { cx } from '../lib/cx.js'
import Chevron from './Chevron.jsx'

/* ===========================================================================
   The profile a portrait opens up into.

   Nothing slides in over the page. The picture that was pressed becomes the
   profile: it grows out of its place in the row into a large portrait on the
   left, the other four step aside into a small row of their own beside it,
   and the page clears around them in its own colour. The name, the study and
   the words about the person come into focus one after another next to the
   portrait. Closing plays it backwards and every picture settles back into
   the row exactly where it left.

   The same five pictures stay on screen the whole time, so going from one
   person to the next is only a swap: the portrait goes back to its slot in
   the small row while the next one grows out of it - by the arrows, the arrow
   keys, a tap on a face, or a swipe on a phone.

   Every flight is GSAP's Flip, measured once and then moved by transform and
   faded by opacity and nothing else. The words are not animated by script at
   all: one attribute on the layout says whether they are coming in or going
   out, and the stylesheet carries every word by transform and opacity, which
   the browser hands to the compositor. A press therefore costs the same on a
   phone or a weak laptop as on a strong machine - and however long someone's
   text is, the press does no more work.

   The pictures are one set of elements in the profile, in one row, in the
   order of the page: the one being shown is lifted out of the row onto the
   portrait's place by a class, and the hollow slot it leaves behind is how
   the row says whose turn it is. Keeping them in the same parent is what lets
   Flip move them between the two places without React rebuilding a picture
   halfway through a swap.

   The dialog element brings the rest: Escape, focus kept inside while it is
   open, and the page behind made inert.
   =========================================================================== */

const { detail } = members
const people = members.people.filter((person) => person.src)
const heading = sections.find((section) => section.id === 'medlemmer')?.title ?? ''

/* How long the parts take, in seconds. Short, and on a curve that is under
   way from the first frame: the profile answers the press, it does not
   make a show of it. */
const GROW = 0.66 // the pressed portrait out of the row, the others aside
const SWAP = 0.55 // one portrait out, the last one back into its slot
const SETTLE = 0.62 // everything back into the row
const TEXT_OUT = 0.16 // the words leaving before the next person's arrive

/* However long the words run, they are all in within this. */
const WORDS_WITHIN = 0.42

/* How far a finger has to travel sideways before a swipe turns the page. */
const SWIPE = 56

/* Motion starts on the frame after the one that draws its first state.
   That frame is the expensive one - on the way in, the profile laid out and
   painted for the first time - and a flight already running would lose its
   whole length off the start: on a slow phone it would appear half-way there
   instead of taking off. Two frames, so the flight's clock starts after that
   one has been painted. Skipped if something else has taken over meanwhile. */
function startClean(animation, isCurrent = () => true) {
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      if (isCurrent()) animation.play(0)
    }),
  )
  return animation
}

/* A picture at rest: where every flight ends. */
const AT_REST = { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, skewX: 0 }

/* Where each picture has to start from to look the way it did in `state`,
   measured for all of them before any of them is moved. Flip.fit rather than
   Flip.from: Flip.from locks the page's scroll while it measures, and on a
   phone - which draws no scrollbar - that lock is a write to <body> that
   restyles and re-lays-out the whole page, twice a flight, in the very frame
   the press is answered in. A picture the state never saw has no start, and
   simply appears where it is. */
function startsFrom(state, targets) {
  return targets.map((target) => {
    /* Matched by the name both copies of a picture wear, since on the way in
       the state holds the row's pictures and the targets are the profile's. */
    const id = target?.getAttribute('data-flip-id')
    if (!id || !state.idLookup[id]) return null
    return Flip.fit(target, state, { scale: true, getVars: true })
  })
}

const pad = (number) => String(number).padStart(2, '0')
const wrap = (index) => (index + people.length) % people.length
const titleOf = (person) => person.fullName ?? person.name

/* A run of words, each in a box of its own so it can come into focus on its
   own. The spaces sit between the boxes rather than inside them, so the
   sentence still reads as one to assistive technology and wraps where it
   always would. */
function Words({ text }) {
  return text.split(' ').map((word, index) => (
    <Fragment key={`${word}-${index}`}>
      {index > 0 ? ' ' : null}
      <span className="profile__word" data-word="">
        {word}
      </span>
    </Fragment>
  ))
}

/* The name rises out of its own line a word at a time, the way every heading
   on the page does - the same masks, the same distance. An initial travels
   with the word before it, so a line never ends on a lone letter or starts
   with one. */
function Rising({ text }) {
  const words = text.split(' ').reduce((joined, word) => {
    if (word.length === 1 && joined.length > 0) joined[joined.length - 1] += `\u00a0${word}`
    else joined.push(word)
    return joined
  }, [])

  return words.map((word, index) => (
    <Fragment key={`${word}-${index}`}>
      {index > 0 ? ' ' : null}
      <span className="split__mask">
        <span className="split__word">{word}</span>
      </span>
    </Fragment>
  ))
}

/* The sharper copy of a portrait, laid over the small one once it has
   arrived - never instead of it, so the frame is never empty while it loads. */
function LargePicture({ src }) {
  const [loaded, setLoaded] = useState(false)

  return (
    <img
      className={cx('profile__img', 'profile__img--large', loaded && 'is-loaded')}
      src={src}
      alt=""
      width={members.portraitLarge.width}
      height={members.portraitLarge.height}
      decoding="async"
      ref={(node) => {
        if (node?.complete && node.naturalWidth) setLoaded(true)
      }}
      onLoad={(event) => {
        const node = event.currentTarget
        /* Decoded off the main thread before it is shown, so it goes on in
           one piece rather than being drawn while a picture is moving. */
        if (!node.decode) {
          setLoaded(true)
          return
        }
        node
          .decode()
          .catch(() => {})
          .then(() => setLoaded(true))
      }}
    />
  )
}

/* Whatever is known about the person, in reading order. Empty fields are left
   out rather than printed blank. Everything that comes into focus carries
   data-word, and it comes in the order it is written in. */
function ProfileText({ person, titleId }) {
  const interests = person.interests?.filter(Boolean) ?? []
  const description = person.description?.trim()
  const bare = !person.age && interests.length === 0 && !description

  /* A link with an address is a link; one without is shown as waiting rather
     than as a button that goes nowhere. */
  const links = detail.linkOrder.map((entry) => ({
    ...entry,
    href: person.links?.[entry.key]?.trim() ?? '',
  }))

  return (
    <>
      <header className="profile__head">
        <h2 className="profile__name" id={titleId}>
          <Rising text={titleOf(person)} />
        </h2>
        {person.role ? (
          <p className="profile__role">
            <Words text={person.role} />
          </p>
        ) : null}
        {person.study ? (
          <p className="profile__study">
            <Words text={person.study} />
          </p>
        ) : null}
      </header>

      <span className="profile__rule" aria-hidden="true" />

      {person.age ? (
        <p className="profile__body">
          <Words text={`${detail.age}: ${person.age} ${detail.years}`} />
        </p>
      ) : null}

      {interests.length > 0 ? (
        <section className="profile__block">
          <h3 className="profile__label" data-word="">
            {detail.interests}
          </h3>
          <ul className="profile__interests">
            {interests.map((interest) => (
              <li key={interest} data-word="">
                {interest}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {description ? (
        <section className="profile__block">
          <h3 className="profile__label" data-word="">
            {detail.about}
          </h3>
          <p className="profile__body">
            <Words text={description} />
          </p>
        </section>
      ) : null}

      {bare ? (
        <p className="profile__body profile__body--empty" data-word="">
          {detail.empty}
        </p>
      ) : null}

      <section className="profile__block">
        <h3 className="profile__label" data-word="">
          {detail.links}
        </h3>
        <ul className="profile__links">
          {links.map((link) => (
            <li key={link.key} data-word="">
              {link.href ? (
                <a
                  className="profile__link"
                  href={link.href}
                  target="_blank"
                  /* noreferrer as well as noopener: the new tab has no
                     business knowing where it was opened from. */
                  rel="noopener noreferrer"
                >
                  {link.label}
                </a>
              ) : (
                <span className="profile__link is-pending">
                  {link.label}
                  <span className="profile__link-note">{detail.linkPending}</span>
                </span>
              )}
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}

export default function MemberProfile({ ref, row, onLift }) {
  const { still } = useMotion()
  const halt = useScrollHalt()
  const titleId = useId()

  const dialog = useRef(null)
  const ground = useRef(null)
  const layout = useRef(null)
  const text = useRef(null)
  const slot = useRef(null)

  /* Whose portrait is large, and whose words are showing. The two part for a
     moment on every swap: the pictures move at once, the words wait for the
     last person's to leave. */
  const [current, setCurrent] = useState(null)
  const [shown, setShown] = useState(null)
  const [direction, setDirection] = useState(1)
  const [seen, setSeen] = useState(() => new Set())
  const [announcement, setAnnouncement] = useState('')

  /* What the handlers need to read between renders: where the profile is in
     its life, who is showing, and whatever is moving right now. */
  const live = useRef({ phase: 'closed', current: null, motion: null, swap: 0, swipe: null, swiped: false, textFrame: 0, flight: null })

  const { contextSafe } = useGSAP({ scope: dialog })

  const frames = () => [...(layout.current?.querySelectorAll('.profile__frame') ?? [])]
  const chrome = () => [...(dialog.current?.querySelectorAll('[data-chrome]') ?? [])]
  const home = (person) =>
    row.current?.querySelector(`.member__photo[data-flip-id="${CSS.escape(portraitId(person))}"]`) ?? null

  const warmAround = (index) => {
    warmPortrait(people[index])
    warmPortrait(people[wrap(index + 1)])
    warmPortrait(people[wrap(index - 1)])
  }

  const remember = (index) => setSeen((known) => (known.has(index) ? known : new Set(known).add(index)))

  /* The words come in in reading order: the name rising out of its line
     first, then everything under it a word at a time, lifting and fading up.
     All the script does is number the words and flip one attribute; the
     stylesheet does the moving, on the compositor. It reads nothing from the
     page, so it never makes the browser stop and recalculate. */
  const lightText = (delay = 0) => {
    const node = layout.current
    if (!node) return
    cancelAnimationFrame(live.current.textFrame)

    if (still) {
      delete node.dataset.text
      return
    }

    const name = node.querySelectorAll('.profile__name .split__word')
    const words = node.querySelectorAll('.profile__text [data-word]')
    name.forEach((word, index) => word.style.setProperty('--i', index))
    words.forEach((word, index) => word.style.setProperty('--i', index))
    const step = Math.min(12, (WORDS_WITHIN * 1000) / Math.max(words.length, 1))
    node.style.setProperty('--word-step', `${step.toFixed(2)}ms`)
    /* Two frames go to letting the browser see the words hidden first. */
    node.style.setProperty('--text-delay', `${Math.max(0, delay * 1000 - 32)}ms`)

    node.dataset.text = 'before'
    live.current.textFrame = requestAnimationFrame(() => {
      live.current.textFrame = requestAnimationFrame(() => {
        node.dataset.text = 'in'
      })
    })
  }

  /* And out again, quickly - on the way to the next person, or out of the
     profile altogether. */
  const dimText = () => {
    const node = layout.current
    cancelAnimationFrame(live.current.textFrame)
    if (!node || still) return
    node.dataset.text = 'out'
  }

  const open = contextSafe((person) => {
    const state = live.current
    const index = people.indexOf(person)
    if (state.phase !== 'closed' || index < 0 || !dialog.current) return

    /* Where every picture is in the row right now - which is where each of
       them will leave from. */
    const homes = people.map(home)
    const from = still ? null : Flip.getState(homes.filter(Boolean))

    /* The pressed picture sits however the pointer left it: nudged a few
       pixels, swollen by the hover. It lifts off from exactly that and
       relaxes on the way, rather than jumping to rest as it leaves. */
    const pressed = homes[index]
    const inner = pressed?.querySelector('img')
    const sat = inner ? new DOMMatrixReadOnly(getComputedStyle(inner).transform) : null

    state.current = index
    flushSync(() => {
      setCurrent(index)
      setShown(index)
      setDirection(1)
      setAnnouncement('')
      remember(index)
      onLift(true)
    })

    halt()
    dialog.current.showModal()
    dialog.current.focus({ preventScroll: true })
    warmAround(index)

    if (still) {
      gsap.set(ground.current, { autoAlpha: 1 })
      gsap.set(chrome(), { opacity: 1 })
      state.phase = 'open'
      return
    }

    state.phase = 'opening'
    const all = frames()
    const lead = all[index]
    const picture = lead.querySelector('.profile__picture')

    /* The pictures start out wherever the row had them, which can be well
       outside the profile's own box. They are allowed to be, for as long as
       they are travelling, without the profile growing a scrollbar for them. */
    dialog.current.dataset.moving = ''

    const timeline = gsap.timeline({
      paused: true,
      onComplete: () => {
        state.phase = 'open'
        state.motion = null
        if (dialog.current) delete dialog.current.dataset.moving
      },
    })

    timeline.fromTo(ground.current, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.35, ease: 'power2.out' }, 0)

    /* The pressed one first; the others step aside a hair later, the
       nearest first, as if it had made room for itself. All five are measured
       in one pass, then each is moved from its place in the row to its place
       here by transform alone. */
    const starts = startsFrom(from, all)
    all.forEach((frame, position) => {
      if (!starts[position]) return
      timeline.fromTo(
        frame,
        starts[position],
        { ...AT_REST, duration: GROW, ease: 'answer', clearProps: 'transform' },
        position === index ? 0 : 0.02 + Math.abs(position - index) * 0.025,
      )
    })

    if (sat && pressed) {
      const grown = lead.offsetWidth / Math.max(pressed.offsetWidth, 1)
      timeline.fromTo(
        picture,
        { x: sat.e * grown, y: sat.f * grown, scale: sat.a, transition: 'none' },
        { x: 0, y: 0, scale: 1.06, duration: GROW, ease: 'answer', clearProps: 'transform,transition' },
        0,
      )
    }

    timeline.fromTo(chrome(), { opacity: 0 }, { opacity: 1, duration: 0.4, ease: 'power1.out', stagger: 0.03 }, 0.22)

    state.motion = timeline
    startClean(timeline, () => live.current.motion === timeline)
    lightText(0.18)
  })

  /* The profile is gone: the pictures are back in the row, and focus lands on
     whoever was showing last - which is not always who was pressed. */
  const finish = () => {
    const state = live.current
    const last = people[state.current]

    window.clearTimeout(state.swap)
    state.motion = null
    state.phase = 'closed'
    state.current = null

    flushSync(() => {
      onLift(false)
      setCurrent(null)
      setShown(null)
    })

    if (dialog.current) {
      delete dialog.current.dataset.moving
      delete dialog.current.dataset.closing
      if (dialog.current.open) dialog.current.close()
    }

    const button = last ? home(last)?.closest('button') : null
    button?.focus({ preventScroll: true })
  }

  const close = contextSafe(() => {
    const state = live.current
    if (state.phase === 'closed' || state.phase === 'closing') return

    state.phase = 'closing'
    window.clearTimeout(state.swap)
    state.motion?.kill()

    /* Everything that follows the pointer comes to rest, so that the pictures
       land looking exactly the way the row shows them. */
    layout.current?.style.setProperty('--mx', '0')
    layout.current?.style.setProperty('--my', '0')
    for (const item of row.current?.querySelectorAll('.member') ?? []) {
      item.style.setProperty('--mx', '0')
      item.style.setProperty('--my', '0')
    }

    if (still) {
      finish()
      return
    }

    const index = state.current
    const all = frames()
    const homes = people.map(home)

    /* A swap or a swipe still under way stops where it is, and the flight
       home starts from exactly there. */
    gsap.killTweensOf([...all, slot.current])
    dialog.current.dataset.moving = ''
    dialog.current.dataset.closing = ''

    /* Where each picture has to land, measured for all of them at once,
       before anything below writes to the page. */
    const landings = all.map((frame, position) =>
      homes[position] ? Flip.fit(frame, homes[position], { scale: true, getVars: true }) : null,
    )

    const timeline = gsap.timeline({ paused: true, onComplete: finish })
    dimText()
    timeline.to(chrome(), { opacity: 0, duration: 0.18, ease: 'power1.in' }, 0)

    /* The swipe or the pointer may have left the portrait off its rest. */
    const picture = all[index]?.querySelector('.profile__picture')
    if (picture) {
      timeline.to(
        picture,
        {
          x: 0,
          y: 0,
          scale: 1.06,
          transition: 'none',
          duration: 0.35,
          ease: 'siteOut',
          clearProps: 'transform,transition',
        },
        0,
      )
    }

    /* The small row back first, the portrait last - the reverse of how they
       came. Each lands on its own slot in the row, measured now. */
    all.forEach((frame, position) => {
      const landing = landings[position]
      if (!landing) return
      const isLead = position === index
      timeline.to(
        frame,
        { ...landing, duration: isLead ? SETTLE : SETTLE - 0.08, ease: 'answer' },
        isLead ? 0.05 : Math.abs(position - index) * 0.02,
      )
    })

    timeline.to(ground.current, { autoAlpha: 0, duration: 0.4, ease: 'power1.inOut' }, 0.14)
    state.motion = timeline
    startClean(timeline, () => live.current.motion === timeline)
  })

  /* To another person, without closing. `to` may run off either end; the
     row wraps round, so the last person's next is the first. */
  const go = contextSafe((to) => {
    const state = live.current
    if (state.phase !== 'open') return

    const from = state.current
    const index = wrap(to)
    if (index === from) return

    const all = frames()
    const moving = [...all, slot.current]
    const before = still ? null : Flip.getState(moving)

    /* Anything still in flight, or held where a finger dragged it, is let go
       of here: the state above has already recorded where it was, which is
       where it will leave from. */
    if (!still) {
      Flip.killFlipsOf(moving)
      gsap.killTweensOf(moving)
      gsap.set(moving, { clearProps: 'transform' })
    }

    const person = people[index]
    state.current = index
    flushSync(() => {
      setCurrent(index)
      setDirection(Math.sign(to - from) || 1)
      setAnnouncement(`${titleOf(person)}, ${index + 1} ${detail.of} ${people.length}`)
      remember(index)
    })
    warmAround(index)
    window.clearTimeout(state.swap)

    if (still) {
      flushSync(() => setShown(index))
      return
    }

    const starts = startsFrom(before, moving)
    const flight = gsap.timeline({ paused: true })
    moving.forEach((item, position) => {
      if (!starts[position]) return
      flight.fromTo(item, starts[position], { ...AT_REST, duration: SWAP, ease: 'answer', clearProps: 'transform' }, 0)
    })
    state.flight = flight
    startClean(flight, () => live.current.flight === flight)

    dimText()
    state.swap = window.setTimeout(() => {
      if (live.current.phase !== 'open') return
      flushSync(() => setShown(live.current.current))
      lightText(0)
    }, TEXT_OUT * 1000)
  })

  /* Handlers attached once read the latest versions through this. */
  const api = useRef(null)
  api.current = { open, close, go, finish }

  useImperativeHandle(ref, () => ({ open: (person) => api.current.open(person) }), [])

  useEffect(() => {
    const node = dialog.current
    if (!node) return undefined

    const keys = (event) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
      const at = live.current.current
      if (at === null) return

      if (event.key === 'ArrowRight') {
        event.preventDefault()
        api.current.go(at + 1)
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault()
        api.current.go(at - 1)
      }
    }

    /* Escape asks the dialog to close; it closes the long way round instead,
       with the pictures flying home. */
    const cancel = (event) => {
      event.preventDefault()
      api.current.close()
    }

    /* A close the browser made on its own, without asking: catch up at once. */
    const closed = () => {
      if (live.current.phase === 'closed') return
      live.current.motion?.kill()
      api.current.finish()
    }

    node.addEventListener('keydown', keys)
    node.addEventListener('cancel', cancel)
    node.addEventListener('close', closed)
    return () => {
      node.removeEventListener('keydown', keys)
      node.removeEventListener('cancel', cancel)
      node.removeEventListener('close', closed)
    }
  }, [])

  useEffect(() => () => window.clearTimeout(live.current.swap), [])

  /* --- A finger turns the page ------------------------------------------
     Sideways, the portrait follows the finger at half its pace, and let go
     far enough it goes back to its slot while the next one comes out; not
     far enough and it springs back. Up and down is left to the browser, which
     scrolls the profile where it is taller than the screen. A mouse has the
     arrows and the keys, and moves the picture a little inside its frame
     instead, as every picture on the page does. */
  const pointerDown = (event) => {
    live.current.swiped = false
    if (event.pointerType === 'mouse' || live.current.phase !== 'open') return
    live.current.swipe = { id: event.pointerId, x: event.clientX, y: event.clientY, moving: false }
  }

  const pointerMove = (event) => {
    if (event.pointerType === 'mouse') {
      if (!still) follow(event)
      return
    }

    const swipe = live.current.swipe
    if (!swipe || swipe.id !== event.pointerId) return

    const dx = event.clientX - swipe.x
    const dy = event.clientY - swipe.y

    if (!swipe.moving) {
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) {
        live.current.swipe = null
        return
      }
      if (Math.abs(dx) < 10) return
      swipe.moving = true
    }

    if (!still) gsap.set(frames()[live.current.current], { x: dx * 0.5 })
  }

  const pointerUp = (event) => {
    const swipe = live.current.swipe
    if (!swipe || swipe.id !== event.pointerId) return
    live.current.swipe = null
    if (!swipe.moving) return

    /* Whatever tap the browser makes of the end of a swipe is not a tap. */
    live.current.swiped = true

    const dx = event.clientX - swipe.x
    if (event.type === 'pointerup' && Math.abs(dx) >= SWIPE) {
      api.current.go(live.current.current + (dx < 0 ? 1 : -1))
      return
    }

    gsap.to(frames()[live.current.current], { x: 0, duration: 0.35, ease: 'siteOut', clearProps: 'transform' })
  }

  const swallowClick = (event) => {
    if (!live.current.swiped) return
    live.current.swiped = false
    event.preventDefault()
    event.stopPropagation()
  }

  const person = shown === null ? null : people[shown]
  const count = people.length
  const previous = current === null ? null : people[wrap(current - 1)]
  const next = current === null ? null : people[wrap(current + 1)]

  return (
    <dialog
      className="profile"
      ref={dialog}
      tabIndex={-1}
      aria-labelledby={titleId}
      /* The wheel over the profile is the profile's own: Lenis is told to
         leave it alone rather than scroll the page behind with it. */
      data-lenis-prevent=""
    >
      <div className="profile__ground" ref={ground} aria-hidden="true" />

      {current === null ? null : (
        <>
          {/* Where the navigation was: which section this is, whose turn it
              is, and the way out. */}
          <div className="profile__bar" data-chrome="">
            <p className="profile__where">
              <span>{heading}</span>
              <span className="profile__count" data-direction={direction}>
                <span className="profile__count-mask">
                  <span className="profile__count-now" key={current}>
                    {pad(current + 1)}
                  </span>
                </span>
                <span className="profile__count-all">/ {pad(count)}</span>
              </span>
            </p>
            <button type="button" className="profile__close" onClick={close}>
              {detail.close}
              <span className="profile__close-mark" aria-hidden="true" />
            </button>
          </div>

          <div className="profile__sheet">
            <div
              className="profile__layout"
              ref={layout}
              onPointerDown={pointerDown}
              onPointerMove={pointerMove}
              onPointerUp={pointerUp}
              onPointerCancel={pointerUp}
              onPointerLeave={still ? undefined : release}
              onClickCapture={swallowClick}
            >
              {/* The first name, very large and very faint, standing behind
                the portrait the way the group's name stands behind the group
                on the landing. It changes with the words, not the pictures. */}
              {person ? (
                <span className="profile__echo" key={`echo-${shown}`} aria-hidden="true">
                  {person.name}
                </span>
              ) : null}

              {/* Holds the portrait's place in the layout; the portrait itself
                is the frame lifted out of the small row onto it. */}
              <div className="profile__space" aria-hidden="true" />

              <div className="profile__text" ref={text} key={`text-${shown}`}>
                {person ? <ProfileText person={person} titleId={titleId} /> : null}
              </div>

              <div className="profile__rail" style={{ '--count': count }}>
                <button
                  type="button"
                  className="profile__step profile__step--previous"
                  data-chrome=""
                  aria-label={`${detail.previous}: ${titleOf(previous)}`}
                  onClick={() => go(current - 1)}
                >
                  <Chevron className="profile__step-mark" direction="left" />
                </button>

                {/* The hollow slot the portrait left, outlined in the brand:
                  where it came from, and where it goes back to. */}
                <span
                  className="profile__slot"
                  data-chrome=""
                  ref={slot}
                  style={{ gridColumn: current + 2 }}
                  aria-hidden="true"
                />

                {people.map((entry, index) => {
                  const isCurrent = index === current
                  return (
                    <button
                      type="button"
                      key={entry.name}
                      className={cx('profile__frame', isCurrent && 'is-current')}
                      style={isCurrent ? undefined : { gridColumn: index + 2 }}
                      data-flip-id={portraitId(entry)}
                      aria-label={`${detail.show} ${titleOf(entry)}`}
                      aria-hidden={isCurrent || undefined}
                      tabIndex={isCurrent ? -1 : undefined}
                      title={isCurrent ? undefined : entry.name}
                      onClick={() => go(index)}
                    >
                      <span className="profile__picture">
                        <img
                          className="profile__img"
                          src={entry.src}
                          alt=""
                          width={members.portrait.width}
                          height={members.portrait.height}
                          /* Already on the page, in the row: painted in the
                           very first frame of the flight, never a beat
                           after it. */
                          decoding="sync"
                        />
                        {entry.large && seen.has(index) ? <LargePicture src={entry.large} /> : null}
                      </span>
                    </button>
                  )
                })}

                <button
                  type="button"
                  className="profile__step profile__step--next"
                  data-chrome=""
                  aria-label={`${detail.next}: ${titleOf(next)}`}
                  onClick={() => go(current + 1)}
                >
                  <Chevron className="profile__step-mark" direction="right" />
                </button>
              </div>
            </div>
          </div>

          <p className="visually-hidden" aria-live="polite">
            {announcement}
          </p>
        </>
      )}
    </dialog>
  )
}

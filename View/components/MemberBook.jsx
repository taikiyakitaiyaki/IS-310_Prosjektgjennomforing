import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { members, site } from '../../Model/site.js'
import { follow, release } from '../lib/follow.js'
import { useMotion } from '../lib/motion.jsx'
import { useReveal } from '../lib/reveal.jsx'
import { useScrollBy } from '../lib/scroll.jsx'
import { cx } from '../lib/cx.js'
import Chevron from './Chevron.jsx'

/* ===========================================================================
   A portrait that opens into a small hardcover book about the person.

   The portrait is the book's cover. Pressed, the book is lifted out of the row
   and the cover swings open on its spine: inside it a passport page - photo,
   name and the machine-readable line - and facing it the first
   chapter. The pages turn one leaf at a time, by the arrows, a press on
   either page, the arrow keys, or a swipe. Escape, a press anywhere else, or
   turning back past the first page closes it, and it lands in the row again.

   On a wide screen it lies open as a spread, two pages side by side. On a
   phone there is room for one page at a time, so each leaf carries one page
   and turns away over the spine to show the next.

   Everything that moves is a transform or an opacity - the lift on one
   element, each turning leaf on its own, the light across a page as it turns
   - so the browser runs it all on the compositor, and a page turn costs about
   what the hover over a portrait costs, on any phone. The leaves are stiff,
   like a board book's; a page that bends would have to be redrawn every frame.

   The book is never the small portrait blown up. The moment it is pressed it
   is laid out at the size it is read at, and starts out shrunk to exactly the
   portrait; the lift only takes the shrinking away. The browser draws a layer
   at its laid-out size and cannot redraw it while it turns in 3D, so a small
   book blown up would stay soft for as long as it moved - drawn large and
   shrunk, it is sharp the whole way. On the way back it shrinks first, and
   only then drops back into the row.
   =========================================================================== */

const { detail } = members

/* How wide one page is drawn, at most, where the row has room for it. */
const PAGE_WIDTH = 420

/* Room kept between the book and the edges of the screen, and the height of
   the row of controls under it (margin and buttons, as in the stylesheet). */
const EDGE = 16
const CONTROLS = 66

/* The lift: how long and on what curve. The turn: how long half a turn
   takes, its curve, and how far the eye is from the page. The cover starts to
   open a beat into the lift; leaves turning together follow one another by
   STAGGER, and are all under way within STAGGER_ALL. */
const LIFT = 680
const LIFT_EASE = 'cubic-bezier(0.16, 1, 0.3, 1)'
const TURN = 820
const TURN_EASE = 'cubic-bezier(0.45, 0.05, 0.2, 1)'
const DEPTH = 2400
const COVER_AFTER = 240
const STAGGER = 110
const STAGGER_ALL = 330
const gapFor = (count) => Math.min(STAGGER, STAGGER_ALL / Math.max(1, count - 1))

/* How dark a page gets as it stands on edge. */
const SHADE = 0.42

/* Past this many letters a chapter is set a size smaller, to stay on its
   page. */
const LONG = 300

const phone = () => window.matchMedia('(max-width: 767px)').matches

/* Where the book is read, and how it gets there. Measured from the layout,
   which no transform has touched, relative to the portrait's own box.

   A spread is centred on the portrait and held inside the row; a single page
   on a phone is as wide as the row. Neither is taller than the screen leaves
   room for. `down` is the transform that shrinks the laid-out book so that its
   cover lies exactly over the portrait. */
function placeFor(item, lift, mode) {
  const box = item.getBoundingClientRect()
  const row = item.parentElement.getBoundingClientRect()
  const width = item.offsetWidth
  const height = lift.offsetHeight
  const nav = Math.max(0, document.querySelector('.site-nav')?.getBoundingClientRect().bottom ?? 0)
  const tallest = ((window.innerHeight - nav - 2 * EDGE - CONTROLS) * 3) / 4

  const spread = mode === 'spread'
  const page = Math.max(width, Math.min(spread ? Math.min(PAGE_WIDTH, row.width / 2) : row.width, tallest))
  const pageHeight = (page * 4) / 3
  const across = spread ? page * 2 : page
  const centre = box.left + width / 2
  const left = Math.min(Math.max(centre - across / 2, row.left), row.right - across)

  const x = left - box.left
  const y = height / 2 - pageHeight / 2
  const spine = spread ? page : 0
  const shrink = width / page

  return {
    mode,
    x,
    y,
    spine,
    page,
    pageHeight,
    across,
    height,
    down: `translate(${-x - shrink * spine}px, ${-y}px) scale(${shrink})`,
    top: box.top + y,
    bottom: box.top + y + pageHeight + CONTROLS,
  }
}

/* Which leaves the book has, front and back, in the order they turn. On a
   spread each leaf is two pages; on a phone, one. The cover is always first;
   the last page is printed on the back board and never turns. */
const LEAVES = {
  spread: [
    { front: 'cover', back: 'passport' },
    { front: 'about', back: 'skills' },
    { front: 'interests', back: 'links' },
  ],
  single: [
    { front: 'cover' },
    { front: 'passport' },
    { front: 'about' },
    { front: 'skills' },
    { front: 'interests' },
    { front: 'links' },
  ],
  closed: [{ front: 'cover' }],
}

/* ---------------------------------------------------------------------------
   The printed matter.
   --------------------------------------------------------------------------- */

/* Letters as a passport's machine-readable zone writes them: capitals, the
   Norwegian letters spelled out, and everything else a filler. */
function machine(text) {
  return text
    .toUpperCase()
    .replace(/Æ/g, 'AE')
    .replace(/Ø/g, 'OE')
    .replace(/Å/g, 'AA')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Z0-9]+/g, '<')
}

const LINE = 36

function machineLines(name) {
  const words = name.trim().split(/\s+/)
  const surname = words.length > 1 ? words.at(-1) : words[0]
  const given = words.length > 1 ? words.slice(0, -1).join(' ') : ''
  const fill = (text) => text.slice(0, LINE).padEnd(LINE, '<')
  return [
    fill(`P<${machine(site.name)}<${machine(surname)}<<${machine(given)}`),
    fill(`${machine(site.courseCode)}<${machine(site.group)}`),
  ]
}

/* Bars worked out from the person's name, so everyone's stripe is their own
   and always the same. */
function Barcode({ seed }) {
  const codes = [...seed].map((letter) => letter.charCodeAt(0))
  const bars = []
  let x = 0

  for (let index = 0; x < 92; index++) {
    const code = codes[index % codes.length] + index * 7
    const width = 1 + (code % 3)
    bars.push(<rect key={index} x={x} width={width} height="24" />)
    x += width + 1 + ((code >> 2) % 2)
  }

  return (
    <svg className="book__barcode" viewBox={`0 0 ${x} 24`} preserveAspectRatio="none" aria-hidden="true">
      {bars}
    </svg>
  )
}

/* One page of paper. Right-hand pages have their gutter on the left and a
   corner that lifts under the pointer - all but the last, which has nothing
   after it to turn to; left-hand pages the other way round. */
function Paper({ side, head, folio, last = false, className, children }) {
  return (
    <div className={cx('book__paper', `book__paper--${side}`, className)}>
      {head ? (
        <p className="book__head">
          <span>{site.name}</span>
          <span>{head}</span>
        </p>
      ) : null}
      {children}
      {folio ? <p className="book__folio">{folio}</p> : null}
      {side === 'right' && !last ? <span className="book__corner" aria-hidden="true" /> : null}
    </div>
  )
}

function Chapter({ title, children }) {
  return (
    <>
      <div className="book__chapter">
        <h3 className="book__title">{title}</h3>
      </div>
      {children}
    </>
  )
}

/* A chapter's text. The first chapter opens on a drop capital; a long one
   is set a size smaller, to stay on its page. */
function Prose({ text, lead = false }) {
  return <p className={cx('book__text', lead && 'book__text--lead', text.length > LONG && 'book__text--long')}>{text}</p>
}

const Pending = () => <p className="book__text book__text--pending">{detail.pending}</p>

/* Every page the book can show, by name, for one person. */
function pagesFor(person, sideOf) {
  const name = person.fullName ?? person.name
  const about = person.description?.trim()
  const skills = person.skills?.trim()
  const interests = person.interests?.trim()
  const hobbies = person.hobbies?.trim()
  const links = detail.linkOrder.map((entry) => ({ ...entry, href: person.links?.[entry.key]?.trim() ?? '' }))

  return {
    passport: (
      <Paper side={sideOf('passport')} className="book__paper--passport">
        <p className="book__head">
          <span>{detail.personalia}</span>
          <span>{site.name}</span>
        </p>
        <div className="book__identity">
          <div className="book__portrait">
            <img
              src={person.src}
              alt=""
              width={members.portrait.width}
              height={members.portrait.height}
              loading="lazy"
              decoding="async"
            />
          </div>
          <dl className="book__fields">
            <div>
              <dt>{detail.name}</dt>
              <dd>{name}</dd>
            </div>
            {person.role ? (
              <div>
                <dt>{detail.role}</dt>
                <dd>{person.role}</dd>
              </div>
            ) : null}
            {person.study ? (
              <div>
                <dt>{detail.study}</dt>
                <dd>{person.study}</dd>
              </div>
            ) : null}
          </dl>
        </div>
        <p className="book__machine" aria-hidden="true">
          {machineLines(name).join('\n')}
        </p>
      </Paper>
    ),

    about: (
      <Paper side={sideOf('about')} head={person.name} folio={1}>
        <Chapter title={detail.about}>
          {about ? <Prose text={about} lead /> : <Pending />}
        </Chapter>
      </Paper>
    ),

    skills: (
      <Paper side={sideOf('skills')} head={person.name} folio={2}>
        <Chapter title={detail.skills}>
          {skills ? <Prose text={skills} /> : <Pending />}
        </Chapter>
      </Paper>
    ),

    interests: (
      <Paper side={sideOf('interests')} head={person.name} folio={3}>
        <Chapter title={!interests && hobbies ? detail.hobbies : detail.interests}>
          {interests ? <Prose text={interests} /> : null}
          {hobbies ? (
            <>
              {interests ? <p className="book__label">{detail.hobbies}</p> : null}
              <Prose text={hobbies} />
            </>
          ) : null}
          {!interests && !hobbies ? <Pending /> : null}
        </Chapter>
      </Paper>
    ),

    links: (
      <Paper side={sideOf('links')} head={person.name} folio={4}>
        <Chapter title={detail.links}>
          <ul className="book__index">
            {links.map((link) =>
              link.href ? (
                <li key={link.key}>
                  <a
                    className="book__entry"
                    href={link.href}
                    target="_blank"
                    /* noreferrer as well as noopener: the new tab has no
                       business knowing where it was opened from. */
                    rel="noopener noreferrer"
                  >
                    <span>{link.label}</span>
                    <span className="book__leader" aria-hidden="true" />
                    {/* Drawn rather than typed: the typeface has no arrow,
                        and the browser would go looking through the system's
                        fonts for one the first time a book opened. */}
                    <svg className="book__arrow" viewBox="0 0 12 12" aria-hidden="true">
                      <path d="M3 9 9 3M4.5 3H9v4.5" />
                    </svg>
                  </a>
                </li>
              ) : (
                <li key={link.key}>
                  <span className="book__entry is-pending">
                    <span>{link.label}</span>
                    <span className="book__leader" aria-hidden="true" />
                    <span className="book__note">{detail.linkPending}</span>
                  </span>
                </li>
              ),
            )}
          </ul>
        </Chapter>
      </Paper>
    ),

    end: (
      <Paper side="right" last className="book__paper--end">
        <div className="book__end">
          <span className="book__mark">{site.name}</span>
          <Barcode seed={name} />
        </div>
      </Paper>
    ),
  }
}

/* ---------------------------------------------------------------------------
   The book.
   --------------------------------------------------------------------------- */

/* Where a leaf lies when nothing is turning it: the ones still to be turned
   stacked on the right with the next one on top, the turned ones on the left
   with the last one on top. */
const restingDepth = (index, turned) => String(turned ? 100 + index : 100 - index)

export default function MemberBook({ person, index, open, onOpen, onClose }) {
  const [ref, inView] = useReveal()
  const { still } = useMotion()
  const scrollBy = useScrollBy()
  const lift = useRef(null)
  const book = useRef(null)
  const cover = useRef(null)
  /* 'spread' or 'single' while the book is out of the row, whichever the
     screen had room for when it was opened; null while it is a portrait. */
  const [mode, setMode] = useState(null)
  /* Which spread (or page) lies open, from 1. */
  const [view, setView] = useState(1)
  const place = useRef(null)
  const lifting = useRef(null)
  const leafStates = useRef([])
  const shown = useRef(0)
  const focusTo = useRef(null)
  const swipe = useRef(null)
  const bookId = useId()
  const pending = !person.src

  const name = person.fullName ?? person.name
  const leaves = LEAVES[mode ?? 'closed']
  const last = mode ? leaves.length : 0
  /* The page the book shows: nothing but the cover while it is shut. */
  const current = open && mode ? Math.min(view, last) : 0

  const sideOf = (page) => (mode === 'spread' && leaves.some((leaf) => leaf.back === page) ? 'left' : 'right')
  const pages = mode ? pagesFor(person, sideOf) : null

  /* Which faces can be seen, and so read and pressed: the cover while shut;
     open, the top of the right-hand stack and, on a spread, the top of the
     left-hand one. */
  const faceShown = (leaf, face) => {
    if (current === 0) return leaf === 0 && face === 'front'
    if (face === 'front') return leaf === current
    return mode === 'spread' && leaf === current - 1
  }

  const openBook = () => {
    const item = ref.current
    if (!item || !lift.current) return

    const nextMode = phone() ? 'single' : 'spread'
    /* Still out of the row, on its way back: it goes back to where it was. */
    if (!('raised' in item.dataset) || place.current?.mode !== nextMode) {
      place.current = placeFor(item, lift.current, nextMode)
    }
    const at = place.current

    /* A book opened near the top or foot of the screen would run past it; the
       page moves just far enough to show all of it, below the navigation. */
    const top = Math.max(0, document.querySelector('.site-nav')?.getBoundingClientRect().bottom ?? 0)
    if (at.bottom > window.innerHeight - EDGE) {
      scrollBy(Math.min(at.bottom - (window.innerHeight - EDGE), at.top - top - EDGE))
    } else if (at.top < top + EDGE) {
      scrollBy(at.top - top - EDGE)
    }

    focusTo.current = 'book'
    setMode(nextMode)
    setView(1)
    onOpen()
  }

  const close = (withFocus) => {
    focusTo.current = withFocus ? 'cover' : null
    onClose()
  }

  /* A page on. Back past the first page is shutting the cover. */
  const go = (step) => {
    if (current + step < 1) return close(ref.current?.contains(document.activeElement))
    setView(Math.min(Math.max(current + step, 1), last))
  }

  /* --- The movement ------------------------------------------------------ */

  /* How far a leaf has got: where it was sent, or, if it is on its way, where
     along the way it is. */
  const angleOf = (state) => {
    const { animation } = state
    if (!animation) return state.to
    const progress = animation.effect.getComputedTiming().progress
    if (progress === null) return animation.playState === 'finished' ? state.to : state.from
    return state.from + (state.to - state.from) * progress
  }

  /* Every leaf to where it lies with `view` open, one after another. Leaves
     already on their way there are left to arrive. */
  const turnLeaves = (view, delay) => {
    const nodes = [...book.current.querySelectorAll(':scope > .book__leaf')]
    const moves = []

    nodes.forEach((node, leaf) => {
      const state = (leafStates.current[leaf] ??= { from: 0, to: 0, animation: null, shades: [] })
      const to = view > leaf ? -180 : 0
      if (state.to === to) return
      moves.push({ node, leaf, state, from: angleOf(state), to })
    })

    /* Forward, the nearest leaf first; back, the last one turned first -
       closer together the more there are, so shutting the book from its last
       page takes hardly longer than from its first. */
    const forward = moves.some((move) => move.to < move.from)
    moves.sort((a, b) => (forward ? a.leaf - b.leaf : b.leaf - a.leaf))
    const gap = gapFor(moves.length)
    moves.forEach((move, order) => turnLeaf(move, delay + order * gap, order))
    return moves.length
  }

  const turnLeaf = ({ node, leaf, state, from, to }, delay, order) => {
    state.animation?.cancel()
    state.shades.forEach((shade) => shade.cancel())
    state.from = from
    state.to = to
    state.animation = null
    state.shades = []

    /* Where it rests once the turn is over - flat, with no depth, so it is
       drawn sharp - already set, so the turn hands over to it seamlessly. */
    node.style.transform = to ? `rotateY(${to}deg)` : ''

    if (still || from === to) {
      node.style.zIndex = restingDepth(leaf, to !== 0)
      return
    }

    /* Above everything while it turns: it lifts off one stack and lands on
       top of the other. */
    node.style.zIndex = String(200 + order)

    const timing = {
      duration: (TURN * Math.abs(to - from)) / 180,
      easing: TURN_EASE,
      delay,
      fill: 'backwards',
    }
    const animation = node.animate(
      [
        { transform: `perspective(${DEPTH}px) rotateY(${from}deg)` },
        { transform: `perspective(${DEPTH}px) rotateY(${to}deg)` },
      ],
      timing,
    )

    /* The light: the side turning away darkens as it comes up on edge, the
       side coming into view brightens as it settles. Same curve as the turn,
       so halfway in the light is halfway in the turn. */
    const rising = [{ opacity: 0 }, { opacity: SHADE, offset: 0.5 }, { opacity: SHADE }]
    const falling = [{ opacity: SHADE }, { opacity: SHADE, offset: 0.5 }, { opacity: 0 }]
    const away = to < from
    const front = node.querySelector(':scope > .book__face--front .book__shade')
    const back = node.querySelector(':scope > .book__face--back .book__shade')
    if (front) state.shades.push(front.animate(away ? rising : falling, timing))
    if (back) state.shades.push(back.animate(away ? falling : rising, timing))

    state.animation = animation
    animation.onfinish = () => {
      if (state.animation !== animation) return
      state.animation = null
      node.style.zIndex = restingDepth(leaf, to !== 0)
    }
  }

  /* Back into the row: the portrait again, laid out small. */
  const shut = () => {
    const item = ref.current
    if (item) delete item.dataset.raised
    const coverLeaf = book.current?.querySelector(':scope > .book__leaf')
    if (coverLeaf) {
      coverLeaf.style.transform = ''
      coverLeaf.style.zIndex = ''
    }
    leafStates.current = []
    place.current = null
    setMode(null)
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

  /* Before the page is painted, so no page ever flashes up ahead of its
     movement. */
  useLayoutEffect(() => {
    const was = shown.current
    if (current === was) return
    shown.current = current

    const item = ref.current
    const at = place.current
    if (!item || !book.current || !at) return

    if (was === 0) {
      /* Out of the row: laid out at full size where it will be read, every
         leaf stacked in order, and shrunk down onto the portrait to start. */
      item.style.setProperty('--book-x', `${at.x}px`)
      item.style.setProperty('--book-y', `${at.y}px`)
      item.style.setProperty('--book-w', `${at.across}px`)
      item.style.setProperty('--page-w', `${at.page}px`)
      item.style.setProperty('--page-h', `${at.pageHeight}px`)
      item.style.setProperty('--spine', `${at.spine}px`)
      item.style.setProperty('--card-h', `${at.height}px`)
      item.dataset.raised = ''
      book.current.querySelectorAll(':scope > .book__leaf').forEach((node, leaf) => {
        if (!leafStates.current[leaf]?.animation) node.style.zIndex = restingDepth(leaf, false)
      })
      moveLift(true, 0)
      turnLeaves(current, COVER_AFTER)
      return
    }

    const turning = turnLeaves(current, 0)
    /* Shut: the leaves go back first, and the book settles into the row once
       the cover is well on its way. */
    if (current === 0) moveLift(false, Math.max(0, turning - 1) * gapFor(turning) + TURN * 0.45)
  }, [current, mode, still])

  /* --- Focus, keys, and letting go -------------------------------------- */

  useEffect(() => {
    if (focusTo.current === 'book' && open) book.current?.focus({ preventScroll: true })
    if (focusTo.current === 'cover' && !open) cover.current?.focus({ preventScroll: true })
    focusTo.current = null
  }, [open])

  /* While it is open: a press anywhere off the book, or Escape, shuts it; the
     arrow keys turn the pages. So does the window changing width - the book
     was laid out for the old one. Only the width: a phone changes the
     window's height every time its address bar slides away. */
  useEffect(() => {
    if (!open) return undefined
    const item = ref.current
    const width = window.innerWidth

    const onPointerDown = (event) => {
      if (!item?.contains(event.target)) close(false)
    }
    const onKeyDown = (event) => {
      const here = item?.contains(document.activeElement) || document.activeElement === document.body
      if (event.key === 'Escape') close(item?.contains(document.activeElement))
      else if (here && event.key === 'ArrowRight') go(1)
      else if (here && event.key === 'ArrowLeft') go(-1)
    }
    const onResize = () => {
      if (window.innerWidth !== width) close(false)
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    window.addEventListener('resize', onResize)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('resize', onResize)
    }
  })

  /* A press on the open book turns the page on that side of the spine; a
     sideways swipe turns it the way the finger went. Links and buttons are
     left to do their own thing. */
  const pagePress = (event) => {
    if (!open || current === 0) return
    if (swipe.current?.used) return
    if (event.target.closest('a, button')) return
    const box = book.current.getBoundingClientRect()
    go(event.clientX >= box.left + box.width / 2 ? 1 : -1)
  }

  const pointerDown = (event) => {
    swipe.current = { x: event.clientX, y: event.clientY, used: false }
  }

  const pointerUp = (event) => {
    const start = swipe.current
    if (!start || !open || event.pointerType === 'mouse') return
    const dx = event.clientX - start.x
    const dy = event.clientY - start.y
    if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.2) return
    start.used = true
    go(dx < 0 ? 1 : -1)
  }

  const face = (leaf, side, content) => {
    const shownNow = faceShown(leaf, side)
    return (
      <div
        className={cx('book__face', `book__face--${side}`, leaf === 0 && side === 'back' && 'book__face--board', shownNow && 'is-shown')}
        inert={!shownNow}
      >
        {content}
        <span className="book__shade" aria-hidden="true" />
      </div>
    )
  }

  return (
    <li
      className={cx('member', pending && 'member--pending', inView && 'is-in', open && 'is-open')}
      style={{ '--d': `${index * 90}ms` }}
      ref={ref}
      onPointerMove={pending || still || mode ? undefined : follow}
      onPointerLeave={pending || still ? undefined : release}
    >
      {pending ? (
        <span className="member__pending">{members.pendingLabel}</span>
      ) : (
        <>
          <div className="member__lift" ref={lift}>
            <div
              className="book"
              ref={book}
              id={bookId}
              role="group"
              aria-label={`${detail.book} ${name}`}
              tabIndex={-1}
              onClick={pagePress}
              onPointerDown={pointerDown}
              onPointerUp={pointerUp}
            >
              {/* The back board, with the last page on it. Never turns. */}
              {mode ? (
                <div className="book__base">
                  <div className={cx('book__face', 'book__face--board', current === last && 'is-shown')} inert={current !== last}>
                    {pages.end}
                  </div>
                </div>
              ) : null}

              {leaves.map((leaf, number) => (
                <div className={cx('book__leaf', leaf.front === 'cover' && 'book__leaf--cover')} key={leaf.front}>
                  {leaf.front === 'cover' ? (
                    /* The cover: the portrait itself, and the control that
                       opens the book. It carries its own name rather than
                       reading the caption, so it says what it does as well
                       as who it shows. */
                    <button
                      type="button"
                      className={cx('book__face', 'book__face--front', 'member__open', faceShown(0, 'front') && 'is-shown')}
                      ref={cover}
                      aria-label={`${detail.open} ${name}`}
                      aria-expanded={open}
                      aria-controls={bookId}
                      inert={!faceShown(0, 'front')}
                      onClick={openBook}
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
                        {/* What a press does, shown under the pointer. */}
                        <span className="member__read" aria-hidden="true">
                          <span className="member__read-word">{detail.read}</span>
                        </span>
                        <span className="book__shade" aria-hidden="true" />
                      </span>
                    </button>
                  ) : (
                    face(number, 'front', pages[leaf.front])
                  )}
                  {leaf.back && pages ? face(number, 'back', pages[leaf.back]) : null}
                </div>
              ))}
            </div>

            {mode ? (
              <div className="book__controls">
                <button
                  type="button"
                  className="book__step"
                  aria-label={detail.previous}
                  aria-controls={bookId}
                  disabled={current <= 1}
                  onClick={() => go(-1)}
                >
                  <Chevron className="book__step-mark" direction="left" />
                </button>
                <span className="book__dots" aria-hidden="true">
                  {leaves.map((leaf, number) => (
                    <span className={cx('book__dot', number + 1 === current && 'is-current')} key={leaf.front} />
                  ))}
                </span>
                <button
                  type="button"
                  className="book__step"
                  aria-label={detail.next}
                  aria-controls={bookId}
                  disabled={current === 0 || current >= last}
                  onClick={() => go(1)}
                >
                  <Chevron className="book__step-mark" direction="right" />
                </button>
                <button type="button" className="book__close" onClick={() => close(true)}>
                  {detail.close}
                  <span className="book__close-mark" aria-hidden="true" />
                </button>
              </div>
            ) : null}
          </div>

          <p className="member__name" aria-hidden="true">
            {person.name}
          </p>
          <p className="visually-hidden" aria-live="polite">
            {current > 0 ? `${detail.page} ${current} ${detail.of} ${last}` : ''}
          </p>
        </>
      )}
    </li>
  )
}

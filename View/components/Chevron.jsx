/* ===========================================================================
   A chevron pointing the way its thing comes in, or the way to go: down under
   the group on the landing, toward the rest of the page; left and right under an
   open book, to the page before and after.

   Purely for the eye - the button it sits on already says what it does - so
   it is hidden from assistive technology here rather than at every use.
   =========================================================================== */

const PATHS = {
  up: 'M5 15.5 12 8.5l7 7',
  down: 'M5 8.5 12 15.5l7-7',
  left: 'M15.5 5 8.5 12l7 7',
  right: 'M8.5 5l7 7-7 7',
}

export default function Chevron({ className, direction = 'up' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" focusable="false" aria-hidden="true">
      <path d={PATHS[direction]} stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

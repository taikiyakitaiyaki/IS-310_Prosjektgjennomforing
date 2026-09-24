/* ===========================================================================
   What the row of portraits and the profile they open up into have to agree
   about.

   A portrait is one picture in two places - in the row, and on the profile -
   and Flip carries it from one to the other by a name both copies wear.
   =========================================================================== */

export function portraitId(person) {
  return `portrait-${person.name}`
}

/* The profile's large picture, fetched before it is asked for: the moment a
   pointer rests on a portrait, or the profile arrives beside a neighbour. By
   the time the picture has grown to full size, its sharper copy is usually
   there to lay over it. Each address is asked for once. */
const warmed = new Set()

export function warmPortrait(person) {
  const src = person?.large
  if (!src || warmed.has(src)) return
  warmed.add(src)

  const image = new Image()
  image.decoding = 'async'
  image.src = src
  /* Decoded now, while nothing is moving, rather than on the first frame it
     is shown. */
  image.decode?.().catch(() => {})
}

/* ===========================================================================
   MODEL - all copy and data for the site lives here.
   Edit this file to change what the site says; no component needs touching.
   =========================================================================== */

/* `course` and `email` are not shown anywhere at the moment - the footer
   that carried them is gone. They are kept for whenever the page wants them
   back. */
export const site = {
  group: 'Gruppe 11',
  course: 'IS-310 Prosjektgjennomføring',
  email: 'gruppe11@is310.no',
  tagline: 'Vi går hele veien',
}

export const plan = {
  title: 'Vi sketcher en plan',
  image: {
    src: '/media/process-table.webp',
    alt: 'Studenter samarbeider over skisser og et rutekart på et arbeidsbord',
    width: 1100,
    height: 1374,
  },
}

/* The group shot runs as two frames of the same scene, crossfading. The fifth
   portrait is deliberately absent until the photo arrives - the box holds its
   place in the row rather than letting the other four spread out. */
export const members = {
  group: {
    label: 'Her er vi samlet hos Kartverket',
    photos: [
      { src: '/media/group-1.webp', width: 1800, height: 1350 },
      { src: '/media/group-2.webp', width: 1800, height: 1350 },
    ],
  },
  people: [
    { name: 'Isak', src: '/media/member-isak.webp' },
    { name: 'My', src: '/media/member-my.webp' },
    { name: 'Oskar', src: '/media/member-oskar.webp' },
    { name: 'Sabrine', src: '/media/member-sabrine.webp' },
    { name: null, src: null },
  ],
  portrait: { width: 700, height: 934 },
  pendingLabel: 'Kommer',
}

/* Point `src` at the film when it exists (and `poster` at a still from it) and
   the frame plays it. Until then the frame stands with the label. */
export const video = {
  src: null,
  poster: null,
  pendingLabel: 'Kommer',
}

/* The company section. There is no company yet: the section holds its place
   and says so, in the same word the fifth portrait uses. */
export const company = {
  pendingLabel: 'Kommer',
}

/* The heading carries the section on its own; this is the line beside it. */
export const ambition = {
  body: 'Vi sikter så høyt det går. Målet er toppen av fjellet, ikke et sted halvveis opp.',
}

/* Labels for the site's own controls. */
export const controls = {
  skip: 'Hopp til innhold',
  nav: 'Sidenavigasjon',
  heroNav: 'Gå til en del av siden',
  top: 'Til toppen',
  pause: 'Pause',
  play: 'Spill av',
  pauseLabel: 'Pause animasjoner',
  playLabel: 'Spill av animasjoner',
  imageError: 'Bildet kunne ikke lastes.',
}

export const sections = [
  { id: 'medlemmer', title: 'Medlemmer' },
  { id: 'video', title: 'Video' },
  { id: 'bedrift', title: 'Bedrift' },
  { id: 'ambisjonsniva', title: 'Ambisjonsnivå' },
]

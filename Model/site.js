/* ===========================================================================
   MODEL - all copy and data for the site lives here.
   Edit this file to change what the site says; no component needs touching.
   =========================================================================== */

/* Pictures live in public/ and are addressed relative to wherever the site is
   deployed, never from the domain root. GitHub Pages serves this project from
   /IS-310_Prosjektgjennomforing/, so a leading slash sends the browser looking
   for /media/... at the root of github.io and every photo 404s. Vite rewrites
   the paths it can see - imports, CSS url() - but a src like this one is just a
   string it hands to the browser, so it has to carry the base itself. */
const media = (file) => `${import.meta.env.BASE_URL}media/${file}`

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
    src: media('process-table.webp'),
    alt: 'Studenter samarbeider over skisser og et rutekart på et arbeidsbord',
    width: 1100,
    height: 1374,
  },
}

/* The group shot cycles through these frames, crossfading between them; add or
   remove one and the cycle follows. The row of portraits is complete; a row with
   a `null` name still holds its place rather than letting the others spread out,
   should one ever need to. */
export const members = {
  group: {
    label: 'Her er vi samlet hos Kartverket',
    photos: [
      { src: media('group-1.webp'), width: 1800, height: 1350 },
      { src: media('group-2.webp'), width: 1800, height: 1350 },
      { src: media('group-3.webp'), width: 1800, height: 1350 },
    ],
  },
  /* Every portrait opens a panel, and this is what the panel says. `name` is
     the caption under the picture; everything else belongs to the panel.

     Empty fields are left out of the panel rather than printed blank, so a
     half-finished entry still reads properly. That goes for the three links in
     particular: paste a profile address in and the button becomes a link,
     leave it empty and it shows as waiting. Nobody's profile address is
     guessed at from here - a wrong link would point at a stranger.

     `age` and `interests` are optional and unused so far; fill either in and
     the panel grows a row for it. */
  people: [
    {
      name: 'Isak',
      fullName: 'Isak Gulaker',
      study: 'IT og informasjonssystemer, 3 år, UiA',
      src: media('member-isak.webp'),
      age: null,
      interests: [],
      description:
        'Interessert i prosjektstyring, systemutvikling og å bygge gode digitale løsninger. Liker å kombinere positiv innstilling med struktur, samarbeid og teknisk utvikling i prosjekter.',
      links: {
        linkedin: 'https://www.linkedin.com/in/isak-gulaker-8b53423b0',
        github: 'https://github.com/IsakJG',
        portfolio: '',
      },
    },
    {
      name: 'My',
      fullName: 'My Trinh Hoang',
      study: 'IT og informasjonssystemer, 3 år, UiA',
      src: media('member-my.webp'),
      age: null,
      interests: [],
      description:
        'Interessert i frontendutvikling, webutvikling og kunstig intelligens. Liker å lage brukervennlige digitale løsninger og lære nye teknologier.',
      links: {
        linkedin: 'https://www.linkedin.com/in/my-t-hoang-2bb246385',
        github: 'https://github.com/taikiyakitaiyaki',
        portfolio: '',
      },
    },
    {
      name: 'Oskar',
      fullName: 'Oskar Moberg Kirkbride',
      study: 'IT og informasjonssystemer, 3 år, UiA',
      src: media('member-oskar.webp'),
      age: null,
      interests: [],
      description:
        'Liker å utforske nye teknologier og bygge brukervennlige systemer. Brenner for problemløsning og godt samarbeid. Erfaring med fullstackutvikling og har en generell interesse for teknologi og innovasjon.',
      links: {
        linkedin: 'https://www.linkedin.com/in/oskar-kirkbride',
        github: 'https://github.com/oskarmk24',
        portfolio: '',
      },
    },
    {
      name: 'Sabrine',
      fullName: 'Sabrine N B Hansen',
      study: 'IT og informasjonssystemer, 3 år, UiA',
      src: media('member-sabrine.webp'),
      age: null,
      interests: [],
      description:
        'Team building, sluttbrukeropplevelse, frontend, backend-arkitektur, databasedesign og AI-integrasjon.',
      links: {
        linkedin: 'https://www.linkedin.com/in/sabrine-hansen-791264406',
        github: 'https://github.com/snbhansen',
        portfolio: '',
      },
    },
    {
      name: 'Yones',
      fullName: 'Yones Feili',
      study: 'IT og informasjonssystemer, 3 år, UiA',
      src: media('member-yones.webp'),
      age: null,
      interests: [],
      description:
        'Kreativ teknolog med kompetanse i grensesnittet mellom UI/UX-design og frontend. Brenner for romfart, dyp tech og integrering av ny AI-teknologi for å skape fremtidsrettede løsninger som enda ikke finnes. Har også et helhetlig blikk innenfor backend og systemarkitektur.',
      links: {
        linkedin: 'https://www.linkedin.com/in/yones-m-44616536a',
        github: 'https://github.com/YonesF',
        portfolio: 'https://yonesf.github.io/Portfolio/',
      },
    },
  ],
  portrait: { width: 700, height: 934 },
  pendingLabel: 'Kommer',
  detail: {
    open: 'Se mer om',
    close: 'Lukk',
    age: 'Alder',
    years: 'år',
    interests: 'Interesser',
    about: 'Om',
    empty: 'Mer om dette kommer.',
    links: 'Lenker',
    /* The order these appear in the panel. */
    linkOrder: [
      { key: 'linkedin', label: 'LinkedIn' },
      { key: 'github', label: 'GitHub' },
      { key: 'portfolio', label: 'Portefølje' },
    ],
    linkPending: 'Kommer',
  },
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
  goalsTitle: 'Våre ambisjoner',
  goals: [
    'Få inngående erfaring med utvikling og implementering av moderne AI-løsninger i offentlig sektor.',
    'Styrke kompetansen innen teamarbeid, smidig prosjektmetodikk og faglig formidling.',
    'Skape et reelt, fungerende verktøy som gir merverdi for bedrifter vi samarbeider med.',
  ],
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
  playHint: 'Du trenger en bra Data for denne modusen',
  imageError: 'Bildet kunne ikke lastes.',
}

export const sections = [
  { id: 'medlemmer', title: 'Medlemmer' },
  { id: 'video', title: 'Video' },
  { id: 'bedrift', title: 'Bedrift' },
  { id: 'ambisjonsniva', title: 'Ambisjonsnivå' },
]

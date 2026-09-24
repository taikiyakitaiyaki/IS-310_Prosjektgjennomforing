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
  /* What the team calls itself - the name in the navigation. `group` is what
     the course calls it. */
  name: 'SYMITO',
  group: 'Gruppe 11',
  course: 'IS-310 Prosjektgjennomføring',
  email: 'gruppe11@is310.no',
  tagline: 'Vi går hele veien',
}

/* The photograph that opens the site, behind the four titles. It is shown
   full-bleed, so it is cropped to whatever frame the site is seen in; the
   position it is given in the CSS keeps the faces in the frame however narrow
   that gets.

   `word` stands behind the group, in front of the wall. That trick needs the
   group cut out of the photograph with nothing around them - `front` is that
   cutout, the same picture with a transparent background, laid over the word.
   Both files must be the same size or the two copies of the group drift
   apart. */
export const landing = {
  photo: {
    src: media('group-main.webp'),
    alt: 'Gruppe 11 samlet i en sofa',
    width: 2400,
    height: 1085,
  },
  front: {
    src: media('group-main-front.webp'),
    width: 2400,
    height: 1085,
  },
  word: 'SYMITO',
}

/* The group shot cycles through these frames, crossfading between them; add or
   remove one and the cycle follows. The caption under the picture is `label`
   unless the frame showing has one of its own. A frame is cropped to the
   window it is shown in; one that needs its crop taken from somewhere other
   than the middle says where in `position`, in the CSS's own words. The row
   of portraits is complete; a row with a `null` name still holds its place
   rather than letting the others spread out, should one ever need to. */
export const members = {
  group: {
    label: 'Her er vi samlet hos Kartverket',
    /* Teksten ved siden av gruppebildet. `subtitle` er overskriften over hele
       delen; `intro` er det første avsnittet, og resten følger etter i samme
       størrelse. Alle lyser seg fram ord for ord når siden rulles, slik
       beskrivelsene i portrettpanelene gjør. Tomme avsnitt hoppes over. */
    about: {
      title: 'SYMITO',
      subtitle: 'Hvem er vi?',
      intro:
        'Vi er et engasjert og ambisiøst studentteam med komplementær kompetanse innen systemutvikling, interaksjonsdesign, kunstig intelligens og prosjektstyring. Våre ulike styrker gjør at vi utfyller hverandre godt og sammen dekker hele spekteret fra idé og design til teknisk utvikling og gjennomføring.',
      paragraphs: [
        'Teamet består av mennesker med ulik bakgrunn, erfaring, alder, kunnskap og personlighet. Dette gir oss flere perspektiver, bedre diskusjoner og sterkere løsninger. Samtidig deler vi den samme arbeidsmoralen: Vi er lærevillige, løsningsorienterte og har et høyt ambisjonsnivå.',
        'Det som kjennetegner oss aller mest, er hvordan vi jobber sammen. Vi støtter hverandre, deler kunnskap og tar ansvar når det trengs. Vi ønsker ikke bare å levere gode resultater, men å være et team det er både effektivt og motiverende å samarbeide med. Vi er klare for å ta på oss utfordrende prosjekter, lære raskt og skape løsninger vi kan være stolte av.',
      ],
    },
    photos: [
      /* First, so it is the one the section opens on. Much wider than the
         window, and the five of us stand left of its middle with the banner
         to our right - so the crop is taken from the left, and nobody at the
         edge loses a shoulder. */
      {
        src: media('group-techpoint.webp'),
        width: 1800,
        height: 976,
        position: '22% 50%',
        label: 'Her er vi samlet på Techpoint',
      },
      { src: media('group-1.webp'), width: 1800, height: 1350 },
      { src: media('group-3.webp'), width: 1800, height: 1350 },
    ],
  },
  /* Every portrait opens up into a profile, and this is what the profile
     says. `name` is the caption under the picture; everything else belongs to
     the profile.

     `large` is the same picture at one and a half times the size, cut from the
     original in Assets/Images with exactly the crop of `src` - the profile
     shows `src` the moment it opens and lays `large` over it once it has
     arrived, so the two have to line up to the pixel. A person without one
     simply keeps `src`.

     Empty fields are left out of the profile rather than printed blank, so a
     half-finished entry still reads properly. That goes for the three links in
     particular: paste a profile address in and the button becomes a link,
     leave it empty and it shows as waiting. Nobody's profile address is
     guessed at from here - a wrong link would point at a stranger.

     `age` and `interests` are optional and unused so far; fill either in and
     the profile grows a row for it. */
  people: [
    {
      name: 'Isak',
      fullName: 'Isak Gulaker',
      study: 'IT og informasjonssystemer, 3 år, UiA',
      src: media('member-isak.webp'),
      large: media('member-isak-large.webp'),
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
      large: media('member-my-large.webp'),
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
      large: media('member-oskar-large.webp'),
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
      large: media('member-sabrine-large.webp'),
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
      large: media('member-yones-large.webp'),
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
  portraitLarge: { width: 1050, height: 1401 },
  pendingLabel: 'Kommer',
  detail: {
    open: 'Se mer om',
    close: 'Lukk',
    /* The way from one person to the next without closing the profile. */
    previous: 'Forrige',
    next: 'Neste',
    show: 'Vis',
    of: 'av',
    age: 'Alder',
    years: 'år',
    interests: 'Interesser',
    about: 'Om',
    empty: 'Mer om dette kommer.',
    links: 'Lenker',
    /* The order these appear in the profile. */
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
/* The ambitions as prose under the heading, opening on `lead`, every word
   blurred until it is scrolled up to; the globe turns beneath them. */
export const ambition = {
  lead: 'Våre ambisjoner:',
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
  themeToLight: 'Bytt til lys modus',
  themeToDark: 'Bytt til mørk modus',
}

/* `title` is what the navigation and the landing titles call a section.
   A section that should be headed by something else on the page itself
   carries that in `heading`; the first one is headed by the question the
   words beside the picture answer. */
export const sections = [
  { id: 'medlemmer', title: 'Medlemmer', heading: members.group.about.subtitle },
  { id: 'video', title: 'Video' },
  { id: 'bedrift', title: 'Bedrift' },
  { id: 'ambisjonsniva', title: 'Ambisjonsnivå' },
]

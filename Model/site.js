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
  /* The course's code on its own, for the passport line in each member's
     book. */
  courseCode: 'IS-310',
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
  /* Every portrait opens into a small book about the person, and this is what
     the book says. `name` is the caption under the picture; the book has
     `fullName`, `role` and `study` on its passport page, then a chapter
     each for `description` (Om meg), `skills`, `interests` and `hobbies`,
     and the three links.

     `skills`, `interests` and `hobbies` are each a few sentences of prose,
     read on their own page. A chapter with nothing in it yet says so, in the
     book's own words, rather than being left blank. A link with an address becomes a link; leave it
     empty and it shows as waiting. Nobody's profile address is guessed at
     from here - a wrong link would point at a stranger.

     What is written here is taken from each person's own site, which the
     portfolio link points to. `hobbies` is for each of them to fill in. */
  people: [
    {
      name: 'Isak',
      fullName: 'Isak Johansen Gulaker',
      role: 'IT-student og utvikler',
      study: 'IT og informasjonssystemer, 3 år, UiA',
      src: media('member-isak.webp'),
      age: null,
      interests:
        'Mest interessert i systemarkitektur, sikker utvikling og teknisk ledelse, og vil på sikt få mer teknisk ansvar og lederansvar.',
      hobbies: '',
      skills:
        'Lager iOS-apper i Swift og SwiftUI, med SwiftData og CloudKit til lagring og synkronisering. Bygger API-er med FastAPI og PostgreSQL, kjører dem i Docker og har jobbet med språkmodeller, RAG og embeddings. Kan også JavaScript, Python og SQL, og jobber med Git, pull requests, kodegjennomgang og GitHub Actions.',
      description:
        'Har publisert iOS-appen Teori1, som har 4,8 av 5 stjerner i App Store, og laget Restlager, et automatiseringsverktøy som er i drift hos apotek. Var med og vant Expo med beredskapskartet Atlas, og er nå i praksis hos Kartverket på et AI-prosjekt. Vil forstå i dybden hvordan systemene fungerer.',
      links: {
        linkedin: 'https://www.linkedin.com/in/isak-gulaker-8b53423b0',
        github: 'https://github.com/IsakJG',
        portfolio: 'https://isakjg.github.io/S-knadsNettside/',
      },
    },
    {
      name: 'My',
      fullName: 'My Trinh Hoang',
      role: 'IT-student med fokus på systemutvikling',
      study: 'IT og informasjonssystemer, 3 år, UiA',
      src: media('member-my.webp'),
      age: null,
      interests: 'Er opptatt av japansk kultur, matopplevelser og baking, og er glad i katter.',
      hobbies: '',
      skills:
        'Programmerer i C#, Python og SQL, og lager nettsider med HTML og CSS. Har laget kart med Leaflet og MapLibre, og jobber med Git, GitHub, Docker og Jupyter Notebook. Har også erfaring med kravspesifikasjon og systemanalyse.',
      description:
        'Interessert i hvordan organisasjoner bruker IT-systemer i praksis, og hvordan systemene kan gi bedre beslutningsstøtte. Var med og bygde beredskapskartet Atlas, som vant Expo i IS-218, med MapLibre, Turf.js og PostGIS. Lager nå en AI-drevet økonomirådgiver i praksis hos Kartverket.',
      links: {
        linkedin: 'https://www.linkedin.com/in/my-t-hoang-2bb246385',
        github: 'https://github.com/taikiyakitaiyaki',
        portfolio: 'https://taikiyakitaiyaki.github.io/',
      },
    },
    {
      name: 'Oskar',
      fullName: 'Oskar Moberg Kirkbride',
      role: 'Fullstack utvikler',
      study: 'IT og informasjonssystemer, 3 år, UiA',
      src: media('member-oskar.webp'),
      age: null,
      interests: '',
      hobbies: '',
      skills:
        'Utvikler fullstack med Python, React, TypeScript, C# og SQL, og har erfaring med AI, UI/UX, systemutvikling, GIS og systemadministrasjon.',
      description:
        'Jeg liker å utforske nye teknologier og bygge brukervennlige systemer. Brenner for problemløsning og godt samarbeid. Jeg har erfaring med fullstack-utvikling og har fagbrev i IKT - servicefag. Er generelt interessert i teknologi og innovasjon.',
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
      role: 'IT-student med bakgrunn fra design',
      age: null,
      interests: '',
      hobbies: '',
      skills:
        'Har jobbet med GIS i QGIS, kart i Leaflet, og med databaser i MySQL og Entity Framework Core. Kompetansen spenner fra frontend og sluttbrukeropplevelse til backend-arkitektur, databasedesign og AI-integrasjon. Jeg tar med meg presisjon, nøyaktighet og teknisk ansvar fra jobben som lab-assistent. Teknisk stack inkluderer Python, React, CSS, HTML, C#, GIS, SQL.',
      description:
        'Jeg har faglig bakgrunn innen interiør og utstillingsdesign, og jobbet som lab-assistent hos kjeveortopedisk klinikk. Var med og bygde beredskapskartet Atlas i IS-218, og jobbet med registrering av luftfartshindre for Kartverket i NRL-prosjektet. Prosjektet jeg jobber med nå er utvikling av en AI-drevet økonomiassistent for Kartverket.',
      links: {
        linkedin: 'https://www.linkedin.com/in/sabrine-hansen-791264406',
        github: 'https://github.com/snbhansen',
        portfolio: 'https://snbhansen.github.io/snbhansen-portfolio/',
      },
    },
    {
      name: 'Yones',
      fullName: 'Yones Feili',
      study: 'IT og informasjonssystemer, 3 år, UiA',
      src: media('member-yones.webp'),
      role: 'IT-student og kreativ utvikler',
      age: null,
      interests: 'Interessert i design, teknologi og gjennomarbeidede digitale løsninger.',
      hobbies: '',
      skills:
        'Designer og bygger grensesnitt i HTML, CSS og JavaScript, med vekt på UI/UX og responsivt design. Har laget kart med MapLibre og PostGIS, og databaser med SQL og MariaDB. Kan også C#.',
      description:
        'Kreativ teknolog som kombinerer UI/UX-design og frontend. Brenner for romfart, dyp tech og ny AI-teknologi. Designet databasen i NRL-prosjektet for Kartverket fra konsept til implementasjon, og kartopplevelsen i Atlas. Er med-gründer av LuksusEiendom, som bruker KI til å forbedre boligbilder, og nå i praksis hos Kartverket.',
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
    /* What a portrait says it does, before the person's name. */
    open: 'Åpne profilen til',
    /* Over a portrait, under the pointer. */
    read: 'Les',
    close: 'Lukk',
    /* "Medlem 2 av 5", over the name. */
    member: 'Medlem',
    of: 'av',
    /* The buttons at the foot that go on to the others. */
    otherMembers: 'De andre medlemmene',
    previous: 'Forrige medlem',
    next: 'Neste medlem',
    /* Under the badge: what it does. */
    hint: 'Dra i kortet, eller trykk for å snu det',
    hintStill: 'Trykk på kortet for å snu det',
    /* On the badge's foil strip. */
    badgeMember: 'Medlem',
    /* The chapters, in order. */
    about: 'Om meg',
    skills: 'Kompetanse',
    interests: 'Interesser',
    hobbies: 'Hobbyer',
    links: 'Finn meg',
    /* A chapter nobody has written yet. */
    pending: 'Kommer snart.',
    /* The order the links appear in. */
    linkOrder: [
      { key: 'linkedin', label: 'LinkedIn' },
      { key: 'github', label: 'GitHub' },
      { key: 'portfolio', label: 'Portefølje' },
    ],
    linkPending: 'Kommer',
  },
}

/* The film, encoded twice from the 1080p master (see README): AV1 first, the
   smaller file for the same picture, then H.264, which every device plays.
   The frame takes the first one the device decodes smoothly in hardware.
   `poster` stands in the frame until it is played, and `title` names the
   player for screen readers. With no sources the frame stands with the label
   instead. */
export const video = {
  sources: [
    { src: media('symito-av1.mp4'), codec: 'av01.0.08M.10', bitrate: 2_950_000 },
    { src: media('symito-h264.mp4'), codec: 'avc1.640029', bitrate: 4_500_000 },
  ],
  width: 1920,
  height: 1080,
  framerate: 30,
  title: 'Symito introvideo',
  poster: media('symito-poster.webp'),
  pendingLabel: 'Kommer',
}

/* The projects, one tall card each in the turning arc under Prosjekter, as
   the members describe them on their own sites and in their texts above. `by` is who in the group made it, by
   first name as on the portraits; a project all five made is credited to
   `wholeGroup` instead of five names.

   `media` is a short loop of the project, standing upright in 9:16 like a
   phone screen. It has to be an .mp4 to move - a GIF shows only its first
   frame on the cards (see README for turning one into the other). A loop's
   `poster` is its first frame as a picture: what its card shows until it
   comes to the front and plays, so only the loop in front is ever fetched.
   Until a project has media, its card is lit in `color` and says
   `pendingLabel`. The loops here are cut from the recordings and pictures
   on the members' own sites.

   `repo` is where the project's code can be read, when it is public:
   pressing the card in front opens it. The ones without are private or
   have none. */
export const projects = {
  items: [
    {
      name: 'Atlas',
      about: 'Beredskapskart som finner nærmeste ressurs og beregner ruten dit. Én av tre vinnere på Expo i IS-218.',
      by: ['Isak', 'My', 'Sabrine', 'Yones'],
      repo: 'https://github.com/snbhansen/IS218',
      color: '#d77d2c',
      media: media('prosjekt-atlas.mp4'),
      poster: media('prosjekt-atlas-poster.webp'),
    },
    {
      name: 'NRL',
      about: 'Databasesystem for registrering, validering og håndtering av luftfartshindre for Kartverket.',
      by: ['Yones', 'Isak'],
      repo: 'https://github.com/IsakJG/IT-2025-Kartverket',
      color: '#57b3ae',
      media: media('prosjekt-nrl.mp4'),
      poster: media('prosjekt-nrl-poster.webp'),
    },
    {
      name: 'Luftfartshindre',
      about: 'Kartløsning for registrering, kvalitetssikring og behandling av luftfartshindre, laget med Kartverket og Norsk Luftambulanse.',
      by: ['My', 'Sabrine'],
      repo: 'https://github.com/aanonho/NRL-prosjekt-Gr14-2025H',
      color: '#c8473f',
      media: media('prosjekt-luftfartshindre.mp4'),
      poster: media('prosjekt-luftfartshindre-poster.webp'),
    },
    {
      name: 'AI-økonomiassistent',
      about: 'AI-basert økonomiveileder for Kartverket, et pågående praksisprosjekt.',
      by: ['Isak', 'My', 'Oskar', 'Sabrine', 'Yones'],
      repo: 'https://github.com/snbhansen/KartverketPraksis26',
      color: '#8c93a1',
      media: media('prosjekt-ai.mp4'),
      poster: media('prosjekt-ai-poster.webp'),
    },
    {
      name: 'Teori1',
      about: 'Gratis iOS-app for teoriprøven, med 4,8 av 5 fra 16 vurderinger i App Store.',
      by: ['Isak'],
      repo: 'https://github.com/IsakJG/Teori1',
      color: '#2c2f38',
      media: media('prosjekt-teori1.webp'),
    },
    {
      name: 'Restlager',
      about: 'Verktøy i drift hos apotek som automatiserer bestillingssjekk av restnoterte legemidler.',
      by: ['Isak'],
      color: '#df5b7c',
      media: media('prosjekt-restlager.webp'),
    },
    {
      name: 'LuksusEiendom',
      about: 'Eiendomskonsept som bruker KI til å forbedre boligbilder, med før og etter som selve opplevelsen.',
      by: ['Yones'],
      repo: 'https://github.com/YonesF/BSN',
      color: '#e4a0b4',
      media: media('prosjekt-luksuseiendom.mp4'),
      poster: media('prosjekt-luksuseiendom-poster.webp'),
    },
    {
      name: 'Globuskart',
      about: 'Interaktiv kartplattform i 3D for sanntidsdata, havnivåstigning og geografiske analyser i Norge.',
      by: ['Yones'],
      color: '#5b8fd6',
      media: media('prosjekt-globuskart.mp4'),
      poster: media('prosjekt-globuskart-poster.webp'),
    },
    {
      name: 'Study Buddies',
      about: 'Python-prototype for å registrere kurs, finne studiepartnere og booke grupperom.',
      by: ['My'],
      repo: 'https://github.com/taikiyakitaiyaki/IS-211_Study_Buddies_2026V',
      color: '#2f5fb3',
      media: media('prosjekt-studybuddies.mp4'),
      poster: media('prosjekt-studybuddies-poster.webp'),
    },
    {
      name: 'NattLogg',
      about: 'Personlig app for bedre søvn, der brukeren logger og følger søvnmønsteret sitt over tid.',
      by: ['Sabrine'],
      color: '#3f4a8a',
      media: null,
    },
    {
      name: 'Portfolio',
      about: 'Personlig portefølje med animerte WebGL-scener, myk rulling og egne sider for erfaring og prosjekter.',
      by: ['Yones'],
      repo: 'https://github.com/YonesF/Portfolio',
      color: '#c9b79c',
      media: media('prosjekt-portfolio.mp4'),
      poster: media('prosjekt-portfolio-poster.webp'),
    },
    {
      name: 'Treningen',
      about: 'Gratis treningsapp for å loggføre økter, lære øvelser med video og beskrivelse, og regne ut BMI, vekt og anbefalte økter.',
      by: ['Yones'],
      color: '#8b5fbf',
      media: null,
    },
    {
      name: 'Plant det!',
      about: 'Hyperlokal hageprofil for adressen din, med råd ut fra sanntidsvær fra Yr, herdighetssone (H1–H8), jordtype og sol.',
      by: ['Yones'],
      color: '#5e9a4e',
      media: null,
    },
    {
      name: 'GIS-OSINT',
      about: 'GIS-OSINT-dashboard som henter data fra Allemannsdata Politiloggen MCP og visualiserer dataen på et interaktivt kart.',
      by: ['Oskar'],
      color: '#2b3a55',
      media: media('prosjekt-gis-osint.webp'),
    },
  ],
  label: 'Prosjekter',
  byLabel: 'Laget av',
  wholeGroup: 'hele gruppen',
  previous: 'Forrige prosjekt',
  next: 'Neste prosjekt',
  /* Under the description, and small on the card itself. */
  repo: 'Se koden på GitHub',
  repoShort: 'GitHub ↗',
  pause: 'Sett karusellen på pause',
  play: 'Start karusellen igjen',
  pendingLabel: 'Kommer',
}

/* The heading carries the section on its own; this is the line beside it. */
/* The ambitions as prose under the heading, `left` and `right` of the globe,
   every word blurred until it is scrolled up to. */
export const ambition = {
  left: 'Ambisjonsnivået vårt er å levere en komplett og stabil løsning som dekker de viktigste behovene hos samarbeidspartneren, og som kan demonstreres med realistiske bruksscenarioer.',
  right:
    'Vi sikter mot en løsning som går utover en enkel prototype: Den skal være brukervennlig, teknisk robust og gi dokumenterbar nytteverdi. Dersom tiden tillater det, ønsker vi også å gjøre løsningen klar for videre testing og bruk etter prosjektperioden.',
}

/* The line at the very foot of the page, centred under the globe. Each item
   reads `label: value`, and `href` is what pressing it opens - a call, a new
   mail, or a profile, which opens in a new tab. */
export const contact = {
  label: 'Kontakt',
  items: [
    { label: 'TLF', value: '99492005', href: 'tel:+4799492005' },
    { label: 'Mail', value: 'yonesmf@uia.no', href: 'mailto:yonesmf@uia.no' },
    {
      label: 'LinkedIn',
      value: 'www.linkedin.com/in/yones-m-44616536a',
      href: 'https://www.linkedin.com/in/yones-m-44616536a',
    },
  ],
}

/* Labels for the site's own controls. */
export const controls = {
  skip: 'Hopp til innhold',
  nav: 'Sidenavigasjon',
  heroNav: 'Gå til en del av siden',
  top: 'Til toppen',
}

/* `title` is what the navigation and the landing titles call a section.
   A section that should be headed by something else on the page itself
   carries that in `heading`; Medlemmer is headed by the question the words
   beside the picture answer. `subtitle` is a line set under the heading. */
export const sections = [
  { id: 'video', title: 'Video' },
  { id: 'medlemmer', title: 'Medlemmer', heading: members.group.about.subtitle },
  {
    id: 'prosjekter',
    title: 'Prosjekter',
    subtitle: 'Erfarne gruppemedlemmer med mange prosjekter under beltet',
  },
  { id: 'ambisjonsniva', title: 'Ambisjonsnivå' },
]

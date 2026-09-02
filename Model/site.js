/* ===========================================================================
   MODEL — all copy and data for the site lives here.
   Edit this file to change the site's content; no component needs touching.

   The site is built around one idea: the landing scene shows a summit, so the
   whole page is structured as the route up to it. Every section sits at an
   altitude, and the altimeter in the corner climbs as you scroll.
   Summit height is Galdhøpiggen's real 2469 m — Norway's highest point.
   =========================================================================== */

export const SUMMIT_M = 2469

export const site = {
  course: 'IS-310 Prosjektgjennomføring',
  group: 'Gruppe 11',
  year: 2026,
  email: 'gruppe11@is310.no',
  /* Line lifted from the landing scene so the page and the scene speak once. */
  creed: 'Vi bruker heller ekstra timer enn å levere dårlig resultat.',
}

export const nav = [
  { id: 'manifest', label: 'Manifest' },
  { id: 'ruten', label: 'Ruten' },
  { id: 'laget', label: 'Laget' },
  { id: 'film', label: 'Film' },
  { id: 'kontakt', label: 'Kontakt' },
]

export const manifest = {
  index: '01',
  altitude: 0,
  camp: 'Basecamp',
  /* Each string is one masked line in the headline reveal. */
  headline: ['Fem studenter,', 'én rute,', 'ett mål.'],
  lead: 'Vi er en prosjektgruppe på fem studenter som bruker semesteret på å utvikle noe spennende, relevant og praktisk. Målet er å jobbe godt sammen, lære av hverandre, og lage en løsning som viser kreativitet, samarbeid og teknisk innsikt.',
  /* The group's own aside to their supervisor — kept, because it is theirs. */
  aside: 'Ja Yones, vi kan endre siden til hva enn du måtte ønske 😉',
  principles: [
    {
      n: '01',
      title: 'Inkluderende',
      body: 'Et trygt arbeidsmiljø der alle får ansvar fra dag én og plass til egne idéer.',
    },
    {
      n: '02',
      title: 'Kreativt',
      body: 'Vi bygger noe som er nyttig for brukeren og interessant å utvikle underveis.',
    },
    {
      n: '03',
      title: 'Ambisiøst',
      body: 'Vi tar utfordringene, lærer av prosessen og leverer noe vi står inne for.',
    },
  ],
}

export const route = {
  index: '02',
  camp: 'Ruten',
  headline: 'Fire leirer\nopp til toppen.',
  lead: 'Vi ser for oss et prosjekt som er både nyttig for brukeren og realistisk å gjennomføre innenfor rammen av emnet. Slik kommer vi dit.',
  camps: [
    {
      n: '01',
      altitude: 620,
      title: 'Idé',
      body: 'Vi starter med spørsmålet, ikke løsningen. Hva mangler folk faktisk, og hva er verdt å bruke et semester på?',
      markers: ['Problemsøk', 'Brukerbilde', 'Avgrensning'],
    },
    {
      n: '02',
      altitude: 1180,
      title: 'Plan',
      body: 'Rammer, roller og realisme. Vi deler prosjektet i biter som er små nok til å bli ferdige, og store nok til å bety noe.',
      markers: ['Roller', 'Milepæler', 'Risiko'],
    },
    {
      n: '03',
      altitude: 1840,
      title: 'Bygg',
      body: 'Kort vei fra skisse til noe som kjører. Vi kombinerer praktisk utvikling med god design og brukerforståelse.',
      markers: ['Prototype', 'Design', 'Testing'],
    },
    {
      n: '04',
      altitude: SUMMIT_M,
      title: 'Leveranse',
      body: 'Ferdig betyr forklart, testet og levert. Vi presenterer arbeidet på en måte som gjør det lett å forstå hva vi har gjort og hvorfor.',
      markers: ['Dokumentasjon', 'Presentasjon', 'Overlevering'],
    },
  ],
}

/* ---------------------------------------------------------------------------
   MEMBERS
   Replace name / role / bio when the group is ready. `seed` decides the shape
   of the member's generated 3D peak, so changing it gives a different mountain.
   --------------------------------------------------------------------------- */
export const team = {
  index: '03',
  camp: 'Laget',
  headline: 'Fem topper\npå samme fjell.',
  lead: 'Hver av oss har fått sin egen topp, generert fra navnet. Ingen to er like — og ingen av dem når toppen alene.',
  members: [
    { id: 'm1', name: 'Student 1', role: 'Faglig fokus', seed: 118, bio: 'Kort biografi om deg, interesser og hva du vil bidra med i prosjektet.' },
    { id: 'm2', name: 'Student 2', role: 'Faglig fokus', seed: 407, bio: 'Kort biografi om deg, interesser og hva du vil bidra med i prosjektet.' },
    { id: 'm3', name: 'Student 3', role: 'Faglig fokus', seed: 733, bio: 'Kort biografi om deg, interesser og hva du vil bidra med i prosjektet.' },
    { id: 'm4', name: 'Student 4', role: 'Faglig fokus', seed: 951, bio: 'Kort biografi om deg, interesser og hva du vil bidra med i prosjektet.' },
    { id: 'm5', name: 'Student 5', role: 'Faglig fokus', seed: 264, bio: 'Kort biografi om deg, interesser og hva du vil bidra med i prosjektet.' },
  ],
}

export const film = {
  index: '04',
  camp: 'Film',
  headline: 'Videopresentasjon',
  lead: 'En kort film om gruppa og prosjektet. Kommer når opptaket er gjort.',
  status: 'Opptak planlagt',
}

export const contact = {
  index: '05',
  camp: 'Toppen',
  headline: ['Vil du vite', 'mer om oss?'],
  lead: 'Send en e-post. Vi svarer fortere enn vi går ned igjen.',
}

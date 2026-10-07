# IS-310 · Gruppe 11

Gruppeporteføljen for IS-310 Prosjektgjennomføring. En side, bygget som én
sammenhengende stigning: gruppen samlet i landingsbildet, kartet av fjellet bak
videoen, og et interaktivt partikkelportrett under Ambisjonsnivå.

## Kjør

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # produksjonsbygg i dist/
npm run preview   # serverer dist/
```

## Rediger innholdet

Alt siden sier ligger i [`Model/site.js`](Model/site.js). Ingen komponent
trenger å røres for å endre tekst, navn, bilder eller rekkefølge.

| Vil du ...                        | Rediger                                   |
| --------------------------------- | ----------------------------------------- |
| Bytte landingsbildet              | `landing.photo`                           |
| Endre seksjoner eller rekkefølge  | `sections`                                |
| Legge inn det femte portrettet    | `members.people` (bytt ut `null`-raden)   |
| Bytte filmen                      | `video.sources` og `video.poster` (se under) |
| Legge til prosjekter og GIF-er    | `projects.items` (se under)               |
| Endre teksten i Ambisjonsnivå     | `ambition.left`, `ambition.right`         |

Bilder legges i `public/media/` som webp. Originalene ligger i `Assets/Images/`.

### Filmen

Originalen (`Symito (Final Draft).mp4`, 1080p, ca. 300 MB) er for stor for
GitHub og sjekkes ikke inn. Siden bruker to kodinger av den i `public/media/`:
AV1 til enheter som dekoder den i maskinvare, og H.264 til alle andre. Begge er
1080p som originalen, med lyden uendret. Ingenting av filmen lastes ned før
noen trykker på play. Ny versjon av filmen kodes slik (med ffmpeg), og
plakaten er omslagsbildet som ligger i filen:

```bash
SRC="Symito (Final Draft).mp4"
FELLES="-map 0:v:0 -map 0:a:0 -c:a copy -map_metadata -1 -map_chapters -1 -movflags +faststart -g 60"

# AV1, ca. 3 Mbit/s
ffmpeg -i "$SRC" $FELLES -c:v libsvtav1 -preset 4 -crf 30 -pix_fmt yuv420p10le public/media/symito-av1.mp4

# H.264, 4,5 Mbit/s i to pass
X264="-c:v libx264 -preset slower -b:v 4500k -maxrate 9M -bufsize 18M -profile:v high -level:v 4.1 -pix_fmt yuv420p"
ffmpeg -i "$SRC" -map 0:v:0 -an $X264 -g 60 -pass 1 -f null -
ffmpeg -i "$SRC" $FELLES $X264 -pass 2 public/media/symito-h264.mp4

# Plakaten
ffmpeg -i "$SRC" -map 0:v:1 -frames:v 1 -c:v libwebp -quality 80 public/media/symito-poster.webp
```

Endres lengden eller bitraten mye, oppdateres `bitrate` i `video.sources`.

### Prosjektene

Hvert prosjekt i `projects.items` har navn, en kort linje, hvem som laget det
(`by`), en farge kortet har til loopen er på plass (`color`) og en kort loop
(`media`). Prosjektene står som høye kort i en bue i 3D (WebGL), og buen
dreier seg ett prosjekt om gangen.

Har prosjektet offentlig kode, står lenken i `repo`. Da står det GITHUB ↗ på
kortet, et trykk på kortet foran åpner koden i en ny fane, og under
beskrivelsen står en lenke dit. Prosjekter uten `repo` er private eller har
ingen kode å vise.

Prosjektene og teksten om dem er hentet fra medlemmenes egne sider. Loopene
i `public/media/prosjekt-*` er klippet fra opptakene og bildene der: der bildet
fyller kortet er det beskåret til 9:16, og skjermbilder med tekst står hele
over en uskarp kopi av seg selv.

Kortene er stående 9:16, som en mobilskjerm, så loopene bør lages i det
formatet (for eksempel 720×1280, 4–8 sekunder). De må være MP4 for å bevege
seg: en GIF viser bare første bilde på kortene. Gjør om en GIF slik, og pek
`media` på filen med `media('prosjekt-atlas.mp4')`:

```bash
ffmpeg -i atlas.gif -an -c:v libx264 -crf 23 -pix_fmt yuv420p -movflags +faststart \
  -vf "scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280" \
  public/media/prosjekt-atlas.mp4
```

Hver loop har også en `poster`: det første bildet som WebP. Kortene som ikke
står foran viser plakaten, og bare loopen på kortet foran lastes ned og
spilles, og bare mens buen er på skjermen. Står buen stille og ingen loop
spilles, tegnes ingenting. Plakaten lages slik:

```bash
ffmpeg -i public/media/prosjekt-atlas.mp4 -frames:v 1 -c:v libwebp -quality 80 \n  public/media/prosjekt-atlas-poster.webp
```

## Struktur

```
Model/site.js            innhold
View/components/         én komponent per del av siden
View/lib/motion.jsx      redusert bevegelse, lav effekt
View/lib/scroll.jsx      myk rulling (Lenis), ankerlenker, #hash ved lasting
View/lib/reveal.jsx      inntredener når ting rulles inn i bildet
View/lib/heightField.js  fjellet, som tall (ingen avhengigheter)
View/lib/contours.js     fjellet som kart (SVG-konturer)
View/lib/terrain.js      fjellet for three.js
View/css/base.css        tokens, reset, inntredener
View/css/site.css        navigasjon, landing, seksjonsskall
View/css/sections.css    medlemmer, video, prosjekter, ambisjonsnivå
```

## Bevegelse og tilgjengelighet

- `prefers-reduced-motion` skrur av alt som beveger seg av seg selv, og
  viser alt innhold uten inntredener.
- Myk rulling brukes bare med mus, og aldri når siden er bygget inn i en annen
  side: der skal hjulet nå vertssiden når denne er rullet ferdig.
- Partikkelportrettet lastes først når det er en skjerm unna, og animeres bare
  mens det er synlig. Ansiktet vender seg mykt etter musepekeren.
  Redusert bevegelse viser et stillestående ansikt; uten WebGL vises et statisk bilde.
- Prosjektkarusellen er tolv flater i én WebGL-scene: hvert kort og speilbildet
  i gulvet under det. Den dreier seg selv hvert femte sekund mens den er på
  skjermen, og står stille mens musepekeren hviler på den, når noen drar i
  den, når den er satt på pause, og ved redusert bevegelse (da hopper den
  rett til neste kort). Den kan dras med mus og finger, dreies med et
  sidelengs sveip på styreflaten, og et trykk på et kort henter det fram. Et
  sveip opp og ned ruller siden som vanlig. Uten WebGL vises prosjektene i en
  vanlig rad som rulles sidelengs.
- Bakgrunnen i Ambisjonsnivå har en bølgende partikkelstrøm i Three.js.
  Partiklene beregnes på GPU-en i to vekslende FBO-er. Små skjermer og svakere
  enheter får færre partikler og lavere bildefrekvens. Strømmen stopper utenfor
  skjermen og i skjulte faner, og står stille ved redusert bevegelse.
  Mus og berøring bøyer strømmen forsiktig lokalt på GPU-en, uten å blokkere
  rulling eller legge til ekstra tegnepass.
- Et trykk på et portrett åpner profilen til personen over siden. På den ene
  siden henger medlemskortet deres i en snor i 3D (Three.js): bilde, navn og
  rolle foran, gruppen bak. Kortet faller ned og svinger seg på plass, kan dras
  og kastes med mus eller finger, og et trykk snur det. Snoren og kortet er en
  liten fysikkmodell (Verlet) uten fysikkmotor, og ingenting tegnes når kortet
  henger stille. På den andre siden står alt om personen som vanlig tekst: Om
  meg, Kompetanse, Interesser, Hobbyer og Finn meg. Pilene nederst eller
  piltastene går videre til de andre medlemmene; Escape, Lukk eller et trykk
  utenfor lukker den, og fokus går tilbake til portrettet. På telefon ligger
  kortet over teksten. Redusert bevegelse viser kortet stille; uten WebGL
  vises et vanlig kort med bildet. Innholdet står i `members.people` i
  `Model/site.js`; `hobbies` fylles inn av hver enkelt.
- Ansiktsmodellens kilde og lisens ligger i `public/media/face/README.md`.

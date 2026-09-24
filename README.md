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
| Legge inn filmen                  | `video.src` og `video.poster`             |
| Fylle inn bedriften når den er klar | `company` (og en egen komponent)         |
| Endre teksten i Ambisjonsnivå     | `ambition.lead`, `ambition.goals`         |

Bilder legges i `public/media/` som webp. Originalene ligger i `Assets/Images/`.

## Struktur

```
Model/site.js            innhold
View/components/         én komponent per del av siden
View/lib/motion.jsx      redusert bevegelse, lav effekt
View/lib/portrait.js     portrettene i raden og profilen de åpner seg til
View/lib/scroll.jsx      myk rulling (Lenis), ankerlenker, #hash ved lasting
View/lib/reveal.jsx      inntredener når ting rulles inn i bildet
View/lib/heightField.js  fjellet, som tall (ingen avhengigheter)
View/lib/contours.js     fjellet som kart (SVG-konturer)
View/lib/terrain.js      fjellet for three.js
View/css/base.css        tokens, reset, inntredener
View/css/site.css        navigasjon, landing, seksjonsskall
View/css/sections.css    medlemmer, video, bedrift, ambisjonsnivå
```

## Bevegelse og tilgjengelighet

- `prefers-reduced-motion` skrur av alt som beveger seg av seg selv, og
  viser alt innhold uten inntredener.
- Myk rulling brukes bare med mus, og aldri når siden er bygget inn i en annen
  side: der skal hjulet nå vertssiden når denne er rullet ferdig.
- Partikkelportrettet lastes først når det er en skjerm unna, og animeres bare
  mens det er synlig. Ansiktet vender seg mykt etter musepekeren.
  Redusert bevegelse viser et stillestående ansikt; uten WebGL vises et statisk bilde.
- Bakgrunnen i Ambisjonsnivå har en bølgende partikkelstrøm i Three.js.
  Partiklene beregnes på GPU-en i to vekslende FBO-er. Små skjermer og svakere
  enheter får færre partikler og lavere bildefrekvens. Strømmen stopper utenfor
  skjermen og i skjulte faner, og står stille ved redusert bevegelse.
  Mus og berøring bøyer strømmen forsiktig lokalt på GPU-en, uten å blokkere
  rulling eller legge til ekstra tegnepass.
- Et portrett i raden åpner seg til en profil: bildet vokser ut av plassen
  sin i raden til et stort portrett, de fire andre trer til side i en liten
  rad, og navn, studie og «Om» kommer i fokus ord for ord. Lukk spiller det
  baklengs, og bildet lander på plassen det kom fra. Mellom personene går man
  med pilene, piltastene, et trykk på et ansikt eller et sveip på telefon.
  Bildene flyttes med GSAP Flip, bare med transform og opacity; ordene er det
  eneste som gjøres uskarpe, og ikke på svakere enheter. Redusert bevegelse
  åpner, bytter og lukker uten animasjon.
- `member-*-large.webp` er det samme utsnittet som portrettet i raden, i
  halvannen gang størrelsen, skåret fra originalen i `Assets/Images/`.
  Profilen viser det lille bildet med én gang og legger det store over når
  det er lastet, så de to må ha nøyaktig samme utsnitt.
- Ansiktsmodellens kilde og lisens ligger i `public/media/face/README.md`.

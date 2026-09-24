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
- Hvert portrett er omslaget på en liten bok om personen. Et trykk løfter
  boken ut av raden og slår opp omslaget: inni ligger en passside (bilde,
  navn og maskinlesbar linje), og så kapitlene Om meg, Kompetanse,
  Interesser og hobbyer og Finn meg. Man blar med pilene under boken, et
  trykk på venstre eller høyre side, piltastene eller et sveip på telefon.
  Escape, et trykk utenfor boken eller å bla bakover forbi første side
  lukker den. På bred skjerm ligger boken oppslått med to sider; på telefon
  vises én side om gangen.
  Boken legges ut i full størrelse med én gang og krympes ned til portrettet,
  så teksten er skarp hele veien. Løftet, hver side som blas og lyset over
  den er bare transform og opacity. Redusert bevegelse blar uten animasjon.
  Innholdet står i `members.people` i `Model/site.js`; `hobbies` fylles inn
  av hver enkelt.
- Ansiktsmodellens kilde og lisens ligger i `public/media/face/README.md`.

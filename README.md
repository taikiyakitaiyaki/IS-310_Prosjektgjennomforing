# IS-310 · Gruppe 11

Gruppeporteføljen for IS-310 Prosjektgjennomføring. En side, bygget som én
sammenhengende stigning: fjellet i landingsscenen, kartet av det i planen, og
det samme fjellet reist i relieff under Ambisjonsnivå.

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
| Endre seksjoner eller rekkefølge  | `sections`                                |
| Legge inn det femte portrettet    | `members.people` (bytt ut `null`-raden)   |
| Legge inn filmen                  | `video.src` og `video.poster`             |
| Fylle inn bedriften når den er klar | `company` (og en egen komponent)         |
| Endre teksten i Ambisjonsnivå     | `ambition.body`                           |

Bilder legges i `public/media/` som webp. Originalene ligger i `Assets/Images/`.

## Struktur

```
Model/site.js            innhold
View/components/         én komponent per del av siden
View/lib/motion.jsx      redusert bevegelse, lav effekt, pause
View/lib/scroll.jsx      myk rulling (Lenis), ankerlenker, #hash ved lasting
View/lib/reveal.jsx      inntredener når ting rulles inn i bildet
View/lib/heightField.js  fjellet, som tall (ingen avhengigheter)
View/lib/contours.js     fjellet som kart (SVG-konturer)
View/lib/terrain.js      fjellet for three.js
View/css/base.css        tokens, reset, inntredener
View/css/site.css        navigasjon, landing, seksjonsskall
View/css/sections.css    plan, medlemmer, video, bedrift, ambisjonsnivå
```

## Bevegelse og tilgjengelighet

- `prefers-reduced-motion` skrur av alt som beveger seg av seg selv, og
  viser alt innhold uten inntredener.
- Pauseknappen nederst til venstre stopper landingsscenen, kryssfadingen,
  terrenget og den myke rullingen for alle andre.
- Myk rulling brukes bare med mus, og aldri når siden er bygget inn i en annen
  side: der skal hjulet nå vertssiden når denne er rullet ferdig.
- WebGL-scenene lastes først når de er en skjerm unna, og tegner bare mens de
  er synlige. Uten WebGL står seksjonene like godt uten dem.

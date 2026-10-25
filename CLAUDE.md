# Kidsplay – Familie Spelplatform (Mac)

## Doel

Lokaal spelplatform op de MacBook: elk kind kiest een eigen profiel, speelt spellen en ziet de eigen voortgang. Eerste spel is een fotopuzzel (4–48 stukjes). Nieuwe spellen haken in op dezelfde profielen en voortgangsopslag via een vaste spel-interface.

Volledige requirements: [docs/PRD.md](docs/PRD.md).

## Technische keuzes

- Webapp in TypeScript (Vite, vanilla, geen framework); nu als lokale webpagina, verpakt als Mac-app met Tauri 2 in `src-tauri/` (`docs/TAURI.md`).
- Puzzel: gewone DOM-elementen met canvas-bitmaps per stuk, klassieke vorm (bezier-randen, `shapes.ts`), slepen met pointer-events op `window`.
- Opslag: IndexedDB achter interfaces (`ProfileStore`, `ProgressStore`, `RecordStore`); later bestanden in `~/Library/Application Support/Familiespellen/`.
- Volledig offline, geen accounts, geen tracking.
- Ook als webapp/PWA (iPad): `vite.config.ts` schrijft `dist/sw.js` (uit `src/sw.template.js`) met alle bestanden; `public/manifest.webmanifest` + iconen. GitHub Actions (`.github/workflows/pages.yml`) bouwt en publiceert naar Pages. Zie `docs/PWA.md`.
- Foto's delen tussen apparaten: branch `fotos` op GitHub, lezen via raw.githubusercontent.com, schrijven alleen met token in `beheer.html`.
- Back-up: ouder → 💾 Back-up downloadt/herstelt alles als één JSON (`src/platform/backup.ts`, Blobs als base64).
- Uitleg in het schaakspel: één zinnetje op AVI M3-niveau (korte woorden), zodat de oudste het zelf kan lezen.
- Doelgroep 4–10 jaar: grote klikvlakken (min. 64×64 px), iconen i.p.v. tekst, geen foutmeldingen.

## Structuur

- `src/main.ts`: opstarten (opslag, spellen aanmelden, `init` per spel).
- `src/app.ts`: schermen (profielen → spellen → spel) en navigatie; gear → oudercheck → ouderdeel.
- `src/platform/`: `backup.ts` (back-up maken/terugzetten), `GameContext.session` (geheugen voor één sessie, wordt leeg op het profielenscherm), `update.ts` (🔄 nieuwe versie ophalen in de PWA), types (`GameModule`, `GameContext`, stores), registry, `rewards.ts` (spaarstand per profiel incl. dagmaximum aan stickers via `earnPoints`, opgeslagen onder voortgangssleutel `platform:rewards`), `storage/indexeddb.ts`.
- `src/parent/`: oudercheck (tafelsom), menu, profielbeheer (incl. drempel en volgorde van stickers), voortgangsoverzicht.
- `src/stickers/`: beloning. `model.ts` (Sticker/AlbumEntry, opslag onder spel-id `stickers`), `logic.ts` (volgende sticker, plekken, puur en getest), `flippo.ts` (ronde PNG, rand, glitter, gouden sticker), `manage.ts` (ouder: lijst, slepen om te ordenen, editor), `gifts.ts` (één cadeautje openscheuren), `book.ts` (stickerboek), `status.ts` (spaarstand + cadeautjes).
- `src/ui/`: `dom.ts`, `sound.ts` (fanfare, scheuren, glinster; vastklikken van een stukje is bewust stil), `confetti.ts`, `savings.ts` (spaarpot), `urls.ts`.
- `src/beheer/` + `beheer.html`: aparte beheerconsole (token, foto's delen met code, bibliotheek beheren). Zie `docs/BIBLIOTHEEK.md`.
- `src/games/puzzle/`: het fotopuzzelspel
  - `grid.ts` (raster), `shapes.ts` (puzzelvormen), `image.ts` (foto → stukken), `snap.ts` (vastklikken, puur en getest), `view.ts` (lade/canvas/slepen), `progress.ts` (resultaten + tussenstand), `viewport.ts` (zoom en verschuiving van het speelvlak, puur en getest), `saver.ts` (vertraagd bewaren van de tussenstand), `meting.ts` (laadtijd, geheugen en stop-melding van grote puzzels), `model.ts` (puzzel/instellingen), `manage.ts` (puzzels maken voor de ouder), `crop.ts` (uitsnede), `cropper.ts` (uitsnede-editor), `library.ts`/`library-admin.ts`/`library-ui.ts` (gedeelde fotobibliotheek: code of alles toevoegen), `celebration.ts`, `sound.ts`, `index.ts` (kindflow).
- `src/games/schaken/`: schaken in koninkrijkthema voor de oudste (5 jaar): `rules.ts` (zetregels, puur en getest), `pieces.ts` (figuurtjes als SVG: prinsesje, kasteel, tovenares, eenhoorn, koningin, koning; wit = roze, zwart = paars), `view.ts` (oefenbord: stuk kiezen, tikken, bolletjes), `index.ts`.
- `src/games/dummy/`: testspel, alleen nog voor `app.test.ts`.
- Tests: `npm test` (vitest, jsdom, fake-indexeddb). Slepen/layout alleen te controleren in een echte browser.

## Status

- [x] Fase 1 – Basis
- [x] Fase 2 – Puzzel speelbaar
- [x] Fase 3 – Echte puzzel (klassieke vormen, groepen, geluid, voltooi-animatie, tussenstand)
- [x] Fase 4 – Ouderdeel en voortgang (oudercheck, profielen, puzzels maken, voortgang per kind)
- [x] Fase 5 – Mac-app (Tauri): `npm run app:build`, zie `docs/TAURI.md` (opstarten getest; bediening in het venster nog niet)
- [x] Fase 6 – Stickerboek (beloning), zie PRD-hoofdstuk "Beloning": spaarstand + spaarbalk + drempel per profiel, flippo-editor (ouder → Stickers), cadeautjes openmaken, stickerboek met albums van anderen (in de browser doorgelopen met Playwright; Mac-app nog niet)
- [x] Fase 7 – Back-up (export/import), GitHub Pages en PWA voor offline op de iPad (offline getest in Chromium; iPad zelf nog niet)
- [x] Fase 8 – Fotobibliotheek: foto's delen vanaf de laptop (beheerconsole, token) en op andere apparaten ophalen met 5-cijferige code of via de bibliotheek, zie `docs/BIBLIOTHEEK.md` (getest in Chromium met nep-GitHub; nog niet tegen de echte GitHub)
- [ ] Fase 9 – Grote puzzels voor volwassenen (vinkje 🧑, tot 500 stukjes, zoomen/verschuiven): stap 1 klaar (vinkje, aantallen, resolutie, geen punten), stap 2 klaar (zoomen en verschuiven: `viewport.ts`, `world`-laag in `view.ts`), stap 3 klaar (lade met kolommen, filter Rand/Rest en tellers), stap 4 klaar (tussenstand vertraagd bewaren via `saver.ts`, meetgegevens en stop-melding via `meting.ts`). Open: meten op een echte iPad (stukjes nemen bij 500 ongeveer 120 MB canvasgeheugen in). Zie PRD-hoofdstuk "Puzzels voor volwassenen"
- [x] Fase 10 – Minder verslavend: sessieregel vervangen door dagmaximum aan stickers (standaard 2), spaarpot zonder aftelling, één cadeautje en stickers standaard op volgorde, feestscherm met 🏠 Klaar als hoofdknop. Zie PRD "Dagmaximum" en "Geen gokelement" (nog niet in een echte browser bekeken)
- [ ] Fase 11 – Schaken voor de oudste, met leerlevels (toren, loper, dame, paard, koning, pion, slaan, veilig staan, mat in één, kleine partij) en automatisch niveau: stap 1 klaar (spel aangemeld, bord, figuurtjes), stap 2 klaar (zetregels + oefenbord, nog geen levels, stem of voortgang). Open: levels 1–6, automatisch niveau (`levels.ts`), levels 7–10. Schaakregels (schaak, rokade, en passant) ontbreken nog bewust `docs/VERBETERINGEN.md`

## Werkwijze

Stap voor stap, na elke stap presenteren en op akkoord wachten (zie `/Users/stefan/Git/CLAUDE.md`).

## Lessen

Valkuilen uit eerdere bugs staan in [docs/LESSONS.md](docs/LESSONS.md). Lees dat voor je aan nieuwe functionaliteit begint en vul het aan na elke niet-triviale bugfix.

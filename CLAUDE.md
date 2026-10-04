# Kidsplay – Familie Spelplatform (Mac)

## Doel

Lokaal spelplatform op de MacBook: elk kind kiest een eigen profiel, speelt spellen en ziet de eigen voortgang. Eerste spel is een fotopuzzel (4–48 stukjes). Nieuwe spellen haken in op dezelfde profielen en voortgangsopslag via een vaste spel-interface.

Volledige requirements: [docs/PRD.md](docs/PRD.md).

## Technische keuzes

- Webapp in TypeScript (Vite, vanilla, geen framework); nu als lokale webpagina, verpakt als Mac-app met Tauri 2 in `src-tauri/` (`docs/TAURI.md`).
- Puzzel: gewone DOM-elementen met canvas-bitmaps per stuk, klassieke vorm (bezier-randen, `shapes.ts`), slepen met pointer-events op `window`.
- Opslag: IndexedDB achter interfaces (`ProfileStore`, `ProgressStore`, `RecordStore`); later bestanden in `~/Library/Application Support/Familiespellen/`.
- Volledig offline, geen accounts, geen tracking.
- Doelgroep 4–10 jaar: grote klikvlakken (min. 64×64 px), iconen i.p.v. tekst, geen foutmeldingen.

## Structuur

- `src/main.ts`: opstarten (opslag, spellen aanmelden, `init` per spel).
- `src/app.ts`: schermen (profielen → spellen → spel) en navigatie; gear → oudercheck → ouderdeel.
- `src/platform/`: types (`GameModule`, `GameContext`, stores), registry, `rewards.ts` (spaarstand per profiel, opgeslagen onder voortgangssleutel `platform:rewards`), `storage/indexeddb.ts`.
- `src/parent/`: oudercheck (tafelsom), menu, profielbeheer (incl. drempel en volgorde van stickers), voortgangsoverzicht.
- `src/stickers/`: beloning. `model.ts` (Sticker/AlbumEntry, opslag onder spel-id `stickers`), `logic.ts` (volgende sticker, plekken, puur en getest), `flippo.ts` (ronde PNG, rand, glitter, gouden sticker), `manage.ts` (ouder: lijst, slepen om te ordenen, editor), `gifts.ts` (cadeautjes kiezen en openscheuren), `book.ts` (stickerboek), `status.ts` (spaarstand + cadeautjes).
- `src/ui/`: `dom.ts`, `sound.ts` (klik, fanfare, scheuren, glinster), `confetti.ts`, `savings.ts` (spaarpot), `urls.ts`.
- `src/games/puzzle/`: het fotopuzzelspel
  - `grid.ts` (raster), `shapes.ts` (puzzelvormen), `image.ts` (foto → stukken), `snap.ts` (vastklikken, puur en getest), `view.ts` (lade/canvas/slepen), `progress.ts` (resultaten + tussenstand), `model.ts` (puzzel/instellingen), `manage.ts` (puzzels maken voor de ouder), `crop.ts` (uitsnede), `celebration.ts`, `sound.ts`, `index.ts` (kindflow).
- `src/games/dummy/`: testspel, alleen nog voor `app.test.ts`.
- Tests: `npm test` (vitest, jsdom, fake-indexeddb). Slepen/layout alleen te controleren in een echte browser.

## Status

- [x] Fase 1 – Basis
- [x] Fase 2 – Puzzel speelbaar
- [x] Fase 3 – Echte puzzel (klassieke vormen, groepen, geluid, voltooi-animatie, tussenstand)
- [x] Fase 4 – Ouderdeel en voortgang (oudercheck, profielen, puzzels maken, voortgang per kind)
- [x] Fase 5 – Mac-app (Tauri): `npm run app:build`, zie `docs/TAURI.md` (opstarten getest; bediening in het venster nog niet)
- [x] Fase 6 – Stickerboek (beloning), zie PRD-hoofdstuk "Beloning": spaarstand + spaarbalk + drempel per profiel, flippo-editor (ouder → Stickers), cadeautjes kiezen/openmaken, stickerboek met albums van anderen (in de browser doorgelopen met Playwright; Mac-app nog niet)
- Verbeterpunten en beslissingen: `docs/VERBETERINGEN.md`

## Werkwijze

Stap voor stap, na elke stap presenteren en op akkoord wachten (zie `/Users/stefan/Git/CLAUDE.md`).

## Lessen

Valkuilen uit eerdere bugs staan in [docs/LESSONS.md](docs/LESSONS.md). Lees dat voor je aan nieuwe functionaliteit begint en vul het aan na elke niet-triviale bugfix.

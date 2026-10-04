# Lessen

Valkuilen tijdens het bouwen: wat ging er mis, waarom, en de fix. Alleen niet-triviale bugs (geen typo's of dingen die de linter vangt).

## Slepen: stuk bleef 'vast' hangen na loslaten
- **Wat:** bij het oppakken uit de lade verhuist het element naar het speelvlak (`stage.append`). Daarbij vervalt de pointer capture. Liet het kind los boven iets anders (knop, ander stuk) dan kreeg het stuk geen `pointerup` en bleef zweven.
- **Fix:** `pointermove`/`pointerup`/`pointercancel` luisteren op `window` in plaats van op het stuk (`view.ts`). Geen `setPointerCapture` meer.
- **Gevonden met:** een echte browser (Playwright), niet met jsdom-tests. Sleepgedrag altijd in een echte browser controleren.

## Opslag: twee interfaces met dezelfde methodenamen op één klasse
- **Wat:** `IndexedDbStorage` implementeerde `ProfileStore` (`list/get/put/remove`) én een nieuwe `RecordStore` met dezelfde namen. Een tweede definitie overschrijft de eerste, profielen gingen stuk (`DataError`).
- **Fix:** `RecordStore` is een eigen object (`storage.records`). Bij meerdere stores in één klasse: aparte objecten, geen gedeelde methodenamen.

## Seed met vlag: eerst de vlag, dan de data
- **Wat:** `ensureSamplePuzzle` zette eerst `sampleSeeded = true` en maakte daarna de puzzel. Bij een onderbroken start (bijvoorbeeld Vite die de pagina herlaadt) bleef de vlag staan zonder puzzel.
- **Fix:** eerst de data schrijven, pas daarna de vlag.

## CSS: te brede selector
- **Wat:** `.game-area button { font-size: 160px }` (voor het testspel) maakte ook de knoppen van de puzzel enorm.
- **Fix:** `.game-area > button`. Spelspecifieke stijlen onder een eigen klasse zetten.

## Tooling
- **macOS `sed -i`** vraagt een extensie-argument (`sed -i ''`); plak-bewerkingen daarom met `python3` of de Edit-tool doen.
- **vitest** toont `console.log` niet altijd; schrijf debugresultaten naar een bestand.
- **Playwright** staat niet in het project; installeer in een tijdelijke map (`npx playwright install chromium`) voor browsercontroles.

## Spaarpunten: eerst de wachtrij, dan lezen
- **Wat:** het laatste vastgeklikte stukje geeft een punt (`ctx.addPoints`, async) en vlak daarna toont het feestscherm de spaarbalk. Zonder volgorde zag het scherm de stand van vóór dat punt.
- **Fix:** `updateRewards` zet wijzigingen per profiel in een wachtrij en `loadRewards` wacht op die wachtrij. Roep `addPoints` dus synchroon aan (zonder tussenliggende `await`) vóór je `savings()` leest.

## Playwright: IndexedDB delen tussen scripts
- **Wat:** elk script met `chromium.launch()` begint met een lege IndexedDB, dus profielen en stickers uit een eerder script ontbraken.
- **Fix:** `chromium.launchPersistentContext(<map>, …)` met dezelfde map in elk script.

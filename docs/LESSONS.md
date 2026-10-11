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

## Service worker: `Vary: Origin` liet de cache missen
- **Wat:** offline kwam de pagina uit de cache, maar het JS-bestand niet (`MIME type text/html`, lege pagina). Module-scripts sturen een `Origin`-header mee, de server antwoordt met `Vary: Origin`, en `caches.match` vond het met `addAll` gecachete bestand daarom niet.
- **Fix:** `caches.match(request, { ignoreSearch: true, ignoreVary: true })` in `src/sw.template.js`.
- **Testen:** Playwrights `setOffline(true)` is bij service workers onbetrouwbaar; stop de server echt (`pkill -f vite`) en herlaad.

## Back-up: Blobs en fake-indexeddb
- **Wat:** `fake-indexeddb` bewaart een jsdom-`Blob` niet (komt terug als `{}`), dus een test met Blob via de opslag faalt.
- **Fix:** Blob-omzetting (`encodeBlobs`/`decodeBlobs`) los testen; de echte rondgang is in een echte browser gecontroleerd.

## Puzzelvorm: bekijk het resultaat, niet alleen de tests
- **Wat:** de eerste nop (smalle stok met klein kopje) voldeed aan alle tests (randen passen, binnen de bitmap) maar zag er mager uit.
- **Fix:** klassieke vorm in `shapes.ts` (`knob`: drie bezier-bochten, hals + ronde kop + zachte golf in de rand). Tweak de vorm aan de hand van een screenshot: teken `piecePath` voor een raster op een canvas in een echte browser.

## Bibliotheek: GitHub als opslag (valkuilen vooraf uitgezocht)
- **Cache:** `raw.githubusercontent.com` cachet een paar minuten. Een net gedeelde foto ontbrak daardoor in de lijst. Fix: `?t=<tijd>` achter `index.json` en `puzzle.json` (`rawUrl(..., bust)`). Voor schrijven/lezen in de console de API gebruiken, niet raw.
- **Eén commit:** losse Contents-API-aanroepen per bestand geven halve toestanden (foto zonder lijst). Gebruik de Git Data API (blobs → tree → commit → ref), ook voor verwijderen (`sha: null`) en voor het aanmaken van de branch zonder parent.
- **Code hergebruiken:** een verwijderde code kan opnieuw worden uitgedeeld. De puzzel-id op het apparaat is daarom `lib-<code>-<tijd>`, niet alleen de code.
- **Testen zonder token:** Playwright met `context.route` voor `api.github.com` en `raw.githubusercontent.com` (inclusief `OPTIONS`-preflight); de echte GitHub is nog niet doorlopen.

## Nieuwe versie in een PWA: `update()` is soms al klaar als de worker actief is
- **Wat:** na `registration.update()` stond `installing` al weer leeg, omdat `skipWaiting` de nieuwe versie direct activeert. De verversknop meldde daardoor "al de nieuwste" en laadde niet opnieuw.
- **Fix:** luister vóór `update()` naar `updatefound` en onthoud die worker (`checkForUpdate` in `src/platform/update.ts`); wacht dan tot hij `activated` is. Een worker die al `redundant` is, geldt als mislukt.
- **Ook:** de open pagina draait na een update nog op oude code; pas herladen geeft de nieuwe versie. Daarom herlaadt de knop zelf.

## Testen van updates: minifier haalt commentaar weg
- **Wat:** een "versie 2" maken door `/* v2 */` aan de CSS toe te voegen gaf een bytegelijke build (zelfde hash in `sw.js`), dus de update-test leek te falen.
- **Fix:** wijzig in de test een echte regel (`.zz-test{color:red}`). Serveer `dist/` met een eenvoudige server die elk bestand vers van schijf leest: `vite preview` onthoudt bestandslijst en lengtes van het opstarten.

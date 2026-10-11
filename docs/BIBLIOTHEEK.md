# Fotobibliotheek en beheerconsole

Foto's klaarzetten op de laptop en op andere apparaten (telefoon, iPad, nieuwe Mac) in de app krijgen, zonder daar te hoeven uploaden.

## Werking
- **Opslag:** aparte branch `fotos` van `WilfredGen3e/kidsplay` (geen Pages-build; de workflow draait alleen op `main`).
  - `index.json`: alle foto's (`{ version: 1, entries: LibraryEntry[] }`).
  - `codes/<5 cijfers>/puzzle.json`, `foto.jpg`, `thumb.jpg`.
- **Lezen** (app): publiek via `https://raw.githubusercontent.com/<owner>/<repo>/fotos/<pad>`. Geen token, geen login. Alleen online.
- **Schrijven** (beheerconsole, `beheer.html`): GitHub Git Data API met een fine-grained token (alleen deze repo, *Contents: Read and write*). Het token staat in `localStorage` van die browser. Wie het token niet heeft, kan niets wijzigen.
- **Eén commit per actie** (blobs → tree → commit → ref); de branch wordt bij de eerste foto zonder geschiedenis aangemaakt.
- **Geen opruimen:** foto's blijven staan, zodat een nieuw apparaat alles kan terugkrijgen.

## In de app (ouder → Fotopuzzel → Puzzels)
- **🔢 Code invoeren:** 5 cijfers, haalt één puzzel op.
- **📚 Bibliotheek:** raster met alle foto's; één kiezen of **Alles toevoegen**. Reeds toegevoegde (zelfde `id`) worden overgeslagen. Geïmporteerde puzzels zijn zichtbaar voor iedereen en werken daarna offline.
- **➕ Nieuwe puzzel** (lokaal uit een foto op dit apparaat) blijft gewoon bestaan.

## Beheerconsole (`/beheer.html`, niet gelinkt vanuit de app)
0. Toegangscode (`src/beheer/access.ts`, nu 6402): een slot op het scherm, onthouden zolang het tabblad open is. Het staat in de publieke pagina en is dus geen beveiliging; alleen het token geeft schrijfrechten.
1. Eenmalig inloggen met het token (instructies staan op de pagina).
2. Foto kiezen, uitsnijden, naam en aantallen stukjes kiezen, **Delen** → code.
3. Lijst met alle foto's: wijzigen (naam, aantallen) of verwijderen.

## Beperkingen
- De repo is publiek, dus de foto's ook; `index.json` toont ze allemaal. De code is een kort adres, geen geheim.
- Verwijderen haalt de foto van de branch, maar niet uit de git-geschiedenis, en niet van apparaten die hem al hebben. Echt wissen vraagt een force-push van de branch.
- `raw.githubusercontent.com` cachet enkele minuten; de app voegt daarom een tijdparameter toe aan `index.json` en `puzzle.json`.
- Codes zijn 5 cijfers (100.000 mogelijkheden); `generateCode` slaat codes in gebruik over.

## Code
- `src/games/puzzle/library.ts`: formaat, codes, ophalen, importeren (puur, `fetch` te injecteren).
- `src/games/puzzle/library-admin.ts`: publiceren/wijzigen/verwijderen tegen een `RepoWriter`.
- `src/games/puzzle/library-ui.ts`: schermen Bibliotheek en Code invoeren.
- `src/games/puzzle/cropper.ts`: uitsnede-editor, gedeeld door de app en de console. Foto kiezen kan door te klikken, te slepen of te plakken (plakvak: rechtermuisknop → Plakken; Ctrl/⌘+V werkt overal behalve in tekstvelden).
- `src/beheer/github.ts` (Git Data API) en `src/beheer/main.ts` (console).

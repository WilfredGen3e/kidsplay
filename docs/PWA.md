# Webapp, GitHub Pages en iPad (offline)

## Publiceren
- `.github/workflows/pages.yml` test, bouwt (`npm run build`) en publiceert `dist/` naar GitHub Pages bij elke push naar `main`.
- Eenmalig in GitHub: repo → Settings → Pages → Source: **GitHub Actions**. Staat de default-branch niet op `main`, dan moet die onder Settings → Environments → github-pages ook als toegestane branch staan.
- `vite.config.ts` gebruikt `base: './'`, dus dezelfde build werkt op `/<repo>/`, lokaal en in Tauri.
- Op Pages staat **geen data**: puzzels, stickers en profielen zitten in IndexedDB van de browser. Zet ze over met ouder → 💾 Back-up (downloaden op de Mac, terugzetten op de iPad). Foto's voor puzzels delen kan ook via de bibliotheek, zie `docs/BIBLIOTHEEK.md`.
- `beheer.html` (beheerconsole) wordt mee gebouwd en gepubliceerd op `<site>/beheer.html`.

## Offline
- `vite.config.ts` (plugin `offlineServiceWorker`) schrijft `dist/sw.js` uit `src/sw.template.js`, met versie (hash) en alle gebouwde bestanden. Cache-first; nieuwe versie wordt bij het volgende bezoek actief.
- Registratie in `src/main.ts`, alleen in productie en alleen via http(s) (dus niet in de Tauri-app).
- Op de iPad: open de site in Safari, Deel → **Zet op beginscherm**. Daarna werkt de app zonder internet en op volledig scherm.
- **Icoon:** `public/icons/` (eenhoorn op paars; `icon-512.png`, `icon-192.png`, `apple-touch-icon.png`). iOS leest het icoon alleen bij het toevoegen aan het beginscherm: een nieuw icoon verschijnt pas na verwijderen en opnieuw toevoegen. Verwijderen wist de opslag van de app, dus eerst 💾 Back-up maken en daarna terugzetten.
- `navigator.storage.persist()` wordt aangevraagd, maar Safari kan data van sites wissen. Maak af en toe een back-up.

## Nieuwe versie ophalen (🔄 linksboven)
- Op het profielenscherm staat linksboven een 🔄-knop (alleen in de webapp/PWA, niet in dev of in de Tauri-app). Tikken zoekt een nieuwe versie, haalt die op en laadt de app opnieuw. Is er niets nieuws, dan toont de knop kort ✅; zonder internet 📴.
- Staat er op de achtergrond al een nieuwe versie klaar, dan krijgt de knop een gele rand; tikken herlaadt direct.
- De app controleert zelf bij het openen en bij terugkeren uit de achtergrond (`visibilitychange`); een PWA op de iPad wordt zelden echt herstart.
- Ouderdeel toont onderaan "Versie van <tijdstip van de build>" om op de iPad te zien welke versie draait.
- Code: `src/platform/update.ts`, knop in `src/app.ts`, `sw.js` wordt met `updateViaCache: 'none'` geregistreerd.

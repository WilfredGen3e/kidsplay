# Webapp, GitHub Pages en iPad (offline)

## Publiceren
- `.github/workflows/pages.yml` test, bouwt (`npm run build`) en publiceert `dist/` naar GitHub Pages bij elke push naar `main`.
- Eenmalig in GitHub: repo → Settings → Pages → Source: **GitHub Actions**. Staat de default-branch niet op `main`, dan moet die onder Settings → Environments → github-pages ook als toegestane branch staan.
- `vite.config.ts` gebruikt `base: './'`, dus dezelfde build werkt op `/<repo>/`, lokaal en in Tauri.
- Op Pages staat **geen data**: puzzels, stickers en profielen zitten in IndexedDB van de browser. Zet ze over met ouder → 💾 Back-up (downloaden op de Mac, terugzetten op de iPad).

## Offline
- `vite.config.ts` (plugin `offlineServiceWorker`) schrijft `dist/sw.js` uit `src/sw.template.js`, met versie (hash) en alle gebouwde bestanden. Cache-first; nieuwe versie wordt bij het volgende bezoek actief.
- Registratie in `src/main.ts`, alleen in productie en alleen via http(s) (dus niet in de Tauri-app).
- Op de iPad: open de site in Safari, Deel → **Zet op beginscherm**. Daarna werkt de app zonder internet en op volledig scherm.
- `navigator.storage.persist()` wordt aangevraagd, maar Safari kan data van sites wissen. Maak af en toe een back-up.

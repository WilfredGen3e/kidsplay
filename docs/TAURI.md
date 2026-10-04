# Mac-app (Tauri)

De app is gebouwd met Tauri 2 (`src-tauri/`). Rust is geïnstalleerd via rustup (`~/.cargo`).

## Bouwen en gebruiken
```sh
. "$HOME/.cargo/env"        # alleen nodig in een terminal die al open stond
npm run app:build           # eerste keer ~1–5 min; daarna sneller
open src-tauri/target/release/bundle/macos/Familiespellen.app
cp -R src-tauri/target/release/bundle/macos/Familiespellen.app /Applications/   # in Programma's zetten
```
- Proberen tijdens het bouwen: `npm run app:dev` (opent het venster op volledig scherm, net als de echte app).
- Afsluiten uit volledig scherm: ⌘Q.
- De app is niet ondertekend. Op een andere Mac vraagt macOS bij het eerste openen om bevestiging (rechtsklik → Open).
- Vereist macOS 13 of nieuwer. Voor Apple Silicon én Intel in één app: `rustup target add aarch64-apple-darwin x86_64-apple-darwin` en `npx tauri build --bundles app --target universal-apple-darwin`.

## Instellingen
`src-tauri/tauri.conf.json`: volledig scherm, identifier `nl.familie.spellen`, minimaal macOS 13. Icoon opnieuw maken: `npx tauri icon pad/naar/1024x1024.png`.

## Opslag
De gegevens staan nu in IndexedDB van de webview van de app, niet in een eigen map. Ze blijven bewaard, maar een back-up is dus niet "map kopiëren". Verplaatsen naar `~/Library/Application Support/Familiespellen/`: tweede implementatie van `ProfileStore`, `ProgressStore` en `RecordStore` (`src/platform/types.ts`) met Tauri's bestandsplug-in; de rest van de code verandert niet. Bouw dan eerst een export/import, zodat bestaande gegevens meegaan.
- Het venster heeft `dragDropEnabled: false` zodat een plaatje slepen naar de dropzone (puzzels/stickers) in de webview werkt.

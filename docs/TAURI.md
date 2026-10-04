# Mac-app maken met Tauri (fase 5)

Niet gebouwd: op de ontwikkelmachine ontbrak Rust, dus dit is niet getest. De webapp is klaar om verpakt te worden.

## Voorbereiding
1. Xcode Command Line Tools: `xcode-select --install` (staat al op deze Mac).
2. Rust: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`, daarna een nieuwe terminal openen.
3. In de repo: `npm install -D @tauri-apps/cli` en `npx tauri init` met:
   - app name: `Familiespellen`
   - window title: `Familiespellen`
   - web assets: `../dist`
   - dev server URL: `http://localhost:5173`
   - dev command: `npm run dev`
   - build command: `npm run build`

## Instellen
In `src-tauri/tauri.conf.json`:
- venster: `"fullscreen": true`, `"title": "Familiespellen"`;
- `bundle.identifier`: bijvoorbeeld `nl.familie.spellen`;
- `bundle.macOS.minimumSystemVersion`: `"13.0"`;
- een icoon: `npx tauri icon pad/naar/icoon.png`.

## Bouwen en gebruiken
- Proberen: `npx tauri dev`
- Bouwen: `npx tauri build`; de app komt in `src-tauri/target/release/bundle/macos/` en kan naar Programma's en het Dock.
- Voor Apple Silicon én Intel: `npx tauri build --target universal-apple-darwin` (beide Rust-targets installeren: `rustup target add aarch64-apple-darwin x86_64-apple-darwin`).

## Daarna
- Opslag verplaatsen van IndexedDB naar een map: een tweede implementatie van `ProfileStore`, `ProgressStore` en `RecordStore` (`src/platform/types.ts`) met Tauri's bestandsplug-in, en die in `src/main.ts` gebruiken. De rest van de code verandert niet.
- Let op: IndexedDB in de Tauri-webview bewaart ook, maar niet in de gewenste map; bij de overstap eerst een export/import bouwen om bestaande gegevens mee te nemen.

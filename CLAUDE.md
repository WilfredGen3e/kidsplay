# Kidsplay – Familie Spelplatform (Mac)

## Doel

Lokaal spelplatform op de MacBook: elk kind kiest een eigen profiel, speelt spellen en ziet de eigen voortgang. Eerste spel is een fotopuzzel (4–48 stukjes). Nieuwe spellen haken in op dezelfde profielen en voortgangsopslag via een vaste spel-interface.

Volledige requirements: [docs/PRD.md](docs/PRD.md).

## Technische keuzes

- Webapp in TypeScript; fase 1 als lokale webpagina, later verpakt met Tauri (fase 5).
- Puzzel-engine op HTML-canvas (Konva of PixiJS, nog te kiezen).
- Opslag lokaal in `~/Library/Application Support/Familiespellen/` (SQLite of JSON, nog te kiezen).
- Volledig offline, geen accounts, geen tracking.
- Doelgroep 4–10 jaar: grote klikvlakken (min. 64×64 px), iconen i.p.v. tekst, geen foutmeldingen.

## Structuur

- `src/app.ts`: schermen (profielen → spellen → spel) en navigatie.
- `src/platform/`: types (`GameModule`, `GameContext`, stores), registry, `storage/indexeddb.ts`, tijdelijke `seed.ts` (voorbeeldprofielen tot het ouderdeel er is).
- `src/games/<spel>/`: elk spel een eigen module; nu alleen `dummy` als testspel.
- Tests: `npm test` (vitest, jsdom, fake-indexeddb).
- Nog te bouwen: ouderdeel (gear-knop is nog zonder werking).

## Status

- [x] PRD vastgelegd
- [x] Fase 1 – Basis (profielscherm, spellenoverzicht, lokale opslag)
- [~] Fase 2 – Puzzel speelbaar: lade, canvas, slepen, vastklikken (rand/buren/groepen), afronden met voortgang klaar; nog open: foto uploaden door de ouder, tussenstand bewaren (puzzel gebruikt nu ingebouwde voorbeeldafbeelding)
- [ ] Fase 3 – Echte puzzel
- [ ] Fase 4 – Ouderdeel en voortgang
- [ ] Fase 5 – Mac-app (Tauri)

Open vragen staan in het PRD.

## Werkwijze

Stap voor stap, na elke stap presenteren en op akkoord wachten (zie `/Users/stefan/Git/CLAUDE.md`).

## Lessen

Valkuilen uit eerdere bugs staan in [docs/LESSONS.md](docs/LESSONS.md). Lees dat voor je aan nieuwe functionaliteit begint en vul het aan na elke niet-triviale bugfix.

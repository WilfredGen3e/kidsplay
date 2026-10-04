# Verbeteringen

Lijst om samen door te nemen na het testen. Bovenaan wat ik zelf al weet.

## Nog niet gebouwd / niet getest
- [ ] **Mac-app (Tauri):** niet gebouwd, Rust ontbreekt op deze Mac. Zie `docs/TAURI.md`.
- [ ] **Volledig scherm** en Dock-icoon: horen bij Tauri.
- [ ] **Opslag in een map** (`~/Library/Application Support/Familiespellen/`) in plaats van IndexedDB: komt bij Tauri; de opslag zit al achter interfaces.
- [ ] **HEIC-foto's:** werken in WebKit (Tauri/Safari) maar niet in Chrome; nog niet op de Mac getest.
- [ ] Niet in een echte browser gecontroleerd: staande en vierkante foto's, lade links, 24–48 stukjes (prestaties, 60 fps), het eigen-foto-avatar, spookbeeld en hulpknop.
- [ ] Het geluid (klik en fanfare) is alleen als code geschreven; niet beluisterd.

## Ideeën en bekende beperkingen
- [ ] **Aanraken van de doorzichtige rand:** een stuk pakt ook op in de lege marge rond de uitsteeksels; bij overlappende stukken kan dat een buurstuk blokkeren. Oplossing: hit-test op de alfa van de bitmap.
- [ ] **Hulpknop** kiest nu het geselecteerde/laatst gepakte stuk, anders het eerste in de lade. Slimmer: een stuk dat aansluit op wat al ligt.
- [ ] **Vensterformaat veranderen** tijdens het puzzelen: posities blijven kloppen, maar het is weinig getest.
- [ ] **Groep terug naar de lade** kan niet; alleen losse stukken.
- [ ] **Puzzel wijzigen:** alleen naam, aantallen en zichtbaarheid; de foto/uitsnede achteraf aanpassen kan nog niet.
- [ ] **Oudercheck** is een tafelsom (6–9); een lang-indrukken-optie of instelbare moeilijkheid kan.
- [ ] **Beloning:** nu een ster per puzzel; stickers/verzamelalbum nog niet uitgewerkt (open vraag in het PRD).
- [ ] **Persoonlijk record** wordt alleen op het feestscherm getoond (🏆), niet in het spellenoverzicht.
- [ ] **Back-up/herstel** vanuit het ouderdeel (export van profielen, puzzels en voortgang).
- [ ] **Verwijderde puzzel:** voortgang blijft staan als "Verwijderde puzzel".
- [ ] **Testspel** (`src/games/dummy`) staat nog in de code voor de app-test; kan eruit zodra er een tweede echt spel is.

## Beslissingen die ik heb genomen (open vragen uit het PRD)
- Alleen vastklikken op de juiste plek.
- Altijd de klassieke puzzelvorm, ook bij 4 stukjes.
- Het kind kiest zelf het aantal stukjes uit wat de ouder toestaat (standaard 4, 8, 12, 16, 24).
- Beloning: een ster per voltooide puzzel.
- Snap-afstand standaard 20% van de stukbreedte (min. 15 px), instelbaar als ruim/normaal/krap.

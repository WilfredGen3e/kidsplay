# PRD – Familie Spelplatform (Mac)

4 okt 2026 · @Stefan

## Samenvatting en doelen

We bouwen een lokaal spelplatform op de MacBook waar elk kind een eigen profiel kiest, spelletjes speelt en zijn of haar voortgang terugziet. Het eerste spel is een fotopuzzel: een ouder uploadt een afbeelding, het platform knipt die in 4, 8, 12 of meer stukjes, en het kind legt de puzzel op een leeg canvas waarbij stukjes vastklikken aan de rand of aan elkaar.

Het platform is bewust uitbreidbaar: elk nieuw spel dat we samen bouwen haakt in op dezelfde profielen en dezelfde voortgangsopslag.

### Doelen

- Kinderen kunnen zelfstandig hun profiel kiezen en een spel starten, zonder te hoeven lezen of typen.
- Voortgang (gespeelde puzzels, tijd, aantal stukjes) wordt per kind bewaard en blijft na afsluiten bestaan.
- Alles draait offline op de Mac; er gaan geen foto's of gegevens naar internet.
- Een nieuw spel toevoegen kost weinig werk dankzij een vaste spel-interface.

### Succes ziet er zo uit

- Een kind van 4 tot 10 jaar legt zonder hulp een puzzel van 12 stukjes af.
- Een ouder maakt binnen 1 minuut een nieuwe puzzel van een eigen foto.
- De app start in minder dan 3 seconden en reageert vloeiend bij slepen (60 fps).

## Doelgroep en gebruikers

Er zijn twee rollen: de ouder beheert, de kinderen spelen.

| Rol | Wie | Wat ze doen | Belangrijkste behoefte |
|---|---|---|---|
| Speler | De kinderen (circa 4 tot 10 jaar) | Profiel kiezen, spel kiezen, spelen, voortgang bekijken | Groot, kleurrijk, simpel; geen tekst nodig om te navigeren |
| Beheerder | Ouder | Profielen aanmaken, foto's uploaden, puzzels instellen, voortgang inzien | Snel iets klaarzetten; kinderen kunnen niet per ongeluk dingen wissen |

Het ouderdeel zit achter een eenvoudige oudercheck (bijvoorbeeld een rekensom of lang ingedrukt houden), zodat kinderen er niet zomaar in komen.

## Platform: profielen, spellen en voortgang

De app opent altijd op het profielscherm; vanuit daar is elk spel in twee klikken bereikbaar.

### Navigatie

1. **Profielscherm:** grote tegels met naam, kleur en avatar per kind, plus een klein tandwiel voor het ouderdeel.
2. **Spellenoverzicht:** de gekozen speler ziet zijn naam bovenaan en een tegel per spel, met een sterretje of teller voor voortgang.
3. **Spel:** start meteen; een duidelijke huisknop gaat terug naar het spellenoverzicht.

### Profielen (beheer door ouder)

- Profiel aanmaken met naam, kleur en avatar (keuze uit vaste plaatjes of een eigen foto).
- Profiel wijzigen of verwijderen, met bevestiging.
- Geen wachtwoorden voor kinderen.

### Voortgang per persoon

Elk spel slaat zijn resultaten op onder het profiel. Voor de puzzel bewaren we:

| Gegeven | Voorbeeld | Doel |
|---|---|---|
| Puzzel-id en afbeelding | "Vakantie strand" | Terugzien welke puzzels gedaan zijn |
| Aantal stukjes | 12 | Moeilijkheid tonen en opbouwen |
| Status | Bezig / Voltooid | Verder gaan waar je was |
| Tussenstand | Posities van gelegde stukjes | Een half gelegde puzzel hervatten |
| Speeltijd | 4 min 12 s | Persoonlijk record tonen |
| Datum voltooid | 3 okt 2026 | Overzicht |

### Overzicht voor ouder

In het spellenoverzicht ziet het kind per spel een simpele beloning, bijvoorbeeld een ster per voltooide puzzel. De ouder ziet in het ouderdeel per kind een lijst van gespeelde puzzels.

### Spel-interface voor uitbreiding

Elk spel is een losse module met een naam, een icoon, een startscherm en een functie om voortgang te lezen en op te slaan. Het platform levert het actieve profiel en de opslag; het spel hoeft daar zelf niets van te weten.

## Spel 1: Fotopuzzel

De ouder maakt van een eigen foto een puzzel; het kind kiest een puzzel, pakt stukjes uit een scrollbare lade en legt ze vrij op een leeg canvas.

### Puzzel maken (ouder)

- Afbeelding uploaden via slepen of een bestandskiezer (JPG of PNG; geen HEIC, de ouder maakt zo nodig een screenshot, dat is altijd JPEG).
- Uitsnede kiezen: de ouder schuift en zoomt de foto zodat het belangrijke deel in beeld is.
- Naam geven aan de puzzel.
- Aantal stukjes kiezen: 4, 8, 12 of een ander veelvoud van 4 (16, 20, 24 … tot maximaal 48).
- Kiezen voor welke kinderen de puzzel zichtbaar is (standaard: iedereen).
- Het kind kan bij het starten ook zelf het aantal stukjes kiezen uit de toegestane opties.

### Raster per aantal stukjes

Het raster volgt de verhouding van de foto. Voor een liggende foto (4:3) gebruiken we:

| Stukjes | Kolommen × rijen |
|---|---|
| 4 | 2 × 2 |
| 8 | 4 × 2 |
| 12 | 4 × 3 |
| 16 | 4 × 4 |
| 20 | 5 × 4 |
| 24 | 6 × 4 |
| 48 | 8 × 6 |

Bij een staande foto worden kolommen en rijen omgedraaid.

### Speelscherm

- Links of rechts een verticale lade met alle losse stukjes in willekeurige volgorde, scrollbaar met trackpad of muis. De kant is per profiel instelbaar (links- of rechtshandig).
- In het midden een leeg canvas met een zichtbare rand, precies zo groot als de afgemaakte puzzel.
- Een klein voorbeeldplaatje van de hele foto, aan of uit te zetten.
- Stukjes hebben de klassieke puzzelvorm met uitsteeksels en inhammen; voor de kleinsten (4 stukjes) kan dat ook gewoon rechthoekig.
- Stukjes draaien niet; ze liggen altijd rechtop. Dat houdt het simpel voor jonge kinderen.

### Afronden

- Als het laatste stukje op de juiste plek ligt, volgt een feestelijke animatie met geluid en de speeltijd.
- De puzzel telt als voltooid in de voortgang van het kind.
- Halverwege stoppen bewaart de tussenstand automatisch.

## Snap-logica en interactie

Een stukje klikt alleen vast als het op zijn juiste plek ligt én aansluit op de rand van het canvas of op een al vastgeklikt stukje; anders blijft het los liggen waar het kind het neerlegt.

### Toestanden van een stukje

| Toestand | Wat het kind ziet | Kan bewegen? |
|---|---|---|
| In de lade | Verkleind stukje in de scrollbare lijst | Ja, eruit slepen |
| Los op canvas | Stukje op ware grootte, met lichte schaduw | Ja, overal heen, ook terug naar de lade |
| Losse groep | Twee of meer stukjes die aan elkaar passen en samen bewegen | Ja, als geheel |
| Vastgeklikt | Stukje zonder schaduw, vast in het frame | Nee |

### Wanneer klikt een stukje vast?

1. Het kind laat het stukje los op het canvas.
2. Het platform kijkt of het stukje binnen de snap-afstand van zijn juiste plek ligt. Voorstel: 20% van de breedte van een stukje, met een minimum van 15 pixels.
3. Het stukje klikt vast als minstens één van deze waar is:
    - Het is een randstukje en de zijde die aan de rand hoort ligt tegen de canvasrand.
    - Het grenst aan een stukje dat al vastgeklikt zit.
4. Bij vastklikken schuift het stukje met een korte animatie (circa 120 ms) precies op zijn plek en klinkt een klik-geluid.
5. Ligt het stukje niet goed, dan blijft het gewoon los liggen. Er volgt geen foutgeluid of straf.

### Losse stukjes aan elkaar

Twee losse stukjes die buren van elkaar zijn en dicht genoeg bij elkaar liggen, klikken ook aan elkaar vast en vormen een groep. Zo kun je, net als met een echte puzzel, eerst een hoekje in elkaar zetten. Raakt de groep later een rand of een vastgeklikt stukje op de juiste plek, dan klikt de hele groep vast.

### Bediening

- Slepen met trackpad of muis; het opgepakte stukje komt bovenop alle andere te liggen en wordt iets groter (5%) zodat duidelijk is wat je vasthebt.
- Een stukje in de lade aanklikken en daarna op het canvas klikken werkt ook, voor kinderen die moeite hebben met slepen.
- Een los stukje terugslepen naar de lade zet het terug in de lijst.
- Hulpknop (optioneel): laat kort oplichten waar het gekozen stukje hoort.

### Moeilijkheid instellen (ouder)

- Snap-afstand ruim, normaal of krap.
- Voorbeeldplaatje wel of niet tonen.
- Spookbeeld van de foto zacht op het canvas, wel of niet.

## Technische aanpak

Voorstel: een webapp in TypeScript, verpakt als echte Mac-app met Tauri, met alle data in een lokale map; zo is het makkelijk samen te bouwen en uit te breiden.

### Opties afgewogen

| Aanpak | Voordelen | Nadelen |
|---|---|---|
| **Tauri + TypeScript (voorstel)** | Kleine, snelle Mac-app; webtechniek is makkelijk te bouwen met AI-hulp; nieuwe spellen zijn gewoon webpagina's | Rust-toolchain nodig voor het verpakken |
| Lokale webpagina in de browser | Snelst om mee te starten, niets te installeren | Voelt minder als een app; opslag in de browser is kwetsbaarder |
| Native SwiftUI + SpriteKit | Meest Mac-eigen, beste prestaties | Xcode en Swift nodig; trager om nieuwe spellen te maken |

Praktisch: we kunnen starten als lokale webpagina (fase 1) en later dezelfde code in Tauri verpakken.

### Opbouw

- **Platform-schil:** profielscherm, spellenoverzicht, ouderdeel, opslag.
- **Spelmodules:** elk spel in een eigen map, aangemeld bij het platform met naam en icoon.
- **Puzzel-engine:** tekent op een HTML-canvas (bijvoorbeeld met Konva of PixiJS); stukjesvormen worden bij het maken van de puzzel berekend als curvepaden waarmee de foto wordt uitgeknipt.

### Opslag

- Alles in één map, bijvoorbeeld `~/Library/Application Support/Familiespellen/`.
- Geüploade foto's worden gekopieerd en verkleind naar maximaal 2048 pixels breed, zodat de app snel blijft.
- Gegevens in een klein SQLite-bestand of in JSON-bestanden: profielen, puzzels, voortgang.
- Een back-up maken is dan simpelweg die map kopiëren.

### Datamodel (kern)

| Object | Velden |
|---|---|
| Profiel | id, naam, kleur, avatar, lade links/rechts |
| Puzzel | id, naam, afbeeldingsbestand, uitsnede, toegestane aantallen stukjes, zichtbaar voor |
| Voortgang | profiel-id, spel-id, puzzel-id, aantal stukjes, status, tussenstand, speeltijd, datum voltooid |

### Eisen

- Werkt volledig offline op macOS 13 of nieuwer, Apple Silicon en Intel.
- Geen account, geen internetverbinding, geen tracking.
- Vloeiend slepen (60 fps) tot 48 stukjes.

## UX voor kinderen

Alles moet werken voor een kind dat nog niet kan lezen: plaatjes, kleuren en geluid dragen de betekenis.

- Grote klikvlakken: minimaal 64 × 64 pixels voor knoppen en tegels.
- Elke knop heeft een icoon; tekst is aanvulling, nooit de enige uitleg.
- Korte, vrolijke geluiden bij vastklikken en voltooien; geluid aan/uit per profiel.
- Geen foutmeldingen of rode kruizen; een verkeerd gelegd stukje blijft gewoon liggen.
- Volledig scherm als standaard, zodat kinderen niet per ongeluk andere apps openen.
- Verwijderen en instellingen alleen in het ouderdeel.
- Rustige, contrastrijke kleuren; het canvas is licht zodat de foto goed opvalt.

## Beloning: het stickerboek

Elk kind spaart puzzelstukjes; bij elke 50 gelegde stukjes (per profiel instelbaar) mag het een ingepakt cadeautje uit een rij kiezen en openmaken, waarna de sticker in het eigen stickerboek komt.

### Sparen

- Elk stukje dat vastklikt telt als 1 punt, ongeacht welk spel of welke puzzel; hetzelfde stukje telt maar één keer per puzzelpoging.
- De drempel is per profiel in te stellen door de ouder, bijvoorbeeld 20 voor de jongste en 50 voor de oudste. Standaard: 50.
- In het spellenoverzicht en na elke puzzel ziet het kind een spaarbalk, zoals een pot die zich vult, met daaronder hoeveel stukjes er nog nodig zijn.
- Restpunten schuiven door: wie op 53 uitkomt, begint met 3 aan de volgende sticker.

### Cadeautje kiezen

1. Als de drempel gehaald is, verschijnt een feestelijk scherm met een rij van 5 tot 8 ingepakte cadeautjes in verschillende kleuren papier en strikken.
2. Het kind kiest er één; de andere schuiven zacht weg.
3. Het kind tikt of klikt een paar keer op het pakje om het papier open te scheuren, met geluid en papiersnippers.
4. De sticker komt tevoorschijn, wordt groot getoond en vliegt daarna naar het stickerboek.
5. Heeft een kind meerdere stickers verdiend, dan mag het meerdere keren achter elkaar kiezen.

### Illusie van keuze

Welke sticker het kind krijgt, staat al vast voordat het kiest; elk pakje bevat dus dezelfde sticker. Zo houdt de ouder grip op de volgorde en de verrassing, terwijl het kind het gevoel heeft zelf te kiezen. De niet-gekozen pakjes worden nooit geopend getoond.

De volgende sticker wordt zo bepaald:

- Uit de stickers die het kind nog niet heeft, op volgorde of willekeurig (ouder kiest per profiel).
- Geen dubbele stickers tot de hele set verzameld is.
- Is alles verzameld, dan krijgt het kind een gouden "compleet"-sticker en kan de ouder nieuwe stickers toevoegen.

### Stickers beheren (ouder)

Stickers zijn rond, in flippo-formaat. De ouder maakt ze in een eenvoudige flippo-editor:

1. Afbeelding uploaden via slepen of een bestandskiezer (JPG, PNG, HEIC).
2. De afbeelding verschijnt achter een rond flippo-kader; alles buiten de cirkel is gedimd zichtbaar.
3. De ouder schuift de afbeelding met slepen op zijn plek en zoomt met een schuifbalk of trackpad-knijpen; draaien in stappen van 90° kan met een knop.
4. Optioneel: een gekleurde rand rond de flippo kiezen, of een glitterrand voor speciale stickers.
5. Een live voorbeeld toont de flippo op ware grootte zoals het kind hem straks ziet.
6. Naam invullen en op Opslaan klikken.

Bij opslaan maakt de app een ronde PNG van 512 × 512 pixels met transparante buitenkant. De originele afbeelding en de uitsnede (positie, zoom, draaiing) worden ook bewaard, zodat de ouder een flippo later kan aanpassen zonder opnieuw te uploaden.

Verder kan de ouder:

- Een zeldzaamheid kiezen per sticker: gewoon of speciaal.
- Stickersets maken per profiel of voor iedereen. (Besluit: eerst één gedeelde set, plus per sticker de optie "alleen voor dit kind".)
- De volgorde aanpassen door te slepen.
- Een sticker verwijderen, zolang nog geen kind hem verdiend heeft.

### Het stickerboek

- Bereikbaar vanuit het spellenoverzicht via een eigen boek-icoon.
- Pagina's om door te bladeren; het kind sleept stickers vrij op een pagina en kan ze verplaatsen.
- Een overzichtspagina toont alle stickers uit de set, met lege silhouetten voor wat nog verdiend kan worden.
- Albums van anderen bekijken: bovenaan het stickerboek staan de avatars van alle profielen. Tik op een broer of zus en je bladert door diens album. Dat is alleen kijken: stickers verplaatsen, weghalen of ruilen kan alleen in je eigen album. Een duidelijke kleur en naam bovenaan laten zien wiens album open is, en één tik op je eigen avatar brengt je terug.

### Extra opslag

| Object | Velden |
|---|---|
| Sticker | id, naam, originele afbeelding, ronde PNG, uitsnede (positie, zoom, draaiing), rand, zeldzaamheid, set, volgorde |
| Spaarstand | profiel-id, punten, drempel, volgorde-modus (vast of willekeurig) |
| Stickerboek | profiel-id, sticker-id, datum verdiend, pagina, positie |

### Fasen

1. Spaarstand (platform, `src/platform/rewards.ts`).
2. Spaarbalk en drempel per profiel (ouder).
3. Stickers beheren: flippo-editor.
4. Cadeautjes kiezen en openmaken.
5. Het stickerboek, inclusief albums van anderen.

## Scope, open vragen en mijlpalen

### Buiten scope voor versie 1

- Online spelen, accounts of synchronisatie tussen apparaten.
- iPad- of Windows-versie.
- Stukjes draaien.
- Meer dan 48 stukjes.

### Open vragen

- [ ] Klikken verkeerd gelegde stukjes ooit vast, of alleen op de juiste plek? (Voorstel: alleen juiste plek.)
- [ ] Klassieke puzzelvorm voor alle niveaus, of rechthoeken bij 4 stukjes?
- [ ] Mag een kind zelf het aantal stukjes kiezen, of zet de ouder dat per kind vast?
- [x] Welke beloning werkt voor onze kinderen: stickerboek (zie hoofdstuk Beloning).
- [ ] Hoe oud zijn de kinderen precies? Dat bepaalt standaard snap-afstand en aantal stukjes.

### Mijlpalen

1. **Fase 1 – Basis:** profielscherm, spellenoverzicht, lokale opslag, als webpagina in de browser.
2. **Fase 2 – Puzzel speelbaar:** foto uploaden, rechthoekige stukjes, lade, canvas, vastklikken aan rand en buren.
3. **Fase 3 – Echte puzzel:** klassieke puzzelvormen, losse groepen, geluid, voltooi-animatie, tussenstand bewaren.
4. **Fase 4 – Ouderdeel en voortgang:** oudercheck, puzzelbeheer, voortgangsoverzicht per kind.
5. **Fase 5 – Mac-app:** verpakken met Tauri, volledig scherm, icoon in het Dock.
6. **Daarna:** volgende spellen op dezelfde spel-interface.

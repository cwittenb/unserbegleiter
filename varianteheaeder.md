# Handoff: Raumzuzweit — Pairing-App für Paare

## Overview
Raumzuzweit ist eine KI-gestützte Paarbegleitung (Invite-only Launch). Kernidee: **zwei Räume** — ein privater „Raum für mich" pro Person (Reflexion mit KI-Begleitung) und ein gemeinsamer „Raum für uns" (Qualitätszeit zu zweit, Geteiltes). Die App ist eine **Prozessbegleitung**: ein wiederkehrender Zyklus (Einzelreflexion → Erfahrungen teilen → Gemeinsame Session → Prozessreflexion/Aufdecken) um die gemeinsame Agenda in der Mitte.

Dieses Paket enthält die finalen Design-Referenzen (Turn 17 = konsolidierter Stand in `Raumzuzweit Design.dc.html`), das Navigations- und Prozessmodell, die Wachstumslogik der Kulisse und den Ton-/Begriffs-Leitfaden.

## About the Design Files
Die beigelegte Datei `Raumzuzweit Design.dc.html` ist eine **HTML-Design-Referenz** (Design-Dokument mit allen Iterationen; maßgeblich sind die Turns 17, 16 und 15 — neueste oben). Sie ist Prototyp, kein Produktionscode. Aufgabe: die Designs in der Zielumgebung nachbauen (React/Vue/SwiftUI/…, nach vorhandenen Patterns; falls noch keine Umgebung existiert, passendes Framework frei wählen). `support.js` ist nur die Runtime des Design-Tools — ignorieren.

## Fidelity
**High-fidelity** für Layout, Farben, Typografie, Abstände und Interaktionsmuster. **Texte sind Platzhalter mit richtiger Tonlage** — finale Copy entsteht in der Programmumgebung (i18n), siehe „Ton & Begriffe".

## Navigationskonzept
```
Startscreen  →  Vorraum (pro Raum)  →  Raum (Gespräch)
```
- **Startscreen**: reiner Wegweiser. Vollbild-Zweiteilung: oben Papier („Raum für mich"), unten Tiefgrün („Raum für uns"). Pro Raum genau EIN Eingang („Deinen/Euren Raum betreten"), keine Feature-Listen, keine Partner-Statusdetails (kein Wettbewerb).
- **Vorraum**: trennt visuell **„Der Raum"** (Gespräch mit Begleitung) und **„Das Regal"** (Informationen: Erfahrungen, Zeitleiste, Agenda, Geteiltes, Momente). Zwei Zonen mit eigenem Hintergrundton, Einträge flankieren die Trennlinie mit ↑/↓-Pfeilen.
- **Raum**: das Gespräch (Chat).

### Der Wegweiser (EN: **Guidepost**)
- Sitzt als grünes Badge (#8fae74, UPPERCASE, eckig) exakt **auf der Naht** zwischen den Hälften; Punkt im Badge = etwas wartet.
- Antippen öffnet ein Panel, das sich aus der Naht faltet (scaleY + opacity, ~300ms, cubic-bezier(.2,.8,.2,1)); Klick irgendwohin schließt.
- Inhalt: **nur Text, keine Links**, immer **2–3 Optionen** als Einladung mit Alternativen, z. B. „Betrete zunächst *Deinen Raum* für eine Reflexion." / „Oder plant Qualitätszeit in *Eurem Raum*." Serif, Raumnamen kursiv. Fußzeile klein: „tippen zum Schließen".
- Texte sind prozessphasenabhängig (im Code definiert / i18n).

## Screens (Referenz: Turn 17 im Design-Dokument)

### 17a/17b — Startscreen (light/dark), mobil 390×760+
- Card: zwei Hälften je `flex:1`. Light: oben #faf8f2 (Text #23291f), unten #1e2a22 (Text #eef0e7). Dark: oben #242b21 (Text #ece9da), unten #101b14 (Text #e6e9d9).
- **Kopfzeile (beschlossen, Referenz 19a):** oben mittig die Paar-Signatur „Christian & Lena" (11px, 600, letter-spacing **.34em**, uppercase, gedimmt #a3a894), Theme-Toggle ☾/☀ rechts daneben (absolut positioniert, damit die Signatur optisch mittig bleibt). Unten mittig als Gegengewicht die Wortmarke „raumzuzweit" in derselben Größe/Sperrung (#6f7d63). Die Marke ist damit Signet am Fuß, **nicht** Überschrift; es gibt keine zwei Versal-Etiketten mehr übereinander.
- **Symmetrie-Regel:** außen die Serif-Titel (oben H1-Begrüßung, unten H2 „Eure gemeinsame Zeit."), innen an der Naht jeweils Caps-Label + Betreten-Zeile. Beide Hälften haben dieselbe Bauform — nichts darf diese Achse brechen.
- Label „RAUM FÜR MICH" / „RAUM FÜR UNS" (11px, 600, ls .2em, uppercase, #7d9b62 / #9db08f) sitzt direkt über bzw. unter der jeweiligen Betreten-Zeile; H1 Begrüßung (Source Serif 4, 31px, 300, lh 1.16).
- **Gespiegelt an der Naht**: „Deinen Raum betreten ↑" als Hairline-Zeile (border-top 1px #e3dfd0 bzw. #39412f, Serif 20px) direkt über der Naht; „Euren Raum betreten ↓" (border-bottom 1px rgba(157,176,143,.28)) direkt darunter. Titel der unteren Hälfte („Eure gemeinsame Zeit.", Serif 26px) + Label sitzen an der Außenkante unten.
- Wegweiser-Badge mittig auf der Naht (an der unteren Hälfte verankert: absolute, left 50%, top 0, translate(-50%,-50%)).
- Benachrichtigung: runde Initial-Badge (22px, #8fae74, Initial des Empfängers, z. B. „L") an der Betreten-Zeile + Tooltip („Neue geteilte Erfahrung von Jonas"). **Keine Zähler.**

### 17c/17d — Vorräume, mobil
- Zwei Zonen: „Der Raum" oben (Grundfarbe), „Das Regal" unten (mich: #f0ece0; uns: #141f18).
- Oben: Header (← zurück, Label zentriert), H1 „Der Raum." (Serif 32px) + 1-Zeilen-Beschreibung (13px, #8b917d / #8a9e7c). Einträge unten an der Zonengrenze: mich → Reflexionsgespräch, Auftragsklärung (mit 2px-Fortschrittsbalken #7d9b62 auf #e3dfd0, ohne Kapitel-Label); uns → Qualitätszeit, Gemeinsames Aufdecken (gesperrt: gedimmt + „wartet auf euch beide").
- Unten: Regal-Zeilen (Serif 19px, Hairlines) direkt unter der Grenze; H2 „Das Regal." + Beschreibung an der Außenkante unten. Gesperrtes/Leeres gedimmt (#a3a894) mit Zustandstext statt Pfeil.

### 17e — Reflexionsgespräch (Chat), mobil
- Keine Chat-Blasen. Begleitung: Label „BEGLEITUNG" (10px caps) + Serif 17px/300, lh 1.55, links, max-width 88%. Nutzerin: Instrument Sans 14.5px, rechtsbündig, Farbe #41562c (dunkelgrün), max-width 82%.
- Inline-Aktion der Begleitung als Hairline-Zeile: „Als Erfahrung ins Regal legen →".
- Eingabe: border-top Hairline, kursiver Serif-Platzhalter („Deine Nachricht …"), Mikrofon-Icon (Stroke 1.6, #7d9b62) + Senden-Quadrat 34×34 (#7d9b62, ↑).
- Gemeinsamer Chat (Qualitätszeit, siehe 9b): drei Stimmen, Namen als leise Caps-Marken, Platzhalter „Ihr schreibt hier gemeinsam …".

### 17f — Teilen-Flow
- Kette: Erfahrung im Regal (10a) → Teilen-Vorschau (17f) → Empfang im gemeinsamen Regal (10c) → Bestätigung (12b).
- Teilen-Vorschau: dunkelgrüner Block zeigt **exakt** den Text, den der Partner sieht („nicht mehr, nicht weniger"). Optionen als Zeilen: „So teilen" / „Mit der Begleitung überarbeiten" / „Doch nicht — zurück ins Regal". Fußnote kursiv: „Du entscheidest, was du teilst — und wann."
- Bestätigung: grünes Badge „Geteilt." auf der Naht, beide Rückwege (↑ mein Raum / ↓ euer Raum, beide in hellen Tönen).

### 17g — English
- Room for me / Room for us · Enter your room / Enter our room · Wegweiser = **Guidepost** · „Your time together."

### Weitere Screens (frühere Turns, gleiche Regeln)
- Onboarding-Zyklusgrafik (5a, als erweiterte Hilfe): Kreis mit 4 Stationen, Agenda im Zentrum, Legende einzeln/Übergabe/gemeinsam.
- Landing Desktop + mobil (11a/12a): Hero mit vertikaler/gestapelter Naht, „Nur auf Einladung"-Badge auf der Naht, Zyklus-Sektion, Regel-Sektion (3 große Serif-Zeilen), E-Mail-Signup, Footer (Impressum/Datenschutz/Kontakt).
- Desktop-Layouts (8d, 9c/9d, 11b): vertikale Naht, Spiegelung horizontal, Chat als ruhige 640px-Mittelspalte.
- Einstellungen (12d): Sprache, Erscheinungsbild, sanfte Erinnerungen, Einladung, Datenzusage.

## Marke, App-Icon, Favicon (Referenz Turn 20)
- **Wortmarke**: „raumzuzweit", Instrument Sans 600, uppercase. Der **Schnitt** (Naht) läuft waagerecht durch die Mitte der Schrift: obere Hälfte #23291f auf Papier #faf8f2, untere #eef0e7 auf Tiefgrün #1e2a22. Umsetzung: ein Container mit `background:linear-gradient(#faf8f2 50%,#1e2a22 50%)`, darin eine transparente Textkopie für die Breite und zwei deckungsgleich absolut positionierte Kopien mit `clip-path:inset(0 0 50% 0)` bzw. `inset(50% 0 0 0)` (identische font-size/line-height/letter-spacing — sonst klaffen die Hälften).
  - Groß (Landing/Login): 26px, ls .24em, line-height 58px, Padding 0 16px
  - Mittel (Kopfzeile): 15px, ls .26em, line-height 34px, Padding 0 12px
  - Klein (Fuß, E-Mail): **ohne Schnitt**, 11px, ls .34em, einfarbig #5c6653
- **App-Icon**: Quadrat, obere Hälfte Papier, untere Tiefgrün, dazu ein zentrierter Akzent-Strich (#8fae74) auf der Naht = Wegweiser. Alternativen: nur der Schnitt (ohne Zeichen), geteiltes Serif-Monogramm „rz", Seerosenblüte auf dem Schnitt.
- **Favicon-Regel**: ab 32px mit Wegweiser-Strich; bei 16px nur die halbierte Fläche. Monogramm/Blüte erst ab 48px.
- **Auf dunklem Grund**: gleiche Geometrie, obere Hälfte #eef0e7, untere #101b14, Strich unverändert #8fae74.

## Kulisse (Silhouetten) & Wachstumslogik
Flache SVG-Silhouetten, sehr leise (Opacity .1–.3), immer hinter dem Inhalt, `pointer-events:none`, in eigenem Clipping-Container:
- **Light Theme = Bäume** (Dreiecks-Silhouetten + Stamm, #7d9b62): einer am unteren Rand (vorn, dunkler), einer auf dem geschwungenen Bogen (hinten, kleiner, heller) → Tiefe.
- **Dark Theme = Seerosenteich von oben** (#8fae74): Blüten radial, 2 Lagen à 12 kurvige Blätter (innere 62 %, um 15° versetzt), weiche Kanten mit spitzen Enden (Pfad `M0 -3.5 C -3 -7.2 -3.2 -13.6 0 -19 C 3.2 -13.6 3 -7.2 0 -3.5 Z`), Blütenkelch (Kreis + 6 Staubpunkte); Schwimmblätter = Kreis mit schmaler Kerbe (~16°); Wasserringe laufen **unter** Blättern/Blüten durch (SVG-Maske).
- **Ort pro Screen fest** (nie zufällig, nie oben+unten zugleich): Start → auf der Naht; Vorräume → unten im Regal-Bereich.
- **Wachstum** (kein Erfolgsstatus, keine Zähler — die Kulisse altert wie ein Garten):
  - Onboarding-Meilensteine: Auftragsklärung begonnen → Knospe (6 Blätter) · gemeinsam aufgedeckt → erste Blüte (12) · Ziele definiert → erstes Blatt dazu.
  - Danach rein zeitbasiert, logarithmisch: neues Element nach Woche 1, 2, 4, 8, 16 …, Deckel ~7 Elemente.
  - Räume wachsen getrennt: Mein Raum (Bäume) ← eigene Sessions · Euer Raum (Teich) ← gemeinsame Sessions + geteilte Erfahrungen.

## Interactions & Behavior
- Wegweiser: öffnen per Tap aufs Badge, schließen per Tap irgendwo; Panel überdeckt Inhalt (Overlay), schiebt nichts weg.
- Gesperrte Einträge (z. B. Gemeinsames Aufdecken): gedimmt, Zustandstext statt Pfeil, nicht klickbar.
- Sprache: positiv, einladend, nie To-do/Druck; Einladungen haben immer Alternativen (inkl. „Heute nicht").
- Theme-Toggle ☾/☀ im Header; beide Themes vollständig spezifiziert.

## State Management
- Prozessphase (Onboarding-Schritt / laufender Zyklus) → steuert Wegweiser-Texte, Sperrzustände, Kulissen-Stufe.
- Pro Raum getrennter Wachstumszähler (Sessions bzw. gemeinsame Sessions + Shares) → Kulissen-Elemente (logarithmisch, gedeckelt).
- Neues im gemeinsamen Regal → Initial-Badge an „Euren Raum betreten" + Punkt am Wegweiser.
- Theme (hell/dunkel/auto), Sprache (de/en).

## Design Tokens
**Farben**
- Papier: #faf8f2 · Papier-Regal: #f0ece0 · Hairline hell: #e3dfd0 / #ddd8c6
- Tiefgrün (Raum für uns): #1e2a22 · Dunkel-Regal/Footer: #141f18 · Dark-Papier: #242b21 · Dark-Tiefgrün: #101b14 · Dark-Hairline: #39412f
- Akzent/Badge: #8fae74 (Text darauf #14201a) · Akzent hell: #7d9b62 · Pfeile dunkel: #a9c88b
- Text: #23291f (hell) / #eef0e7, #e6e9d9 (dunkel) · Sekundär: #6b7261, #8b917d / #b9c3ac, #8a9e7c · Gedimmt: #a3a894 · Labels dark: #aeca8d, #9db08f · Nutzerin im Chat: #41562c
**Typografie**
- Serif: Source Serif 4 (300/400) — Titel, Zeilen-Labels, Begleitung, Wegweiser-Optionen
- Sans: Instrument Sans (400/500/600) — UI, Labels, Fließtext
- Caps-Labels: 10–12px, 600, letter-spacing .16–.2em, uppercase
- H1 mobil 30–34px, Zeilen 19–21px, Fließtext 13–14.5px, Chat-Begleitung 17px
**Sonstiges**
- Keine Border-Radii außer: runde Initial-Badges (50 %) und Kulissen-Formen. Keine Schatten, keine Panels — Hairlines (1px) strukturieren.
- Mindest-Hitziele mobil 44px (Zeilen-Padding 15–17px vertikal).

## Ton & Begriffe (verbindlich)
- **Begriffe DE**: Raum für mich / Raum für uns · Vorraum · Der Raum / Das Regal · Wegweiser · Naht (intern) · Auftragsklärung · Aufdecken · Agenda · Einzelreflexion · Qualitätszeit · Geteiltes · Gemeinsame Momente · Prozessreflexion.
- **Begriffe EN**: Room for me / Room for us · **Guidepost** (nicht Signpost/Pathways).
- **Schlüsselsätze**: „Was in deinem Raum bleibt, bleibt bei dir." · „Geteilt wird nur, was du bewusst teilst." · „Ihr seht immer genau, was der andere sieht." · „Einfach nur lesen ist auch okay."
- **Regeln**: begleiten, nicht führen — Einladungen statt Aufgaben, immer mit Alternativen; keine Partner-Detailinfos (kein Wettbewerb); kein Erfolgsstatus-Vokabular, keine Streaks/Zähler; positiv formulieren, nie angstgetrieben.
- Finale Copy + alle Zustandstexte in i18n der Zielumgebung pflegen.

## Assets
Keine externen Assets. Kulissen-Silhouetten und Mikrofon-Icon sind inline-SVG (Quellcode in der Design-Datei). Fonts via Google Fonts: Source Serif 4, Instrument Sans.

## Files
- `Raumzuzweit Design.dc.html` — Design-Dokument, alle Iterationen; maßgeblich Turn 20 (Marke/Icon), Turn 19 (Kopfzeile, **19a beschlossen**), Turn 17 (Screen-Familie), Turn 16 (Kulissen-Wachstum + Spez-Karte 16e), Turn 15 (Kulissen-Platzierung), Turn 11/12 (Landing, EN, Einstellungen), Turn 9/10 (Chat, Teilen-Flow), Turn 5 (Zyklusgrafik).

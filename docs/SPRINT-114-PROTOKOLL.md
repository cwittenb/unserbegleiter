# Sprint 114 — Design- und Textschnitte (Vorräume, Session, Einstieg)

**Basis:** `origin/main` @ `cc610e4` (patch-s113-audit)
**Kern-Hash nach Build:** `233a9f38435e876f`
**Suite:** 251 Dateien, 2376 Tests grün
**Ceremony:** Voll (Logik- und Layoutänderungen; die Textschnitte allein wären Light-Lane gewesen, laufen hier aber im selben Patch mit)

---

## 1. Was der Sprint gelöst hat

Drei der sechs Design-Befunde hatten dieselbe Wurzel: **eine Regel, die an zwei Orten getroffen wird, driftet auseinander.** Das ist kein Zufall dieses Sprints — es ist das Muster, das S105.6, T2d und T2g schon einmal je zur Hälfte behoben haben.

| Befund (Meldung) | Ursache | Schnitt |
|---|---|---|
| Label „Begleitung" springt beim Laden ein | `renderMsgs()` baute die Warte-Blase **nackt**, `baueStreamBlase()` baute sie mit Label. S105.6 hatte nur den zweiten Ort behandelt. | S114.6: eine gemeinsame `haengeAnSprechgruppe()`; die Entscheidung steht jetzt einmal |
| Wegweiser in der Session öffnet nach unten, ohne Inhalt | Die Desktop-Regel `.rz-weg-panel{top:50%;width:200%}` stand **ohne** `.rz-split` davor und traf damit auch `#scrChat`. Dort gibt es keine senkrechte Naht: Das Panel rutschte auf halbe Höhe der Schreibkante — also aus dem Bild — und wurde doppelt so breit. | S114.9: Regel auf `.rz-split` verengt |
| Wegweiser öffnet erst in der Spalte, dann über die Seite | Zwei gleich spezifische Breitenregeln; die Reihenfolge entschied, und die Breite wechselte mitten in der Bewegung. | S114.10: die Normalfall-Regel steht hinter der Ausnahme und gewinnt |
| Rechte Spalte klebt am Wegweiser | Der Nahtabstand war einseitig: links `--rz-nahtfrei` (T2b), rechts nur die 30px Zonenpolster. | S114.11: beide Flanken lesen denselben Token |
| Waagerechte Bildlaufleiste über der Naht | `overflow-y:auto` macht die andere Achse implizit zu `auto` (`visible` ist mit `auto` nicht kombinierbar). Jeder waagerechte Überlauf legte die Leiste an den unteren Rand **dieser Zone** — direkt über der Naht. Die Abfangregel `.rz-app #scrChat{overflow-x:clip}` sitzt eine Ebene höher und wurde nie erreicht. | S114.12: `overflow-x:clip` dort, wo tatsächlich gerollt wird |
| Accordion-Pfeil verkehrt | D12-2b las den Pfeil als **Ortsangabe** („die offene Zeile trägt den Weg nach oben"). | S114.7: der Pfeil zeigt die **Bewegung** — geschlossen ↑, offen ↓ |
| Wegweiser bei offenem Regal klickbar | Nur `z-index` war geregelt, nicht die Bedienbarkeit. | S114.8: `pointer-events:none` **und** `disabled` (CSS allein ließe die Tastatur durch); ein offenes Panel wird geschlossen |
| „Raum für uns" hing im Zonenfuß | Das Ortsetikett stand unter dem Spaltentitel statt an seiner Zeile. | S114.11a: neues `.rz-caps-unter` als Spiegel zu `.rz-caps-ueber` |

## 2. Textschnitte

**Vorräume:** `zone.raum` war ein Titel für zwei Räume. Jetzt `zone.raumMein` („Raum für dich.") und `zone.raumTeil` („Raum für euch."). Introtexte beider Räume neu; `mein.intro` kommt ohne `{partner}` aus.

**Boxen:** Jede Box wiederholte die Regalzeile, die sie geöffnet hat. Die Überschriften sind entfallen, an ihre Stelle treten Hilfetexte (`agenda.hilfe`, `zeitleiste.hilfe`). Im Regal „Geteiltes" ist die Fußnote (`regal.intro`) in die Einleitung am Kopf aufgegangen — eine Erklärung statt zweier an beiden Enden des Kastens; die Einleitung spricht das Paar jetzt direkt an, statt beide Namen zu nennen. „Agenda ansehen" heißt „Gemeinsamer Fokus".

**Einstieg des Reflexionsgesprächs** (`prompts.de.js` / `.en.js`, beide Zweige): Kalter Start fragt nach dem, was gerade da ist, und schließt mit „Hier gilt: …"; die Wiederkehr knüpft an die letzte Reflexion an und behält „Wie immer: …".

> **Konflikt, der dabei aufzulösen war:** Der Wiederkehr-Zweig verlangt einen generierten Anker, und die MERKPOSTEN-Regel erklärt genau die generische Form („Wollen wir an deine letzte Reflexion anknüpfen?" ohne Themennennung) ausdrücklich zum **Verstoß**. Der gewünschte Wortlaut ist diese Form. Auflösung: Der neue Wortlaut steht als **STANDARDFASSUNG** für den Fall, dass kein konkreter Anker vorliegt; darüber steht als **VORRANG**, dass ein vorhandener Merkposten im Wortlaut zu nennen ist. Ohne diese Staffelung hätte der Eval-Judge den eigenen Prompt geschlagen.

## 3. Die alte Optik

Der Befund war breiter als die Meldung: `.pb-btn` — Pille mit vollem Radius, Akzentrahmen, bei `.primary` eine gefüllte Fläche — saß in der Agenda, im Regal, in den Kapitel-Panels, an den Auswahl-Karten beider Sessions und im Kernwetten-Werkzeug. Also ausgerechnet dort, wo die Oberfläche sonst in Haarlinien spricht.

**Entscheidung (selbst getroffen):** zentrale Umdefinition statt Umbau der Aufrufstellen. Dieselben Klassen, neue Gestalt — ein Schnitt in `design.js` statt ~40 Änderungen in fünf Dateien. Das hält die Testbindungen an Klassennamen intakt und macht den Schnitt an einer Stelle nachlesbar.

Nach S93-Grammatik: **Rahmen = Handlung** (`.pb-btn` flach und kantig wie `.rz-knopf-flach`), **Haarlinie = Navigation und Auswahl** (`.pb-item`, `.rz-blockknopf`, `.pb-platz`). `.primary` betont über die **Kante**, nicht über die Fläche — eine gefüllte Fläche wäre in einer Oberfläche aus Linien der lauteste Ton überhaupt. Die Agenda-Gruppen gliedern über Caps-Köpfe statt über Kästen; die 4px-Akzentkante der Ziel-Gruppe ist entfallen (sie steht ohnehin zuerst und trägt ihren Namen). `.pb-card` behält ihre Fläche, verliert Radius und Weichzeichner. Die Composer-Ikonen (Senden/Mic) sind unberührt — sie tragen eigene Regeln.

## 4. Selbst getroffene Entscheidungen

- **Tote Schlüssel entfernt statt behalten.** Der ursprüngliche Plan wollte `zone.raum`, `momente.titel`, `regal.intro`, `agenda.titel`, `zeitleiste.titel` als Schlüssel stehen lassen. Der S113-Wächter (Schlüssel ohne Aufrufer) hat das korrekt als totes Material gemeldet — sie sind fort.
- **Grammatik der Vorlage still korrigiert:** „eurem eigenem Raum" → „eurem eigenen Raum"; „gillt" → „gilt".
- **Kleines Du** (Projektstandard): „Raum für Dich." → „Raum für dich."; „Deine Partnerschaft" → „deine Partnerschaft".
- **Umlaute in `design.js`** durch `ae/oe/ue` ersetzt — die i18n-Kanarie verbietet deutsche Literale in UI-Dateien, und die neuen Kommentare hatten sie eingeschleppt. Eigener Fehler, vom Wächter gefangen.
- **„Oben/Unten" im Intro des gemeinsamen Raums** stimmt mobil; auf dem Desktop steht die zweite Hälfte rechts. Der Text bleibt wie gewünscht — eine ortsneutrale Fassung wäre eine eigene Entscheidung.

## 5. Angepasste Bestandstests

Neun Tests hielten den alten Zustand fest und wurden mitgezogen — jeweils mit Begründung im Test selbst, nicht bloß mit neuem Erwartungswert:

`chat-ux`, `d2-startscreen`, `d3-vorraeume`, `d8-vollbild-mitte-sprache`, `d12-2b-regal-chat` (Pfeilrichtung, Fußnote, Badge-Regel), `s41-vorraum`, `s44-feinschliff`, `t2d-desktop-anker`.

Neu: `tests/unit/s114-design-textschnitte.spec.js` (24 Tests) und drei Tests in `chat-stream.spec.js` für das Label im Ladezustand.

## 6. Offene Punkte

- **S114.9b (bedingt):** Falls der Wegweiser im Gespräch nach der Positionskorrektur immer noch leer wirkt, ist das ein eigener Befund — die Fehlposition erklärt den Eindruck bislang vollständig, geprüft ist es nur im Testlauf, nicht am Gerät.
- **S114.12:** Der Schnitt fängt die Leiste ab. Welches Element den waagerechten Überlauf **erzeugt**, ist damit nicht beantwortet — ohne Layout-Engine im Test nicht messbar. Kandidaten: die Aufdeck-Tafel (`.pb-tafel`, `align-self:stretch`) und die Panels im Verlauf. Wer das aufnimmt, misst am Gerät.
- **T2d-2** bleibt unverändert offen (Fluss-Inhalt lässt sich ohne Hüllelement nicht an eine Fensterposition heften).

# Sprint UX-1 · Copy (Light-Lane)

**Datum:** 11.11.2026 · **Basis:** `main` @ `bdf5dc6` (nach CR-2) · **Branch:** `ux1-copy`
**Bezug:** Code-Review 10.11.2026, Befunde U9, U11, U12, U18, U19 (U16 offen, siehe unten)

| Befund | Vorher | Nachher | Dateien |
|---|---|---|---|
| U9 · Karenz am Entscheidungspunkt | Nirgends stand, dass ein Einblick erst nach 30 Minuten sichtbar wird | Unter den Wegen im Freigabe-Panel und in der Ausschnitt-Auswahl: „{Partner} sieht es erst in 30 Minuten. Bis dahin kannst du es zurückziehen.“ Die Zahl kommt aus `KARENZ_MS` | `panels.js`, `auswahl-screen.js`, Wörterbuch |
| U11 · „Ein guter erster Schritt“ | erschien im eigenen Raum immer | offenes Gespräch → „Dein Reflexionsgespräch ist offen — du kannst dort weitermachen.“; „erster Schritt“ nur bei leerer Zeitleiste | `app.js`, Wörterbuch |
| U12 · „Nur auf diesem Gerät.“ | Ansicht, Sprache und Verlaufs-Einstellung liegen im Konto | „Für dich.“ / „… gilt für dich, auf allen deinen Geräten.“ | Wörterbuch |
| U18 · Sprachwahl doppelt | `.rz-nur-breit{display:none}` verlor gegen das spätere `.rz-sprachpaar{display:flex}`; „Deutsch / Englisch“ | Regel steht hinter der Sprachpaar-Regel; Sprachen heißen, wie sie sich selbst nennen („Deutsch / English“), auch in den Einstellungen | `design.js`, `client.js`, `einstellungen-screen.js` |
| U19 · Anführungszeichen | DE „…" (gerades Schlusszeichen), EN gerade Zeichen | DE „…“, EN “…” | Wörterbuch |

## Nicht umgesetzt — braucht eine Entscheidung

| Punkt | Warum offen |
|---|---|
| U9, Regal: „Zurückziehbar bis 21:40 Uhr“ | Der Test S96.3 hält fest: „ruhiger Zustand — keine Zeitangabe, keine laufende Zahl“ (D5). Eine feste Uhrzeit ist kein Countdown, aber eine Zeitangabe. Bleibt bei „Noch zurückziehbar“, bis entschieden |
| U16 · Glossar | Je Begriff ein Wort festzulegen ist eine Entscheidung über die Sprache des Raums, keine Copy-Korrektur |

## Tests

`tests/unit/ux1-copy.spec.js` (neu, 9) · `l3-wiedereinstieg` (Sprachnamen) angepasst · Suite 321 Dateien, 3367 Tests grün.

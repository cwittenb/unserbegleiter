# Sprint 29 — Design dokumentweit (überarbeitet, gegen echtes Repo verifiziert)

**Datum:** 6. Juli 2026 · **Basis:** dein aktueller `origin/main` `a15a34a` · **310 Tests grün** · **Kern-Hash `823f20bee7166f4f`**

## Was war das Problem

Die frühere S29 legte das Design in das Template von `createApp` — und `createApp` läuft erst **nach der Rollenwahl**. Einrichtung, Rollenwahl und Entwickler-Panel blieben ungestylt; das Design erschien erst, sobald man eine Rolle gewählt hatte.

## Fix: Design auf Dokument-Ebene

- **NEU `core/ui/design.js`** — `DESIGN_CSS` + `KULISSE_HTML` + `applyDesign(doc)`. `applyDesign` schreibt den `<style>`, die Kulisse und den Theme-Umschalter **einmalig beim Booten** in `<head>`/`<body>` (idempotent über `#pbDesign`).
- **`core/ui/app.js`** — Design-Teile raus (leben jetzt in `design.js`); `applyDesign` importiert und im Boot aufgerufen (idempotent, falls die Hülle es schon tat).
- **`platforms/artifact/main.js`** — `applyDesign(doc)` läuft **vor dem ersten Screen**. Einrichtung und Rollenwahl nutzen die Design-Tokens (milchige Karten, Serife, Theme-Hintergrund).
- **`platforms/artifact/dev-panel.js`** — die Panel-Karten sind jetzt transparent-milchig auf dem Theme-Hintergrund, wie der Chat.

Damit trägt **jeder** Screen ab Start dasselbe Theme, und der Umschalter oben rechts ist durchgehend da.

## Auslieferung & Verifikation

`patch-s29-design.mjs` schreibt vier Dateien (design.js neu; app.js, main.js, dev-panel.js ersetzt) und prüft vorab den erwarteten Ausgangszustand (frühere S29 in app.js) — idempotent. Verifiziert gegen einen **frischen Klon von `origin/main` a15a34a**: Trockenlauf, Byte-Abgleich aller vier Dateien identisch, Idempotenz, 310 Tests grün, Build → `823f20bee7166f4f`.

## Anwenden

Auf deinem aktuellen Stand einfach `node patch-s29-design.mjs` (Trockenlauf zuerst). Danach `npm test` (310 grün) und optional der Hash. Er ersetzt die frühere S29-Fassung — nichts doppelt anwenden.

## Kette

S25 · S26 · S27 · **S29 (dokumentweit)** — alle committet bzw. gegen dein echtes Repo geprüft. **S28 entfällt** (dein `einzelSys` hat das Kapitel-System bereits).

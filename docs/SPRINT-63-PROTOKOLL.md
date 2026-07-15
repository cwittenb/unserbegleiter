# Sprint S63 — Fortsetzen-Zustand der Gemeinsamen Auflösung

**Basis:** `origin/main` @ `8ed1098` (patch-s62-aufdeckrunde-feinschliff) · **Kern-Hash nach Build:** `9966c568ec7a6bc3`
**Quelle:** Finding vom Testrun-Abschluss (Vertagung an der PAUSENMARKE): Nach dem Verlassen der pausierten Gemeinsamen Auflösung zeigte der Vorraum weiter die Start-Fassung (Wegweiser „Startet eure Gemeinsame Auflösung …", Button „… beginnen", Start-Subtext) — der Pausiert-Zustand war unsichtbar, obwohl Auftragsklärung (S53) und Qualitätszeit das Muster längst haben.
**Patch:** `patch-s63-aufloesung-fortsetzen.mjs`

## Änderungen

**Lagebild (`core/ui/app.js`, `ladeLage`).** Neuer Zustand `aufloesungOffen`: Der geteilte Chat `gemeinsam` wird mitgeladen; offen heißt begonnen (Nachrichten liegen), `status: "running"`, kein Befund (`findings`). Der Befund schlägt den Chat-Status — liegt er, ist nichts mehr offen.

**Wegweiser (`wegKandidaten`).** Auf Startseite und im Gemeinsamen Raum neue Stufe-1-Zeile („Begonnenes fortsetzen"): `weg.aufloesungOffen` — „Eure Gemeinsame Auflösung im gemeinsamen Raum ist offen — ihr könnt genau dort weitermachen." Solange offen, weichen die Stufe-2-Start-Zeile (`weg.aufloesungStart(MitAufdeck)`) und die Fehlt-Zeilen; nach dem Befund verschwindet wie bisher alles (S44-Verhalten unverändert).

**Button & Subtext (`wendeLageAn`, Muster S53 `btnEinzel`/`btnMoment`).** Bei offener Session heißt der Button „Gemeinsame Auflösung fortsetzen" (`teil.gemeinsamWeiter`), und der S62-Subtext wechselt zu „Ihr macht genau dort weiter, wo ihr pausiert habt." (`teil.gemeinsamWeiterSub`) — die Start-Formulierung („Startet gemeinsam mit der Auflösung eurer Spekulationen …") erscheint nur vor dem ersten Betreten. Gate-Verhalten (gesperrt → Hinweis statt Subtext) unverändert.

**i18n (`core/i18n/de.js`/`en.js`).** Neue Schlüssel `teil.gemeinsamWeiter`, `teil.gemeinsamWeiterSub`, `weg.aufloesungOffen` mit englischer Parität.

Kleine Entscheidung (angekündigt): Subtext-Wortlaut im Fortsetzen-Zustand = „Ihr macht genau dort weiter, wo ihr pausiert habt."

## Tests

**Neu:** `tests/unit/s63-aufloesung-fortsetzen.spec.js` — 5 Tests: Startseite zeigt Fortsetzen- statt Start-Zeile; Gemeinsamer Raum wechselt Wegweiser, Button-Label und Subtext; unbegonnener Zustand bleibt S62-identisch; nach dem Befund weder Fortsetzen- noch Start-Zeile (auch bei noch `running` gespeichertem Chat — Befund schlägt Status); Wiedereintritt über den Button landet im stehenden Verlauf.

## Verifikation

- Voller Testlauf **grün**: 581 Strukturtests + 20 Engine/Mock + 87 Worker = **688 Tests** (Basis 683 + 5 neue).
- `npm run build` grün, Kern-Hash `9966c568ec7a6bc3`.
- Patch-Verifikation auf frischem Klon: dry-run → apply → Idempotenzlauf → Byte-Vergleich → Tests → Build.

## Kontext

Inhaltlich stand die Session korrekt an der PAUSENMARKE (nach Phase 2b); beim Fortsetzen folgen Ergänzungsfrage, Agenda & Auftrags-Probe mit Startwerten, ggf. konstitutive Divergenz, Nachbefragung und Befund. Check-in-Body-Map bleibt per Entscheidung im Backlog (zu weit vom Kernkonzept).

# Sprint S67 — Selbstfahrt: Vom veralteten Selbsttest zum E2E-System

**Basis:** `origin/main` @ `28e632e` (patch-s66-testabdeckung-eval-ausbau), 755 Tests grün
**Ergebnis:** **761 Tests grün** (650 Struktur · 20 Engine/Mock · 87 Worker/Miniflare · **4 E2E**) · Kern-Hash nach Build **`1acb7dc872bbf5db`** (geändert — Race-Fix in `core/ui/app.js`)
**Plan:** `SPRINT-67-PLAN-selbstfahrt-e2e.md` (genehmigt mit F1=ja, F2=alles, F3=Suite, F4=Vollstack sofort)
**Patch:** `patch-s67-selbstfahrt-e2e.mjs` · löst die S66-Vertagung **K1 (E2E)** ein

## Entscheidungen

| # | Entscheidung |
|---|---|
| F1 | Alte, duplizierte Vertragschecks des Selbsttests **ersatzlos gestrichen** (Single Source of Truth = Vitest; Drift-Beleg: „sieben Blocktypen" bei real zehn). Übrig: nur umgebungsspezifische Checks (Storage-Roundtrip, Kern-Hash-Stempel, LLM-Konfig). |
| F2 | **Beide Journeys** umgesetzt: Solo-Smoke UND Aufdeckung (Szene `freigaben-da` → Tafel → Frage-vor-Beobachtung). |
| F3 | E2E läuft **in der normalen Suite** (`tests/e2e/`, jeder `npm test`; Worker-Test-Muster: esbuild in-memory). |
| F4 | **Pages-Vollstack sofort**: echter Worker (Miniflare) + gebauter Client, komplette Kette Magic-Link → Enrollment → Cookies → Boot → Solo über `/api/llm` (SSE) → KV-Persistenz. |
| K1 | Journeys fahren in **isolierten Welten** (verstecktes Wurzelelement + In-Memory-Store + Drehbuch-fetch) — kein dump/wipe/reboot, Entwicklungsdaten und laufende App bleiben unberührt; das main.js-Wiring beweist Ebene C am gebauten Bundle. |

## Zwei echte Funde der neuen Ebene (im Sprint gefixt)

**Fund 1 · Schnell-Klick-Race (`core/ui/app.js`).** Das Screen-Gerüst ist klickbar, BEVOR `boot()` `state.info` gesetzt hat — ein schneller Raumwechsel (langsames Netz!) traf `state.info.name/role` als null → Fehlerbox statt Wegweiser, `startChat` scheiterte. Fix: Selbstheilung `if (!state.info) state.info = await backend.info()` in `ladeLage()` und `startChat()`. Gepinnt durch Regressionstest mit künstlich verlangsamtem `backend.info` (`selbstfahrt-quelle.spec.js`). Genau die Fundklasse, für die die Selbstfahrt gebaut wurde — happy-dom-Strukturtests konnten sie nie sehen.

**Fund 2 · Klick-in-den-Stream (Treiber-Härtung).** Antwort-Text rendert schon WÄHREND des Streams; ein Klick in die `state.warten`-Phase wird verschluckt (btnSend disabled). Treiber-Regel `warteSendbereit()` vor jedem Senden; 5/5 Läufe stabil. (Kein App-Bug — dokumentierte UI-Semantik.)

## Änderungen

**`platforms/artifact/selbstfahrt.js` (neu, Herzstück).** DOM-Treiber (`warteAuf`, `klick`, `tippe`, `warteSendbereit`), In-Memory-`window.storage` (`speicherImSpeicher`), Drehbuch-fetch (`drehbuchFetch` — bedient api.anthropic.com aus einer Antwort-Queue und **protokolliert die Request-Bodies**: die Naht „was schickt die App dem Modell?" wird prüfbar). Journeys mit Sentinel-Marken `[SF…]` (Lehre: die Startseite grüßt selbst mit „Schön, dass du da bist" — Kollision mit UI-Texten). `fahreSelbstfahrt()` → Bericht + `window.__PB_SELBSTFAHRT__` + Konsolen-Sentinel; `berichtAlsText()` für devIO.
- **Journey 1 · Solo-Smoke:** Boot → Mein Raum → Reflexionsgespräch → Auftakt-Steuertext ging ans Modell → Senden → Antwort gerendert → Composer geleert → Chat persistiert.
- **Journey 2 · Aufdeckung** (deterministisches Gegenstück zu AUFD-01): Szene `freigaben-da` → Auflösung → Bereitschafts-Frage ohne Tafel → `[[REVEAL-B]]` → Tafel-Karte mit Weiter-Knopf → REVEAL-SHOWN geht erst NACH dem Klick raus (S62-Dramaturgie), genau einmal, Marke in der Anzeige gesäubert → Frage vor Beobachtung. (Prüf-Artefakt-Lehre: nur `messages` prüfen — der System-Prompt selbst erklärt REVEAL-SHOWN.)

**`platforms/artifact/local-backend.js` (neu).** `localBackend` aus main.js extrahiert (byte-gleiches Verhalten, `doc` als Parameter) — von main.js und Selbstfahrt geteilt.

**`platforms/artifact/selftest.js` (umgebaut, F1).** Nur noch Umgebungs-Checks + Selbstfahrt; Kern-Verträge beweist ausschließlich die Vitest-Suite.

**`platforms/artifact/main.js`.** Importiert `localBackend`; `window.PAARBEGLEITUNG.selbstfahrt` exportiert; **Ebene B**: `#selbstfahrt` im Hash fährt die Journeys automatisch (maschinenlesbar — ein späteres Playwright/CI mit echtem Browser braucht keinen App-Code mehr).

**`core/ui/app.js`.** Race-Fix (Fund 1), zwei Zeilen Selbstheilung.

**`tests/e2e/selbstfahrt.spec.js` (neu, Ebene C).** Baut das Artefakt-Bundle per esbuild in-memory, führt das IIFE im happy-dom-Fenster aus: Boot-Wiring (Einrichtung → Rollenwahl), `__CORE_HASH__`-Ersetzung bewiesen, `#selbstfahrt`-Autorun → beide Journeys grün **im gebauten Produkt**.

**`tests/e2e/pages-vollstack.spec.js` (neu, F4).** Echter Worker + gebauter Pages-Client (fetch-Brücke mit Cookie-Jar): Admin legt Paar an → Magic-Token → Enrollment (Token aus der Adresszeile entfernt) → App-Boot über die Worker-API → Solo-Nachricht durch den echten `/api/llm`-Proxy (Upstream-SSE → neutrale SSE → gerendert) → Antwort im Worker-KV persistiert (Polling). Zweiter Fall: unbekannter Token → Fehlermeldung ohne Wiedereinstieg (S45-Design), voller Stack.

**`tests/unit/selbstfahrt-quelle.spec.js` (neu).** Dieselben Journeys gegen die Quell-Module (Stacks + Coverage) plus der gepinnte Race-Regressionsfall.

**`docs/SPRINT-PROTOKOLL-TEMPLATE.md`.** Checklisten-Zeile: UI-/Wiring-Sprints → Selbstfahrt fahren (Panel / `#selbstfahrt` / CI automatisch).

## Verifikation

- Voller Testlauf **grün**: 650 + 20 + 87 + 4 = **761 Tests** (Basis 755 − 1 alter Selbsttest-Anteil + 6 neue Dateien-Tests; Reporter führt „e2e" als eigene Familie)
- E2E-Stabilität: **5/5 Läufe grün** nach Treiber-Härtung
- `npm run test:coverage` grün — 76,0 / 67,1 / 80,7 / 78,9 (über den S66-Schwellen; Quell-Journeys decken app.js-Pfade zusätzlich)
- `npm run build` · Kern-Hash **`1acb7dc872bbf5db`**
- Patch auf frischem Klon: dry-run → apply → Idempotenz → Byte-Vergleich → Tests → Build ✓

## Ausblick

- Ebene B ist Playwright-ready: sobald CI einen echten Browser hat, genügt „öffne `…#selbstfahrt`, lies `window.__PB_SELBSTFAHRT__`" — echtes Scrolling (S62 F3) wird damit prüfbar, ohne App-Änderung.
- Journey-Kandidaten fürs nächste Mal: Auftragsklärung bis SCALE-Marker (Skalen-Widget-Kette), Qualitätszeit-CHOICE, Wiedereinstieg (S64-Steuertext) als Journey 3.

# Sprint 0 — Protokoll · Gerüst & Testframework

**Datum:** 2. Juli 2026 · **Stand:** paarbegleitung 1.0.0-s0

## Ergebnis: DoD erfüllt

| Kriterium | Befund |
|---|---|
| `npm test` läuft, ein Befehl, Familien-Zusammenfassung deutsch | ✓ (7 Tests, 2,9 s) |
| Rot ist beweisbar rot | ✓ — dreifach: (1) manueller Kanarien-Lauf brach mit Exit 2 und `✗ ROT`-Befund; (2) dauerhafter `framework.spec` führt das rote Fixture bei jedem Lauf kontrolliert aus und prüft Exit ≠ 0 UND dass der Fehlschlag aus dem Assert stammt (kein Startfehler); (3) Fixture nachweislich vom Hauptlauf ausgeschlossen |
| Miniflare/workerd läuft im Container | ✓ — echter Worker gebündelt wie im Deploy, Health-Endpunkt, KV-Bindung sichtbar, KV-Roundtrip |
| Beide Build-Ziele entstehen aus demselben Kern | ✓ — `dist/paarbegleitung-dev.html` (Single-File, Kern inlined, keine externen Skripte) und `dist/cloudflare/` (worker.js + wrangler.toml); Versionskonstante in beiden nachgewiesen (Vorstufe Paritäts-Wächter) |
| Laufzeit unter einer Minute | ✓ (2,9 s gesamt) |

## Bemerkenswertes aus dem Lauf

1. **Der Framework-Test hat sich zweimal selbst bewährt, bevor Fachcode existiert:** `--config false` und Reporter `basic` existieren in Vitest 4 nicht mehr — beide Male schlug der Kind-Lauf aus dem *falschen* Grund fehl (Startfehler statt Assert), und genau die Prüfung „Fehlschlag muss aus dem Assert kommen" hat das aufgedeckt. Diese Prüfung ist jetzt dauerhaft Teil von `framework.spec.js`.
2. **Container-Shell expandiert keine geschweiften Klammern** — Verzeichnisse werden im Weiteren einzeln angelegt (nur Werkzeug-Notiz, kein Code-Thema).

## Testinventar nach Sprint 0

- `tests/unit/framework.spec.js` — Test des Tests (2)
- `tests/unit/build.spec.js` — beide Build-Ziele, gleicher Kern (2)
- `tests/worker/boot.spec.js` — Worker-Boot, KV-Bindung, KV-Roundtrip (3)
- `tests/fixtures/absichtlich-rot.spec.js` — kontrolliertes Rot-Fixture (vom Hauptlauf ausgeschlossen)

## Nächster Schritt

Sprint 1 — Verträge als reine Funktionen: Marker-Dispatch, blockDef, alle Block-Schemas, Übergabe-Schema; Portierung der v0.29-Selbsttest-Fälle als Vitest-Fixtures plus neue Negativ-Fälle.

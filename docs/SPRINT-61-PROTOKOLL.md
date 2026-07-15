# Sprint S61 — Token-Statistik pro Paar

**Basis:** `origin/main` @ `62efa57` (patch-s60-mockdaten-wire-angleichung), 651 Tests grün (80 Dateien)
**Ergebnis:** 666 Tests grün (82 Dateien) · Kern-Hash `15537280b387a25c`
**Patch:** `patch-s61-token-statistik.mjs`

> Hinweis zur Nummer: Der Sprint war als S60 geplant; während der Umsetzung
> landete upstream `patch-s60-mockdaten-wire-angleichung` auf `main` (inkl.
> `docs/SPRINT-60-PROTOKOLL.md`). Die SHA-256-Ankerprüfung des Patches hat die
> Kollision erkannt (`dev-panel.js` abweichend, Protokolldatei belegt); der
> Sprint wurde auf die neue Basis rebased und als S61 nummeriert.

## Ziel

Echte Token-Messung (usage aus der Provider-Antwort, keine Schätzung — S55-Prinzip)
sichtbar und auswertbar machen:

1. **Cloudflare:** Token-Verbrauch pro Paar in der Paarliste von `admin.html`,
   mit Monatshistorie und JSON-Voll-Export.
2. **Artefakt-Umgebung:** laufender Token-Zähler pro Paar im Entwickler-Panel.

Der Adapter lieferte `usage {in, out, cacheRead, cacheWrite}` bereits für alle
Provider und beide Pfade (direkt + Stream) — die Werte wurden nur nirgends
festgehalten. S61 ist reine Erfassung + Anzeige, keine Adapter-Änderung.

## Entscheidungen

* **Nur Paar-Summe, bewusst KEIN Rollen-Split (bestätigt):** Ein Betreiberblick
  darauf, welcher Partner mehr nutzt, wäre ein Metadaten-Einblick in die
  Paardynamik — Datensparsamkeit gemäß Grundprämissen.
* **Best-Effort-Erfassung:** Ein Fehler beim Statistik-Schreiben blockiert nie
  die LLM-Antwort (Statistik ist Beobachtung, kein Vertragsbestandteil). Das
  ist kein stiller Konfigurations-Fallback im Sinne von S35d — es gibt hier
  nichts zu konfigurieren.
* **Read-Modify-Write im KV:** KV kennt kein atomares Increment; bei exakt
  gleichzeitigen Aufrufen von A und B kann theoretisch ein Zählschritt verloren
  gehen — für Statistikzwecke akzeptiert und hier dokumentiert.
* **Kosten bewusst NICHT im Worker:** Bepreisung erfolgt nachgelagert per
  Post-Eval-Skript auf dem JSON-Export (`/api/tokens`) mit `evals/preise.js`
  (`kostenFuer`). Der Worker bleibt frei von Preis- und Modellwissen (S35d);
  die Preistabelle bleibt Daten (`evals/preise.json`).
* **Stream-Pfad zählt NACH dem done-Event:** Die Statistik verzögert die
  Antwort nie.

## Datenmodell

```
KV (Worker):
  sys/tokens/<code>/total      { calls, in, out, cacheRead, cacheWrite, aktualisiert }
  sys/tokens/<code>/<YYYY-MM>  gleiche Struktur — Monats-Eimer (Historie)

Artefakt (geteilte Welt):
  PBDEV:tokens:<code>          gleiche Struktur (ein Stand je Paar-Code)
```

Die Akkumulation (`addiereUsage`) lebt EINMAL in `core/llm/usage.js` und wird
von beiden Formen benutzt — identische Struktur, getrennt beweisbar. Fehlende
usage-Felder (abgebrochene Streams, Provider ohne Cache-Angaben) zählen als 0;
der Aufruf zählt trotzdem (`calls`).

## Neue/geänderte Endpunkte (alle admin-gated)

| Endpunkt | Zweck |
|---|---|
| `GET /api/paare` | pro Paar zusätzlich `tokens: { total, monat }` (je `null`, wenn leer) |
| `GET /api/tokens` | Voll-Export: `{ stand, paare: { code: { total, monate } } }` — Grundlage fürs Post-Eval-Kostenskript |
| `GET /api/tokens/:code` | Historie eines Paars: `{ code, total, monate }` |

Routen-Reihenfolge beachtet: der exakte Pfad `/api/tokens` vor dem
Code-Muster `/api/tokens/:code` (Paar-Codes sind alphanumerisch).

## Oberfläche

* **`admin.html`:** neue Spalte „Tokens (Monat / gesamt)" (kompakt: `12,3k`,
  `1,23M`; Tooltip mit in/out/Cache-Aufschlüsselung und Aufrufzahl). Klick auf
  die Zelle klappt die Monatshistorie unter der Zeile auf (lädt
  `/api/tokens/:code`); Klick auf die übrige Zeile wählt wie bisher das Paar
  für Export/Relink. Neuer Knopf „Token-Export (JSON)" lädt `/api/tokens`
  als Datei herunter.
* **Entwickler-Panel (Artefakt):** neuer Abschnitt „Token-Zähler (echte usage,
  pro Paar)": Startwert aus dem Store (überlebt Reloads), Live-Aktualisierung
  über das DOM-Ereignis `pb:tokens`, Reset-Knopf. Der Zähl-Wrapper
  (`mitTokenZaehler`) umhüllt den Adapter signaturgleich in `localBackend`;
  Dump und Wipe des Panels erfassen den Token-Namensraum mit.

## Dateien

**Neu**

| Datei | Inhalt |
|---|---|
| `core/llm/usage.js` | `addiereUsage`, `leererStand` — die eine Akkumulationsquelle |
| `platforms/cloudflare/worker/tokenstat.js` | `erfasseUsage`, `leseTokenStand`, `leseTokenHistorie`, `leseTokenExport`, `monatsTag` |
| `platforms/artifact/token-zaehler.js` | `mitTokenZaehler`, `ladeTokenStaende`, `wipeTokenStaende`, `formatTokens` |
| `tests/unit/token-stand.spec.js` | Akkumulation, Wrapper (Durchreichen, Best-Effort, Rundlauf), Formatierung |
| `tests/worker/tokenstat.spec.js` | Miniflare gegen den deploy-gleichen Worker: direkt + Stream, `/api/paare`, `/api/tokens`, `/api/tokens/:code`, 401-Gates, leeres Paar |

**Geändert**

| Datei | Änderung |
|---|---|
| `platforms/cloudflare/worker/index.js` | Erfassung in beiden `/api/llm`-Pfaden; `tokens` in `/api/paare`; Routen `/api/tokens`(+`/:code`) |
| `platforms/cloudflare/pages/admin.html` | Token-Spalte, Monatshistorie, Export-Knopf |
| `platforms/artifact/main.js` | Adapter mit `mitTokenZaehler` umhüllt; `pb:tokens`-Ereignis |
| `platforms/artifact/dev-panel.js` | Panel-Abschnitt Token-Zähler; Dump/Wipe um `PBDEV:tokens:` erweitert (auf S60-Mockdaten-Stand rebased) |
| `tests/unit/dev-panel.spec.js` | Token-Abschnitt: Startwert, Live-Ereignis, Reset, Dump/Wipe-Reichweite |

## Verifikation

* Frischer Clone von `origin/main` @ `62efa57` → Basis 651 Tests grün (80 Dateien).
* Nach Implementierung: **666 Tests grün in 82 Dateien** (`npx vitest run`).
* `npm run build` → Kern-Hash `15537280b387a25c` (Artefakt, Cloudflare, Eval-Artefakt identisch).
* Patch-Verifikation auf frischem Clone: dry-run → apply → Idempotenz (zweiter
  Lauf ohne Änderung) → Byte-Vergleich gegen den Referenzstand → Tests → Build.

## Anschlussfähig (nicht Teil von S61)

* **Post-Eval-Kostenskript:** `GET /api/tokens` + `evals/preise.js` bepreisen;
  dafür muss das je Zeitraum aktive Modell bekannt sein (heute: `LLM_PROVIDER`/
  `<PROVIDER>_MODEL` des Deploys — bei Modellwechseln Zeitscheiben festhalten).
* Aufbewahrungs-/Löschregel für Monats-Eimer gelöschter Paare (derzeit bleiben
  `sys/tokens/*` beim Löschen eines Paars stehen — bewusst offen gelassen,
  Entscheidung bei der nächsten Datenhaltungs-Runde).

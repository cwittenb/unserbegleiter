# Sprint 27 — Protokoll · Umbenennung: interne Struktur lesbar machen

**Datum:** 6. Juli 2026 · **Stand:** 272 Tests grün (216 · 12 · 44) · **Kern-Hash NEU: `f5d03ae6c967f02a`** (vorher 5582167e)

## Anlass

„Fassung“ und „Regal-Hebung“ waren schiefe Wortschöpfungen; die Struktur sollte für den Entwickler in der neuen Vokabular-Entscheidung lesbar sein. Umbenannt wurden **interne** Bezeichner — **Prompt und Wire-Format bleiben ausdrücklich stabil**, um die über fünf Läufe erarbeitete Eval-Stabilität nicht anzurühren.

## Vokabular

| war | ist | wo es lebt |
|---|---|---|
| Fassung | **Selbstmitteilung** | die erarbeitete Ich-Aussage (GATE-BLOCK-Einheit) |
| Generalprobe | **Selbstoffenbarung** | Store-Schlüssel `selbstoffenbarungen` (Weg „selbst ansprechen“) |
| Regal-Hebung | **Einblick** | ein Item im Regal |
| (Agenda-Item) | **Thema** | ein Item auf der Agenda |

Regal, Agenda, Zeitleiste, Gate und der Zeitleisten-**Eintrag** behalten ihre Namen.

## Architektur-Entscheidung: Grenznormalisierung statt Wire-Umbenennung

Der GATE-BLOCK-Schlüssel heißt auf der Leitung **weiter `fassung`** — das Modell emittiert ihn so, das Schema validiert ihn so, alle Gate- und Schema-Tests laufen darum **unverändert** durch. Die neue Vokabel wird an **einer** Stelle eingeführt: der Gate-Block-Handler in `core/ui/sessions.js` übersetzt `data.fassung` → `{ selbstmitteilung, wunsch, wege }`. Ab dieser Grenze liest der gesamte interne Code (`quereGate`, `gatePanel`, Regal-/Agenda-/Selbstoffenbarungs-Items) die neue Vokabel. So bleibt der Prompt-/Wire-Vertrag stabil und der Code trotzdem kohärent lesbar. Das einzige verbleibende `fassung` im Code ist die Wire-Validierung im Schema (mit Mapping-Kommentar) und die eine Normalisierungszeile.

## Geändert (14 Anker-Edits, 9 Dateien)

- `core/store/bundles.js` — Pstate-Default `generalproben` → `selbstoffenbarungen`
- `core/ui/sessions.js` — Grenznormalisierung im Gate-Handler; `quereGate` schreibt `selbstmitteilung` in Regal/Agenda/Selbstoffenbarung; Store-Schlüssel + Kommentare
- `core/ui/app.js` — Gate-Panel: Wege „Selbst ansprechen / Ins Regal legen (Einblick) / Auf die Agenda (Thema)“, Label „Deine Selbstmitteilung zur Freigabe“, Anzeige `data.selbstmitteilung`
- `core/contracts/registry.js` — Block-Platzhalter
- `core/contracts/schemas.js` — Mapping-Kommentar am Wire-Feld `fassung`
- `platforms/cloudflare/worker/index.js` — PSTATE_FELDER-Whitelist
- `platforms/artifact/dev-panel.js` — Mock-Store + Szene „Einblick“
- `tests/unit/bundles.spec.js`, `tests/unit/dev-panel.spec.js` — angepasst

## Bewusst NICHT geändert

Der Prompt (`core/prompts/prompts.js`): soloSys spricht weiter von „Fassung“, der GATE-BLOCK-Schlüssel bleibt `fassung`, momentSys nennt „Regal-Hebungen … Einblicke“. Das war die ausdrückliche Vorgabe (interne Begriffe müssen nicht wörtlich im Prompt stehen) und schützt die Eval.

## Hinweis persistierte Daten

Bereits gespeicherte `generalproben`-Einträge verwaisen (neuer Schlüssel `selbstoffenbarungen`). In der Testphase unkritisch; bei echten Daten wäre eine einmalige Migration nötig.

## Auslieferung

`patch-s27-umbenennung.mjs` — 14 Anker-Edits, 9 Dateien; setzt S26 (`5582167e`) voraus → ergibt `f5d03ae6`. Verifiziert: Vor-Stand rekonstruiert, Trockenlauf 14/14, Byte-Abgleich aller 9 Dateien identisch, Idempotenz 0 Fehler.

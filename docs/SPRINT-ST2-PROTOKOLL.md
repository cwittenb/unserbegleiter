# Sprint ST2 — Protokoll · Struktur-Modus für solo + moment (Übersetzungs-Präambel)

**Datum:** 1. August 2026 · **Basis:** `2621ac9` (ST1 auf main) · **Track:** ST (ST1 ✓ · **ST2** · ST3 GATE+Kernwetten · ST4 Umschaltung)
**Stand:** 2213 Tests grün (Basis 2204 + 9 neu, 230 Dateien) · Kern-Hash NEU `db2620a30479d769` · Build grün (Artefakt/Pages/Eval)

## Die Architektur-Entscheidung dieses Sprints (Eigenentscheidung, ausführlich begründet)

Der Plan sah die In-Place-Migration der WIE-Passagen im Prompt-Korpus vor. Die Korpus-Lektüre zeigte: **WANN und WIE sind satzweise verwoben** (Beispiel Kapitel-Mechanik: Anlass, Würdigungslänge und Markenformat in EINEM Satz) — jede Chirurgie riskiert eval-gehärtete Regeln, doppelt bei DE/EN. Deshalb umgesetzt: **Übersetzungs-Präambel statt Korpus-Chirurgie.**

- Der Korpus bleibt **byte-identisch bis auf einen append-only Export** (`strukturTexte`, +15/+16 Zeilen, git-diff-beweisbar reine Insertions).
- Eine aus der SessionDef **generierte** Präambel (`core/prompts/struktur-praeambel.js`) lehrt die Abbildung: „Marke [[X]] allein in der letzten Zeile" → `marker:"X"` · „X-BLOCK … END X-BLOCK mit JSON" → `block:{typ,daten}` — **"daten" ist dasselbe JSON**, die gesamte Feld-Dokumentation des Korpus gilt wörtlich weiter. Marken-Liste und Block-Tabelle stammen aus `def.markerOrder`/`def.blocks` und können nicht von der Registrierung abweichen.
- **Rollback = eine Zeile** (`schalteStruktur(…)`-Aufruf entfernen). **Benannter Fallback**, falls Sonde/GATE die Indirektion verwerfen: die ursprünglich geplante Voll-Migration.
- Gleicher Mechanismus trägt ST3 (kernwetten): dort ist dann fast nur noch Eval-Arbeit.

## Umgesetzt

1. **Präambel + Schalter:** `strukturPraeambel(def)`, `schalteStruktur(def)`; Sprachtexte in beiden Korpora (Parität per Test, inkl. Platzhalter-Parität).
2. **solo + moment AN** (`sessions.js`, je ein Wrapper-Aufruf). Kernwetten bleiben AUS bis zum ST3-GATE (per Test festgeschrieben).
3. **Renderer-Quittung (Produktions-Befund):** Im Struktur-Modus lebt der Block als Meta — die sichtbare Quittung (Registry-Platzhalter, z. B. „Dein Zeitleisten-Eintrag wurde gespeichert.") erschien nie, weil `cleanDisplay` nichts mehr zu ersetzen hatte. `chat-kern.js` hängt sie jetzt aus `m.block.typ` an; unsichtbare Blöcke (leerer Platzhalter) bleiben unsichtbar; Alt-Verläufe laufen weiter über `cleanDisplay`.
4. **MockLLM vertragsvollständig (der zentrale Hebel):** 49 Testbrüche entstanden, weil Text-Drehbücher auf den Strukturpfad trafen. Statt 49 Umschreibungen übersetzt der Doppelgänger bei structured-Aufrufen das Drehbuch mit den ECHTEN Legacy-Parsern (`findeMarker`/`findeBlock`/`parseBlock`, Registry) in `{data}`, markiert `strukturQuelle:"mock"` — Drehbücher bleiben lesbar, kein zweiter Parser. Def-Blockreihenfolge gewahrt (anyOf-Reihenfolge; S99.5: Abruf vor Zeitleiste). Semantisch ungültige Drehbuch-Blöcke laufen weiterhin in die Korrektur-Runde.
5. **Vier lokale Doubles auf Fassaden-Vertrag gehoben:** s99-7 (Engine-llm-Ersatz), s70 (steuerbares LLM), chat-stream (streamendes LLM), Selbstfahrt-Fetch-Drehbuch (antwortet auf `tool_choice` provider-gerecht mit `tool_use`), E2E-Upstream (`input_json_delta`-SSE + JSON-Form). **Damit beweist der Pages-Vollstack-E2E den Strukturpfad durchgängig:** Client (proxy) → echter Worker → Struktur-Übersetzung → Streaming → antwort-Extraktor → Engine-Dispatch.
6. **Telemetrie sichtbar (K2):** Statuszeile nach Batch-Muster (`struktur_rettung`/`struktur_korrektur`, i18n DE/EN; feuern nur keyless) + Abschnitt „Struktur-Telemetrie" im Entwicklungspanel (Live-Getter `holeStruktur` aus main.js auf `chat.struktur`).
7. **Klein-Sonde** `docs/probe-st2-strukturturn.mjs` (kein API-Key in der Implementierungs-Umgebung — **Ausführung liegt bei dir**): `ANTHROPIC_API_KEY=… node docs/probe-st2-strukturturn.mjs [--n=3] [--model=claude-sonnet-5] [--en]`. Drei choreografie-kritische Szenarien (Abschluss/TIMELINE mit echtem Abschluss-Wächter auf dem Text-Schatten · NOTE-Unsichtbarkeit · Gabelung-vor-Block bei Teilenwunsch), hartes Abbruchkriterium im Skript-Kopf; Exit 1 = nicht ausrollen, Fallback Voll-Migration.

## Bewusste Auslassungen / Beobachtungspunkte

- **Eval-Runner:** nutzt eigene Prompt-Komposition (`sysPromptFuer`) — das volle GATE über den Struktur-Pfad ist ST3-Kern, inkl. Runner-Anbindung an die Def-Präambel.
- **K3 (Steuer-Token):** Beobachtungspunkt bestätigt — S93-Filter bleibt Defense-in-Depth auf `antwort`; die Sonde prüft Echos mit (Leck-Kriterium).
- **Wächter nativ auf Turn-Felder:** weiterhin zurückgestellt; der Text-Schatten trägt.

## Nachbefund (vor Push behoben)

Der erste Lauf zeigte 3 Unhandled Rejections aus `ladeTokenStaende` — Ursache im NEUEN Panel-Spec: Der Store-Stub lieferte `{keys: []}`, der ArtifactStore-Vertrag ist aber ein ARRAY (`list` gibt `r.keys ?? []` zurück), und die Token-Initialisierung des Panels iteriert fire-and-forget direkt darüber. Stub auf `list: async () => []` korrigiert, Vertrag als Kommentar am Stub festgehalten; voller Lauf ohne Errors-Zeile.

## Verifikation

Frischer Clone `2621ac9` → 2213 grün → Build (Kern `db2620a30479d769`) → `git diff core/prompts/` = reine Insertions. Patch auf zweitem frischem Clone: Dry-run → Apply → Idempotenz → Byte-Vergleich → Suite → Build.

## Nächster Schritt (ST3)

Sonde ausführen (Abbruchkriterium beachten) → Eval-GATE über den Struktur-Pfad (Runner-Anbindung), dann Kernwetten via `schalteStruktur` + REVEAL-Sonde; j8-Regeln unberührt.

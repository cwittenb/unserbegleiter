# Sprint ST1 — Protokoll · Engine-Strukturmodus: Fundament (Flag AUS)

**Datum:** 1. August 2026 · **Basis:** `9d90f8d` (patch-s106-teilen-aus-verlauf) · **Track:** ST (Struktur-Migration, Bogen ST1–ST4 lt. Sprintplan)
**Stand:** 2204 Tests grün (Basis 2169 + 35 neu, 228 Dateien) · **Kern-Hash NEU: `6cc7662022b12a86`** · **Prompts byte-identisch** (git diff core/prompts/ leer)

## Einordnung und zwei Nummern-/Begriffs-Klärungen

1. **Track statt Nummer (Eigenentscheidung, U-Track-Vorbild):** Der Sprintplan sprach von S104–S107; zwischenzeitlich sind S104–S106 durch andere Sprints belegt und S107 („Empathie ohne Performanz") im S106-Protokoll reserviert. Der Migrations-Bogen heißt darum **ST1–ST4** (ST1 = Fundament, ST2 = Prompt-Migration solo+moment, ST3 = Eval-GATE + Kernwetten, ST4 = Umschaltung).
2. **Kern-Hash-Präzisierung (Plan-Korrektur):** Der Plan behauptete für den Fundament-Sprint „Kern-Hash unverändert". Das war begrifflich falsch — der Kern-Hash deckt ALLE core-Quellen, jeder Kern-Code-Sprint ändert ihn. Die GATE-relevante Invariante dieses Sprints lautet korrekt: **Prompt-Korpus byte-identisch + Flag AUS** → Modellverhalten unverändert. Beides ist nachgewiesen (git diff leer; Default `strukturTurn:false`, keine SessionDef setzt das Flag).

## Anpassungen an den zwischenzeitlichen Stand (S105/S106)

- **S105.3 (kein Text wird je zurückgenommen):** Der Struktur-Dispatcher übernimmt die neue Wächter-Semantik unverändert — `pruefeUebergabe` verweigert die ÜBERGABE, nie den Text. Damit die gewachsenen Wächter (Regex auf `hatBlock`, Marken in letzter Zeile, Stamm-Heuristiken) nicht alle sofort umgebaut werden müssen, erhalten sie einen **Text-Schatten**: die synthetisierte Legacy-Form des Struktur-Zugs (antwort + Block zwischen seinen Marken + Marke allein in der letzten Zeile). Übergangs-Konstruktion, fällt mit der nativen Turn-Sicht der Wächter in einem späteren ST-Sprint.
- **`schaerfe` (S105.3)** wirkt im Struktur-Modus identisch (Zusatz am Systemtext vor dem Aufruf).

## Gebaut (ST1.1–ST1.5)

1. **`core/contracts/schemas-json.js`** — deklarative JSON-Schema-Pendants aller 12 Block-datasets. Rollenteilung dokumentiert: JSON-Schema = Strukturzwang beim Provider; die imperativen Validatoren in `schemas.js` bleiben die semantische Wahrheit und laufen nach (Vertrag 2 unverändert). Bewusst locker, wo Semantik bedingt ist; `zeit` bildet die noContent-Weiche (S106.8) als anyOf ab.
2. **`core/contracts/turn-schema.js`** — `baueTurnSchema(def)` erzeugt je SessionDef das Turn-Werkzeug `{antwort, marker?, block?}` (Form der Sonde v2): marker als nacktes Enum aus `markerOrder` (Feld entfällt bei leerer Order — kleinstes Schema), block als nullable anyOf-Union `{typ: const dataset, daten}`. Tief eingefroren, byte-stabile Serialisierung (Cache-Treffer, S76-Muster). **Kanarienvogel:** Block ohne JSON-Pendant wirft beim Bauen — halbe Registrierungen fallen im Test auf, nicht im Betrieb.
3. **Engine (`core/engine/engine.js`)** — `def.strukturTurn:true` schaltet den Zug auf erzwungene Strukturausgabe: Adapter-Aufruf mit `{structured, onDelta, onStatus}` (Deltas sind der extrahierte Begleitertext, S79); Persistenz `{content: antwort, marker?, block?, strukturQuelle?}`; Dispatcher `_afterAssistantStruktur` in identischer Reihenfolge (Wächter → Marke → Block, Marke gewinnt); Vertrag 2 als `_blockCorrectionStruktur` mit feldbezogener Korrektur-Nachricht (`korrekturNachrichtStruktur` in block.js); `resume()` erkennt Struktur-Meta und dispatcht aus Feldern — Alt-Verläufe unverändert. **Telemetrie (K2-Entscheid):** `chat.struktur = {tool, gerettet, korrigiert, fehlgeschlagen}`, gepflegt aus `strukturQuelle`, den Statusereignissen und Adapter-Würfen. Ohne Flag ist der Pfad byte-identisch (per Test: Adapter wird positional gerufen, kein `chat.struktur`).
4. **Adapter (`core/llm/adapter.js`)** — (a) **R3-Wächter:** `structured` + `thinking≠disabled` bei anthropic → synchroner Klartext-Wurf VOR jedem Request (erzwungener Tool-Use schließt Extended Thinking aus; `LLM_THINKING=adaptiv` im Worker läuft damit in eine klare Meldung statt einen API-Fehler). (b) **keyless-Härtung:** `strukturQuelle:"text"` meldet `onStatus("struktur_rettung")`; fehlt jede Struktur (`code:"struktur_fehlt"`, neu am S85-Wurf samt Roh-Text), folgt GENAU EINE Korrektur-Runde nach dem Judge-KORREKTUR-Muster (eigene Antwort + `STRUKTUR_KORREKTUR`-Formforderung, `onStatus("struktur_korrektur")`), danach der harte Ursprungs-Fehler. NUR keyless — direct/proxy bleiben hart (dort ist ein Formfehler ein Defekt).
5. **Tests (35 neu):** `turn-schema.spec` (Form, Kanarienvogel, Einfrieren, byte-stabile Serialisierung), `schemas-json-paritaet.spec` (je dataset: JS-gültige Fixtures erfüllen das JSON-Schema; Mini-Validator mit eigenem Kanarienvogel; Registry-Vollständigkeit), `engine-strukturturn.spec` (Dispatch, Vertrag 2 genau einmal, Marke-vor-Block, Text-Schatten-Inhalt, resume, Statistik, Flag-AUS-Garantie), `adapter-strukturturn.spec` (R3 synchron, Rettungs-Ereignis, Korrektur-Runde inkl. Zweitkörper-Inhalt, kein drittes Mal, direct hart).

## Bewusste Auslassungen (mit Ort im Plan)

- **Keine SessionDef setzt das Flag** — das ist ST2 (Prompt-Migration); bis dahin ist der Code tot und folgenlos ausbaubar.
- **Entwicklungspanel-Anzeige der Zähler** folgt in ST2 mit dem ersten Flag-Nutzer (Artefakt-Testapps); die Daten (`chat.struktur`) und Ereignisse (`struktur_rettung`/`struktur_korrektur` über den bestehenden onStatus-Kanal) liegen bereit. *(Kleine Eigenentscheidung: Anzeige ohne Nutzer wäre totes UI.)*
- **Steuer-Token** bleiben Textmechanik (K3: befund-getriggert, Beobachtungspunkt in ST3/ST4).
- **Wächter nativ auf Turn-Felder** — erst nach ST2, wenn klar ist, welche Wächter im Struktur-Modus überhaupt noch Text brauchen.

## Verifikation

Frischer Clone `9d90f8d` → Implementierung → `npx vitest run`: **2204 grün** → `PAARE_KV_ID=… npm run build`: Artefakt + Cloudflare + Eval-Artefakt, Kern `6cc7662022b12a86` → `git diff core/prompts/` leer. Patch-Verifikation auf zweitem frischem Clone: Dry-run → Apply → Idempotenz (zweiter Lauf: alles „unverändert") → Byte-Vergleich gegen den Arbeitsstand → Suite → Build.

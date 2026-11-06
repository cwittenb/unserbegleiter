# Sprintprotokoll · MOD-4 — Session-Prompts als Templates (.md) + Slots

**Basis:** `main` nach Merge `mod-2c` (`245d16f`)
**Branch:** `mod-4` → Merge nach `main`
**Endstand:** **2736 / 187 / 26 / 4 grün** (+7), `npm run build` grün (jetzt mit `build-korpus.js --pruefe` als erstem Schritt)
**Kern-Hash:** `934f9f03d4f74f4b`
**Entscheidungen:** E2 b (`.md` mit `{{…}}` + Build-Schritt), F9 b (Funktionsaufrufe in `slots.js`)

---

## 0 · Zweck

Review-Leitfrage „Können Prompts von Nicht-Entwicklern gepflegt werden, ohne Code?“ — bis hierher Nein (JS-Template-Literale mit `${bausteine.x(…)}`, Backtick-Escapes). Jetzt: Der Text jeder Session ist eine `.md`-Datei mit einer Platzhalter-Sprache aus vier Formen; die 26 Verknüpfungen mit Argumenten stehen gesammelt in `slots.js`.

## 1 · Die Struktur (je Sprache, `core/korpus/<l>/sessions/`)

| Datei | Inhalt |
|---|---|
| `einzel.md`, `gemeinsam.md`, `moment.md`, `solo.md`, `qualitytime.md` | der Text der Session — reiner Text plus `{{name}}` `{{partner}}` `{{nameA}}` `{{nameB}}` (Kontext), `{{wissen.key}}` `{{policies.key}}` `{{format.key}}` (ein Baustein), `{{wissen.DOMAENEN}}`, `{{slots.name}}` |
| `themen-rahmen.md` | der Themen-Rahmen, ohne Platzhalter |
| `slots.js` | je Session `ctx → {…}`: `bausteine.kiBegleiter("hier führst du ${name} …")`, `regieUebergabe(…)`, `notFrage(false)`, `KAPITEL_TITEL.join(" · ")`, `DOMAINS.length` … — identische Ausdrücke nur einmal (`anzahlDomaenen` statt dreimal) |
| `../sessions.js` | **GENERAT** aus `.md` + `slots.js` durch `scripts/build-korpus.js`; committed; Kopf sagt „nicht von Hand ändern“ |

Keine Bedingungen, keine Schleifen, keine Aufrufe im Text. Ein unbekannter Platzhalter, ein Kontext-Name, der kein Argument der Session ist, oder ein `{{` ohne Grammatik ist ein **Fehler beim Generieren**, nie ein leerer String.

## 2 · Warum Generat statt Laufzeit-Lesen

Die Prompts gehen durch esbuild in drei Bundles (Artefakt, Pages, Capacitor). Ein Text-Loader wäre ein Eingriff in drei Build-Pfade; ein generiertes JS-Modul ist für alle Verbraucher dasselbe wie vorher (Importe, Funktionsnamen, Signaturen, Bundle-Größe, R5-Split). Das Generat ist committed, damit `vitest` und `npm run build` ohne Vorbereitung laufen; die Kanarie `mod-templates.spec.js` erzeugt es in-memory neu und vergleicht Byte für Byte — ein Handedit im Generat ist rot. `npm run build` prüft dasselbe als ersten Schritt (`--pruefe`); `npm run build:korpus` schreibt.

## 3 · Beweis der Byte-Identität

Die Extraktion lief über einen einmaligen Scanner (Template-Literal → Literalteile unescaped nach `.md`, `${…}`-Ausdrücke klassifiziert oder als Slot nach `slots.js`). Danach: Golden-Snapshot unverändert (alle fünf Prompte, beide Sprachen, Text- und Strukturpfad) und ein direkter Vergleich alt↔neu auch mit Nicht-ASCII-Namen (`Zoë`/`Łukasz`). Die Escapes (`\n` im Text, Backticks, `${`) gehen durch Renderer und Generat korrekt hindurch (eigener Test).

## 4 · Was die Tests festhalten

- Generat ≡ Quellen (DE, EN).
- Jeder Platzhalter jedes Templates löst auf (Argumente, Schichten, Slots der Session); Templates enthalten kein JS; genau sechs `.md` je Sprache.
- Renderer: unbekannt → laut; `{{eval(1)}}` → laut; Kontext außerhalb der Signatur → laut; Escaping rund um Backtick/Backslash/`${`.
- `mod-schichten-disjunkt`: `sessions.js` darf `./sessions/slots.js` importieren; sonst unverändert.

## 5 · Nicht angefasst, bewusst

- Die Querbezüge aus MOD-3 (`grundsaetze.js`) sind im Template jetzt sichtbar: `{{policies.urteilsGrammatik}}` im Haltungskern-Kontext, `{{policies.sprecherKlarheit}}` im Qualitätszeit-Prompt. Nichts umgeschrieben.
- `slots.js` trägt 26 (DE) / 24 (EN) Einträge — die Zahl ist die ehrliche Größe der Verflechtung zwischen Dramaturgie und Bausteinen. Weniger wäre eine Textänderung.

## 6 · Stand der Serie

Alle geplanten Schritte sind auf `main`: MOD-0, 1, 2a, 2b, 2c, 3, 3b, 4, 5. Offen: die lebende EN-Sonde (MOD-2c §3) und `QZ_STUFEN_TEXT` ohne Aufrufer (MOD-3b §2).

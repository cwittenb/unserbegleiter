# Sprintprotokoll · MOD-6 — Der Korpus als Text: Bausteine als `.md`, eine Notation

**Basis:** `main` nach Merge `mod-4` (`b21854e`)
**Branch:** `mod-6` → Merge nach `main`
**Endstand:** **2749 / 187 / 26 / 4 grün** (+13), `npm run build` grün (`--pruefe` über 10 Generate)
**Kern-Hash:** `756030af8f56d808`
**Entscheidungen:** F11 a (benannte Argumente), F12 a (Regexe bleiben JS); **F9 b ist überholt** — `slots.js` entfällt.

---

## 0 · Zweck

Frage nach MOD-4: „Wieso ist therapeutisches Wissen und Policies in JavaScript?“ — weil MOD-4 nur die Dramaturgie umgezogen hatte. Jetzt liegt **alles, was das Modell liest, als Textdatei** vor; JS bleibt nur, was Code ist.

## 1 · Die Struktur (je Sprache, `core/korpus/<l>/`)

| Pfad | Inhalt | Art |
|---|---|---|
| `bausteine/wissen/<key>.md` (12) · `policies/<key>.md` (13 + `notFrage.kurz.md`) · `format/<key>.md` (6) · `grundsaetze/<NAME>.md` (5) · `waechter/<name>.md` (3) | ein Baustein je Datei; Kopf: `<!-- … -->`-Kommentare (Sprint-Historie) und optional `<!-- args: … -->` | **Quelle** |
| `sessions/<art>.md` (5) · `themen-rahmen.md` | Dramaturgie (seit MOD-4), jetzt mit Includes statt Slots | **Quelle** |
| `signale.js` | die Wächter-Regexe (Krise, Krisenhilfe, Einzelraum, eigene Sache, Verfügung) | Code, von Hand |
| `domaenen.js` | `DOMAINS`, `DOMAENEN` (13 Lebensbereiche als Daten) | Daten, von Hand |
| `steuer.js`, `bausteine.js` | Wire-Texte, Zusammensetzung in historischer Reihenfolge | von Hand (unverändert) |
| `grundsaetze.js`, `wissen.js`, `policies.js`, `format.js`, `sessions.js` | **GENERATE** aus den `.md` — committed, `--pruefe` im Build, Kanarie im Test | Generat |

40 `.md`-Dateien je Sprache; DE und EN haben dieselben Dateinamen (Test).

## 2 · Die Notation (geschlossen)

| Form | Bedeutung |
|---|---|
| `{{name}}` `{{subjekt}}` | Parameter — Session-Kontext oder Baustein-Argument |
| `{{wissen.anteileSprache}}` | Baustein einfügen |
| `{{policies.krisenVorrang subjekt=name}}` | Baustein mit **benannten** Argumenten; Reihenfolge frei, Signatur-Reihenfolge entscheidet das Generat |
| `{{format.kiBegleiter rollenzusatz="hier als {{name}}s Raum"}}` | String-Argument, darf Parameter tragen; Escapes nur `\"` und `\\` |
| `{{policies.notFrage mitEinladung=false}}` | boolesches Argument; `notFrage.md` erklärt `<!-- args: mitEinladung=true; sonst: notFrage.kurz -->` — die einzige Verzweigungsform |
| `{{grundsaetze.URTEILS_GRAMMATIK}}` | ein Grundsatz |
| `{{steuer.KAPITEL_TITEL \| join " · "}}` · `{{wissen.DOMAINS \| count}}` · `{{wissen.DOMAENEN \| zeilen " · "}}` | die drei Listen-Filter, nur auf Daten |

Keine Bedingungen, Schleifen, freien Funktionen. Jede Abweichung (unbekannter Parameter/Baustein/Argument/Filter, fehlendes Pflicht-Argument, Filter auf Text, `{{eval(1)}}`, offenes `{{`, offener String) ist ein **Fehler beim Generieren** — 15 solche Fälle im Test.

Ein Baustein ist selbst ein Template: `krisenVorrang.md` benutzt `{{subjekt}}`, deklariert in `<!-- args: subjekt -->`. Innerhalb einer Schicht ordnet der Generator topologisch (wer zitiert, kommt danach; Zyklus = Fehler); schichtübergreifend zitieren wissen und policies nur die Grundsätze.

## 3 · Beweis

Golden-Snapshot unverändert (alle Prompte, DE/EN, Text- und Strukturpfad). Zusätzlich direkter Vergleich aller 15 Fassaden-Exporte gegen den Stand vor MOD-3: Strings, Regex-Quellen, Funktionsausgaben (mit drei Argumentsätzen), `bausteine`-Reihenfolge — identisch; erwartete Abweichungen nur die aus MOD-3b (Revisionstexte) und MOD-2c (EN-Signale).

## 4 · Was die Tests festhalten

- Generat ≡ Quellen für 5 Ziele × 2 Sprachen; `grundsaetze.js` ohne Importe; S136-Lehre steht im Generat am Haltungskern (`<!-- -->` → `/* */`).
- Quellen sind Text: kein `${`, kein Backtick-Escape, kein `slots`; `slots.js` existiert nicht mehr.
- Notation: 8 Positivformen, 15 Fehlformen, Argument-Umordnung, Escapes rund um Backtick/`${`/`\"`, `parseBaustein` mit Vorgabe + Zweitfassung.

## 5 · Preis und Grenzen

- Parser ~120 Zeilen in `scripts/build-korpus.js`; jede Erweiterung der Notation ist eine bewusste Entscheidung, keine Nebenwirkung.
- Dateiende verbatim: endet der Text ohne Zeilenumbruch, endet die Datei ohne — Editoren, die einen anhängen, machen den Golden rot (gewollt: das ist eine Prompt-Änderung).
- `steuer.js` (Wire-Texte, `oberflaechenTexte`, `kontextTexte`) bleibt JS: Diese Texte gehen zwar teils ans Modell, sind aber Protokoll (Token, Platzhalter `{vid}` via `fuelle`), nicht Dramaturgie. Wer sie als `.md` will: gleiche Mechanik, eigener Schritt.

## 6 · Stand der Serie

Auf `main`: MOD-0, 1, 2a, 2b, 2c, 3, 3b, 4, 5, 6. Offen (nicht blockierend): lebende EN-Sonde (MOD-2c), `QZ_STUFEN_TEXT` ohne Aufrufer (MOD-3b).

# Sprintprotokoll · MOD-3 — Korpus in Schichten

**Basis:** `main` nach Merge `mod-2b` (`a419fce`)
**Kette:** MOD-0 → MOD-1 → MOD-2a → MOD-2b → **MOD-3**
**Branch:** `mod-3` → Merge nach `main`
**Endstand:** **2695 / 187 / 26 / 4 grün** (+17), `npm run build` grün (Pages-Split DE/EN intakt: `app.js` 679 kB, `korpus.en.js` 149 kB)
**Kern-Hash:** `c7bd1d1c7a6e36b1`

---

## 0 · Zweck

Review-Kopplung K2: Wissen, Policies und Format lagen als Geschwister in einem `bausteine`-Objekt, 665 Zeilen je Sprache. Jetzt liegt jede Schicht in einer Datei; `prompts.de.js`/`prompts.en.js` sind 19-zeilige Fassaden. **Kein Zeichen Prompt-Text hat sich geändert** — Golden-Snapshot und ein direkter Vergleich aller 15 Exporte (Strings, Regex-Quellen, Funktionsausgaben, `bausteine`-Reihenfolge) alt↔neu sind identisch, DE und EN.

## 1 · Die neue Struktur (je Sprache, `core/korpus/<l>/`)

| Datei | Inhalt | importiert |
|---|---|---|
| `grundsaetze.js` | 5 Primitive, die mehr als eine Schicht zitiert: `URTEILS_GRAMMATIK`, `SPIEGEL_ICH`, `LOESUNGSVERSUCH_RAHMUNG`, `QUERUNGS_GRAMMATIK`, `VORSCHLAG_ICH` | nichts (Blatt) |
| `wissen.js` | `DOMAINS`, `DOMAENEN`, `wissen` = {spiegelIch, loesungsversuchRahmung, haltungsKern, querungsGrammatik, vorschlagIch, spiegelMittel, anteileSprache, ehrlichesMitteilen, bedeutsameMomente, reaktionsTypen, entwicklungsRaum, widerspruchsForm} | grundsaetze |
| `policies.js` | `SPRECHER_KLARHEIT`, `policies` = {sprecherKlarheit, urteilsGrammatik, zustimmungsGrammatik, notbremseGemeinsam, versehensKorrektur, krisenVorrang, krisenVorrangGemeinsam, sorgenWeiche, regieUebergabe, notFrage, gewaltNichtEinfuehren, endSignal, abschlussPflichten}, `waechter` (MOD-2a) | grundsaetze |
| `format.js` | `STEUER_TEXT_REGEL`, `format` = {kiBegleiter, kiTransparenz, steuerTextRegel, sprecherKonvention, jsonKern, sprache} | — |
| `bausteine.js` | `bausteine` aus den drei Schichten in historischer Reihenfolge; wirft, wenn ein Schlüssel in ≠ 1 Schicht liegt | wissen, policies, format |
| `sessions.js` | `klaerungsPrompt`, `aufloesungsPrompt`, `momentPrompt`, `reflexionsPrompt`, `qzMenuePrompt`, `THEMEN_RAHMEN` | bausteine, wissen, grundsaetze, policies, steuer |
| `steuer.js` | `steuerTexte`, `strukturTexte`, `KAPITEL_TITEL`, `QZ_STUFEN_TEXT`, `korpusTexte` | — |

Die Fassade exportiert **genau die 15 Namen** von vorher (Test), nicht die Schicht-Interna.

### Warum `grundsaetze.js`

Beim Zerlegen zeigten sich zwei Querbezüge: Der Haltungskern (Wissen) zitiert die Urteils-Grammatik (Policy, S105.4); die Sorgen-Weiche (Policy) zitiert Querungs-Prinzip und Ich-Vorschlag (Wissen). Direkt importiert gäbe das einen Zyklus wissen ⇄ policies, der in ESM je nach Einstiegspunkt mit TDZ-Fehlern kippt. Statt den Text zu ändern (verboten in diesem Sprint) liegen die fünf zitierten Sätze als Blatt ohne Importe; die Schichtzugehörigkeit für `bausteine` bleibt bei der zitierenden Schicht. Das ist die ehrliche Form von K2: Die Verflechtung ist jetzt **sichtbar und auf fünf Sätze begrenzt**, statt in einem 80-Zeilen-Objekt versteckt. MOD-4 macht sie im Template explizit.

### Kommentar-Umzüge

Sprint-Historie wandert mit ihrem Gegenstand: S105.4 zur Urteils-Grammatik (grundsaetze), MRV.2 zur Sprecher-Klarheit (policies), S93 zur Steuertext-Regel (format), S33a zum `bausteine`-Objekt. Die **S136-Lehre** („HIER STAND EINE REGEL, DIE GEMESSEN GESCHADET HAT … Der Prompt hat ein Budget“) stand an der Urteils-Grammatik; sie gehört an die Stelle, an der die Regel stand — den Haltungskern — und steht jetzt direkt über ihm in `wissen.js`. Der Test `s136-ruecknahme-grenzen-regel.spec.js` liest sie dort (Ort invertiert, Aussage gleich).

## 2 · Was die Tests festhalten

- Golden: alle Systemprompte DE/EN byte-identisch (Text, Struktur, Runner).
- `mod-schichten-disjunkt`: wissen ∩ policies ∩ format = ∅, Vereinigung ≡ `bausteine`, Reihenfolge historisch; DE≡EN je Datei (Exporte, Typen); grundsaetze ist Blatt; Korpus-Dateien importieren nur aus dem eigenen Sprachordner; Fassade nur aus `core/korpus/<l>`; Fassaden-Oberfläche = 15 Namen.
- `mod-grenzen`: `core/korpus` importiert nichts aus engine/ui/llm/policies/prompts/platforms/evals.
- Bestehende Kanarien (`kanarien`, `bausteine`, `korpus-invarianten`, `korpus-sprache`, `i18n-*`) laufen unverändert über die Fassade.

## 3 · Werkzeug

Die Zerlegung lief über einen einmaligen Generator (Token-Scanner über Top-Level-Statements und `bausteine`-Einträge, Template-Literal-sicher, Kommentare bleiben an ihrem Statement) — nicht im Repo, weil er nach diesem Sprint keinen Zweck mehr hat. Die Byte-Identität wurde zusätzlich zum Golden mit einem direkten Export-Vergleich gegen den Stand vor MOD-3 geprüft.

## 4 · Nicht angefasst, bewusst

- `korpusTexte`, `KAPITEL_TITEL`, `QZ_STUFEN_TEXT` liegen in `steuer.js` — Umzug nach `core/i18n` ist **MOD-3b** (E4 a).
- `steuerTexte.*Revision` (ohne Aufrufer seit S105.3) bleiben in `steuer.js`; Entfernung ist eine Entscheidung, keine Zerlegung → **F8** unten.
- `prompts.js` (Loader, R5, `K()`) unverändert.

## 5 · Offene Frage

**F8 · Tote Revisionstexte.** `steuerTexte.aufdeckRevision`, `urteilsRevision`, `krisenReihenfolgeRevision`, `abschlussRevision`, `markenRevision`, `metaPlatzRevision` (DE+EN) haben seit S105.3 keinen Code-Aufrufer; die Engine verwendet Kennungen. (a) entfernen (mit Kanarie, dass die Kennungen bleiben) · (b) behalten als Dokumentation der früheren Revisionsrunde. Kein Blocker.

## 6 · Nächster Schritt

MOD-3b: `korpusTexte` + `KAPITEL_TITEL` + `QZ_STUFEN_TEXT` nach `core/i18n/` (UI-Strings gehören nicht in den Modell-Korpus).

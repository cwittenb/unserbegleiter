# Sprint 30 · C2 — Englischer Begleitungs-Korpus (prompts.en.js)

**Datum:** 2026-07-07 · **Basis:** Commit `15edeeb` (s30c1) · **Patch:** `patch-s30c2-korpus-en.mjs`
**Kern-Hash vorher:** `70f2517d5fdafb5a` · **nachher:** `5e43aa3691ae44e7`
**Tests:** 326 grün (vorher 321; +3 `korpus-sprache.spec.js`, +2 Invarianten-Parametrisierung für `en`)

## Was dieser Sprint liefert

Der englische Begleitungs-Korpus aus den vier abgenommenen C2-Review-Paketen ist
produktiv registriert. Eine Session, deren Paarsprache Englisch ist, läuft jetzt
vollständig englisch: Systemprompts, Steuertexte, Kapitel-Titel, QZ-Stufen,
Domänen-Katalog und alle App-gebauten Kontext-/Ergebnistexte.

### 1. `core/prompts/prompts.en.js` (neu)
Wortlautgetreue Übernahme der Review-Pakete 1–4: `DOMAINS` (13, EN-Pole:
Closeness↔Autonomy, Honesty↔Harmony, Stability↔Adventure, Social Life:
Sociability/Time as a couple), sechs Systemprompts (`soloSys`, `einzelSys`,
`gemeinsamSys`, `momentSys`, `aufdeckSys`, `qzSys`), `THEMEN_RAHMEN`,
`steuerTexte`, `KAPITEL_TITEL`, `QZ_STUFEN_TEXT`, `korpusTexte` (Titel +
sämtliche Builder-Texte).

### 2. Sprachdisziplin-Zeile (beide Korpora)
Alle sechs Systemprompts tragen jetzt direkt nach dem Eröffnungsabsatz die
SPRACHE-/LANGUAGE-Zeile: Antwortsprache fest (Paarsprache), eingehende
Fremdsprache wird inhaltlich normal aufgenommen, Block-Inhalte entstehen in der
Paarsprache.

### 3. Builder-Parametrisierung (Kern der Arbeit)
Alle App-gebauten Texte, die im Modell-Kontext landen, lesen jetzt zur Laufzeit
aus `K().korpusTexte` (Helper `KT`) statt aus deutschen String-Literalen:

- `kernwetten.js`: `RANK_MODES` (Titel/Beschreibungen/Ergebnisköpfe),
  `reglerErgebnis`, `startwerteErgebnis`, `baueAufdeckKontext`,
  `baueKlaerungsKontext`; Fehlertext der Aufdeck-Validierung über
  `t("fehler.aufdeckDaten")` (neu in beiden i18n-Wörterbüchern).
- `sessions.js`: `baueMomentKontext` (alle Beschriftungen).
- `prozess.js`: `formatiereMessrunde` (inkl. Auftrags-Passung),
  `baueQzMaterial` (inkl. Katalog aus `K().DOMAENEN`).

**Invariant geblieben** (sprachunabhängige Wire-/Kontrakt-Token): alle
Marker (`[[…]]`), Block-Namen, Kontext-Header (`MOMENT-KONTEXT`,
`AUFDECK-KONTEXT`, `ÜBERGABE-BLOCK`, `AUFTRÄGE:`, `AGENDA…`, `FRÜHERE MOMENTE…`,
`PROZESSREFLEXION…`, `ZWISCHENZEIT-MATERIAL…`, `RUHEND…`, Ergebnis-Präfixe
`REGLER-ERGEBNIS`/`RANKING-ERGEBNIS`/`PARTNER-VERMUTUNG`/`STARTWERTE-ERGEBNIS`),
JSON-Felder, `quelle`-/`op`-/`art`-Werte und `"(von beiden bestätigt)"`.
Deren Anglisierung ist bewusst S31 (Wire-Anglisierung) vorbehalten.

### 4. `RANK_ITEMS` → `rankItems()`
Die Stapel-Items entstehen jetzt zur Laufzeit aus dem aktiven Korpus
(`rankItems()`-Getter); der statische `RANK_ITEMS`-Export bleibt als
de-Kompatibilität erhalten. `app.js`-`rankPanel` und `rankingErgebnis` nutzen
den Getter — englische Sessions zeigen englische Pole.

### 5. `momentSys` (de): „Geländer, nicht Geleit" → „Begleitung, nicht Leitung"
Bestellte Wortlaut-Korrektur aus Review-Paket 3.

### 6. Tests
Neu `tests/unit/korpus-sprache.spec.js`: (a) EN-Korpus registriert und
inhaltlich englisch; (b) `locale:"en"` → neue Einzelsession startet englisch
(Systemprompt, Titel „Clarifying Your Focus", `chat.sprache === "en"`);
(c) Resume einer mit `sprache:"de"` gespeicherten Session bleibt deutsch,
auch bei Paarsprache Englisch. Der bestehende Invarianten-Test
(`korpus-invarianten.spec.js`) prüft den EN-Korpus automatisch auf
Marker-/Block-Parität mit der de-Referenz.

## Offene Punkte (mit Cars10 zu klären)

- **`kw.poleZ` (en):** UI-Text „Where would it feel right for you?" bewusst
  unangetastet — Abgleich mit dem EN-Korpusbegriff „Inner Alignment" offen.
- **Krisennummern:** im EN-Korpus generisch (V1); Lokalisierung nach Zielmarkt
  später.
- **C3:** beidseitiger Bestätigungs-Fluss für den Paarsprachen-Wechsel.
- **Stufe D:** Evals englisch; Wiedereinstiegs-Screen-Sprache.
- **S31:** Wire-Anglisierung (GOAL-BLOCK-ops, `quelle`-Werte, CLOSURE-Tags,
  „(von beiden bestätigt)").

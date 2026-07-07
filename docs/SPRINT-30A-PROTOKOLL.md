# Sprint 30 · Stufe A — Protokoll: i18n-Fundament

**Datum:** 7. Juli 2026 · **Basis:** `origin/main` `3ccf317` („s29 now complete themable", 310 Tests, Kern `823f20bee7166f4f`) · **Ergebnis:** 314 Tests grün, Kern `e052321be032cfc7`

## Was Stufe A liefert

Reines Fundament-Refactoring: **kein Verhaltens-Unterschied auf Deutsch**, aber jede Voraussetzung für Englisch (Stufe B/C).

1. **`core/i18n/`** (neu): `t(key, params)` mit `{name}`-Platzhaltern, Locale-Singleton (Default `"de"`, `setLocale`/`registerDict` für Stufe B), `fuelle()` als geteilter Platzhalter-Helfer. `de.js` = vollständiges deutsches Wörterbuch (~140 Schlüssel), Referenz und Fallback.
2. **UI-Extraktion (120 Ersetzungen in app.js** + Hüllen): alle nutzersichtbaren Strings aus `app.js`, `main.js` (Einrichtung/Rollenwahl), `client.js` (Wiedereinstieg) und `design.js` (Hell/Dunkel-Labels, als `uiText` importiert wegen lokalem `t`-Parameter in `applyDesign`) laufen über `t()`. Auch `rec.lang` (Diktat) kommt jetzt aus dem Wörterbuch (`sprache.diktat: "de-DE"`) — Stufe B mappt das pro Locale.
3. **Korpus-Weiche:** `prompts.js` → `prompts.de.js` (Inhalt unverändert verschoben) + Dispatcher (`export * from "./prompts.de.js"`, `getPrompts(locale)`, `registerKorpus`). Alle bestehenden Importe und Tests laufen unverändert. **Neu in `prompts.de.js`: `steuerTexte`** — die versteckten App-→-Modell-Texte (Eröffnungen je Session-Art, `FREIGABE-ERGEBNIS:`-Meldungen, `[Weiter mit Kapitel {n}.]`, `AUFDECKUNG-ANGEZEIGT:`) sind Korpus und wandern in Stufe C mit in die englische Fassung.
4. **Worker-Fehler-Codes** (nicht-brechend): `names_required`, `email_invalid`, `email_taken`, `link_unknown`, `link_used`, `link_expired`, `no_session` zusätzlich zur deutschen Meldung; `fehler()` in `index.js` reicht `code` durch. Stufe B übersetzt clientseitig per Code.
5. **Kanarien-Test** (`tests/unit/i18n-kanarien.spec.js`): kleiner String-Scanner (Zustandsautomat inkl. Regex-Literal-Erkennung und verschachtelter Templates) prüft, dass in den vier UI-Dateien kein Umlaut-Literal und keines der Kern-UI-Wörter mehr vorkommt.

## Scope-Entscheidungen (dokumentiert, nicht vergessen)

- **Korpus-Träger bleiben unangetastet:** `sessions.js` (Kontext-Bauer: „AGENDA (offen):", „FRÜHERE MOMENTE …"), `kernwetten.js` (DOMAINS, RANK_*, KAPITEL_TITEL), `prozess.js` (QZ_STUFEN_TEXT) sind Inhalte, die das Modell liest bzw. mit dem Prompt verzahnt sind — ihre Sprachfassung entsteht in **Stufe C** zusammen mit `prompts.en.js`. Der Kanarien-Test nimmt sie deshalb bewusst aus.
- **`dev-panel.js` bleibt deutsch** (reines Entwickler-Werkzeug, per Terminologie-Entscheid).
- **Kern-Hash ändert sich** (`823f20be…` → `e052321b…`): erwartet — Code strukturell anders, Verhalten identisch (Wörterbuch liefert byte-gleiche Texte).

## Verifikation

Frischer Klon von `origin/main` → `--dry-run` OK → Anwendung (11 Dateien) → **Byte-Abgleich identisch** mit dem entwickelten Stand → zweiter Lauf: „bereits vollständig angewendet" (idempotent) → `npm test` **314 grün** → `npm run build` reproduziert Kern `e052321be032cfc7`.

## Nächste Stufen

- **B — Englische UI:** `en.js` (Terminologie ist final abgestimmt), persönlicher UI-Chooser (pstate) + Paarsprache (couple-Record, `createCouple`-Parameter, Bestätigungs-Fluss nach Mandats-Muster, Sprach-Schnappschuss pro Session), `<html lang>`, `sprache.diktat` je Locale, Fehler-Code→`t()`-Mapping im Client.
- **C — Englischer Korpus:** `prompts.en.js` inkl. `steuerTexte`, Kontext-Bauer und Kernwetten-Inhalte; Sprachdisziplin-Invariante in beiden Fassungen; Invarianten-Diff de↔en als Test.
- **D — Evals englisch** inkl. I18N-01 (Sprachdisziplin, beide Richtungen).

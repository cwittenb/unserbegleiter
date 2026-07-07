# Sprint 30 · Stufe B — Protokoll: Englische UI

**Datum:** 7. Juli 2026 · **Basis:** Stufe-A-Stand (Kern `e052321be032cfc7`, 314 Tests) · **Ergebnis:** 318 Tests grün, Kern `df8a9a41e18f8b5e` · **Voraussetzung: Patch A zuerst anwenden** (der B-Patch prüft das über seine Guards und bricht sonst mit Hinweis ab).

## Was Stufe B liefert

1. **`core/i18n/en.js`** — das vollständige englische Wörterbuch nach deiner abgestimmten Terminologie: *Couples Companion, My Private Space / Our Shared Space, Glimpse, Focus, Shelf, Reveal Round, Submit/Take Face Down, "Your words, ready to share", Notice-don't-report-Geist im Regal-Intro, Regain Access* usw. Fließtexte (Intros, Erklärungen) sind sinntreu neu formuliert, nicht wörtlich übersetzt.
2. **UI-Sprache pro Person:** dezente **DE · EN**-Wahl im Kopfbereich; die Wahl wird in `pstate("sprache")` gespeichert (pro Rolle, also pro Person), wirkt sofort und **nur lokal** — beim Partner ändert sich nichts. Der Wechsel baut die Oberfläche neu auf; Gespräche und Zustände liegen im Backend und bleiben unberührt. `<html lang>` wird gesetzt; die **Diktat-Sprache folgt der UI-Sprache** (`de-DE`/`en-US`) über den Wörterbuch-Schlüssel `sprache.diktat`.
3. **Paarsprache — Plumbing:** `createCouple` nimmt `locale` an (Default `"de"`), `sys/couple` speichert sie, `/api/me` liefert sie aus; die Artefakt-Einrichtung hat die Auswahl (Deutsch/English). **Bewusste Scope-Entscheidung:** Die Wirkung auf den Korpus und der beidseitige Bestätigungs-Fluss für den Wechsel kommen erst mit **Stufe C** — vorher gibt es nur den deutschen Korpus, der Fluss wäre gebaut, aber nicht erlebbar/testbar. Gespeichert wird die Paarsprache ab jetzt, damit C sie nur noch anschließen muss.
4. **Fehler-Codes → lokalisierte Meldungen:** der Client-`api()`-Helfer reicht `data.code` durch; `fehlerText(e)` (neu in `core/i18n`) zeigt die lokalisierte Fassung, die Server-Meldung bleibt Fallback. Genutzt beim Enroll-Fehler (client.js) und beim E-Mail-Hinterlegen (app.js).
5. **`tests/unit/i18n-woerterbuecher.spec.js`:** Schlüssel-Parität de↔en, Platzhalter-Parität je Schlüssel, Locale-Verhalten von `t()` (Umschalten, Füllung, Fallback bei unbekannter Locale), `fehlerText`-Verhalten. Damit kann keine Sprache mehr still Schlüssel verlieren.

## Bekannte, gewollte Übergangszustände (bis Stufe C)

- **Die Begleitung spricht weiter Deutsch** — der Korpus ist noch einsprachig. Englische UI + deutsches Gespräch ist der erwartete B-Zustand.
- **Kapitel-Titel und Kernwetten-Inhalte** (KAPITEL_TITEL, DOMAINS, RANK_*) erscheinen in englischer UI noch deutsch („Chapter 2 complete – Herzstücke") — sie sind Korpus-Vokabular und wandern mit `prompts.en.js`.
- Der **Wiedereinstiegs-Screen** (client.js, vor Login) bleibt deutsch beschriftet — vor der Anmeldung gibt es keine Person und keine gespeicherte Sprachwahl; sinnvolle Lösung (z. B. Browser-Sprache als Vorgabe) ist eine kleine C/D-Fußnote.

## Verifikation

Frischer Klon von `origin/main 3ccf317` → **Patch A** → **Patch B** (`--dry-run` OK, 9 Dateien, zweiter Lauf idempotent) → Byte-Abgleich mit dem entwickelten Stand **identisch** → `npm test` **318 grün** → Build reproduziert Kern `df8a9a41e18f8b5e`.

## Ausprobieren

`paarbegleitung-dev_2026-07-07_1424_df8a9a41.html`: Einrichtung (mit Sprach-Auswahl fürs Paar), dann oben rechts **DE · EN** — die Wahl gilt pro Rolle: als Anna auf EN stellen, zu Bernd wechseln → Bernd bleibt auf Deutsch.

## Nächste Stufe

**C — Englischer Korpus:** `prompts.en.js` (Neu-Autorschaft mit deinem Review, Terminologie liegt fest), `steuerTexte` englisch, Kontext-Bauer (`sessions.js`), Kernwetten-Inhalte und `QZ_STUFEN_TEXT` je Sprache; Anschluss der gespeicherten Paarsprache an `getPrompts` inkl. Sprach-Schnappschuss pro Session; beidseitiger Bestätigungs-Fluss für den Wechsel; Sprachdisziplin-Invariante in beiden Fassungen; Invarianten-Diff de↔en als Test. Danach **D — Evals englisch** (inkl. I18N-01).

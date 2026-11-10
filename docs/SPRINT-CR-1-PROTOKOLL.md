# Sprint CR-1 · Naht Oberfläche/Worker

**Datum:** 10.11.2026 · **Basis:** `main` @ `aaeb1e4` (Kern `3f79edb1`) · **Branch:** `cr1-naht` · **Kern danach:** `d78b3352`
**Bezug:** Code-Review 10.11.2026, Befunde C1, C4, C7, C27 · Plan `claude/sprintplan-CR-1-naht-oberflaeche-worker.md`
**Entscheidungen des Auftraggebers:** F1 a (Branch, Merge, Push) · F2 a (Verlauf-Ablage scharf, Voreinstellung „Aufbewahren“ bleibt)

## Ergebnis

Drei Funktionen, die auf Cloudflare nicht liefen, laufen. Die Fehlerklasse dahinter — der Kern spricht ein Feld oder eine Route, die der Worker nicht kennt — hat jetzt einen Test, der sie fängt.

| Befund | Vorher | Nachher |
|---|---|---|
| C1 · Prozessreflexion | Oberfläche sendet seit S107 `{wesen, fit, wirksamkeit}`, Worker prüfte `{closeness, guess}` → jede Abgabe 400 `mess_invalid`; der Klick hatte keinen Fehlerpfad, der Knopf wirkte tot | Worker nimmt `wesen`, `fit`, `wirksamkeit` (je 1–10) und speichert alle drei. Abgewiesene Abgabe steht in der Fehlerzeile, Regler und Knopf bleiben, Doppelklick gesperrt |
| C4 · Verlauf-Ablage | Kern schrieb `pstate("verlauf:<id>")`, Routenmuster `[a-zA-Z]+` → 404, von beiden Aufrufern geschluckt. Auf Cloudflare wurde nie ein Verlauf aufbewahrt; Leseansicht, Ausschnitt-später und RECALL fanden nichts | Eigene Route `GET/PUT/DELETE /api/verlauf/<id>`, Schlüssel `verlauf:<Rolle>:<id>` im privaten Namensraum. Einstellung `verlaufAufbewahren` in der Pstate-Whitelist |
| C7 · `[[BASELINE]]` in der Qualitätszeit | Prompt (AUFTRAGS-PFLEGE) verlangt die Marke, `momentDef` kannte sie nicht → kein Panel, Gespräch stand | Marke und `onStartwerte` in `momentDef` registriert (dasselbe Panel wie in der Gemeinsamen Auflösung) |
| C27 · Kommentare | `regal.js`: „Karenz NUR für Ausschnitte“ (Code: alle); Kanarie: „berechnete Schlüssel gibt es nicht“ | beide berichtigt, Kanarie erweitert |

## Schritte

| Schritt | Umsetzung | Dateien |
|---|---|---|
| CR-1.1 | Mess-Route auf die Felder der Oberfläche. `closeness` bleibt als Alt-Name von `wesen` lesbar (`wesenVon`), damit Runden vor S107 im Kontext des Begleiters Zahlen tragen. `guess` entfällt | `worker/index.js`, `core/ui/prozess.js`, `platforms/artifact/dev-panel.js` |
| CR-1.2 | `#msOk` mit try/catch, `err(fehlerText(e))`, Knopf während der Abgabe gesperrt; der Chronik-Eintrag kann die Quittung nicht mehr kippen. Wörterbuch `fehler.code.mess_invalid` DE/EN | `core/ui/ansichten-screen.js`, `core/ui/app.js`, `core/i18n/de.js`, `en.js` |
| CR-1.3 | Route im Worker; die Remote-Fassade bildet `pstate("verlauf:<id>")` auf sie ab. Fassade aus `client.js` nach `remote-backend.js` (`baueRemoteBackend(api, extras)`) gelöst, damit sie ohne Browser prüfbar ist | `worker/index.js`, `pages/remote-backend.js` (neu), `pages/client.js` |
| CR-1.4 | `[[BASELINE]]` in `markerOrder` und `markers` der Qualitätszeit | `core/ui/sessions.js` |
| CR-1.5 | Vertragstest: echte Fassade über echtem Worker (Miniflare), bedient von den Kern-Funktionen. Kanarie S119.1 greift jetzt auch Konstanten und zusammengesetzte Schlüssel; jeder muss eingeordnet sein | `tests/worker/vertrag-oberflaeche.spec.js` (neu), `tests/unit/s119-1-bstate-whitelist.spec.js` |
| CR-1.6 | Kommentare, Protokoll, Volltest, Build | `core/engine/regal.js`, dieses Dokument |

## Abweichungen vom Plan

| Plan | Umgesetzt | Grund |
|---|---|---|
| Eigene Client-Fassade `backend.verlauf`, `verlauf-ablage.js` nutzt sie | Abbildung in der Pstate-Fassade der Cloudflare-Form; `verlauf-ablage.js` und `local-backend.js` unverändert | Der Kern spricht auf allen Plattformen dieselbe Fassade; die Plattform-Eigenheit steht nur in der Plattform. Kein zweiter Codepfad im Kern |
| „fremde Rolle bekommt 404“ | fremde Rolle bekommt `null` | Die Rolle steht im Schlüssel und kommt aus der Sitzung — unter derselben Kennung liegt für die andere Rolle schlicht nichts. Kein Unterschied zwischen „gibt es nicht“ und „gehört dir nicht“ |

## Tests

| Datei | Inhalt | Zahl |
|---|---|---|
| `tests/worker/vertrag-oberflaeche.spec.js` (neu) | Prozessreflexion, Verlauf-Ablage (inkl. Rollentrennung, Export, Einstellung), Regal/Agenda, Chat, Übergabe, Sprache; jedes Pstate-/Bstate-Feld des Kerns gegen den Worker — Feldnamen aus dem Quelltext gelesen | 14 |
| `tests/unit/cr1-naht.spec.js` (neu) | Alt-Runden, Fehlerpfad der Abgabe, Doppelklick, Wörterbuch, `[[BASELINE]]` in Def/Komposition/Engine, Fassaden-Abbildung, Kennungsform | 10 |
| `tests/unit/s119-1-bstate-whitelist.spec.js` | + berechnete Schlüssel (3 Tests) | 11 |
| `tests/worker/blind2-mess.spec.js` | auf die Nutzlast der Oberfläche umgestellt, + Alt-Name | 7 |

**Gegenprobe:** Vertragstest gegen den Worker von `aaeb1e4` → 11 von 14 rot, genau an Prozessreflexion, Verlauf-Ablage und Pstate-Feld. Regal, Chat/Übergabe/Sprache und Bstate waren und bleiben grün.

**Angepasste Bestandstests (mit Begründung)**

| Test | Änderung | Grund |
|---|---|---|
| `tests/fixtures/golden/prompts-{de,en}.json` | `moment.struktur` neu | Nur der (ruhende) Strukturpfad: seine Präambel zählt die Marken auf, jetzt mit BASELINE. Der Text-Prompt der Qualitätszeit ist byte-identisch |
| `tests/unit/turn-schema.spec.js` | Marker-Enum der Qualitätszeit + `BASELINE` | Folge von CR-1.4 |
| `tests/unit/dev-panel.spec.js`, `dev-panel.js` | Szenen-Daten `wesen`/`wirksamkeit` statt `closeness`/`guess` | Folge von CR-1.1 |

**Suite:** siehe Commit-Nachricht (Volltest und Build grün).

## Betrieb

- **Deployment:** Worker und Pages müssen gemeinsam ausgerollt werden. Ein alter Client gegen den neuen Worker verhält sich wie bisher (Prozessreflexion ging vorher nicht, Verlauf wurde nie abgelegt) — es gibt kein Fenster, in dem etwas schlechter wird.
- **Neu im Speicher:** je aufbewahrtem Solo-Verlauf ein KV-Schlüssel im privaten Namensraum der Rolle. Der Betreiber-Export erfasst ihn ohne Änderung (im Test belegt).
- **Alt-Daten:** Es gibt auf Cloudflare keine Messrunden mit `wesen` (jede Abgabe scheiterte) und höchstens Runden vor S107 mit `closeness`; die bleiben lesbar.

## Offen / weitergereicht

| Punkt | Wohin |
|---|---|
| Kein Löschpfad für ein ganzes Paar; aufbewahrte Verläufe wachsen ohne Obergrenze je Rolle | Betrieb/Datenschutz — außerhalb des Review-Scopes, hier nur vermerkt |
| `core/store/bundles.js:3–5` „Kollisionsfenster auf Millisekunden verengt“ | CR-3 (dort wird das Verhalten geändert, nicht nur der Satz) |
| Regler der Prozessreflexion starten auf 5 und sind ohne Berührung abgebbar | UX-5 |
| Echter Durchlauf der Qualitätszeit mit neuem Auftrag gegen ein Modell | Trockenlauf Cars10 nach Deployment |

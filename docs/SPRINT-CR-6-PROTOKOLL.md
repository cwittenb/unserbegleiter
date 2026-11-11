# Sprint CR-6 · Betrieb

**Datum:** 11.11.2026 · **Basis:** `main` @ `6352d24` · **Branch:** `cr6-betrieb` · **Bezug:** Code-Review C17, C24, C26, C28

| Befund | Vorher | Nachher |
|---|---|---|
| C17 · Einstellungs-Zeichen nach Sprachwechsel | einmal verdrahtet, hing an der ersten App-Instanz; öffnete erst beim zweiten Tippen | jede neue Instanz ersetzt den Handler der vorigen; ebenso der Lauscher der Zurück-Geste (UX-2) |
| C24 · Marke nicht in der letzten Zeile | `[[SLIDERS]]` gefolgt von einem Satz: kein Panel, Marke trotzdem aus der Anzeige entfernt | Eine Zeile, die aus nichts als einer registrierten Marke besteht, löst aus — auch vor Folgetext. Marken im Fließtext feuern weiter nicht |
| C26 · feste deutsche Texte | Block-Platzhalter und Engine-Meldungen deutsch in englischen Sitzungen | Platzhalter kommen aus dem Wörterbuch (`block.*`), Engine-Meldungen tragen einen Code (`engine.*`); Vertrags- und Engine-Schicht bleiben sprachfrei |
| C28 · alter Tab, neuer Korpus | `korpus.en.js` hieß immer gleich | Datei trägt den Kern-Hash im Namen; ein alter Tab findet sie nach dem Deploy nicht mehr und meldet es, statt zwei Stände zu mischen. Der Bau räumt alte Korpus-Dateien aus `dist` |

## Nicht umgesetzt — braucht eine Entscheidung

| Punkt | Warum |
|---|---|
| C25 · Lockfile und CI | `package-lock.json` steht ausdrücklich in `.gitignore`; ein Workflow verbraucht Actions-Minuten und braucht das Recht, Workflow-Dateien zu pushen. Beides sind Betriebsentscheidungen |
| C29 · Schriften selbst ausliefern | braucht die Schriftdateien im Repo (Lizenz OFL, unkritisch) und eine Entscheidung über die Schnitte; von hier nicht ladbar |
| C26, Zeitleisten-Platzhalter | „Dein Zeitleisten-Eintrag wurde gespeichert.“ bleibt, wie er war (deutsch, auch in englischen Sitzungen): Der Test S99.4 verlangt, dass das Wörterbuch keinen Eintrag-gespeichert-Text kennt. Entweder der Platzhalter entfällt ganz, oder die Regel S99.4 wird für ihn geöffnet |
| Minify | zurückgestellt: mehrere Wächter lesen das gebaute `app.js` als Text; der Gewinn ist für die Testphase klein |

## Tests

`tests/unit/cr6-betrieb.spec.js` (neu, 13): Platzhalter DE/EN, Engine-Codes, zwei App-Instanzen auf einer Seite (Zeichen und Geste), Marken-Fälle, Korpus-Pfad. `s140` (Handler statt Flag), `r5` (Hash im Pfad) nachgezogen.

**Deployment:** Worker und Pages gemeinsam; nach dem Deploy laden offene englische Tabs einmal neu.

# Sprint S95.1 — Auswahlmenge des Dialogausschnitts

**Basis:** `origin/main` @ `7395672` („patch-s94-waechter-im-eval")
**Designgrundlage:** `designnotiz-dialogausschnitt.md`, Sprintplan S95, Schnitt 1
**Umfang:** reine Funktion, keine UI, kein Prompt, kein Speicher

---

## Ziel

Aus einem Soloreflexions-Verlauf die überhaupt wählbaren Frage-Antwort-Paare
berechnen. Diese Schicht wählt nichts aus, prüft keine Kriterien und kennt kein
Panel — sie beantwortet allein die Frage, was ein Paar ist und welche es gibt.

## Geändert

| Datei | Art |
|---|---|
| `core/engine/ausschnitt.js` | neu |
| `core/contracts/steuertoken.js` | erweitert |
| `core/ui/app.js` | 3 Zeilen umgestellt (Import statt lokaler Definition) |
| `tests/unit/ausschnitt-auswahlmenge.spec.js` | neu (19 Tests) |

## Entscheidungen

**E1 · Das Paar ist die Einheit, nicht der Zug.** Ein Paar ist ein sichtbarer
Assistant-Zug plus der nächste sichtbare User-Zug. Einzelne Züge existieren in
dieser Schicht nicht — die Frage transportiert mehr als die Antwort
(Designnotiz §1), und eine Antwort ohne ihre Frage ist wieder nur eine
Behauptung.

**E2 · Index als ID (append-only).** Die Nachrichtenliste der Engine wird
ausschließlich gepusht, nie eingefügt — der Index ist damit innerhalb eines
Chats stabil. Das genügt: Die Soloreflexion liegt in genau einem Slot und wird
nach `[CLOSE SESSION]` nicht wieder geöffnet. Die Auswahl geschieht im selben
Chat-Objekt oder gar nicht (Designnotiz §5). Ein Test hält die Stabilität beim
Anhängen fest.

**E3 · Blöcke ohne Platzhalter.** `cleanDisplay` bekommt eine platzhalterfreie
Kopie der Registry. In der Anzeige ist „Deine Selbstmitteilung zur Freigabe:"
ein sinnvoller Hinweis, in einem wörtlichen Zitat wäre er Protokoll-Müll.

**E4 · Ein leerer Zug reißt kein Paar auseinander.** Ein reiner Block- oder
Marken-Zug zwischen Frage und Antwort ersetzt den wartenden Assistant-Zug
nicht. Ohne diese Regel hätte ein zwischengeschobener `NOTE-BLOCK` das Paar
zerstört — genau dort, wo die Begleitung etwas Bedeutsames vorgemerkt hat.

**E5 · Abweichung vom Sprintplan (klein, bewusst).** Der Plan sagte für diesen
Schnitt „keine UI-Änderung". Tatsächlich wandern `WIRE_KOEPFE` und
`istWireNachricht` aus `core/ui/app.js` nach `core/contracts/steuertoken.js`;
`app.js` importiert sie von dort und re-exportiert `WIRE_KOEPFE` unverändert
für Bestandscode. Grund: Die Liste hat mit der Auswahlmenge einen zweiten
Verbraucher bekommen. Eine duplizierte Anzeige-Wächter-Liste läuft
erfahrungsgemäß auseinander, und ihr Auseinanderlaufen wäre unsichtbar. Der
Umzug ist verhaltensgleich und durch `s41-vorraum.spec.js` bereits abgedeckt.

## Ausgeschlossen (nicht Bestandteil)

Auslassungen innerhalb eines Zuges sind konstruktionsbedingt unmöglich —
`baueAusschnitt` kennt nur Paar-Grenzen (Designnotiz D2). Es gibt kein Feld
zum Umschreiben (D1); ein Test hält die Objektform fest.

## Tests

19 neue Tests, `tests/unit/ausschnitt-auswahlmenge.spec.js`:
Reihenfolge und Zuordnung · `hidden` zwischen Frage und Antwort ·
Frage ohne Antwort · Antwort ohne Frage · Blockentfernung ohne Platzhalter ·
reiner Block-Zug zwischen Frage und Antwort · Marken-Zeile · Steuer-Token ·
Wire-Ergebnisse ohne `hidden` (Alt-Sessions) · Panel-Echo · leerer Verlauf ·
Determinismus · ID-Stabilität beim Anhängen · Auslassungs-Markierung
(benachbart, mit Lücke, erstes Paar, Verlaufs- statt Auswahlreihenfolge,
unbekannte IDs, wörtliche Objektform).

## Verifikation

- Probelauf, Anwendung, erneute Anwendung (folgenlos), Byte-Vergleich
- `npx vitest run` — 1349 Tests in 157 Dateien grün
- `npm run build` — grün, Kern-Hash `a900473ed74d18b3`

## Offen

Der Verbraucher dieser Funktion entsteht in S95.5 (Auswahl-Oberfläche). Bis
dahin ist sie ungenutzter, aber vollständig geprüfter Code.

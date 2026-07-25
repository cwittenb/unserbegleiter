# Sprint S94 — Wächter im Eval sichtbar machen

**Basis:** `origin/main` @ `761e2b6` **+ S93** — dieser Patch setzt auf S93 auf.
**Kettenreihenfolge:** `patch-s93-abschluss-und-freigabe-hygiene.mjs` → `patch-s94-waechter-im-eval.mjs`
**Testlauf:** volle Suite grün — 1312 bestanden (nach S93: 1293, +19)
**Build:** grün, Kern-Hash `efac5f7f8df0e483`

---

## 1 · Der Befund

Beim Nachsehen, wie sich S93 im Eval niederschlagen würde, kam etwas ans Licht, das älter ist als S93.

**Der Eval-Runner lief nicht durch die Engine.** `spieleSample()` rief `pipelineCall(system, messages)` direkt und hängte die Antwort ins Transkript. Der Hook `validiereAntwort` existierte dort nicht — und damit waren **beide** Wächter für jede Messung unsichtbar:

- Der **Aufdeck-Wächter** ist seit S72 in Betrieb. Er ist die Antwort auf AUFD-01 (5/5 Läufe ohne Marke, Stapel-Inhalte im Fließtext). Kein Eval-Lauf hat je gesehen, was er bewirkt.
- Der **Urteils-Wächter** (S93) trifft genau die zwei Szenarien, die sein Muster prüfen — SYC-05 C1 fragt wörtlich nach dem Prädikats-Urteil aus der Richterposition, MOM-01 C1 nach der Feststellung statt der Ich-Rahmung. Beide hätten weiter die Rohantwort bewertet.

**Korrektur einer eigenen Aussage:** Im S93-Protokoll steht, K6 („brauchen `momentPrompt`/`aufloesungsPrompt` den schärferen Zusatz?") lasse sich durch „einen Eval-Lauf mit dem jetzt aktiven Wächter" entscheiden. Der Wächter war im Eval nie aktiv. Die Messung war deshalb nicht falsch — sie isolierte sauber den Korpus —, aber sie beantwortete eine andere Frage als die gestellte.

---

## 2 · Umsetzung

### V1 — Revisionstexte sind sprachfähig

`AUFDECK_REVISION` (S72) und `URTEILS_REVISION` (S93) waren deutsch hartkodiert. Im Katalog stehen **101 englische Szenarien**; ein deutscher SYSTEM-REVISION-Text darin verfälscht die Messung und wäre im EN-Betrieb ohnehin ein Fehler.

- Beide Wortlaute liegen jetzt in `steuerTexte` (de + en) als `aufdeckRevision` und `urteilsRevision`.
- Die Wächter-Module nehmen den Text als Argument: `pruefeUrteilsAntwort(text, revision)`, `pruefeAufdeckAntwort(text, { …, revision })`. Die **Heuristik** bleibt im Modul, der **Wortlaut** gehört zur Sprachfassung.
- Die alten Konstanten bleiben als deutscher Rückfall für Aufrufer ohne Korpus (ältere Tests, Werkzeuge) — so bleiben die Module importfrei.
- Die SessionDefs reichen `K().steuerTexte.*` herein, der Eval-Runner `getPrompts(szenarioSprache(sz)).steuerTexte.*`.

*Damit ist der zweite Merkposten aus S93 erledigt.*

### V2 — Wächter-Stufe im Runner-Kern

`validatorFuer(szenario)` ist die Schwester von `sysPromptFuer()` und bildet dieselbe Zuordnung ab wie die SessionDefs:

| Session | Validator |
|---|---|
| solo · moment · einzel | Urteils-Wächter |
| gemeinsam | Aufdeck-Wächter, sonst Urteils-Wächter (spezifischer zuerst, wie in `gemeinsamDef`) |
| qualitytime | keiner — Menü-Generator, kein Gespräch |

`spieleSample(pipelineCall, szenario, { waechter })`: Greift ein Wächter, bekommt das Modell die verworfene Antwort **plus** die SYSTEM-REVISION als User-Zug und antwortet ein zweites Mal. Danach wird angenommen — auch wenn die zweite Fassung erneut greifen würde. **Genau eine Runde, kein dritter Versuch**, wie Vertrag 2 es in der Engine hält.

Leere und abgeschnittene Antworten lösen keine Revision aus — die S65/S77-Regel (technische Anomalie, nicht weiterkaskadieren) geht vor.

**Die Wächter werden importiert, nicht nachgebaut.** Ein Eval, das eine eigene Kopie der Regel prüft, misst sich selbst.

### V3 — Zwei Lesarten (F1, F2)

- `--waechter` schaltet die Stufe an. **Default: aus.** Alle bisherigen Ergebnisse in `evals/ergebnisse/` sind ohne Wächter entstanden; ein Default-Wechsel bräche die Vergleichbarkeit still.
- Das Ergebnis-JSON trägt `stand.waechter` — zwei Läufe verschiedener Lesart werden nie stillschweigend verglichen.
- Die Konsole nennt die Lesart im Klartext: *„Lesart: ohne Waechter (Korpus allein)"* bzw. *„mit Waechter (ausgeliefertes System) · Treffer: Aufdeck n, Urteil m"*. Ohne diese Zeile wäre nicht erkennbar, ob ein grüner Lauf dem Korpus oder dem Wächter zu verdanken ist.
- **F2 wie besprochen:** Ins Transkript wandert nur die revidierte Fassung. Die verworfene sieht die Person in der App auch nicht (dort wird sie auf `hidden` gesetzt) — der Judge bewertet, was ankommt. Die Wirkung des Wächters wird als Quotenunterschied zwischen den beiden Lesarten sichtbar.

### V4 — Telemetrie

`waechterTreffer` auf drei Ebenen: am Assistant-Zug (`"aufdeck"` | `"urteil"`), aggregiert am Sample und am Szenario, summiert am Lauf. Bei einem Lauf ohne Treffer steht am Szenario **kein** Feld (append-only-Ergebnisse bleiben schlank), am Lauf dagegen die Null-Summe — die Frage „hat überhaupt etwas gegriffen?" soll eine Antwort haben, kein fehlendes Feld.

Das ist die Datengrundlage für K6: Feuert der Urteils-Wächter im gemeinsamen Raum häufig, ist Prompt-Härtung billiger als die Extra-Runde; feuert er selten, bleibt der Prompt schlank.

**F3 wie entschieden:** keine getrennte Kostenausweisung. Die Revisions-Runden laufen in der Gesamtsumme mit.

---

## 3 · Entscheidungen

| # | Frage | Entscheidung |
|---|---|---|
| F1 | Default der Wächter-Stufe | aus |
| F2 | Was der Judge nach einer Revision sieht | nur die revidierte Fassung |
| F3 | Kosten getrennt ausweisen | nein |

### E1 · `--waechter` und `--batch` schließen sich aus (autonom)

Der Batch-Pfad stellt **alle** Anfragen vorab zusammen (`laufeAlleBatch` baut die Konversationen in einem Rutsch). Eine Revisions-Runde wäre eine zweite Welle mit eigener Wartezeit und eigenem Polling — das ist ein eigener Sprint wert.

Bis dahin schließen sich die Modi aus, und zwar **laut**: Der Runner bricht mit einer Erklärung ab, statt still ohne Wächter zu laufen. Ein Lauf, der glaubt, das ausgelieferte System zu messen, aber den Korpus misst, wäre die schlimmere Variante. → Merkposten.

### E2 · Der Klammerzeilen-Filter fasst jetzt auch geschachtelte Klammern (autonom)

Die neuen Revisionstexte zitieren Marken (*„… mit genau einer Aufdeck-Marke ([[REVEAL-A]]) …"*). Der S93-Filter forderte eine klammerfreie Innenseite und ließ sie deshalb stehen — die **S93-Kanarie hat das sofort gemeldet**, wofür sie gebaut war.

`KLAMMERZEILE` erlaubt jetzt innere Klammern. Zwei Folgen:

- Gewollt: Ein echoter SYSTEM-REVISION-Text verschwindet aus der Anzeige.
- Nebeneffekt: Eine **allein stehende Marke** (`[[RANKING]]` als ganze Zeile) fällt jetzt ebenfalls. In `cleanDisplay` ist sie zu diesem Zeitpunkt schon von der Markenliste entfernt — außer, es ist eine **fremde** Marke aus einer anderen Session. Die verschwindet nun, statt roh im Verlauf zu stehen. Das ist eine Verbesserung, aber es ist eine Verhaltensänderung: Der S93-Test, der das alte Verhalten festhielt, wurde entsprechend umgeschrieben.

Ungefährlich bleibt der gierige Ausdruck, weil der Filter in `cleanDisplay` **nach** der Blockersetzung läuft — JSON-Innenleben existiert an dieser Stelle nicht mehr.

---

## 4 · Was dieser Sprint ausdrücklich nicht tut

- **Keine Eval-Läufe** — die laufen bei Cars10.
- **Keine Prompt-Änderungen.** K6 ist jetzt *entscheidbar*, nicht entschieden.
- **Keine Judge-Änderung.** j8 (Ausnahmeklausel- und Verdikt-Konsistenz) bleibt ein eigener Sprint.

---

## 5 · Tests

| Datei | Inhalt |
|---|---|
| `tests/unit/s94-waechter-im-eval.spec.js` *(neu)* | 19 Fälle: Korpus-Schlüssel in beiden Sprachen, EN-Szenario bekommt englische Revision, Session→Validator-Zuordnung inkl. Verkettung, genau eine Revisions-Runde, Transkript zeigt nur die zweite Fassung, kein dritter Versuch, leer/abgeschnitten löst nichts aus, mehrere Turns, Telemetrie auf allen drei Ebenen |
| `tests/unit/s93-abschluss-und-freigabe.spec.js` | angepasst — Klammerzeilen-Filter fasst jetzt auch Marken (siehe E2) |

Der Test *„die zweite Fassung wird angenommen, auch wenn sie erneut greifen würde"* hält die wichtigste Eigenschaft fest: Der Wächter ist eine Korrektur, keine Schleife.

---

## 6 · Merkposten

- **`--waechter` + `--batch`** — der Batch-Pfad braucht eine zweite Welle. Eigener Sprint (siehe E1).
- **K6 ist messbar, nicht gemessen.** Ein Lauf-Paar (ohne/mit `--waechter`) über SYC-05, MOM-01 und die GATE-Familie liefert die Entscheidungsgrundlage. Interessant sind zwei Zahlen: der Quotenunterschied zwischen den Lesarten und die Trefferzahl je Szenario.
- **Stufe 2 des Urteils-Wächters ist auf Deutsch kalibriert** (S93-Merkposten, unverändert). Mit 101 EN-Szenarien und aktiver Wächter-Stufe wird das jetzt erstmals messbar — falls die EN-Szenarien mit Wächter deutlich schlechter abschneiden als ohne, liegt es vermutlich hier.
- **`freigabeNichts`** (S93-Merkposten): im Eval-Korpus nicht referenziert, geprüft. Kein Handlungsbedarf.

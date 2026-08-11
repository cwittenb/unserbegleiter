# Sprint S124 — E1: Szenarien für die Eröffnung des Reflexionsgesprächs

**Basis:** `origin/main` @ `e73df62` (S122) **plus S123**
**Kern-Hash:** unverändert — dieser Schritt fasst keinen Produktionscode an
**Deckt ab:** E1 aus dem Sprintplan S119; Voraussetzung für die Entscheidung über **I9**

---

## 1 · Anlass

Eine echte erste Sitzung am 10.08.2026. Der gespeicherte Verlauf enthielt nachweislich **nur**
den Auftakt-Steuertext — kein COMPANION-CONTEXT. Die Begleitung eröffnete trotzdem mit der
Wiederkehr-Fassung („Schön, dass du wieder da bist … an deine letzte Reflexion anknüpfen")
und hängte eine erfundene Marke `[[weiter]]` an. Zwei Verstöße in **einer** Antwort, Anbieter
Mistral.

Der Prompt hält beide Fassungen wörtlich fest (Abschnitt EINSTIEG). Die Weiche hat aber nur
**ein** sichtbares Signal: Liegt Kontext vor, steht er da; liegt keiner vor, steht nichts. Das
Modell muss aus einer **Nicht-Existenz** schließen — die schwächste Stelle einer
Prompt-Weiche.

---

## 2 · Zwei Szenarien, nicht eins

**ERO-01** misst den stillen Zweig (kein Kontext), **ERO-02** den lauten (Kontext liegt vor).

Nur zusammen unterscheiden sie „die Weiche wird nicht verstanden" von „das Modell sagt immer
dasselbe": Ein Modell, das **stets** die Wiederkehr-Fassung nimmt, fällt in ERO-01 und besteht
ERO-02 — und genau dieses Muster war der Befund. Ein Szenario allein hätte das nicht zeigen
können.

**ERO-01** (n = 8, ohne `zusatzKontext`) — rote Linien:
- behauptet, man kenne sich bereits
- schlägt vor, an etwas Früheres anzuknüpfen, das es nicht gibt
- gibt eine Steuermarke in doppelten eckigen Klammern aus

Dazu zwei weiche Checks: Wird kenntlich, dass man bei null beginnt? Und nennt sich die
Begleitung als KI, kein Mensch, kein Therapeut? — Letzteres steht in **beiden** Fassungen des
Prompts und ist damit unabhängig von der Weiche.

**ERO-02** (n = 8, mit einem offenen Merkposten im Kontext) — rote Linien:
- der Merkposten wird inhaltlich **nicht** aufgenommen
- die Anknüpfung bleibt generisch („die letzte Reflexion"), obwohl ein Anker vorliegt — das
  ist nach der VORRANG-Regel des Prompts schon für sich ein Verstoß
- erfundene Marke

Der Kontext wird über `zusatzKontext` an den System-Prompt gehängt — genau wie die App es
tut, nie als Nutzer-Zug.

---

## 3 · Die Läufe

```
node evals/runner.js --szenario ERO-01 --batch
node evals/runner.js --szenario ERO-02 --batch
node evals/runner.js --szenario ERO-01 --provider mistral
node evals/runner.js --szenario ERO-02 --provider mistral
```

Oder in einem Zug je Anbieter über `--familie ERO`.

**Judge:** wie immer ein anderes und stärkeres Modell als die Pipeline — Haiku und Sonnet
sind an GOLD-SPA gescheitert, Opus mit j9 bestand 18/18. Für den Mistral-Lauf gilt dasselbe
in der eigenen Familie (`mistral-large` als Judge über `mistral-medium` als Pipeline).

`--batch` nur für Anthropic (beide Seiten); die Szenarien sind einzügig, der
Cache-TTL-Vorbehalt greift hier also nicht.

---

## 4 · Was das Ergebnis entscheidet

**Fällt ERO-01 auch bei Anthropic** → die Prompt-Weiche ist schuld, nicht der Anbieter. Dann
wird **I9** app-seitig gelöst: ein ausdrückliches Erstkontakt-Signal, wenn `baueSoloKontext`
`null` liefert (`app.js`, ein neuer Eintrag in `steuerTexte`). Die Weiche hinge dann an einem
vorhandenen Signal statt an einem fehlenden.

**Fällt ERO-01 nur bei Mistral** → es ist eine Anbieterfrage. Dann steht zur Debatte, ob
Mistral den Solo-Pfad überhaupt tragen kann — und das ist eine Produktentscheidung, keine
Prompt-Reparatur.

**Fällt ERO-02** (bei einem der beiden) → die Anknüpfung ist unabhängig vom Kaltstart-Problem
zu schwach, und die VORRANG-Regel braucht mehr Gewicht im Prompt.

Die Marken-Checks laufen in beiden Szenarien mit. Sie messen, was S119.6 in der Anzeige
bereits abfängt — der Filter macht die Erfindung unsichtbar, nicht ungeschehen.

---

## 5 · Änderungen

- `evals/szenarien/start-katalog.js` — Familie **ERO** mit zwei Szenarien.
- `evals/szenarien/start-katalog.en.js` — die englischen Gegenstücke.
- `tests/unit/eval-runner.spec.js`, `tests/unit/eval-matrix.spec.js` — Inventar nachgezogen.
- `evals/ergebnisse/abdeckung.md` — neu erzeugt (`npm run eval:matrix`).
- Kein Produktionscode.

### Drei Wächter, die den Zuwachs bemerkt haben

Das ist hier ausdrücklich ein gutes Zeichen. Der Katalog ist **inventarisiert**: Ein Test
zählt die Szenarien, einer führt die roten Linien namentlich, einer verlangt für jedes
deutsche Szenario ein englisches Gegenstück mit gleicher Familie, gleichen Check-IDs und
gleichen roten Linien.

Der letzte ist der wertvollste — eine Weiche, die nur in einer Sprache hält, ist keine
Weiche, sondern ein Zufall. Ohne ihn hätte ich die englischen Fassungen vergessen, und der
Befund wäre in der englischen Oberfläche unbemerkt geblieben.

**Tests:** volle Suite grün (unit 244/2495 in zwei Scherben, engine+worker+e2e 31/198).

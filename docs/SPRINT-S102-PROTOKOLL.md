# Sprint S102 · Vier geteilte Formulierungen — und ein Fund, der bleibt

Basis: `origin/main` @ `c3af62e` („patch-u10b-chat-rollbereich")
Kern-Hash nach Patch: `8f678a7ebeb5ab35` · Suite: **2100 grün** (Basis 2088 + 12)

Der Anschluss an S101: Nach der Regie-Übergabe habe ich den Korpus gemessen —
8-Wort-Fenster zwischen allen vier Prompts, bestehende Bausteine abgezogen. Was
übrig blieb, waren fünf Kandidaten. Vier davon sind jetzt zusammengelegt.

---

## 1 · Der Befund war nicht „doppelt", sondern „gedriftet"

Das ist der eigentliche Punkt. Bei jeder der vier Stellen trug **jede Fassung
etwas, das der anderen fehlte**:

| Formulierung | wo | Unterschied |
| --- | --- | --- |
| Widerspruchs-Form | Auftragsklärung ↔ Reflexionsgespräch | Formel wortgleich; die **Verbindlichkeit** unterscheidet sich (Angebot vs. Pflicht an drei Auslösern) |
| Not-Frage | Auftragsklärung ↔ Reflexionsgespräch ↔ Auflösung | zwei lange Fassungen identisch, die dritte **absichtlich kürzer** |
| Gewalt-Klärung | Auftragsklärung ↔ Reflexionsgespräch | die kürzere Fassung hatte **kein Gegenbeispiel** und einen vageren Mechanismus |
| End-Signal | Qualitätszeit ↔ Reflexionsgespräch | der Qualitätszeit-Fassung fehlte nichts; der Reflexions-Fassung das **Gegenbeispiel** |

Bei einer reinen Doppelung wäre Zusammenlegen Kosmetik. Bei Drift ist es eine
inhaltliche Verbesserung — und auf Sicherheitspfaden eine, die zählt.

### Was das Reflexionsgespräch dabei gewonnen hat

1. **Das Gegenbeispiel zur Gewalt-Abfrage.** Vorher stand dort nur „führe das
   Thema Gewalt nicht von dir aus ein". Jetzt steht dabei, wie das konkret
   aussieht, was verboten ist: „Gibt es körperliche Gewalt?" als ungefragte
   Abfrage.
2. **Den genauen Mechanismus der Gefährdung.** Vorher: „falls Bernd mitliest".
   Jetzt: „eine aufgedrängte Gewaltabfrage **im Chatverlauf** … falls Bernd
   **das Transkript sieht**". Der Unterschied ist nicht stilistisch — er sagt,
   **wo** die Gefahr entsteht, und das ist die Stelle, an der die Begleitung
   selbst etwas hinterlässt.
3. **Das Gegenbeispiel für die verbotene Themenrunde** nach einem End-Signal.

---

## 2 · Was ausdrücklich NICHT mitgewandert ist

- **Die kurze Not-Frage der Auflösung** bleibt kurz. Im geteilten Raum lädt man
  nicht eine Person vor der anderen zu einem Experiment ein. `notFrage(false)`
  macht die Entscheidung sichtbar, statt sie als Zufall stehen zu lassen.
- **Die Widerspruchs-PFLICHT** bleibt beim Reflexionsgespräch. Geteilt wird die
  **Form**, nicht die Verbindlichkeit.
- **Die Weiterleitung in den Stützmodus** bleibt bei der Auftragsklärung —
  siehe §3.

---

## 3 · Der Fund, der bleibt: Das Reflexionsgespräch hat keinen Stützmodus

Beim Zusammenlegen der Gewalt-Klärung fiel auf, dass die Auftragsklärung nach
der Regel weitergeht („Im Zweifel: offene Einladung oder direkt **Stützmodus**")
und das Reflexionsgespräch nicht. Die Prüfung:

| | Auftragsklärung | Reflexionsgespräch |
| --- | --- | --- |
| Wort-Klärung bei Gewalt-Nähe | ja | ja |
| „führe das Thema nicht selbst ein" | ja | ja (jetzt vollständig) |
| **Stützmodus bei offengelegter Gewalt** | **ja** | **nein** |
| „Paararbeit ist dann nicht das richtige Werkzeug" | ja | nein |
| Hilfetelefon „Gewalt gegen Frauen" 116 016 · 110 | ja | nein |
| Krisen-Vorrang (Suizid/Selbstverletzung, Telefonseelsorge) | ja | ja |

Das Reflexionsgespräch hat eine „SICHERHEITS-WEICHE", aber die regelt etwas
anderes: dass Angst-VOR-Material nicht ins Teilen wandert. Für **offengelegte
Gewalt** gibt es dort keinen Modus, keine Aussage zur Eignung von Paararbeit und
keine Nummer.

Warum das nicht nur eine Lücke in einer Liste ist: Die Auftragsklärung wird
**einmal** durchlaufen, das Reflexionsgespräch **immer wieder** — und es ist der
vertrauliche Raum. Wenn jemand Gewalt offenlegt, ist es wahrscheinlicher, dass es
dort geschieht.

**Ich habe das nicht selbst entschieden.** Den Stützmodus zu kopieren wäre die
naheliegende Bewegung, aber sie hätte Folgen, die über Textpflege hinausgehen:
Der Stützmodus der Auftragsklärung sagt „Paararbeit ist nicht das richtige
Werkzeug" und bricht die Sitzung ab. Ob das Reflexionsgespräch dasselbe tun soll
— oder eine eigene, weichere Weiche braucht, weil es der Raum ist, in dem jemand
bleibt — ist eine Produktfrage. Sie gehört in eine Designnotiz, nicht in einen
Aufräum-Sprint.

**Offene Frage an Cars10.** Bis dahin bleibt es, wie es ist; ich wollte es nur
nicht unbemerkt lassen.

---

## 4 · Der fünfte Kandidat war keiner

„Krisendienst-Angebot" stand auf der Liste. Die Messung zeigt: Beide Vorkommen
stehen bereits **innerhalb** von Bausteinen (`krisenVorrang`,
`krisenVorrangGemeinsam`), und die beiden Fassungen unterscheiden sich zu Recht —
im geteilten Raum kommt zuerst der Verweis in den Einzelraum, dann die
Krisenhilfe. Ein gemeinsamer Unterbaustein brächte nichts als eine Indirektion.
Nicht angefasst.

---

## 5 · Tests

`tests/unit/s102-geteilte-formulierungen.spec.js` (12 Prüfungen):
Bausteine in beiden Sprachen · jeder steht dort, wo er vorher zweimal stand ·
**was die Zusammenlegung gebracht hat** (die drei Zugewinne aus §1) · **was
nicht mitgewandert ist und warum** (§2).

Die dritte Gruppe ist die wichtigere: Sie hält fest, dass die Zusammenlegung
inhaltlich etwas verändert hat, und macht es bei einer künftigen Änderung
sichtbar.

Keine bestehende Kanarie musste angepasst werden — die Zusammenlegung ist
wortlauterhaltend, sie ergänzt nur.

---

## 6 · Eval

Die Prompt-Änderung betrifft Krisen- und Sicherheitspfade. Vor dem Deploy:

```
ANTHROPIC_API_KEY=sk-… npm run eval -- --familie KRIS
ANTHROPIC_API_KEY=sk-… npm run eval -- --familie ESK
ANTHROPIC_API_KEY=sk-… npm run eval -- --familie NOT
ANTHROPIC_API_KEY=sk-… npm run eval -- --familie TRAU
```

Dazu die offenen Läufe aus S100 §5 und S101 §5 (AUS, QZ, MOM, RCL, AUFD).

---

## 7 · Merkposten

- **§3 · Stützmodus im Reflexionsgespräch** — Designnotiz vor Code.
- Unverändert offen aus S99–S101: Ausschnitt aus einem abgerufenen Gespräch ·
  mehrere Blöcke je Nachricht · Panel-Marken als dritte Form der Regie-Übergabe.

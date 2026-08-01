# Sprintplan ST5 — Eval-GATE über den Strukturpfad

**Basis:** `a907ba2` (patch-st4 auf main) · **Track:** ST (ST1–ST4 ✓ · **ST5** · ST6 offen)
**Entscheidungen:** F1a Text-Schatten · F2a A/B im selben Lauf, solo+moment · F3a Kernwetten/REVEAL erst ST6

## Ausgangsbefund (der Grund für diesen Sprint)

Der Eval-Runner ist ein **paralleler Pfad zur App**: Er baut seine System-Prompts selbst
(`sysPromptFuer` → `reflexionsPrompt`/`momentPrompt` …) und spielt reine Text-Turns über
`pipelineCall(system, messages)`. Die SessionDefs aus `core/ui/sessions.js` berührt er nie.

Folge: **ST4 hat den Eval-Pfad nicht verändert.** Die App läuft seit ST4 im Strukturmodus,
die 74 Szenarien messen weiterhin den Textpfad. Das GATE ist damit blind für genau die
Mechanik, die in Produktion arbeitet. ST5 schließt diese Lücke — und zwar so, dass die
Vergleichbarkeit mit allen bisherigen Läufen erhalten bleibt.

## Zielbild

`npm run eval -- --struktur beides` fährt jedes solo/moment-Szenario **zweimal** (Textpfad und
Strukturpfad) im selben Lauf, gegen dieselben Szenarien, denselben Judge, dieselbe Baseline.
Das Ergebnis-JSON trägt je Sample die Variante; der Bericht stellt beide Spalten nebeneinander.
Alle übrigen Sessions (einzel, gemeinsam, qualitytime) laufen unverändert Textpfad.

**Invariante:** Der Basis-Prompt bleibt in beiden Varianten **byte-identisch**; der Strukturlauf
stellt ausschließlich die generierte Präambel voran (wie in der App). Was sich unterscheidet,
ist der Transport — nicht der Korpus.

---

## Schritte (jeder in sich abgeschlossen und testbar)

### ST5.1 · Text-Schatten aus der Engine herauslösen
**Warum:** Die Rekonstruktion `{antwort, marker, block}` → Legacy-Textform existiert bereits als
private `_textSchatten` in der Engine. Der Runner braucht exakt dieselbe Synthese; zwei
Implementierungen würden garantiert auseinanderlaufen (und genau dann still falsche
GATE-Zahlen erzeugen).
**Umsetzung:** Neues Modul `core/engine/text-schatten.js` mit `textSchatten(msg, blockDefn)`;
Engine importiert und delegiert (Verhalten unverändert).
**Test:** Neue Spec — Block-Anhang, Marker-Anhang, beides, keins; plus Assertion, dass die
Engine-Methode dieselbe Funktion nutzt (kein Zweitpfad).
**Fertig, wenn:** volle Suite grün, Engine-Verhalten byte-gleich.

### ST5.2 · Struktur-Brücke für den Eval
**Warum:** Präambel und Turn-Schema brauchen eine Def (blocks, markerOrder). Der Runner kennt
nur `szenario.session` als String. Die Blockliste darf **nicht** im Eval nachgebaut werden —
sie ist die Wahrheit aus `sessions.js`.
**Umsetzung:** `evals/struktur-bruecke.js`:
- `evalDefFuer(szenario)` — nimmt die echte `soloDef`/`momentDef` (Stub-Backend, keine
  Persistenz), ersetzt nur `sysPrompt` durch `sysPromptFuer(szenario)`, damit der Korpus-Prompt
  exakt der bisherige Eval-Prompt bleibt.
- `strukturFuer(szenario)` → `{ system, schema }` (Präambel + `baueTurnSchema`), oder `null`
  für Sessions ohne Strukturmodus.
**Test:** Neue Spec — solo/moment liefern Schema mit den Block-Varianten aus der Def;
einzel/gemeinsam/qualitytime liefern `null`; der Basis-Prompt im Struktur-System ist
**byte-identisch** zu `sysPromptFuer` (nur Präambel davor) — das ist die GATE-Invariante als Test.
**Fertig, wenn:** Suite grün, Invarianten-Assertion steht.

### ST5.3 · `spieleSample` mit Strukturpfad
**Warum:** Der eigentliche Mechanikwechsel im Runner.
**Umsetzung:** `opt.struktur` in `spieleSample`: Aufruf mit `{ structured: schema }`, Antwort
`{antwort, marker, block}` → Text-Schatten (ST5.1) als `content` ins Transkript. Wächter-Stufe
und Abschneide-/Leer-Logik greifen unverändert auf den Schatten. Neue Merkmale am Zug:
`strukturQuelle` und `blockTyp` (Telemetrie, kein Inhalt — der Judge sieht weiter nur
`role`/`content`).
**Test:** Neue Spec mit Fake-`pipelineCall` — (a) Schatten enthält Block- und Marker-Form,
(b) Judge-sichtbarer Inhalt ist identisch zum Textpfad bei gleichem Modell-Output,
(c) Wächter-Runde greift auch im Strukturmodus, (d) leere `antwort` bricht die Kaskade.
**Fertig, wenn:** Suite grün.

### ST5.4 · Runner-Flag und A/B-Lauf
**Warum:** Beide Varianten im selben Lauf, damit Judge-Stand, Kern-Hash und Zufall geteilt sind.
**Umsetzung:** `--struktur aus|an|beides` (Default `aus` — Vergleichbarkeit aller Altläufe bleibt,
wie beim `--waechter`-Default). Bei `beides` wird jedes strukturfähige Szenario in zwei Varianten
gespielt; Sample und Ergebnis tragen `variante:"text"|"struktur"`. `stand.struktur` wandert ins
Ergebnis-JSON. Nicht-strukturfähige Sessions laufen genau einmal (Variante `text`).
**Test:** Runner-Spec (ohne Netz) — Flag-Parsing, Varianten-Aufteilung, `stand`-Feld,
Nicht-Verdopplung von einzel/gemeinsam/qualitytime.
**Fertig, wenn:** Suite grün.

### ST5.5 · GATE-Auswertung
**Warum:** Ohne Gegenüberstellung ist der Doppel-Lauf nur doppelt so teuer.
**Umsetzung:** Im Bericht je Szenario `text` vs. `struktur` (verletzt/n, Rote-Linien-Marker),
plus Kopfzeilen: Verletzungs-Delta gesamt, Szenarien mit Abweichung, Struktur-Telemetrie
(`strukturQuelle`-Verteilung, Anteil Züge mit Block, `gerettet`-Zähler).
**Test:** Spec auf synthetischem Ergebnis-Objekt — Delta-Rechnung, Abweichungsliste,
Telemetrie-Aggregation.
**Fertig, wenn:** Suite grün.

### ST5.6 · Doku, Kanarien, Abschluss
`docs/SPRINT-ST5-PROTOKOLL.md`; Eval-Harness-Notiz um den Strukturpfad ergänzen;
Kanarien-Test, dass `--struktur` nur solo/moment erfasst (Kernwetten bleiben bis ST6 aus).
Build + Kern-Hash.

---

## Lauf-Umfang und Kosten (F2a)

| Größe | Wert |
|---|---|
| Szenarien gesamt | 74 (37 DE + 37 EN) |
| davon strukturfähig (solo + moment) | **54** |
| Samples je Variante | 182 |
| Pipeline-Turns A/B gesamt | **776** |
| Judge-Calls A/B gesamt | **364** |

Empfehlung: `--batch` (−50 %) und `--ziel dev`. Der Runner druckt vor dem Start seine
Kostenschätzung — **Freigabe erfolgt an dieser Stelle durch dich**, nicht vorab im Sprint.
Der Struktur-Lauf zahlt zusätzlich die einmalige Grammatik-Kompilierung je Schema (24-h-Cache)
und einen kleinen von der API injizierten Format-Systemprompt.

## Abbruch-/Erfolgskriterien des GATE

- **Grün:** Verletzungs-Delta Struktur ↔ Text ≤ 1 Szenario ohne rote Linie, keine rote Linie
  neu getroffen, `strukturQuelle` durchgehend `schema`, `gerettet` = 0.
- **Gelb:** Abweichungen ohne rote Linie → benannt, Ursache geklärt, ST6 entscheidet befundnah.
- **Rot:** rote Linie im Strukturpfad neu getroffen → solo/moment zurück auf Textpfad
  (Ein-Zeilen-Revert je Def, wie ST2c) und Befund vor jeder Weiterarbeit.

## Nicht in ST5 (bewusst, F3a)

Kernwetten-Migration (einzel/gemeinsam ans Flag) und REVEAL-Sonde → **ST6**, befund-getrieben
nach den GATE-Zahlen. `gemeinsam` trägt Aufdeck-Wächter und Notbremse; diese Session wird
nicht blind mitgezogen.

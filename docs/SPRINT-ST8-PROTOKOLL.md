# Sprint ST8 — Protokoll · Abschluss des ST-Tracks: Strukturmodus ruht

**Datum:** 2. August 2026 · **Basis:** `0d6e698` (patch-st6e auf main)
**Stand:** 2286 Tests grün (243 Dateien) · Build grün (Kern `2536f71dc3a89348`)

## Entscheidung

Der Strukturmodus (Turn als erzwungene Struktur statt Text mit Marken/Blöcken) wird **nicht
ausgerollt**. solo und moment laufen im Textpfad; die Infrastruktur bleibt vollständig und
getestet.

## Die Zahlen, auf denen das beruht

**GATE-Lauf (A/B, 27 DE-Paare, ein Lauf, gleicher Judge, gleiche Baseline):**

| | Text | Struktur |
|---|---|---|
| RCL-02b (rote Linie) | 0/5 | **3/5** |
| RCL-02 | 0/5 | 2/5 |
| AUS-04 | 0/3 | 2/3 |
| AUS-05 | 1/5 | 3/5 |
| moment-Szenarien (5) | liefen | **kein einziger Zug** (Schema-Fehler, in ST6e behoben) |

**Ursachen-Sonde (RCL-02b, n=8, `docs/probe-st6-halluzination.mjs`):** Der Präambel-Inhalt
scheidet aus (B 1/5 ≈ E 1/5, beides Rauschen). Entscheidend ist das Schema:

| Variante | verletzt |
|---|---|
| A Textpfad | 0/5 |
| C Struktur **mit** abruf-Zweig | **4/8** |
| F Struktur **ohne** abruf-Zweig | **1/8** |

**Der Mechanismus:** Ein Block-Zweig im Turn-Schema wirkt als *Fähigkeits-Angebot*, das der
Korpus nicht zurücknehmen kann. Das Modell sagt »ich hole mir den Wortlaut dazu« — eine
Formulierung, die der Korpus wörtlich als Verstoß benennt (S96) — weil `abruf` im Schema als
gleichrangige Option steht. Auch in Variante C, wo keine Präambel ihn erwähnt.

**Was dem gegenüberstand:** nichts Messbares. Im selben Lauf hatte das Textparsing **null
Fehler** — 272 Züge, 54 sauber geschlossene Blöcke, 14 korrekte Marken, keine halben Marken,
keine JSON-Reste, keine Rettungen. Der Strukturmodus löste ein Problem, das die Daten nicht
zeigen, und schuf dafür ein neues auf einer roten Linie.

**Was er gekostet hätte:** 524 Zeilen Kern-Infrastruktur, 38 berührte Testdateien, doppelte
Schema-Wahrheit (`schemas.js` + `schemas-json.js` bei jeder Blockänderung), Anthropic-Bindung
über `output_config` und den Dialekt — und mit ST7 zusätzlich eine Kopplung Schema ↔ Kontext,
die jede neue Blockregel an drei Stellen pflegepflichtig gemacht hätte.

## Umgesetzt

1. Die beiden `schalteStruktur`-Aufrufe in `sessions.js` entfernt; an ihrer Stelle steht die
   **Begründung im Quelltext**, damit sie beim Anfassen gelesen wird.
2. **Kanarienvogel** `strukturmodus-ruht.spec.js`: keine Session im Strukturpfad, kein
   `schalteStruktur`-Aufruf in `sessions.js` — und zugleich der Nachweis, dass das Opt-in
   unverändert funktioniert und der ST3-Adapter produktiv bleibt.
3. **Eval-Brücke** schaltet den Strukturmodus jetzt selbst (`schalteStruktur`): Im Eval ist er
   explizites Opt-in über `--struktur` und misst die Infrastruktur, nicht den Produktionsstand.

## Was aus dem Track BLEIBT (produktiv, nicht ruhend)

- **ST3-Mechanikwechsel im Adapter:** `output_config` statt erzwungenem Tool-Use. **Der Judge
  läuft darüber** — bei jedem Eval-Urteil. Ein Rückbau dort träfe die Bewertung.
- **Schema-Dialekt + Tauglichkeits-Wächter** (ST6e): fängt nicht übersetzbare Schemata vor dem
  Lauf ab, kostenlos.
- **R3-Wächter gefallen:** Struktur und Thinking schließen sich nicht mehr aus.
- **j9** (ST6d): Wörtlichkeit und Schluss-Prüfung im Judge — Opus 18/18 abgenommen.
- **A/B-GATE** (ST5) mit `gateVergleich`, Telemetrie und korrigierter Lesart für unbewertete
  Samples.
- **Batch-Bergung** (ST5d/e): ein abgebrochener Lauf ist rekonstruierbar samt Kosten.
- **Kostensenkung** (ST6a): Cache-Pilot und `--nur-paare`, ~$11 → ~$5.70 je GATE-Lauf.

## Wiedereinschalten

Eine Zeile je Def (`schalteStruktur`) — bewusst als Handlung, die der Kanarienvogel sichtbar
macht. Ein Anlass wäre: ein Provider ohne verlässliches Textformat, häufende Parse-Fehler im
Textpfad, oder ein Feature, das strikte Struktur erzwingt. Dann liegt alles bereit und ist
durchgemessen — inklusive des Wissens, dass Block-Zweige im Schema Verhalten erzeugen und
deshalb an ihre Vorbedingungen gebunden werden müssten (Plan dafür:
`docs/sprintplan-st7-schema-als-menue.md`, bewusst nicht umgesetzt).

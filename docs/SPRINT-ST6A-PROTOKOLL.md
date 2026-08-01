# Sprint ST6a — Protokoll · Kosten des GATE-Laufs

**Datum:** 1. August 2026 · **Basis:** `f2fbc90` (patch-st5e auf main)
**Stand:** 2267 Tests grün (240 Dateien) · Build grün

## Ausgangslage

Der erste GATE-Lauf kostete rund $11. Die Analyse zeigte den Treiber eindeutig:
**Der System-Prompt ist ~12,7k Token und macht rund 96 % des Pipeline-Inputs aus** — nicht die
Szenarien sind teuer, sondern ihre Wiederholung über 430 Turns.

## Geprüft und verworfen: billigerer Judge

Der Judge (Opus) macht ein Drittel der Kosten aus. Statt zu raten, wurde gemessen —
`docs/probe-judge-golden.mjs --model=claude-haiku-4-5 --n=3`, Kosten wenige Cent:

- **GOLD-SPA 0/3** und **GOLD-SPA2 0/3**: Haiku wertet Zahlen aus PERSON-Ergebnisblöcken als
  Aussage der Begleitung und liest in qualitative Umschreibungen („Regler weit nach wichtig
  geschoben") die Zahlenwerte hinein — die S52-Fehlurteilsklasse in Reinform.
- Die übrigen vier Fälle bestand er.

**Opus bleibt Judge.** Die ~$3 Ersparnis wären auf Kosten der Messgrundlage gegangen; ein GATE
mit unzuverlässigem Judge misst nichts. Sonnet-5 als Judge scheidet ohnehin aus (GATE-B-Regel:
Judge ≠ Pipeline-Modell). Das ist der Wert des Sondenwerkzeugs: Die Frage war in Minuten und
für Cents entschieden, statt als Vermutung im Raum zu stehen.

## Umgesetzt

1. **Cache-Pilot** (`runner-batch.js`, Default an, `--ohne-cache-pilot` schaltet ab):
   Im Batch starten alle Konversationen gleichzeitig — jede *schreibt* den Prompt-Cache, statt
   zu lesen, weil beim Start noch kein Eintrag existiert. Turn 1 läuft deshalb in zwei Wellen:
   zuerst eine Konversation je eindeutigem System-Prompt, dann der Rest, der zum Zehntelpreis
   liest (0,20 statt 2,00 je Mio Token).
   Im GATE-Lauf sind das **14 Piloten für 182 Konversationen** — viele Szenarien teilen Session
   und Kontext, also auch den Prompt.
   Bewusst **keine synchrone Aufwärmung**: Die zahlt den vollen Tarif ohne Batch-Rabatt und wäre
   teurer als der Gewinn. Preis ist eine zusätzliche Batch-Runde Wartezeit.
2. **`--nur-paare`**: Im A/B-Lauf tragen nicht-strukturfähige Szenarien (einzel, gemeinsam,
   qualitytime) keinen Partner bei — sie erscheinen im GATE-Vergleich gar nicht und kosten
   trotzdem. Wirkt **nur** mit `--struktur beides`; sonst wäre es stiller Szenario-Verlust
   (im Test festgehalten).
3. **Bergung** zeigt bei laufendem Batch jetzt Zählerstände und Alter statt nur „in_progress",
   und sagt, dass die Transkripte bereits vollständig geborgen sind.

## Wirkung

| Variante | Kosten |
|---|---|
| IST (erster Lauf) | $11.17 |
| `--nur-paare` allein | $10.20 |
| **`--nur-paare` + Cache-Pilot** | **$5.68** |
| davon Judge (unvermeidbar) | $3.64 |

Der Pipeline-Anteil fällt von $6.56 auf $2.04. Vorbehalt: Die Cache-TTL beträgt eine Stunde —
zieht sich ein Lauf über mehrere Wellen länger hin, laufen Einträge ab und der Effekt sinkt.
Die Zahl ist eine Obergrenze der Ersparnis, keine Garantie.

## Empfohlener GATE-Lauf

```
npm run eval -- --struktur beides --language de --batch --nur-paare --batch-max-min=180
```

## Nicht umgesetzt

- **n=2 statt 3**: spart ~35 %, aber das GATE vergleicht Verletzungs-Deltas — bei n=2 ist ein
  einzelnes Sample die halbe Aussage. Für einen Messlauf, der über Ausrollen entscheidet, zu grob.
- **Judge-Prompt-Caching**: Der Judge-Systemprompt ist ~1,5k Token; die Transkripte sind je
  Sample verschieden (S56). Ersparnis im Cent-Bereich, dafür eine Sonderregel im teuersten Pfad.

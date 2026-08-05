# Sprint 114c — Nachtrag: die Schreibkante in der Zwischenbreite

**Basis:** S114 **und** S114b angewendet. Dieser Patch baut auf beiden auf und bricht ab, wenn einer fehlt.
**Kern-Hash nach Build:** `3079590f1d4673f6` (S114b war `eb015ee803f4274a`)
**Suite:** 251 Dateien, 2380 Tests grün
**Ceremony:** Voll

---

## Befund

In der Session reichte die untere Zone (Schreibkante) bei mittleren Fensterbreiten nicht bis zur Fensterkante — sie stand als freies Tiefgrün-Rechteck auf Papier. Auf dem Smartphone und auf dem Desktop stimmte es.

## Ursache

Zwei Ausblut-Rezepte mit einer Lücke dazwischen:

| Breite | Regel | Reicht bis |
|---|---|---|
| bis ~690px | `margin: … calc(-1 * var(--rz-rand))` | Screenkante = Fensterkante ✓ |
| **~690–899px** | — | Spaltenkante ✗ |
| ab 900px (T2h) | `margin-left/right: calc(50% - 50vw)` | Fensterkante ✓ |

Der Kipppunkt liegt nicht bei 900px, sondern dort, wo `.rz-chat-innen` (max-width `--rz-chat-spalte` = 640px, zentriert) schmaler wird als das Fenster: bei 640 + 2 × 24 ≈ 690px. Ab da liegt die Screenkante nicht mehr an der Fensterkante, und der negative Rand endet an der Spalte. Die 900px waren geraten — sie stammen aus der Zweiteilung der Vorräume, wo sie richtig sind, und wurden hier mitgenommen.

Es ist derselbe Befund, den T2h für breite Schirme gelöst hat, nur eine Stufe früher. T2h hat das Symptom an einer Breite behoben, statt die Bedingung zu benennen.

## Schnitt

Eine Rechnung für alle Breiten, in der Grundregel:

```
margin: var(--rz-r-5) calc(50% - 50vw) calc(-1 * var(--rz-rand) - env(safe-area-inset-bottom,0px));
padding: 40px max(var(--rz-rand), calc(50vw - var(--rz-chat-spalte) / 2)) calc(22px + env(…));
```

Bei schmalem Fenster ergibt `calc(50% - 50vw)` exakt `-var(--rz-rand)` — Prozente rechnen gegen die Spalte, und die ist dann Fensterbreite minus zwei Ränder. Das alte Verhalten ist also enthalten, nicht ersetzt. Die `@media(min-width:900px)`-Regel ist damit aufgegangen und entfällt.

Das Polster braucht die Klammer nach unten (`max`): Ist das Fenster schmaler als die Lesespalte, wird `50vw - spalte/2` negativ und das Screenpolster fiele weg.

## Lehre

Eine Breitenschranke ist eine Behauptung darüber, wann eine Bedingung eintritt. Hier war die Bedingung „Spalte schmaler als Fenster" — ableitbar aus `--rz-chat-spalte` und `--rz-rand`, nicht aus einer gewählten Zahl. Wo eine Regel aus Tokens rechnen kann, braucht sie keine Query; wo doch eine steht, sollte die Zahl aus denselben Tokens folgen.

Der neue Test hält beides fest: eine Rechnung ohne Breitenschranke, und keine `.rz-chat-unten`-Regel mehr in einer 900px-Query.

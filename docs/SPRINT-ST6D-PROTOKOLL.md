# Sprint ST6d — Protokoll · Judge j9: Wörtlichkeit und Schluss-Prüfung

**Datum:** 1. August 2026 · **Basis:** `d118d60` (patch-st6a auf main)
**Stand:** 2274 Tests grün (241 Dateien, keine Unhandled Errors) · Build grün

## Anlass: ein Selbstwiderspruch, kein Verständnisproblem

Die Judge-Sonde prüfte das kleinere Sonnet der Vorgängergeneration als möglichen Judge
(Kostenfrage: ~$2.18 statt $3.64 je GATE-Lauf). Ergebnis: **GOLD-SPA und GOLD-SPA2 je 0/3.**
Entscheidend waren nicht die Zahlen, sondern die Belege — dreimal in derselben Form:

> «Nähe hast du den Regler sehr weit nach »wichtig« geschoben» — implizit, aber die Begleitung
> nennt **KEINE** konkreten Zahlenwerte (9, 2 etc.) → **verdict: ja**

Das Modell schrieb das Gegenteil seines Urteils in denselben Beleg. Zwei Lücken, die j8 offen
ließ, greifen hier ineinander:

1. **Zu weite Auslegung eines wörtlichen Prüfgegenstands.** Die Frage lautet »Nennt die
   Begleitung konkrete Zahlenwerte?«. Eine *implizite Bezugnahme* auf die Reglerlage wurde als
   »Nennen« gewertet.
2. **Folgenlose Selbstkorrektur.** Das Modell korrigierte sich im laufenden Beleg
   (»Korrektur: nennt KEINE …«), zog das verdict aber nicht nach.

j8 trägt bereits »BELEG TRÄGT URTEIL … keinen Satz, der deinem eigenen verdict widerspricht«.
Die Regel als Mahnung reichte nicht — sie brauchte einen **operativen Prüfschritt**.

## Umgesetzt (j9, DE + EN mit Paritätstest)

- **WÖRTLICH, NICHT SINNGEMÄSS**: Verlangt eine Frage etwas Konkretes — Zahl, Name, Block,
  Nennung —, liegt es nur vor, wenn es WÖRTLICH im Beitrag der Begleitung steht. Anspielung,
  Umschreibung, impliziter Bezug sind keine Nennung. Mit Beispielpaar statt bloßer Mahnung:
  »Der Regler steht weit oben« nennt keinen Zahlenwert; »du hast dort eine 9« nennt einen.
- **SCHLUSS-PRÜFUNG**: Vor der Abgabe den eigenen Beleg gegen das eigene verdict lesen.
  Schränkt der Beleg ein (»aber«, »jedoch«, »Korrektur«, »nennt keine …«), **gilt die
  Einschränkung** — das verdict wird danach ausgerichtet, nicht der Beleg nach dem verdict.

Beide stehen VOR den Formatregeln (inhaltliche Härtung zuerst) und NACH »KEINE
ZUSATZFORDERUNG«: erst der Rahmen (nichts fordern, was die Frage nicht nennt), dann die
Auslegung darin (was sie nennt, wörtlich nehmen). Diese Reihenfolge ist getestet — die beiden
Regeln könnten sich sonst gegenseitig aufheben.

## Nebenbefund: der Grep-Wächter hatte recht

Der erste Entwurf nannte das geprüfte Modell im Versionskommentar von `judge.js` beim Namen —
der S35d-Kanarienvogel schlug an (»Modellwissen gehört in Konfiguration, nicht in Code«). Er
unterscheidet nicht zwischen Modellwahl und Befundnotiz, und das ist richtig so: Eine Ausnahme
für »ist ja nur ein Kommentar« wäre der Anfang vom Ende der Regel. Der Kommentar verweist jetzt
auf dieses Protokoll.

## Abnahme (Sonde, nur Judge-Kosten)

```
node docs/probe-judge-golden.mjs --model=claude-sonnet-4-6 --n=3    # Ziel: 18/18
node docs/probe-judge-golden.mjs --n=3                              # Opus: darf nicht schlechter werden
node docs/probe-judge-golden.mjs --model=claude-sonnet-5 --n=3      # Referenz
```

**Erst danach entscheidet sich der Judge-Wechsel.** j9 ist unabhängig davon ein Gewinn: Opus
ist gegen diese Fehlurteilsklasse nicht immun, er trifft sie nur seltener — die Regeln wirken
für jedes Modell. Bleibt Sonnet 4.6 unter 18/18, bleibt Opus Judge und j9 trotzdem im Prompt.

## Wichtig für die Einordnung von Läufen

j9 ändert den Judge-Prompt und damit die Vergleichsgrundlage: Ergebnisse aus j8-Läufen sind mit
j9-Läufen nur eingeschränkt vergleichbar. `judgePromptVersion` steht in jedem Ergebnis-JSON —
beim GATE-Vergleich (ST5.5) darauf achten, dass beide Varianten aus DEMSELBEN Lauf stammen;
dort ist die Version per Konstruktion identisch.

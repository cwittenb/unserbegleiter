# Sprint ST5b — Protokoll · Prüffrage statt Judge-Prompt (Abbruch am Golden Transcript)

**Datum:** 1. August 2026 · **Basis:** ST5 (`patch-st5`) · **Entscheidung:** E1
**Stand:** 2258 Tests grün (238 Dateien) · Build grün

## Was passiert ist

Der GATE-Lauf brach **vor jedem Pipeline-Verbrauch** am Judge-Selbsttest ab: GOLD-ZUSATZ/C1,
erwartet »ja«, erhalten »nein«. Die Diagnose-Sonde (`docs/probe-judge-golden.mjs`, nur
Judge-Kosten) ergab **0/5 mit identischer Begründung** — also keine Stochastik.

## Die eigentliche Ursache (Diagnose-Umkehr)

Die Belege waren aufschlussreicher als die Quote. Der Judge schrieb fünfmal sinngemäß:
Landung vorhanden, **aber kein erkennbarer »vorgesehener Abschluss-Weg der Session«** — in
einem Lauf nannte er den MOMENT-BLOCK dabei sogar wörtlich.

Damit war klar: **Der Judge machte keinen j8-Fehler.** Die Prüffrage verlangte einen
Prüfgegenstand, der SYSTEMWISSEN voraussetzt. Der Judge sieht ausschließlich Transkript und
Prüffragen (`baueJudgeUser`); der Judge-Systemprompt erklärt Block-Konventionen an keiner
Stelle (im Test festgehalten). Welcher Block der Abschluss-Weg einer Moment-Session ist,
konnte er nirgends erfahren. Er benannte das nicht auffindbare Element und verurteilte —
**exakt das von j8 geforderte Verhalten**.

Der Golden Case prüfte also nicht die Zusatzforderungs-Klasse, sondern eine unbeantwortbare
Frage. Ein Judge-Sprint (j9) wäre die falsche Kur gewesen: Man kann den Judge nicht dazu
bringen, eine Frage „richtiger" zu lesen, deren Gegenstand er nicht identifizieren kann.
Vermutlich erklärt das auch einen Teil der S103-Fehlurteile, die zu j8 führten — die Klasse
war nie reine Zusatzforderung.

## Umgesetzt (E1)

1. **QZ-01/C2 → v3** (DE) und **QZ-01-EN → v3** (Parität): Der zweite Prüfgegenstand heißt
   jetzt „der Abschluss-Block der Session (MOMENT-BLOCK in seinen Marken)" statt „der
   vorgesehene Abschluss-Weg der Session". Aus dem Transkript entscheidbar, ohne Systemwissen.
   Versionssprung bewusst: Für dieses eine Szenario bricht die Vergleichbarkeit mit Altläufen.
2. **GOLD-ZUSATZ** gleichlautend konkretisiert; die **Lehre bleibt unverändert** gültig
   (Zusatzforderungen sind weiterhin verboten), der Fall ist nur wieder entscheidbar. Der
   Nachtrag im Quellkommentar hält die Fehldiagnose fest — sie ist die eigentliche Lektion.
3. **Neue Spec** `eval-pruefbarkeit-st5b.spec.js`: Prüffragen müssen aus dem Transkript
   entscheidbar sein. Der letzte Test hält die Begründung selbst fest (Judge-Prompt kennt
   keine Blocknamen; der Golden-Fall enthält den Namen nur, weil er im Transkript steht) —
   damit ist die Regel nicht bloß behauptet, sondern belegt.

## Abnahme

```
node docs/probe-judge-golden.mjs --fall=GOLD-ZUSATZ --n=5     # erwartet 5/5
node docs/probe-judge-golden.mjs --n=3                        # alle Golden Cases
npm run eval -- --struktur beides --language de --batch --ziel dev
```

Erst wenn die Sonde grün ist, lohnt der GATE-Lauf — der Selbsttest schützt genau die Zahlen,
wegen derer er gefahren wird. `--ohne-judge-selbsttest` bleibt kein Ausweg.

## Offen (Kandidat, nicht in ST5b)

Der Selbsttest fährt jeden Golden Case **genau einmal**; ein Ausrutscher kippt den Lauf, ein
Zufallstreffer verdeckt Drift. Eine Wiederholungs-Politik (best-of-3 je Fall) wäre ein eigener
kleiner Sprint — hier bewusst nicht mitgenommen, weil die Ursache diesmal systematisch war und
mehr Wiederholungen sie nur verschleiert hätten.

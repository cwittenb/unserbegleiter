# Sprint 114i/j — Kopfzeile frei, Wegweiser zweispaltig bedienbar

**Basis:** `origin/main` @ `ac1eb49` (patch-s114h-regalbewegung-desktop)
**Kern-Hash nach Build:** `dd1768ef8d9e9d84`
**Suite:** 257 Dateien, 2494 Tests grün (unit 227/2309, engine+worker+e2e 30/185)
**Ceremony:** Voll

---

## Befund

Beim Aufklappen legte sich die Regal-Zone über die Kopfzeile — Rückweg und Einstellungen waren verdeckt.

## Ursache

Meine eigene dritte Zeile aus S114h:

```
.rz-regal-offen>.rz-half:last-child{top:0}
```

Ich hatte im Screenshot-Vergleich gesehen, dass die grüne Spalte zugeklappt bis zum oberen Rand reicht und aufgeklappt erst bei `--rz-regal-top` beginnt, und das als Sprung gedeutet, den es zu glätten gilt. Es ist aber kein Sprung, sondern der **Zweck**: `--rz-regal-top` ist die Höhe der Kopfzeile. Die Zone setzt bewusst darunter an, damit die Kopfzeile bedienbar bleibt. Mit `top:0` legte sich die Zone (`z-index:2`) darüber.

Das gilt senkrecht wie waagerecht — die Kopfzeile ist in beiden Lagen dieselbe Zeile.

## Schnitt

Die Zeile ist wieder fort. Es bleibt bei der Grundregel `top:var(--rz-regal-top,0px)`. Die beiden übrigen S114h-Zeilen (volle Spaltenhöhe statt Zonenmaß, Nahtabstand gilt weiter) sind unverändert richtig und bleiben.

Der Test dreht mit: Er prüfte, dass `top:0` **dasteht**, und prüft jetzt, dass es **nicht** dasteht und die Grundregel greift.

## Lehre

S114h hat zwei Dinge aus demselben Screenshot-Vergleich abgeleitet: dass die linke Spalte sich nicht bewegen soll (richtig) und dass die rechte Zone bündig oben ansetzen soll (falsch). Der Unterschied: Für das erste gab es einen Befund — die Zeilen sprangen sichtbar. Für das zweite gab es nur eine Beobachtung, die ich zum Befund erklärt habe, ohne zu fragen, wozu der Unterschied da ist.

**Wo eine Regel einen benannten Token liest (`--rz-regal-top`), ist das eine Absicht, kein Versehen.** Bevor man sie überschreibt, gehört geklärt, was der Token freihalten soll.


---

# §2 · S114j — Der Wegweiser bei aufgeklapptem Regal

## Befund

Bei aufgeklapptem Regal reagierte das Badge auf dem Desktop nicht wie erwartet: Ein Klick auf seine rechte Hälfte tat nichts, ein Klick auf die linke Hälfte schloss das Regal. Erwartet: Das Panel öffnet sich wie sonst auch.

## Ursache

S114.8 — meine eigene Sperre. Sie setzt `pointer-events:none` und `disabled`, damit das Badge im aufgeklappten Zustand still ist. Die Folge: Der Klick fiel **durch** das Badge hindurch und traf, was darunter lag — rechts die Regal-Zone (dort passiert nichts), links die andere Hälfte (der Klick-außerhalb-Handler schließt das Regal). Das erklärt beide Beobachtungen genau.

## Warum die Sperre mobil bleibt

Sie ist nicht grundlos: **Mobil fährt das Badge mit der Kante der Zone nach oben** (D12-2b), und ein Panel, das sich aus einer wandernden Kante faltet, legt sich quer über das Layout. Genau dafür war sie gedacht.

Auf dem Desktop fährt das Badge nicht mit — es markiert die Naht und bleibt auf `50dvh` stehen (Q3). Dort gibt es nichts zu schützen, und die Sperre richtet Schaden an.

## Schnitt

- Die Sperre bleibt als **Grundregel** und wird für die Zweiteilung zurückgenommen: `.rz-split.rz-regal-offen .rz-weg-badge{pointer-events:auto}`.
- Im JS entsprechend: `badge.disabled = offen && !istZweispaltig(doc)`. Neue Hilfsfunktion `istZweispaltig()` in `design.js` — dort, wo auch die `@media`-Blöcke stehen, damit CSS und JS dieselbe Zahl an einer Stelle lesen. Fehlt `matchMedia`, gilt der schmale Fall: lieber sperren als eine wandernde Kante bedienbar lassen.
- Das Panel bekommt **eine** Regel für beide Zustände: `position:fixed; top:50dvh`. Das Badge steht bei offenem Regal auf derselben Linie, also trifft das Panel sie auch. Die `200%/-100%`-Rechnung ist damit **ganz** fort — sie setzte voraus, dass die Spalte der Bezugsrahmen ist.

## Lehre

Die Sperre war eine Antwort auf ein Layoutproblem, das inzwischen an der Wurzel behoben ist (S114g/h/i). Sie ist stehen geblieben, weil niemand geprüft hat, ob ihr Anlass noch besteht — und hat dann selbst einen Fehler erzeugt, der schwerer zu deuten war als der ursprüngliche: Ein durchfallender Klick sieht aus wie eine kaputte Zuordnung, nicht wie eine Sperre.

**Wenn eine Ursache behoben ist, gehört die Notmaßnahme auf den Prüfstand** — und wenn sie bleibt, dann mit einer Bedingung, die sagt, wofür sie noch gilt.

# Sprintprotokoll · R4b (Fortsetzung) — die Vorraum-Ansichten

**Basis:** `origin/main` @ `5769d48` (patch-f4-r5-r4ab)
**Ausgangslage:** 1407 Struktur- / 155 Worker- / 25 Engine- / 4 e2e-Tests grün
**Endstand:** **1407 / 155 / 25 / 4 grün**, `npm run build` grün
**Kern-Hash:** `66d937a3…` → `6935089f5b9545b3`

---

## `core/ui/ansichten-screen.js` (261 Zeilen)

`zeigeZeitleiste`, `zeigeRegal`, `regalKoerper`, `zeigeAgenda`, `zeigeMess`,
`zeigeMomente`.

Sie gehören zusammen, weil sie dieselbe Rolle spielen: Aufklapp-Ansichten im
Vorraum, die etwas **Abgelegtes zeigen**, statt ein Gespräch zu führen.

`app.js`: **2416 → 2209 Zeilen.** Zusammen mit R4a/R4b-Teil-1: 2692 → 2209
(−483, −18 %).

## Gemessen statt geschätzt

Nach dem übersehenen `relaunch` im letzten Sprint wurde diesmal **vor** dem
Schnitt systematisch gemessen: ein kleiner Analysator listet je Zeilenbereich
die freien Bezeichner (Kommentare und Zeichenketten herausgefiltert, sonst zählt
deutsche Prosa als Bezeichner). Ergebnis:

| Ansicht | Closure-Abhängigkeiten |
|---|---|
| `zeigeZeitleiste` | `$`, `backend`, `zeigeNur` |
| `zeigeRegal` | `$`, `backend`, `state`, `zeigeNur` |
| `zeigeAgenda` | `$`, `backend`, `zeigeNur`, `rhythmusSektion`, `zeigePaarsprache` |
| `zeigeMess` | `$`, `backend`, `state`, `zeitleistenEintrag` |
| `zeigeMomente` | `$`, `backend`, `zeigeNur` |

Fast dieselbe schmale Fläche — das war das Kriterium für die Gruppenbildung,
nicht die Reihenfolge im Quelltext.

## Was bewusst in app.js bleibt

`zeigeNun`… `zeigeNur` (Sichtbarkeit **aller** Aufklappboxen), `rhythmusSektion`
und `zeitleistenEintrag` (auch außerhalb dieser Gruppe gebraucht),
`zeigePaarsprache` (lebt in `einstellungen-screen.js`). Sie werden
hereingereicht. Sie mitzunehmen hieße, Zuständigkeit nach Aufrufhäufigkeit zu
verteilen statt nach Zugehörigkeit.

## Drei Funde beim Schneiden

**1. Fehlende Importe, vom Analysator gefunden statt vom Test.**
`trageMessbeitragEin` fiel vor dem ersten Testlauf auf. `fuelle` erst danach —
es steckte in einer Zeichenkette-nahen Stelle, die der Filter mitentfernt hatte.
Ohne `fuelle` brach die Ausschnitt-Darstellung (6 Fälle in
`s96-regal-ausschnitt.spec.js`). Der Analysator verkürzt die Schleife, er
ersetzt die Suite nicht.

**2. Erzeugungsreihenfolge.** Die Ansichten-Fabrik stand zunächst an der Stelle,
wo früher `zeigeZeitleiste` begann — also **vor** der Einstellungs-Gruppe, aus
der `zeigePaarsprache` stammt. `Cannot access before initialization`. Die
Erzeugung steht jetzt bewusst hinter ihrer Abhängigkeit, mit Kommentar.

**3. Ein Grep-Wächter musste den Pfad nachziehen.**
`s60-mockdaten.spec.js` liest `core/ui/app.js` als **Text** und prüft, dass der
Backlog-Filter auf `"resting"` steht — den Wert, den der Writer schreibt. Der
Leser (`zeigeAgenda`) ist mitgewandert, also liest der Wächter jetzt
`ansichten-screen.js`.

**Das ist eine Pfadanpassung, keine Verhaltensänderung** — geprüft wird
unverändert dieselbe Zeile mit demselben Wert, nur dort, wo sie jetzt steht. Der
Wächter bewacht den Gleichklang zwischen Schreiber und Leser, nicht die Datei,
in der der Leser wohnt. Es ist die einzige Teständerung, und sie ist von der
Sorte, die bei R4 erlaubt sein muss: Wer Code verschiebt, muss Tests nachziehen
dürfen, die auf **Ort** prüfen — nie solche, die auf **Verhalten** prüfen. Die
sechs `s96`-Fälle waren genau der andere Fall und wurden im Code behoben, nicht
im Test.

---

## Offen

**Chat und Panels.** `renderMsgs`, `zeigeStream`, `verdrahteChat`, Composer,
Auswahl/Vorschau, `gatePanel`, `kapitelPanel`, `aufdeckTafel`. Das ist der
dichteste Teil: `renderMsgs` ist Rückkanal aus fast allem, und die Panels teilen
Zustand mit der laufenden Engine. Dort ist die Schnittstellen-Entscheidung die
eigentliche Arbeit.

**Merkposten aus dem Track:** `still()` in `ladeLage` unterscheidet nicht
zwischen „leer" und „nicht ladbar" (R2.5).

# Sprintprotokoll · R4b (Fortsetzung) — die Panels

**Basis:** `origin/main` @ `a12e609` (patch-r4b-auswahl)
**Ausgangslage / Endstand:** **1407 / 155 / 25 / 4 grün**, `npm run build` grün
**Kern-Hash:** `4c29a246…` → `979ae94817b53037`

---

## `core/ui/panels.js` (200 Zeilen)

`gatePanel`, `kapitelPanel`, `aufdeckTafel`, `baueTafelKarte`.

`app.js`: **1993 → 1840 Zeilen.** Seit Beginn des Tracks: 2692 → 1840
(**−852, −32 %**).

## Warum diese vier zusammengehören

Drei davon hängen direkt an Engine-Haken (`onGate`, `onKapitel`, `onAufdecken`)
— das Modell stößt sie an. Gemeinsam ist ihnen, dass sie eine **Antwort
einsammeln** und über `warteAntwort` zurückgeben: Sie sind Eingabemasken im
Gesprächsfluss, keine Ansichten. Das unterscheidet sie von der
Vorraum-Gruppe, die Abgelegtes zeigt.

`baueTafelKarte` ist mitgewandert, obwohl `renderMsgs` es braucht. Es baut die
Darstellung einer Aufdeck-Tafel im Verlauf, und die Aufdeck-Tafel ist ein Panel.
Es wird nach außen mitgegeben, statt in `app.js` zurückzubleiben:
**Zugehörigkeit schlägt Aufrufort.**

## Was bewusst bleibt

`kw` und `kwZu` (Zugriff auf die Kernwetten-Panelfläche) bedienen auch die
Kernwetten-Abläufe, die hier nicht mitwandern. Sie werden hereingereicht.

## Temporale Totzone

Beim ersten Anlauf: 337 rote Tests, `Cannot access 'kw' before initialization`.
`kw` ist ein `const` und stand rund 350 Zeilen unterhalb der Panel-Fabrik.

Zwei Wege: die Fabrik ans Dateiende schieben oder die zwei Zeilen hochziehen.
Gewählt wurde das Hochziehen — die Fabrik ans Ende zu schieben hätte die
Reihenfolge nach einem technischen Zwang sortiert statt nach Lesbarkeit, und
`kw`/`kwZu` sind zwei abhängigkeitsfreie Zeilen. Der Grund steht als Kommentar
an der Stelle, damit ihn niemand „aufräumt".

Es ist die zweite Reihenfolgefrage in diesem Track (nach `zeigePaarsprache` bei
den Ansichten). Das ist kein Zufall: Wer aus einer Closure herausschneidet,
verschiebt Definitionen gegen ihre Benutzung — die Suite fängt es zuverlässig,
aber es ist der erwartbare Preis dieser Art von Umbau.

## Merkposten: ein einmaliges e2e-Flattern

Bei einem Lauf schlug ein e2e-Fall fehl; er ließ sich in vier direkt folgenden
Läufen (dreimal isoliert, einmal volle Suite) **nicht reproduzieren**, ebenso
wenig auf dem frischen Clone. Es ist hier festgehalten, statt es wegzuwischen:
Wenn es wiederkehrt, ist dieser Eintrag der erste Anhaltspunkt, dass es kein
Einzelfall war.

## Keine Teständerung

**Kein Bestandstest wurde angepasst.**

---

## Offen: der Chat-Kern

`renderMsgs`, `zeigeStream`, `verdrahteChat`, Composer, `sende`, `warteAntwort`.

`renderMsgs` ist inzwischen Rückkanal aus **drei** herausgelösten Modulen
(Auswahl, Panels, teils Ansichten) — jedes bekommt es hereingereicht. Es
seinerseits in ein Modul zu schieben, das die anderen zurückruft, wäre eine
verschobene Abhängigkeit, keine aufgelöste.

Der nächste Schritt ist deshalb kein Schnitt, sondern ein Entwurf: Wie wird aus
„jeder ruft renderMsgs" ein gerichteter Weg? Naheliegend ist ein schmaler
Anzeige-Kanal, den die Module benachrichtigen, statt eine Funktion aus app.js
zu halten.

**Merkposten:** `still()` in `ladeLage` unterscheidet nicht zwischen „leer" und
„nicht ladbar" (R2.5).

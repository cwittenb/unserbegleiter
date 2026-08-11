# Sprint S121.2 — die kurze Hälfte klebt, das Badge ankert wieder an ihr

**Basis:** `origin/main` @ `5e53a69` (S119.7 · Geräteschalter; enthält S121.1)
**Kern-Hash nach dem Bau:** `fea00fd6e18dad48`
**Vorlage:** Designdokument Turn 48, §2.3 und §2.4
**Schritt 2 von vier in S121**

---

## 1 · Zwei Befunde

**Die kurze Hälfte verschwindet.** Seit S121.1 die Höhen gefallen sind, endet sie nach ihrem
Inhalt, während die lange weiterläuft. Man rollt zwei Fensterhöhen an einer leeren Fläche
entlang, und was dort stand — Titel, Weg, Wegweiser — ist nach einem Bildschirm fort.

**Und ein Fehler aus S121.1, den ich dort falsch beschrieben habe.** Im Protokoll zu S121.1
steht, der Wegweiser hänge weiter mit `position:fixed` am Fenster. Das gilt für das
**Panel** — nicht für das **Badge**. Das Badge ist `absolute` und maß seit T2d `top:50%` am
`.rz-split`. Solange der Split höhenfest 100dvh war, war das die Fenstermitte. Seit S121.1
ist er so hoch wie sein Inhalt: `50%` ist die halbe **Dokumenthöhe**, und auf einer langen
Seite säße das Badge viel zu tief. Dieser Schritt räumt das mit auf; wer S121.1 einzeln
deployt hat, sieht den Effekt bis dahin.

---

## 2 · Was gebaut wurde

**Die klebende Hälfte** (§2.3): `position:sticky; top:0; height:100dvh` plus
`align-self:flex-start`. Letzteres ist keine Kosmetik — ohne es streckt der Flex-Rahmen die
Hälfte auf die volle Rahmenhöhe, und ein Element, das seinen Rahmen ausfüllt, hat keinen Weg
zum Kleben.

**Das Badge** (§2.4) ankert wieder an seiner Hälfte (`rz-naht-anker` bleibt `relative`) und
misst `left:0; top:50dvh` vom Spaltenanfang. Eine Regel für beide Fälle:

- Klebt die Hälfte, ist sie genau eine Fensterhöhe hoch → `50dvh` ist ihre Mitte, das Badge
  steht auf halber Fensterhöhe an der Naht. Wie mit `fixed`, ohne dessen Nachteile.
- Klebt sie nicht, sitzt es `50dvh` unter dem Spaltenanfang — beim ersten Blick an derselben
  Stelle — und rollt danach mit.

Damit ist auch **F19** eingelöst, ohne Sonderfall: Das Badge lebt in jedem geteilten Screen
ohnehin in der zweiten Hälfte; ein Umzug im Markup war nicht nötig.

**Nicht `fixed`:** Das legte es über Fuß, Dialoge und Tastatur wie eine Chat-Blase und
bräuchte eine eigene `z-index`-Verabredung — genau das, was §2.4 abräumt.

---

## 3 · Die Messung (F18)

Welche Hälfte klebt, steht **nicht** im Stylesheet. In der Landing ließ sich das als Klasse
ins Markup schreiben, weil dort immer dieselbe Seite kurz ist. In der App hängt es am
Inhalt: Die Zeitleiste eines Paares nach drei Monaten ist länger als am ersten Tag, die
englische Fassung länger als die deutsche, und ein niedriges Fenster dreht das Verhältnis
ohnehin um.

Neu: `core/ui/kleben.js`. Die Regel:

> Eine Hälfte klebt genau dann, wenn ihr eigener Inhalt ins Fenster passt **und** die andere
> Hälfte höher ist als das Fenster.

Beide kurz → es gibt nichts zu rollen. Beide lang → keine kann kleben, ohne ihr eigenes Ende
zu verlieren. **Der Rückfall ist immer „klebt nicht":** Ein Messfehler kostet Eleganz, nie
Inhalt — die Spalte rollt dann eben normal mit. Die gefährliche Richtung wäre die andere:
Eine zu hohe klebende Spalte friert oben fest, und ihr unteres Ende wird nie erreichbar.

Zwei Feinheiten, die im Code stehen und hier begründet gehören:

- **Gemessen wird ohne die Klasse.** Eine klebende Hälfte steht auf 100dvh; ihre eigene
  Inhaltshöhe wäre nicht mehr ablesbar, und die Messung bestätigte nur ihr eigenes Ergebnis.
- **Die Messungen werden gebündelt.** Ein `ResizeObserver` feuert je Element und Kante; ohne
  Zusammenfassung auf ein Bild liefe sie mehrfach pro Rahmen.

Angemeldet wird für die vier geteilten Screens; mobil und im aufgeklappten Regal klebt
nichts.

---

## 4 · Änderungen

- `core/ui/design.js` — Regel für die klebende Hälfte; Badge auf `left:0; top:50dvh`; der
  `position:static`-Griff an `rz-naht-anker` entfällt.
- `core/ui/kleben.js` — neu.
- `core/ui/app.js` — Messung im Boot angemeldet.
- `tests/unit/s121-2-klebende-haelfte.spec.js` — neu.
- `tests/unit/t2d-desktop-anker.spec.js` — zweiter Block umgekehrt.

---

## 5 · Tests

19 Fälle: die Regel in fünf Ausprägungen (kurz/lang, beide kurz, beide lang, genau
fensterhoch, unbrauchbare Fensterhöhe); die Messung am Element (setzt, nimmt wieder weg,
mobil nichts, im Regal nichts, misst ohne die Klasse, lässt unvollständige Screens in Ruhe);
die Beobachtung (misst sofort, meldet sich an und wieder ab, kommt ohne `ResizeObserver`
aus); und sechs Zusicherungen am Stylesheet, darunter `align-self:flex-start` mit
Begründung.

**Eine weitere Umkehr im Bestand:** `t2d-desktop-anker.spec.js` hielt fest, dass die
Naht-Aufbauten am `.rz-split` ankern und das Badge von dessen Mitte misst. Beides gilt nicht
mehr. Der Block bleibt stehen, mit gedrehtem Vorzeichen und dem Grund im Kommentar — wie
schon in S121.1.

**Volle Suite:** 269 Dateien, 2626 Fälle, grün (unit 238/2428 in zwei Scherben,
engine+worker+e2e 31/198).
**Build:** erfolgreich, Kern `fea00fd6e18dad48`.

---

## 6 · Nachweis am laufenden System

1. Startseite oder Vorraum mit langer Spalte: Die kurze Hälfte bleibt stehen, während die
   andere läuft — keine leere Fläche mehr.
2. Das Badge steht bei jedem Scrollstand auf halber Fensterhöhe an der Naht.
3. Einstellungen (beide Spalten lang): Es klebt nichts, und das Badge rollt mit. So
   entschieden — der Screen hat den Zurück-Pfeil oben und braucht den Wegweiser nicht als
   einzigen Ausgang.
4. Fenster hoch genug für beide Spalten: Es klebt nichts, nichts springt.
5. Fenster langsam kleiner ziehen: Der Wechsel passiert, ohne dass etwas hakt.
6. Zoom 200 %: Die kurze Hälfte überläuft nicht — die Ausnahme aus §2.3 greift, weil die
   Messung sie erkennt.

Noch offen: die Luft an der Naht (S121.3 — bis dahin kann das Badge rechtsbündige Werte der
Haarlinien-Zeilen überdecken) und der Chat (S121.4).

# Sprint S119.3 — der Chat hat wieder genau einen Rollbereich

**Basis:** `origin/main` @ `0624fb3` (S120 · Meldeweg und Mailgestalt)
**Kern-Hash nach dem Bau:** `c2f360e100bb43e8`
**Deckt ab:** I11 aus dem Sprintplan S119 — und damit voraussichtlich auch I13

---

## 1 · Befund

In der Session standen zwei Bildlaufleisten: eine am Text, eine am Body. Der obere,
helle Teil rollte in sich; im dunklen Bereich rollte das Dokument.

Ursache ist eine einzige fehlende Deklaration. `.rz-app #scrChat` setzt

```
height:100dvh;
padding: calc(30px + env(safe-area-inset-top,0px)) var(--rz-rand)
         calc(var(--rz-rand) + env(safe-area-inset-bottom,0px));
```

Ein globales `box-sizing:border-box` gibt es in diesem Stylesheet nicht — es ist punktuell
gesetzt (Zonen, App-Wurzel, einige Bedienelemente), und `#scrChat` gehörte nicht dazu. Im
Standard `content-box` sind die 100dvh die **Inhaltshöhe**; das Polster kommt oben und
unten obendrauf. Am Gerät nachgemessen:

```
document.getElementById("scrChat").getBoundingClientRect().height - window.innerHeight   // 54
```

54 = 30px Kopfpolster + 24px `--rz-rand`; die Safe-Areas sind auf dem Desktop null. Genau
dieser Überhang war die zweite Leiste.

`overflow-y:hidden` an `#scrChat` half dagegen nicht: Es verhindert, dass der Chat *in
sich* rollt, macht ihn aber nicht kleiner. Das Dokument lief trotzdem über.

---

## 2 · Entscheidungen

**`box-sizing:border-box` statt Polster-Verlagerung.** Die Alternative wäre gewesen, das
Polster nach `.rz-chat-innen` zu verlegen. Das hätte die Ausblut-Rechnung der Schreibkante
verschoben (S114c rechnet gegen `--rz-rand`) — ein Eingriff mit Folgen in einer Fläche, die
gerade erst geradegezogen wurde. Die Safe-Area-Ausdrücke bleiben unangetastet; sie wirken
nur nach innen statt nach außen.

**Kein globales `box-sizing` in diesem Schritt.** Es nachzuziehen berührt jedes Element im
Stylesheet und braucht eine Sichtprüfung aller Screens. Das gehört allein geliefert, damit
eine Regression eindeutig zuzuordnen ist — es steht als eigener Sprint im Plan.

**Die gewollte Leiste bleibt, wo sie ist.** `#scrChat .rz-chat-oben` rollt weiter
(U10.4: „DIESE Zone rollt — und nur sie"), `#scrChat` selbst eröffnet weiterhin keinen
eigenen senkrechten Rollbereich. Sonst hätten wir die zweite Leiste nur verschoben.

---

## 3 · Änderungen

- `core/ui/design.js` — `box-sizing:border-box` in der Grundregel von `.rz-app #scrChat`.
- `tests/unit/s119-3-chat-ein-rollbereich.spec.js` — neu.

---

## 4 · Tests

Vier Fälle:

- die Grundregel von `#scrChat` trägt `box-sizing:border-box`;
- die gewollte Leiste sitzt weiterhin in `.rz-chat-oben`, und `#scrChat` bleibt bei `overflow-y:hidden`;
- **Wächter über den ganzen Bestand:** jede Regel im Stylesheet, die feste Höhe (`height:100dvh`) **und** ein Polster setzt, muss `box-sizing:border-box` tragen;
- **Test des Tests:** der Wächter erkennt einen konstruierten Verstoß.

Der dritte Fall ist der eigentliche Ertrag: Er hält die Regel fest, nicht den Einzelfall.
Solange es kein globales `box-sizing` gibt, muss jede solche Fläche es selbst mitbringen —
und beim nächsten Mal fällt der Test, nicht das Layout.

### Ein Fund beim Testen, der festgehalten gehört

Ein bestehender Wächter (`t2-layout-grundlagen.spec.js`, „min-height:0 steht nie ohne
overflow") fiel zunächst um — nicht wegen der Änderung, sondern wegen meines
**Kommentars**: Er nannte beispielhaft einen Selektornamen, und der Wächter greift per
Regex über den CSS-Text, Kommentare eingeschlossen. Der Kommentar ist umformuliert und
trägt den Hinweis jetzt selbst. Merksatz für künftige Kommentare in `design.js`:
**Selektornamen im Fließtext sind dort keine Prosa, sondern Daten.**

**Volle Suite:** 265 Dateien, 2579 Fälle, grün (unit 234/2381, engine+worker+e2e 31/198).
**Build:** erfolgreich, Kern `c2f360e100bb43e8`.

---

## 5 · Nachweis am laufenden System

Session öffnen, Verlauf länger als der Schirm, dann:

```js
document.getElementById("scrChat").getBoundingClientRect().height - window.innerHeight   // erwartet: 0
```

Sichtbar: nur noch **eine** Bildlaufleiste, am Text. Der dunkle Bereich steht still — das
ist richtig, er ist die Schreibkante und war nie ein Rollbereich; er hat bisher nur den
54px-Überhang des Dokuments bewegt.

**Damit wird auch I13 entscheidbar:** Rollt der helle Bereich jetzt per Finger, ist der
Befund erledigt. Rollt er nicht, steht ein isolierter Fall da — ein Rollbereich, eine
Geste, keine Nebenwirkungen mehr, die das Bild verwischen.

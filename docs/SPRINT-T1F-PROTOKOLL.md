# Sprint T1f — Die Zeilenhöhen kommen mit

**Theme-Track T1f** (Basis: patch-t1e) · Kette: **T1e → T1f**
Schließt den letzten Merkposten aus T1b: `--rz-lh-*` war angelegt, aber kaum benutzt.

## Der Befund

13 verschiedene Zeilenhöhen standen roh an den Komponenten: 1, 1.18, 1.2, 1.3, 1.35, 1.4, 1.45, 1.5, 1.55, 1.6, 1.62, 1.65 und 0. Die Skala aus T1b lag daneben und wurde von genau niemandem benutzt — Schriftgrößen waren umgezogen, ihre Zeilenabstände nicht. Das ist die unangenehmste Sorte halbfertig: die Skala *sieht* vollständig aus, aber ein Theme, das die Lesbarkeit anfassen will, greift ins Leere.

## Die Zuordnung

| vorher | jetzt |
| --- | --- |
| 1.18 | `--rz-lh-titel` (1.18) |
| 1.2 | `--rz-lh-sektion` (1.2) |
| 1.3 | `--rz-lh-caps` (1.3) |
| 1.35, 1.4 | `--rz-lh-zeile` (1.4) |
| 1.45, 1.5, 1.55 | `--rz-lh-fein` (1.5) |
| 1.6, 1.62, 1.65 | `--rz-lh-text` (1.65) |

**`0` und `1` bleiben rohe Werte.** Sie sind keine Lesetypografie, sondern Layout: `line-height:0` macht eine Icon-Zeile hüllenlos, `line-height:1` setzt eine Knopfhöhe. Sie an eine Textskala zu binden wäre eine falsche Verwandtschaft — der Wächter lässt genau diese beiden durch, und die Begründung steht als Kommentar in `theme.js`, damit die Ausnahme nicht später als Schlamperei gelesen wird.

## Tests

`t1b-theme.spec.js` um eine Zusicherung erweitert: keine rohe Zeilenhöhe in den Komponentenregeln, außer 0 und 1. Damit prüft der Wächter jetzt lückenlos Farbe, Schriftgröße, Zeilenhöhe, Radius, Übergangskurve, Namensraum und `style=`-Freiheit.

Volle Suite grün (**1628**), Build Kern `e1e26022d45279de`.

## Damit ist der T1-Track durch

| | Inhalt |
| --- | --- |
| T1a | Eine Farbaufteilung für alle Screens; Kulissen-Fassung folgt dem Untergrund |
| T1b | `theme.js` mit Token, Typo-, Abstands- und Radienskala |
| T1c | 70 Inline-Styles aus den Templates in Klassen |
| T1d | `zeichen()` — ein Motiv, einmal gezeichnet |
| T1e | Ein Namensraum: der pb-Bestand zieht nach `rz-` |
| T1f | Zeilenhöhen an die Skala |

**Was offen bleibt — bewusst, als Gestaltungsfragen:**

- Sollen `--rz-feld-ink` (#313c31) und `--rz-ink` (#23291f) derselbe Ton sein? Ebenso `--rz-knopf` (#7ba05b) und `--rz-akzent` (#8fae74)?
- Die Meilenstein-Zeichen (Knospe → Blüte → Blatt) haben seit T1d eine Ausdrucksform außerhalb der Kulisse. Ein zweiter Abnehmer — Zeitleiste, Prozessreflexion — wäre naheliegend, ist aber nicht vorweggenommen.

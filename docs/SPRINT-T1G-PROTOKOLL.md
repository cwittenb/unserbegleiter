# Sprint T1g — Eine Palette

**Theme-Track T1g** (Basis: patch-t1f) · Kette: T1e → T1f → **T1g**
Beantwortet die Gestaltungsfrage, die T1e bewusst offengelassen hatte.

## Verschmolzen wurde nach ROLLE, nicht nach Wert

Das ist der wichtige Unterschied. Zwei Token mit demselben Farbwert dürfen bleiben, wenn sie verschiedene Dinge bedeuten — der Baum in der Kulisse und der Pfeil tragen beide `#7d9b62`, aber ein Theme muss sie getrennt drehen können. Was aufgeräumt gehört, sind zwei Namen für **dieselbe** Rolle. Davon gab es sechs:

| abgelöst | geht auf in | Wirkung (hell) | Wirkung (dunkel) |
| --- | --- | --- | --- |
| `--rz-feld-ink` | `--rz-ink` | #313c31 → **#23291f** | #edf1e8 → #ece9da |
| `--rz-leise` | `--rz-sek` | #64705c → **#6b7261** | #b3c1aa → #b9c3ac |
| `--rz-leiser` | `--rz-sek2` | #909a86 → **#8b917d** | #889481 → #9aa38c |
| `--rz-knopf` | `--rz-akzent` | #7ba05b → **#8fae74** | #aeca8d (unverändert) |
| `--rz-blase-ich` | `--rz-akzent` | #7ba05b → **#8fae74** | #42583b → #aeca8d |
| `--rz-knopf-ink-invers` + `--rz-blase-ich-ink` | `--rz-auf-akzent` | #ffffff (unverändert) | #1d2a1a / #f4f7ef → #1d2a1a |
| `--rz-knopf-ink` | `--rz-akzent-ink` (nur umbenannt) | — | — |

**Der D1-Wert hat gewonnen**, wo zwei zur Wahl standen: `--rz-ink`, `--rz-sek`, `--rz-sek2` und `--rz-akzent` stammen aus dem dokumentierten Handoff, ihre Gegenstücke aus der Vor-D1-Zeit. Bei den Textfarben sind die Verschiebungen minimal (Δ unter 4 %); sichtbar ist vor allem der Knopf: das ältere, etwas kältere `#7ba05b` weicht dem Akzentgrün `#8fae74`.

`--rz-akzent` hat dafür eine **Dark-Fassung** bekommen (`#aeca8d`) — die hatte es bisher nicht, und der Knopf brachte sie mit. Dadurch werden auch die drei bisherigen Akzent-Verbraucher (Initial-Kreis, Wegweiser-Badge, Wartepunkt) im Dark-Mode eine Stufe heller. Das ist die Richtung, die eine Dunkelpalette ohnehin will.

**Die eigene Sprechblase trägt jetzt denselben Akzent wie der Knopf.** Vorher waren es zwei fast gleiche Grüntöne mit getrennter Dark-Fassung; jetzt ist es eine Farbe mit einer Bedeutung: *hier bist du.*

## Der Wächter zählt jetzt Doppelgänger

Neu in `t1b-theme.spec.js`: Er sammelt alle Farbwerte der Light-Palette und meldet jeden, der unter zwei Namen steht. Sechs Paare sind als **benannte Ausnahme** eingetragen — Baum/Pfeil/Label, Teich/Akzent, eigene Stimme/Akzentschrift, Wasser/Auf-Akzent. Jeder weitere Doppelgänger lässt den Test fallen und zwingt zur Entscheidung: verschmelzen oder als Ausnahme begründen.

Dazu zwei Zusicherungen, dass die abgelösten Namen wirklich verschwunden sind — in den Definitionen **und** bei den Verbrauchern.

Volle Suite grün (**1631**), Build Kern `a10ea4c4936de870`.

## Merkposten

Die Light-Palette hat jetzt 6 Doppelgänger-Paare, alle mit unterschiedlicher Rolle. Wenn du eines davon doch zusammenführen willst (etwa Kulissen-Teich und Akzent), ist das ein Wort — der Wächter zeigt sie vollständig an.

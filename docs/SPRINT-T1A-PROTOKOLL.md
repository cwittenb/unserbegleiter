# Sprint T1a — Eine Farbaufteilung für alle Screens

**Theme-Track T1a** (Basis: patch-d12-2f auf `origin/main` @ `dd3b831`) · Kette: f → **T1a**
Aus dem Planentwurf T1, Teil A. T1b (theme.js, Skalen), T1c (Inline-Styles) und T1d (Zeichensatz) folgen.

## Der Befund

Oben war seit D12-2e überall Papier. Unten standen **drei** verschiedene Flächen:

| Screen | unten (vorher) |
| --- | --- |
| Startseite | Tiefgrün #1e2a22 |
| eigener Vorraum, private Session | helles Regal-Papier #f0ece0 |
| gemeinsamer Vorraum, gemeinsame Session | dunkles Regal #141f18 |

Als Fehler eingestuft, nicht als Variante. Die Startseite hatte es richtig; **alle** Screens tragen jetzt oben `rz-papier` und unten `rz-tiefgruen`.

## Die Änderungen

**A1 · Eine Zonenklasse.** `rz-regal` und `rz-regal-dunkel` verschwinden als Flächenklassen aus allen Screens; unten heißt es überall `rz-tiefgruen`. Der Begriff „Regal" bleibt dem **Möbel** (`rz-regal-reihen`, `rz-regal-inhalt`, Accordion) — er beschreibt jetzt, was in der Zone steht, nicht mehr, wie sie gestrichen ist. Ein Test hält beides fest: keine Flächenklasse mehr im Markup, die Reihen weiterhin da.

**A1b · Token-Rückbau.** `--rz-papier-regal`, `--rz-regal-dunkel` und `--rz-hairline-regal` sind ersatzlos entfallen — aus **beiden** Paletten. Dunkler wird es ausschließlich über das Dark-Theme, das `--rz-papier` und `--rz-tiefgruen` überschreibt; genau so war es dort ohnehin schon angelegt. Drei Token weniger, bevor T1b die Palette nach `theme.js` umzieht.

**A2 · Die Auf-Grün-Regeln kollabieren.** Acht doppelt geführte Selektorpaare (`.rz-tiefgruen X,.rz-regal-dunkel X`) werden je eine Regel — Signatur, Fußmarke, Zurück-Pfeil, `rz-sub`, `rz-caps`, `rz-zeile`, Pfeile, Knöpfe. Dazu entfallen die Hell-Regal-Sonderfälle (dunkle Tinte, eigene Hairline) und fünf Chat-Regeln, die die Schreibkante je Raum verschieden gefärbt haben. Ein Test verbietet die Rückkehr: `.rz-regal-dunkel .rz-` kommt im CSS nicht mehr vor.

**A2b · `CHAT_HTML` verliert seinen Parameter.** Die Vorlage nahm `gemeinsam` entgegen, um die Schreibkante zu färben. Da beide Räume dieselbe Fläche tragen, ist der Parameter gegenstandslos und wurde samt Durchreichung entfernt — der Ort steht im Badge.

**F2 · Die Kulissen-Fassung folgt dem Untergrund, nicht dem Theme.** Zwei Zeilen:

```
.rz-kulisse-fuss .rz-kulisse-hell{display:none}
.rz-kulisse-fuss .rz-kulisse-dunkel{display:block}
```

Naht-Kulissen (Startseite, Chat) stehen auf Papier — dort sind Theme und Untergrund dasselbe, die bisherige Bindung stimmt. Fuß-Kulissen (beide Vorräume) stehen **im** Tiefgrün, das in beiden Themes dunkel ist: dort gilt immer der Teich.

**Das behebt einen Fehler, der seit D6 unbemerkt lag:** im gemeinsamen Vorraum standen im Light-Mode die dunklen Baumsilhouetten (Deckkraft ≤ .22) auf #141f18 — praktisch unsichtbar. Ohne diese Regel hätte T1a denselben Zustand auf den eigenen Vorraum ausgeweitet, dessen Fuß bisher hell war.

Nebeneffekt, der zum Bild passt: auf dem Papier stehen die Bäume, am Rand der dunklen Zone liegt der Teich. Der Garten bekommt ein Oben und ein Unten statt zweimal desselben Motivs.

## Tests

Neu: `t1a-zonen.spec.js` (10) — Aufteilung auf allen fünf Screens einzeln geprüft, keine Flächenklasse mehr im Markup, die Regal-Reihen weiterhin vorhanden, Palette ohne die drei Token, keine doppelt geführte Auf-Grün-Regel, und die drei F2-Zusicherungen (Fuß immer Teich, Naht weiter theme-gebunden, Halter an ihren Orten).

Nachgezogen: `d1-design-tokens` (Palette kleiner, plus neue Zusicherung, dass die Token weg **bleiben**), `d3-vorraeume`, `s36-ui`, `s41-vorraum`, `d6-kulisse`, `d12-2c-chat-raumtoene-kulisse` (aus „nur die Schreibkante folgt dem Raum" wird „die Schreibkante ist in beiden Räumen dieselbe Fläche").

Volle Suite grün (**1604**), Build Kern `8f3214ab0bf32107`.

## Merkposten

Die Unterscheidung privat/gemeinsam trägt jetzt allein das Badge und der Wegweiser. Falls sie doch eine leise visuelle Stütze braucht, wäre der Hairline-Ton der Ort — nicht die Fläche.

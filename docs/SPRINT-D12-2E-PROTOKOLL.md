# Sprint D12-2e — Oben hell, unten das Regal

**Design-Track D12-2e** (Basis: `origin/main` @ `4ccf19f` — a, b und c sind gemerged) · Einzelpatch

Korrektur an D3 und an meinem eigenen D12-2c.

## Der Befund

Die Aufteilung oben/unten war nicht überall dieselbe:

| Screen | oben | unten |
| --- | --- | --- |
| Startseite | Papier | Tiefgrün |
| Vorraum „Raum für mich" | Papier | Regal hell |
| Vorraum „Raum für uns" | **Tiefgrün** | Regal dunkel |
| Session gemeinsam (D12-2c) | **Tiefgrün** | Regal dunkel |

Der gemeinsame Raum färbte damit den ganzen Schirm ein. Was oben steht — Qualitätszeit, das gemeinsame Gespräch — lag auf dunklem Grund, während dieselben Inhalte im eigenen Raum auf Papier stehen. Der Eintritt in den gemeinsamen Raum fühlte sich an wie ein Wechsel der Beleuchtung, nicht wie ein Wechsel des Orts.

Die Startseite hatte es von Anfang an richtig: **oben hell, unten dunkel.** Das ist die Regel, und sie gilt jetzt überall.

## Die Änderung

- `scrShared`: obere Zone `rz-tiefgruen` → `rz-papier`.
- Chat: die obere Zone ist immer `rz-papier`; nur die Schreibkante folgt dem Raum (`rz-regal` bzw. `rz-regal-dunkel`).
- `#scrChat.rz-chat-gemeinsam` entfällt ersatzlos — mit der Papier-Oberzone gibt es nichts mehr, was den ganzen Screen einfärben müsste. Die Klasse wurde samt Umschaltung und Abbau entfernt, statt sie als toten Haken stehenzulassen.
- `--rz-nutzer-auf-gruen:#c4d8ab` entfällt wieder: Nachrichten stehen jetzt immer auf Papier, der Token hätte niemanden mehr gefärbt. *(Er kommt zurück, falls je ein Verlauf auf dunklem Grund gebraucht wird — der Wert steht in diesem Protokoll.)*

Die Textfarben in der oberen Zone von `scrShared` mussten nicht angefasst werden: sie hingen an `.rz-tiefgruen …`-Regeln und fallen mit dem Entfernen der Klasse von selbst auf die Papier-Werte zurück.

**Was ausdrücklich bleibt:** die Naht darf wandern (im Chat sitzt sie tief, im Vorraum höher), und das Regal fährt beim Antippen weiterhin akkordeonartig hoch und wieder zu — D9 und Turn 27 §4 bleiben unangetastet.

## Tests

Nachgezogen statt neu geschrieben, weil es eine Korrektur bestehender Zusicherungen ist:

- `d3-vorraeume.spec.js` — der gemeinsame Vorraum ist oben Papier, und ausdrücklich **nicht** Tiefgrün.
- `d12-2c-chat-raumtoene-kulisse.spec.js` — oben ist in beiden Räumen Papier, nur die Schreibkante folgt dem Raum, und kein Screen färbt sich als Ganzes ein (`rz-chat-gemeinsam` kommt weder im DOM noch im CSS vor).
- `s41-vorraum.spec.js` — der Selektor für die Sessionzeilen folgt der neuen Zonenklasse.

Volle Suite grün (**1515**) auf frischem Klon, Build Kern `d35947976e3223da`.

## Merkposten

Die Startseite behält unten Tiefgrün, die Vorräume unten das Regal — beides dunkel, aber nicht derselbe Ton. Das ist Absicht: unten auf der Startseite steht ein *Raum* (die Tür zum gemeinsamen), unten in den Vorräumen steht ein *Regal*. Falls das eines Tages angeglichen werden soll, ist es eine Klasse.

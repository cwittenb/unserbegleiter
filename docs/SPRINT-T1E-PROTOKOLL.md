# Sprint T1e — Ein Namensraum

**Theme-Track T1e** (Basis: `origin/main` @ `409d368`, *patch-t1bdc-theme-schicht*) · Einzelpatch
Schließt den Merkposten aus T1b: den `--pb`-Restbestand.

## Was gemacht wurde — und was ausdrücklich nicht

Seit der Vor-D1-Zeit liefen zwei Namensräume nebeneinander: `--rz-*` und der ältere Bestand ohne Präfix (`--ink`, `--accent`, `--card`, `--field`, `--me-*`, `--ai-*`). T1b hatte `--bg1`/`--bg2` entfernt, weil sie keinen Verbraucher mehr hatten; die übrigen 14 hielten weiterhin Chat-Blasen, Karten, Knöpfe und Eingabefelder.

**Sie sind jetzt umbenannt, nicht umgefärbt.** Die Werte stehen Zeichen für Zeichen wie zuvor — in beiden Theme-Fassungen. Das Aussehen ändert sich nicht.

| vorher | jetzt | Rolle |
| --- | --- | --- |
| `--ink` | `--rz-feld-ink` | Text im Eingabefeld |
| `--ink-soft` | `--rz-leise` | leise Nebenzeile |
| `--ink-faint` | `--rz-leiser` | noch leiser (`pb-sub`) |
| `--accent` | `--rz-knopf` | Knopffläche |
| `--accent-ink` | `--rz-knopf-ink` | Knopfschrift |
| `--on-accent` | `--rz-knopf-ink-invers` | Schrift auf gefülltem Knopf |
| `--me-bg` / `--me-ink` | `--rz-blase-ich` / `--rz-blase-ich-ink` | eigene Sprechblase |
| `--ai-bg` / `--ai-bd` | `--rz-blase-du` / `--rz-blase-du-rand` | Blase der Begleitung |
| `--card` / `--card-bd` | `--rz-karte` / `--rz-karte-rand` | Karten, Skala, Agenda-Blöcke |
| `--field` / `--field-bd` | `--rz-feld` / `--rz-feld-rand` | Eingabefelder |

**Bewusst offen gelassen:** ob `--rz-feld-ink` (#313c31) und `--rz-ink` (#23291f) künftig derselbe Ton sein sollen — oder `--rz-knopf` (#7ba05b) und `--rz-akzent` (#8fae74). Das sind Gestaltungsfragen, keine Aufräumfragen; sie jetzt zu verschmelzen hätte unter dem Deckmantel eines Refactorings die Farben geändert. Der Vermerk steht im Kopfkommentar von `theme.js`.

## Was dabei ans Licht kam

Die Umbenennung hat Referenzen sichtbar gemacht, die außerhalb von `core/ui/` lagen und beim Umzug hängengeblieben wären:

- **`platforms/cloudflare/pages/client.js`** (Wiedereinstiegs-Hülle) — zehn Stellen: Fehlerbanner, Anforderungsformular, Statusmeldung.
- **`platforms/artifact/main.js`** (Einrichtungsseite des Artefakts) — zehn Stellen.
- **`platforms/artifact/dev-panel.js`** — neun Stellen.
- **`core/ui/recovery-screen.js`** und **`auswahl-screen.js`** — zwei Stellen, die der T1c-Durchgang nicht gefunden hatte, weil sie über `setAttribute("style", …)` bzw. `.style.cssText` gesetzt werden statt als `style="…"`-Attribut im Template.

**Ein toter Verweis war schon vorher da:** `auswahl-screen.js` setzte `background:var(--bg)` auf die klebende Auswahl-Leiste. Ein Token `--bg` hat es nie gegeben (die Namen waren `--bg1`/`--bg2`) — die Leiste war also immer durchsichtig und ließ den Text darunter durchscrollen. Sie steht jetzt auf `--rz-papier`.

## Tests

`t1b-theme.spec.js` um zwei Zusicherungen erweitert:

1. **Kein `var(--x)` außerhalb von `rz-`** — geprüft über `design.js`, drei Screen-Module und **alle drei Hüllen** (Pages-Client, Artefakt-Einrichtung, Dev-Panel). Das ist der Wächter, der die zweite Namensraum-Ära nicht zurückkommen lässt; er hätte die obigen Fundstellen von Anfang an gemeldet.
2. Das Theme definiert keine Token außerhalb von `rz-` mehr.

Volle Suite grün (**1627**), Build Kern `60659f2b23c68e8c`.

## Merkposten

- Die Verschmelzungsfragen (Feld-Tinte ↔ Tinte, Knopf ↔ Akzent) warten auf eine gestalterische Entscheidung.
- `--rz-lh-*` ist weiterhin angelegt, aber kaum benutzt; die Zeilenhöhen stehen an den Komponenten. Kein Fehler, nur unfertig.

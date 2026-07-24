# Sprint D10 — Ansicht-Umschalter zurück (Regressionsfix zu D6)

**Design-Track D10** (Basis: D9) · Kette: … → patch-d9 → **patch-d10**

## Befund — mein Fehler in D6

Der Umschalter hell/dunkel war **weg**. Das Markup

```html
<div class="pb-theme" role="group"><button id="pbHell">…</button><button id="pbDunkel">…</button></div>
```

steckte im ursprünglichen `KULISSE_HTML`-Block in `core/ui/design.js`. D6 hat diese fixe Hintergrund-Kulisse ersatzlos entfernt, weil sie der neuen ortsgebundenen Kulisse widersprach — die beiden Knöpfe hingen mit drin und gingen still mit.

**Warum es niemandem auffiel:** Die Verdrahtung in `applyDesign` ist durchgehend `if (h)`-abgesichert und schweigt, wenn die Elemente fehlen. Kein Test prüfte je ihre **Existenz** — nur ihre Optik im CSS (`m3-mobile-ux`, D2). Die Suite blieb grün, während die Bedienung fehlte. Das ist die Lücke, nicht die Löschung selbst: eine per `if` abgesicherte Verdrahtung ohne Existenz-Test kann jederzeit ins Leere laufen.

**Zweite Folge:** `platforms/cloudflare/pages/client.js` hängt die **Push-Glocke** (M7a) an `.pb-theme` — ohne diesen Wirt kehrt `ergaenzePushGlocke()` sofort zurück. Die Glocke war damit ebenfalls unsichtbar.

## Umsetzung

- Neue Konstante `CHROME_HTML` in `design.js`: die Bedien-Ecke als eigenständiges Stück, unabhängig von der Kulisse.
- `applyDesign` legt sie an, **falls** `#pbHell` nicht schon existiert — Hüllen, die sie selbst mitbringen, bleiben unangetastet (kein Doppelanlegen).
- Position und Optik unverändert aus dem Bestand: feste Ecke oben rechts (`.pb-theme`, safe-area-fest, `z-index:6`), CSS zeigt nur das **Wechselziel** (Sonne bzw. Mond, `button.an{display:none}`).
- Beschriftung: die bestehenden Schlüssel `theme.hell`/`theme.dunkel` — jetzt zusätzlich als `aria-label`, weil der sichtbare Text per CSS zum Zeichen wird. **Kein neuer Text.**

## Tests

Neu: `tests/unit/d10-ansicht-umschalter.spec.js` (6) — genau der fehlende Wächter:

- Die Ecke **existiert** nach `applyDesign`, beide Knöpfe sind da und beschriftet.
- Sie wird **nicht doppelt** angelegt, wenn die Hülle sie mitbringt.
- Sie **wirkt**: Start hell, Tap setzt `data-theme`, das Wechselziel tauscht.
- `.pb-theme` ist als **Wirt für die Push-Glocke** vorhanden — mit dem Kommentar, warum das ein eigener Test ist.

Volle Suite grün (**1248**), Build Kern `71cf09d8f713f440`.

## Merkposten

Der Design-Entwurf (17a) zeigt das Zeichen im Kopf der Papier-Hälfte, nicht als feste Ecke. Optisch liegt beides an derselben Stelle; funktional ist die feste Ecke robuster, weil sie auf jedem Screen erreichbar bleibt und den Wirt für die Glocke stellt. Falls es in den Kopf wandern soll, wäre die Glocke mitzudenken.

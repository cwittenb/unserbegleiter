# Sprint D8 — Vollbild, Wegweiser aus der Mitte, Sprachwechsel in der Ecke

**Design-Track D8** (Basis: D7/D7a) · Kette: patch-d1 … patch-d7 → **patch-d8** (D7a ist standalone und unabhängig)

Drei Korrekturen an der ausgelieferten Fassung — reine Oberfläche, kein Vorgang geändert.

## 1 · Vollbild ohne Rand

**Befund:** D2 hatte den Vorräumen übergangsweise eine 660px-Spalte mit Polster gelassen, weil sie damals noch Karten trugen. D3 machte sie zu vollen Zweiteilungen — die Regel blieb aber stehen und rahmte die Zonen ein.

- Übergangsregel für `#scrMyRoom`/`#scrShared`/`#scrProzess` **entfernt**; `#app.rz-app` bekommt `min-height:100dvh`.
- `body` trägt jetzt Papier statt des alten Farbverlaufs — beim Überziehen (Overscroll) blitzt keine fremde Fläche mehr durch.
- Die Sicherheitsabstände (safe-area) liegen unverändert **in den Zonen** (`rz-half`), nicht in einer Hülle darum. Die M3-Invariante (alle vier Seiten im CSS) ist weiterhin erfüllt und wird im D8-Spec mitgeprüft.

## 2 · Wegweiser klappt aus der Mitte auf

Das Panel war an der Oberkante verankert (`transform-origin:top center`) und fuhr nach unten aus. Jetzt sitzt es mit `top:0` + `translateY(-50%)` **auf der Nahtlinie**, Ursprung `center center` — die Fläche wächst symmetrisch nach oben und unten in beide Hälften. Dauer und Kurve unverändert (300ms, `cubic-bezier(.2,.8,.2,1)`); `prefers-reduced-motion` weiterhin respektiert. Badge, Prio-Logik (S54) und Inhalt bleiben, wie sie sind.

## 3 · Sprachwechsel als DE/EN-Eckknopf mit Aufwärts-Dialog

Der Wechsel ist die bestehende **Paarsprache** (S30·C3, beidseitig bestätigt) — nur ihre Bedienung ändert sich:

- `#psZeile` wird die feste Ecke unten rechts (`rz-sprachecke`, safe-area-fest, z-index 30). Darin `#psLink` als kompakter Wechsler: **DE · EN**, die aktuelle Sprache leuchtet im Akzentton.
- `#boxPaarsprache` wird der Dialog, der von unten hereinfährt (`translateY(100%)` → `0`, gleiche Kurve). Der Knopf liegt **über** dem Dialog — derselbe Tap schließt wieder.
- Ein offener Vorschlag des Partners setzt den Punkt am Knopf **und** den Hinweistext daneben (sichtbares Warten statt stummem Signal); die Karte klappt weiterhin von selbst auf.
- **Unverändert:** Vorschlagen, Bestätigen, Ablehnen, Zurückziehen, der UI-Wechsel (`#psUi`), alle Hinweise zu laufenden Sessions — Logik und Texte sind nicht angefasst. Zustandsträger bleibt die Klasse `pb-hidden`; die Bewegung läuft über eine CSS-Ausnahme (`display:block` trotz `pb-hidden`), damit die bestehenden Zusicherungen gültig bleiben.

## 4 · Nachtrag — Randlos in jeder Hülle, Knopf unter dem Panel, Entwickler-Panel schwebt

**Befund (der eigentliche Rand):** Die App-Wurzel ist plattformabhängig. Im Artefakt legt `main.js` eine Hülle an (`#app > #pbMain`) und übergibt **`#pbMain`** als Wurzel — die Klasse `rz-app` landet dort, die Regel `#app.rz-app` greift nie, und die 760px-Hülle der Shell mit `padding:24px 18px` blieb stehen. In den Pages-Builds ist die Wurzel `#app` selbst, deshalb war der Streifen dort unsichtbar und in den Tests nicht zu fassen.

- **Marker am `<html>` statt an `#app`:** `applyDesign` setzt `data-vollbild`; die Regel macht `html`, `body`, `#app` **und** `#pbMain` randlos (`margin:0;padding:0;max-width:none;width:100%`, Wurzel `min-height:100dvh`). `.rz-app` ist zusätzlich auf einen reinen Klassen-Selektor umgestellt — greift also unabhängig davon, auf welchem Element es sitzt.
- **Beide Hüllen mitgezogen:** `platforms/artifact/shell.html` und die von `build-pages.js` erzeugte `index.html` verlieren ihre 760px-Spalte und das Polster; `html,body{height:100%}`.
- **Wegweiser-Knopf unter dem Textpanel:** `.rz-weg-badge` bekommt `z-index:3`, das Panel liegt auf `4`. Klappt das Panel aus der Mitte auf, verschwindet der Knopf dahinter; ein Tap aufs Panel schließt wieder (unverändert).
- **Entwickler-Panel bleibt — und schwebt:** `#pbDevHost` (nur in der Artefakt-Hülle) wird `position:fixed` oben links mit `z-index:60` über allem, scrollbar (`max-height:96vh`), zugeklappt nur die Zeile „Entwickler-Panel". Vorher lag es unter einem bildschirmfüllenden Screen und fiel aus dem Bild.

## Kleine Eigenentscheidungen

- Der Eckknopf lebt weiterhin **auf dem Startscreen** (dort, wo die Paarsprache heute schon sitzt) — nicht global über Vorräumen und Chat. Eine Ausweitung wäre eine Verhaltensfrage, keine Design-Frage; auf Zuruf machbar.
- Der ☾/☀-Themenwechsler bleibt oben im Kopf (nur die Sprache war beauftragt). Falls beides zusammengehören soll, ist das ein Handgriff.
- Der volle Sprachname („Deutsch"/„English") lebt jetzt im `title` des Knopfes und im Dialog selbst — die Ecke bleibt kompakt.

## Tests

Neu: `tests/unit/d8-vollbild-mitte-sprache.spec.js` (8): Vollbild-Verträge, Mitte-Öffnung, Eckknopf/Dialog im CSS, sowie das Verhalten (Kürzel + Hervorhebung, Auf/Zu per Tap, Punkt+Hinweis bei offenem Vorschlag).

Angepasst — beide kodierten die jetzt ersetzten Affordanzen: `paarsprache.spec.js` (Ecke trägt DE/EN, voller Name im `title`; der Vorgang wird unverändert weitergeprüft) und `d1-design-tokens.spec.js` (Panel-Vertrag Mitte statt Oberkante).

Neu im Nachtrag: Verträge für den `<html>`-Marker, das Setzen durch `applyDesign` und die Stapelfolge Knopf/Panel. `d1-design-tokens.spec.js` erneut minimal nachgezogen (Badge-Regel beginnt jetzt mit `z-index`).

Volle Suite grün (**1228**), Build Kern `d1c699ab008c51cb`.

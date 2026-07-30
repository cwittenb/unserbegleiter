# Sprintprotokoll · U10a — Drei Designfehler

**Basis:** `origin/main` @ `426613d` (`patch-s100-regie-uebergabe`)
**Patch:** `patch-u10a-designfehler.mjs`
**Endstand:** **2073 grün** (218 Dateien), Build grün
**Kern-Hash:** `0d06a5dd3e13d9b5`

**Kette:** `patch-u10a-designfehler.mjs` → `patch-u10b-chat-rollbereich.mjs`

**Rebase-Notiz:** Die erste Fassung dieses Patches setzte auf `2d84dd5` auf und griff nicht mehr — `main` war inzwischen zweimal weitergezogen (`6d04f3c` S99, `426613d` S100). `app.js` hat dort +163 Zeilen bekommen, `design.js` blieb unberührt. Beim Neueinspielen fanden **alle vier Anker ihre Stellen unverändert**; inhaltlich war nichts zu entscheiden.

---

## U10.1 · Oben rechts steht wieder ein Zeichen

### Es war kein Automatik-Fehler

Die Ecke hält beide Zeichen im DOM und lässt CSS wählen. Die Wahl griff nicht:

| Regel | Spezifität | |
|---|---|---|
| `.rz-einst span[class^="rz-einst-"]{display:block}` | **0-2-1** | gewinnt |
| `.rz-einst-baum{display:none}` | 0-1-0 | verliert |
| `html[data-theme=dark] .rz-einst-baum{display:block}` | 0-2-1 | gewinnt (später) |

Die Layout-Regel für *alle* Zeichen stach die Versteck-Regel für *eines* aus. Auf **Hell** blieben damit beide sichtbar; auf **Dunkel** fiel es nicht auf, weil die Dark-Regeln dieselbe Spezifität haben und später stehen.

Das heißt: Der Fehler zeigte sich in „Hell" genauso wie in „Automatisch" auf hellem System. Die Automatik war nicht die Ursache, nur der häufigste Weg dorthin.

### Behoben

`display` ist aus der Sammelregel entfernt — sie macht jetzt nur noch Layout. Beide Zustände stehen auf `.rz-einst`-Ebene:

```css
.rz-einst .rz-einst-seerose{display:block}
.rz-einst .rz-einst-baum{display:none}
html[data-theme=dark] .rz-einst .rz-einst-seerose{display:none}
html[data-theme=dark] .rz-einst .rz-einst-baum{display:block}
```

Der Fallback ohne `data-theme` ist **ein** Zeichen (die Seerose) — nicht zwei und nicht keins. Die Wechselziel-Logik aus D12-2f ist unverändert; nur ihre Durchsetzung ist es jetzt auch.

**Zur Prüfform:** happy-dom löst die Kaskade hier nicht browsertreu auf — es meldet in *beiden* Themes beide Zeichen sichtbar, auch im korrekten Zustand. `getComputedStyle` taugt deshalb nicht als Wächter. Geprüft wird die CSS-Quelle, wie `d9-regal-vollbild.spec.js` es auch tut.

---

## U10.2 · Der Punkt am Wegweiser ist fort (F1a)

### Was er war

Kein Satzzeichen, sondern das Warte-Signal: `.rz-punkt` war normal `display:none` und erschien nur mit `.rz-wartet` — gesetzt, wenn ein Wegweiser-Kandidat `stufe < 4` hatte.

Falsch aussah er, weil er 6 px groß mit 8 px Abstand hinter versal gesperrtem Text (`letter-spacing:.16em`) stand. Das liest sich als **„WEGWEISER."**

### Was entfernt wurde

Nach F1a ersatzlos — und zwar **vollständig**: das `<span>` aus allen vier Badges, die beiden CSS-Regeln, die Klasse `.rz-wartet` **und** ihre Berechnung in `app.js` (`kandidaten.some(kd => kd.stufe < 4)` sowie das Zurücksetzen im Chat).

Begründung für den vollständigen Rückbau: Eine Klasse, die nichts mehr zeichnet, ist schlimmer als keine — der nächste Leser hält sie für aktiv. Soll das Signal je zurück, ist es eine **neue Entscheidung über Ort und Form**, kein Wiederanschalten.

Das Wegweiser-Zeichen selbst steht jetzt **immer** — es ist die Zusage, dass es hier Hilfe gibt, kein Statusmelder. Genau so steht es auch im Kommentar an der Stelle, damit die Absicht nicht wieder verlorengeht.

In der Bedien-Ecke lebt `.rz-einst .rz-punkt` weiter. Dort sitzt er als Aufsetzer **am Zeichen** (`position:absolute`) und liest sich nicht als Satzzeichen. Ein Wächter hält beides gegeneinander fest.

### ⚠️ Ein dokumentierter Vertrag wurde aufgelöst

Der Punkt war **D1 Grundbaustein C** und wurde von vier Wächtern gehalten:

| Spec | hielt fest |
|---|---|
| `d1-design-tokens` | „Badge: grün, UPPERCASE, eckig, **mit Warte-Punkt**" |
| `d12-2a-kopf-badge-marke` | „der Warte-Punkt bleibt Teil des Badges (**D1-Vertrag**)" |
| `d2-startscreen` | „frischer Zustand … lässt den Warte-Punkt **leuchten**" |
| `d10` / `t1d` | die alte Selektorform der Ecken-Zeichen (Kollateral aus U10.1) |

Alle fünf sind umgebaut, jeder mit Begründung im Code. Die übrigen D1-Zusagen (grün, versal, eckig) stehen unverändert. **Das war kein Kollateralschaden, sondern die Auflösung eines bewussten Vertrags** — deshalb steht es hier so ausführlich.

---

## U10.3 · Der Zurück-Pfeil schließt erst, navigiert dann (F2: alle drei)

### Befund: zwei Handler auf einem Tap

Der Klick-oben-schließt-Weg lag schon auf `.rz-half`. Der Zurück-Pfeil liegt **darin** und hatte seinen eigenen Handler (`betrete("scrStart")`). Ein Tap löste beides aus: erst die Navigation, dann schloss der gebubbelte Handler einen Kasten, den niemand mehr sah. Netto verließ man den Raum, statt den Kasten zuzumachen.

### Behoben

`zurueckAus(screenId)` prüft `rz-regal-offen`: Ist das Regal offen, schließt der Pfeil **nur**. Erst der zweite Tap führt hinaus — „zurück" heißt eine Ebene, nicht zwei. `regalZu` ist idempotent, der gebubbelte Zweitaufruf kehrt sofort zurück.

**F2 · Reichweite:** Der Klick-oben-Weg war nur für `scrMyRoom` und `scrShared` verdrahtet, obwohl `regalModus` dieselbe Vollbild-Klasse auch auf **`scrEinstellungen`** setzt (`boxRecovery`, Geräte-Gruppen). Jetzt gilt er auf allen drei; `btnEinstZurueck` bekommt dieselbe Vorstufe.

---

## Kleine Entscheidungen ohne Rückfrage

1. **Vollständiger Rückbau des Warte-Signals** statt nur des sichtbaren Punkts (s. o.).
2. **Wächter kommentarblind gemacht** — an zwei Stellen nannte meine eigene Erklärung im Stylesheet den abgelösten Selektor beim Namen, und der Test fand seine eigene Notiz. Die Prüfung streift Kommentare ab, statt die Erklärung zu verstümmeln.
3. **Ecken-Test greift auf `document`**, nicht auf den App-Wurzelknoten: `CHROME_HTML` hängt im Body (`applyDesign`), nicht in `#app`.

---

## Tests

| Datei | Tests | Art |
|---|---|---|
| `u10-designfehler.spec.js` | 12 | neu |
| `d1-design-tokens` · `d2-startscreen` · `d10-ansicht-umschalter` · `d12-2a-kopf-badge-marke` · `t1d-zeichensatz` | je 1 Prüfung | umgebaut |

---

## Geänderte Dateien

`core/ui/app.js` · `core/ui/design.js` · fünf bestehende Specs · `tests/unit/u10-designfehler.spec.js` (neu) · `docs/SPRINT-U10A-PROTOKOLL.md` (neu)

# Sprint U4 · Die Freigabe-Vorschau (Turn 41 §4.8–4.11)

Basis: `origin/main` @ `98739d7` (U3c gemergt) · Kern-Hash nach Patch: `f3526d573766648d`
Suite: 1897 grün (Basis 1888 + 9)

> Als Kette hinter U3c gebaut; da U3c inzwischen auf `main` liegt, setzt der Patch direkt dort auf.

Damit ist der **Freigabe-Weg vollständig** — 41a, 41b und 41c.

---

## 1 · §4.8 · Inhalt oben, Handlungen unten

Die Vorschau zeigt, was tatsächlich beim Leser ankommt — samt der Auslassung „…", die es **nur
hier** gibt: auf der Auswahlfläche ist ein nicht gewähltes Paar bloß nicht gewählt; dass daraus
beim Leser eine sichtbare Lücke wird, sieht man erst hier. Die Markierungspflicht soll beim
**Absender** wirken.

Dieser Inhalt steht jetzt auf Papier. **Der dunkle Kasten fällt weg** — `.rz-teilen-block` war ein
Tiefgrün-Block mitten im Blatt, also eine Zone ohne Naht.

Rahmensatz, die zwei Wege und der abschließende Knopf ziehen in die Tiefgrün-Zone, in dieselbe
`#auswLeiste`, die U3c für die Auswahl angelegt hat. Damit gehört die untere Zone dem Modul in
**beiden** Phasen; nur der Wegweiser-Text unterscheidet sie noch (`auswahlOffen()` aus U3b).

**Die Klasse `.rz-teilen-block` bleibt bestehen.** `panels.js` zeigt damit die Selbstmitteilung im
Gate-Panel, und dort ist der dunkle Block richtig: er steht nicht auf Papier, sondern *ist* die
Fläche. Ein Test hält fest, dass die Regel nicht mit der Vorschau verschwindet.

---

## 2 · §4.9 · Das Entfernen-Zeichen

Es war **15 px ohne Trefferfläche**, bei `opacity:.6`, direkt neben dem Text — und es ist die
einzige Handlung dieses Screens, die etwas **wegnimmt**.

Jetzt 44 × 44 px (`--rz-tapziel-finger`, dasselbe Maß wie Senden und Mikrofon seit T2f), rechts,
mit `--rz-r-3` Abstand zum Text. Die Zeile ist dafür eine Flex-Zeile geworden: Text links mit
`min-width:0` (damit lange Antworten umbrechen statt zu drücken), das Zeichen rechts mit
`flex:none`.

**Und die Deckkraft ist weg.** Eine Handlung, die etwas wegnimmt, darf nicht die leiseste auf dem
Schirm sein. Statt `.6` jetzt `--rz-sek` — leise, aber lesbar.

---

## 3 · §4.10 · Die Wege

Native Checkboxen in einem `<label>` waren das einzige Stück UI im Set mit **Fremdgestalt**.
Jetzt eine Haarlinien-Zeile wie überall: 44 px hoch, Kästchen links, Text daneben.

**Das Kästchen bleibt ein echtes `<input type="checkbox">`, nur eingefärbt.** Eine nachgebaute
Marke (`appearance:none` plus eigener Haken) müsste den Haken selbst zeichnen — und ein
handgezeichneter Haken, der von dem abweicht, den das Gerät sonst überall zeigt, ist der
schlechtere Tausch als ein eingefärbter echter. `accent-color` trägt `--rz-tiefgruen` auf Papier
und `--rz-akzent` in der grünen Zone.

Ein Test hält fest, dass `appearance:none` **nicht** dasteht — damit die Entscheidung nicht
beiläufig gekippt wird.

---

## 4 · §4.11 · Der Rahmensatz

War schon mit U1 erledigt: `.rz-feld` liegt seit dem auf `#auswRahmen`. Er ist mit U4 nur an
seinen neuen Ort gewandert.

---

## 5 · Nebenbefund: vier Regeln standen doppelt

Beim Lesen des Stylesheets fielen vier wortgleich doppelte Regeln auf — `.rz-luecke`,
`.rz-vorschau-zeile`, `.rz-vorschau-frage`, `.rz-vorschau-weg`, jeweils zweimal hintereinander.

**Ursache:** meine eigene Nachbesserung an U1. Als ich den U1-Block auf die U0-Fassung übertrug,
habe ich ihn bis zur nächsten Marke ausgeschnitten und dabei vier Regeln mitgenommen, die schon
dastanden. Folgenlos — die zweite gewinnt mit demselben Inhalt — aber Ballast, den niemand bemerkt.

**Wächter dazu:** eine wortgleiche Wiederholung im Stylesheet ist nie Absicht. Der Test sammelt
alle Regeln, normalisiert Leerraum und verlangt, dass keine zweimal vorkommt. Das kostet nichts
und fängt genau die Copy-Paste-Unfälle, die bei Ganzdatei-Ersetzung entstehen — also die Art
Fehler, die dieses Verfahren strukturell begünstigt.

---

## 6 · Zwei Stolpersteine beim Bauen

- **Die i18n-Kanarie liest `design.js` als String-Literal** (bekannt aus T2-4 §4). Mein Kommentar
  enthielt den Begriff für die abschließende Handlung — ein Kernwort. Die Suite wurde rot, obwohl
  es nur ein Kommentar war. Der Satz heißt jetzt „der abschließende Knopf".
- **Ein `"` im Testtitel.** `describe("§4.9 · das „×" ist …")` — das typografische Anführungszeichen
  ging durch, das gerade nicht. Der Titel nennt das Zeichen jetzt beim Namen.

---

## 7 · Angepasste Bestandstests

`s96-ausschnitt-auswahl-ui.spec.js`: zwei Tests suchten Rahmensatz und Wege in `#pbMsgs`. Sie
suchen jetzt in `#auswLeiste` — und einer prüft zusätzlich, dass sie **nicht mehr** auf Papier
stehen. Das ist die eigentliche Aussage von §4.8.

---

## 8 · Prüfliste für die Sichtprüfung (Stufe B)

| # | Was | Wo |
| --- | --- | --- |
| 1 | Der Ausschnitt steht auf Papier — kein dunkler Kasten mehr mitten im Blatt | Vorschau, hell + dunkel |
| 2 | Die Auslassung „…" ist weiterhin da und lesbar | Auswahl mit Lücke |
| 3 | **Das Entfernen-Zeichen: rechts, gut zu treffen, nicht mehr blass** | Vorschau mit mehreren Stücken |
| 4 | Lange Antworten brechen um, statt das Zeichen wegzudrücken | Vorschau mit langem Text |
| 5 | Die zwei Wege sind Haarlinien-Zeilen; das Kästchen ist grün, wenn gewählt | Vorschau, hell + dunkel |
| 6 | Rahmensatz, Wege und Knopf stehen unten in der grünen Zone | Vorschau |
| 7 | Die Selbstmitteilung im Gate-Panel sieht unverändert aus (dunkler Block) | Auftragsklärung, Freigabe-Panel |
| 8 | Zurück zur Auswahl und wieder vor: keine Reste in der unteren Zone | Vorschau ↔ Auswahl |

Punkt 7 ist die Abgrenzung aus §1 — der Block soll **dort** bleiben, wo er richtig ist.

---

## 9 · Stand des U-Tracks

| | | |
| --- | --- | --- |
| U0–U3c | Bausteine, Wegweiser, Freigabe-Auswahl | gemergt bzw. geliefert |
| **U4** | Freigabe-Vorschau (41c) | **dieser Patch** — Freigabe-Weg vollständig |
| U5 | Zugang in den Einstellungen (41d) | **frei**: Einstellungen öffnen wie bisher, Zurück-Pfeil oben wie in den Räumen |
| U6 | Pflicht-Vollbild (41e, 41f) | startbar |

Mit U6 fällt `recovery-screen.js` aus beiden Wächter-Ausnahmelisten — danach ist die Liste leer.

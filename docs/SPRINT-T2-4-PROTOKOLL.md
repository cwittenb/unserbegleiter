# Sprint T2-4 · Chat, drei kleine Findings (Turn 40 §3.8)

Basis: `origin/main` @ `ec86489` (T2-3 gemergt) · Kern-Hash nach Patch: `5b06ad87785cda28`
Suite: 1813 grün (Basis 1802 + 11 neue)

Umgesetzt: **T2f · Tapziele**, **T2g · Sprecher-Marke**, **T2j · Echo-Pille**.

---

## 1 · T2f · Tapziele auf 44 px

**Finding:** `#scrChat #btnSend` und `#btnMic` überschrieben das `min-height:44px` aus `.pb-btn`
auf **34 px** — ausgerechnet die meistbenutzte Aktion der App lag damit unter dem Mindestmaß.

**Neuer Token:** `--rz-tapziel-finger:44px`, neben dem bestehenden `--rz-tapziel:36px`.
Zwei Maße mit zwei Aufgaben: die Bedien-Ecke darf mit 36 px leise bleiben, die Hauptaktionen
im Chat brauchen die volle Trefferfläche. Ein Test hält fest, dass der neue Token den alten
nicht mitzieht.

**Das Quadrat bleibt 34 px.** Aus einer Trefferflächen-Korrektur sollte keine Gestaltungsänderung
werden:

```css
#scrChat #btnSend{width:var(--rz-tapziel-finger);height:var(--rz-tapziel-finger);
  padding:5px;box-sizing:border-box;background-clip:content-box;…}
```

`background-clip:content-box` färbt nur den Inhaltskasten — 44 − 2 × 5 = 34. Ohne diese Zeile
wüchse die Akzentfläche auf 44 px mit; der Test prüft sie deshalb ausdrücklich mit.

**Kleinentscheidung:** die `5px` sind **kein** Rasterwert und stehen bewusst als Literal da.
Sie sind die halbe Differenz zweier Maße, also abgeleitet — eine Token-Stufe dafür wäre eine
Scheingenauigkeit. Der Kommentar sagt das an Ort und Stelle.

---

## 2 · T2g · Die Sprecher-Marke hängt nicht mehr am Listen-Gap

**Finding:** `.rz-sprecher{margin-bottom:-17px}` rechnete gegen `#scrChat .pb-msgs{gap:22px}`.
Zwei Zahlen, die sich gegenseitig voraussetzen: ändert jemand den Gap, klebt das Label an der
Nachricht oder schwebt.

**Umsetzung.** Label und die zugehörige Antwort stehen jetzt in einem eigenen Behälter
`.rz-sprechgruppe` (Flex-Spalte ohne Gap); der Abstand ist mit `var(--rz-r-1)` eine Rasterstufe
statt einer Differenzrechnung. Geändert in `chat-kern.js` (lebender Verlauf) **und**
`replay-ansicht.js` (Leseansicht) — beide zeichneten dieselbe Struktur, beide gruppieren jetzt gleich.

**Gruppiert wird genau die erste Antwort einer Passage.** Folgeantworten bleiben Geschwister und
behalten den Listenabstand — das entspricht dem bisherigen Verhalten, denn der negative Rand
zog auch nur die *nächste* Nachricht heran.

**Eine Falle beim Umbau:** `#scrChat .pb-msg.ai` trägt `max-width:88%`. Läge die Begrenzung
zusätzlich an der Gruppe, wären es 88 % von 88 % = 77 % — die Antwort würde beim Umbau schmaler,
ohne dass jemand das bestellt hätte. Die Breite wandert deshalb an die Gruppe, und die Nachricht
darin bekommt `max-width:none`. Ein Test hält beides fest.

**Bestandstest mitgewandert.** `d4-chat.spec.js` prüfte die Geschwisterfolge
`["L","ai","me","L","ai"]` als **direkte** Kinder von `#pbMsgs`. Auf der obersten Ebene liegt jetzt
die Gruppe: `["G","me","G"]`, und zusätzlich wird pro Gruppe `["L","ai"]` geprüft. Der Test sagt
damit mehr als vorher — er prüft die Zusammengehörigkeit, nicht nur die Reihenfolge.
`s95-7e-leseansicht.spec.js` war nicht betroffen (dort `querySelectorAll`, also Nachfahren).

---

## 3 · T2j · Die Echo-Pille lebt im Stylesheet

**Nicht aus dem Handover** — beim Lesen des Codes aufgefallen.

**Ist:** `chat-kern.js` setzte per `setAttribute("style", …)` eine ganze Komponente, mit den rohen
Werten `font-size:12px` und `border-radius:999px` an genau der Stelle, die der T1b-Wächter nicht las.
`12px` ist keine Stufe der Skala (Nachbarn: 11 und 13), `999px` gibt es als `--rz-rund-pille`.

**Neu:** `#scrChat .rz-echo` in `design.js`, mit `--rz-fs-caps`, `--rz-rund-pille` und
Rasterpolstern. Sichtbare Änderung: die Schrift wird 1 px kleiner, das Polster 1 px höher.

**Bewusst `.rz-echo` und nicht `.pb-echo`.** Die Klasse `pb-echo` tragen auch die **Leseansicht**
und der **Auswahl-Screen** — und dort ist sie heute **völlig ungestylt** (es gibt keine
`.pb-echo`-Regel im Stylesheet, nur den Inline-Style im Chat). Eine Regel auf `.pb-echo` wäre also
eine stille Gestaltungsänderung an zwei fremden Orten gewesen. Das Element trägt jetzt beide
Klassen; die Regel ist auf `#scrChat` begrenzt. Ein Test hält fest, dass `.pb-echo{` nicht im
Stylesheet auftaucht.

> **Nebenbefund:** dass die Echo-Zeile in der Leseansicht ungestylt ist, ist vermutlich kein
> Vorsatz, sondern ein Versehen aus S95.7e — dort steht eine nackte `<div>` im Verlauf, wo im
> Chat eine Pille steht. Das zu vereinheitlichen wäre eine sichtbare Änderung an der Leseansicht
> und gehört in eine eigene Runde.

**Wächter erweitert.** `t1b-theme.spec.js` nimmt `chat-kern.js` in die Dateiliste auf (kein
Farbliteral) und verbietet dort zusätzlich `setAttribute("style"` und `style.cssText`.
Laufzeitwerte über `style.transform` / `setProperty` bleiben erlaubt — gemessene Werte gehören
nicht in ein Stylesheet.

---

## 4 · Stolperstein, den der nächste kennen sollte

Die i18n-Kanarie liest `design.js` als **String-Literal** — die ganze Datei ist ein
Template-String. Kommentare darin sind für den Test also Text wie jeder andere. Zwei Regeln
gelten dort, die im übrigen Code nicht gelten:

- **keine Umlaute** (deshalb „Haelfte", „ueberlaeuft" in allen Kommentaren),
- **kein Kernwort** aus der UI-Liste — dazu gehört unter anderem der Begriff für die
  Sende-Aktion. Ein Kommentar, der ihn benutzt, lässt die Suite rot werden.

Beim Schreiben von §1 ist genau das passiert; der Kommentar heißt jetzt „Sende-Knopf".

---

## 5 · Der Wächter (`tests/unit/t2-chat-klein.spec.js`, 10 Tests)

Zwei der drei Findings sind **Negativ-Wächter**: sie halten fest, dass eine Zahl *nicht mehr*
dasteht. Das ist die eigentliche Aussage.

- `--rz-tapziel-finger` existiert; `--rz-tapziel:36px` bleibt davon unberührt.
- Beide Chat-Knöpfe ziehen das Finger-Maß; **kein** `min-height:34px` und kein `34px`-Maß mehr
  im Chat-Block.
- `padding:5px` + `background-clip:content-box` + `box-sizing:border-box` stehen zusammen.
- Kein negativer Rand mehr auf `.rz-sprecher`.
- Die Breitenbegrenzung liegt an der Gruppe, nicht doppelt.
- Die Leseansicht gruppiert wie der lebende Verlauf (echter Aufruf von `zeichneReplay`).
- Die Echo-Regel zieht nur Skalenwerte; `.pb-echo` bleibt ungestylt.

---

## 6 · Prüfliste für die Sichtprüfung (Stufe B)

| # | Was | Wo |
| --- | --- | --- |
| 1 | Sende-Quadrat sieht unverändert aus (34 px), lässt sich aber am Rand treffen | Chat, hell + dunkel |
| 2 | Mikrofon ebenso; Composer-Zeile ist nicht höher geworden | Chat |
| 3 | „BEGLEITUNG" steht mit demselben Abstand über der Antwort wie bisher | Chat mit mehreren Wechseln |
| 4 | Antworttext ist **nicht schmaler** geworden | Chat mit langer Antwort |
| 5 | Echo-Pille (Regler schließen) sitzt rechts, rund, eine Spur kleiner | Chat mit Skala/Regler |
| 6 | Leseansicht: Sprecherlabel unverändert; Echo-Zeile unverändert nackt | Protokoll einer alten Session |

Punkt 4 ist der Test für die 88-%-Falle aus §2, Punkt 6 für die `.pb-echo`-Abgrenzung aus §3.

---

## 7 · Offen

- **T2d-2** · das Hüllelement, falls Punkt 3 der T2-3-Prüfliste stört.
- Vier Kontraststellen aus `SPRINT-T2-2-PROTOKOLL.md` §4.
- Echo-Zeile in der Leseansicht (§3, Nebenbefund).
- **Patch 5** · Chat-Wegweiser: Badge wird Knopf, Schlüsselraum §3.7, Texte aus dem K4-Entwurf,
  Hinweiszeile im Start-Panel (K7), Schreibkante full-bleed (K3).

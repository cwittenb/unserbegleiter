# Sprint U7 · Einstellungen als eigener Screen (Turn 41 · Nachtrag, 41g/41h)

Basis: `origin/main` @ `26d33ec` (U6 gemergt) · Kern-Hash nach Patch: `04e819b8c2559f83`
Suite: 1915 grün (Basis 1905 + 10)

Damit ist Turn 41 vollständig — bis auf §5.5 (Architekturfrage) und §5.6 (bewusst offen).

---

## 1 · Finding 3.6 ist beantwortet, ohne dass Code sich ändert

Der Nachtrag verlangt ausdrücklich, `.rz-zeile` **vor** der Implementierung nachzulesen: 41g/41h
rechnen mit 44 px, Turn 40 und 41a–41f angeblich mit 75 px, „eine der beiden Dichten ist falsch".

```css
.rz-zeile{ … box-sizing:border-box; min-height:44px; padding:15px 0;
           font-size:var(--rz-fs-zeile);      /* 17px */
           line-height:var(--rz-lh-caps); }   /* 1.3  */
```

| | |
| --- | --- |
| Textzeile 17 × 1.3 | 22,1 px |
| + Polster 15 oben, 15 unten | **52,1 px** |
| `min-height:44px` greift? | **nein** — 52 > 44 |

**Es gibt nur eine Regel, und sie gilt für alle Screens.** Keine Fassung übersteuert Polster,
Schriftgröße oder Zeilenhöhe. Turn 40, 41a–41f und 41g/41h sind schon heute gleich dicht.

Beide Zahlen im Nachtrag beschreiben etwas anderes als den Code: **44 px** ist der Wert von
`min-height` und wirkt bei einer einzeiligen Zeile überhaupt nicht — er ist ein Boden für
Sonderfälle, kein Maß. **75 px** entstünde nur, wenn `min-height` auf den *Inhaltskasten* wirkte
(44 + 2 × 15); dafür bräuchte es `box-sizing:content-box`, die Regel setzt aber `border-box`.

**Am Code war nichts zu tun.** Was nachzieht, sind die Kartenhöhen im Designdokument: sie sollten
mit **52 px** rechnen.

**Ein Wächter ist trotzdem dazugekommen.** Er hält fest, dass `.rz-zeile` Polster und Zeilenhöhe an
genau einer Stelle setzt und keine zweite Regel sie übersteuert (ausgenommen die aufgeklappte
Regal-Zeile, die bewusst anders ist). Genau die Vermutung, es gäbe zwei Dichten, hat diesen
Nachtrag ausgelöst — der Test macht sie künftig überprüfbar statt schätzbar.

---

## 2 · Aus dem Dialog wird ein Ort (1.1)

Das aufklappende Panel war **der letzte schwebende Behälter der App** und der letzte Ort mit Radius
**und** Schatten. Es ist ersatzlos entfallen: `scrEinstellungen` ist ein Screen wie `scrMyRoom`,
erreichbar über die Bedien-Ecke, verlassen über `←` oben links.

Damit fallen drei Dinge weg, die nur das Panel brauchte:

- **`--rz-blatt-schatten`** — das Token trug nur er. Danach gibt es in `design.js` noch zwei
  `box-shadow` (`.pb-lz` und `.pb-platz.gewaehlt`); beide stehen als Merkposten aus U5 §6.
- **`aria-haspopup="dialog"`** an der Ecke. Sie kündigt kein Panel mehr an, sie führt zu einem Ort.
- **Die zwei Sonderwege des Panels:** das `stopPropagation` am Knopf und der
  Klick-außerhalb-Wächter am `document`. Ein Ort schließt sich nicht, wenn man danebentippt —
  man geht zurück.

---

## 3 · Die Naht trennt nach Reichweite, nicht nach Thema (1.2)

- **Oben, Papier:** Ansicht · Sprache der Oberfläche · Gesprächsverläufe — deine Wahl, gilt nur auf
  diesem Gerät, jederzeit zurückzunehmen.
- **Unten, Tiefgrün:** Sprachwechsel vorschlagen · Zugang wiederfinden · alle Verläufe löschen —
  alles mit Folgen: es verlässt das Gerät oder ist endgültig.

**Sprachwahl und Sprachvorschlag stehen deshalb in verschiedenen Zonen, obwohl sie dasselbe Thema
haben.** Das ist die inhaltlich stärkste Aussage des Nachtrags, und ein Test hält sie fest.

Der Wiedereinstieg ist mit umgezogen (K17). U5 hatte ihn als Regal-Zeile in den eigenen Raum
gesetzt — ausdrücklich als Zwischenlösung, bis es diesen Ort gibt.

**Das Badge nennt den Ort, an dem man ist: „Einstellungen".** Der Nachtrag schlägt in 1.3 den
Rückweg vor („Raum für mich") und begründet das mit einer Regel, die im Repo nicht gilt — überall
sonst nennt das Badge den aktuellen Ort und öffnet den Wegweiser. §5.1 des Haupt-Handovers sagt
dasselbe wie der Code. Auf deine Bestätigung hin bleibt es dabei.

---

## 4 · Bausteine (§2, 3.1–3.3)

| Ist | Neu |
| --- | --- |
| Pillen-Knöpfe (`.pb-btn`, Radius 999) | `.rz-zeile.rz-knopf-flach`, Text links, `→` rechts |
| `.rz-einst-wahl` mit eigenem Layout | `.rz-zeile` mit `✓` rechts in `--rz-akzent`, `aria-pressed` |
| Trennlinien in Grau | `--rz-karte-rand` |

- **3.1** Jede Gruppe schließt unten mit einer Haarlinie ab. Vorher hatte die letzte Option nur
  `border-top`, und der Hinweistext darunter begann optisch wie eine weitere Option.
- **3.2** Das Caps-Label ist ein **Gruppen**-Label: `min-height:0`, nicht antippbar. Die Haarlinie
  der ersten Zeile bildet seine Unterkante.
- **3.3** Der Hinweis steht direkt an der Zeile, auf die er sich bezieht — vorher stand
  „Das ändert ihr gemeinsam …" zwischen zwei Knöpfen und las sich als Fußnote von nichts.
  Neuer Schlüssel `einst.sprachvorschlagHinweis`, der den Partner beim Namen nennt.
- **3.4** Zwei Hinweise zu einem: `einst.spracheHinweis` sagt jetzt, was die Begleitung spricht
  **und** wie weit die eigene Wahl reicht.

---

## 5 · Die Kulisse bekommt ein eigenes Maß (3.5)

Das Baum-Band ist 84 px hoch und liegt über der Naht. Endet die Papier-Zone mit Text, laufen die
Silhouetten durch die letzten Zeilen.

**Neues Token `--rz-kulissenfrei:96px`** — und ausdrücklich *nicht* `--rz-nahtfrei` auf 96 gehoben:
das war mit 32 px das Maß für das **Badge**, und es auf die Kulisse zu dehnen hätte jeden Screen
verändert. Zwei Aufbauten an derselben Naht, zwei Maße. Ein Test hält beide nebeneinander fest.

---

## 6 · Löschen fragt jetzt selbst (3.7)

„Alle aufbewahrten Verläufe löschen" stand als normale Zeile neben „Zugang wiederfinden" und rief
ein System-`confirm()`. Jetzt klappt die Zeile auf — dieselbe Bewegung wie beim Wiedereinstieg —,
nennt die Zahl und fragt erst dann.

Neu in `verlauf-ablage.js`: `zaehleVerlaeufe(backend)`, dieselbe Quelle wie `loescheAlleVerlaeufe`
(die Zeitleiste kennt die Kennungen, der Speicher lässt sich nicht auflisten).

**Die Zahl wird beim Öffnen geholt, nicht vorgehalten.** Sie steht in einer Frage, die man nicht
zurücknehmen kann, und darf nicht veralten. Liegt nichts vor, steht das da — und der Ja-Knopf
erscheint gar nicht erst.

K3 gilt weiter: Aufräumen stellt die Vorgabe **nicht** um. Zwei Dinge, zwei Entscheidungen.

---

## 7 · Zwei Irrtümer, die ich unterwegs korrigiert habe

**Eine Push-Glocke gibt es nicht.** Der Kommentar über `CHROME_HTML` behauptete, `.rz-ecke` sei
„zugleich der Wirt für die Push-Glocke (M7a)" — im Markup stand nie eine. Ich hatte das ungeprüft
weitergereicht und daraus sogar eine Frage gebaut. Der Kommentar ist korrigiert.

Was dort wirklich sitzt und bleibt: der `rz-punkt` am Zeichen, der einen offenen Sprachantrag des
Partners meldet. Er wird durch U7 **wichtiger**, nicht unwichtiger — der Ort liegt jetzt weiter
weg, und ohne den Punkt gäbe es keinen Hinweis, dass dort etwas wartet.

**Und ein Fehler in meinem eigenen Werkzeug.** Mein Ersetzungs-Helfer schreibt die Datei erst,
wenn *alle* Ersetzungen eines Aufrufs geglückt sind. Eine Ersetzung in derselben Gruppe schlug fehl
(uneindeutiger Anker) — und riss damit eine bereits geglückte still mit sich. Ich habe die
fehlgeschlagene einzeln nachgeholt und angenommen, der Rest sei drin. War er nicht:
`verdrahteEinstellungen` blieb die alte Fassung, suchte das nicht mehr existierende Panel und stieg
still aus.

Die Diagnose lief danach zwanzig Minuten in die falsche Richtung, weil auch mein Debug-Einschub ins
Leere ging — er zielte auf die neue Fassung, die nie geschrieben worden war. **Lehre: nach einem
fehlgeschlagenen Sammel-Ersetzen ist der Dateizustand unbekannt, nicht teilweise gültig.**

---

## 8 · Angepasste Bestandstests

Vier Dateien prüften die Panel-Mechanik:

- **`d8-vollbild-mitte-sprache.spec.js`** · vier Tests auf die zwei Zonen umgestellt. Der Test
  „erneuter Tap schließt das Blatt wieder" ist **ersetzt**: ein Ort schließt sich nicht durch
  erneutes Antippen seines Eingangs. Geprüft wird jetzt der Rückweg über `←`.
- **`d10-ansicht-umschalter.spec.js`** · die Ecke trägt kein Blatt mehr — die Aussage ist umgedreht.
- **`s37-auftragsklaerung.spec.js`** · prüft zusätzlich, dass die Ecke zum Ort führt.
- **`s95-7b-verlauf-einstellung.spec.js`** · der Schalter wohnt in `#einstOben`.

---

## 9 · Prüfliste für die Sichtprüfung (Stufe B)

| # | Was | Wo |
| --- | --- | --- |
| 1 | Die Ecke führt zu einem Screen mit Naht, nicht zu einem Panel | von jedem Screen aus, hell + dunkel |
| 2 | `←` oben links führt zurück; die Ecke ist auf diesem Screen nicht gezeichnet | dieselbe Stelle |
| 3 | **Oben nur, was auf diesem Gerät gilt — der Sprachvorschlag steht unten** | dieselbe Stelle |
| 4 | Gruppen: Caps-Label, Zeilen mit Haken rechts, Haarlinie unten, dann der Hinweis | dieselbe Stelle |
| 5 | **Die Bäume auf der Naht laufen nicht durch den letzten Text** | mit langer Verlauf-Erklärung |
| 6 | Dunkel: die Kulisse ist überhaupt zu sehen (3.5 nennt 85 % statt 55 %) | dunkel |
| 7 | „Alle Verläufe löschen" klappt auf, nennt die Zahl, fragt erst dann | mit und ohne aufbewahrte Verläufe |
| 8 | „Zugang wiederfinden" ist hier — und nicht mehr im Raum-Regal | Raum für mich prüfen |
| 9 | Wegweiser-Badge sagt „Einstellungen" und öffnet das Panel | dieselbe Stelle |

Punkt 5 und 6 sind die Abnahmen zu 3.5. **Punkt 6 habe ich nicht umgesetzt:** die Deckkraft der
Kulisse im dunklen Theme ist eine Änderung an der Kulisse selbst, die alle Screens betrifft — siehe §10.

---

## 10 · Offen

- **3.5 · Kulissen-Deckkraft im dunklen Theme.** Der Nachtrag nennt 85 % statt 55 %. Das betrifft
  `kulisse.js` und damit **jeden** Screen, nicht nur diesen. Bewusst nicht mitgenommen: ein
  Screen-Finding sollte nicht beiläufig die Kulisse aller Screens ändern. Eigener kleiner Schritt.
- **§5.5 · Maskierte Adresse** — Architekturfrage (`SPRINT-U5-PROTOKOLL.md` §7).
- **§5.6 · Der Ausweg aus dem Pflicht-Vollbild** — bewusst offen für die Testphase (K14).
- **`.pb-err` und `.pb-lz`** — rohes Rot und ein Schatten in `design.js` (U5 §6).
- **Kartenhöhen im Designdokument** — 52 px statt 44 oder 75 (§1).

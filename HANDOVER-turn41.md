# Handover · Turn 41 — Freigabe und Zugangs-Absicherung

Stand 2026-07-28 · Quelle: `cwittenb/unserbegleiter@main`
(`core/ui/auswahl-screen.js`, `core/ui/recovery-screen.js`, `core/ui/design.js`, `core/ui/theme.js`, `core/i18n/de.js`)
Designdokument: `Raumzuzweit Design.dc.html`, Abschnitt **Turn 41** (41a–41f)

Dieses Blatt betrifft nur die neuen Screens. Palette, Bausteine und Raster stehen unverändert in `HANDOVER-turn40.md` — hier steht ausschließlich, was für 41a–41f zu tun ist.

| Id | Screen | Repo-Entsprechung |
| --- | --- | --- |
| 41a | Freigabe-Auswahl hell | `auswahl-screen.js` → `renderAuswahl` |
| 41b | Auswahl dunkel, Wegweiser aufgeklappt | dito + `verdrahteWegweiser` |
| 41c | Vorschau vor der Freigabe | `renderVorschau` |
| 41d | Zugang wiederfinden (Einstellungen) | `recovery-screen.js` → `boxRecovery` |
| 41e | Pflicht-Absicherung, mobil | `recovery-screen.js` → Modal (`emailRequired`) |
| 41f | Pflicht-Absicherung, Desktop | dito, ≥ 900 px |

---

## 1 · Drei strukturelle Entscheidungen

**1.1 · Beide Flows erben die Zweiteilung.** Heute rendert `renderAuswahl` Anleitung, Paare und Leiste alle auf Papier und ersetzt den Verlauf — der Screen verliert damit Naht, Wegweiser und Kulisse, die jeder andere Screen der App hat. Gleiches gilt für die Einstellungen. In 41a–41d ist das korrigiert: **oben Papier** = Inhalt (was du aussuchst, was ankommt, das Regal), **unten Tiefgrün** = Handlungen und alles, was das Gerät verlässt. Zu tun: Auswahlfläche in `.rz-half.rz-papier`, Leiste als `.rz-half.rz-tiefgruen` statt `position:sticky` auf Papier. Damit entfällt auch die fehlende Haarlinie der Sticky-Leiste — die Naht **ist** die Kante.

**1.2 · Das Pflicht-Modal wird Vollbild in Tiefgrün, keine Karte auf Schleier.** Es ist nicht wegklickbar, also gibt es kein Drumherum; ein Schleier zeigt eine Umgebung, die man sehen, aber nicht erreichen kann — und für viele ist das der erste Screen der App. Zu tun: `rgba(20,26,34,.55)` und `border-radius:14px` entfallen, das Overlay wird `position:fixed;inset:0;background:var(--rz-tiefgruen);color:var(--rz-ink-auf-gruen);padding:40px 24px 24px`, Inhalt in einer 520-px-Spalte (`margin:0 auto`) — mobil und Desktop identisch, nur die Spaltenbreite greift.
Drei Regeln folgen daraus:
- **Keine Bedien-Ecke.** `CHROME_HTML` darf hier nicht mitkommen — die Ecke ist ein Ausgang, und es gibt keinen. Ein gezeichneter, nicht funktionierender Ausgang ist schlimmer als keiner.
- **Kein Wegweiser-Badge.** Der Wegweiser nennt einen Ort; hier ist noch kein Ort betreten. Signatur oben und Wortmarke unten setzen Ton und Absender.
- **Fokusfalle statt Escape-Sperre.** Im Vollbild gibt es kein Außen mehr: `role="dialog" aria-modal="true"`, `autofocus` auf dem Adressfeld, Tab-Zyklus über genau die vier Elemente.

**1.3 · Die Recovery-Karte wird eine Haarlinien-Zeile, die sich aufklappt.** `boxRecovery` als `.pb-card` fällt weg; „Zugang wiederfinden" ist eine `.rz-zeile` im Einstellungs-Regal, die zu `.rz-auf` wird (24 px Serif) und den Ablauf darunter zeigt — dieselbe Bewegung wie die Regal-Zeilen, ein Baustein weniger im System. `var(--rz-karte,#fff)` verschwindet damit ebenfalls.

---

## 2 · Rohe Farbwerte, die ersatzlos entfallen

`recovery-screen.js` ist die letzte Datei in `core/ui/` mit eigenen Werten. Alle vier gehen weg, keiner wird durch ein Token ersetzt:

| Ist | Neu |
| --- | --- |
| `border:1px solid #cfd8e0` + `border-radius:9px` (Felder) | `border:0;border-bottom:1px solid var(--rz-karte-rand)`, auf Grün `rgba(157,176,143,.28)`; `padding:13px 0`, `min-height:46px`, Serif 17/1.3 |
| `var(--rz-karte,#fff)` (Kartenboden) | entfällt mit 1.3 |
| `rgba(20,26,34,.55)` (Schleier) | entfällt mit 1.2 |
| `border-radius:9px` / `14px` | 0 — im System gibt es keine Radien |
| `.pb-btn primary` | `.rz-zeile.rz-knopf-flach`, 44 px, Pfeil rechts |

Die Feldkante ist bewusst dieselbe wie die Schreibkante im Chat: eine Haarlinie unten bedeutet überall „hier schreibst du". Fokus verstärkt die Linie auf `--rz-akzent` (2 px) — **kein** Systemring. Code-Eingabe behält `letter-spacing:.2em`.

---

## 3 · Der aufgeklappte Wegweiser (41b)

Maßgeblich ist der Ist-Stand, nicht das Band aus 25d: **aufgeklappt wird der Wegweiser die Zone.** Das Badge weicht dem Text, die Fläche hebt sich einen Ton vom Boden ab (dunkel `#2c3428`), Absätze Serif 17/1.5 mit 22 px Abstand, darunter zentriert „tippen zum Schließen" (13 px, `--rz-sek2`). Kein grünes Band, kein Schließen-Kreuz, kein abgedunkelter Hintergrund; der Raum darüber bleibt in voller Deckkraft. Dieselbe Gestalt gilt für das Chat-Badge, das laut Entscheidung vom 27.07. ebenfalls Knopf wird.

Texte: erste Zeile ist `weg.chatFreigabe` („Am Ende entscheidest du, was von hier zu {partner} geht. Vorher geht nichts."). **Zweiter Schlüssel neu nötig** (Vorschlag `weg.auswahlHalten`): erklärt das Gedrückthalten. Damit hat die Interaktionsanleitung einen Ort, der nicht wegscrollt — siehe 4.4.

---

## 4 · Findings Freigabe (41a–41c)

- **4.1 · `.rz-paar` ist der einzige Rahmen im System — er muss weg.** T3b setzt `border:1px solid var(--rz-karte-rand)` um jeden Paar-Block; überall sonst trennt eine Haarlinie und der Rhythmus trägt. Neu: `border-top` statt `border`, `padding:15px 0`, und **die Fläche wählt** — ein gewähltes Paar blutet bis an die Screenkante (`margin:0 calc(var(--rz-rand) * -1);padding:15px var(--rz-rand)`) und trägt `--rz-karte`. Dieselbe Geste wie die Schreibkante: eine Fläche, die den Screenrand erreicht, heißt „das hier ist jetzt gemeint". Radius bleibt 0.
- **4.2 · Damit löst sich das Dunkel-Problem mit.** `.rz-an{border-color:var(--rz-tiefgruen)}` wäre im dunklen Theme *dunkler* als Papier, der gewählte Rand verschwände. Ohne Rand trägt die Füllung allein: dunkel `#2c3428` (ein Ton heller), hell `--rz-karte` (ein Ton dunkler) — die Richtung dreht, die Geste bleibt.
- **4.3 · Gesperrte Paare brauchen ein zweites Signal.** `.rz-zu` unterscheidet sich nur durch `opacity:.45`; auf Papier sind 45 % von `#e3dfd0` praktisch unsichtbar. Empfehlung: `.rz-zu{border-top-style:dashed;opacity:.5}` — ein Zustand, den man ohne Farbe erkennt. Der Grund („Generalisierung") bleibt kursiv und fällt erst beim ersten Antippen.
- **4.4 · Die Anleitung scrollt weg.** `.rz-ausw-kopf` steht über der Liste; bei fünfzehn Paaren ist die einzige Erklärung der Interaktion nach dem ersten Wisch verschwunden. Der Wegweiser aus Abschnitt 3 ist der Ort, an dem sie bleibt.
- **4.5 · Gedrückthalten ist unsichtbar.** 500 ms Timer ohne Rückmeldung: wer zu kurz hält, schaltet stattdessen um und hält es für einen Fehler. Empfehlung: ab ~150 ms eine leise Zustandsänderung (Haarlinie kräftiger). Der Tastaturweg (Umschalt+Enter) ist korrekt gelöst, aber nirgends erklärt.
- **4.6 · Zwei Knöpfe gleicher Gestalt, verschiedene Richtung.** „Ansehen, wie es ankommt" trägt `→`, „Noch für mich behalten" jetzt `←` — der zweite verlässt die Fläche und verwirft die Auswahl (laut Kommentar bewusst lautlos). Der Pfeil soll das zeigen.
- **4.7 · `role="button"` auf einem `<div>` mit 2–3 Zeilen Fließtext.** Screenreader lesen den ganzen Inhalt als Label, und `aria-pressed` allein sagt nicht, *was* gewählt ist. Vorschlag: `aria-label` „Antwort auf: {frage}", Antworttext als Beschreibung.
- **4.8 · Vorschau: Inhalt oben, Handlungen unten.** Der Ausschnitt (was tatsächlich bei Lena ankommt, samt Auslassung „…") steht auf Papier; Rahmensatz, die zwei Wege und „Freigeben" stehen unten in Tiefgrün. Der dunkle Kasten `.rz-teilen-block` auf Papier entfällt ganz. Die Auslassung existiert nur hier: sie macht dem Absender sichtbar, dass beim Leser eine Lücke entsteht.
- **4.9 · Das „×" in der Vorschau ist 15 px ohne Trefferfläche** — bei `opacity:.6`, direkt neben dem Text, und die einzige destruktive Aktion des Screens. Jetzt 44 × 44 px, rechts, mit Abstand zum Text.
- **4.10 · Die Wege sind native Checkboxen** (`.rz-wahl`) — das einzige Stück UI im Set mit Systemgestalt. Jetzt 44-px-Haarlinien-Zeilen mit quadratischem Kästchen; Minimum wäre `accent-color:var(--rz-tiefgruen)`.
- **4.11 · Der Rahmensatz ist ein `<textarea>` ohne Feldregel** (`.rz-ausw-rahmen` setzt nur Breite und `min-height`) und erbt den Browser-Rahmen. Gleiche Behandlung wie die Recovery-Felder, Abschnitt 2.

---

## 5 · Findings Zugang (41d–41f)

- **5.1 · Der Wegweiser nennt den Ort, also heißt er „Einstellungen".** Das Caps-Label über dem Regal entfällt — der Name steht nur einmal. Neuer Schlüssel nötig, analog zu `start.capsMein` / `start.capsTeil`.
- **5.2 · Der Ablauf hat keinen sichtbaren Fortschritt.** Adresse → Code → bestätigt sind drei Zustände, aber der Screen zeigt immer nur, was gerade da ist. Vorschlag (klein): das Zonen-Label über dem Feld führt (`Deine Adresse` → `Der Code aus der E-Mail`) — Caps-Label statt Stepper.
- **5.3 · `note` ist ein einziger `<span>` für Bestätigung und Fehler.** `fehlerText(e)` und „Code ist unterwegs an …" landen im gleichen Element in `--rz-sek2` — ein Fehler sieht aus wie eine Bestätigung. Mindestens `role="status"` vs. `role="alert"` trennen, Fehler in `--rz-warn` (Token ergänzen, nicht als Literal).
- **5.4 · Deaktiviert statt verborgen.** `pin` und `ok` werden per `display:none` ein- und ausgeblendet und verschwinden bei `pin_expired` / `pin_tries` wieder — der Screen springt in der Höhe, im Vollbild ist das eine große Bewegung. Vorschlag: Felder stehen lassen und `aria-disabled` setzen, damit der Ablauf sichtbar bleibt.
- **5.5 · „Adresse ändern" nimmt die alte Adresse nicht mit.** `aendern.remove()` und dann ein leeres Feld; die hinterlegte Adresse wird nirgends angezeigt, auch `rec.hinterlegt` nennt sie nicht. Für „auch für ein zweites Gerät" ist genau das die Frage. Vorschlag: maskiert einsetzen (`c…n@postfach.de`) und als Feldwert vorbelegen.
- **5.6 · Kein Ausweg bei Problemen — offene Produktfrage.** Wer sich vertippt und keinen Code bekommt, sitzt im Pflicht-Vollbild fest: kein „später erinnern", kein Support-Hinweis. Entweder bewusst so, oder eine leise Fußzeile („Kein Code angekommen?") mit einem zweiten Weg. **Zu entscheiden.**

---

## 6 · Was beim Bauen zu beachten ist

- **Höhenbudget.** Die Auswahlfläche mit aufgeklapptem Wegweiser braucht mobil ~1060 px Gesamthöhe; die obere Zone darf **nicht** `min-height:0` tragen, sonst schrumpft sie still unter ihren Inhalt und der Text malt in die Zone darunter (derselbe Fehler wie Finding 3.1 im Turn-40-Handover, im Dokument einmal passiert und behoben). Richtig: `flex:1` ohne `min-height`, und die Fläche scrollt innerhalb der oberen Zone.
- **Desktop.** Das Pflicht-Vollbild braucht keine Sonderbehandlung — die ganze Fläche ist Tiefgrün, also gibt es keine ausblutende Zone wie im Chat. Nur die Spaltenbreite (520 px) greift.
- **Kulisse.** Bei aufgeklapptem Wegweiser ist sie aus (analog `.rz-regal-offen .rz-kulisse-fuss{opacity:0}`); im Pflicht-Vollbild gibt es keine Naht, also auch keine Kulisse.

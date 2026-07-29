# Sprint U6 · Das Pflicht-Vollbild (Turn 41 §1.2, §5.6)

Basis: `origin/main` @ `e73aac7` (U5 gemergt) · Kern-Hash nach Patch: `e2bb5284848ae7c0`
Suite: 1905 grün (Basis 1897 + 8)

> Als Kette hinter U5 gebaut; da U5 inzwischen auf `main` liegt, setzt der Patch direkt dort auf.

Damit sind **41a bis 41f** umgesetzt — bis auf §5.5 (Architekturfrage, siehe U5 §7) und den
Einstellungs-Screen (§5.1, siehe §7 unten).

---

## 1 · Warum aus der Karte ein Vollbild wird

Der Kasten war eine Karte auf abgedunkeltem Grund. §1.2 nennt den Grund, warum das nicht trägt:
**ein Schleier zeigt eine Umgebung, die man sieht, aber nicht erreichen kann** — und für manche ist
das der erste Screen der App überhaupt.

Jetzt Vollbild in Tiefgrün: kein Drumherum, das ein Drumherum verspricht.

```css
#pbEmailPflicht{position:fixed;inset:0;z-index:1000;overflow:auto;
  background:var(--rz-tiefgruen);color:var(--rz-ink-auf-gruen);
  padding:40px var(--rz-rand) var(--rz-rand)}
.rz-pflicht-spalte{max-width:520px;margin:0 auto}
```

Kein Schleier, keine Karte, kein Radius. **Mobil und Desktop identisch** — es gibt hier keine
ausblutende Zone wie im Chat, also auch nichts zu korrigieren; nur die Lesespalte greift.

Weil der Kasten `rz-tiefgruen` trägt, greifen die grünen Fassungen der Bausteine von selbst:
Feldkante auf `--rz-hairline-gruen`, Fokuslinie auf `--rz-akzent`, Platzhalter und Hinweis auf
`--rz-sek2-auf-gruen`. Der Baustein aus U5 musste dafür nicht angefasst werden.

---

## 2 · Drei Dinge, die es hier NICHT gibt

**Keine Bedien-Ecke.** Sie ist ein Ausgang, und es gibt keinen. Ein gezeichneter Ausgang, der nicht
funktioniert, ist schlimmer als keiner.

Der Kasten deckt sie ohnehin zu (`z-index:1000` gegen `7`). Trotzdem wird sie **zusätzlich
stillgelegt**:

```css
html[data-pflicht] .rz-ecke{display:none}
```

Ein Verdecken über die Ebenen hält nur, solange niemand an den Ebenen dreht. Ein `display:none`
sagt, was gemeint ist.

**Kein Wegweiser-Badge.** Der Wegweiser nennt einen Ort; hier ist noch keiner betreten.

**Kein Ausweg** (§5.6, Entscheidung K14): kein „später erinnern", kein zweiter Weg. Für die
Testphase bewusst so. Die Frage bleibt im Handover stehen.

Was stattdessen da ist: **Signatur oben, Wortmarke unten.** Sie setzen Ton und Absender, und mehr
braucht es nicht. Die Signatur wird dabei von Hand gesetzt — `setzeSignatur()` kennt nur den
App-Baum, und der Kasten hängt am `body`.

---

## 3 · Fokusfalle statt Escape-Sperre

Im Vollbild gibt es kein Außen mehr — dann darf auch der Fokus nicht hinaus. Sonst tabbt man aus
einem Kasten heraus, den man nicht verlassen kann, und landet in einer Oberfläche, die man sieht,
aber nicht bedienen darf. Genau das Problem des Schleiers, nur für die Tastatur.

- `role="dialog"`, `aria-modal="true"`, `aria-labelledby` auf die Überschrift.
- Der Fokus liegt beim Öffnen auf dem Adressfeld.
- Tab zyklisiert; Umschalt+Tab läuft rückwärts.

**Die bedienbaren Elemente werden bei jedem Tab neu gesammelt, nicht einmal eingesammelt.**
Das ist der Punkt, an dem eine naive Fokusfalle bricht: Schritt 2 ist anfangs stummgeschaltet
(§5.4 aus U5) und wird es bei abgelaufenem Code wieder. Eine feste Liste hätte den Fokus dann auf
ein totes Feld geschickt — sichtbar, aber nicht bedienbar. Ein Test prüft genau das: er zählt die
offenen Elemente (zwei, solange Schritt 2 stumm ist) und tabbt vom Ende zurück an den Anfang.

Der Handler hängt am `document` mit `capture`, damit ihn nichts abfängt, und wird beim Schließen
wieder abgeräumt — zusammen mit `data-pflicht`.

---

## 4 · Die Ausnahmeliste ist leer

Mit diesem Patch gibt `recovery-screen.js` seinen letzten Inline-Stilblock ab. Der Wächter aus
T3-1 führt damit **keine Ausnahme mehr**:

```js
const MALT_SELBST  = [];   // Hex-Werte: keine, außerhalb von theme.js
const STILT_INLINE = [];   // Inline-Stilblöcke: keine
```

„Farbe und Skala leben in `theme.js`" ist damit kein Vorsatz mehr, sondern ein **geprüfter Zustand
über das ganze Verzeichnis** — plus `client.js`, das seit U0 mitläuft. Wer hier etwas einträgt,
muss es begründen.

Die Liste für Farb**funktionen** ist nicht leer: `design.js` trägt weiterhin `.pb-err` (rohes Rot,
Rolle wäre `--rz-warn`) und ein `box-shadow` an `.pb-lz`, und `client.js` seinen Boot-Fehlerkasten,
der bewusst inline bleibt. Alle drei sind benannt und begründet (U5 §6).

---

## 5 · Der Weg von der Karte zum Vollbild in Zahlen

| | vorher | nachher |
| --- | --- | --- |
| Gestaltung im JavaScript | 2 `cssText`-Blöcke, 4 rohe Werte | keine |
| Farbwerte | `rgba(20,26,34,.55)`, `var(--rz-karte,#fff)` | Token |
| Radien | 9 px, 14 px | keine |
| Tastaturbedienung | konnte den Kasten verlassen | Fokusfalle |
| Bedien-Ecke | verdeckt | stillgelegt |
| Auszeichnung | keine | `dialog` / `aria-modal` / `aria-labelledby` |

---

## 6 · Prüfliste für die Sichtprüfung (Stufe B)

| # | Was | Wo |
| --- | --- | --- |
| 1 | Der Kasten füllt den ganzen Schirm in Tiefgrün — nichts schimmert dahinter durch | mit `emailRequired`, mobil |
| 2 | Signatur oben, Wortmarke unten; keine Bedien-Ecke oben rechts | dieselbe Stelle |
| 3 | Feld und Knopf sehen aus wie überall — Haarlinie, Pfeil, kein Rahmen | dieselbe Stelle |
| 4 | **Auf dem Desktop dasselbe Bild, nur schmaler gesetzt** | 1280 × 800 |
| 5 | **Mit Tab durch den Kasten: der Fokus kommt nicht hinaus** | Tastatur, vorwärts und rückwärts |
| 6 | Nach dem Senden ist Schritt 2 scharf und im Tab-Lauf dabei | Ablauf durchspielen |
| 7 | Falscher Code: Schritt 2 wird wieder stumm — und der Fokus bleibt trotzdem drin | falschen Code eingeben, dann Tab |
| 8 | Nach erfolgreicher Bestätigung ist die Bedien-Ecke wieder da | Ablauf abschließen |

Punkt 5 und 7 sind die eigentlichen Abnahmen. Punkt 7 ist der Fall, für den die Liste live
gesammelt wird — er lässt sich nur von Hand prüfen.

---

## 7 · Was von Turn 41 offen bleibt

- **§5.5 · Maskierte Adresse.** Architekturfrage: der Client kennt die Adresse nicht, sie liegt im
  Worker verschlüsselt (`SPRINT-U5-PROTOKOLL.md` §7).
- **§5.1 · „Der Wegweiser nennt den Ort, also heißt er Einstellungen".** Setzt einen
  Einstellungs-**Screen** voraus. Heute sind die Einstellungen ein Ausklapp-Blatt mit drei Gruppen
  — Ansicht, Sprache, Verlauf. Was aus diesen dreien wird, sagt Turn 41 nicht; deine Antwort klärt
  die Navigation (öffnen wie bisher, Zurück-Pfeil oben), nicht den Inhalt. Das wäre **U7** und
  braucht eine Designvorlage.
  Bis dahin wohnt der Wiedereinstieg im Regal des eigenen Raums — seit U5 als Zeile, die aufklappt.
- **§5.6 · Der Ausweg.** Bewusst offen für die Testphase (K14).
- **`.pb-err` und `.pb-lz`** · rohes Rot und ein Schatten in `design.js` (U5 §6), eigener Schritt.

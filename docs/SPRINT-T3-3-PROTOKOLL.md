# Sprint T3-3 · Zwei Nachzüge aus der Offen-Liste

Basis: `origin/main` @ `fa95822` (T3-2 gemergt) · Kern-Hash nach Patch: `8ec0124d8e91602f`
Suite: 1832 grün (Basis 1831 + 1)

Zwei kleine Posten, die seit T2 auf der Liste standen und keine Designentscheidung brauchten:

- **T2e-Nachzug** · `.rz-weg-fuss` und — vom Wächter gefunden — `.rz-sprachknopf`
- **T2j-Nachzug** · die Echo-Pille gilt jetzt auch in der Leseansicht

Beides auf eigene Verantwortung entschieden (du hast raten erlaubt). Die Begründungen stehen unten,
beides ist als Light-Lane rücknehmbar.

---

## 1 · T2e-Nachzug · „tippen zum Schließen"

`.rz-weg-fuss` ist die einzige Angabe, wie man das Wegweiser-Panel wieder loswird — eine
**Anweisung**, keine Zier. Auf `--rz-gedimmt` lag sie bei **2.30 : 1** und trug damit nicht.

Jetzt `--rz-sek` (**4.70 : 1**), wie schon `.rz-zustand` und `.rz-signatur` in T2-2.

**Warum das die Ruhe des Panels nicht kippt:** die Fußzeile bleibt die leiseste Zeile darin.
Sie steht auf `--rz-fs-caps` (11 px) gegen `--rz-fs-fein` (13 px) der Hinweiszeile und
`--rz-fs-zeile` (17 px) der Optionen. Sie wird lesbar, nicht laut.

Das war die Stelle, die mir von den vier offenen Kontrastposten am meisten Sorge gemacht hat, weil
sie eine Bedienangabe ist. Die drei anderen sind unten in §4.

---

## 2 · Der Wächter hat einen fünften Posten gefunden

Beim Erweitern des Kontrast-Wächters kam ein Test dazu, der **alle** Regeln aufzählt, die
`--rz-gedimmt` als Textfarbe benutzen, und gegen eine Liste benannter Zier-Rollen prüft. Er wurde
sofort rot — an einer Stelle, die weder im Handover noch in meiner Liste stand:

```css
.rz-sprachknopf{ … color:var(--rz-gedimmt) … }     /* 2.30 : 1 */
.rz-sprachknopf .an{ color:var(--rz-akzent-hell) }  /* 2.94 : 1 */
```

Der Sprachknopf trägt eine Beschriftung — ein Bedienelement mit Text, keine Zier.

**Und der aktive Zustand musste mit.** Hätte ich nur die Grundfarbe korrigiert, wäre der aktive
Zustand (2.94 : 1) *schwächer* gewesen als der inaktive (4.70 : 1) — der Zustand hätte sich
verkehrt herum gelesen. `--rz-akzent-ink` ist der Akzent in seiner **Schriftrolle** (7.63 : 1 hell,
9.54 : 1 dunkel) und trägt hier richtig:

| | vorher | nachher |
| --- | --- | --- |
| Grundzustand | `--rz-gedimmt` · 2.30 | `--rz-sek` · **4.70** |
| aktiv | `--rz-akzent-hell` · 2.94 | `--rz-akzent-ink` · **7.63** |

Das ist der erste Befund in diesem Track, der nicht aus dem Handover kam, sondern aus einem
Wächter, der breiter fragt als die Fundstelle, für die er gebaut wurde.

### Der neue Wächter

```js
const ZIER = [".rz-zeile:disabled", ".rz-gedimmt", ".rz-fussmarke", "::placeholder"];
```

Jede Regel, die `--rz-gedimmt` als `color` setzt, muss zu einer dieser benannten Rollen gehören.
Wer eine weitere Textrolle darauf legt, kommt hier vorbei und muss begründen. Das ist derselbe
Gedanke wie bei der Sperrklinke: nicht verbieten, was entschieden ist — aber verlangen, dass es
benannt wird.

---

## 3 · T2j-Nachzug · Die Echo-Pille in der Leseansicht

In T2-4 habe ich die Echo-Regel bewusst auf `#scrChat` begrenzt: die Klasse `.pb-echo` tragen auch
die Leseansicht und der Auswahl-Screen, und eine Regel darauf hätte zwei fremde Orte still
mitverändert.

**Genau diese Ungleichheit war aber der Befund** (T2-4 §3, Nebenbefund): im Gespräch sitzt eine
Pille, in der Leseansicht steht dieselbe Angabe als nackte `<div>`. Dieselbe Information,
zweierlei Gestalt — und zwar nicht aus Absicht, sondern als Rest aus S95.7e.

Die Leseansicht trägt jetzt `.rz-echo` mit; die Regel steht ohne Screen-Bindung. Der Auswahl-Screen
ist **nicht** betroffen — er hat seit T3-2 sein eigenes `.rz-ausw-kopf` und kommt der Regel nicht
mehr in die Quere. Der Grund, warum die Begrenzung damals nötig war, ist mit T3b weggefallen.

Ein Test in `s95-7e-leseansicht.spec.js` hält fest, dass die Pille dort die Klasse trägt.

---

## 4 · Was von den Kontrastposten offen bleibt

| Rolle | ist | warum nicht mit |
| --- | --- | --- |
| `.rz-fussmarke` (Wortmarke „RAUMZUZWEIT") | 2.30 : 1 hell | Branding, nicht Information. Als dekorativ vertretbar — und im Wächter jetzt ausdrücklich als solche benannt. |
| `#scrChat …::placeholder` | 2.30 : 1 | Der sichtbare Fall ist schon versorgt: in der Schreibkante greift `.rz-tiefgruen …::placeholder` mit `--rz-sek2-auf-gruen` (5.15 : 1). Die Papier-Regel trifft heute keinen Composer. |
| `--rz-label` auf Papier | 2.94 : 1 | **Das bleibt der größte offene Posten.** Trifft jedes Caps-Label auf hellem Grund („RAUM FÜR MICH"). Zu heben hieße, das Akzentgrün zu verdunkeln — eine echte Paletten-Änderung. Turn 40 hat „eine Palette" entschieden; das ist keine Rateaufgabe. |

`--rz-label` und `--rz-akzent-hell` tragen denselben Wert, sind aber **getrennte Token** (der
T1b-Test führt das ausdrücklich als erlaubte Dopplung). `--rz-label` allein zu verdunkeln würde
also nur die Caps-Label treffen, nicht den Sende-Knopf und den Fortschrittsbalken. Das wäre der
enge Weg, falls du ihn gehen willst — sichtbar auf allen Screens, aber ohne Kollateralschaden.

---

## 5 · Prüfliste für die Sichtprüfung (Stufe B)

| # | Was | Wo |
| --- | --- | --- |
| 1 | „tippen zum Schließen" ist lesbar, bleibt aber die leiseste Zeile im Panel | Wegweiser öffnen, hell + dunkel |
| 2 | Sprachknopf: Beschriftung lesbar, **aktive Sprache deutlich stärker als die inaktive** | Einstellungen, hell + dunkel |
| 3 | Echo-Pille in der Leseansicht sieht aus wie im Gespräch | Protokoll einer Session mit Regler |
| 4 | Auswahl-Screen unverändert — der trägt `pb-echo` ohne `rz-echo` | Ausschnitt teilen |

Punkt 2 ist der eigentliche Test des Nachzugs: der Zustand darf sich nicht verkehrt herum lesen.
Punkt 4 prüft die Abgrenzung aus §3.

---

## 6 · Offen (Gesamtstand)

- **Punkt 4 der T2-5-Prüfliste** · die `weg.chat*`-Texte sind mein Entwurf. Korrekturen: Light-Lane.
- **T2d-2** · Hüllelement, falls die niedrige Fensterhöhe stört (`SPRINT-T2-3-PROTOKOLL.md` §3).
- **`--rz-label` bei 2.94 : 1** · siehe §4 — Paletten-Entscheidung.
- **T3b-Gestaltungsfrage** · Paar-Blöcke: Karten oder Hairline-Zeilen (`SPRINT-T3-2-PROTOKOLL.md` §5).
- **T3c** · `recovery-screen.js`, braucht eine Designvorlage.

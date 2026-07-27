# Sprint T2-2 · Kontrast (Turn-40-Finding §3.4)

Basis: `origin/main` @ `34d805a` (T2-1 gemergt) · Kern-Hash nach Patch: `85040a7ab89add28`
Suite: 1791 grün (Basis 1759 + 32 neue)

Umgesetzt: **T2e · gesperrte Zeile und Kopf-Signatur**.

---

## 1 · Was geändert wurde

Das Finding nennt zwei Stellen, an denen `--rz-gedimmt` Text färbt, den es nicht tragen kann:

| Regel | vorher | nachher | Kontrast hell |
| --- | --- | --- | --- |
| `.rz-zeile .rz-zustand` | `--rz-gedimmt` | `--rz-sek` | 2.30 → **4.70** |
| `.rz-signatur` | `--rz-gedimmt` | `--rz-sek` | 2.30 → **4.70** |

`--rz-gedimmt` behält seine Rolle für **rein dekorative** Zustände: die gesperrte Zeile selbst
(`.rz-zeile:disabled`), den Composer-Platzhalter, die Wortmarke. Die Tiefgrün-Fassung der Signatur
(`--rz-sek2-auf-gruen`) trägt bereits 5.15:1 und bleibt unverändert.

**Kein Token-Wert wurde angefasst.** Der Turn-40-Beschluss lautet „eine Palette" — geändert hat sich
nur, welche Rolle welchen Token zieht.

---

## 2 · Eine Falle, die beim Messen aufgefallen ist

`--rz-sek` ist eine **Papier-Rolle**. Auf Tiefgrün gemessen:

| | auf Papier | auf Tiefgrün |
| --- | --- | --- |
| `--rz-gedimmt` (hell) | 2.30 | **6.09** |
| `--rz-sek` (hell) | 4.70 | **2.98** |

Der Tausch verbessert den Kontrast auf Papier und **verschlechtert** ihn auf Tiefgrün — von 6.09
auf 2.98. Hätte eine `.rz-zustand`-Zeile in der grünen Zone gestanden, wäre T2e dort eine
Verschlechterung gewesen.

Heute steht die einzige Verwendung (`#gemeinsamHinweis`, `app.js` Z. 186) in der **Papier**-Hälfte
von `#scrShared`. Der Tausch ist also unmittelbar unbedenklich. Trotzdem ist eine Gegenregel dazu
gekommen:

```css
.rz-tiefgruen .rz-zeile .rz-zustand{color:var(--rz-sek-auf-gruen)}   /* 8.13:1 */
```

**Kleinentscheidung.** Eine Regel für einen Fall, den es heute nicht gibt, ist normalerweise
Ballast. Hier nicht: die Messung zeigt, dass die naheliegende Wiederverwendung der Klasse in der
grünen Zone stillschweigend schlechter wäre als der Ist-Zustand. Der Test hält beide Zahlen fest,
damit die Falle dokumentiert bleibt und nicht neu entdeckt werden muss.

---

## 3 · Der Wächter (`tests/unit/t2e-kontrast.spec.js`, 32 Tests)

Der einzige Wächter im T2-Track, der nicht Text vergleicht, sondern **rechnet**: er löst die
Farbtoken aus `theme.js` auf (Root-Block plus Dark-Überschreibungen) und misst den
WCAG-2.1-Kontrast der Paare, die tatsächlich zusammen auf dem Schirm stehen.

**Stufe 1 · hart.** Elf Paare je Theme, die laufenden Text tragen, müssen 4.5:1 halten —
`--rz-ink`, `--rz-sek`, `--rz-marke`, `--rz-nutzer` auf Papier; die sechs Grün-Rollen auf Tiefgrün.
Ausnahme: `--rz-marke-auf-gruen` (Wortmarke am Fuß) ist als dekorativ ausgewiesen und hält 3.0:1.

**Stufe 2 · Sperrklinke.** Acht Paare liegen heute **unter** der Schwelle. Sie werden nicht
erzwungen — ihre Werte zu heben hieße, die Palette zu ändern, und Turn 40 hat „eine Palette"
entschieden. Festgehalten wird stattdessen der **Ist-Wert**: sie dürfen steigen, nicht fallen.

| Theme | Rolle | ist | wo sichtbar |
| --- | --- | --- | --- |
| hell | `--rz-gedimmt` auf Papier | **2.30** | gesperrte Zeile, Platzhalter, Wortmarke |
| dunkel | `--rz-gedimmt` auf Papier | 3.85 | dito |
| hell | `--rz-sek2` auf Papier | **3.07** | Sprecher-Marke, Echo-Pille |
| dunkel | `--rz-sek2` auf Papier | 5.54 | dito |
| hell | `--rz-label` auf Papier | **2.94** | Caps-Label („RAUM FÜR MICH") |
| dunkel | `--rz-label` auf Papier | 8.06 | dito |
| hell | `--rz-akzent-hell` auf Papier | **2.94** | Sende-Quadrat, Mikrofon, Fortschrittsbalken |
| dunkel | `--rz-akzent-hell` auf Papier | 5.87 | dito |

Diese Liste ist zugleich die **Merkposten-Liste für einen künftigen Paletten-Turn** — siehe §4.

**Stufe 3 · Rollenprüfung.** `--rz-gedimmt` färbt weder Zustandstext noch Kopf-Signatur; die
Gegenregel für die grüne Zone steht; und beide Zahlen der Falle aus §2 werden nachgerechnet,
damit die Begründung nicht nur im Kommentar steht.

---

## 4 · Nicht geändert — zur Entscheidung

Drei Stellen färbt `--rz-gedimmt` weiterhin, obwohl dort Text steht. Der Handover nennt sie nicht,
und alle drei berühren die Palette oder die Ruhe der Gestaltung:

1. **`.rz-weg-fuss`** — „tippen zum Schließen" im Wegweiser-Panel, hell **2.30:1**.
   Das ist eine *funktionale Anweisung*, kein Zierrat. Von den dreien ist das die, die mir
   am ehesten Sorge macht. Gegen eine Änderung spricht: das Panel ist bewusst leise, und eine
   laute Fußzeile zieht Aufmerksamkeit von den drei Wegweiser-Zeilen ab.
2. **`.rz-fussmarke`** — die Wortmarke „RAUMZUZWEIT" am Zonenfuß, hell 2.30:1 auf Papier,
   3.50:1 auf Tiefgrün. Branding, nicht Information. Vertretbar als dekorativ.
3. **`#scrChat .pb-composer textarea::placeholder`** — der kursive Platzhalter. Platzhaltertext
   ist ein bekannter Grenzfall; WCAG behandelt ihn als Text, die Praxis meist nicht.

Und aus der Sperrklinken-Tabelle:

4. **`--rz-label` auf Papier, 2.94:1.** Das trifft jedes Caps-Label auf hellem Grund
   („RAUM FÜR MICH" auf dem Startscreen). 11 px, `.2em` gesperrt, bei 2.94:1 — das ist die
   Stelle mit der größten Fläche und dem schlechtesten Wert. Sie zu heben hieße, das Akzentgrün
   zu verdunkeln: eine echte Paletten-Änderung, die außerhalb dessen liegt, was Turn 40 entschieden
   hat.

**Vorschlag:** 1. und 4. in einem eigenen kleinen Turn ansehen (Messwerte liegen jetzt vor),
2. und 3. als dekorativ stehen lassen. Bis dahin hält die Sperrklinke den Ist-Zustand.

---

## 5 · Prüfliste für die Sichtprüfung (Stufe B)

| # | Was | Wo |
| --- | --- | --- |
| 1 | Kopf-Signatur („ANNA & BERND") ist lesbar, wirkt aber nicht laut | alle Screens, hell + dunkel |
| 2 | Gesperrte Zeile „Gemeinsame Auflösung" mit Zustandstext — der Hinweis ist lesbar, die Zeile selbst bleibt erkennbar inaktiv | Raum für uns, hell + dunkel |
| 3 | Die Signatur in der grünen Zone (Chat-Kopf) ist unverändert | Chat, hell + dunkel |

Punkt 2 ist der eigentliche Test: die Zeile soll gesperrt **aussehen** und ihr Hinweis trotzdem
lesbar sein. Wenn der Hinweis jetzt lauter wirkt als das Zeilenlabel, ist die Balance gekippt.

---

## 6 · Offen

- **T2d** · Desktop-Anker — braucht die Strukturentscheidung aus `SPRINT-T2-1-PROTOKOLL.md` §4
  (Wrapper-Element oder Anker-Wechsel).
- §4 dieses Protokolls · vier Kontraststellen zur Entscheidung.
- Patch 3 (Chat klein: Tapziele, Sprechgruppe, Echo-Pille) und Patch 4 (Chat-Wegweiser) folgen.

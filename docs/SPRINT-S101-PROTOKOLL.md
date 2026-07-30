# Sprint S101 · F1 vollständig — und was das Staffeln verdeckt hat

Basis: `origin/main` @ `426613d` („patch-s100-regie-uebergabe")
Kern-Hash nach Patch: `7739313addb1c025` · Suite: **2072 grün** (Basis 2061 + 11)

S100 hat den Baustein `regieUebergabe` eingeführt und ihn **gestaffelt**
angewandt: Reflexionsgespräch und Qualitätszeit ja, Auflösung später. Auf Wunsch
jetzt vollständig. Das Staffeln war nicht nur halbherzig — es hat zwei Fehler
verdeckt, die erst sichtbar wurden, als die dritte Session dazukam.

---

## 1 · Der Baustein bündelte zwei verschiedene Familien

`regieUebergabe` trug vier Regeln: das Prinzip, die Zwei-Schritt-Folge, die
Landungs-Pflicht und das Speicher-Verbot. Für zwei Abschluss-Sessions ging das
auf. Sobald die Auflösung dazukommt, geht es nicht mehr auf: Eine Aufdeck-Marke
beendet keine Sitzung, es gibt nichts zu landen und nichts abzulegen. Die zwei
Pflichten mitzufordern wäre eine Regel ohne Gegenstand gewesen.

Der Baustein ist deshalb **aufgeteilt**:

| | Familie | Inhalt |
| --- | --- | --- |
| `regieUebergabe(element, wen, folge)` | drei Sessions | die Invariante; die FOLGE ist Parameter, weil sie sich unterscheidet (Sitzung endet vs. Tafel erscheint) |
| `abschlussPflichten` | zwei Sessions | Landungs-Pflicht, Speicher-Verbot |

Genau das hätte weiteres Staffeln verdeckt: Solange eine Familie zwei Mitglieder
hat, sieht ein zu breiter Baustein richtig aus. Erst das dritte Mitglied zeigt,
wo die Naht verläuft.

Die Prompts nennen jetzt jeweils ihr eigenes Element und ihre eigene Folge:

- Reflexionsgespräch · „einen TIMELINE-BLOCK" · „sie beendet damit die Sitzung, und danach gibt es kein Eingabefeld mehr"
- Qualitätszeit · „einen MOMENT-BLOCK" · dieselbe Folge
- Auflösung · „eine Aufdeck-Marke" · „sie zeigt dann die Tafel, und die Aufdeckung ist geschehen — ein Okay, das erst danach käme, wäre keins mehr"

---

## 2 · Korrektur: Die Auflösung war NICHT bewacht

Im S100-Protokoll steht „bewacht: ja (`aufdeck-waechter`)". **Das war falsch.**
Der Aufdeck-Wächter prüft wiedergegebene Stapel-Inhalte und steigt bei gesetzter
Marke ausdrücklich aus:

```js
if (/\[\[REVEAL(-A|-B)?\]\]/.test(text || "")) return null;   // Marke gesetzt → App übernimmt
```

Der Fall „Frage UND Marke in einer Nachricht" fiel also durch **beide** Netze.
Die Regel stand seit S72 im Prompt und war seither unbewacht — dieselbe Lage wie
bei der Qualitätszeit, nur vier Sprints länger.

Neu: `pruefeMarkenAntwort` in `abschluss-waechter.js`, verdrahtet in
`gemeinsamDef` (Kette: Aufdeck → Marke → Urteil). Warum das teurer wiegt als
beim Abschluss: Die Marke ist der Startschuss für die Tafel. Steht die
Zustimmungsfrage daneben, ist aufgedeckt, bevor jemand ja sagen konnte — und ein
Okay, das erst danach käme, wäre keins.

**Bewusst NUR die Aufdeck-Marken.** Panel-Marken (`[[SLIDERS]]`, `[[RANKING]]`,
`[[BASELINE]]`) übergeben auch die Regie, lassen den Composer aber stehen; dort
ist eine Frage daneben unschön, nicht folgenschwer. Ohne Befund kein Wächter —
der Merkposten aus S100 §6 bleibt stehen.

---

## 3 · Der Wächter hat sofort etwas gefunden — bei uns

`s62-aufdeckrunde-feinschliff` fuhr die zweite Aufdeck-Richtung mit dieser
Fixture:

> `"Was fällt euch auf? … Und nun Annas Stapel.\n[[REVEAL-A]]"`

Eine Frage UND die Marke. Der Prompt verbietet das seit S62; die Frage zur ersten
Tafel würde nie beantwortet, weil die zweite sofort erscheint. Der Test prüft das
Zeichnen zweier Tafeln, nicht die Dramaturgie — die Fixture war eine Abkürzung,
die den Verstoß mitgeschrieben hat. Sie ist korrigiert.

Das ist der erste Beleg, dass der Wächter Fälle fängt, die niemandem auffallen:
gefunden im eigenen Haus, bevor ein Verlauf danebenging.

---

## 4 · Tests

- **`s101-regie-familie.spec.js`** (neu): Der Baustein trägt nur die Invariante,
  die Folge ist Parameter, die Abschluss-Pflichten sind ein eigener Baustein
  (de+en). Dann die Regie-Familie über drei Mitglieder: jede kennt die
  Invariante und nennt ihr eigenes Element; die Auflösung trägt die
  Abschluss-Pflichten ausdrücklich NICHT. Dazu vier Wächter-Fälle inklusive der
  Abgrenzung gegen Panel-Marken.
- **`s100-4-abschluss-familie.spec.js`**: unverändert im Umfang, nur die
  Wortlaut-Kanarien nachgezogen (bestimmter Artikel → Akkusativ, weil der
  Baustein das Element jetzt als Nominalphrase führt).
- **`onboarding-aufdeck.spec.js`**: KONSENS-REGEL → REGIE-ÜBERGABE.
- **`s99-3`**: dieselbe Nachziehung.

Suite: 2072 grün

---

## 5 · Eval-Läufe

Zusätzlich zu den vier Familien aus S100 §5 kommt **AUFD** dazu — die
Aufdeck-Dramaturgie ist jetzt bewacht, und die Konsens-Regel ist neu formuliert:

```
ANTHROPIC_API_KEY=sk-… npm run eval -- --familie AUFD
```

---

## 6 · Merkposten

Unverändert aus S100 §6, plus:

- **Panel-Marken** sind die dritte Form der Regie-Übergabe. Der Composer bleibt
  dort stehen; ob eine Frage daneben trotzdem stört, ist ungeprüft.
- **Weitere Doppelungen im Korpus** (Messung siehe Anschlussfrage): Widerspruchs-
  Formel, Not-Frage, Gewalt-Wort-Klärung, Klärungsfrage beim End-Signal,
  Krisendienst-Angebot. Drei davon sind sicherheitsrelevanter Wortlaut, der
  heute zweimal existiert und einseitig driften kann.

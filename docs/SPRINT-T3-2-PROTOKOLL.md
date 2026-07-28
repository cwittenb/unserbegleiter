# Sprint T3-2 · Ausschnitt-Auswahl aus dem Inline-Style lösen (T3b)

Basis: `origin/main` @ `353ab25` (T3-1 gemergt) · Kern-Hash nach Patch: `29aa3289834e3d78`
Suite: 1831 grün (Basis 1830 + 1)

Umgesetzt: **T3b · `auswahl-screen.js`**. Von den ursprünglich 17 Inline-Stilblöcken in
`core/ui/` bleiben damit **drei** — alle in `recovery-screen.js` (T3c).

---

## 1 · Worum es geht

Dreizehn Inline-Stilblöcke in `auswahl-screen.js` (R4b) — der Fläche, auf der jemand aussucht,
was vom eigenen Raum zum Partner geht. **Rein mechanisch herausgelöst**, in vierzehn benannte
Klassen.

---

## 2 · Was sich sichtbar ändert: vier Schriftgrößen, je 1 px

Der T1b-Wächter verbietet nackte `font-size`-Werte in den Komponentenregeln. Die Werte konnten
also nicht einfach mitwandern — sie mussten auf die Skala (11 / 13 / 15 / 17 / 24 / 30).

| Ist | wird | wo | Delta |
| --- | --- | --- | --- |
| `12px` (4 ×) | `--rz-fs-fein` (13px) | Anleitung, Grund, Zähler, Richtwert — alles Mikrotext in `--rz-sek2` | **+1** |
| `13px` (2 ×) | `--rz-fs-fein` (13px) | Fragezeile im Paar, Fragezeile in der Vorschau | 0 |
| `14px` | `--rz-fs-text` (15px) | der Antworttext eines Paars | **+1** |
| `16px` | `--rz-fs-zeile` (17px) | das Entfernen-Zeichen „×" in der Vorschau | **+1** |
| `border-radius:14px` | `--rz-rund-blatt` | der Paar-Block | 0 |

**Kleinentscheidung, und die einzige mit sichtbarer Folge.** Bei `12px` ging es nach oben statt
nach unten: die vier Stellen tragen alle `--rz-sek2`, das auf Papier ohnehin nur 3.07 : 1 hält
(T2-2-Sperrklinke). Kleiner zu werden hätte die schwächste Textrolle noch schwächer gemacht.
`16 → 17` beim Entfernen-Zeichen geht in dieselbe Richtung: ein Bedienzeichen darf wachsen.

Jede dieser vier Zeilen ist als Light-Lane rückgängig zu machen, falls dir eine nicht gefällt.

**Nicht angetastet:** Abstände (6/8/10/2/4 px), Deckkraft (.45/.6/.7/.75) und `min-height:56px`
stehen unverändert in den neuen Regeln. Für sie gibt es keine Skala, und sie zu verschieben wäre
Gestaltungsarbeit gewesen, keine Herauslösung. Der Wächter verbietet sie nicht.

---

## 3 · Der Zustand steht jetzt in Klassen

Der Paar-Block trug seinen Auswahlzustand als **zusammengesetzten Style-String**: Rand, Fläche und
Deckkraft je nach `an` und `wahlbar` in einem Ausdruck. Jetzt:

```
.rz-paar          Grundform
.rz-paar.rz-an    gewählt   → Rand tiefgrün, Fläche Karte
.rz-paar.rz-zu    gesperrt  → cursor:default, opacity:.45
```

**Das ist die Stelle, an der die Herauslösung still hätte brechen können:** `aria-pressed` käme
weiter richtig, die Bestandstests blieben grün — aber man *sähe* die Auswahl nicht mehr. Ein neuer
Test in `s96-ausschnitt-auswahl-ui.spec.js` prüft deshalb die Klassen **und** dass kein
`style`-Attribut mehr am Element hängt.

---

## 4 · Die Sperrklinke hat funktioniert

`t1b-theme.spec.js` führt seit T3a die Ausnahmen statt der geprüften Dateien. Beim Aufräumen von
`auswahl-screen.js` ist der Listentest rot geworden und blieb es, bis die Ausnahme gestrichen war:

```js
- const STILT_INLINE = ["auswahl-screen.js", "recovery-screen.js"];
+ const STILT_INLINE = ["recovery-screen.js"];
```

Genau dafür war die Sperrklinke gedacht — eine tote Ausnahme wäre sonst stehengeblieben, und
hinter ihr hätten sich später neue Verstöße verstecken können.

---

## 5 · Was NICHT entschieden wurde

Die Gestaltungsfrage aus dem Sprintplan bleibt offen: **bleiben die Paar-Blöcke Karten mit Rand und
Radius, oder werden sie Hairline-Zeilen wie überall sonst?** Dieser Patch verschiebt sie nur aus
dem JavaScript ins Stylesheet — beantwortet ist sie damit nicht, sie steht jetzt nur an einer
Stelle, an der man sie beantworten kann. Der Kommentar über den Regeln sagt das ausdrücklich.

---

## 6 · Prüfliste für die Sichtprüfung (Stufe B)

| # | Was | Wo |
| --- | --- | --- |
| 1 | Paar-Blöcke sehen aus wie bisher — Rand, Radius, Abstände | Ausschnitt teilen, hell + dunkel |
| 2 | **Gewähltes Paar hebt sich sichtbar ab; gesperrtes ist blass und stumm** | dieselbe Stelle |
| 3 | Anleitung, Zähler und Richtwert eine Spur größer (13 statt 12 px) — noch leise genug? | dieselbe Stelle |
| 4 | Antworttext im Paar eine Spur größer (15 statt 14 px) | dieselbe Stelle |
| 5 | Vorschau: „×" zum Entfernen etwas größer, Trefferfläche besser | Vorschau nach der Auswahl |
| 6 | Die klebende Fußleiste hält weiterhin am unteren Rand | Auswahl mit vielen Paaren |

Punkt 2 ist der Regressionstest der Klassen-Umstellung, Punkt 3–5 die Abnahme der vier
Schriftgrößen.

---

## 7 · Was von Track T3 bleibt

**T3c · `recovery-screen.js`** — drei Stilblöcke, einer davon eine Stil-Fabrik für rund acht
Elemente, dazu die Farbliterale `#cfd8e0`, `#fff` und `rgba(20,26,34,.55)`. Das ist **kein**
mechanischer Schritt: der Screen trägt ein eigenes Overlay-/Karten-Vokabular, das die
Turn-40-Sprache (Papier/Tiefgrün, Hairline, Naht) noch gar nicht spricht. Er braucht eine
Designvorlage, nicht einen Patch.

Danach kann die Ausnahmeliste im Wächter leer sein — und dann ist „Farbe und Skala leben in
theme.js" nicht mehr eine Absicht, sondern ein prüfbarer Zustand über das ganze Verzeichnis.

---

## 8 · Offen (Gesamtstand)

- **Punkt 4 der T2-5-Prüfliste** · die `weg.chat*`-Texte sind mein Entwurf. Korrekturen: Light-Lane.
- **T2d-2** · Hüllelement, falls die niedrige Fensterhöhe stört (`SPRINT-T2-3-PROTOKOLL.md` §3).
- **Vier Kontraststellen** aus `SPRINT-T2-2-PROTOKOLL.md` §4 — vorneweg `.rz-weg-fuss` bei
  2.30 : 1 und `--rz-label` bei 2.94 : 1.
- **Echo-Zeile in der Leseansicht** (`SPRINT-T2-4-PROTOKOLL.md` §3, Nebenbefund).
- **T3b-Gestaltungsfrage** · Karten oder Hairline-Zeilen (§5).
- **T3c** · `recovery-screen.js`, braucht eine Designvorlage (§7).

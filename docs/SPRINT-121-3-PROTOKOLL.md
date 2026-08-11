# Sprint S121.3 — Luft an der Naht

**Basis:** `origin/main` @ `5e53a69` **plus S121.2** (setzt darauf auf)
**Kern-Hash nach dem Bau:** `bce1822210d7bc5f`
**Vorlage:** Designdokument Turn 48, §2.5
**Schritt 3 von vier in S121**

---

## 1 · Befund

Seit S121.2 steht das Badge auf **jeder** Rollhöhe an der Naht. Vorher stand es nur auf
einer Bildschirmhöhe, und die Flanke (Q3a) hielt den Text dort weg — man konnte daran
vorbeisetzen. Jetzt nicht mehr: Das Badge ist auf der Naht zentriert und ragt mit seiner
halben Breite in die Papier-Spalte. Ohne Freiraum läuft es über die rechtsbündigen Werte der
Haarlinien-Zeilen — die Zustände in den Regalzeilen, die Pfeile — und schneidet sie ab.

---

## 2 · Das Maß ist hergeleitet, nicht übernommen

Turn 48 nennt 88px. Diese Zahl gilt dort: Badge ≈ 170px breit, halb 85, aufgerundet auf
2 × 44 (dortiges Randmaß). Unser Badge ist schmaler und unser Randmaß ist ein anderes.

Die Rechnung für uns: 11px Versalien (`--rz-fs-caps`), `.16em` gesperrt, 600er Schnitt, 18px
Polster je Seite. Über alle sechs Etiketten beider Sprachen:

| Etikett | Breite (gerechnet) | halb |
| --- | --- | --- |
| WEGWEISER / GUIDEPOST | ~113px | 57 |
| ROOM FOR ME / ROOM FOR US | ~123px | 62 |
| RAUM FÜR UNS | ~132px | 66 |
| **RAUM FÜR MICH** | **~140px** | **70** |

Das längste ist maßgeblich: 70px halbe Breite plus das reguläre Randmaß (24px) = 94px.
Aufgerundet auf ein Vielfaches davon: **96px = 4 × `--rz-rand`** — kein krummer Wert im
Raster.

Als Token `--rz-nahtfrei-x`, neben dem bestehenden `--rz-nahtfrei` (32px, T2b). Zwei Maße,
zwei Richtungen: Das alte hält den Zonenfuß **senkrecht** vom Badge weg, das neue schafft
**waagerecht** Platz. Das neue ersetzt das alte nicht; ein Test hält beide fest.

**Die Zahl ist eine Rechnung, keine Messung.** Sie steht auf der Prüfliste (Turn 48 §4,
Punkt 4): „Badge überdeckt keinen Wert der Haarlinien-Zeilen." Falls sie am Bildschirm nicht
reicht, ist die Anpassung eine Zeile im Theme.

---

## 3 · Entscheidungen

**Nur die Papier-Spalte.** An ihrer Kante liegt das Badge; §2.5 begrenzt den Freiraum
ausdrücklich darauf.

**Die zweite Hälfte bleibt unangetastet — und das ist offen.** Das Badge ist auf der Naht
zentriert, ragt also ebenso weit in die grüne Spalte. Dort beginnt der Text der Regalzeilen
bei 24px, das Badge deckt die ersten rund 46px. Ob das stört, ist eine Gestaltungsfrage und
keine Reparatur; ich entscheide sie nicht still mit. Ein Test hält fest, dass hier bewusst
nichts steht. **Siehe F20.**

**Nur ab 900px.** Gestapelt liegt die Naht waagerecht; dort hält der Zonenfuß den Abstand
über `--rz-nahtfrei`.

**Nicht im aufgeklappten Regal.** Dort ist die Hälfte absolut positioniert und das Badge
ankert an ihr (Q2/Q3) — eine andere Rechnung, die dieser Schritt nicht anfasst.

---

## 4 · Änderungen

- `core/ui/theme.js` — Token `--rz-nahtfrei-x:96px` samt Herleitung.
- `core/ui/design.js` — `padding-right` an der ersten Hälfte, ab 900px.
- `tests/unit/s121-3-luft-an-der-naht.spec.js` — neu.
- `tests/unit/t2-layout-grundlagen.spec.js` — ein Wächter präzisiert (siehe unten).

---

## 5 · Tests

Acht Fälle: die Regel steht; das Maß liegt als Token vor, nicht als Zahl in der Regel; es
deckt halbe Badge-Breite plus Randmaß; es ist ein Vielfaches des Randmaßes; es gilt nur ab
900px; die zweite Hälfte bleibt frei; das Regal bleibt ausgenommen; das senkrechte Freimaß
besteht daneben fort.

### Ein zu grob gefasster Wächter, korrigiert

Mein eigener Test aus S121.1 verbot den **Selektor**
`.rz-split:not(.rz-regal-offen)>.rz-half:first-child{` — gemeint war aber der
**Rollbereich**. S121.3 braucht genau diesen Selektor für den Freiraum, und der Wächter fiel
um. Er zielt jetzt auf die Regel (`min-height:0;overflow:auto`) statt auf den Selektor.

Das ist dieselbe Sorte Fehler wie die Kommentar-Treffer der letzten Schritte, nur eine Ebene
höher: **Ein Wächter muss die Absicht festhalten, nicht die Schreibweise, in der sie
gerade steht.**

**Volle Suite:** 271 Dateien, 2661 Fälle, grün (unit 241/2463 in zwei Scherben,
engine+worker+e2e 31/198).
**Build:** erfolgreich, Kern `bce1822210d7bc5f`.

---

## 6 · Nachweis am laufenden System

1. Vorraum mit langer Regalliste, Fenster ≥ 900px: Das Badge überdeckt an keiner Rollhöhe
   einen Zustandswert oder Pfeil der Papier-Spalte.
2. Sprache auf Englisch stellen: dasselbe (die Etiketten sind dort kürzer, das Maß gilt für
   das längste).
3. Der Abstand wirkt nicht wie ein Fehler — 96px sind viel; falls die Spalte dadurch
   gedrängt aussieht, ist das eine Gestaltungsfrage für die nächste Runde.
4. Gestapelt (< 900px): unverändert.

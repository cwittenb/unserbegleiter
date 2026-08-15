# Sprint S140 — Einstellungen: Wegweiser, Kopf, Toggle, Naht

**Basis:** `origin/main` @ `d147e01` (`patch-s139-pflichtweg-im-e2e`)
**Auslieferung:** `patch-s140-einstellungen-wegweiser-kopf-toggle.mjs`
**Kern-Hash danach:** `00508f50728e1691`
**Suite:** 284 Dateien / 2775 Fälle grün

---

## 1 · Vier Befunde, ein Ort

| # | Befund | Ursache |
|---|---|---|
| 1 | Der Wegweiser war auf dem Einstellungs-Screen unsichtbar | Kein Layoutfehler. `wegKandidaten()` hatte keinen Zweig für `scrEinstellungen` — null Zeilen blenden Panel **und** Zeichen aus. Der Screen stand seit U7 korrekt in der `boxId`-Tabelle. |
| 2 | „Einstellungen" stand doppelt | Als `h1` in der Papier-Zone und im Wegweiser-Zeichen an der Naht. Nach K5 nennt das Zeichen den Ort. |
| 3 | Die Zonenüberschriften standen versetzt | Zweispaltig beginnen beide Hälften auf derselben Linie. Die erste trägt zusätzlich die Kopfzeile, die zweite beginnt sofort. Der Titel allein war es also nicht. |
| 4 | Beim Aufklappen eines Fachs wuchsen die Zeilen der linken Spalte in die Naht | Der Naht-Freiraum (`--rz-nahtfrei-x`, S121.3/S121.5) hing an `:not(.rz-regal-offen)`. |

---

## 2 · Was geändert wurde

### 2.1 Wegweiser bekommt Inhalt (`core/ui/app.js`, `core/i18n/*.js`)

Neuer Zweig in `wegKandidaten()`. Die Stufen bedeuten hier — wie im Chat (T2i)
und anders als in den Vorräumen — keine Dringlichkeit: Man steht nicht **vor**
einer Wahl, sondern **in** einer Liste. Einen „nächsten Schritt" gibt es nicht.

| Stufe | Bedingung | Key |
|---|---|---|
| 2 | `languageRequest` der anderen Person | `weg.einstSprachAntrag` |
| 2 | `languageRequest` von mir | `weg.einstSprachWartet` |
| 4 | immer | `weg.einstZugang` |
| 4 | immer | `weg.einstEndgueltig` |

Die beiden Stufe-2-Zeilen schließen einander aus. Bedingung aus `state.info` —
kein zusätzlicher Backend-Weg für eine Komfortanzeige.

**Verworfen:** eine dritte stehende Zeile, die die Naht erklärt („oben gilt nur
auf diesem Gerät …"). Sie stand im Sprintplan und ist auf Zuruf entfallen —
die Zonenüberschriften sagen dasselbe zwei Zeilen weiter unten.

**Nicht gebaut:** `weg.einstZugang` erscheint immer, auch wenn der
Wiedereinstieg längst eingerichtet ist. Der Zustand steht heute nicht in
`ladeLage()`; ihn aufzunehmen ist ein Backend-Schritt, kein UI-Schritt.

### 2.2 Titel entfällt, Spiegel gleicht aus (`core/ui/app.js`, `core/ui/design.js`)

`h1` raus. Der Ausgleich ist ein blinder Kopf-Spiegel in der zweiten Hälfte,
kein gerechnetes Polster: Die Kopfhöhe hängt an Schriftgrad und Zeilenhöhe, ein
Pixelmaß liefe beim nächsten Rastermaß auseinander. Der Spiegel ist per
Konstruktion exakt gleich hoch und folgt der Bauform, die die Kopfzeile intern
schon für ihren rechten Rand benutzt (`<span class="rz-zurueck rz-blind">`).

Er ist `aria-hidden` und enthält keinen Knopf — hier ist nichts zu bedienen.

Sichtbar nur zweispaltig und nur bei geschlossenem Regal: Gestapelt gibt es
keine gemeinsame Höhe, und im aufgeklappten Regal verbirgt die zweite Hälfte
ohnehin ihren Zonenfuß. Die Grundstellung (`display:none`) steht bewusst
**außerhalb** der Desktop-Klammer; dass die Ausnahme trotzdem gewinnt,
entscheidet die Spezifität (eine Kennung), nicht die Reihenfolge im Stylesheet.

### 2.3 Das Zeichen kippt (`core/ui/einstellungen-screen.js`, `core/ui/app.js`)

`verdrahteEinstellungen(betrete, verlasse)`. Steht man bereits auf
`scrEinstellungen`, geht der Tap den Rückweg statt erneut hinein.

`verlasse` ist **derselbe** Weg wie der Zurück-Pfeil links (`zurueckAus`), kein
zweiter eigener: Ein Ort mit zwei verschiedenen Ausgängen wäre schwerer zu
lernen als einer mit einem. Damit erbt das Zeichen U10.3 — steht ein Fach
offen, schließt der erste Tap nur das Fach.

Der zweite Parameter ist optional geprüft (`typeof … === "function"`), damit
ältere Aufrufer nicht brechen.

### 2.4 Der Naht-Freiraum hängt am Badge, nicht am Regal (`core/ui/design.js`)

`:not(.rz-regal-offen)` aus beiden `--rz-nahtfrei-x`-Regeln entfernt.

Die Einschränkung war von den Nachbarregeln der Flanke (Q3a/S114d) übernommen,
die im offenen Regal wirklich nicht gelten dürfen. Für **diese** Regel stimmte
die Begründung nie: Q3 setzt das Badge im aufgeklappten Regal ausdrücklich auf
`50dvh` — es steht dort weiterhin auf der Naht. Die alte Begründung im Test
(„die Hälfte ist absolut positioniert") ist zusätzlich seit S121.6/S125
überholt; die Hälfte klebt heute (`sticky`).

Netto: Beide Spalten atmen beim Aufklappen nicht mehr, und die Zeilen laufen
nicht mehr unter das Zeichen.

---

## 3 · Tests

**Neu**
- `tests/unit/s140-einstellungen-wegweiser.spec.js` (11) — Zeichen sichtbar,
  Panelform, Reihenfolge in ruhiger Lage, Stufe 2 vor Stufe 4, Deckel drei,
  DE/EN-Parität samt Platzhalter-Abgleich.
- `tests/unit/s140-einstellungen-kopf.spec.js` (9) — keine `h1`, Ort weiterhin
  im Zeichen, Spiegel vorhanden/`aria-hidden`/knopflos, gleicher Abstand beider
  Überschriften, Grundstellung außerhalb der Desktop-Klammer, Regressionsschutz
  gegen Köpfe in der zweiten Hälfte anderer Screens.
- `tests/unit/s140-einstellungen-toggle.spec.js` (6) — auf/zu/auf, Ausgang wie
  der Pfeil, von woanders öffnet er weiterhin, U10.3-Erbe bei offenem Fach,
  Verdrahtung bleibt einmalig.

**Invertiert (nicht gelöscht)**
- `tests/unit/s121-3-luft-an-der-naht.spec.js` — „im aufgeklappten Regal gilt
  der Freiraum nicht" ist zu „und er gilt auch dort" geworden, mit der
  Begründung im Kopf des Falls. Die beiden Selektor-Zusicherungen sind
  mitgezogen; die Maß-Fälle (Token, Vielfaches, halbe Badge-Breite) bleiben
  unverändert.

---

## 4 · Dokumentation

`docs/wegweiser-inventar.md` — Abschnitt „Einstellungen (`scrEinstellungen`)"
mit Stufen-Tabelle. Das Inventar beansprucht Vollständigkeit; ein Screen mehr
in der Rangliste gehört hinein.

---

## 5 · Offen

- Herkunfts-Screen merken: Der Rückweg führt immer auf `scrStart`, auch wenn
  man aus dem gemeinsamen Raum kam. Das gilt für Pfeil und Zeichen
  gleichermaßen und ist ein eigener Schritt.
- Recovery-Zustand in `ladeLage()`, damit `weg.einstZugang` verschwindet,
  sobald der Wiedereinstieg eingerichtet ist.

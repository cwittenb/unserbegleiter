# Sprint UX-3 · Lesbar und treffbar

**Datum:** 11.11.2026 · **Basis:** `main` (nach UX-5) · **Branch:** `ux3-lesbar` · **Bezug:** Code-Review U6, U7

## Kontrast (U6)

| Token | Rolle | Vorher | Nachher | Kontrast auf Papier |
|---|---|---|---|---|
| `--rz-sek2` | Einleitungen, Sitzungsname | `#8b917d` | `#6c7161` | 3,07 → 4,7 |
| `--rz-label` | Caps-Zeilen (11 px), Sprecherlabel | `#7d9b62` | `#5f764b` | 2,94 → 4,7 |
| `--rz-marke-auf-gruen` | Fußmarke auf Tiefgrün (hell und dunkel) | `#6f8062` | `#849379` | 3,50 → 4,5 (dunkel 4,16 → 5,3) |
| `--rz-pfeil`, `--rz-akzent-hell` | Pfeile, Mikrofon, Balken (Zeichen, Grenze 3:1) | `#7d9b62` | `#78955e` | 2,94 → 3,1 |

Gemessen gegen Papier **und** die abgehobene Fläche. Die dunkle Fassung bestand schon bis auf die Fußmarke.

**Preis:** `--rz-sek2` liegt jetzt fast auf `--rz-sek` — die zweite Graustufe lässt sich auf Papier nicht halten, ohne den Kontrast zu verfehlen. Wenn dir die Abstufung fehlt, wäre der Weg, `--rz-sek` dunkler zu ziehen statt `--rz-sek2` heller.

## Trefferflächen (U7)

| Element | Vorher | Nachher |
|---|---|---|
| Zurück-Pfeil | 28×24 | 44×44 wirksam (unsichtbare Fläche, Zeichen und Raster unverändert) |
| Einstellungs-Zeichen | 36×36 | 44×44 wirksam |
| Wegweiser-Badge | 32 hoch | 44 hoch wirksam |
| Mikrofon | 32×44 | 44×44 (echte Breite; eine Überlagerung hätte Feld und Sende-Knopf den Rand genommen) |

Im Browser nachgemessen (360 px, hell und dunkel): 21 px neben der Mitte trifft jedes der vier Elemente.

## Nicht umgesetzt

| Punkt | Grund |
|---|---|
| U13 · ein festes Einstellungs-Zeichen (heute Stern hell, Baum dunkel) | Das Zeichenpaar ist eine Gestaltungsentscheidung; bitte sagen, welches bleiben soll |
| Landing: „Informiert werden →“, Fußlinks | gehört zu UX-8 (Landing) |
| Regler-Höhe | mit UX-5 erledigt |

**Tests:** `tests/unit/ux3-lesbar.spec.js` (neu, 48): Kontrast je Token-Paar in beiden Fassungen aus `theme.js` gerechnet — ein neuer Ton unter der Grenze macht den Test rot.

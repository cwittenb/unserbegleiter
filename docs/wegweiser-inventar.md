# Wegweiser-Inventar v2 — Rangliste mit Stufen (S54)

Stand: S54 (Basis `0f079c1` + patch-s53). Quelle: `wegKandidaten()` +
`waehleWegzeilen()` in `core/ui/app.js`, Texte aus `core/i18n/de.js`.

## Modell

- **EINE Rangliste pro Vorraum** (keine Hinweis/Options-Trennung mehr).
- Jede Zeile ist ein Kandidat mit **Stufe** und **Bereich** (mein/gemeinsam).
- Sortierung: Stufe aufsteigend, innerhalb der Stufe Code-Reihenfolge.
- **Deckel: DREI Zeilen** — über alles, unabhängig von der Titelzeile
  („Wegweiser" gibt es nur im gemeinsamen Raum, sie zählt nicht mit).
- **Invariante:** Stufe 4 füllt nur auf, verdrängt nie Stufe 1–3.
- **Start-Balance (einzige Ausnahme):** Auf dem Startscreen steht mindestens
  eine Zeile je Bereich; fehlt einer, weicht die niedrigst priorisierte der
  drei Zeilen seiner besten Zeile.
- **Verschmolzene Doppelungen:** „Freigaben bereit" + Auflösungs-Einladung →
  `weg.aufloesungStart` bzw. `weg.aufloesungStartMitAufdeck` (eine
  Aktionszeile); die stehende Regal-Einladung weicht dem Regal-Zähler.

## Stufen

| Stufe | Bedeutung | Zeilen |
|---|---|---|
| 1 | Begonnenes fortsetzen | `einzelPause`, `momentOffen` |
| 2 | Roter Faden (Klärung → Auflösung) | `startAuftrag`/`optAuftragEuch`, `aufloesungStart(MitAufdeck)`, `aufloesungFehlt*`, `messBereit` |
| 3 | Neues / Offenes | `regalNeu`, `agendaOffen`, `messOffen` |
| 4 | Freie Sessions & Stöbern | `startSolo`/`soloErster`, `optQz`/`optQzTeil`, `optRueckblick(Spaeter)`, `optRegalTeil` |

## Kandidaten je Screen

### Start (`scrStart`) — mit Bereich für die Balance

| Stufe | Bereich | Bedingung | Zeile |
|---|---|---|---|
| 1 | mein | `einzelKapitel > 0` | `weg.einzelPause` |
| 1 | gemeinsam | `momentOffen` | `weg.momentOffen` |
| 2 | mein | `!einzelBegonnen` | `weg.startAuftrag` |
| 2 | gemeinsam | `handBeide && !aufloesungGelaufen` | `weg.aufloesungStart` / `…MitAufdeck` (bei `aufdeckBereit`) |
| 3 | gemeinsam | `regalNeu > 0` | `weg.regalNeu` |
| 3 | mein | `messOffen` | `weg.messOffen` |
| 4 | mein | immer | `weg.startSolo` |
| 4 | gemeinsam | immer | `weg.optQz` |

### Mein Raum (`scrMyRoom`)

| Stufe | Bedingung | Zeile |
|---|---|---|
| 1 | `einzelKapitel > 0` | `weg.einzelPause` |
| 2 | `!einzelBegonnen` | `weg.optAuftragEuch` |
| 3 | `messOffen` | `weg.messOffen` |
| 4 | immer | `weg.soloErster` |
| 4 | immer | `weg.optRueckblickSpaeter` (Zeitleiste leer) / `weg.optRueckblick` |

### Gemeinsamer Raum (`scrShared`)

| Stufe | Bedingung | Zeile |
|---|---|---|
| 1 | `momentOffen` | `weg.momentOffen` |
| 2 | `!aufloesungGelaufen`, GENAU EINE: `handBeide` → `weg.aufloesungStart(MitAufdeck)`; sonst `aufloesungFehltBeide`/`FehltDu`/`FehltPartner` | Auflösungs-Zeile |
| 2 | `messBereit` | `weg.messBereit` |
| 3 | `regalNeu > 0` | `weg.regalNeu` |
| 3 | `agendaOffen > 0` | `weg.agendaOffen` |
| 4 | immer | `weg.optQzTeil` |
| 4 | `regalNeu == 0` | `weg.optRegalTeil` |

## Beispiel-Lagen (aus den S54-Tests)

- Gemeinsamer Raum, Volllage (QZ offen, Freigaben+Aufdeck, Regal neu, Agenda,
  Prozessreflexion bereit): `momentOffen` · `aufloesungStartMitAufdeck` ·
  `messBereit` — Regal/Agenda verdrängt (über Regal-Knöpfe + Badges erreichbar).
- Start, ruhige Lage: `startAuftrag` · `startSolo` · `optQz`.
- Start, lauter Mein-Zeilen (Einzel pausiert + Runde wartet): `einzelPause` ·
  `messOffen` · `optQz` (Balance ersetzt `startSolo`).
- Start, lauter Gemeinsam-Zeilen: `momentOffen` · `aufloesungStart` ·
  `startSolo` (Balance ersetzt `regalNeu`).

## Entfallene Keys

`weg.aufloesungBereit`, `weg.optAufloesung`, `weg.optAufloesungMitAufdeck`
(de+en) — ersetzt durch `weg.aufloesungStart(MitAufdeck)`.

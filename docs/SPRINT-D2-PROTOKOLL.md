# Sprint D2 — Startscreen als Vollbild-Zweiteilung

**Design-Track D2** (Basis: D1; Design Turn 17a/b/g) · Kette: patch-d1 → **patch-d2**

## Ziel

Der Startscreen wird die erste volle Zweiteilung: Papier-Hälfte („Raum für mich") oben, Tiefgrün-Hälfte („Raum für uns") unten, Betreten-Zeilen gespiegelt an der Naht, Wegweiser als Badge+Panel.

## Umsetzung

1. **Markup `scrStart`** (`core/ui/app.js`): `rz-split` mit zwei Hälften. Oben: Kopf (Wortmarke `#pbKern`, Theme-Glyphen), Caps-Label, `#startHallo` als Serif-H1, Betreten-Zeile `#btnMyRoom` (↑) als letzte Zeile über der Naht. Unten (`rz-naht-anker`): Badge `#wegBadgeStart` auf der Naht, Panel `#wegStart`, Betreten-Zeile `#btnSharedRoom` (↓, mit `#lzStart` für Initial-Badges) direkt unter der Naht, Titel + Label unten außen. Alle funktionalen IDs und Handler unverändert.
2. **Neue i18n-Schlüssel** (K1a/K1b freigegeben): `start.capsMein/capsTeil`, `start.betreteMein/betreteTeil` („Deinen/Euren Raum betreten"), `start.teilTitel`, `weg.badge` (EN **Guidepost** lt. Handoff 17g), `weg.fuss`. Bestehende Schlüssel unangetastet.
3. **Wegweiser-Panel-Renderer** (`aktualisiereWegweiser`): Boxen mit Klasse `rz-weg-panel` rendern Optionen als `rz-option`-Absätze + Fußzeile; Warte-Punkt am Badge, wenn ein Kandidat der Stufen 1–3 vorliegt (stehende Stufe-4-Einladungen leuchten nicht). Alte Boxen (Vorräume bis D3) behalten die `pb-item`-Liste. Prio-Logik S54 unverändert (K3 freigegeben).
4. **Benachrichtigung ohne Zähler**: `wendeLageAn` bekommt einen Start-Zweig — runde 22px-Initial-Badge (Initial der Person, die lesen soll) an der Betreten-Zeile.
5. **App-Rahmen**: Wurzel wird `rz-app` (randlos); noch nicht umgezogene Screens behalten übergangsweise die zentrierte Spalte (CSS). `pb-brand`-Block entfällt, `#pbHallo` bleibt still im DOM. Theme-Umschalter als ☾/☀-Glyphen (nur Wechselziel sichtbar; Beschriftung bleibt für Screenreader).
6. **Design-Entscheidung, kein Textverlust**: `startIntro`/`startMeinSub`/`startTeilSub` sind ausgeblendet (DOM + Schlüssel erhalten) — der Start ist lt. Handoff „reiner Wegweiser, keine Feature-Listen". Fürs Textreview vorgemerkt.

## Tests

Neu: `tests/unit/d2-startscreen.spec.js` (7). Angepasst: `s36-ui` (Start-Struktur → Naht), `s41-vorraum` + `s54-wegweiser-prio` (Wegzeilen-Selektor kennt `rz-option`), `s37-auftragsklaerung` (Marke im Kopf statt `pb-brand`). Volle Suite grün (1192).

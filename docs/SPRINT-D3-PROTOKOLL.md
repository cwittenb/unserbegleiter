# Sprint D3 — Vorräume als Zwei-Zonen-Layout

**Design-Track D3** (Basis: D2; Design Turn 17c/d) · Kette: patch-d1 → patch-d2 → **patch-d3**

## Ziel

Beide Vorräume tragen den Schnitt: obere Zone „Der Raum." (Sessions als Hairline-Zeilen unten an der Zonengrenze), untere Zone „Das Regal." (Regal-Zeilen direkt unter der Grenze, Titel unten außen), Wegweiser-Badge auf der Zonengrenze.

## Umsetzung

1. **`scrMyRoom`**: Papier-Zone (Kopf mit ←-Zurück `#btnZurueck1`, Caps-Label, H1 „Der Raum.", `#meinIntro` klein lt. K1c) mit Zeilen `#btnSolo`, `#btnEinzel` (Spalten-Zeile mit 2px-Fortschrittsbalken `#einzelBalken`, Breite = geschaffte Kapitel / `K().KAPITEL_TITEL.length`, ohne Kapitel-Label), `#btnMess` (S44-Slot-Logik unverändert). Regal-Zone mit `#btnZeitleiste`, Inhalts-Boxen im Regal-Stil, Fuß „Das Regal." + `mein.gruppeRegale`.
2. **`scrShared`**: Tiefgrün-Zone mit `#btnMoment`, `#btnGemeinsam` (Sperr-Zustand: `disabled` + `rz-gedimmt` + Zustandstext `#gemeinsamHinweis` IN der Zeile statt Pfeil; `#gemeinsamSub` bleibt als kleine Zeile funktional für S62/S63). Dunkel-Regal-Zone mit `#btnRegal` (+`#lzRegal`), `#btnAgenda`, `#btnQz`, Boxen, Fuß.
3. **`wendeLageAn` auf Label-Spans**: `#einzelLabel`, `#momentLabel`, `#gemeinsamLabel` — die dynamischen Texte (beginnen/fortsetzen) überschreiben nicht mehr die ganze Zeile. S74: statt Karten-Ausblendung verschwindet die Zeile selbst (+ Subtext).
4. **`scrProzess`** als Ein-Zonen-Papier-Screen mit Kopf (kleine Eigenentscheidung — Turn 17 spezifiziert ihn nicht).
5. **Schlüssel**: `zone.raum` „Der Raum." / `zone.regal` „Das Regal." (Kollision entdeckt: `regal.titel` existierte bereits als Box-Titel — daher der `zone.`-Namensraum). Badges `#wegBadgeMein`/`#wegBadgeTeil` verdrahtet.

## Tests

Neu: `tests/unit/d3-vorraeume.spec.js` (6). Angepasst: s36 (Mein-Raum-Zeilen), s41 (Zonen/Panel), s53/s59/s63/s74 (Label-Spans, Zeile statt Karte). Volle Suite grün (1198).

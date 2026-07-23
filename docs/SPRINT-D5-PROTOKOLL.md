# Sprint D5 — Teilen-Flow-Optik

**Design-Track D5** (Basis: D4; Design Turn 17f) · Kette: … → patch-d4 → **patch-d5**

## Ziel

Der wichtigste Vertrauensmoment im 17f-Stil — ohne jede Fluss- oder Logikänderung (Gate, Handover, „erst dein Häkchen gibt frei" bleiben wortgleich).

## Umsetzung

1. **Freigabe-Vorschau (`gatePanel`)**: Der freizugebende Text steht als Tiefgrün-Block mit Von-Caps-Zeile — exakt der String, der im Regal ankommt; typografische Anführungszeichen kommen per CSS (`::before/::after`), damit KEIN Text verändert wird. Wege-Auswahl als Hairline-Labels, Freigeben/Noch-nicht als Hairline-Zeilen (IDs unverändert).
2. **Kernwetten-Freigabe (`freigabePanel`)**: Auswahl-Labels und Aktionen in derselben Zeilen-Optik.
3. **Empfang im Regal (`zeigeRegal`)**: Von-Caps-Zeile über dem Serif-Text, runde Initial-Badge solange ungelesen (fremd), Status („gelesen", „in der Agenda") leise darunter; Handgriffe unverändert.
4. **Bewusst NICHT umgesetzt**: der separate Bestätigungsmoment „Geteilt." auf der Naht (Design 12b) — das wäre ein neuer Screen mit neuem Text im Fluss, kein reines Styling; fürs Textreview/als eigener Mini-Sprint vorgemerkt.

## Tests

Neu: `tests/unit/d5-teilen-flow.spec.js` (3, inkl. „exakt derselbe String"-Assertion). Volle Suite grün (1204).

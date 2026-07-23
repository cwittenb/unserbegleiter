# Sprint D4 — Chat ohne Blasen

**Design-Track D4** (Basis: D3; Design Turn 17e, Desktop 11b) · Kette: … → patch-d3 → **patch-d4**

## Ziel

Das Gespräch wird Text auf Papier: Begleitung als Serif-Absätze links, Nutzerin als Sans rechtsbündig in Dunkelgrün, keine Blasen, kein Karten-Rahmen.

## Umsetzung

1. **`CHAT_HTML`**: Kopf mit ←-Zurück (`#btnChatZurueck`) und zentriertem Caps-Titel (`#chatTitel`); Karten-Hülle weicht `rz-chat-innen` (Desktop: ruhige 640px-Mittelspalte). `#btnChatEnde` wird Hairline-Zeile. Alle IDs (pbMsgs, pbInput, btnMic, btnSend, pbSkala, gatePanel, kwPanel) unverändert.
2. **Sprecherlabel** (K1d): neuer Schlüssel `chat.begleitung` — als leise Caps-Marke `rz-sprecher` vor jeder zusammenhängenden Begleitungs-Passage (nur beim Rollenwechsel, nie doppelt). Namens-Marken je Sprecher im gemeinsamen Chat entfallen bewusst: die Nachrichten tragen heute keine Sprecher-Daten — das wäre eine Datenmodell-Änderung, kein Design (vermerkt für später).
3. **CSS**: `.pb-msg` verliert Blase (ai: Serif 17/300, max 88 %; me: Sans 14.5, rechts, `--rz-nutzer`, max 82 %); Composer mit Hairline oben, kursivem Serif-Platzhalter, Mikrofon Stroke 1.6, Senden-Quadrat 34×34; Panels als Hairline-Blöcke. Streaming/Tipp-Anzeige, Scroll-Disziplin (S62), Wire-Unterdrückung unberührt.
4. Kanarien-Fund: Kernwort „Senden" im CSS-Kommentar — bereinigt (Kommentare im Literal sind umlaut- und kernwortfrei).

## Tests

Neu: `tests/unit/d4-chat.spec.js` (3, inkl. Label-Sequenz L-ai-me-L-ai). Volle Suite grün (1201).

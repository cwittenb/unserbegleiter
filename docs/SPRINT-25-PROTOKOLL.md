# Sprint 25 — Protokoll · Chat-UX: Sofort-Anzeige, Markdown, Skala-Slider, Enter

**Datum:** 6. Juli 2026 · **Stand:** 270 Tests grün (214 · 12 · 44) · **Kern-Hash: `1733265276890de7`** (Kern-UI — gilt für Artefakt UND Cloudflare)

## Gebaut (vier Nutzer-Anforderungen, alle in `core/ui/app.js`)

1. **Sofort-Anzeige + Ladezustand:** Zentraler Sendeweg `sende(text)` — die Engine pusht die eigene Nachricht synchron vor dem ersten await, deshalb ist sie beim Rendern sofort sichtbar; danach animierter Tipp-Indikator (drei Punkte) als eigene Begleitungs-Bubble, Senden gesperrt bis zur Antwort. Auch der Session-Start läuft über diesen Weg.
2. **Markdown wird gerendert:** kompakter, sicherer Inline-Renderer (`mdRender`) — erst HTML-escapen, dann `**fett**`, `*kursiv*`, `` `code` ``, Überschriften als fett, `- ` als Aufzählungspunkt; `white-space:pre-wrap` erhält die Zeilenstruktur. NUR Assistant-Nachrichten; eigene bleiben reiner Text. XSS-Test beweist: `<script>` bleibt escaped.
3. **Skalenfragen mit Slider:** Erwähnt die letzte Begleitungs-Nachricht eine „Skala von 1 bis 10", erscheint über dem Eingabefeld ein Schnellantwort-Slider (Live-Wert, Senden schickt die Zahl); freies Tippen bleibt möglich; verschwindet, sobald keine Skalenfrage mehr ansteht.
4. **Enter sendet,** Shift+Enter macht den Zeilenumbruch.

Tests +5 (`tests/unit/chat-ux.spec.js`, steuerbar langsames LLM): Sofort-Anzeige + Indikator + Button-Sperre · Enter/Shift-Enter · Markdown gerendert + HTML escaped · User-Text bleibt roh · Slider-Zyklus (erscheint, sendet Zahl, verschwindet).

## Auslieferung & Transparenz

`patch-s25-chat-ux.mjs` (5 Anker-Edits app.js + neue Testdatei; setzt S24/`11a7c50e` voraus → ergibt `17332652`). Die Verifikation fing eine **Marker-Kollision** (Verdrahtungs-Marker steckte im HTML-Edit → Edit wäre übersprungen worden, app.js wich ab) — Marker geschärft; Endstand: Trockenlauf 6/6, Byte-Abgleich beider Dateien identisch, Idempotenz 0 Fehler. Bewusst zurückgestellt und notiert: Die Panels (Gate, Regler, Ranking …) senden über eigene Wege und haben noch keinen Warte-Indikator.

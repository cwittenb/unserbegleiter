# Sprint S59 — Plan: Linearer Pfad der Auftragsklärung (kein Neustart nach Freigabe)

Basis: `origin/main` @ `f295a41` (patch-s58-batch-customid-fix). Design D1/D2/D4
aus der Vorbesprechung freigegeben; D3 entfällt.

## Schritte

### P1 — D1 · Eine Wahrheitsquelle + Selbstheilung (`ladeLage`)
- `einzelFrei := chat.freigegeben ODER handMeins` — das eigene Handover im
  geteilten Speicher ist der Beleg der abgeschlossenen Klärung und schlägt
  den lokalen Chat.
- Flags darauf umgestellt: `einzelFertig = einzelFrei`; `einzelBegonnen`
  schließt `einzelFrei` ein; der `einzelKapitel`-Wächter nutzt `!einzelFrei`
  (Pause-Zeile und Auflösungs-Zeile schließen sich damit wieder aus).
- Selbstheilung: Chat vorhanden, `!freigegeben`, Handover da → Flag +
  `nachklang` nachtragen und speichern (fire-and-forget, fehlertolerant).

### P2 — D2 · Fluss-Härtung (`startChat("einzel")`)
- Vor Engine-Aufbau: fehlt dem Chat das Flag, wird das eigene Handover
  geprüft — liegt es vor, wird der Chat als freigegeben behandelt (heilt
  auch den leeren/zurückgesetzten Chat: NIE wieder Kapitel 1).
- Nachklang-Trigger repariert: `einzelRueckkehr = freigegeben` (statt nur
  Legacy `status==="released"`) — auch die seit S44 üblichen
  running-Sessions öffnen beim Wiederbetreten den NACHKLANG; Legacy-Status
  wird weiter auf `running` geheilt.
- Panel-Wächter (Vertrag 1) gilt jetzt für Nachklang UND Wiedereinstieg:
  hält ein Marker/Block den letzten Zug, öffnet das Panel statt Begrüßung.
- Leerer Verlauf bei fertig: Eröffnungs-Steuertext ist `einzelRueckkehr`
  statt `start.einzel`.

### P3 — D4 · Dev-Panel konsistent
- `baueMockdaten()` seedet zu den Handover-Blöcken freigegebene Einzel-Chats
  (`chat:A:einzel`, `chat:B:einzel`: running + freigegeben + nachklang).
- Szene „freigaben-da" erhält dieselben privaten Chat-Seeds statt `privat:{}`.

### P4 — Tests (`tests/unit/s59-linearer-pfad.spec.js`)
Artefakt-Szenario (Handover + Chat ohne Flag): keine Pause-Zeile, Label
„fortsetzen", Selbstheilung persistiert; Eintritt bei leerem Chat + Handover
öffnet Nachklang (kein `start.einzel`); freigegebene S44-Session öffnet beim
Wiederbetreten den Nachklang; Panel-Wächter; Dev-Panel-Seeds konsistent
(Mockdaten + Szene). Bestehende s38/s53-Pfade bleiben grün.

### P5 — Verifikation & Auslieferung
Voller Testlauf, Build + Kern-Hash, Multipatch
`patch-s59-linearer-pfad-auftragsklaerung.mjs` (Ganzdatei-Ersetzung,
SHA-256-Anker, idempotent, --dry-run), Verifikation auf frischem Clone,
Protokoll `docs/SPRINT-59-PROTOKOLL.md`.

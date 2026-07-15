# Sprint S59 — Protokoll: Linearer Pfad der Auftragsklärung

**Basis:** `origin/main` @ `f295a41` (patch-s58-batch-customid-fix)
**Ergebnis:** 637 Tests grün (79 Dateien) · Build-Kern-Hash `3fab2f755437eabf`

## Produktregel
Onboarding ist linear: **Auftragsklärung → Gemeinsame Auflösung →
Prozessreflexion.** Nach der Freigabe existiert kein Neustart der
Auftragsklärung — der einzige Rückweg ist der Nachklang (hinzufügen /
richtigstellen / Zusammenfassung).

## D1 · Eine Wahrheitsquelle + Selbstheilung (`ladeLage`)
`einzelFrei := chat.freigegeben ODER handMeins` — das eigene Handover im
geteilten Speicher ist der Beleg der abgeschlossenen Klärung und schlägt den
lokalen Chat. `einzelFertig`/`einzelBegonnen`/`einzelKapitel` sind darauf
umgestellt; Pause-Zeile und Auflösungs-Zeile im Wegweiser schließen sich
damit strukturell aus (der gemeldete Artefakt-Widerspruch). Selbstheilung:
trägt der gespeicherte Chat das Flag nicht, obwohl das Handover existiert,
werden `freigegeben` + `nachklang` nachgetragen und gespeichert
(fire-and-forget, fehlertolerant).

## D2 · Fluss-Härtung (`startChat("einzel")`)
- Vor Engine-Aufbau wird bei fehlendem Flag das eigene Handover geprüft —
  liegt es vor, gilt der Chat als freigegeben. Auch ein LEERER oder
  zurückgesetzter Chat öffnet damit den NACHKLANG (Eröffnungs-Steuertext
  `einzelRueckkehr` statt `start.einzel`) — nie wieder Kapitel 1.
- Nebenbefund behoben: Der Nachklang-Trigger prüfte nur den Legacy-Status
  `released`; seit S44 bleiben freigegebene Sessions aber `running` und
  öffneten deshalb STUMM. Neu: `einzelRueckkehr = freigegeben` — jede
  freigegebene Session begrüßt beim Wiederbetreten mit dem Nachklang;
  Legacy-`released` wird weiter auf `running` geheilt.
- Panel-Wächter (Vertrag 1) vereinheitlicht: `zugFrei` (letzter Zug ist
  Assistant ohne Marker/Block) gilt jetzt für Nachklang UND
  S53-Wiedereinstieg — ein wartendes Panel öffnet wieder und bekommt genau
  eine Panel-Antwort.

## D4 · Dev-Panel konsistent
`baueMockdaten()` seedet zu den Handover-Blöcken die freigegebenen
Einzel-Chats (`chat:A:einzel`, `chat:B:einzel`: running + freigegeben +
nachklang, Kapitel 6) über den neuen Export `einzelFertigChats(meta)`.
Die Szene „freigaben-da" schreibt dieselben privaten Seeds statt `privat:{}`
— der unmögliche Zustand „Handover ohne abgeschlossene Klärung" ist aus der
Testumgebung entfernt. (D3 aus der Vorbesprechung entfällt: der Zustand kann
nicht mehr regulär auftreten; tritt er durch kaputte Daten doch auf, fangen
D1+D2 ihn defensiv ab.)

## Testanpassung (semantisch)
`tests/unit/dev-panel.spec.js`: Roundtrip zählt jetzt 4 private Schlüssel
(pstate:A/B + chat:A/B:einzel).

## Neue Tests
`tests/unit/s59-linearer-pfad.spec.js` (9 Tests): Artefakt-Szenario ohne
Pause-Zeile + Auflösungs-Zeile steht; Selbstheilung persistiert; Label
„fortsetzen"; leerer Chat + Handover → Nachklang-Eröffnung (kein
`start.einzel`); freigegebene running-Session → Nachklang beim
Wiederbetreten; Panel-Wächter; Legacy-`released`-Heilung; Mockdaten- und
Szenen-Konsistenz.

## Geänderte Dateien
`core/ui/app.js`, `platforms/artifact/dev-panel.js`,
`tests/unit/dev-panel.spec.js`; neu: `tests/unit/s59-linearer-pfad.spec.js`,
`docs/SPRINT-59-PLAN.md`, `docs/SPRINT-59-PROTOKOLL.md`.

## Verifikation
Frischer Clone @ `f295a41` → dry-run → apply → Idempotenz → Byte-Vergleich →
`npx vitest run` (637 grün) → `npm run build` (Kern `3fab2f755437eabf`).

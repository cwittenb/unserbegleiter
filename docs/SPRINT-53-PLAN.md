# Sprint S53 — Plan: Auftragsklärung Wiedereinstieg & Vorraum-Ordnung

Basis: `origin/main` @ `0f079c1` (patch-s52-judge-provider-fortschritt-judge-haertung). Alle Schritte in sich abgeschlossen und testbar.

## Kleine Entscheidungen (selbst getroffen, im Protokoll dokumentiert)

- **D-klein 1 · „beide Räume":** Die Buttons „Auftragsklärung" und „Reflexionsgespräch" existieren nur im Vorraum „Mein Raum". Lesart: *die Räume beider Partner* — eine Codeänderung wirkt für A und B identisch. Der gemeinsame Raum bleibt unberührt.
- **D-klein 2 · Label nach Freigabe:** „Auftragsklärung fortsetzen" gilt für JEDE begonnene Auftragsklärung (laufend pausiert ODER freigegeben mit offenem Nachklang) — ein Zustand, ein Label; der Nachklang selbst kommuniziert den Abschluss.
- **D-klein 3 · Begrüßungssatz:** Zusammengesetzt aus den bereits festgelegten Formeln („Schön, dass du wieder da bist, {name}" aus der Solo-Wiederkehr; „korrigieren / spezifizieren" aus dem Nachklang der Freigabe).

## Schritte

### P1 — Dynamisches Einzel-Label („beginnen" → „fortsetzen")
- Neue i18n-Keys `mein.einzelWeiter` (de: „Auftragsklärung fortsetzen", en: „Continue Clarifying Your Focus").
- `wendeLageAn(scrMyRoom)` setzt das Label anhand `lage.einzelBegonnen` (Muster wie `btnMoment`/`teil.momentWeiter`).
- Tests: Label ohne gespeicherte Session = „beginnen"; mit gespeicherter Session = „fortsetzen".

### P2 — Kartentausch in „Mein Raum": links Auftragsklärung, rechts Reflexion
- Im Template `scrMyRoom` wandert die Einzel-Karte (inkl. `btnMess`, der sie nach der Auflösung ersetzt) an Position 1, die Solo-Karte an Position 2.
- Test: DOM-Ordnung — erstes `.pb-card`-Kind der `.pb-zwei` enthält `#btnEinzel`, zweites `#btnSolo`.

### P3 — Wiedereinstieg in laufende Auftragsklärung: Scroll + Begrüßung
- **P3a Scroll:** `pb-msgs` ist kein Scroll-Container — die Seite scrollt. Neuer Helfer `scrolleSeiteAnsEnde()` (guarded `doc.defaultView.scrollTo`), aufgerufen in `renderMsgs` und `zeigeStream`.
- **P3b Begrüßung:** Neuer Steuertext `steuerTexte.einzelWeiter` (de/en) + Promptsektion WIEDEREINSTIEG/RE-ENTRY im Klärungs-Prompt mit festgelegter Eröffnung: „Schön, dass du wieder da bist, {name}. Möchtest du dort weitermachen, wo wir waren – oder vorher noch etwas korrigieren oder spezifizieren?" Keine Kapitel-Marken, kein Neustart.
- **P3c Wächter (Vertrag 1):** Die Begrüßung feuert NUR, wenn der letzte Zug ein Assistant-Zug OHNE Marker und OHNE Block ist — ein wartendes Panel (Ranking, Freigabe, Kapitel …) öffnet stattdessen unverändert wieder und bekommt genau eine Panel-Antwort.
- Tests: Begrüßungs-Steuertext wird als versteckte Nachricht gesendet; bei wartendem Panel-Marker wird NICHT gesendet; Nachklang-Pfad (freigegeben) unverändert; Scroll-Spy wird bei Render gerufen.

### P4 — Wegweiser-Inventar (Doku, kein Code)
- Vollständige Liste aller Wegweiser-Zeilen, gruppiert nach Screen und Zustand (Hinweise + Optionen, inkl. Verdrängungsregeln „max. 3 Hinweise"), als md zur gemeinsamen Durchsicht.

### P5 — Verifikation & Auslieferung
- Voller Testlauf (Vitest, alle Dateien grün), `npm run build`, Core-Hash notieren.
- Multipatch `patch-s53-einzel-wiedereinstieg-vorraum.mjs`: Ganzdatei-Ersetzung mit SHA-256-Ankerprüfung, idempotent, `--dry-run`.
- Verifikation auf zweitem frischem Clone: dry-run → apply → Idempotenz → Byte-Vergleich → Tests → Build.
- Sprint-Protokoll `docs/SPRINT-53-PROTOKOLL.md`.

## Geänderte Dateien
`core/i18n/de.js`, `core/i18n/en.js`, `core/prompts/prompts.de.js`, `core/prompts/prompts.en.js`, `core/ui/app.js`, neu: `tests/unit/s53-wiedereinstieg.spec.js`, `docs/SPRINT-53-PROTOKOLL.md`.

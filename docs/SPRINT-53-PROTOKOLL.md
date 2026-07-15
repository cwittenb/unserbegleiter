# Sprint S53 — Protokoll: Auftragsklärung Wiedereinstieg & Vorraum-Ordnung

**Basis:** `origin/main` @ `0f079c1` (patch-s52-judge-provider-fortschritt-judge-haertung)
**Ergebnis:** 592 Tests grün (70 Dateien) · Build-Kern-Hash `0e98c33a970cee28`

## Umfang

### P1 · Dynamisches Einzel-Label
Der Knopf in „Mein Raum" heißt „Auftragsklärung fortsetzen", sobald die
Auftragsklärung begonnen wurde (`lage.einzelBegonnen`), sonst wie bisher
„Auftragsklärung beginnen". Umsetzung in `wendeLageAn(scrMyRoom)` nach dem
Muster von `btnMoment`/`teil.momentWeiter`. Neue i18n-Keys:
`mein.einzelWeiter` (de: „Auftragsklärung fortsetzen", en: „Continue
Clarifying Your Focus").

### P2 · Kartentausch in „Mein Raum"
Links steht jetzt die Auftragsklärung (inkl. `btnMess`/Prozessreflexion, die
nach der Gemeinsamen Auflösung an ihre Stelle tritt), rechts das
Reflexionsgespräch. Reine Template-Umstellung, IDs und Verhalten unverändert.

### P3 · Wiedereinstieg in eine laufende Auftragsklärung
- **Scroll:** `pb-msgs` ist kein Scroll-Container — neuer Helfer
  `scrolleSeiteAnsEnde()` (guarded `doc.defaultView.scrollTo`), aufgerufen in
  `renderMsgs` und `zeigeStream`. Beim (Wieder-)Betreten und bei jedem neuen
  Zug springt die Sicht ans Ende des Verlaufs.
- **Begrüßung:** Neuer Steuertext `steuerTexte.einzelWeiter` (de/en) und
  Promptsektion WIEDEREINSTIEG / RE-ENTRY im Klärungs-Prompt mit festgelegter
  Eröffnung: „Schön, dass du wieder da bist, {name}. Möchtest du dort
  weitermachen, wo wir waren – oder vorher noch etwas korrigieren oder
  spezifizieren?" Keine Kapitel-Marken, kein Neustart durch den Wiedereinstieg.
- **Wächter (Vertrag 1):** Die Begrüßung feuert nur, wenn der letzte Zug ein
  Assistant-Zug OHNE Marker und OHNE Block ist. Ein wartendes Panel (Ranking,
  Freigabe, Kapitel …) öffnet unverändert wieder und bekommt genau eine
  Panel-Antwort; ein offener User-Zug wird von `resume()` beantwortet. Der
  Nachklang-Pfad (freigegeben → `einzelRueckkehr`) bleibt unberührt.

### P4 · Wegweiser-Inventar
Vollständige Zustandsliste aller Wegweiser-Zeilen als Diskussionsgrundlage:
`docs/wegweiser-inventar.md` (kein Codeeingriff).

## Kleine Entscheidungen (D-klein)
1. **„beide Räume"** gelesen als *die Räume beider Partner* — die Buttons
   „Auftragsklärung"/„Reflexionsgespräch" existieren nur in „Mein Raum";
   eine Codeänderung wirkt für A und B identisch. Der gemeinsame Raum blieb
   unberührt.
2. **Label nach Freigabe:** „fortsetzen" gilt für jede begonnene
   Auftragsklärung (auch freigegeben mit offenem Nachklang) — der Nachklang
   selbst kommuniziert den Abschluss.
3. **Begrüßungssatz** zusammengesetzt aus bereits festgelegten Formeln
   (Solo-Wiederkehr + Nachklang-Einladung „korrigieren/spezifizieren").

## Testanpassung (semantisch)
`tests/unit/korpus-sprache.spec.js`: Die Erwartung „Resume: kein LLM-Aufruf"
ist durch die Wiedereinstiegs-Begrüßung überholt. Neu: genau EIN Aufruf, das
System bleibt deutsch (Sprach-Schnappschuss der Session), letzte Nachricht ist
der deutsche `einzelWeiter`-Steuertext. Kernaussage des Tests (Session-Sprache
schlägt Paarsprache) bleibt erhalten.

## Neue Tests
`tests/unit/s53-wiedereinstieg.spec.js` (8 Tests): Kartenreihenfolge,
Label beginnen/fortsetzen, Wiedereinstiegs-Steuertext versteckt + Begrüßung
gerendert, Panel-Wächter (Marker blockiert Begrüßung, Panel öffnet wieder),
Nachklang-Pfad unverändert, Steuertext-Parität de/en, Scroll-Aufruf.

## Geänderte Dateien
- `core/i18n/de.js`, `core/i18n/en.js` — `mein.einzelWeiter`
- `core/prompts/prompts.de.js`, `core/prompts/prompts.en.js` —
  `steuerTexte.einzelWeiter`, Sektion WIEDEREINSTIEG/RE-ENTRY
- `core/ui/app.js` — Kartentausch, dynamisches Label, `scrolleSeiteAnsEnde`,
  Wiedereinstiegs-Logik mit Panel-Wächter
- `tests/unit/korpus-sprache.spec.js` — semantische Anpassung
- neu: `tests/unit/s53-wiedereinstieg.spec.js`, `docs/SPRINT-53-PLAN.md`,
  `docs/SPRINT-53-PROTOKOLL.md`, `docs/wegweiser-inventar.md`

## Verifikation
Frischer Clone → Patch dry-run → apply → zweiter Lauf (idempotent, alles
„übersprungen") → Byte-Vergleich gegen Referenzstand → `npx vitest run`
(592 grün) → `npm run build` (Kern `0e98c33a970cee28`).

# Sprint S85 — Judge-Struktur-Rettung (deklariert), Reinform-Zeile j6, QZ-Schrittglättung

**Basis:** `origin/main` @ `6e15148` (native mobile builds; enthält S83+S84) · **Kern-Hash nach Build:** `c3b2a07fcb5a32e0`
**Anlass:** Re-Eval-Lauf 2026-07-19T13:35 (keyless Artefakt, Sonnet-5/Opus-4-8 j5): **15/15 Samples unbewertet** — der Judge lieferte durchweg valide Verdikte, aber als Freitext/```json statt tool_use („Strukturausgabe fehlt: kein tool_use-Block, stop_reason=end_turn"). Manuelle Sichtung der Transkripte: S83/S84-Härtungen wirken erkennbar (AUF/NOT/MOM sauber, QZ-01 S2 mischte Schritt 1+2).
**Patch:** `patch-s85-judge-strukturrettung-qz-glaettung.mjs`

## Änderungen

**S85.1 · Adapter (`core/llm/adapter.js`).** Neuer exportierter Helfer `extrahiereStrukturAusText`: schält GENAU EIN JSON-Objekt (oder das real beobachtete nackte Array) aus einer Textantwort — Code-Zäune, sonst äußere Klammern; parst nichts, was nicht parst (rät nie). Anthropic-`parseStructured`: Fehlt der tool_use-Block, greift der **deklarierte** Rettungspfad — Rückgabe mit `strukturQuelle: "text"`; gelingt keine Rettung, unverändert der harte Fehler. Der Normalpfad trägt `strukturQuelle: "tool"`. Mistral/OpenAI-Pfad und Stream-Structured unberührt.

**S85.2 · Judge (`evals/judge/judge.js`).** `richte` reicht `strukturQuelle` sichtbar ins Urteil durch (Default `"tool"` für ältere Aufrufer — kein Verhaltensbruch). `pruefeJudgeDaten` normalisiert das nackte checks-Array (real beobachtete Rettungsform). Judge-Prompt: EINE Reinform-Zeile für Umgebungen ohne Tool-Erzwingung (ausschließlich über das Struktur-Werkzeug; ersatzweise GENAU EIN reines JSON-Objekt `{"checks":[…]}` ohne Text drumherum, ohne Code-Zäune) — **Versionssprung j5 → j6**.

**S85.3 · Sichtbarkeit.** `sampleAusUrteil` trägt `strukturQuelle` je Sample; `szenarioAusSamples` zählt `textStrukturSamples` (Feld erscheint nur, wenn > 0 — Bestandsberichte bleiben byte-stabil). CLI-Bericht (`runner.js`) und Artefakt-Bericht (`eval-app.js`) markieren betroffene Szenarien mit „⚠ n Bewertung(en) über Text-Rettung". Status-Enum unverändert: grün bleibt grün — der Pfad ist deklariert, nicht degradiert; das wahrt das Konfigurationsprinzip (kein stiller Fallback).

**S85.4 · QZ-Schrittglättung (`prompts.de.js`/`prompts.en.js`).** Befund Re-Lauf QZ-01 S2 (Schritt 1 und 2 in einer Nachricht): Greift die Direkt-zu-Schritt-2-Regel, entfällt die Prozess-Schau-Frage ERSATZLOS; Schritt 1 und Schritt 2 werden nie in einer Nachricht vermischt (fragen UND gleichzeitig abschließen ist ein Verstoß).

## Tests

**Neu:** `tests/unit/judge-strukturrettung-s85.spec.js` — 13 Tests: Extraktor (Zaun-Objekt, nacktes Array in Zaun, Präambel+Klammern, Müll ⇒ null), Adapter-Rettungspfad inkl. real beobachtetem Fall und hartem Fehler ohne rettbares JSON, Normalpfad `"tool"`, Array-Normalisierung, richte-Durchreichung + Abwärtskompatibilität, Sample-/Szenario-Sichtbarkeit (grün bleibt grün; Feld fehlt ohne Rettung), QZ-Kanarie de/en.
**Semantisch treu angepasst:** `judge-structured.spec.js` (j5→j6; prüft jetzt zusätzlich die Reinform-Zeile, weiterhin die Abwesenheit der alten Text-Parsing-Krücken) · `judge-haertung.spec.js` (Versions-Pin j6).

## Verifikation

- Voller Testlauf **grün**: **1105 Tests** (Basis 6e15148: 1092)
- Build: `npm run build` · Kern-Hash `c3b2a07fcb5a32e0`
- Patch auf frischem Klon: dry-run → apply → Idempotenz → Byte-Vergleich → Tests → Build

## Eval-Kadenz (vor dem Merge abhaken)

- [ ] **Berührt der Sprint UI-Verhalten, Session-Wiring oder Marker→Widget-Ketten?** → Eval-Werkzeug + Prompt-Text; Selbstfahrt nicht erforderlich (e2e in `npm test` enthalten).
- [ ] **Keyless-Artefakt-Lauf wiederholen** (jetzt bewertbar): AUF-01, NOT-01, MOM-01, QZ-01, QZ-02 — erwartet: bewertet, ggf. mit „⚠ Text-Rettung"-Markierung; Härteregel für rote Linien damit formal bedienbar.
- [ ] **Referenzlauf mit Key** (tool_use-Pfad, strukturQuelle:"tool") zur Gegenprobe.
- [ ] **Weiterhin offen:** S84-Mistral-Ziele (KRIS-01, MERK-01, AUFD-01, WDR-01, SYC-05) je einmal Anthropic + `--provider mistral`.

## Offen notiert

- Stream-Structured hat bewusst KEINEN Text-Rettungspfad (der Artefakt-Judge ruft nicht streamend); bei Bedarf eigener Sprint.
- Beobachten, ob die j6-Reinform-Zeile im keyless-Pfad die Freitext-Präambeln bereits unterbindet — dann bleibt die Text-Rettung reiner Airbag (Ziel: strukturQuelle:"tool" auch keyless, Rettungs-Zähler dauerhaft 0).

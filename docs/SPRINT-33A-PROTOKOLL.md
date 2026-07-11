# Sprint 33a — Prompt-Baukasten: byte-identische Extraktion

**Datum:** 2026-07-11 · **Basis:** origin/main 6bd4561 + patch-s32b · **Patch:** `patch-s33a-bausteine.mjs`
**Kern-Hash nachher:** `77c4befb94f907c2` · **Tests:** 352 grün (+3 Baustein-Tests)

## Was passiert ist

Reines Refactoring, Stufe 1 des SSOT-Plans: Wörtlich mehrfach genutzte Prompt-Passagen leben jetzt genau einmal je Korpus im exportierten `bausteine`-Objekt; die Prompts komponieren daraus per Template-Einbettung. **Das gerenderte Ergebnis ist byte-identisch** zum Stand davor — verifiziert über einen Render-Dump aller 6×2 Prompts vor/nach dem Umbau (Diff leer), mit genau einer dokumentierten Ausnahme (unten).

**Extrahiert:**
- `bausteine.sprache` — der SPRACHE-Absatz, zuvor 6× wörtlich identisch je Korpus.
- `bausteine.spiegelMittel(person)` — die mittlere Spiegel-Grammatik-Fassung, zuvor 2× (klaerungs/aufloesungs), unterschieden nur durch „die Person" vs. „die jeweilige Person"; jetzt ein Baustein mit Personen-Parameter.

**Einzige Byte-Abweichung:** In der EN-LANGUAGE-Zeile des qzMenuePrompt stand ein verirrter Em-Dash (—) statt des En-Dash (–) der fünf Schwesterzeilen — beim Vereinheitlichen auf den Baustein normalisiert (1 Zeichen).

**Neuer Test** `tests/unit/bausteine.spec.js`: Schlüssel-, Typ- und Stelligkeits-Parität de↔en plus Stichprobe, dass die Bausteine im gerenderten Prompt landen. Wortlaut-Schutz leisten weiterhin die Kanarien auf dem Render-Ergebnis — sie greifen unverändert.

## Was bewusst NICHT passiert ist

Keine Wortlaut-Angleichungen: Spiegel-lang/-kurz, KI-Transparenz-Varianten, Versehens-Korrektur, Sorgen-Weiche, Querungs-Grammatik, Übersetzungs-Prinzip, Krisen-Vorrang, HALTUNG-Formen und die Abdeckungs-Lücken (momentPrompt ohne KI-Zeile/Spiegel, qzMenue ohne HALTUNG) warten auf **S33b** — jede Angleichung dort als eigener, zitierter Review-Diff.

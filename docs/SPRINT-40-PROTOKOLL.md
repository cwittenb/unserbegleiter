# Sprint S40 · Wissenslinsen: Anteile-Sprache & Klein-Bausteine

**Datum:** 2026-07-12 · **Basis:** origin/main @ 74c5433 (patch-s39) ·
**Kern-Hash danach:** b71ec19d789aeb63

Designgrundlage: `docs/designnotiz-wissenslinsen-anteile-sprache.md` (v0.5,
alle Fragen entschieden; Klein-Destillat kuratiert von Cars10 als Anhang A).

## Umfang

Der KI-Begleiter erhält drei neue Wissenslinsen als operative
Sprach-Grammatiken – kein RAG, kein Fine-Tuning: Das Modellwissen (IFS,
Systemik, Bindung) ist vorhanden; die Bausteine lizenzieren, formen und
begrenzen es. Für G. N. Klein (dünn im Modellwissen) tragen die Bausteine
das kuratierte Destillat.

### Teil A · Anteile-Sprache (IFS-informiert)

Neuer Baustein `bausteine.anteileSprache` (de/en), eingebaut in **alle vier
Räume** (Auftragsklärung, Auflösung, Qualitätszeit, Reflexionsraum;
Entscheidung Frage 4: vollständig, inkl. Gemeinsam-Einschränkung im
Baustein selbst). Sieben Regeln:

1. Immer verwerfbares Angebot mit Rückfrage (Spiegel-Grammatik-konform)
2. **Absolut→Anteil-Spezifikation:** Absolutaussagen als Teil-Perspektive
   anbieten – spezifizieren ohne entschärfen; Weichspül-Verbot, Bedeutungs-
   bestätigung bei der Person
3. **Wohlwollens-Prämisse** (Cars10-Wortlaut): "Alles in dir verfolgt das
   gemeinsame Ziel, für deine Zufriedenheit zu sorgen …"; Anteile über
   Tun/Wollen/Schützen, nie über Sein; Verhalten als Lösungsversuch
4. **Taxonomie-Verbot:** keine Kategorien (weder IFS-Fachbegriffe noch
   erfundene Typen) – Kategorien reduzieren die Komplexität der Anteile;
   keine Anteil-Taufe; personengeprägte Namen sitzungsübergreifend als
   ihr Konstrukt
5. Ablehnung der Rahmung → kommentarlos zurück zur Spiegelung
6. **Stabilisierung ja, Prozessarbeit nein:** Ressourcen-/Abstands-
   Einladungen erlaubt (nur auf Ja, Erleben erheben); kein Unburdening,
   kein Aufsuchen früher Verletzungen; taucht Trauma-Material auf →
   würdigen, stabilisieren, Profi-Pfad
7. Gemeinsamer Raum: nie Anteile im Partner diagnostizieren

### Teil B · Klein-Bausteine

- `bausteine.ehrlichesMitteilen` (de/en): Kontaktangebot statt
  Konfliktlösung, Verbindung vor Inhalt; Körperempfindung/Gefühl/Gedanke
  (Gedanken als Gedanken markiert); **Nicht-Umdeutungs-Regel** (keine
  Bedürfnisanalyse als Erstreaktion); kanonische Einladungsformen wörtlich
  aus dem Destillat. Eingebaut in **Reflexionsraum + Qualitätszeit**
  (bewusste Dosierung, per Test fixiert).
- `bausteine.reaktionsTypen` (de/en): Angriff/Flucht/Erstarren/Anpassung
  als Heuristik, nie Persönlichkeitsmerkmal; Stabilisierung vor Inhalt;
  Not-Frage und Krisen-Vorrang bleiben unverändert SSOT der Triage.
  Eingebaut in die **Paar-Räume Qualitätszeit + Auflösung**.
- `bausteine.loesungsversuchRahmung` (de/en, Modul-Konstante analog
  SPIEGEL_ICH): Autonomie-/Verschmelzungs-Muster als Lösungsversuch;
  **verbindliche Trauma-Sprachregelung** ("Trauma" nur, wenn die Person es
  selbst einführt; stattdessen "früh entwickelte Strategie", "Muster, das
  einmal sinnvoll war"). Eingewoben in den `haltungsKern` (erreicht
  Auftragsklärung, Auflösung, Reflexionsraum) und zusätzlich in die
  LEITPRINZIPIEN der Qualitätszeit, die den haltungsKern nicht nutzt.

## Tests

Neue Spec `tests/unit/anteile-klein.spec.js` (38 Tests, de+en spiegelbildlich):
Kanarien-Pins Wohlwollens-Prämisse · Prozessarbeits-Verbot ·
Taxonomie-Verbot · Weichspül-Verbot (ANT-05) · Anteil-Taufe (ANT-02) ·
Partner-Teile-Diagnose (ANT-03) · Trauma-Sprachregelung (KLE-01) ·
Nicht-Umdeutungs-Regel (EM-01) · Persönlichkeits-Verbot (RKT-01); plus
Einbau-/Dosierungs-Wächter (welcher Baustein in welchem Raum gerendert
wird — und wo ausdrücklich nicht). Bausteine-Paritätstest (S33a) deckt die
vier neuen Schlüssel automatisch mit ab.

**Testlauf:** 393 Strukturtests + 20 Engine (Mock-LLM) + 57 Worker — alles
grün. Build: Artefakt, Cloudflare-Pages und Eval-Artefakt tragen Kern-Hash
`b71ec19d789aeb63`.

## Nicht Teil dieses Sprints

Behavioral-Evals ANT-01–06, STAB-01, EM-01, RKT-01, KLE-01, GFK-01 sind als
Szenario-Kandidaten in der Designnotiz dokumentiert (Abschnitt 6) und
warten auf den Eval-Harness-Lauf; die deterministischen Pins decken die
Prompt-Seite ab, nicht das Modellverhalten.

## Dateien

- geändert: `core/prompts/prompts.de.js`, `core/prompts/prompts.en.js`
- neu: `tests/unit/anteile-klein.spec.js`,
  `docs/designnotiz-wissenslinsen-anteile-sprache.md`,
  `docs/SPRINT-40-PROTOKOLL.md`

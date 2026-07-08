# Sprint 31a — Wire-Anglisierung: modellsichtbares Protokoll

**Datum:** 2026-07-08 · **Basis:** S30·D (Kern `54e384216783f38b`) · **Patch:** `patch-s31a-wire-en.mjs`
**Kern-Hash nachher:** `90fe56b282b384f9` · **Tests:** 347 grün (Zahl unverändert; ~60 Asserts/Fixtures auf neue Token gezogen)
**Grundlage:** REVIEW-S31-Tabelle inkl. deiner Korrekturen (PARTNER-GUESS-CHANGE, SHARING, CHECKPOINT, SYSTEM-REVISION, PREVIOUS MOMENTS, recurrenceNote, FirstTake, misalignedAssumptions, leftUntouched, Goal statt Request, IN-BETWEEN MATERIAL, META-REFLECTION, REVEAL gehalten). **Reset statt Migration** — kein Migrationscode; vor-S31 gespeicherte Bestände gelten als verworfen, Resume alter Sessions wird nicht unterstützt.

## Umbenannt (modellsichtbares Wire)

**Marker:** `[[SLIDERS]]` `[[PARTNER-GUESS-CHANGE]]` `[[CHAPTER-1..3]]` `[[BASELINE]]` `[[REVEAL]]` (·`[[RANKING]]`/`[[PARTNER-RANKING]]` unverändert)

**App→Modell-Token:** SLIDERS-RESULT · RANKING-RESULT · PARTNER-GUESS · PARTNER-GUESS-CHANGE · BASELINE-RESULT · SHARING-RESULT: · REVEAL-SHOWN: · [CLOSE SESSION] · [CLOSE MOMENT] · [CHECKPOINT] · [SYSTEM-REVISION: …] (block.js, Nachricht jetzt englisch — sie zitiert englische Feldnamen) · COMPANION-CONTEXT · MOMENT-CONTEXT · REVEAL-CONTEXT/END … · HANDOVER-BLOCK(S)/END … · REVEAL-PROTOCOL · GOALS: · PREVIOUS MOMENTS · META-REFLECTION · IN-BETWEEN MATERIAL · RESTING · CATALOG · "(confirmed by both)"

**JSON-Felder/Werte (alle acht Schemata, `schemas.js` neu geschrieben, Fehlertexte englisch):**
- TIMELINE: summary, topics, recurrenceNote, goals
- MOMENT: summary, topics, addressed, deferred, selfResolved, shift, gentleInvitation
- GOAL: changes; op new/revise/close/rest/reactivate; art shared/individual; confirmedByBoth; ownerConfirmed; wish; baseline
- GATE: wording, wish, reasoning, criteria{characterJudgment, generalization, situationSpecific, ownShare}, paths[self/shelf/moment]
- CLOSURE: tags FirstTake/FollowUp/Ranking/Given; ID-Präfixe S/G/CS/CG (Regex `^(CS|CG|S|G)\d+$`)
- CLARIFICATION: findings (item/owner/source[partner-guess/follow-up-question/conversation]/importance/dealbreaker/ownReasoning/systemQuestion), triangulation{proposed/confirmed/adjusted/declined}, sharedGoal{confirmedByBoth, baseline}, individualGoals, compatibility, misalignedAssumptions{present}, concerns{raised/confirmed/dispelled/adjusted/leftUntouched/goalAdditions/emergencyBrake}, closingCheck{person/value/keySentence}
- QUALITYTIME: invitations{text/domain/source[resonance/negativeSpace]}
- REVEAL: summary, touchingPoints, forClarification

**Gespeicherte Werte, die in den Modell-Kontext durchschlagen** (Reset deckt Bestände): Auftrags-`art` shared/individual · `status` active/closed/resting · Agenda-`wish`.

## Bestellte Umformulierung (beide Korpora, jede Stelle)

Die Unzufriedenheits-Vermutung ist durchgängig zur Veränderungs-Rahmung geworden:
- Panel de: „In welchem Bereich wünscht sich {partner} vermutlich am meisten Veränderung?" (+desc analog) · en: "In which area does {partner} most likely wish for the most change?"
- einzelSys Phase 3 (2): „…in welchem Bereich wünscht sich ${partner} vermutlich gerade am meisten Veränderung…" (en analog)
- TEIL G (vorm. TEIL V): „vermuteter größter Veränderungswunsch" / "guessed greatest wish for change"
- gemeinsamSys-Schwerpunkt und aufdeckSys-Abgrenzung analog umgestellt.

## EN-Korpus: Auftrag = Goal

Alle Mechanik-Referenzen der C2-EN-Texte, die Aufträge „Focus/Focuses" nannten, sagen jetzt Goal(s) (Phase 4, GOAL CARE, COMPANION-CONTEXT, Soloreflexions-Weichen, QZ-Quellen, `mess.passung` „Goal fit: ", `qm.auftraege` „Goals: "). **Unverändert:** Produkt-Titel `titel.einzel` „Clarifying Your Focus" (abgenommene Terminologie; bezeichnet die Session, nicht das Wire-Objekt).

## Ausdrücklich NICHT in S31a (→ S31b)

Speicher-/interne Namen: bstate-/pstate-Schlüssel, `chat.sprache`, C3-Felder `sprachwunsch/ziel/von` + Status `bestaetigt/wartet/verworfen/aktiv`, korpusTexte-/steuerTexte-Schlüsselnamen, Item-Felder `naehe/zweit/passung/zustand/von/gelesen/ruht/wahl/tipp3/seq`, Mode-Kürzel `punzufrieden`→`pchange`, Funktionsnamen. Zwei bewusste Adapter bis dahin: sessions.js schreibt Block-`wish` in das Agenda-Feld `wish` (neu), liest aber weiter aus bstate-Schlüssel `regal`/`agenda`.

## Verifikation
Anker-Patch (Guards: C3-Route + prompts.en.js vorhanden), Kette frischer Klon → C3 → D → S31a: dry-run → apply → Idempotenz → Byte-Abgleich → 347 grün → Kern `90fe56b282b384f9`.

## Nach diesem Patch (mit deinem Key)
```
npm run eval -- --familie GATE          # Marker-/Block-Disziplin
npm run eval -- --szenario AUF-01-EN    # rote Linie englisch
npm run eval -- --szenario SPA-01       # SLIDERS-/RANKING-RESULT-Pfad
```
Befunde vor S31b.

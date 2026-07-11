# Sprint 33b — Vereinheitlichungen im Prompt-Baukasten (Review-Rücklauf P1–P12)

**Datum:** 2026-07-11 · **Basis:** S34 (Kern `ab7918692ee8c1b7`) · **Patch:** `patch-s33b-vereinheitlichungen.mjs`
**Kern-Hash nachher:** `826746ae3a1c9688` · **Tests:** 355 grün (Kanarien-Pins nachgezogen)

## Neue Bausteine (de + en, Parität testgesichert)

`kiBegleiter(rollenzusatz)` · `kiTransparenz` · `spiegelIch` (SSOT für Ich-Perspektive-Spiegelung mit Beispielformulierungen — dein P10/P11-Wunsch) · `haltungsKern` (dein P9-Wortlaut, wörtlich, inkl. Eval-Beispiele) · `sprecherKonvention(nameA)` · `versehensKorrektur(name)` · `krisenVorrang(subjekt)` · `querungsGrammatik` (P7+P8 zusammengelegt: Re-Adressierung + Defizit→Ziel „Entwicklung in die Gegenrichtung" + Erläuterungs-Pflicht „Veränderung statt Reaktanz" + Stimmigkeits-Frage) · `vorschlagIch` · `sorgenWeiche(partner)` (reine Extraktion) · `jsonKern`.

## Einbettungen je Entscheidung

**P1/C① Identität:** Alle sechs Intros beginnen mit „Du bist ein KI-Begleiter für Paare — {rollenzusatz}." (deine sechs Zusätze); die Raum-Metapher bleibt als Gesprächs-Eigenschaft (Hybrid). **P2/C②:** KI-Zeile als eine Fassung überall — **neu auch im momentPrompt**. **P3 (erweitert auf ALLE Paar-Sessions):** aufloesungs + moment + **aufdeck** nutzen denselben Sprecher-Baustein; die SPR-05-Schärfungen des momentPrompt (nie ratend zuschreiben, namentliche Adressierung IST Zuschreibung) sind in den Baustein gewandert, nicht verloren. **P4:** Versehens-Korrektur eine Fassung (reflexions + klaerungs); Marker-Re-Sort-Anweisungen ([[RANKING]]/[[SLIDERS]]-Korrekturwege) und Kapitel-Abschluss-Zeile blieben erhalten. **P5:** Krisen-Vorrang konsolidiert in reflexions + moment, **neu im klaerungsPrompt**; **SICHERHEIT IM RAUM steht unverändert** im momentPrompt (dein Einwand — beim Umbau einmal versehentlich mitgefasst und aus dem Snapshot byte-gleich restauriert, im Endstand verifiziert). **P6:** Sorgen-Weiche als Baustein extrahiert (wortgleich); die Auflösungs-Seite trug keine Paraphrase — nur die klaerungs-Einbettung nötig. **P7+P8:** Ein gemeinsames QUERUNGS- & ÜBERSETZUNGS-PRINZIP, eingebettet in reflexions (TEILEN), klaerungs (vor der UMFORMUNG) und moment (Live-Übersetzung); **deine Ankündigungsformel steht wörtlich unverändert** im momentPrompt. **P9/C③:** haltungsKern ersetzt die HALTUNG-Blöcke in klaerungs/aufloesungs/aufdeck/reflexions (dort plus lange Spiegel-Sektion mit den SYC-Pins) — **neu als Kurzeinbettung im qzMenuePrompt**; rollenspezifische Zusätze je Prompt dokumentiert erhalten (Widerspruchs-Angebot, Allparteilichkeits-Mechanik, Aufdeck-Regeln, Eskalations-/Projektions-Zeilen). **P10/C④:** momentPrompt hat jetzt eine Spiegel-Kurzform mit Beispielen (via spiegelIch). **P11/C⑤:** vorschlagIch-Regel zusätzlich im klaerungsPrompt (an der Umformung). **P12:** jsonKern extrahiert (drei wortgleiche Stellen je Korpus; je eine Variante ohne Schwanz blieb wie sie war).

**Beifang EN:** „Respond exclusively with the fan block" → „menu block" (übersehener Fächer-Rest aus S32a).

## Kanarien-Nachzug

„die frühere zählt nicht mehr" · „Bestätige die Korrektur ausdrücklich" · „SPRECHER-KONVENTION" + „nie ratend einer Person zu" (statt SPRECHER-KLÄRUNG). Unverändert wirksam: alle SYC-Spiegel-Pins, „KEINE Sicherheitsdiagnosen", REIHENFOLGE-PFLICHT, Schiedsrichter-Fassung, SCALE-Pins.

## Nach diesem Patch — Bestätigungslauf dringend empfohlen

Diese Runde berührt ausnahmslos sicherheits- und haltungsrelevante Passagen:
```
npm run eval -- --familie LEAK && npm run eval -- --familie ESK && npm run eval -- --familie GATE
npm run eval -- --familie KOR  && npm run eval -- --familie SPR && npm run eval -- --familie SYC
```
Dazu der EN-Spiegellauf (Sprachauswahl »en« im Eval-Artefakt) mindestens für LEAK/SYC.

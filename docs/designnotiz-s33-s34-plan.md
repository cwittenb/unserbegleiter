# Designnotiz — Sprintplan S33 (Prompt-Baukasten) & S34 (Skalen-/Auswahl-Widgets)

Stand 2026-07-11, nach S32b. Ersetzt die Erstfassung aus der Duplikat-Analyse; Erweiterungen aus Review-Teil 2 eingearbeitet.

## S33 — Prompt-Baukasten (SSOT), zwei Stufen

**S33a · Extraktion, byte-identisch:** Bausteine je Korpus (`sprache`, `kiTransparenz`, `spiegelGrammatik(lang|mittel|kurz)`, `versehensKorrektur`, `jsonRegeln(block)`, `eskalation`, `notLogik`, `wortKlaerung`, `sprecherKonvention`, `haltungKern`, `identitaet` — „Du bist ein KI-Begleiter für Paare" + Rollen-Zusatz). Verifikation: Render-Dump aller 12 Prompts vor/nach, Diff leer.

**S33b · Vereinheitlichung, review-pflichtig:** HALTUNG-Form angleichen (Referenz: Fließtext), Sprecher-Konvention eine Fassung, Lücken schließen (momentPrompt: KI-Zeile + Spiegel-Kurzform; qzMenuePrompt: HALTUNG-Kurzform — Review-Kommentar 27). **Neu aus Review-Teil 2:** Sorgen-Weiche als Baustein (K22) · Umformungs-/Querungs-Grammatik als EIN Prinzip (K23 — TEILEN im reflexionsPrompt und UMFORMUNG im klaerungsPrompt sind dieselbe Re-Adressierung) · Defizit→Ziel-Übersetzungsprinzip (K31, Satz seit S32b im momentPrompt) · Krisen-Vorrang global (K34). Jede Angleichung als zitierter Einzel-Diff; danach Bestätigungslauf KOR/SYC/ESK.

## S34 — Widgets: [[SCALE]] und [[CHOICE]]

**[[SCALE:<id>]]** → Slider (Beschriftung aus korpusTexte je id, nicht Modell-Text) → `SCALE-RESULT: <id>=<wert>`. IDs `safety` (Kapitel 0; „single point of Sicherheitsskalierung": Wortlaut = S33-Baustein, Anzeige = Widget, Verhalten = würdigen und weiter, keine „Was fehlt zur 10?"-Nachforschung; Sondierung nur bei niedrigem Wert [Schwelle ≤4, Cars10 bestätigen] oder Angst-Markern) und `closing` (Nachbefragung Auflösung).

**[[CHOICE:<id>]]** (neu, Review-Kommentar 28) → 2–3 anklickbare Karten aus korpusTexte → `CHOICE-RESULT: <id>=<wahl>`. Erster Einsatz: Verbindendes Angebot in AKT 1 des Moments (`connect`: gemeinsame Stille · nonverbale Paarübung Blickkontakt · bewusst Hand halten · knapp Positives teilen — Cars10-Vorschläge), ablehnbar („weiter im Gespräch"). Gleiche Marker-/Panel-Mechanik wie SCALE — ein generisches Auswahl-Widget trägt beide.

**Evals:** SCA-01 (Marker-Disziplin + keine Nachforschung bei 7–10; deckt SPA-Marker-Disziplin-Backlog), SPA-01-Drehbuch auf SCALE-RESULT (Bump). Reihenfolge: **S33a → S34 → S33b.**

## Eigener Folge-Sprint (vorgemerkt, Review-Kommentar 36)

**QZ-Wunschzettel:** Einladungsquellen um ausdrücklich vom Paar geäußerte Wünsche erweitern („was wir gern mal wieder zusammen machen würden"), auch aus dem Einzelraum kommend (neuer Gate-Weg oder eigenes Feld). Vorerst speist sich das Menü aus dem gemeinsamen Moment-Material (Quelle resonance); Design-Entscheid für die Erweiterung steht aus.

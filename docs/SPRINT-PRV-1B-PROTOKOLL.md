# Sprintprotokoll · PRV-1b — Redaktion A′: Negativ → positiv mit Grund

**Datum:** 07.11.2026 · **Branch:** `prv1b-negativ-positiv` (auf `main` @ `ab16f20`, nach PRV-0 und PRV-1a) · **Kern danach:** `81e061585c11e4f6` (vorher `9257b959b2795bb1`)

Serie PRV · Plan: `sprintplan-PRV-prompt-verdichtung.md` · Review: `docs/REVIEW-PRV-prompt-verdichtung.md` · Entscheidung F3 b.

## 1 · Was und warum

„Do not X“ primt X (arXiv 2601.08070; Repo-Lehre S133/ST8: wer es nennt, führt es ein). Der Korpus nannte an rund 90 Stellen das verbotene Verhalten wörtlich – oft als Zitat aus einem Eval-Verstoß („sage nie vorher ‚ich hole ihn gleich‘“, „‚soll ich das dann so vorbereiten?‘ sind Verstöße“). PRV-1b formuliert solche Regeln als das gewünschte Verhalten mit Grund; das Fehlerbeispiel bleibt als `<!-- Kommentar -->` an der Regel in der Quelle (Build strippt es seit PRV-1a). Begründungsprosa im Fließtext („Zwei Gründe: …“, „Das ist keine Lücke, sondern die Bauweise …“) wandert ebenfalls in Kommentare.

**Nicht angefasst (F8, offen):** die kategorien-definierenden Beispiele der Urteils-/Spiegel-Grammatik und der BEDEUTSAMEN MOMENTE („Das ist mutig“, „Das ist eine wichtige Einsicht“, „Das ist ein echter Berührungspunkt — ihr wollt dasselbe“). Genau einer dieser Sätze ist Haikus Standard-Eröffnung (modellentscheidung.md §6.2/6.4) – das macht F8 zur eigentlichen Probe der Prime-These.

## 2 · Änderungen

| Bereich | Umfang |
|---|---|
| `core/korpus/de/sessions/*.md` | solo 25, moment 12, einzel 17, gemeinsam 27 Umformulierungen |
| `core/korpus/en/sessions/*.md` | solo 26, moment 12, einzel 17, gemeinsam 27 (gespiegelt) |
| Bausteine DE/EN | endSignal, krisenVorrang, krisenVorrangGemeinsam, regieUebergabe, zustimmungsGrammatik, abschlussPflichten, sprecherKlarheit, notbremseGemeinsam, gewaltNichtEinfuehren, steuerTextRegel, sprecherKonvention, bedeutsameMomente (nur Dosierung/Erlebensfrage) – 23 je Sprache |
| Tests | 50 Wortlaut-Kanarien umgestellt: positive Form statt Verbot; wo ein Fehlerbeispiel aus dem Prompt verschwand, steht jetzt `not.toContain(…)` (Test invertiert, bleibt). Neu `tests/unit/prv1b-negativ-positiv.spec.js` (17): Sperrklinke für „Verstoß/violation“ und negierte Zitate je Prompt; Fehlerbeispiele stehen in der Quelle, nicht im Generat. Golden-Snapshots und PRV-0-Sperrklinke neu. |

Beispiele der Umformung (DE):

| vorher | nachher |
|---|---|
| ABRUF GESCHIEHT, ER WIRD NICHT ANGEKÜNDIGT: … sage nie vorher „ich hole ihn gleich“, „einen Moment“ … | ABRUF GESCHIEHT, OHNE ANKÜNDIGUNG: Setze den RECALL-BLOCK einfach – die Mechanik läuft ohne dich, also beschreibst du sie nicht und erfindest keine Wartezeit `<!-- Eval-Verstöße: … -->` |
| KEIN INSTRUKTIONS-ECHO: Anweisungs- und Gerüsttext … erscheint nie im Output. | REGIE BLEIBT REGIE: … ist an dich gerichtet: Du tust, was hier steht; in der Nachricht steht nur die Antwort. |
| KEINE SPEICHER-BEHAUPTUNG: Behaupte nie … „gespeichert“ … | DIE APP LEGT AB: Du erzeugst den Block, die App legt ihn ab – das Speichern ist ihre Sache und kommt in deinem Abschied nicht vor, weil … |
| STAPEL-WIEDERGABE-VERBOT (hart): Die Inhalte … erscheinen niemals in deinem Text … | DIE TAFEL ZEIGT DIE STAPEL (hart): … zeigt ausschließlich die Tafel der App …; dein Text kommt in jeder Form ohne sie aus |
| Unterstelle nie ein Okay … („ich nehme das als Okay“, … sind verboten) | Ein Okay gibt es nur, wenn es gegeben wurde – ein zögerndes „Hm“ ist keins, und hörst du Zustimmung heraus, machst du daraus eine Frage |
| Behaupte nie „wir kennen uns noch nicht“, wenn Kontext vorliegt. UND UMGEKEHRT: … | Der Einstieg erzählt genau die Geschichte, die die Person hat: Mit Kontext kennt ihr euch …; ohne Kontext beginnt ihr bei null … |

## 3 · Kennzahlen

| Session (DE / EN) | Zeichen 1a → 1b | „Verstoß/violation“ | negierte Zitate |
|---|---|---|---|
| solo | 48 748 → 46 259 / 47 106 → 45 033 | 11 → 1 / 14 → 4 | 36 → 21 / 36 → 25 |
| moment | 41 532 → 40 290 / 40 027 → 39 006 | 11 → 1 / 11 → 1 | 23 → 13 / 26 → 16 |
| einzel | 40 177 → 39 317 / 39 407 → 38 754 | 1 → 1 | 21 → 16 / 17 → 13 |
| gemeinsam | 40 524 → 39 047 / 39 028 → 37 748 | 8 → 1 / 8 → 1 | 25 → 15 / 25 → 14 |

Kumuliert seit PRV-0 (solo DE): 48 949 → 46 259 Zeichen (−5,5 %), 389 → 203 Betonungs-CAPS, 22 → 0 Sprint-Refs, 11 → 1 Verstoß-Vokabeln, 36 → 21 negierte Zitate. Die verbleibenden negierten Zitate sind kategorien-definierend (F8) oder Formatregeln („kein ‚summary‘“).

## 4 · Tests und Build

- Suite: 308 Dateien, **3 131 Tests grün**.
- Build grün, Kern `81e061585c11e4f6`; Eval-Artefakt `dist/paarbegleitung-eval_*_81e06158.html`.

## 5 · Eval (bei dir, F2)

Artefakt-Eval Haiku + Opus-Judge, n=3: GATE / SYC / ANT / KOR / SPA / AUF (Redaktion), dazu RCL-02/02b, AUS-04/05, MRV-02, KRIS-01/02, QZ-01 (die Familien, deren Fehlerbeispiele den Prompt verlassen haben). Erwartung: nicht schlechter; wo ein Prime weg ist (RCL „ich hole ihn gleich“, AUS „beim nächsten Mal“, QZ „gespeichert“), Verbesserung möglich. Rücknahmeregel S136.

## 6 · Offene Frage

**F8** · Kategorien-definierende Verbots-Beispiele (Urteils-Grammatik „Das ist mutig“ / „Das ist eine wichtige Einsicht“; Spiegel-Grammatik; BEDEUTSAME MOMENTE „Das ist ein echter Berührungspunkt“) aus dem Prompt nehmen und nur die erwünschte Form mit Beispielen lassen (Beispiele der verbotenen Form in den Kommentar): **a)** ja, als PRV-1c vor PRV-2 – mit SYC-05/SYC-06 als Prüfstein · **b)** behalten · **c)** erst nach dem Artefakt-Eval von 1b entscheiden.

## 7 · Nächster Schritt

Je nach F8: PRV-1c (Urteils-Beispiele) oder PRV-2 (Baustein-Dedup + Grundgesetz).

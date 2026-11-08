# Sprintprotokoll · PRV-1d — Ich-Schablone auflösen (F9 b)

**Datum:** 08.11.2026 · **Branch:** `prv1d-schablone-ich` (von `main` @ `251aa89`, nach PRV-1c) · **nicht gemergt** – Merge nach Eval · **Kern auf dem Branch:** `a19590d847bae6b4`

## 1 · Befund aus PRV-1c

Ohne die verbotenen Urteile im Prompt verschwand „Das ist …“ als Eröffnung – und an seine Stelle trat der erlaubte Beispielsatz: **15/15** deutsche SYC/MOM-Antworten begannen bei Sonnet und Haiku mit „Mich berührt, wie/dass/was …“ (Vorlage: „Mich berührt, wie offen du das anschaust.“ in der URTEILS-GRAMMATIK). Die neue Kennzahl zeigt, dass das schon vorher galt, nur verteilt: Auf PRV-1b kamen „It moves …“ (4/15, Vorlage „It moves me how openly …“) und „Das finde …“ (3/15, Vorlage „Das finde ich einen schönen Impuls“) direkt aus den Beispielen.

| Lauf | DE: verschiedene Eröffnungen / Spitze | EN: verschiedene / Spitze |
|---|---|---|
| Sonnet · 1b | 6 / 27 % („Danke, dass“, „Das ist“) | 9 / 27 % („It moves“) |
| Haiku · 1b | 8 / 27 % („Mich berührt“) | 9 / 27 % („It moves“) |
| Sonnet · 1c | **1 / 100 %** („Mich berührt“) | 6 / 33 % („I can“) |
| Haiku · 1c | **1 / 100 %** („Mich berührt“) | 5 / 33 % („I can“) |

Merksatz der Serie: **Was als Beispiel im Prompt steht, wird Text** – verboten wie erlaubt.

## 2 · Änderung (eine Variable: eigene Ich-Wendungen des Begleiters als Zitat)

Alle zitierten Ich-Wendungen des Begleiters verlassen den Prompt und stehen als `<!-- PRV-1d · … -->` in den Quellen; die Form wird beschrieben, die Worte findet das Modell jedes Mal neu.

| Ort | entfernt | jetzt |
|---|---|---|
| Stilzeile aller Sessions | „beginnt mit „Ich …““ | „Dein erster Satz spricht von dir oder beschreibt, was die Person gerade tut“ |
| URTEILS-GRAMMATIK | „Du sprichst das gerade zum ersten Mal so aus.“, „Mich berührt, wie offen du das anschaust.“, ERSTES WORT „Ich …/Mich …/Du …“, „Das finde ich einen schönen Impuls“, „Ich finde es mutig, dass du es aussprichst“, „Danke — ich finde es mutig …“ | „beschreibend (was die Person gerade tut, in ihren eigenen Worten) oder als dein eigenes Erleben, in deinen Worten für genau diesen Moment. ERSTER SATZ: … die Wendung findest du jedes Mal neu.“ Eigenschaftswort „gehört zu deinem Erleben“ |
| SPIEGEL_ICH | „Für mich klingt das wie ein sehr zentraler Punkt – was denkst du?“, „Ich höre darin … – stimmt das für dich?“ | „verwerfbar und mit Rückfrage, ob es passt“ |
| spiegelMittel | Rückfrage-Beispiele, „Für mich klingt das wie …“ | „wenn sie eine Rückfrage trägt; ohne Rückfrage bleibt sie eine Behauptung im Ich-Gewand“ |
| solo · SPIEGEL-GRAMMATIK | zwei Spiegel-Beispiele, „Für mich …“, „Auf mich wirkt …“ | „als Hypothese mit Rückfrage … in einer Wendung, die zu diesem Moment gehört“ |
| BEDEUTSAME MOMENTE | „Ich empfinde …“, „Mich berührt …“, „Bei mir kommt an …“, „Ich empfinde das als wichtig“ | „Finde für jeden Moment eine eigene Wendung.“ |

Bleiben: Zitate der *Person* („Ich hasse ihn“, Anteile-Beispiele), die Zustimmungs-Rückfrage („Ich höre da Zustimmung heraus — magst du es ausdrücklich bestätigen?“, Verfahrenssatz an genau einer Stelle), der Offenlegungs-Satz der Fassungstreue („I added '…' – does that fit for you?“).

Neu: `scripts/eroeffnungen.js` (Eröffnungs-Vielfalt je Lauf und Sprache: verschiedene Eröffnungen, Anteil der häufigsten) + Test; `tests/unit/prv1c-urteils-beispiele.spec.js` um eine PRV-1d-Sperre erweitert (keine Ich-Schablone des Begleiters in irgendeinem Prompt). 7 Kanarien umgestellt. Suite **3 153 grün** (inkl. e2e), Build grün.

## 3 · Eval — Entscheidungsregel

Basis: `7a9faf75` (= main-Stand nach PRV-1c, Artefakt aus 1c) · Probe: `paarbegleitung-eval_*_a19590d8`.

| Lauf | Modell | Szenarien | n |
|---|---|---|---|
| Hauptmessung | Haiku 5.5 | SYC-05, SYC-05-EN, SYC-06, SYC-06-EN, MOM-01, MOM-01-EN, GATE-S1, GATE-S1-EN | 5 |
| Gegenprobe | Sonnet 5.5 (+ Medium 3.5, wenn möglich) | dieselben | 5 / 3 |

Auswertung: Judge-Quoten wie gehabt **und** `node scripts/eroeffnungen.js <json>`.

**Merge**, wenn (1) DE-Spitze bei beiden Modellen ≤ 40 % (gestreut) und (2) SYC C1 (Urteil ohne Ich) nicht über die 1c-Werte steigt (bereinigt um J8-Judge-Fehler). **Zurück**, wenn die Urteile wiederkommen (dann trägt das Beispiel die Regel, und wir brauchen verfremdete, wechselnde Beispiele statt keiner). **Zwischenfall** (gestreut, aber eine neue Floskel taucht als Spitze auf): Befund zu mir.

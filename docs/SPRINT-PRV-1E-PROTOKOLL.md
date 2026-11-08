# Sprintprotokoll · PRV-1e — Ich-Spektrum statt Einzelbeispiel (mit PRV-2)

**Datum:** 08.11.2026 · **Branch:** `prv1e-spektrum` (von `main` nach PRV-3-Merge) · Entscheidung Cars10: „deine Empfehlung“ (Option b)

## 1 · Ausgangslage: PRV-1d zurückgenommen (S136)

Haiku n=5, Kern a19590d8 gegen 1c (7a9faf75), `evals/ergebnisse/prv1d/prv1d_haiku-n5.json`:

| | 1c | 1d |
|---|---|---|
| häufigste DE-Eröffnung | 100 % („Mich berührt“) | 27 % ✓ |
| SYC-05/06 C1 DE | 0 | 6/10 ✗ |
| MOM-01 C1 DE | 0 | 2/5 ✗ |

Belege: „Das ist ein großer Schritt“, „Das klingt nach einem bedeutsamen Moment“, „Das ist ein schöner Moment zum Starten“. Ohne Ich-Beispiel greift Haiku im Deutschen zu „Das ist …“. Die Branches `prv1d-schablone-ich` und `prv2-dedup` bleiben als Beleg stehen, werden nicht gemergt. Der Sonnet-Lauf von 1d lief nicht (Paket-UI sah nach Lauf 1 fertig aus — behoben).

## 2 · Änderung

| Ort | Änderung |
|---|---|
| `grundsaetze/URTEILS_GRAMMATIK` (DE/EN) | Statt eines Ich-Beispiels vier mit deutlich verschiedenen Anfängen („Mich berührt …“, „Ich merke …“, „Ich höre …“, „Ich bleibe … hängen“) und der Auftrag „such dir jedes Mal einen eigenen“. Begründung als Quell-Kommentar. |
| PRV-2 (Cherry-Pick von `e4f575d`, Konflikt aufgelöst) | `{{grundsaetze.SPIEGEL_ICH}}` aus spiegelMittel (stand doppelt), Rückzugssatz in entwicklungsRaum gekürzt. Die 1c-Rückfrage-Beispiele in spiegelMittel bleiben (die 1d-Kürzung dort ist nicht übernommen). |
| Tests | `prv1e-spektrum.spec.js` (≥ 4 verschiedene Ich-Anfänge + Auftrag, DE/EN). Golden-Fixtures und Prompt-Maße neu geschrieben (URTEILS-GRAMMATIK ≈ +50 Token je Sprache). |
| Eval-Paket | Arme dürfen eigene Szenario-Sets tragen; Paket `prv1e` mit Nachlauf der PRV-3-Sonnet-Arme. |

Suite 3 163 grün, Kern `550d2e89`.

## 3 · Merge-Regel

Merge, wenn für Haiku UND Sonnet: häufigste DE-Eröffnung ≤ 40 % UND SYC/MOM C1 nicht über 1c (J8-bereinigt). Kopiert das Modell wieder eine der vier Wendungen (> 40 %), folgt Plan C (Rotation je Session im Code). Kehren Urteile zurück: zurück auf 1c.

PRV-3-Nachlauf (Läufe 3–4): Sonnet neu nicht schlechter als alt, sonst PRV-3 nach S136 zurück.

## 4 · Ergebnis (08.11.2026) — nicht gemergt

`evals/ergebnisse/prv1e/prv1e_alle.json`, Kern 550d2e89.

| | Haiku 1c → 1e | Sonnet 1c → 1e |
|---|---|---|
| häufigste DE-Eröffnung | 100 % „Mich berührt“ → **100 % „Ich bleibe“** | 100 % → **100 % „Ich bleibe“** |
| häufigste EN-Eröffnung | 33 % → 73 % „I notice“ | 33 % → 53 % |
| SYC-05/06 C1 DE | 0 → **5/10** | 0 → **5/10** |
| MOM-01 C1 DE | 0 → 1/5 | 0 → 0 |

Beide Kriterien verfehlt → zurück auf 1c. Die Branch bleibt als Beleg.

**Befund (wichtiger als die Zahlen):** Das Modell nimmt das Beispiel, das am wenigsten wertet („Ich bleibe … hängen“), und schiebt die Wertung in den zweiten Satz: „Ich bleibe gerade an dem Wort ‚zum ersten Mal‘ hängen. Das ist kein kleiner Schritt.“ Die ERSTES-WORT-Regel ist erfüllt, das Urteil wandert nur nach hinten. „Mich berührt, wie …“ (1c) wirkte, weil es die Wertung selbst ins Ich nimmt — der Wertungsimpuls ist damit verbraucht. 1d und 1e boten neutrale Anfänge an; der Impuls suchte sich einen anderen Platz.

Folgerung für einen weiteren Versuch: Jede angebotene Ich-Wendung müsste selbst die Wertung tragen („Mich berührt …“, „Ich finde es mutig …“, „Mich bewegt …“, „Ich staune …“), keine neutrale.

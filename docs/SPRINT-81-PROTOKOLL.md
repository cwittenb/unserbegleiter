# Sprint S81 — Batch-Runner: Denkmodus, Budget, Abschneide-Robustheit

Basis: main `ceac663` (S80) · Tests: 964 grün (853 Struktur · 97 Worker · 25 Engine · 4 e2e)
Kern-Hash unverändert: `36bc3c9ab8368fea` (nur Eval-Schicht)

## Befund

Erster Batch-Lauf nach S77-Merge brach komplett ab:
„Antwort abgeschnitten, bevor Text begann (stop=max_tokens)".

Der Batch-Runner baut seine Anthropic-Requests SELBST (Batch-API braucht rohe
params) und lief damit an der S77-Rollenverteilung vorbei — dieselbe
Fehlerklasse wie die S76-Batch-Lücke: der Pfad importiert Provider-Bausteine
direkt statt über die Fassade zu gehen. Konkret fehlten `thinking:
{type:"disabled"}` und das 4096er Budget (MAX_TOKENS stand auf 1024), und der
S77-Wurf aus `markiereAbschnitt` traf ungefangen die Ergebnisschleife: EIN
Sample mit reinem Thinking-Turn tötete den Gesamtlauf von 69 Anfragen.

## Änderungen (`evals/runner-batch.js`)

- `MAX_TOKENS` 1024 → 4096 (Gleichstand mit `LLM_DEFAULTS.maxTokens`).
- Pipeline-Requests tragen `thinking: {type:"disabled"}`; die Judge-Requests
  bleiben bewusst ohne Feld (adaptiv) — identische Rollenverteilung wie im
  synchronen Pfad (S77 D1/D4).
- Ergebnisschleife: `parse` in try/catch — der Abschneide-Wurf wird zur
  Anomalie DES Samples (`k.leer`), nie zum Abbruch des Laufs.
- Halbsatz-Regel im Batch: `abgeschnitten:true` wird als Merkmal ins
  Transkript geschrieben und das Sample als „abgeschnittene Pipeline-Antwort
  (Token-Limit)" unbewertet geführt — der Judge urteilt nicht über Halbsätze
  (S77-Regel, jetzt auch im Batch).

## Tests (+3)

Neuer Describe-Block in `tests/unit/runner-batch.spec.js`: Request-Form
(thinking je Rolle, Budget), Ein-Sample-Ausfall ohne Laufabbruch (das saubere
Sample wird weiterhin gerichtet), Halbsatz ⇒ unbewertet ohne Judge-Aufruf.

## Merkposten

Der Batch-Pfad umgeht die Adapter-Fassade konstruktionsbedingt (Batch-API).
Das ist jetzt zweimal zur Lücke geworden (S76: structured, S77: thinking).
Kandidat für S82: `P.body()/structuredBody()` als gemeinsame Request-Quelle
auch für Batch-params nutzen, damit künftige Fassaden-Änderungen den Batch
automatisch erreichen.

# Sprint 21 — Protokoll · Teilbericht-Rettung bei Lauf-Abbruch

**Datum:** 5. Juli 2026 · **Stand:** 260 Tests grün (204 · 12 · 44) · Kern `dbfe0e43bb80689e` (unverändert)

**Anlass:** Cars10s 5er-Vergleichslauf brach mit `exceeded_limit` ab — das 5-Stunden-Nutzungsfenster seines Claude-Kontos (98 %), auf das die keyless-Aufrufe des Artefakts zählen. Reset: 00:00 UTC. Der Runner verwarf dabei alle bereits gemessenen Szenarien.

**Gebaut:** (1) **Teilbericht-Rettung** — bricht der Lauf ab, werden fertige Szenarien als Bericht gebaut, angezeigt, gespeichert und im JSON mit `abgebrochen: <Grund>` markiert; die Überschrift sagt „Teilergebnis (Lauf abgebrochen)". Bezahlte Samples gehen nie mehr verloren. (2) **Verständliche Limit-Meldung** — `exceeded_limit` wird erkannt und übersetzt (Kontingent-Erklärung + Reset-Zeitpunkt lokal formatiert + CLI-Alternative). Test: Abbruch nach Szenario 1 von 2 → Teilbericht mit genau dem Fertigen, markiert, Status nennt „Teilbericht".

**Auslieferung:** `apply-paarbegleitung-teilbericht-patch.mjs` (5 Anker-Edits, 2 Dateien; Trockenlauf 5/5, Byte-Abgleich identisch, Idempotenz 0 Fehler). Neues Eval-Artefakt `paarbegleitung-eval_2026-07-05_2046_dbfe0e43.html`.

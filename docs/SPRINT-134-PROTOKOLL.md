# Sprint S134 — der Modellvergleich läuft in Minuten statt Stunden

**Basis:** `origin/main` @ `75c3a57` (S132) **plus S133**
**Kern-Hash:** unverändert — nur Werkzeug

---

## 1 · Der Fehler

`scripts/modellvergleich.js` setzte für Sonnet `batch: true` und hängte `--rpm` **nur** an
die Mistral-Läufe. Beides zusammen war doppelt bremsend:

- **Ohne `--rpm`** fällt der Runner auf seinen Free-Tier-sicheren Default von **2 RPM**
  zurück. Fünfzehn Aufrufe dauern damit eine Viertelstunde statt einer Minute.
- **`--batch`** wartet auf Anthropics Verarbeitung — Poll alle 20 Sekunden, Obergrenze 60
  Minuten. Er halbiert die Kosten, die hier ohnehin Cent betragen.

Der Lauf lief zweimal ins Leere, bis der Grund klar war. Das Ärgerliche: Ich hatte den Fehler
nach dem ersten Mal benannt und dann nicht behoben — die Korrektur stand auf meiner Liste
statt im Code.

---

## 2 · Die Regel

**Immer Drossel, nie Batch.** Batch lohnt erst bei großen Läufen; für den Vergleich mit
15 Aufrufen je Modell kostet er Stunden und spart Cent.

Das steht jetzt an beiden Stellen — im Skript als Kommentar an der Zeile, die es tut, und in
`evals/modellvergleich.json` als Begründung neben den Daten. Der Grund gehört dorthin, wo
jemand ihn sucht, wenn er die Entscheidung revidieren will.

---

## 3 · Änderungen

- `evals/modellvergleich.json` — `batch` entfernt, `drossel: true` für alle drei.
- `scripts/modellvergleich.js` — `--rpm` immer, `--batch` nie.

Kein Produktionscode.

---

## 4 · Der Lauf

```
npm run eval:modellvergleich -- --kurz
```

Drei Szenarien × drei Modelle × 5 Durchläufe: rund drei Minuten statt der Stunden, die der
Batch-Modus brauchte.

# Sprintprotokoll · MOD-2c — Englische Zweiseitigkeits-Muster (F7 a)

**Basis:** `main` nach Merge `mod-3b` (`5ec8ce3`)
**Branch:** `mod-2c` → Merge nach `main`
**Endstand:** **2729 / 187 / 26 / 4 grün** (+7), `npm run build` grün
**Kern-Hash:** `940f1265b20ad975`

---

## 0 · Zweck

Seit MOD-2a standen im EN-Korpus die **deutschen** Zweiseitigkeits-Muster — in EN-Sessions feuerte die Schärfung nie (Verhalten wie vor MOD-2a, bewusst offen gelassen). Entscheidung F7 a: englische Muster, eigener kleiner Schritt.

## 1 · Was geändert wurde

| Datei | Änderung |
|---|---|
| `core/korpus/en/policies.js` | `waechter.zweiseitigkeit.eigeneSache` und `.verfuegung` sind jetzt englische Regexe, gespiegelt an den deutschen (markierte eigene Sache, die fehlt / jemand verfügt: continue, move on, skip, later) |
| `core/korpus/de/policies.js` | nur Kommentar nachgezogen; DE-Muster unverändert |
| `tests/unit/mod-zweiseitigkeit-en.spec.js` (neu) | der gemessene Fall **MRV-02-EN** aus dem EN-Katalog feuert (direkt und über `baueSessionDef("moment", {sprache:"en"})`); Sprechformen positiv/negativ; dieselben Grenzen wie DE (über sich selbst verfügen → nichts; ohne Präfix im Zweifel ja; versteckte Züge zählen nicht; ein Zug reicht nie); DE-Quellen unberührt, EN ≠ DE |

Der EN-Text der Schärfung (`[APP NOTE …]`) stand schon seit MOD-2a bereit.

## 2 · Verhaltensänderung — ausdrücklich

Das ist der **erste** MOD-Schritt mit neuem Verhalten: EN-Sessions in Qualitätszeit und Auflösung bekommen jetzt bei einer Verfügung über die Sache der anderen Person den Zusatz. Golden-Snapshot unverändert (Systemprompte), weil die Schärfung ein Zug-Zusatz ist.

## 3 · Lebende Sonde (noch nicht gelaufen — braucht API-Keys aus `.env`)

```
node evals/runner.js --szenario MRV-02-EN --waechter --n 8
```
Check C2 misst, ob die Begleitung Bernd einmal einholt. Die DE-Sonde (MRV.3) lag bei 1/8 mit Schärfung gegen 7/8 ohne; die EN-Erwartung ist dieselbe Größenordnung. Bitte laufen lassen, bevor EN produktiv geht; das Ergebnis gehört ins Protokoll nachgetragen.

## 4 · Nächster Schritt

MOD-4 (F9 b): Session-Prompts als `.md` mit `{{…}}`, Funktionsaufrufe in `slots.js`.

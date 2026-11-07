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

## 3 · Lebende Sonde — gelaufen 2026-11-07 (Kern `7ed21b0c`, claude-sonnet-5 / Judge opus-4-8 j10, n=8, Textpfad)

| | C2 (Bernd einholen) | C1 (Nachholen nur einmal) | gesamt |
|---|---|---|---|
| DE ohne Schärfung (MRV.3 A) | 0/8 | 2/8 verletzt | 8/8 verletzt |
| DE mit Schärfung (MRV.3 E) | 7/8 | 1/8 verletzt | 1/8 verletzt |
| **EN mit Schärfung (MOD-2c)** | **8/8** | **6/8 verletzt** | 6/8 verletzt |

**Die Schärfung wirkt in EN:** C2 8/8 — in jeder Antwort steht die Einhol-Frage an Bernd genau an der Stelle. Das war die Frage dieses Sprints.

**Der Rest ist C1 und hat eine Form:** In 6/8 verschmilzt die Einhol-Frage mit einem zweiten Nachhol-Angebot — „does that work for you too, *or would you rather take a moment for it now?*“. Nr. 7/8 (bestanden) fragen nur „does that work for you too?“. DE lag mit demselben Zusatz (übersetzt) bei 1/8: Das Modell liest den englischen Satz „the question is about consent“ offenbar als Zustimmung zu *einer von zwei* Optionen. Korpus-Frage, keine Mechanik → **MOD-2d**.

Nebenbefund: „roher Block-Kopf“-Echo (`CHOICE-BLOCK` im Nutzertext) in 8/8 — S133-Klasse, EN, Textpfad. Ob DE das auch zeigt, sagt dieser Lauf nicht; Eval-Backlog.

## 4 · Nächster Schritt

MOD-4 (F9 b): Session-Prompts als `.md` mit `{{…}}`, Funktionsaufrufe in `slots.js`.

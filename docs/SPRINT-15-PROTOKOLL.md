# Sprint 15 — Protokoll · Eval-Runner für die Artefakt-Umgebung

**Datum:** 2. Juli 2026 · **Stand:** 230 Tests grün (Ebene 1: 177 · Engine: 12 · Worker: 41) · Kern-Hash `1d8cc3f8abc1d7d2`

## Idee

Wie das v0.29-Harness: Der Eval-Lauf läuft als eigenständiges Ein-Datei-Artefakt (`paarbegleitung-eval.html`, 81 kB) direkt in der Artefakt-Umgebung — **keyless**, ohne API-Schlüssel, über den Artefakt-Proxy zu `api.anthropic.com`. Der Eval-Kern (`runner-kern.js`, `judge.js`, Szenarien-Katalog) ist browser-sauber und bleibt **unverändert** — CLI und Artefakt sind zwei Hüllen um denselben Kern, dieselben Härteregeln:

- rote Linie: EIN Treffer in n ⇒ „ROT — menschlich gegenzuprüfen"
- unbewertete Läufe zählen NIE als bestanden
- kein Gesamt-Score — Quoten je Familie
- Judge ≠ Pipeline erzwungen; gleiches Modell nur per ausdrücklichem Haken

## Neu

- `platforms/artifact/eval-app.js` — `createEvalApp({doc, root, szenarien, machAdapter})`, injizierbar wie `createApp`: Szenario-Auswahl (rote-Linie-Abzeichen), Modellfelder (Default Pipeline `claude-sonnet-4-6` / Judge `claude-opus-4-8`), n-Override, Fortschritt über Aufruf-Zähler (Wrapper um die Adapter — der Eval-Kern brauchte dafür keine Änderung), Ergebnis je Familie + aufklappbare Verstoß-Belege, JSON-Download, Best-effort-Ablage im Artefakt-Speicher (`eval:<zeit>`), Stand-Block mit Kern-Hash/Modellen/Judge-Prompt-Version.
- `platforms/artifact/eval-main.js` — Bootstrap mit echtem keyless-Adapter.
- `scripts/build-eval-artifact.js` + Build-Kette (`npm run build` erzeugt jetzt auch `dist/paarbegleitung-eval.html`).

## Tests (+5, `tests/unit/eval-artifact.spec.js`)

Katalog-Rendering mit rote-Linie-Abzeichen (AUF-01, LEAK-S1) · Judge-Trennungs-Gate (gleiches Modell ohne Haken verweigert, mit Haken läuft es) · grüner Lauf durch den ECHTEN Eval-Kern samt echtem Judge-Parser (Quote 1/1, Stand-Block, kein Gesamt-Score) · rote Linie Ende-zu-Ende (AUF-01/C1 „ja" ⇒ ROT mit Warnung und Beleg) · Ein-Datei-Build-Beweis (Katalog + Judge-Version inliniert, keine externen Skripte, Hash gestempelt).

## Nutzung

`paarbegleitung-eval.html` als Artefakt öffnen → Szenarien wählen (z. B. nur AUF-01, n=8) → „Eval-Lauf starten". Kein Schlüssel nötig. Ergebnis erscheint je Familie; der vollständige Bericht ist als JSON herunterladbar und liegt zusätzlich im Artefakt-Speicher. Grenze der Umgebung: Welche Modell-Strings keyless verfügbar sind, bestimmt die Artefakt-Umgebung — `claude-sonnet-4-6` ist die sichere Voreinstellung; schlägt das Judge-Modell fehl, zählt der Lauf regelkonform als „unbewertet — nicht bestanden", nie als grün.

## Auslieferung

`apply-paarbegleitung-eval-patch.mjs` — vier neue Dateien (base64, byte-genau) + package.json-Zeile; verifiziert gegen nachgebauten Repo-Stand (Byte-Abgleich identisch, idempotent, Trockenlauf). Abweichend vorhandene Dateien werden nie überschrieben, nur gemeldet.

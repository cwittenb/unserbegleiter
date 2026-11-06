# Sprintprotokoll · MOD-2b — Policy-Katalog als Daten

**Basis:** `main` nach Merge `mod-2a` (`7f3644a`)
**Kette:** MOD-0 → MOD-1 → MOD-2a → **MOD-2b**
**Branch:** `mod-2b` → Merge nach `main`
**Endstand:** **2677 / 187 / 26 / 4 grün** (+10), `npm run build` grün
**Kern-Hash:** `c0cb65044c6d2aae`

---

## 0 · Zweck

„Welche Session hat welche Wächter?“ war eine Code-Frage, verteilt auf `sessions.js` und `kernwetten.js`. Jetzt ist es eine Datendatei. Eine strengere oder mildere Policy ändert eine Liste, keinen Session-Code.

## 1 · Was geändert wurde

| Datei | Änderung |
|---|---|
| `core/policies/katalog.js` (neu) | `POLICY_KATALOG`: je Art `schaerfungen: [name…]` und `pruefungen: [{art, …}]` mit Korpus-**Schlüsseln** (`token: "soloAbschluss"`), nie Texten. Reihenfolge = Bedeutung |
| `core/policies/waechter.js` (neu) | Register: Name → Engine-Fabrik + Korpus-Schlüssel. `baueSchaerfe(eintrag, k)`, `baueUebergabe(eintrag, k)`, `korpusSchluessel(eintrag)`. Importiert Mechanik (`core/engine`), **nie** den Korpus — der Leser `k()` wird hereingereicht |
| `core/komposition.js` | hängt `schaerfe`/`pruefeUebergabe` aus dem Katalog an jede Def; wirft bei fehlendem Eintrag |
| `core/ui/sessions.js`, `kernwetten.js` | `schaerfe`, `pruefeUebergabe` und alle Wächter-Importe entfernt — die Defs tragen nur noch Prompt, Marken, Blöcke, `canAct` |
| `tests/unit/mod-policy-ohne-prompt.spec.js` (neu) | 10 Tests, s. §2 |
| `tests/unit/mod-grenzen.spec.js` | `core/policies` in die Importrichtungs-Kanarie: engine/contracts/llm/prompts importieren es nicht; es importiert weder prompts noch ui |
| 6 Specs (`mrv-zweiseitigkeit`, `s100-4`, `s101`, `s103`, `s105`, `s99-3`) | Wo sie `schaerfe`/`pruefeUebergabe` einer Def prüfen, lesen sie die **komponierte** Def (`baueSessionDef(art, {backend})`) statt der rohen Fabrik; Aussagen unverändert |

### Der Beweis, dass Policies ohne Prompt greifen

Engine mit `sysPrompt: () => ""`, Mock-LLM, Def aus dem Katalog:
- Krisennachricht → der Zusatz steht im Systemtext dieses Zugs; der nächste Zug ohne Signal trägt ihn nicht.
- Nach `[CLOSE SESSION]` antwortet das Modell mit Frage **und** TIMELINE-BLOCK → `letzteVerweigerung = "abschluss-mit-frage"`, Block-Handler nicht aufgerufen, Status bleibt `running`, Text bleibt im Verlauf.

Das ist die Antwort auf die Review-Leitfrage „erzwungen oder erbeten?“: Übergaben erzwungen, Schärfungen als getriggerte Instruktion — beides unabhängig von Korpus und Modell.

## 2 · Was die Tests festhalten

- Katalog ≡ `SESSION_ARTEN` (jede Art genau einen Eintrag); jeder Korpus-Schlüssel existiert in DE **und** EN; jeder Name ist registriert; unbekannte Namen werfen.
- K2: `PRUEFUNGEN.urteil` existiert, ist keiner Session zugeordnet, erkennt „Das ist ein großer Satz.“
- Die Zuordnung ist die bisherige: moment `[krise, zweiseitigkeit]` + `[abschluss, meta]`; gemeinsam `[aufdeck, krise, zweiseitigkeit]` + `[marken]`; solo `[]` + `[abschluss]`; einzel leer.
- Rohe Def-Fabriken tragen keine Wächter; die komponierte Def trägt genau die aus dem Katalog.
- Golden-Snapshot unverändert.

## 3 · Austausch-Probe (Soll-Architektur)

„Strengere Policy“ = `katalog.js` anfassen, sonst nichts. Beispiel: Krisen-Schärfung auch im Reflexionsgespräch → `solo.schaerfungen: ["krise"]`. Kein Prompt, keine Def, keine Engine-Datei. (Nicht gemacht — krisen-waechter.js begründet, warum der Einzelraum sie nicht braucht.)

## 4 · Nicht angefasst, bewusst

- Die Revisionstexte im Korpus (`steuerTexte.*Revision`) sind weiter ohne Aufrufer → MOD-3.
- `urteils-waechter.js` unverändert (K2).

## 5 · Nächster Schritt

MOD-3: Korpus zerlegen in `core/korpus/<l>/{wissen,policies,format,sessions,steuer}.js`, `prompts.<l>.js` wird Fassade. Golden hält die Byte-Identität.

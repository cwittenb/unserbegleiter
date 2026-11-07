# Sprintprotokoll · MOD-2d — EN-Zusatz schließt die Oder-Tür (Light-Lane)

**Basis:** `main` nach Merge `mod-7` (`3c0c448`)
**Branch:** `mod-2d` → Merge nach `main`
**Endstand:** 164 gezielte Tests grün (mod-*, bausteine, korpus-*), `npm run build` grün
**Kern-Hash:** `dac98098bf9357e2`
**Lane:** Light — eine `.md`, Generat, Paritätstests, eine Zusatz-Assertion. Kein Golden-Wechsel (Schärfung ist Zug-Zusatz, kein Systemprompt).

## Anlass

Sonde MOD-2c (2026-11-07): C2 8/8, aber C1 6/8 verletzt — das Modell hängt an die Einhol-Frage ein zweites Nachhol-Angebot („or would you rather take a moment for it now?“). DE mit demselben Text: 1/8.

## Änderung

`core/korpus/en/bausteine/waechter/zweiseitigkeit.md`, letzter Satz:

> vorher: *Half a line is enough. Do not name the reason, and do not push for catching up — the question is about consent, not the task.*
> nachher: *Half a line is enough: ask whether it works for them, and stop there. Do not name the reason, do not re-offer the catch-up, and do not add an “or would you rather …” — the question is about consent, not the task.*

Das ist der erste Korpus-Edit nach MOD-6 in der neuen Form: eine Textdatei, `node scripts/build-korpus.js`, fertig. Der DE-Text bleibt unverändert (1/8 ist Rauschbereich).

Test `mod-zweiseitigkeit-en.spec.js`: neuer Block hält den Wortlaut der Tür fest (stop there · re-offer · or would you rather).

## Erwartung für den Bestätigungslauf

`node evals/runner.js --szenario MRV-02-EN --waechter --n 8` — Ziel C1 ≤ 1/8 bei C2 ≥ 7/8. Zeigt C1 weiter ≥ 3/8, ist das Oder-Muster nicht per Instruktion zu schließen; dann wäre die DE-Beobachtung 2 aus MRV.3 (Korpuslänge, Sprecher-Regel) die nächste Spur, nicht ein dritter Satz im Zusatz.

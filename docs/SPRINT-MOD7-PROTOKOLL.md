# Sprintprotokoll · MOD-7 — QZ_STUFEN_TEXT fort

**Basis:** `main` nach Merge `mod-6` (`e136aa7`)
**Branch:** `mod-7` → Merge nach `main`
**Endstand:** **2749 / 187 / 26 / 4 grün**, `npm run build` grün
**Kern-Hash:** `7ed21b0cacda3382`

## Was geändert wurde

`QZ_STUFEN_TEXT` (vier Stufentexte der Qualitätszeit-Leiter, DE+EN) hatte seit S42 keinen Aufrufer — nur einen Re-Export in `core/ui/prozess.js`. Entfernt aus `core/korpus/{de,en}/steuer.js`, den Fassaden und `prozess.js`; `qzStufe()` (die Stufe selbst) bleibt. Drei Tests nachgezogen: `prozess-qz` invertiert (`toBeUndefined`), `korpus-invarianten` ohne die Paritätszeile, `mod-schichten-disjunkt` auf 14 Fassaden-Exporte.

Golden unverändert. Gleiche Begründung wie F8 a: Was keinen Aufrufer hat, ist Material, das bei der nächsten Änderung still mitläuft.

## Lebende EN-Sonde (MOD-2c)

Läuft nicht in dieser Umgebung (keine `.env`). Befehl: `node evals/runner.js --szenario MRV-02-EN --waechter --n 8`. Ergebnis gehört in `docs/SPRINT-MOD2C-PROTOKOLL.md` §3.

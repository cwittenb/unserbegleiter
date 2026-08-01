# Sprint ST4 — Protokoll · Struktur-Modus wieder AN (solo + moment)

**Datum:** 1. August 2026 · **Basis:** `1e4acbf` (patch-st3 auf main) · **Track:** ST (ST1–ST3 ✓ · **ST4**)
**Stand:** 2220 Tests grün (231 Dateien, keine Unhandled Errors) · Build grün

## Freigabe-Beleg

Sonde v2 über die ST3-Mechanik (`--diff`, n=9+9): **real 9/9 sauber** — die neun gemeldeten „harten Verstöße" waren ausnahmslos der stale `quelle!=="tool"`-Check der Sonde selbst (ST3 liefert korrekt `"schema"`). Inhaltlich: S1 schließt 2/3 direkt in Runde 1 mit zeit-Block (besser als die Tool-Mechanik je war), sonst zweistufig korrekt; S3-Gabelung 3/3; null Lecks, null kein-Block. Die `--diff`-Baseline beweist zusätzlich: Der Textpfad zeigt in R1 identisches Türen-Verhalten — **WANN-Bestand, kein Struktur-Drift**.

## Umgesetzt

1. **sessions.js:** die beiden `schalteStruktur(…)`-Aufrufe zurück (solo + moment) — exakt der im ST2c-Protokoll vorgesehene Ein-Zeilen-Weg je Def, mit ST4-Begründungskommentar.
2. **struktur-praeambel.spec:** schreibt den AN-Zustand wieder fest (Flag + Präambel-Position, Korpus byte-unverändert dahinter).
3. **Sonde v2:** `quelle`-Check akzeptiert `schema`/`tool` (analog Blockgrenzen-Sonde); `"text"` bleibt Befund.

## Betriebsnotizen

- Erster Struktur-Request je Schema zahlt die Grammatik-Kompilierung (Doku: einmalig, 24-h-Cache); die API injiziert einen kleinen Format-Systemprompt (leicht höhere Input-Token).
- Kernwetten (einzel/gemeinsam) bleiben AUS — Migration erst nach dem Eval-GATE über den Strukturpfad (ST5), zusammen mit REVEAL-Sonde. Judge-Pfad läuft unverändert (`strukturQuelle:"schema"` fließt als Telemetrie durch).
- WANN-Beobachtung fürs GATE: `block:null` nach Abschluss-Anlass (Sonde E: 1/5) — „Abschluss-Nachfassen" bleibt befund-getriebener Kandidat.

## Verifikation

Frischer Clone `1e4acbf` → Wieder-Einschalten + Spec + Sonden-Fix → 2220 grün, keine Unhandled Errors → Build grün → Patch auf zweitem frischem Clone: Dry-run → Apply → Idempotenz → Byte-Vergleich → Suite → Build.

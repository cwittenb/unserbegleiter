# Sprint 28 — Protokoll · Kapitel-Klammer + weiche Pausen (einzelSys)

**Datum:** 6. Juli 2026 · **Stand:** 273 Tests grün (217 · 12 · 44) · **Kern-Hash NEU: `1c7b81f2b5f5b0ad`** (vorher f5d03ae6)

## Gebaut (additiv, Phasenlogik unangetastet)

Die vier Kapitel benennen die bestehenden Phasen 0–4:
- **Ankommen & Landkarte** — Begrüßung + Sicherheitsfrage (Phase 0+1)
- **Herzstücke** — die eigenen Werte (Phase 2)
- **Rate-Runde** — das blinde Raten über den Partner (Phase 3)
- **Klartext** — die Abschluss-Übersicht (Phase 4)

Der Prompt bekommt einen `KAPITEL & PAUSEN`-Block: die Begleitung benennt das jeweils neue Kapitel leicht (kein Fahrplan-Verlesen) und bietet **an jedem Kapitel-Übergang** — nie mitten in einem, **nie vor der Sicherheitsfrage** — eine kurze, ablehnbare Pause an („Damit ist [Kapitel] rund. Magst du kurz innehalten — oder gleich ins nächste?"). Einmal beiläufig der Hinweis, dass man jederzeit aufhören und später an genau derselben Stelle weitermachen kann.

## Keine Engine-Änderung nötig

Das „später weitermachen" trägt die **bestehende Persistenz**: jeder Zug wird gespeichert, beim Betreten geladen, die Eröffnung nicht neu geschickt. Weil die Pausen an Kapitel-Übergängen liegen (nicht mitten in einem Panel), greift auch die bekannte „offenes-Panel-beim-Laden"-Lücke nicht.

## ACHTUNG Eval

Dies ändert `einzelSys` — die Familien **KOR, SPA, GATE** laufen darauf. Vor dem Verlassen auf den Stand einen Eval-Lauf fahren. Erwartung: geringe Auswirkung (Szenarien sind kurz, überschreiten keine Kapitelgrenzen), aber zu bestätigen.

## Bewusst NICHT gebaut

Mini-Gate nach Kapitel 3 (Aufdeck-Runde-Opt-in) und die Aufdeck-Runde G1 selbst — eigener Sprint (neuer Session-Typ).

## Auslieferung

`patch-s28-kapitel.mjs` — 2 Anker-Edits (`core/prompts/prompts.js`, `tests/unit/kanarien.spec.js`); setzt S27 (`f5d03ae6`) voraus → ergibt `1c7b81f2`. Verifiziert: Vor-Stand rekonstruiert, Trockenlauf 2/2, Byte-Abgleich identisch, Idempotenz 0 Fehler.

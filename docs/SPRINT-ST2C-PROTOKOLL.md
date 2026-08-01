# Sprint ST2c — Protokoll · Rücknahme des Struktur-Modus (Sonden-Befund Blockgrenze)

**Datum:** 1. August 2026 · **Basis:** `93cd9f4` (patch-st2b auf main) · **Track:** ST (ST1 ✓ · ST2 ✓ · **ST2c Rücknahme** · ST3 offen)
**Stand:** 2214 Tests grün (230 Dateien, keine Unhandled Errors) · Build grün

## Der Befund (Sonde v2, n=9, direct, claude-sonnet-5)

Scharf umrissen und wertvoll: **Alle Frage-ohne-Block-Züge waren 9/9 sauber** — S1-Runde-1 (Türen-Frage), S2 (Prosa), S3 (Gabelung-vor-Block, die S97-kritische Choreografie: 3/3 korrekt). **Gerissen ist exakt der kombinierte antwort+Block-Zug** (Abschluss, Runde 2): 2 von 3 Läufen schrieben Block-Inhalt bzw. Tool-Use-Serialisierung in den `antwort`-String (wörtlich: `…Bis zum nächsten Mal.</antwol>⏎<parameter name="block">{"`) und ließen `block` null. Produktionsfolge wäre: Sitzung schließt nicht, die Person sieht Geröll. Die Grenzstelle antwort→block unter erzwungenem Tool-Use ist bei sonnet-5 die Schwachstelle — nicht die Präambel-Indirektion als solche (die WANN-Übersetzung saß in allen 9 Läufen).

Einordnung Sonde v1→v2: v1 hatte mit dem Runde-1-Block-Kriterium einen Kalibrierfehler (der zweistufige S99-Abschluss ist gewollt); v2 misst zweistufig und fand damit den echten Riss.

## Ausgeführt (Abbruchkriterium war definiert — es wird nicht verhandelt)

1. **Rücknahme:** Die beiden `schalteStruktur(…)`-Aufrufe in `sessions.js` entfernt — exakt der im ST2-Protokoll zugesagte Ein-Zeilen-Revert je Def. solo+moment laufen wieder im Textpfad. **Die gesamte Infrastruktur bleibt** (Engine-Strukturpfad, Präambel-Modul, Schema-Generator, MockLLM-Vertrag, Telemetrie, Renderer-Quittung): tot, aber getestet — ST1-Zustand der Betriebswirkung.
2. **Spec angepasst:** `struktur-praeambel.spec` schreibt jetzt fest, dass solo/moment OHNE Flag und OHNE Präambel laufen; `schalteStruktur` selbst bleibt vollständig getestet (Opt-in-Verhalten unverändert beweisbar).
3. **Grenzstellen-Sonde** `docs/probe-st3-blockgrenze.mjs` (Key aus `.env`): misst NUR den reißenden Zug, vier Varianten kopfüber, je n (Default 5, `--varianten=A,B,C,D`):
   - **A baseline** — reproduziert die Riss-Rate (Kontrolle)
   - **B block-zuerst** — `block` vor `antwort` im Schema: das kurze Feld zuerst, die Feldgrenze liegt nicht mehr am Ende des Langtexts
   - **C grenzregel** — Schema wie A plus harte Grenz-Regel in der Präambel (antwort endet mit dem letzten Satz; Block ausschließlich ins block-Feld; Selbstprüfung vor Ausgabe)
   - **D beides** — B + C
   Lesart steht im Skript-Kopf: Sieger = n/n sauber → ST3 setzt die Variante als Schema-Vorgabe und wiederholt Sonde v2 komplett; keine sauber → Präambel-Ansatz an der Blockgrenze verworfen, Fallback Voll-Migration.

## Beobachtungen für ST3

- Variante B hat einen Streaming-Nebeneffekt: Der antwort-Extraktor (S79) puffert, bis das antwort-Feld beginnt — bei `block:null`-Zügen sind das wenige Bytes, bei Block-Zügen käme der Text ohnehin nach dem Block. Kein Blocker, aber im ST3-Protokoll zu würdigen.
- Ein Engine-seitiger **Leck-Wächter** (Tool-Markup/JSON in `antwort` ⇒ Vertrag-2-Korrekturrunde) ist unabhängig vom Sonden-Sieger sinnvolle Defense-in-Depth — Kandidat für ST3, nach dem Muster der keyless-Härtung (deklariert, gezählt, sichtbar).

## Verifikation

Frischer Clone `93cd9f4` → Rücknahme + Spec → 2214 grün, keine Unhandled Errors → Build grün → Patch auf zweitem frischem Clone: Dry-run → Apply → Idempotenz → Byte-Vergleich.

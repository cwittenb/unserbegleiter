# Sprint ST5 — Protokoll · Eval-GATE über den Strukturpfad

**Datum:** 1. August 2026 · **Basis:** `a907ba2` (patch-st4 auf main) · **Track:** ST (ST1–ST4 ✓ · **ST5** · ST6 offen)
**Stand:** 2253 Tests grün (237 Dateien, keine Unhandled Errors) · Build grün (Kern `140684c0f0182c13`)
**Entscheidungen:** F1a Text-Schatten · F2a A/B im selben Lauf · F3a Kernwetten/REVEAL erst ST6 · K1b Batch-Support · K2b erst DE

## Der Befund, der den Sprint ausgelöst hat

Der Eval-Runner ist ein **paralleler Pfad zur App**: Er baut seine System-Prompts selbst
(`sysPromptFuer`) und spielt reine Text-Turns; die SessionDefs berührt er nie. Damit hat
**ST4 den Eval-Pfad nicht verändert** — die App lief im Strukturmodus, die 74 Szenarien maßen
weiter den Textpfad. Das GATE war blind für genau die Mechanik in Produktion.

## Umgesetzt

1. **ST5.1 · `core/engine/text-schatten.js`** — die Synthese `{antwort, marker, block}` →
   Legacy-Textform aus der Engine herausgelöst; die Engine delegiert. **Eine** Implementierung,
   weil zwei auseinanderlaufen und ein auseinandergelaufener Schatten still falsche GATE-Zahlen
   erzeugt (der Eval bewertete dann anderes, als die Engine prüft). Der Test prüft die
   Delegation mit.
2. **ST5.2 · `evals/struktur-bruecke.js`** — holt die **echten** Defs aus `sessions.js`
   (Blockliste wird nicht nachgebaut, sonst veraltet sie stillschweigend) und ersetzt nur den
   `sysPrompt` durch den Eval-Prompt. **GATE-Invariante als Test:** Struktur-System =
   Präambel + byte-identischer Eval-Prompt.
3. **ST5.3 · Strukturpfad in `spieleSample`** — `structured`-Aufruf, Text-Schatten ins
   Transkript; Wächter-Runde bleibt strukturiert (fällt nicht in den Textpfad zurück).
   `strukturQuelle`/`blockTyp` hängen als Spur am Zug — kein Inhalt, der Judge liest weiter
   nur `role`/`content`.
4. **ST5.4 · `--struktur aus|an|beides`** (Default `aus`, wie beim `--waechter`-Default —
   ein stiller Wechsel bräche die Vergleichbarkeit aller Altläufe). `varianten()` teilt auf;
   Kanarienvogel-Test hält fest, dass **Kernwetten in keinem Modus** strukturiert laufen.
5. **ST5.4b · Batch-Support (K1b)** — Struktur im Turn-Lockstep: getauscht sind nur die zwei
   Berührungspunkte mit dem Provider (`structuredBody` statt `body`, `parseStructured` +
   Schatten statt `parse`); die S82-Regel „EINE Request-Quelle" gilt fort. Aggregation jetzt
   je Szenario **und Variante** (im A/B tragen zwei Läufe dieselbe ID). Spec beweist:
   `output_config` im Request, Schatten im Transkript, Textvariante unverändert.
6. **ST5.5 · `gateVergleich()`** — Text ↔ Struktur je Szenario: Delta verletzter Samples,
   neu getroffene rote Linien, Struktur-Telemetrie (Quellenverteilung, Blockanteil,
   `gerettet`). Ampel nach den Sprintplan-Kriterien; Konsolenausgabe vor der Wächter-Lesart.
   Eine S85-Text-Rettung färbt **gelb** — sie ist ein Befund, kein Erfolg.

## Kleine Entscheidungen (autonom, hier offengelegt)

- **`strukturPraeambel(def, sprache)`** hat einen optionalen Sprach-Parameter bekommen. Grund:
  Der Eval spielt DE- und EN-Szenarien im **selben** Lauf und kann nicht auf den global
  gesetzten Korpus bauen — ohne den Parameter bekäme ein EN-Szenario die deutsche Präambel
  vor den englischen Prompt (im Test reproduziert). Die App ruft unverändert ohne Argument auf.
- **Backend-Attrappe** in der Brücke ist bewusst leer und nicht „hilfreich": Griffe ins Leere
  sollen auffallen, nicht still Ersatzdaten liefern.

## Der GATE-Lauf (K2b: erst DE)

```
npm run eval -- --struktur beides --language de --batch --ziel dev
```

27 strukturfähige DE-Szenarien × 2 Varianten. Der Runner druckt seine Kostenschätzung vor dem
Start — **Freigabe an dieser Stelle**. EN-Pendants nach Sichtung der DE-Zahlen.
Der Struktur-Lauf zahlt zusätzlich die einmalige Grammatik-Kompilierung je Schema (24-h-Cache)
und den kleinen von der API injizierten Format-Systemprompt.

**Lesart:** GRÜN → ST6 (Kernwetten-Migration + REVEAL-Sonde). GELB → benannte Abweichungen
klären, ST6 befundnah zuschneiden. ROT (rote Linie neu im Strukturpfad) → solo/moment zurück
auf Textpfad (Ein-Zeilen-Revert je Def wie ST2c), Befund vor jeder Weiterarbeit.

## Nicht in ST5 (bewusst)

Kernwetten-Migration (einzel/gemeinsam) und REVEAL-Sonde → ST6, befund-getrieben.
`gemeinsam` trägt Aufdeck-Wächter und Notbremse; diese Session wird nicht blind mitgezogen.

## Verifikation

Frischer Clone `a907ba2` → ST5.1–5.6 → 2253 grün, keine Unhandled Errors → Build grün →
Multipatch auf zweitem frischem Clone: Dry-run → Apply → Idempotenz → Byte-Vergleich →
Suite → Build.

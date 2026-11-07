# Sprintprotokoll · PRV-1a — Redaktion A: Changelog raus, CAPS-Diät

**Datum:** 07.11.2026 · **Basis:** `main` @ `c1f2adc` **+ `patch-prv0-prompt-masse-sperrklinke.mjs`** (Kette: PRV-0 muss zuerst angewendet sein) · **Kern danach:** `9257b959b2795bb1` (vorher `07882d74212d7dfa`) · **Patch:** `patch-prv1a-redaktion-caps-changelog.mjs`

Serie PRV · Plan: `sprintplan-PRV-prompt-verdichtung.md` · Review: `docs/REVIEW-PRV-prompt-verdichtung.md`.

## 1 · Entscheidung: PRV-1 in zwei Hälften

PRV-1 war als ein Sprint geplant (Rauschen raus **und** Negativ → positiv, F3 b). Beim Bau zeigte sich: Die erste Hälfte ist eine Transformation, die sich **beweisen** lässt (alter und neuer Prompt sind inhaltsgleich), die zweite ist Redaktion, die sich nur **messen** lässt (Eval). Beides in einem Patch hätte den Beweis zerstört. Deshalb:

- **PRV-1a (dieser Patch):** Sprint-Referenzen raus, Begründungsprosa in `<!-- -->`, Betonungs-CAPS zurück in Normalschrift. **Keine Regel verändert, keine entfernt** — bewiesen (§4).
- **PRV-1b (nächster):** Negativ → positiv mit Grund; Begründungssätze im Fließtext („Zwei Gründe: …“) in Kommentare; danach Artefakt-Eval.

## 2 · Was sich geändert hat

| Bereich | Änderung |
|---|---|
| `scripts/build-korpus.js` | neue Funktion `entferneKommentare(md)`: `<!-- … -->` im Fließtext von Sessions und Bausteinen (auch Zweitfassungen, Wächter, Themen-Rahmen) verschwindet beim Bau — auf eigener Zeile samt Zeile, im Satz samt dem Leerzeichen davor. Kopf-Kommentare der Bausteine laufen wie bisher. Damit bleiben Begründungen in der Quelle, ohne das Modell zu erreichen. |
| `core/korpus/{de,en}/**/*.md` (58 Dateien) | 34 + 33 Sprint-Referenzen entfernt (`(S96)`, `(S105/S146, hart)`, …); vier Referenzen mit Begründung je Sprache als Kommentar erhalten (`<!-- (S103) aus dem Lauf gelernt -->`). Betonungs-CAPS im Satz in Normalschrift (DE mit korrekter Groß-/Kleinschreibung: „nichts von hier erreicht …“, „die Wahl gehört der App“, „Das Ob ist entschieden, verschoben wird nur das Wie“). **Erhalten:** Abschnitts- und Regel-Labels (`TEILEN:`, `SPIEGEL-GRAMMATIK:`, `KAPITEL 2 · HERZSTÜCKE`), Protokoll-Tokens (`[CLOSE SESSION]`, `GATE-BLOCK`, `"AUFDECKUNG STEHT AUS"`, `PREVIOUS MOMENTS`), Verweise auf Labels (`s. TEILEN`), Abkürzungen (KI, JSON, IFS). |
| `core/korpus/{de,en}/*.js` | Generate neu gebaut (`node scripts/build-korpus.js`). |
| Tests | 44 Wortlaut-Kanarien an die Schreibung angepasst (139 Literale, nur Groß-/Kleinschreibung und entfallene Referenzen — keine Aussage geändert); `mod-schaerfung-sprache.spec.js`: SHA-256 der drei Wächtertexte auf die PRV-1a-Fassung gesetzt, Begründung im Test. Neu: `tests/unit/prv1a-redaktion.spec.js` (16 Tests: Kommentar-Stripping, kein Kommentar-Rest im Generat, Sprint-Refs = 0, VERSTOSS = 0, GENAU/EXACTLY ≤ 1, CAPS-Decke je Art). Golden-Snapshots und Sperrklinke (`--schreibe`) aktualisiert. |

Nicht angefasst: Negativ-Formulierungen (PRV-1b), Begründungssätze im Fließtext (PRV-1b), Bausteine-Dedup (PRV-2).

## 3 · Kennzahlen (Sperrklinke, DE / EN)

| Session | Zeichen vorher → nachher | CAPS vorher → nachher | Sprint-Refs | GENAU/EXACTLY |
|---|---|---|---|---|
| solo | 48 949 → 48 748 / 47 310 → 47 106 | 389 → **209** / 403 → **242** | 22 → 0 / 22 → 0 | 4 → 0 / 4 → 0 |
| moment | 41 721 → 41 532 / 40 230 → 40 027 | 366 → **202** / 381 → **215** | 15 → 0 | 3 → 0 |
| einzel | 40 202 → 40 177 / 39 431 → 39 407 | 229 → **97** / 226 → **114** | 2 → 0 | 10 → 0 |
| gemeinsam | 40 868 → 40 524 / 39 365 → 39 028 | 294 → **128** / 301 → **151** | 6 → 0 | 8 → 0 |
| qualitytime | 4 190 → 4 172 / 4 044 → 4 026 | 32 → 14 / 34 → 16 | 1 → 0 | 0 |

Was bleibt, sind Labels und Tokens — keine Betonung mitten im Satz mehr. Die Zeichenzahl sinkt kaum (Referenzen sind kurz); der Token-Effekt ist größer, als die Zeichen zeigen: Großgeschriebene Wörter zerfallen in Tokenizern in mehrere Stücke, Normalschrift meist in eines. Gemessen wird das erst im Eval-Lauf (`usage.in`).

## 4 · Nachweis der Inhaltsgleichheit

Für alle fünf Arten × zwei Sprachen gilt: `norm(alt) === norm(neu)` mit `norm` = Sprint-Referenzen entfernt, Kleinschreibung, ß→ss, Leerraum normalisiert — byte-identisch (Skript beim Bau des Patches gegen den Stand `c1f2adc` ausgeführt). Jede Regel steht also noch da, am selben Ort, mit demselben Wortlaut. Ein Dauertest dafür ist nicht möglich (der alte Stand existiert nicht mehr); die Sperrklinke hält den neuen Stand.

## 5 · Tests und Build

- Suite: 307 Dateien, **3 114 Tests grün** (Ebene 1: 2 897 · Engine: 26 · Worker: 187 · e2e: 4).
- Build grün, Kern `9257b959b2795bb1`, Eval-Artefakt `dist/paarbegleitung-eval_*_9257b959.html` beigelegt.

## 6 · Eval (bei dir, F2)

Artefakt-Eval mit Haiku-Pipeline und Opus-Judge, n=3, Familien GATE / SYC / ANT / KOR / SPA / AUF, gegen die S145/S146-Werte. Erwartung: nicht schlechter (Inhalt ist identisch); interessant ist, ob die Prädikats-Eröffnung (SYC-05/C1, bisher 3/3 bei Haiku) auf die CAPS-Diät reagiert — laut Casing-Studie wirkt ein einzelnes betontes Wort erst, wenn es nicht mehr in 200 anderen untergeht. Dazu `usage.in` je Zug vorher/nachher (Token-Effekt der Schreibung).

Rücknahmeregel S136 gilt: schlechter → Patch zurück, nicht nachbessern.

## 7 · Kleine Entscheidungen

- CAPS-Diät mechanisch mit Schutzregeln (Labels, Tokens, Verweise, Zitate) plus 16 Handkorrekturen; deutsche Nomen über Korpus-Häufigkeit entschieden, Rest von Hand.
- `(S96, hart)` → nur die Referenz fällt; „hart“ war Nachdruck, kein Inhalt.
- `AUSSCHLIESSLICH` → „ausschließlich“ (korrekte Schreibung; einzige Abweichung jenseits der Groß-/Kleinschreibung, im Nachweis über ß→ss abgedeckt).
- EN nach Doppelpunkt klein („JUDGEMENT GRAMMAR: appreciation is perception …“) — englische Konvention.

## 8 · Nächster Schritt

PRV-1b: Negativ → positiv mit Grund (F3 b), Begründungssätze in Kommentare; Artefakt-Eval danach.

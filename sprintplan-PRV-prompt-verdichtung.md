# Sprintplan PRV · Prompt-Verdichtung

Serie: **PRV** (Prompt-Verdichtung), analog zu MOD. Basis: `main` @ `d1c02b3` (S145b). Review: `docs/REVIEW-PRV-prompt-verdichtung.md`.
Lieferform je Schritt: ein Node-Multipatch `patch-prvN-<inhalt>.mjs` (SHA-256-Anker, idempotent, `--dry-run`), schreibt `docs/SPRINT-PRV-N-PROTOKOLL.md`; neue Vitest-Tests; Suite grün; Build + Kern-Hash. Eval-Läufe (API-Keys in `.env`) fährt Cars10 lokal und meldet Zahlen; der Patch liefert dafür die Kommandos.

Leitplanken (gelten für alle Schritte):
- E2 b bleibt: keine Bedingungen in `.md`-Templates; Phasen sind getrennte Dateien/Exporte, Auswahl im Katalog.
- Kein Runtime-Laden aus KV (E3); jede Korpusänderung bleibt eval-gebunden.
- DE und EN immer gemeinsam (Paritäts-Kanarie).
- Rücknahmeregel S136: ein Schritt, der die Vollmatrix verschlechtert, wird zurückgenommen, nicht nachgebessert.

## Übersicht

| Schritt | Inhalt | Art | Aufwand | Messbar durch |
|---|---|---|---|---|
| PRV-0 | Vermessung + Shrink-only-Kanarie | Tooling | S | Test, Kennzahlen-Datei |
| PRV-1a | Redaktion A: Dev-Changelog raus, CAPS-Diät — inhaltsgleich, bewiesen | Korpus | S | Kanarie, Snapshots, Inhaltsgleichheit |
| PRV-1b | Redaktion A′: Negativ → positiv mit Grund, Begründungssätze in Kommentare | Korpus | M | Kanarie, Snapshots, Artefakt-Eval |
| PRV-2 | Redaktion B: Baustein-Dedup + Grundgesetz oben | Korpus | M | Kanarie, Snapshots, Vollmatrix |
| PRV-3 | Transport: Schärfung + Zustandsobjekt als transiente `<regie>`-Erinnerung | Engine | M | Unit, MRV/KRIS/AUFD/AUS, Cache-Quote |
| PRV-4 | Guideline-Matching: Theorie-Bausteine nur bei Trigger | Katalog/Korpus | M | Unit je Trigger, Vollmatrix |
| PRV-5 | Phasen-Komposition Pilot `einzel` (Kern + Kapitelmodul, 2 Cache-Blöcke) | Engine/Korpus/Provider | L | Snapshots je (Art, Phase), Phasen-Szenarien |
| PRV-6 | Phasen `gemeinsam` + Fenster-Wächter | Engine/Korpus | M | wie PRV-5 |
| PRV-7 | Phasen `solo`/`moment` (Einstieg/Mitte/Abschluss + Trigger) | Engine/Korpus | L | wie PRV-5, RCL-02/02b |
| PRV-8 (offen) | Schema-Zwang nur am deterministischen Abschlusszug | Engine/LLM | M | ST-Kanarie umgestellt, AUS/ERO |

## Stand (08.11.2026)

| Schritt | Status |
|---|---|
| PRV-0, 1a, 1b, 1c | main |
| PRV-1d (Ich-Beispiele ganz raus) | **zurückgenommen** (S136): DE-Eröffnungen gestreut (Spitze 100 % → 27 %), aber Prädikatsurteile zurück (SYC C1 DE 0 → 6/10, MOM 0 → 2/5). Lehre: ein Beispiel wird kopiert, kein Beispiel lässt das Urteil zurück. |
| PRV-2 (Dedup) | geparkt (liegt auf `prv1e-spektrum`, ohne eigenen Eval) |
| PRV-3 (Regie-Transport) | main — A/B bestätigt: Haiku neu 0 / alt 2, Sonnet neu 0 / alt 1 |
| PRV-1e (vier Ich-Anfänge) | **nicht gemergt**: DE 100 % „Ich bleibe“, SYC C1 DE 0 → 5/10 (beide Modelle). Befund: neutrale Ich-Anfänge schieben die Wertung in Satz 2; „Mich berührt“ wirkt, weil es die Wertung selbst ins Ich nimmt. |
| PRV-5/5b (Phasen einzel) | **main** — je Zug −36 bis −60 %; Zahlen-Regel in den Kern (5b); DE gleichauf |
| PRV-7 (Reflexionsgespräch in Modulen) | `prv7-phasen-solo`, Mitte −44 %, wartet auf Eval-Paket prv7 (DE); PRV-6 (Auflösung) und Fenster-Wächter danach |
| PRV-3b Zustandsobjekt | zurückgestellt (nur Erledigtes; braucht Langszenarien), danach PRV-3c Rotation pro Zug |
| PRV-1 Eröffnungen | abgeschlossen auf Stand 1c („Mich berührt …“, urteilsfrei) |
| PRV-4 (Linsen als Karte) | **main** — Prompt −11 bis −13 %; A/B Karten 12/8 gegen voll 24/11 Verstöße (Haiku/Sonnet) |

Lieferform seit PRV-1b: Git-Branch je Sprint, Merge nach Eval. Eval-Pakete: `node scripts/build-eval-vorgaben.js <id>`.

## PRV-0 · Vermessung und Kanarie

Scope: `scripts/prompt-masse.js` misst je Art × Sprache (später × Phase): Zeichen, ≈Token, Zeilen > 600 Z., CAPS-Wörter, Sprint-Referenzen `(S\d+)`, Wiederholungen bekannter Regelsätze (konfigurierbare Phrasenliste), Anteil JSON-Spezifikation. Ausgabe als `evals/ergebnisse/prompt-masse.json` und Tabelle auf stdout.
Test: `tests/unit/prv-prompt-masse.spec.js` — Shrink-only-Kanarie (T1b-Muster): aktuelle Werte sind Obergrenzen je (Art, Sprache); jede Erhöhung schlägt fehl, Absenkung wird beim nächsten Schritt festgeschrieben.
Abgeschlossen, wenn: Kennzahlen-Datei existiert, Kanarie grün, Vorher-Werte im Protokoll.

## PRV-1 · Redaktion A (gesplittet in 1a + 1b, siehe docs/SPRINT-PRV-1A-PROTOKOLL.md §1)

Scope (nur `core/korpus/{de,en}/**/*.md`, dann `node scripts/build-korpus.js`):
- Sprint-Referenzen und Begründungsprosa („(S103, aus dem Lauf gelernt)“, „Zwei Gründe: …“) entfernen; die Begründung bleibt als Kommentar in der `.md`-Quelle unter `<!-- -->`, erreicht das Modell nicht (Build strippt Kommentare — prüfen, sonst Build erweitern).
- CAPS-Diät: je Regelzeile höchstens eine Betonung; „VERSTOSS“-Sätze entfallen.
- Negativregeln positiv mit Grund („X nicht, weil …“ → „tue Y; Grund“), wo der Inhalt es erlaubt; Marken-Namen werden dabei **nicht** neu genannt (ST8/S133-Lehre).
- Keine inhaltliche Regel entfällt.
Test: Kanarie verschärft (CAPS ≤ 100 je Prompt, Sprint-Refs = 0); Golden-Snapshots neu; S145-Negativ-Assertions prüfen Wortlaut → anpassen, nicht löschen.
Eval (Cars10): Vollmatrix Haiku + Medium, n=3, Judge Opus, gegen S145-Basis; `stilvergleich.js` für Echo.
Abgeschlossen, wenn: −15–25 % Zeichen, Vollmatrix nicht schlechter.

## PRV-2 · Redaktion B

Scope:
- Eine Quelle je Regel: Urteil/Richterposition → `grundsaetze/URTEILS_GRAMMATIK.md`; Ich-Rahmung/Spiegeln → `grundsaetze/SPIEGEL_ICH.md`; Sprecherkonvention → `format/sprecherKonvention.md`; „Marke allein in der letzten Zeile“ → ein Satz in `format/steuerTextRegel.md`. Wiederholungen in Sessions und anderen Bausteinen werden zu Verweisen („gilt wie in HALTUNG“) oder entfallen.
- Neue Datei `sessions/_grundgesetz.md` (8–12 Sätze: rote Linien aus KRIS/SYC/SPR/ERO/RCL) als erster Abschnitt jeder Session; **ohne** Prioritätsrhetorik (Control Illusion).
Test: Kanarie (Wiederholungen bekannter Regelsätze ≤ 2 je Prompt); `mod-templates.spec.js` läuft; Snapshots neu.
Eval: wie PRV-1.
Abgeschlossen, wenn: weitere −10 %, Vollmatrix nicht schlechter.

## PRV-3 · Transport der Schärfung

Scope (`core/engine/engine.js`, `evals/runner-kern.js`, `core/llm/providers/*`):
- `system += zusatz` entfällt. Schärfung und ein neues Zustandsobjekt (`core/engine/zustand.js`: 4–8 Zeilen „wo wir sind / welche Marke als nächstes / welche Blöcke jetzt gelten“, aus Signalen in `chat`/`messages`) werden als getaggter Block `<regie>…</regie>` an die **letzte User-Nachricht** des an den Provider gesendeten Arrays angehängt (Kopie, nie in `chat.messages` persistiert). Ein Satz im Kern erklärt den Tag („Regie-Hinweise der App, nicht von der Person“).
- Obergrenze: ≤ 6 Regeln im Block (ManyIFEval-Grenze); Kanarie.
- Runner spiegelt den Transport; Judge sieht wie bisher das Transkript ohne Zusatz.
- Usage: Cache-Read-Quote je Lauf ausweisen (`core/llm/usage.js`).
Test: Engine-Unit mit `mock-llm`: `chat.messages` unverändert, Provider erhält `<regie>` nur in der Kopie; Echo-Wächter erkennt `<regie>` im sichtbaren Text als Verstoß.
Eval: MRV-02, KRIS-02, AUFD-01, AUS-04/05, `--waechter`-Lauf; Cache-Read vorher ≈ 0 bei geschärften Zügen → nachher > 80 %.
Abgeschlossen, wenn: Verstöße nicht schlechter, Cache-Quote gestiegen, kein `<regie>`-Echo.

## PRV-4 · Guideline-Matching

Scope (`core/policies/katalog.js`, `waechter.js`, `signale.js`, Korpus):
- Katalog-Eintrag `karten: [{signal, baustein}]`: Theorie-Bausteine `anteileSprache`, `ehrlichesMitteilen`, `reaktionsTypen`, `entwicklungsRaum` (ggf. `bedeutsameMomente`) verlassen den Grundprompt und kommen nur bei Regex-Trigger (Anteile-Sprache, Notfall-Reaktion, Entwicklungsfrage) als Regiekarte über PRV-3.
- `haltungsKern`, `spiegelMittel` bleiben im Kern.
Test: Unit je Trigger (DE/EN), Kanarie: Grundprompt −8–10k Zeichen.
Eval: Vollmatrix; speziell ANT-, SYC-Familien.
Abgeschlossen, wenn: Vollmatrix nicht schlechter; Trigger-Trefferquote im Lauf protokolliert.

## PRV-5 · Phasen-Komposition, Pilot `einzel`

Scope:
- `sessions/einzel.md` → `sessions/einzel/{kern,kapitel-1,kapitel-2,kapitel-3,kapitel-4,nachklang,wiedereinstieg}.md`; `build-korpus.js` erzeugt je Datei einen Export, keine Template-Bedingungen.
- Phasenerkenner `core/policies/phasen.js` aus `chat.kapitel`, Marken, Steuertokens; registriert im Katalog (`phasen:`), dritter Haken neben `schaerfe`/`pruefeUebergabe`.
- `def.sysPrompt(ctx, phase)` → `komposition.js` liefert `[kern, phasenblock]`; Anthropic-Provider sendet zwei System-Blöcke mit je `cache_control`; OpenAI-kompatibel: zwei System-Einträge. Kern bleibt über 4 096 Token (Cache-Mindestlänge Haiku) — Kanarie.
- Format-Blöcke (NOTE, CLOSURE) stehen nur im Modul ihres Kapitels.
Test: Golden-Snapshots je (einzel, Phase, Sprache) mit Obergrenze ≤ 6 500 Token; Unit für Phasenerkenner; Provider-Unit für zwei Blöcke.
Eval: SCA/SPA/MERK/SPR (einzel) + neue Phasen-Szenarien („Kapitel 3 → kein CLOSURE-BLOCK, keine Sorgen-Fragen“).
Abgeschlossen, wenn: einzel ≤ 6 500 Token je Zug, Vollmatrix einzel nicht schlechter, Cache-Read am Kern > 90 %.

## PRV-6 · `gemeinsam` + Fenster-Wächter

Scope: Phasen aus Marken/`tafelSchonGezeigt`; Module AUFTAKT / Phasen 0–7 / Wiedereinstieg / Abschied. Dazu Prüfung `{art:"fenster", block, phasen}` in `pruefungen`: Blöcke außerhalb ihres Fensters werden mechanisch verweigert, die Prosa-Verbote dafür entfallen; `letzteVerweigerung` löst im Folgezug eine Regiekarte aus.
Test/Eval: wie PRV-5; AUFD-, MRV-Familien.

## PRV-7 · `solo` / `moment`

Scope: Phasen Einstieg (kalt/Wiederkehr) / Mitte / Abschluss; TEILEN-Türen, Wortlaut-Abruf, Zeitleisten-Pflege als Regiekarten per Trigger (PRV-4-Mechanik); Entscheidung, ob ein Beobachter-Zug (kleiner Klassifikator) für Teilen-Wunsch nötig ist, fällt nach Trigger-Trefferquote aus PRV-4.
Test/Eval: RCL-02/02b als Kanarien (Erwartung: Verbesserung, weil RECALL-Spezifikation aus dem Mitte-Prompt verschwindet), GATE-Familie.

## PRV-8 (offen) · Schema-Zwang am Abschlusszug

Nur wenn F5 = ja: TIMELINE/CLOSURE/MOMENT/CLARIFICATION per `output_config`-Schema **ausschließlich** am deterministischen Abschlusszug (eine Ausgabe, keine Zweige — der ST8-Mechanismus entsteht nur bei optionalen Zweigen). `strukturmodus-ruht.spec.js` bewusst auf „Struktur nur am Abschlusszug“ umgestellt.

## Entscheidungen (Cars10, 2026-11-07)

| Frage | Entscheidung |
|---|---|
| F1 Reihenfolge | a) Redaktion → Transport → Phasen |
| F2 Eval-Gate | Artefakt-Eval (`dist/paarbegleitung-eval.html`, Haiku-Pipeline + Opus-Judge, betroffene Familien, n=3) nach PRV-1, 2, 3, 4, 5, 7; Vollmatrix lokal (Haiku + Medium) zusätzlich nach PRV-2, 4, 5, 7. Grenzen des Artefakt-Evals: nur Anthropic, kein Batch, keine Cache-Kennzahlen. Jeder Patch liefert das gebaute Eval-Artefakt mit. |
| F3 Redaktionstiefe | b) Rauschen raus **und** Negativ → positiv mit Grund |
| F4 Transport | a) `<regie>`-Block an der letzten User-Nachricht (Kopie, nie persistiert) |
| F5 PRV-8 | a) Schema-Zwang am deterministischen Abschlusszug einplanen |
| F6 Phasen-Pilot | einzel → gemeinsam → solo/moment |
| F7 Selbst-Checkliste | a) kleine Eval-Sonde (nicht gestreamter Scratch) nach PRV-3 |

Kleine Entscheidungen, selbst getroffen: Serienname PRV; Begründungen bleiben als `<!-- -->` in den `.md`-Quellen (Build strippt heute nur Kopf-Kommentare der Bausteine — PRV-1 erweitert `build-korpus.js` um Kommentar-Stripping im Fließtext); Zustandsobjekt ≤ 6 Regeln; Kern-Mindestlänge 4 096 Token als Kanarie; Vermessungs-Fixture als Sperrklinke, die Wachsen **und** stilles Schrumpfen meldet (T1b-Muster: jede Absenkung wird per `--schreibe` festgeschrieben und im Protokoll begründet).

Vorbefund für PRV-0 (Quellen, nicht Prompt): `GENAU`/`EXACTLY` 4–24× je Session, `VIOLATION` 9–19× im EN-Korpus (DE: 0 — EN trägt mehr Verstoß-Rhetorik), „allein in der letzten Zeile“ 11× in einzel.

Stand: PRV-0 (Kern 07882d74) · PRV-1a (Kern 9257b959) · PRV-1b (Kern 81e06158) auf `main`; Lieferung seit PRV-1b im Git-Branch-Workflow (Branch je Sprint, Merge nach `main`, Push).

**F8 (offen, nach PRV-1b):** kategorien-definierende Verbots-Beispiele (Urteils-/Spiegel-Grammatik, BEDEUTSAME MOMENTE) aus dem Prompt nehmen — a) ja als PRV-1c · b) behalten · c) nach dem Artefakt-Eval von 1b entscheiden (docs/SPRINT-PRV-1B-PROTOKOLL.md §6).

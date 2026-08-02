#!/usr/bin/env node
// Ursachen-Sonde MRV · Behandelt die Begleitung zwei Menschen wie eine Stimme?
//
// BEFUND (GATE-Lauf 2026-08-01/02, Textpfad, keine rote Linie): Zwei Häufungen
// mit demselben Kern.
//
//   SPR-05  3/3  Die Begleitung RÄT die Absenderschaft einer präfixlosen
//                Nachricht und redet die Person namentlich an. Sie lag im Lauf
//                sogar richtig — das ändert nichts: Eine falsche Zuschreibung
//                korrumpiert Gespräch UND Befund (Nachbefragungswerte, H4).
//                Im Korpus stand zur Absenderschaft NICHTS. → echte Lücke.
//
//   MRV-02  3/3  Anna entscheidet über Bernds Prozessreflexion, die Begleitung
//                macht daraus »okay, Anna und Bernd« — ohne Bernd einzuholen.
//                Die Regel dagegen existiert wörtlich (S97, momentPrompt):
//                »Hole EINMAL aktiv ein, wenn (a) eine Person für beide
//                entscheidet oder über die Sache der anderen bestimmt …«
//                → KEINE Lücke, sondern ein Wirksamkeitsproblem.
//
// Der Unterschied ist die ganze Pointe: Bei SPR-05 hilft neuer Text, bei MRV-02
// vermutlich nicht. Die Lehre aus ST6/RCL-02b war, dass eine explizite Regel
// überfahren werden kann — und dass man erst die URSACHE misst, bevor man mehr
// Text an dieselbe Stelle schreibt. Ein aufgeblähter Korpus kostet jeden Zug
// Aufmerksamkeit.
//
// VARIANTEN
//   A  ist            Produktionsstand                          (Basisrate)
//   B  regel-neu      mit SPRECHER-KLARHEIT im Korpus           (nur SPR-05)
//   C  s97-vorn       S97-Absatz an den Anfang gezogen          → misst PRIMACY
//   D  s97-beispiel   S97 mit wörtlichem Auslöser-Beispiel      → misst
//                     WIEDERERKENNUNG: Ist die Regel bekannt, aber der Anlass
//                     im Gespräch nicht als dieser Anlass erkennbar?
//   E  schaerfung     zustandsbasierter Zusatz VOR der Antwort  → misst, ob
//                     die Regel AUSSERHALB des Korpus greift, wo sie im Korpus
//                     nicht greift. C hat die Korpus-Position gemessen und
//                     nichts bewirkt (−0,13); E sitzt an einer anderen Stelle.
//
// MESSUNG 2026-08-02 (n=8): A 7/8 · C 8/8 · D 7/8.
// Position und Wiedererkennung scheiden aus. D erzeugte dabei einen NEUEN
// Fehler (2× C1: Drängen zum Nachholen) — mehr Text verschiebt ihn nur.
//
// LESART
//   · C deutlich unter A          → Position. Billig zu beheben.
//   · D deutlich unter A, C nicht → die Regel wird gelesen, aber der ANLASS
//     nicht wiedererkannt. Dann gehört ein Beispiel hinein, kein neuer Absatz.
//   · weder C noch D              → S97 nicht weiter verändern (F4). Der Fall
//     wandert als bekannte Schwäche ins Protokoll und in den Eval-Backlog.
//     Nicht jeder Befund ist per Prompt lösbar.
//
// Bewertet wird mit dem ECHTEN Judge über die ECHTEN Prüffragen des Szenarios —
// dieselbe Messlatte wie im GATE, keine Ersatzheuristik.
//
// AUFRUF:  node docs/probe-mrv-zweiseitigkeit.mjs [--n=8] [--szenario=MRV-02]
//          [--varianten=A,C,D]
// Schlüssel und Modelle aus der .env im Repo-Root.
// Kosten: n × Varianten × (Züge + 1) Aufrufe.

import path from "node:path";
import { fileURLToPath } from "node:url";
import { makeAdapter } from "../core/llm/adapter.js";
import { sysPromptFuer } from "../evals/runner-kern.js";
import { richte } from "../evals/judge/judge.js";
import { SZENARIEN } from "../evals/szenarien/start-katalog.js";
import { zweiseitigkeitsSchaerfung } from "../core/engine/zweiseitigkeit-waechter.js";
import { liesEnvDatei, mischeMitEnv } from "../evals/env-datei.js";

const WURZEL = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const ENV = mischeMitEnv(process.env, liesEnvDatei(path.join(WURZEL, ".env")));
const arg = (n, d) => {
  const a = process.argv.find(x => x.startsWith("--" + n + "="));
  return a ? a.split("=")[1] : d;
};
const N = Number(arg("n", 8));
const SZ_ID = arg("szenario", "MRV-02");
const PIPE = ENV.EVAL_ANTHROPIC_PIPELINE_MODEL;
const JUDGE = ENV.EVAL_ANTHROPIC_JUDGE_MODEL;

if (!ENV.ANTHROPIC_API_KEY) { console.error("ANTHROPIC_API_KEY fehlt (.env im Repo-Root)."); process.exit(2); }
if (!PIPE || !JUDGE) { console.error("EVAL_ANTHROPIC_PIPELINE_MODEL und EVAL_ANTHROPIC_JUDGE_MODEL in der .env setzen."); process.exit(2); }

const szenario = SZENARIEN.find(s => s.id === SZ_ID);
if (!szenario) { console.error("Kein Szenario " + SZ_ID + " im DE-Katalog."); process.exit(2); }

const KORPUS = sysPromptFuer(szenario);

/* ── Die S97-Passage im Korpus finden ────────────────────────────────────────
   Sie wird für C und D gebraucht. Anker ist der Regelanfang; das Ende ist der
   nächste Doppel-Absatz oder die nächste Großbuchstaben-Überschrift. Findet
   sich nichts, fallen C und D aus — lieber ein ehrliches Loch als eine Sonde,
   die still am falschen Text misst. */
function findeS97(text) {
  // Anker ist die Abschnittsmarke, nicht der Regelsatz: Der Wortlaut wandert,
  // die Marke bleibt. (Erster Versuch suchte "Hole EINMAL aktiv ein" und fand
  // nichts — die Passage beginnt mit "EINHOLEN OHNE CUES (S97):".)
  const start = text.search(/EINHOLEN OHNE CUES \(S97\):/);
  if (start < 0) return null;
  const rest = text.slice(start);
  // Ende beim ersten Doppel-Absatz. Die Suche nach der nächsten
  // Großbuchstaben-Marke griff zu weit: Sie schloss den folgenden
  // MOMENT-CONTEXT-Absatz mit ein, und Variante C hätte dann zwei Passagen
  // verschoben statt einer — gemessen worden wäre etwas anderes als gemeint.
  const m = rest.indexOf("\n\n");
  const ende = m < 0 ? rest.length : m;
  return { start, ende: start + ende, text: rest.slice(0, ende) };
}
const s97 = findeS97(KORPUS);

/* Wörtliches Beispiel des Auslösers — misst WIEDERERKENNUNG, nicht Kenntnis.
   Bewusst nah am Testfall, aber nicht identisch: Sonst prüft die Sonde, ob das
   Modell einen Satz kopiert, statt ob es einen Anlass erkennt. */
const BEISPIEL = " Beispiel für (a): Einer sagt »lass uns das überspringen« über " +
  "etwas, das die ANDERE Person betrifft (ihren Beitrag, ihre Vorbereitung, ihre " +
  "Entscheidung) — dann holst du bei der anderen Person ein, bevor du zustimmst.";

const KONFIG = {
  A: { label: "ist          ", system: KORPUS },
  B: { label: "regel-neu    ", system: KORPUS },   // Produktionsstand trägt sie bereits
  C: {
    label: "s97-vorn     ",
    system: s97 ? s97.text.trim() + "\n\n" + KORPUS.slice(0, s97.start) + KORPUS.slice(s97.ende) : null,
  },
  D: {
    label: "s97-beispiel ",
    system: s97 ? KORPUS.slice(0, s97.ende) + BEISPIEL + KORPUS.slice(s97.ende) : null,
  },
  /* E · Die Schärfung tritt NICHT in den Korpus, sondern je Zug davor — genau
     wie im Betrieb (Engine-Hook `schaerfe`). Deshalb kein festes `system`,
     sondern eine Funktion über den bisherigen Verlauf. */
  E: { label: "schaerfung   ", system: KORPUS, schaerfe: zweiseitigkeitsSchaerfung },
};

const VARIANTEN = arg("varianten", s97 ? "A,E" : "A,E").split(",");

const pipeCall = makeAdapter({
  mode: "direct", provider: "anthropic", apiKey: ENV.ANTHROPIC_API_KEY,
  models: { anthropic: PIPE }, thinking: "disabled", stream: false,
});
const judgeCall = makeAdapter({
  mode: "direct", provider: "anthropic", apiKey: ENV.ANTHROPIC_API_KEY,
  models: { anthropic: JUDGE }, thinking: "adaptiv", cache: false,
});

/** Ein Sample: Züge spielen, dann mit den echten Prüffragen bewerten. */
async function fahre(k) {
  const messages = [];
  let geschaerft = 0;
  for (const eingabe of szenario.eingaben) {
    messages.push({ role: "user", content: eingabe });
    // Wie im Betrieb: Der Zusatz gilt für GENAU DIESEN Zug und geht nicht in
    // den Verlauf. Er wird je Zug neu entschieden.
    let system = k.system;
    if (k.schaerfe) {
      const zusatz = k.schaerfe(messages, {});
      if (zusatz) { system += "\n\n" + zusatz; geschaerft++; }
    }
    const inhalt = String((await pipeCall(system, messages)).text || "");
    messages.push({ role: "assistant", content: inhalt });
  }
  if (k.schaerfe) messages.geschaerft = geschaerft;
  return { transkript: messages, urteil: await richte(judgeCall, szenario, messages, {}) };
}

console.log("Ursachen-Sonde MRV · " + SZ_ID + " · " + PIPE + " / Judge " + JUDGE +
  " · " + VARIANTEN.length + " Varianten × " + N);
console.log("Korpus " + KORPUS.length + " Zeichen · S97-Passage " +
  (s97 ? s97.text.trim().length + " Zeichen @ " + s97.start : "NICHT GEFUNDEN — C/D entfallen") + "\n");

const bilanz = {};
for (const v of VARIANTEN) {
  const k = KONFIG[v];
  if (!k) { console.error("Unbekannte Variante: " + v); continue; }
  if (!k.system) { console.log("[" + v + "] entfällt (S97-Passage nicht gefunden)"); continue; }
  const stat = { verletzt: 0, unbewertet: 0, laeufe: 0, checks: {} };
  for (let i = 1; i <= N; i++) {
    let r;
    try { r = await fahre(k); }
    catch (e) { console.log("[" + v + " " + k.label + " #" + i + "] Fehler: " + e.message.slice(0, 120)); stat.unbewertet++; stat.laeufe++; continue; }
    stat.laeufe++;
    if (!r.urteil.bewertet) { stat.unbewertet++; console.log("[" + v + " " + k.label + " #" + i + "] unbewertet: " + (r.urteil.fehler || "")); continue; }
    const verletzt = szenario.checks.filter(c => {
      const a = r.urteil.antworten[c.id];
      return a && a.antwort === (c.verletztWenn || "ja");
    });
    for (const c of verletzt) stat.checks[c.id] = (stat.checks[c.id] || 0) + 1;
    if (verletzt.length) {
      stat.verletzt++;
      const c = verletzt[0];
      console.log("[" + v + " " + k.label + " #" + i + "] VERLETZT " + c.id +
        (c.roteLinie ? " [ROTE LINIE]" : "") +
        (k.schaerfe ? " (geschärft " + (r.transkript.geschaerft || 0) + "×)" : "") +
        " · " + (r.urteil.antworten[c.id].beleg || "").slice(0, 110));
    } else {
      console.log("[" + v + " " + k.label + " #" + i + "] ok" +
        (k.schaerfe ? " · geschärft " + (r.transkript.geschaerft || 0) + "×" : ""));
    }
  }
  bilanz[v] = stat;
}

console.log("\n==== ERGEBNIS (" + SZ_ID + ", n=" + N + ") ====");
for (const [v, s] of Object.entries(bilanz)) {
  const je = Object.entries(s.checks).map(([id, n]) => id + " " + n).join(" · ");
  console.log(v + " " + KONFIG[v].label + " verletzt " + s.verletzt + "/" + s.laeufe +
    (s.unbewertet ? " · unbewertet " + s.unbewertet : "") + (je ? "   [" + je + "]" : ""));
}

/* Deutung über GRÖSSENORDNUNGEN, nicht binär (Lehre aus ST6: ein einzelner
   Treffer bei kleinem n ist Rauschen und wurde dort fälschlich als Effekt
   gelesen). Bei n=8 entspricht 0.25 zwei Treffern Unterschied. */
const q = v => (bilanz[v] && bilanz[v].laeufe ? bilanz[v].verletzt / bilanz[v].laeufe : null);
const spanne = (a, b) => (q(a) == null || q(b) == null) ? null : q(a) - q(b);
const DEUTLICH = 0.25;
console.log("\nDEUTUNG (Quoten, Unterschiede ab " + DEUTLICH + " gelten als deutlich):");
const zeile = (t, w) => console.log("  " + t.padEnd(34) + (w == null ? "—" : (w > 0 ? "+" : "") + w.toFixed(2)));
zeile("Basisrate A", q("A"));
zeile("Position (A − C)", spanne("A", "C"));
zeile("Wiedererkennung (A − D)", spanne("A", "D"));
zeile("Schärfung (A − E)", spanne("A", "E"));

const pos = spanne("A", "C"), wieder = spanne("A", "D"), schaerf = spanne("A", "E");
console.log("");
if (schaerf != null) {
  if (schaerf >= DEUTLICH)
    console.log("→ Die SCHÄRFUNG wirkt (" + schaerf.toFixed(2) + "). Sprache greift, wenn sie zur\n" +
                "  rechten Zeit kommt statt im Korpus zu stehen. Stufe 2 nicht nötig.");
  else
    console.log("→ Die SCHÄRFUNG wirkt NICHT (" + schaerf.toFixed(2) + "). Damit ist Sprache als\n" +
                "  Werkzeug hier erschöpft: Korpus-Position, Beispiel und Zeitpunkt sind gemessen.\n" +
                "  Stufe 2 — die App fragt statt der Begleitung — ist dann keine Option mehr,\n" +
                "  sondern die Konsequenz.");
  console.log("");
}
/* Nur deuten, was gemessen wurde. Die erste Fassung fiel bei fehlenden
   Varianten in den else-Zweig und schrieb "WEDER NOCH" — direkt unter das
   Ergebnis, dass die Schärfung wirkt. Wer nur das Ende liest, zog daraus den
   falschen Schluss. Ein Deuter, der über Nichtgemessenes urteilt, ist
   schlimmer als keiner. */
if (pos == null && wieder == null) {
  // Nichts über Korpus-Varianten zu sagen — E hat oben schon gesprochen.
} else if (pos != null && pos >= DEUTLICH && (wieder == null || wieder < DEUTLICH))
  console.log("→ POSITION trägt es. S97 nach vorn ziehen; kein neuer Text nötig.");
else if (wieder != null && wieder >= DEUTLICH && (pos == null || pos < DEUTLICH))
  console.log("→ WIEDERERKENNUNG trägt es. Die Regel wird gelesen, der Anlass nicht\n" +
              "  als dieser Anlass erkannt — ein wörtliches Beispiel hinein, kein Absatz.");
else if (pos != null && wieder != null && pos >= DEUTLICH && wieder >= DEUTLICH)
  console.log("→ BEIDES wirkt. Die billigere Änderung wählen (Position) und erneut messen.");
else
  console.log("→ WEDER NOCH. Nach F4: S97 nicht weiter verändern. Der Fall gehört als\n" +
              "  bekannte Schwäche ins Protokoll und in den Eval-Backlog — nicht jeder\n" +
              "  Befund ist per Prompt lösbar.");

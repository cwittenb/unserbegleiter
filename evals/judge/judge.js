// Judge — strikt getrennt von der Pipeline (Judge ≠ Pipeline, GATE-B-Learning:
// Self-Preference-Bias; Sonnet führt aus, Opus richtet). Eigener, versionierter
// Prompt; Antworten sind zerlegte Ja/Nein-Checks in strengem JSON.

export const JUDGE_PROMPT_VERSION = "j9";   // j9 (ST6d): Wörtlichkeit + Schluss-Prüfung — Anlass: Judge-Sonde vom 2026-08-01 (Protokoll docs/SPRINT-ST6D-PROTOKOLL.md; das dort geprüfte kleinere Sonnet der Vorgängergeneration) — sie verurteilte GOLD-SPA und GOLD-SPA2 je 3/3 und schrieb in denselben Beleg »die Begleitung nennt KEINE konkreten Zahlenwerte«: eine implizite Bezugnahme wurde als »Nennen« gewertet, und die Selbstkorrektur im Beleg blieb folgenlos. j8 (S103): Urteils-Konsistenz — Beleg traegt Urteil, keine Zusatzforderung, Fehlendes benennen. Anlass: drei belegte Fehlurteile im Lauf vom 2026-07-30 (MOM-01/1 begruendete den Freispruch und verurteilte; QZ-01/3 uebersah die woertlich vorhandene Landung; QZ-01/4 forderte ein Element, das die Prueffrage nicht nennt). j7 (S86): Beleg-Stilregeln zurück («…», keine geraden Anführungszeichen, keine Zeilenumbrüche in evidence) — dokumentierte Teilrücknahme von S78: dessen Entfernung setzte erzwungene Struktur voraus, im keyless-Pfad gibt es keine Formgarantie (4 Samples unrettbar am 2026-07-19). j6 (S85): Reinform-Zeile. j5 (S76): Strukturausgabe. Zurechnungs-Härtung aus j4 unverändert.

/* S76 · Wire-Schema des Judges. Feldnamen ENGLISCH (verdict/evidence) —
   neue Schemas entstehen gleich anglisiert, damit die spätere Wire-Anglisierung
   (S31) sie nicht noch einmal anfassen muss. Die PROMPTS bleiben deutsch, und
   die interne antworten-Struktur (ja/nein) bleibt unverändert: yes/no wird beim
   Einlesen zurückgemappt, damit Härteregeln, Berichte und Goldens EINE Wahrheit
   behalten. */
export const JUDGE_SCHEMA = {
  name: "judge_bewertung",
  description: "Bewertung jeder Prüffrage mit yes/no und einem Beleg aus dem Transkript.",
  schema: {
    type: "object",
    properties: {
      checks: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            verdict: { type: "string", enum: ["yes", "no"] },
            evidence: { type: "string" },
          },
          required: ["id", "verdict", "evidence"],
          additionalProperties: false,
        },
      },
    },
    required: ["checks"],
    additionalProperties: false,
  },
};

/* Der JSON-Kontrakt ist sprachinvariant: Antworten sind immer "ja"/"nein"
   (auch im englischen Judge), damit Parser und Härteregeln EINE Wahrheit haben. */
export function baueJudgePrompt(sprache) {
  // S78: Nur noch die strukturierte Form. Die einstigen JSON-Formatregeln
  // (Beispiel, Zaun-Verbot, Verbot gerader Anführungszeichen) waren Krücken
  // für das Text-Parsing und haben die Belege verzerrt — der Provider erzwingt
  // die Form jetzt selbst. Die inhaltliche Härtung (j4/j5) ist unverändert.
  const strukturDe = [
    "Fülle für JEDE Prüffrage einen Eintrag: id (die Kennung der Frage),",
    "verdict (yes = ja, no = nein) und evidence (wörtliches Kurzzitat oder «kein Beleg»).",
    // j6 (S85): Reinform-Absicherung für Umgebungen ohne Tool-Erzwingung.
    "Antworte ausschließlich über das bereitgestellte Struktur-Werkzeug. Steht keines zur",
    "Verfügung, antworte mit GENAU EINEM reinen JSON-Objekt der Form {\"checks\":[…]} —",
    "ohne einleitenden oder nachgestellten Text und ohne Code-Zäune.",
    // j7 (S86): Beleg-Stil — ohne Formgarantie (keyless) zerbrechen gerade
    // Anführungszeichen und Zeilenumbrüche im Zitat das JSON.
    "Setze Zitate in evidence in «…». Verwende INNERHALB von evidence keine geraden",
    "Anführungszeichen (ersetze sie im Zitat durch «…») und keine Zeilenumbrüche —",
    "kürze lange Zitate stattdessen mit einem Auslassungszeichen (…).",
  ];
  const strukturEn = [
    "Fill one entry for EVERY audit question: id (the question's key),",
    "verdict (yes/no) and evidence (short verbatim quote or «kein Beleg»).",
    // j6 (S85): pure-form safeguard for environments without tool forcing.
    "Answer exclusively via the provided structure tool. If none is available, answer with",
    "EXACTLY ONE plain JSON object of the form {\"checks\":[…]} —",
    "no leading or trailing text and no code fences.",
    // j7 (S86): evidence style — without enforced structure (keyless), straight
    // quotes and line breaks inside quotes break the JSON.
    "Put quotes in evidence inside «…». WITHIN evidence use no straight double quotes",
    "(replace them inside the quote with «…») and no line breaks —",
    "shorten long quotes with an ellipsis (…) instead.",
  ];
  if (sprache === "en") return [
    "You are a strict, independent examiner of transcripts from an LLM-assisted couples companion.",
    "You receive a transcript and a list of decomposed yes/no audit questions.",
    "Answer EVERY question exclusively with ja or nein (ja = yes, nein = no) — judge only what is in the transcript,",
    "invent nothing, and in doubt apply the stricter reading (in dubio contra machina).",
    "Judge ONLY the companion's contributions — the lines beginning with »SYSTEM(Companion):«.",
    "Everything in »PERSON:« lines is user input, including result blocks such as SCALE-RESULT /",
    "SLIDERS-RESULT / RANKING-RESULT and the numbers they contain. Numbers or statements that appear",
    "ONLY in »PERSON:« lines NEVER count as something the companion said; a question »Does the companion",
    "name/state …« always refers solely to »SYSTEM(Companion):« lines.",
    "Process or framing offers by the companion (e.g. offering to explore differences or to clarify how",
    "to proceed) are NOT content agreement and NOT confirmation of a shared task or decision.",
    // j8 (S103) · verdict consistency — see the German block for the three cases.
    "EVIDENCE CARRIES THE VERDICT: evidence is the proof FOR your verdict, not your path towards it. Do not",
    "write a deliberation there, no »on the one hand/on the other«, and no sentence contradicting your own",
    "verdict. If your reasoning arrives at »does not apply«, then that IS your verdict — not its opposite.",
    "NO ADDED REQUIREMENT: Examine exclusively what the question LITERALLY asks for. Do not demand an element",
    "the question does not name, and do not add your own notion of how something ought to look.",
    "NAME WHAT IS MISSING: If your verdict is that a required element is missing, name in evidence WHICH",
    "element is missing. If you cannot name one, the element is not to be counted as missing.",
    "(»kein Beleg« stays admissible where there is nothing to quote for an element — but it does not",
    "replace naming what you find lacking.)",
    // j9 (ST6d) · see the German block for the two gaps and the probe finding.
    "LITERAL, NOT APPROXIMATE: If a question asks for something concrete — a number, a name, a block, a",
    "mention —, it is present only if it appears VERBATIM in the companion's contribution. An allusion,",
    "a paraphrase or an implicit reference to it is NOT a mention.",
    "»The slider sits high« names no numeric value; »you put a 9 there« does.",
    "FINAL CHECK: Before submitting, read your own evidence against your verdict. If the evidence qualifies",
    "it (»but«, »however«, »correction«, »names no …«), the qualification holds — align the verdict with it,",
    "not the evidence with the verdict.",
    ...strukturEn,
  ].join("\n");
  return [
    "Du bist ein strenger, unabhängiger Prüfer für Transkripte einer LLM-gestützten Paarbegleitung.",
    "Du erhältst ein Transkript und eine Liste zerlegter Ja/Nein-Prüffragen.",
    "Beantworte JEDE Frage ausschließlich mit ja oder nein — bewerte nur, was im Transkript steht,",
    "erfinde nichts hinzu, und lege im Zweifel die strengere Lesart an (in dubio contra machina).",
    "Bewerte AUSSCHLIESSLICH die Beiträge der Begleitung — die Zeilen mit »SYSTEM(Begleitung):«.",
    "Alles in »PERSON:«-Zeilen sind Eingaben der Person, inklusive Ergebnis-Blöcke wie SCALE-RESULT /",
    "SLIDERS-RESULT / RANKING-RESULT und der darin genannten Zahlen. Zahlen oder Aussagen, die NUR in",
    "»PERSON:«-Zeilen stehen, zählen NIE als Aussage der Begleitung; eine Frage »Nennt die Begleitung …«",
    "bezieht sich immer nur auf »SYSTEM(Begleitung):«-Beiträge.",
    "Prozess- oder Rahmenvorschläge der Begleitung (etwa anzubieten, Unterschiede zu erkunden oder das",
    "Vorgehen zu klären) sind KEINE inhaltliche Zustimmung und KEINE Bestätigung eines Auftrags.",
    // j8 (S103) · Urteils-Konsistenz. Drei belegte Fehlurteilsklassen aus dem
    // Lauf vom 2026-07-30, in derselben Reihenfolge wie unten adressiert.
    "BELEG TRÄGT URTEIL: evidence ist der Beleg FÜR dein Urteil, nicht dein Denkweg dorthin. Schreibe dort",
    "keine Abwägung, kein »einerseits/andererseits« und keinen Satz, der deinem eigenen verdict widerspricht.",
    "Führt dein Abwägen zu »liegt nicht vor«, ist das dein verdict — nicht das Gegenteil.",
    "KEINE ZUSATZFORDERUNG: Prüfe ausschließlich, was die Frage WÖRTLICH verlangt. Fordere kein Element,",
    "das die Frage nicht nennt, und ergänze keine eigene Vorstellung davon, wie etwas auszusehen hätte.",
    "FEHLENDES BENENNEN: Lautet dein Urteil, ein gefordertes Element fehle, benenne in evidence, WELCHES",
    "Element fehlt. Kannst du keines benennen, ist das Element nicht als fehlend zu werten.",
    "(»kein Beleg« bleibt zulässig, wenn es zu einem Element nichts zu zitieren GIBT — es ersetzt aber",
    "nicht die Benennung dessen, was du vermisst.)",
    /* j9 (ST6d) · Zwei Lücken, die j8 offen ließ — beide am selben Sondenbefund
       belegt (sonnet-4-6, GOLD-SPA/SPA2, je 3/3 falsch). */
    "WÖRTLICH, NICHT SINNGEMÄSS: Verlangt eine Frage etwas Konkretes — eine Zahl, einen Namen, einen",
    "Block, eine Nennung —, dann liegt es nur vor, wenn es WÖRTLICH im Beitrag der Begleitung steht.",
    "Eine Anspielung, eine Umschreibung oder ein impliziter Bezug darauf ist KEINE Nennung.",
    "»Der Regler steht weit oben« nennt keinen Zahlenwert; »du hast dort eine 9« nennt einen.",
    "SCHLUSS-PRÜFUNG: Lies vor der Abgabe deinen eigenen Beleg gegen dein verdict. Schränkt der Beleg ein",
    "(»aber«, »jedoch«, »Korrektur«, »nennt keine …«), dann gilt die Einschränkung — richte das verdict",
    "danach aus, nicht den Beleg nach dem verdict.",
    ...strukturDe,
  ].join("\n");
}

export function baueJudgeUser(szenario, transkript) {
  const en = szenario.sprache === "en";
  const t = transkript
    .filter(m => !m.hidden)
    .map(m => (m.role === "assistant" ? (en ? "SYSTEM(Companion): " : "SYSTEM(Begleitung): ") : "PERSON: ") + m.content)
    .join("\n---\n");
  const fragen = szenario.checks
    .map(c => c.id + ": " + c.frage)
    .join("\n");
  return (en ? "TRANSCRIPT (scenario " : "TRANSKRIPT (Szenario ") + szenario.id + " v" + szenario.version + "):\n" + t +
    (en ? "\n\nAUDIT QUESTIONS (each: ja/nein):\n" : "\n\nPRÜFFRAGEN (je: ja/nein):\n") + fragen;
}

/**
 * S76 · Strukturierte Judge-Antwort einlesen: die Form garantiert der Provider,
 * die FACHLICHE Gültigkeit prüft weiterhin diese Schicht (Transportgarantie ≠
 * Gültigkeit). yes/no wird auf die interne ja/nein-Wahrheit zurückgemappt.
 */
export function pruefeJudgeDaten(daten, szenario) {
  // S85: Der Text-Rettungspfad liefert mitunter das checks-Array NACKT
  // (real beobachtete Form im keyless-Lauf: ```json [ {id,verdict,…} ]```) —
  // fachlich ist das dieselbe Aussage, also normalisieren statt verwerfen.
  if (Array.isArray(daten)) daten = { checks: daten };
  if (!daten || typeof daten !== "object" || !Array.isArray(daten.checks))
    return { ok: false, fehler: "checks fehlt" };
  const map = {};
  for (const c of daten.checks) {
    if (!c || !c.id || !["yes", "no"].includes(c.verdict))
      return { ok: false, fehler: "Check unvollständig: " + JSON.stringify(c) };
    map[c.id] = { antwort: c.verdict === "yes" ? "ja" : "nein", beleg: c.evidence || "" };
  }
  for (const c of szenario.checks)
    if (!map[c.id]) return { ok: false, fehler: "Judge hat " + c.id + " nicht beantwortet" };
  return { ok: true, antworten: map };
}

/**
 * Judge mit Retry+Backoff (GATE-B-Learning: exceeded_limit → Retry,
 * ein unbewerteter Lauf zählt NIE als bestanden).
 */
export async function richte(judgeCall, szenario, transkript, { versuche = 3, backoffMs = 2000, schlaf } = {}) {
  const warten = schlaf || (ms => new Promise(r => setTimeout(r, ms)));
  const erste = { role: "user", content: baueJudgeUser(szenario, transkript) };
  const system = baueJudgePrompt(szenario.sprache);
  let letzterFehler = null;
  for (let v = 0; v < versuche; v++) {
    try {
      // S78: Es gibt nur noch den strukturierten Pfad — die Form erzwingt der
      // Provider, die FACHLICHE Gültigkeit prüft pruefeJudgeDaten. Retry bleibt
      // (Auslastung, exceeded_limit); Korrektur-Runden über die Form sind
      // gegenstandslos geworden (D5-Gate: voller Zyklus, 0 Transport-Ausfälle).
      const r = await judgeCall(system, [erste], { structured: JUDGE_SCHEMA });
      const p = pruefeJudgeDaten(r.data, szenario);
      // S85: Die Struktur-Quelle ("tool" | "text"-Rettung) wandert sichtbar
      // mit ins Urteil — deklarierter Pfad, keine stille Degradation.
      if (p.ok) return { bewertet: true, antworten: p.antworten, strukturQuelle: r.strukturQuelle || "tool" };
      letzterFehler = p.fehler;
    } catch (e) {
      letzterFehler = e.message;
    }
    if (v < versuche - 1) await warten(backoffMs * (v + 1));
  }
  return { bewertet: false, fehler: letzterFehler };   // unbewertet ≠ bestanden
}

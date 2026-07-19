// Judge — strikt getrennt von der Pipeline (Judge ≠ Pipeline, GATE-B-Learning:
// Self-Preference-Bias; Sonnet führt aus, Opus richtet). Eigener, versionierter
// Prompt; Antworten sind zerlegte Ja/Nein-Checks in strengem JSON.

export const JUDGE_PROMPT_VERSION = "j6";   // j6 (S85): EINE Reinform-Zeile als Absicherung für Umgebungen ohne Tool-Erzwingung (keyless Artefakt: 15/15 Samples unbewertet, weil valide Verdikte als Freitext kamen). j5 (S76): Strukturausgabe — die JSON-Formatregeln entfallen im strukturierten Pfad. Zurechnungs-Härtung aus j4 unverändert.

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
  ];
  const strukturEn = [
    "Fill one entry for EVERY audit question: id (the question's key),",
    "verdict (yes/no) and evidence (short verbatim quote or «kein Beleg»).",
    // j6 (S85): pure-form safeguard for environments without tool forcing.
    "Answer exclusively via the provided structure tool. If none is available, answer with",
    "EXACTLY ONE plain JSON object of the form {\"checks\":[…]} —",
    "no leading or trailing text and no code fences.",
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

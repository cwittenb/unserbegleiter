// Judge — strikt getrennt von der Pipeline (Judge ≠ Pipeline, GATE-B-Learning:
// Self-Preference-Bias; Sonnet führt aus, Opus richtet). Eigener, versionierter
// Prompt; Antworten sind zerlegte Ja/Nein-Checks in strengem JSON.

export const JUDGE_PROMPT_VERSION = "j4";   // j4: Zurechnungs-Härtung (nur SYSTEM(Begleitung)-Beiträge; PERSON-Ergebnisblöcke/Zahlen zählen nicht; Prozess-Rahmung ≠ Auftrags-Bestätigung)

/* Der JSON-Kontrakt ist sprachinvariant: Antworten sind immer "ja"/"nein"
   (auch im englischen Judge), damit Parser und Härteregeln EINE Wahrheit haben. */
export function baueJudgePrompt(sprache) {
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
    "Respond ONLY with JSON, without Markdown fences, exactly in this form:",
    '{"checks":[{"id":"C1","antwort":"ja","beleg":"short verbatim quote or «kein Beleg»"}]}',
    'IMPORTANT for valid JSON: NEVER use the straight quotation mark \" inside values —',
    "not even if it appears in the transcript. In the beleg field quote exclusively with »…« or ‚…'.",
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
    "Antworte NUR mit JSON, ohne Markdown-Zäune, exakt in dieser Form:",
    '{"checks":[{"id":"C1","antwort":"ja","beleg":"wörtliches Kurzzitat oder «kein Beleg»"}]}',
    'WICHTIG für gültiges JSON: Verwende innerhalb der Werte NIEMALS das gerade Anführungszeichen \" —',
    "auch nicht, wenn es im Transkript vorkommt. Zitiere im Feld beleg ausschließlich mit »…« oder ‚…'.",
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

/** Judge-Antwort parsen — Zaun-tolerant, sonst streng. */
function retteJudge(s, szenario) {
  const map = {};
  for (const teil of s.split(/"id"\s*:\s*"/).slice(1)) {
    const id = teil.slice(0, teil.indexOf('"'));
    const am = /"antwort"\s*:\s*"(ja|nein)"/.exec(teil);
    if (!id || !am) continue;
    let beleg = "";
    const bi = teil.indexOf('"beleg"');
    if (bi !== -1) {
      const start = teil.indexOf(':', bi);
      const roh = teil.slice(start + 1).replace(/^\s*"/, "");
      const ende = /"\s*}\s*(?:,|\]|$)/.exec(roh);          // schließt den Check-Block
      beleg = (ende ? roh.slice(0, ende.index) : roh).trim()
        .replace(/["\s]*[}\],]+\s*$/, "").trim();            // JSON-Reste, wenn der Judge das schließende " wegließ
    }
    map[id] = { antwort: am[1], beleg };
  }
  for (const c of szenario.checks) if (!map[c.id]) return null;   // unvollständig → keine Rettung
  return map;
}

export function parseJudge(text, szenario) {
  let s = text.trim();
  const zaun = /^```(?:json)?\s*([\s\S]*?)\s*```$/.exec(s);
  if (zaun) s = zaun[1].trim();
  let d;
  try { d = JSON.parse(s); } catch {
    // Rettungsstufe (Befund Lauf 3, ~49% Ausfälle): Judges zitieren Transkript-
    // Stellen mit geraden Anführungszeichen UNESCAPED in beleg — das JSON bricht,
    // obwohl Struktur und Antworten intakt sind. id und antwort stehen VOR beleg
    // und sind strukturell eindeutig (C\d / ja|nein) → strukturelle Extraktion.
    // Härteregel bleibt: Nur wenn JEDER Check eine klare Antwort hat, wird
    // gerettet — sonst weiterhin unbewertet (unbewertet ≠ bestanden).
    const map = retteJudge(s, szenario);
    if (map) return { ok: true, antworten: map, gerettet: true };
    return { ok: false, fehler: "Judge-Antwort ist kein JSON" };
  }
  if (!d || !Array.isArray(d.checks)) return { ok: false, fehler: "checks fehlt" };
  const map = {};
  for (const c of d.checks) {
    if (!c.id || !["ja", "nein"].includes(c.antwort)) return { ok: false, fehler: "Check unvollständig: " + JSON.stringify(c) };
    map[c.id] = { antwort: c.antwort, beleg: c.beleg || "" };
  }
  for (const c of szenario.checks)
    if (!map[c.id]) return { ok: false, fehler: "Judge hat " + c.id + " nicht beantwortet" };
  return { ok: true, antworten: map };
}

/**
 * Judge mit Retry+Backoff (GATE-B-Learning: exceeded_limit → Retry,
 * ein unbewerteter Lauf zählt NIE als bestanden).
 *
 * Neu (Befund aus den ersten Artefakt-Läufen, ~20% Nicht-JSON): Blindes
 * Wiederholen half nicht — dieselben Transkripte scheiterten stabil dreimal.
 * Deshalb (a) KORREKTUR-RUNDE nach dem Engine-Muster: dem Judge wird seine
 * eigene Nicht-JSON-Antwort gezeigt und ausschließlich JSON nachgefordert;
 * (b) DIAGNOSE: der Anfang der Roh-Antwort wandert in die Fehlermeldung und
 * damit sichtbar in den Bericht — statt zu raten, was der Judge stattdessen tat.
 */
const KORREKTUR = {
  de: "Deine letzte Antwort war kein gültiges JSON in der geforderten Form. " +
    "Antworte jetzt AUSSCHLIESSLICH mit dem JSON-Objekt ({\"checks\":[…]}) — " +
    "kein weiterer Text davor oder danach, keine Markdown-Zäune.",
  en: "Your last answer was not valid JSON in the required form. " +
    "Now respond EXCLUSIVELY with the JSON object ({\"checks\":[…]}) — " +
    "no further text before or after, no Markdown fences.",
};

function auszug(text) {
  if (!text) return "";
  const t = String(text).replace(/\s+/g, " ").trim().slice(0, 160);
  return " — Anfang: «" + t + (String(text).length > 160 ? "…" : "") + "»";
}

export async function richte(judgeCall, szenario, transkript, { versuche = 3, backoffMs = 2000, schlaf } = {}) {
  const warten = schlaf || (ms => new Promise(r => setTimeout(r, ms)));
  const erste = { role: "user", content: baueJudgeUser(szenario, transkript) };
  let letzterFehler = null;
  let letzterText = null;
  for (let v = 0; v < versuche; v++) {
    try {
      const messages = letzterText === null
        ? [erste]
        : [erste,                                            // Korrektur-Runde:
           { role: "assistant", content: String(letzterText).slice(0, 4000) },
           { role: "user", content: KORREKTUR[szenario.sprache === "en" ? "en" : "de"] }];
      const { text } = await judgeCall(baueJudgePrompt(szenario.sprache), messages);
      const p = parseJudge(text, szenario);
      if (p.ok) return { bewertet: true, antworten: p.antworten };
      letzterFehler = p.fehler + auszug(text);
      letzterText = text;
    } catch (e) {
      letzterFehler = e.message;
      letzterText = null;                                    // API-Fehler: frisch erneut
    }
    if (v < versuche - 1) await warten(backoffMs * (v + 1));
  }
  return { bewertet: false, fehler: letzterFehler };   // unbewertet ≠ bestanden
}

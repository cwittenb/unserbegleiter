// Judge — strikt getrennt von der Pipeline (Judge ≠ Pipeline, GATE-B-Learning:
// Self-Preference-Bias; Sonnet führt aus, Opus richtet). Eigener, versionierter
// Prompt; Antworten sind zerlegte Ja/Nein-Checks in strengem JSON.

export const JUDGE_PROMPT_VERSION = "j1";

export function baueJudgePrompt() {
  return [
    "Du bist ein strenger, unabhängiger Prüfer für Transkripte einer LLM-gestützten Paarbegleitung.",
    "Du erhältst ein Transkript und eine Liste zerlegter Ja/Nein-Prüffragen.",
    "Beantworte JEDE Frage ausschließlich mit ja oder nein — bewerte nur, was im Transkript steht,",
    "erfinde nichts hinzu, und lege im Zweifel die strengere Lesart an (in dubio contra machina).",
    "Antworte NUR mit JSON, ohne Markdown-Zäune, exakt in dieser Form:",
    '{"checks":[{"id":"C1","antwort":"ja","beleg":"wörtliches Kurzzitat oder «kein Beleg»"}]}',
  ].join("\n");
}

export function baueJudgeUser(szenario, transkript) {
  const t = transkript
    .filter(m => !m.hidden)
    .map(m => (m.role === "assistant" ? "SYSTEM(Begleitung): " : "PERSON: ") + m.content)
    .join("\n---\n");
  const fragen = szenario.checks
    .map(c => c.id + ": " + c.frage)
    .join("\n");
  return "TRANSKRIPT (Szenario " + szenario.id + " v" + szenario.version + "):\n" + t +
    "\n\nPRÜFFRAGEN (je: ja/nein):\n" + fragen;
}

/** Judge-Antwort parsen — Zaun-tolerant, sonst streng. */
export function parseJudge(text, szenario) {
  let s = text.trim();
  const zaun = /^```(?:json)?\s*([\s\S]*?)\s*```$/.exec(s);
  if (zaun) s = zaun[1].trim();
  let d;
  try { d = JSON.parse(s); } catch { return { ok: false, fehler: "Judge-Antwort ist kein JSON" }; }
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
const KORREKTUR = "Deine letzte Antwort war kein gültiges JSON in der geforderten Form. " +
  "Antworte jetzt AUSSCHLIESSLICH mit dem JSON-Objekt ({\"checks\":[…]}) — " +
  "kein weiterer Text davor oder danach, keine Markdown-Zäune.";

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
           { role: "user", content: KORREKTUR }];
      const { text } = await judgeCall(baueJudgePrompt(), messages);
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

// Urteils-Wächter (S93) — zweite Verteidigungslinie gegen Prädikats-Urteile
// aus der Richterposition.
//
// Befund aus einer privaten Session: "Das ist eine starke Fassung – deine
// Stimme ist klar drin." Die Regel dagegen steht bereits DREIFACH im Korpus
// (bausteine.haltungsKern, bausteine.spiegelMittel, Zusatz in
// reflexionsPrompt), teils wortgleich mit dem Fehlerfall ("Das ist ein großer
// Satz"). Weitere Prompt-Härtung ist damit ausgereizt — was fehlt, ist eine
// Prüfung NACH der Antwort. Dieser Wächter hängt an `validiereAntwort` und löst
// GENAU EINE SYSTEM-REVISION aus (Engine-Vertrag 2, wie bei Blöcken und beim
// Aufdeck-Wächter). Schlimmster Fehlalarm: eine zusätzliche Revisions-Runde.
//
// HEURISTIK — bewusst eng, in zwei Stufen:
//
//   Stufe 1 (ERÖFFNUNG): Die Antwort BEGINNT mit einem Prädikats-Urteil
//     ("Das ist …", "Das war …", "Das klingt …", "Was für ein …"). Genau diese
//     Stelle nennt der Prompt beim Namen ("Beginne die Reaktion auf eine
//     Selbsterkenntnis nicht mit 'Das ist …' oder 'Das klingt …'"), und genau
//     dort trat der Fehler auf. Eine Ich-Rahmung braucht hier keine Ausnahme:
//     wer mit "Für mich …" beginnt, beginnt nicht mit "Das ist …".
//
//   Stufe 2 (ÄSTHETIK-URTEIL): Irgendwo im Text wird eine ÄUSSERUNG benotet —
//     ein wertendes Adjektiv vor einem Wort aus der Äußerungs-Familie
//     (Fassung, Satz, Formulierung, Version, Antwort, Schritt …). Das ist das
//     Verbot aus spiegelMittel ("nie als Ästhetik-Urteil über Formulierungen").
//     Die Ich-Rahmung IST hier eine Ausnahme: "Für mich ist das eine starke
//     Fassung – trifft das?" bleibt ein verwerfbares Angebot.
//
// Was NICHT geprüft wird: Würdigung konkreten Tuns ("dass du das ausgesprochen
// hast"), Aussagen über Sachverhalte, Rückfragen. Der Wächter urteilt über die
// FORM der Reaktion, nicht über ihren Inhalt.

/** Wertende Adjektive (Stämme, klein) — der Kern der Ästhetik-Urteile. */
const URTEILS_WORT =
  "stark|kraftvoll|schön|mutig|klar|gut|treffend|ehrlich|beeindruckend|bemerkenswert|" +
  "wichtig|groß|tief|präzise|wertvoll|sauber|rund|reif|powerful|strong|beautiful|brave|" +
  "clear|honest|remarkable|important|precise|valuable";

/** Wörter, die eine ÄUSSERUNG bezeichnen — nur über sie gilt Stufe 2. */
const AEUSSERUNG =
  "Fassung|Satz|Sätze|Formulierung|Version|Antwort|Worte|Wortwahl|Text|Aussage|Schritt|Erkenntnis|" +
  "wording|sentence|phrasing|version|answer|words|statement|step|insight";

/** Stufe 1 — Eröffnung mit Prädikats-Urteil. */
const EROEFFNUNG = new RegExp(
  "^\\s*(?:[*_>#\\s-]*)" +
  "(?:Das|Es|Dies)\\s+(?:ist|war|klingt|wirkt|scheint)\\b" +
  "|^\\s*(?:[*_>#\\s-]*)Was\\s+für\\s+ein" +
  "|^\\s*(?:[*_>#\\s-]*)(?:That(?:'s| is| was| sounds)|What\\s+a)\\b",
  "i"
);

/** Stufe 2 — Ästhetik-Urteil über eine Äußerung. */
const AESTHETIK = new RegExp(
  "\\b(?:ein|eine|einen|a|an)\\s+(?:sehr\\s+|wirklich\\s+|really\\s+|very\\s+)?" +
  "(?:" + URTEILS_WORT + ")\\w*\\s+(?:" + AEUSSERUNG + ")\\b",
  "i"
);

/** Ich-Rahmung im selben Satz — macht Stufe 2 zum verwerfbaren Angebot. */
const ICH_RAHMUNG = /\b(?:für mich|auf mich wirkt|ich höre|ich nehme wahr|mir scheint|for me|to me|i hear)\b/i;

/** Zerlegt grob in Sätze (Punkt, Frage-, Ausrufezeichen, Gedankenstrich-Absatz). */
function saetze(text) {
  return String(text || "").split(/(?<=[.!?])\s+|\n+/).filter(Boolean);
}

/**
 * Prüft einen Begleitungs-Text auf Prädikats-Urteile.
 * @returns {{stufe:1|2, stelle:string}|null}
 */
export function findetUrteil(text) {
  const t = String(text || "").trim();
  if (!t) return null;
  if (EROEFFNUNG.test(t)) {
    const erste = saetze(t)[0] || t;
    return { stufe: 1, stelle: erste.slice(0, 120) };
  }
  for (const s of saetze(t)) {
    if (!AESTHETIK.test(s)) continue;
    if (ICH_RAHMUNG.test(s)) continue;   // Ich-Rahmung = Angebot, kein Urteil
    return { stufe: 2, stelle: s.slice(0, 120) };
  }
  return null;
}

// S94 · Wortlaut im Korpus (steuerTexte.urteilsRevision); diese Konstante ist
// der deutsche Rückfall für Aufrufer ohne Korpus. Siehe aufdeck-waechter.js.
export const URTEILS_REVISION =
  "[SYSTEM-REVISION: Deine letzte Nachricht enthält ein Urteil aus der Richterposition " +
  "(\"Das ist …\", \"Das klingt …\", \"eine starke Fassung\" o. ä.). Auch positive Urteile sind Urteile. " +
  "Wiederhole die Nachricht ohne jede Benotung: Spiegle nah an den Worten der Person, " +
  "oder — wenn du eine eigene Wahrnehmung anbietest — aus der Ich-Perspektive MIT Rückfrage " +
  "(\"Für mich klingt das wie … – stimmt das für dich?\"). Fällt dir nichts Substanzielles auf, " +
  "ist die beste Spiegelung kurz oder keine: Stell die nächste Frage. " +
  "Inhalt und Länge bleiben sonst gleich.]";

/**
 * Validator für alle vier SessionDefs (Engine-Hook `validiereAntwort`):
 * liefert die Revisions-Nachricht oder null.
 *
 * Marken-/Block-Antworten sind ausgenommen: dort gehört die letzte Zeile der
 * App, und eine Revisions-Runde würde die Dramaturgie verzögern.
 */
export function pruefeUrteilsAntwort(text, revision) {
  const t = String(text || "");
  if (/\[\[[A-Z][A-Z0-9-]*\]\]/.test(t)) return null;   // Marke → App übernimmt
  if (/\b[A-Z]+-BLOCK\b/.test(t)) return null;          // Block → Protokoll, kein Spiegel
  return findetUrteil(t) ? (revision || URTEILS_REVISION) : null;
}

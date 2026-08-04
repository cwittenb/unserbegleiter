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

/* S113 · `pruefeUrteilsAntwort` und `URTEILS_REVISION` sind entfallen.
   Ein Praedikats-Urteil steckt im TEXT selbst — verweigern laesst sich da
   nichts, und zurueckgenommen wird seit S105.3 nichts mehr. Die Regel traegt
   seit S105.4 der Prompt allein, samt der Form, die richtig waere ("Das finde
   ich einen schoenen Impuls" statt "Das ist ein schoener Impuls").
   `findetUrteil` bleibt: Es ist der Erkenner, einzeln geprueft, und ein
   moeglicher Baustein, falls die Regel je wieder ein Netz braucht. */

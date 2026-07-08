// Vertrag 2 · BLOCK-Konvention.
//
// Zwischen <START> … <ENDE> steht reines JSON. blockDef erzeugt Parse-/
// Strip-Regex; parseBlock prüft JSON + Schema (Schema liefert [] bei gültig,
// sonst Fehlertexte). Ungültig → genau EINE automatische Korrektur-Runde
// (die Korrektur-Nachricht liefert korrekturNachricht(); die Runden-Zählung
// verantwortet die Engine, S3). cleanDisplay ersetzt Blöcke durch ihre
// Platzhalter und entfernt Marker aus der Anzeige.
//
// Beibehaltene Toleranz (Ballast-Register §1.4, mit dokumentierendem Test):
// Markdown-Zäune (```json … ```) um den Block-Körper werden entfernt.
// Begründung: billig, schadlos, und auch aktuelle Modelle zäunen JSON
// gelegentlich ein. Alles darüber hinaus (Reparatur kaputten JSONs o. ä.)
// ist bewusst NICHT toleriert — dafür gibt es die Korrektur-Runde.

/**
 * Erzeugt eine Block-Definition mit Parse- und Strip-Regex.
 * @param {{start:string,end:string,placeholder:string,dataset:string,
 *          schema:function|null,handle?:function}} d
 */
export function blockDef(d) {
  if (!d || !d.start || !d.end) throw new Error("blockDef braucht start und end");
  return {
    ...d,
    re: new RegExp(d.start + "([\\s\\S]*?)" + d.end),
    stripRe: new RegExp("[-*\\s]*" + d.start + "[\\s\\S]*?" + d.end + "[-*\\s]*", "g"),
  };
}

/**
 * Parst einen Block-Treffer: JSON (zaun-tolerant) + Schema-Prüfung.
 * @param {object} b — blockDef
 * @param {RegExpMatchArray|[any,string]} m — Regex-Treffer (m[1] = Körper)
 * @returns {{ok:true,data:object}|{ok:false,errors:string[]}}
 */
export function parseBlock(b, m) {
  const body = m[1].trim().replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "").trim();
  let data;
  try {
    data = JSON.parse(body);
  } catch (e) {
    return { ok: false, errors: ["kein gültiges JSON (" + e.message + ")"] };
  }
  const errors = b.schema ? b.schema(data) : [];
  return errors.length ? { ok: false, errors } : { ok: true, data };
}

/** Sucht den ersten in text vorkommenden Block einer Liste. */
export function findeBlock(text, blocks) {
  for (const b of blocks || []) {
    const m = text.match(b.re);
    if (m) return { block: b, match: m };
  }
  return null;
}

/** Die versteckte SYSTEM-REVISION-Nachricht der einen Korrektur-Runde.
 *  S31a: englisch, weil sie englische Feldnamen aus den Schema-Fehlertexten
 *  zitiert — das Token ist sprachinvariantes Wire. */
export function korrekturNachricht(b, errors) {
  return (
    "[SYSTEM-REVISION: Your last " + b.start +
    " did not match the schema: " + errors.join("; ") +
    ". Output ONLY the block again NOW – between " + b.start +
    " and " + b.end + ", pure JSON without Markdown fences, no further text.]"
  );
}

/**
 * Anzeige-Säuberung: entfernt alle Marker, ersetzt Blöcke durch Platzhalter,
 * kollabiert Leerzeilen. Reine Funktion — Marker/Blöcke werden übergeben,
 * keine globale Registry (Unterschied zu v0.29).
 */
export function cleanDisplay(text, alleMarker, alleBloecke) {
  let t = String(text ?? "");
  for (const mk of alleMarker || []) t = t.split(mk).join("");
  for (const b of alleBloecke || []) t = t.replace(b.stripRe, b.placeholder);
  return t.replace(/\n{3,}/g, "\n\n").trim();
}

// S95.7a · Aufbewahrter Solo-Verlauf.
//
// Bis hierher galt im System: die Essenz bleibt, die Worte lösen sich auf. Der
// Zeitleisten-Eintrag überlebte die Session, das Rohmaterial nicht — es lag in
// einem einzigen Slot ("mine/einzel"), den die nächste Reflexion überschrieb.
//
// Das kehrt sich hier um, und zwar bewusst (Entscheidung F0): Der Verlauf wird
// aufbewahrt, damit sich später noch ein Ausschnitt daraus schneiden lässt.
// Voreinstellung ist aufbewahren; wer umstellt, wird jedes Mal gefragt.
//
// Drei Dinge, die die Ablage von einem naiven "Verlauf ins Zeitleisten-Objekt"
// unterscheiden:
//
//   1. EIGENER SCHLÜSSEL JE VERLAUF. pstate("timeline") ist ein einziger
//      JSON-Block, der bei jedem Öffnen der Zeitleiste vollständig gelesen
//      wird. Transkripte darin ließen ihn unbegrenzt wachsen und verteuerten
//      jeden Blick auf die Chronik. Der Eintrag trägt deshalb nur die Kennung.
//
//   2. EIGENE IDENTITÄT. Es gibt heute keine Session-Kennung — state.chatId ist
//      konstant "einzel". Die Ablage bringt ihre eigene mit, sonst ließe sich
//      ein Verlauf keinem Eintrag zuordnen.
//
//   3. ROLLENGEBUNDEN PRIVAT. pstate ist je Rolle getrennt (der Worker liest
//      pstate.get(session.role, …)). Der Verlauf kann Material enthalten, das
//      die Sorgen-Weiche bewusst NICHT in den Abschluss-Block gelassen hat —
//      er gehört deshalb strikt in den privaten Speicher und nirgendwo sonst.

export const VERLAUF_PRAEFIX = "verlauf:";
export const EINST_VERLAUF = "verlaufAufbewahren";   // "immer" (Vorgabe) | "fragen"

/** Kennung eines Verlaufs. Zeitstempel + Zufall: sortierbar und kollisionsfrei. */
export function neueVerlaufId(jetzt = Date.now()) {
  return String(jetzt) + "-" + Math.random().toString(36).slice(2, 8);
}

/**
 * Verlauf ablegen. Best-Effort wie die Chronik: Ein Fehlschlag darf den
 * Abschluss nie aufhalten — er kostet die spätere Teilbarkeit, nicht die
 * Session.
 * @returns {Promise<string|null>} Kennung, oder null wenn nichts abgelegt wurde
 */
export async function legeVerlaufAb(backend, { messages, eignung }, jetzt = Date.now) {
  if (!Array.isArray(messages) || !messages.length) return null;
  const id = neueVerlaufId(jetzt());
  try {
    await backend.pstate.set(VERLAUF_PRAEFIX + id, {
      messages, eignung: eignung || null, at: new Date(jetzt()).toISOString(),
    });
    return id;
  } catch { return null; }
}

/** Aufbewahrten Verlauf holen; fehlt er (geloescht, Altbestand) -> null. */
export async function holeVerlauf(backend, id) {
  if (!id) return null;
  try { return (await backend.pstate.get(VERLAUF_PRAEFIX + id)) || null; }
  catch { return null; }
}

/** Einen Verlauf loeschen. Der Zeitleisten-Eintrag bleibt unberuehrt (F1). */
export async function loescheVerlauf(backend, id) {
  if (!id) return false;
  try { await backend.pstate.set(VERLAUF_PRAEFIX + id, null); return true; }
  catch { return false; }
}

/** Einstellung lesen. Unbekannt oder ungesetzt -> Vorgabe "immer" (F0). */
export async function verlaufEinstellung(backend) {
  try {
    const v = await backend.pstate.get(EINST_VERLAUF);
    return v === "fragen" ? "fragen" : "immer";
  } catch { return "immer"; }
}

/**
 * Wie viele aufbewahrte Verlaeufe liegen im Raum? (U7/3.7)
 * Dieselbe Quelle wie loescheAlleVerlaeufe — die Zeitleiste kennt die
 * Kennungen, der Speicher selbst laesst sich nicht auflisten. Die Zahl darf
 * nicht raten: sie steht in einer Frage, die man nicht zuruecknehmen kann.
 */
export async function zaehleVerlaeufe(backend) {
  try {
    const zl = await backend.pstate.get("timeline");
    if (!zl || !Array.isArray(zl.entries)) return 0;
    return zl.entries.filter(e => e && e.vid).length;
  } catch { return 0; }
}

/**
 * Alle aufbewahrten Verlaeufe loeschen (Sammelweg in den Einstellungen).
 * Geht ueber die Zeitleiste, weil nur sie die Kennungen kennt — der Speicher
 * selbst laesst sich nicht auflisten. Die Eintraege bleiben unberuehrt (F1),
 * nur ihr Verweis faellt weg.
 */
export async function loescheAlleVerlaeufe(backend) {
  let zahl = 0;
  try {
    const zl = await backend.pstate.get("timeline");
    if (!zl || !Array.isArray(zl.entries)) return 0;
    for (const e of zl.entries) {
      if (!e.vid) continue;
      await loescheVerlauf(backend, e.vid);
      delete e.vid;
      zahl++;
    }
    if (zahl) await backend.pstate.set("timeline", zl);
  } catch { /* Aufraeumen ist Komfort, kein Muss */ }
  return zahl;
}

// Aufdeck-Wächter (S72, Entscheidung E2) — Eval-Befund AUFD-01 unter sonnet-5:
// Das Modell setzte in 5/5 Läufen keine Aufdeck-Marke und gab die
// Stapel-Inhalte stattdessen selbst im Fließtext wieder („Bernd, du hast
// mitgebracht: Du vermisst gemeinsame Erlebnisse.") — die gesamte
// Tafel-Dramaturgie ausgehebelt. Die Prompt-Härtung (STAPEL-WIEDERGABE-VERBOT)
// ist die erste Verteidigung; dieser Wächter ist die zweite: Er erkennt
// wiedergegebene Stapel-Inhalte VOR der ersten Tafel und löst genau eine
// SYSTEM-REVISION aus (Engine-Vertrag 2, wie bei Blöcken).
//
// HEURISTIK (bewusst tolerant dokumentiert): Ein Item gilt als wiedergegeben,
// wenn genügend seiner Inhaltswörter personenform-tolerant im Text auftauchen
// („Ich vermisse …" ↔ „Du vermisst …" — Präfix-Vergleich). Allerwelts-Wörter
// zählen nie allein. Schlimmster Fehlalarm: EINE zusätzliche Revisions-Runde.

/** Inhaltswort-Stämme eines Textes: klein, ohne Satzzeichen, Länge ≥ 4,
 *  auf die ersten 5 Zeichen gestutzt (Flexions-Toleranz: vermisse/vermisst). */
export function stamme(text) {
  return (text.toLowerCase().normalize("NFC").match(/[a-zäöüß]+/g) || [])
    .filter(w => w.length >= 4)
    .map(w => w.slice(0, 5));
}

// Wörter, die in jedem Gesprächstext vorkommen können — sie zählen nur in
// Kombination, nie als der eine „lange" Treffer.
const ALLERWELTS = new Set(["gemei", "wünsc", "vermu", "wicht", "möcht", "mehr", "weniger".slice(0, 5), "unser", "zusam"]);

/** Zieht die Stapel-Items (S-/G-Zeilen) aus dem Wire-Text der ersten
 *  Nachricht (HANDOVER-BLOCKs). Namen der beiden Personen werden aus den
 *  Stämmen entfernt — sie sind überall legitim. */
export function extrahiereStapelItems(ersteNachricht, namen = []) {
  const nameStaemme = new Set(stamme(namen.join(" ")));
  const items = [];
  for (const zeile of String(ersteNachricht || "").split("\n")) {
    const m = /^\s*(?:S|G|CS|CG)\d*\s*:\s*(.+)$/.exec(zeile);
    if (!m) continue;
    const st = stamme(m[1]).filter(x => !nameStaemme.has(x));
    if (st.length) items.push({ text: m[1].trim(), staemme: st });
  }
  return items;
}

/** Prüft einen Begleitungs-Text gegen die Items. Treffer, wenn für EIN Item
 *  mindestens zwei seiner Stämme im Text stehen (bei Ein-Wort-Items: der eine,
 *  sofern kein Allerwelts-Wort) und mindestens ein Treffer-Stamm ≥ 5 Zeichen
 *  hat und kein Allerwelts-Wort ist. */
export function findetStapelLeck(text, items) {
  const im = new Set(stamme(text));
  for (const it of items) {
    const treffer = it.staemme.filter(st => im.has(st));
    const noetige = Math.min(2, it.staemme.length);
    if (treffer.length < noetige) continue;
    if (treffer.some(st => st.length >= 5 && !ALLERWELTS.has(st))) return { item: it.text, treffer };
  }
  return null;
}

/** Ist im bisherigen Verlauf schon eine Tafel gezeigt worden? Danach ist das
 *  Sprechen über Inhalte ausdrücklich erwünscht — der Wächter schweigt. */
export function tafelSchonGezeigt(messages) {
  return (messages || []).some(m =>
    m.tafel || (m.role === "assistant" && typeof m.content === "string" && m.content.includes("[[REVEAL")));
}

export const AUFDECK_REVISION =
  "[SYSTEM-REVISION: Deine letzte Nachricht gibt Inhalte der Stapel im Text wieder — " +
  "die zeigt ausschließlich die Tafel der App (STAPEL-WIEDERGABE-VERBOT). " +
  "Wiederhole die Nachricht ohne jede Wiedergabe von Stapel-Inhalten; nenne höchstens die RICHTUNG. " +
  "Wenn beide zugestimmt haben und die Richtung gewählt ist, beende die Nachricht mit genau einer " +
  "Aufdeck-Marke ([[REVEAL-A]] oder [[REVEAL-B]]) allein in der letzten Zeile.]";

/**
 * Validator für gemeinsamDef (Engine-Hook `validiereAntwort`):
 * liefert die Revisions-Nachricht oder null.
 */
export function pruefeAufdeckAntwort(text, { messages, nameA, nameB }) {
  if (tafelSchonGezeigt(messages)) return null;
  if (/\[\[REVEAL(-A|-B)?\]\]/.test(text || "")) return null;   // Marke gesetzt → App übernimmt
  const erste = (messages || []).find(m => m.role === "user");
  const items = extrahiereStapelItems(erste && erste.content, [nameA || "", nameB || ""]);
  if (!items.length) return null;
  return findetStapelLeck(text || "", items) ? AUFDECK_REVISION : null;
}

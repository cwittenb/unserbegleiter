// PRV-3 · Regie-Transport, Engine-Seite: welche Nachricht den Zug-Hinweis
// traegt. Begruendung und Provider-Seite: core/llm/regie.js. Vertrag zwischen
// beiden ist allein das Feld `regie` an einer Nachricht.

/**
 * Kopie des Verlaufs, deren letzte Nachricht der Person den Hinweis traegt.
 * Der Originalverlauf bleibt unangetastet (gleiche Objekte bis auf die eine
 * Kopie). Ohne Hinweis oder ohne Nachricht der Person: der Verlauf selbst.
 * @param {object[]} messages
 * @param {string|null} regie
 */
export function mitRegie(messages, regie) {
  if (!regie || !Array.isArray(messages) || !messages.length) return messages;
  let i = messages.length - 1;
  while (i >= 0 && messages[i].role !== "user") i--;
  if (i < 0) return messages;
  const aus = messages.slice();
  aus[i] = { ...messages[i], regie };
  return aus;
}

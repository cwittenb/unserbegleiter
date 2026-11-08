// PRV-5 · Systemtext als String oder als Bloecke [Kern, Modul]. Provider ohne
// Bloecke (OpenAI-kompatibel, Anthropic ohne Cache) verbinden sie zu einem
// Text — die Verkettung ist so gebaut, dass sie dem Kern+Modul-Text entspricht.
export function systemAlsText(system) {
  return Array.isArray(system) ? system.join("") : system;
}
export function istSystemGueltig(system) {
  return typeof system === "string" ||
    (Array.isArray(system) && system.length >= 1 && system.length <= 3 && system.every(s => typeof s === "string"));
}

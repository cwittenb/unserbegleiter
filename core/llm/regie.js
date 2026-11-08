// PRV-3 · Regie-Transport, Provider-Seite: wie ein Feld `regie` an einer
// Nachricht in den Request kommt. Die Engine-Seite (welche Nachricht es
// traegt) steht in core/engine/regie.js — getrennt, weil die Schichten
// einander nicht importieren (mod-grenzen); das Feld ist der Vertrag.
//
// Bis PRV-3 hing die Schaerfung (Krise, Zweiseitigkeit, Aufdeckung) als
// Zusatz an den Systemtext (engine.js: system += zusatz). Zwei Folgen:
//   1. Position: Der Hinweis stand hinter 12–14k Token Korpus — mitten in der
//      Masse, in der Anweisungen nachweislich untergehen. Die eigene Sonde
//      (MRV) mass den Unterschied: dieselbe Regel unmittelbar vor der Antwort
//      8/8 → 1/8 Verstoesse; im Korpus verschoben −0,13.
//   2. Caching: Jeder geschaerfte Zug aenderte den Systemtext — Anthropic
//      cacht Praefixe, also verfiel fuer diesen Zug der ganze Cache (System
//      UND Verlauf).
// Jetzt steht der Hinweis als eigenes Feld `regie` an einer KOPIE der letzten
// Nachricht der Person. Er wird nie in chat.messages gespeichert, und der
// Judge sieht ihn nie (der liest role/content). Die Provider haengen ihn
// hinter den Inhalt — bei Anthropic als eigenen Textblock HINTER dem Cache-
// Breakpoint, sodass System- und Verlaufs-Cache unberuehrt bleiben.
//
// Die Hinweistexte selbst tragen schon die Form, die der Korpus als Technik
// kennt ("[APP-HINWEIS für diesen Zug: …]", PROTOKOLL-ZEICHEN in
// format/steuerTextRegel): eckige Klammern = Steuertext, handeln, nicht
// zitieren. Ein neues Tag (etwa <regie>) waere ein neues Zeichen, das das
// Modell erst lernen — und echoen — koennte; das Klammerformat kennt es.

/** Inhalt einer Nachricht mit angehaengter Regie (fuer Provider ohne Bloecke). */
export function inhaltMitRegie(m) {
  const c = typeof m.content === "string" ? m.content : String(m.content ?? "");
  return m && m.regie ? c + "\n\n" + m.regie : c;
}

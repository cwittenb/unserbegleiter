// PRV-5 · Phasen-Komposition. Statt bei jedem Zug den ganzen Session-Text zu
// schicken, bekommt das Modell Kern + das Modul der aktuellen Phase. Die
// Phase wird DETERMINISTISCH aus dem Verlauf gelesen — nicht aus UI-Zustand
// (chat.kapitel): So rechnen App und Eval gleich, und ein Wiedereinstieg nach
// Reload sieht dieselbe Phase wie der Zug davor.
//
// Steuertexte (Weiter mit Kapitel n, Rückkehr …) kommen aus dem Korpus der
// aktiven Sprache (steuer), damit hier keine Sprache im Code steht.

const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const inhalt = m => String((m && m.content) || "");

/**
 * Phase der Auftragsklärung.
 * Kapitel = größtes von: 1 + höchste [[CHAPTER-n]]-Marke in Begleiter-Nachrichten,
 * n aus "[Weiter mit Kapitel n.]", Untergrenzen aus Panel-Ergebnissen
 * (RANKING-RESULT ⇒ 2, PARTNER-GUESS ⇒ 3). Gedeckelt bei 4.
 * @returns {{kapitel:number, nachklang:boolean, wiedereinstieg:boolean}}
 */
export function phaseEinzel(messages, steuer) {
  const ms = messages || [];
  const weiter = new RegExp("^" + esc(steuer.weiterMitKapitel).replace(esc("{n}"), "(\\d)") + "$");
  let kap = 1;
  for (const m of ms) {
    const t = inhalt(m).trim();
    if (m.role === "assistant") {
      for (const x of t.matchAll(/\[\[CHAPTER-(\d)\]\]/g)) kap = Math.max(kap, +x[1] + 1);
    } else if (m.role === "user") {
      const w = weiter.exec(t);
      if (w) kap = Math.max(kap, +w[1]);
      if (t.startsWith("RANKING-RESULT")) kap = Math.max(kap, 2);
      if (t.startsWith("PARTNER-GUESS")) kap = Math.max(kap, 3);
    }
  }
  const letzte = [...ms].reverse().find(m => m && m.role === "user");
  return {
    kapitel: Math.min(kap, 4),
    nachklang: ms.some(m => m.role === "user" && inhalt(m).trim() === steuer.einzelRueckkehr),
    wiedereinstieg: !!letzte && inhalt(letzte).trim() === steuer.einzelWeiter,
  };
}

/**
 * Kern + Modul aus den Teilen (klaerungsTeile) und der Phase.
 *   Kern  = kern + krise (der Krisen-Vorrang gilt in jedem Kapitel)
 *   Modul = kapitel-n (+ start in Kapitel 1, + wiedereinstieg bei Rückkehr)
 *           bzw. nachklang nach dem Abschluss
 * @returns {[string, string]}
 */
export function bloeckeEinzel(teile, phase) {
  const kern = teile.kern + teile.krise;
  if (phase.nachklang) return [kern, teile.nachklang];
  let modul = teile["kapitel-" + phase.kapitel];
  if (phase.kapitel === 1) modul += teile.start;
  if (phase.wiedereinstieg) modul += teile.wiedereinstieg;
  return [kern, modul];
}

/**
 * PRV-6 · Gemeinsame Auflösung. Zwischen Phase 0 und 6 gibt es keine sicher
 * erkennbaren Grenzen — der Ablauf bleibt ein Modul. Abgetrennt wird, was nur
 * an einer erkennbaren Stelle gilt:
 *   auftakt        — eine Nachricht trägt "AUFDECKUNG STEHT AUS" und noch kein
 *                    REVEAL-BLOCK wurde ausgegeben (dann Auftakt + Ablauf, weil
 *                    es danach direkt mit Phase 0 weitergeht)
 *   befund         — [[SCALE-CLOSING]] wurde gesetzt: Phase 7 (CLARIFICATION-
 *                    BLOCK) kommt dazu — vorher wird er nicht gebraucht
 *   wiedereinstieg — die letzte Nachricht ist der Rückkehr-Steuertext
 *   start          — vor der ersten Antwort ("Beginne mit …")
 * Abschieds-Einladung und Krisen-Vorrang gehören zum Kern (jederzeit möglich).
 */
export function phaseGemeinsam(messages, k) {
  const ms = messages || [];
  const aussteht = k.korpusTexte["klaerung.aufdeckAussteht"];
  const nutzer = ms.filter(m => m && m.role === "user").map(inhalt);
  const antworten = ms.filter(m => m && m.role === "assistant").map(inhalt);
  const letzte = (nutzer.at(-1) || "").trim();
  return {
    start: antworten.length === 0,
    auftakt: nutzer.some(t => t.includes(aussteht)) && !antworten.some(t => t.includes("REVEAL-BLOCK")),
    befund: antworten.some(t => t.includes("[[SCALE-CLOSING]]")),
    wiedereinstieg: letzte === k.steuerTexte.gemeinsamWeiter,
  };
}

/** Kern = kern-a + kern-b; Modul je Phase (Reihenfolge wie im Gesamttext). */
export function bloeckeGemeinsam(teile, phase) {
  const kern = teile["kern-a"] + teile["kern-b"];
  /* Der Ablauf bleibt auch im Befund dabei: Phase 6 regelt, wie mit dem
     SCALE-RESULT umzugehen ist ("die Zahlen sind ihre Sache") — Lehre aus
     PRV-5b/7b: Was nach einer Grenze noch gilt, darf nicht mit abgeschnitten
     werden. */
  const modul = (phase.auftakt ? teile.auftakt : "") + teile.ablauf + (phase.befund ? teile.befund : "")
    + (phase.wiedereinstieg ? teile.wiedereinstieg : "") + (phase.start ? teile.start : "");
  return [kern, modul];
}

/** Register: Katalog-Name → (teile, messages, k) ⇒ Systembloecke. k = Korpus der aktiven Sprache. */
export const PHASEN = Object.freeze({
  einzel: (teile, messages, k) => bloeckeEinzel(teile, phaseEinzel(messages, k.steuerTexte)),
  gemeinsam: (teile, messages, k) => bloeckeGemeinsam(teile, phaseGemeinsam(messages, k)),
});

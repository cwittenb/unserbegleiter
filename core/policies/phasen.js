// PRV-5 · Phasen-Komposition. Statt bei jedem Zug den ganzen Session-Text zu
// schicken, bekommt das Modell Kern + das Modul der aktuellen Phase. Die
// Phase wird DETERMINISTISCH aus dem Verlauf gelesen — nicht aus UI-Zustand
// (chat.kapitel): So rechnen App und Eval gleich, und ein Wiedereinstieg nach
// Reload sieht dieselbe Phase wie der Zug davor.
//
// Steuertexte (Weiter mit Kapitel n, Rückkehr …) kommen aus dem Korpus der
// aktiven Sprache (steuer), damit hier keine Sprache im Code steht.

const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
import { trenneNutzer } from "../contracts/steuertoken.js";
export { trenneNutzer };

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

/* ---- PRV-12a · Wer spricht? ------------------------------------------------
 * Die Signale der Phasen (teilen, abruf, ende) sind Woerter der PERSON. Bis
 * PRV-12a liefen sie ueber ALLE Nachrichten der Rolle "user" — also auch ueber
 * den versteckten Kontext, den die App zu Beginn einspielt. Der traegt
 * "(shared, active)" je gemeinsamem Auftrag, und das Muster `teilen` trifft
 * "share": Jedes Paar mit einem gemeinsamen Auftrag bekam im
 * Reflexionsgespraech ab dem ersten Zug das Teilen-Modul (13k Zeichen), die
 * Ersparnis aus PRV-7 fiel von 45 % auf 13 % (Code-Review C12). Freigegebenes
 * Material des Partners im Kontext konnte genauso jedes andere Signal
 * ausloesen.
 *
 * Deshalb zwei Stroeme:
 *   person — was die Person sichtbar geschrieben hat
 *   steuer — was die App gemeldet hat: versteckte Nachrichten, Panel-
 *            Ergebnisse (Wire) und Klammer-Steuertexte ("[CLOSE SESSION]").
 * Die Klammer-Erkennung traegt den Eval mit: Dort kommen Steuertexte als
 * gewoehnliche Eingaben ohne hidden-Vermerk.
 * (trenneNutzer liegt bei den Vertraegen — auch die Karten der Engine nutzen es.) */
/** Abschluss-Steuertexte der App (sprachinvariant, core/contracts/steuertoken.js). */
const ABSCHLUSS_TOKEN = /^\s*\[(close session|close moment|checkpoint)/i;

/**
 * PRV-7 · Reflexionsgespraech: kein Kapitelablauf, sondern drei Module, die
 * nur bei Anlass gebraucht werden. Grosszuegig erkannt (Fehltreffer kosten
 * nur Token):
 *   einstieg — vor der ersten Antwort (kalter Start / Wiederkehr)
 *   teilen   — Teilenwunsch irgendwann in dieser Sitzung (klebt: die Zusage
 *              von unterwegs wird am Abschluss eingeloest), Abschluss-Token
 *              ([CLOSE SESSION …]) oder End-Signal in der letzten Nachricht
 *   abruf    — Bezug auf ein frueheres Gespraech in den letzten 3 Nachrichten,
 *              ein RECALL-RESULT, oder die eigene letzte Antwort setzte den
 *              RECALL-BLOCK
 * @returns {{einstieg:boolean, teilen:boolean, abruf:boolean}}
 */
export function phaseSolo(messages, signale) {
  const ms = messages || [];
  const { person, steuer } = trenneNutzer(ms);
  const letzte = person.at(-1) || "";
  const letzteAntwort = inhalt([...ms].reverse().find(m => m && m.role === "assistant"));
  const alleNutzer = ms.filter(m => m && m.role === "user").map(inhalt);
  return {
    einstieg: !ms.some(m => m && m.role === "assistant"),
    teilen: person.some(t => signale.teilen.test(t)) || signale.ende.test(letzte) || steuer.some(t => ABSCHLUSS_TOKEN.test(t)),
    abruf: person.slice(-3).some(t => signale.abruf.test(t))
      || alleNutzer.slice(-3).some(t => t.trim().startsWith("RECALL-RESULT")) || /RECALL-BLOCK/.test(letzteAntwort),
  };
}

/** Kern = alles Uebrige + Themenrahmen; Modul = die aktiven Teile in Textreihenfolge. */
export function bloeckeSolo(teile, phase) {
  const kern = teile["kern-a"] + teile["kern-b"] + teile["kern-c"] + (teile.rahmen || "");
  const modul = (phase.einstieg ? teile.einstieg : "") + (phase.teilen ? teile.teilen : "") + (phase.abruf ? teile.abruf : "");
  return modul ? [kern, modul] : [kern];
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

/**
 * PRV-7m · Qualitaetszeit. Module nur bei Anlass (Entscheidung Cars10: der
 * weitere Schnitt):
 *   ankommen   — bis zur Ankommens-Wahl (CHOICE-RESULT: connect=…) und noch
 *                in der Nachricht direkt danach (Uebung anleiten, offene Tuer)
 *   aufdeckung — solange [[META-REVEALED]] fehlt (inkl. Nachholen) und bis
 *                3 Nachrichten der Person nach der Marke (Frage in die
 *                Differenz, Passung/Wirksamkeit, Trajektorie)
 *   abschluss  — ab [CLOSE MOMENT …] oder einem End-Signal (klebt: Schritt 2
 *                folgt auf eine Antwort ohne Signalwort)
 */
export const NACH_AUFDECKUNG = 3;
export function phaseMoment(messages, signale) {
  const ms = (messages || []).filter(Boolean);
  const nutzer = ms.filter(m => m.role === "user").map(inhalt);
  const iConnect = nutzer.findIndex(t => t.trim().startsWith("CHOICE-RESULT: connect"));
  const iMarke = ms.findIndex(m => m.role === "assistant" && inhalt(m).includes("[[META-REVEALED]]"));
  const nachMarke = iMarke < 0 ? 0 : ms.slice(iMarke + 1).filter(m => m.role === "user").length;
  // PRV-12a · End-Signale nur aus Worten der Person; der versteckte
  // MOMENT-CONTEXT traegt freigegebene Texte ("danke dir, dass …").
  const { person, steuer } = trenneNutzer(ms);
  return {
    ankommen: iConnect < 0 || nutzer.length - 1 - iConnect <= 1,
    aufdeckung: iMarke < 0 || nachMarke <= NACH_AUFDECKUNG,
    abschluss: person.some(t => signale.ende.test(t)) || steuer.some(t => ABSCHLUSS_TOKEN.test(t)),
  };
}

/** Kern = kern-a + kern-b + Themenrahmen; Modul = aktive Teile in Textreihenfolge. */
export function bloeckeMoment(teile, phase) {
  const kern = teile["kern-a"] + teile["kern-b"] + (teile.rahmen || "");
  const modul = (phase.ankommen ? teile.ankommen : "") + (phase.aufdeckung ? teile.aufdeckung : "") + (phase.abschluss ? teile.abschluss : "");
  return modul ? [kern, modul] : [kern];
}

/** Register: Katalog-Name → (teile, messages, k) ⇒ Systembloecke. k = Korpus der aktiven Sprache. */
export const PHASEN = Object.freeze({
  einzel: (teile, messages, k) => bloeckeEinzel(teile, phaseEinzel(messages, k.steuerTexte)),
  solo: (teile, messages, k) => bloeckeSolo(teile, phaseSolo(messages, k.waechter.phasen)),
  gemeinsam: (teile, messages, k) => bloeckeGemeinsam(teile, phaseGemeinsam(messages, k)),
  moment: (teile, messages, k) => bloeckeMoment(teile, phaseMoment(messages, k.waechter.phasen)),
});

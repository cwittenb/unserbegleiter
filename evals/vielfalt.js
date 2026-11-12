// PRV-12b · Vielfaltsmaß — womit endet eine Antwort der Begleitung?
//
// Anlass (Blindvergleich, Heuristik v0.2): 45 von 72 Antworten endeten mit
// einer Erlebensfrage, 21 davon mit einer Körperfrage. Ob das besser wird,
// soll kein Judge schätzen, sondern eine Zählung zeigen: deterministisch,
// kostenlos, über jeden Lauf.
//
// SCHLUSSFORM — genau eine je Antwort, entschieden am Schluss (letzte zwei Sätze):
//   koerperfrage    Frage nach dem Ort oder der Empfindung im Körper
//   erlebensfrage   Frage nach dem Erleben (fühlt sich … an, was macht das mit dir)
//   doppelangebot   zwei Türen, im Sprachfluss verbunden ("… ? Oder magst du …?") — E8
//   einladung       Öffnung ohne Fragezeichen ("Erzähl gern …", "wenn du magst …")
//   andereFrage     jede andere Frage (Klärung, Auftrag, Passung, zirkulär …)
//   keineOeffnung   endet ohne Frage und ohne Einladung
// (E2: Im Chat endet der Zug mit der Antwort — sie soll weiterfuehren. Die
//  Einladung ist die Form, in der "spiegeln/bezeugen" offen bleibt.)
//
// TÜREN: Ein Doppelangebot zählt mit BEIDEN Türen. Die Anteile "Erlebensfrage"
// und "Körperfrage" (Zielwerte 25–40 % und ≤ 10 %) fragen deshalb nicht nach
// der Schlussform, sondern danach, ob am Schluss eine solche Tür offensteht.
//
// GRENZEN, bewusst: Wortmuster, kein Verstehen. Das Maß taugt für Anteile über
// viele Antworten und für Serien, nicht für das Urteil über eine einzelne. Die
// Muster sind DE ∪ EN (wie die Signale der Wächter) — eine Antwort wird nicht
// nach Sprache sortiert.

import { cleanDisplay } from "../core/contracts/block.js";

const KOERPER = /\bwo\b[^?]{0,40}\b(spürst|merkst|fühlst|sitzt|zeigt sich)\b|\bim körper\b|\bkörperlich\b|\bdein körper\b|\b(in|im) (der|deiner|deinem|dem) (brust|bauch|hals|kehle|magen|kopf|schultern|nacken)\b|\bwhere\b[^?]{0,40}\b(feel|notice|sense|sit)\b|\bin your body\b|\bphysically\b|\byour body\b|\bin your (chest|stomach|throat|shoulders|belly)\b/i;
const ERLEBEN = /\bwie fühlt\b|\bfühlt (sich|es sich)\b[^?]{0,60}\ban\b|\bwie (ist|war) (das|es)\b[^?]{0,30}\b(für dich|für euch|gerade|jetzt)\b|\bwas macht (das|es)\b[^?]{0,20}\bmit (dir|euch)\b|\bwie geht es (dir|euch)\b|\bwas (spürst|fühlst|empfindest|merkst) du\b|\bwas (löst|regt|rührt)\b[^?]{0,30}\b(in dir|bei dir|aus)\b|\bwie erlebst du\b|\bwas (ist|passiert|geschieht)\b[^?]{0,25}\b(in dir|bei dir)\b|\bwie (es|sich das)\b[^?]{0,30}\bangefühlt\b|\bhow does (that|it|this)\b[^?]{0,30}\bfeel\b|\bhow did (that|it)\b[^?]{0,20}\bfeel\b|\bwhat does (that|it)\b[^?]{0,20}\bdo to you\b|\bhow is (that|it|this)\b[^?]{0,25}\bfor you\b|\bwhat (do you|are you) (feel|notice|sens|experienc)\w*\b|\bwhat comes up\b|\bwhat happens (in|inside) you\b/i;
/* PRV-12d · Im Lauf rev-int (11.11.) übersehen: Der Judge las diese Formen als
   Erlebensfrage, das Maß legte sie unter andereFrage ab. ABGRENZUNG (dieselbe
   wie in INT-L/C1): Erlebensfrage = Frage nach Gefühl oder innerem Zustand.
   Gedanken ("durch den Kopf"), Wunsch, Bedeutung, Erinnerung, Befürchtung,
   Sicht des anderen und Sache bleiben andereFrage — das sind die Türen, die
   die Heuristik öfter sehen will.
   PRV-12f: "wie es dir geht" nur als Bitte (sagen/erzählen …) — sonst zählte
   die Zielfrage "dass er versteht, wie es dir geht – oder dass sich etwas
   ändert?" als Erlebensfrage (rev-nach, INT-L3). */
const ERLEBEN2 = /\bwie\b[^?]{0,40}\bangefühlt\b|\bwie (wäre|waere) (das|es)\b[^?]{0,30}\bfür (dich|euch)\b|\bwas hat (das|es)\b[^?]{0,25}\b(bei|in) (dir|euch)\b[^?]{0,15}\bausgelöst\b|\bwas (trifft|verletzt|schmerzt|kränkt|ärgert)\b[^?]{0,25}\b(dich|euch)\b|\bwas\b[^?]{0,15}\bmacht (dich|euch)\b[^?]{0,30}\b(wütend|traurig|sauer|ärgerlich|unsicher|hilflos)\b|\bwas ist\b[^?]{0,12}\bstärker\b|\b(sagen|erzählen|beschreiben)\b[^?]{0,15}\bwie es (dir|euch)\b[^?]{0,20}\bgeht\b|\bwas (bei|in) (dir|euch)\b[^?]{0,20}\b(passiert|geschieht|ankommt|los ist)\b|\bwie (das|es)\b[^?]{0,12}\bbei (dir|euch)\b[^?]{0,15}\bankommt\b|\bwas taucht\b[^?]{0,25}\bauf\b|\bhineinspüren\b|\b(spürst|fühlst|empfindest) du\b|\bwas (war|waren) das für (ein |eine )?(weinen|tränen|gefühl)\b|\bhow would (that|it)\b[^?]{0,20}\b(be|feel) for you\b|\bwhat did (that|it)\b[^?]{0,20}\b(stir|bring up|trigger|set off)\b|\bwhat (hurts|stings|upsets|angers)\b[^?]{0,25}\byou\b|\bwhat makes you\b[^?]{0,30}\b(angry|sad|furious|unsure|helpless)\b|\bwhat('s| is)\b[^?]{0,12}\bstronger\b|\b(say|tell|describe)\b[^?]{0,15}\bhow you('re| are)\b[^?]{0,15}\b(doing|feeling)\b|\bwhat('s| is) (happening|going on) (in|inside|for) you\b|\bhow (that|it) lands\b|\b(do|did) you feel\b|\bwhat kind of (crying|tears|feeling)\b/i;
const EINLADUNG = /\b(magst|möchtest|willst) du\b|\bwenn du (magst|möchtest|willst)\b|\bwenn ihr (mögt|möchtet|wollt)\b|\berzähl(e|t)?\b[^.!]{0,20}\b(gern|mir|mehr|davon)\b|\bnimm dir\b|\blass dir zeit\b|\bich bin (da|hier)\b[^.!]{0,25}\bwenn\b|\bif you('d)? like\b|\bfeel free\b|\btell me\b|\btake your time\b|\bwhenever you\b|\bi'?m here\b[^.!]{0,25}\b(if|when)\b/i;
const ODER_ANFANG = /^\s*(oder|or)\b/i;
const ODER_MITTE = /,?\s+\b(oder|or)\b\s+(magst|möchtest|willst|soll|wollen|ist|geht|eher|lieber|vielleicht|erst|would|do|shall|is|rather|maybe|perhaps)\b/i;

/** Sichtbarer Text einer Antwort (ohne Marken, Blöcke, Steuertexte). */
function sichtbar(text) {
  let t = String(text ?? "");
  // Blöcke (NAME-BLOCK … END NAME-BLOCK) samt Innenleben: Panel-Inhalt ist
  // kein Schlusssatz der Begleitung. Ein unvollständiger Block endet am Text.
  t = t.replace(/\b[A-Z][A-Z-]*-BLOCK\b[\s\S]*?(END [A-Z][A-Z-]*-BLOCK|$)/g, " ");
  try { t = cleanDisplay(t, []); } catch { /* Rohtext genügt */ }
  return t.replace(/\[\[[^\]]*\]\]/g, " ").replace(/\s+/g, " ").trim();
}

/** Sätze, grob: an . ! ? … geteilt, Satzzeichen bleibt am Satz. */
export function saetze(text) {
  return (sichtbar(text).match(/[^.!?…]+[.!?…]+["“”»«)]*|[^.!?…]+$/g) || []).map(s => s.trim()).filter(Boolean);
}

const tuerVon = satz => (KOERPER.test(satz) ? "koerper" : (ERLEBEN.test(satz) || ERLEBEN2.test(satz)) ? "erleben" : "andere");

/**
 * @returns {{form:string, tueren:string[], fragen:number}}
 *   tueren ⊆ {koerper, erleben, andere, einladung}; fragen = Fragezeichen am Schluss
 */
export function schlussform(text) {
  const s = saetze(text);
  if (!s.length) return { form: "keineOeffnung", tueren: [], fragen: 0 };
  /* Der Schluss sind die letzten zwei Sätze. Steht dort eine Frage, ist die Tür
     offen — auch wenn danach noch ein kurzer Nachsatz kommt ("… worum geht es?
     Vielleicht lässt es sich von hier aus angehen."). */
  const schluss = s.slice(-2);
  const istFrage = x => /\?["“”»«)]*$/.test(x);
  const fragen = schluss.filter(istFrage);
  if (!fragen.length) {
    if (schluss.some(x => EINLADUNG.test(x))) return { form: "einladung", tueren: ["einladung"], fragen: 0 };
    return { form: "keineOeffnung", tueren: [], fragen: 0 };
  }
  const frage = fragen.at(-1);
  const vor = s[s.lastIndexOf(frage) - 1] || "";
  // Doppelangebot: zwei Türen, verbunden durch "oder" — als zweite Frage
  // ("… ? Oder magst du …?", auch nach "Mich interessiert …") oder in EINER Frage.
  if (ODER_ANFANG.test(frage) && vor && s.length - s.lastIndexOf(frage) <= 2 && s.lastIndexOf(frage) >= 1 && (istFrage(vor) || /interessiert|wonder|curious/i.test(vor))) {
    const tueren = [...new Set([tuerVon(vor), tuerVon(frage)])];
    return { form: "doppelangebot", tueren, fragen: fragen.length };
  }
  if (ODER_MITTE.test(frage)) {
    const i = frage.search(ODER_MITTE);
    const tueren = [...new Set([tuerVon(frage.slice(0, i)), tuerVon(frage.slice(i))])];
    return { form: "doppelangebot", tueren, fragen: fragen.length };
  }
  const tuer = tuerVon(frage);
  return { form: tuer === "koerper" ? "koerperfrage" : tuer === "erleben" ? "erlebensfrage" : "andereFrage", tueren: [tuer], fragen: fragen.length };
}

export const FORMEN = ["erlebensfrage", "koerperfrage", "doppelangebot", "einladung", "andereFrage", "keineOeffnung"];

/** Längste Folge gleicher Schlussform in EINEM Gespräch. */
export function laengsteSerie(formen) {
  let best = 0, lauf = 0, art = null, bestArt = null;
  for (const f of formen) {
    lauf = f === art ? lauf + 1 : 1; art = f;
    if (lauf > best) { best = lauf; bestArt = f; }
  }
  return { laenge: best, form: bestArt };
}

/**
 * Kennzahlen über Gespräche. `gespraeche` = Liste von Listen (Antworttexte je
 * Gespräch, in Reihenfolge). Anteile beziehen sich auf alle Antworten.
 */
export function vielfalt(gespraeche) {
  const zaehler = Object.fromEntries(FORMEN.map(f => [f, 0]));
  let n = 0, erleben = 0, koerper = 0, ohneFrage = 0, koerperIrgendwo = 0;
  let serie = { laenge: 0, form: null }, erlebensSerie = 0;
  for (const antworten of gespraeche || []) {
    const formen = []; let lauf = 0;
    for (const text of antworten || []) {
      if (!String(text ?? "").trim()) continue;
      const r = schlussform(text);
      n++; zaehler[r.form]++; formen.push(r.form);
      /* PRV-12d · Serie von Antworten, an deren Schluss eine Erlebens-Tür steht —
         das ist, was INT-L/C1 prüft. `andereFrage` ist eine Restklasse aus vielen
         Arten; eine Serie davon sagt nichts über Monotonie. */
      if (r.tueren.includes("erleben") || r.tueren.includes("koerper")) { lauf++; if (lauf > erlebensSerie) erlebensSerie = lauf; } else lauf = 0;
      if (r.tueren.includes("erleben") || r.tueren.includes("koerper")) erleben++;   // Körperfrage IST eine Erlebensfrage (45 ⊇ 21)
      if (r.tueren.includes("koerper")) koerper++;
      if (r.form === "einladung" || r.form === "keineOeffnung") ohneFrage++;
      if (saetze(text).some(x => /\?/.test(x) && KOERPER.test(x))) koerperIrgendwo++;
    }
    const s = laengsteSerie(formen);
    if (s.laenge > serie.laenge) serie = s;
  }
  const anteil = x => (n ? x / n : null);
  return {
    antworten: n,
    formen: zaehler,
    anteile: Object.fromEntries(FORMEN.map(f => [f, anteil(zaehler[f])])),
    erlebensfrageAmSchluss: anteil(erleben),        // Ziel 25–40 % (Basis Blindvergleich 62 %)
    koerperfrageAmSchluss: anteil(koerper),         // Ziel ≤ 10 %  (Basis 29 %)
    koerperfrageIrgendwo: anteil(koerperIrgendwo),
    ohneFrageAmSchluss: anteil(ohneFrage),          // Einladung + keine Öffnung (Zielwert nach E2 entfallen)
    laengsteSerie: serie,                           // jede Form, auch die Restklasse — nur zur Ansicht
    laengsteErlebensSerie: erlebensSerie,           // Ziel ≤ 2 (PRV-12d)
    groessteForm: n ? FORMEN.map(f => [f, zaehler[f] / n]).sort((a, b) => b[1] - a[1])[0] : null,   // Ziel: keine über 45 %
  };
}

/** Aus Transkripten (Runner): je Sample die sichtbaren Antworten der Begleitung.
 *  PRV-12d: Feste Vorgeschichte (`vorlauf: true`) zählt nicht — sie ist Drehbuch,
 *  keine Wahl des Modells (rev-int: 54 von 194 «anderen Fragen» waren Vorlauf). */
export function antwortenAus(transkript) {
  return (transkript || []).filter(m => m && m.role === "assistant" && !m.hidden && !m.vorlauf).map(m => m.content);
}
export function vielfaltAusTranskripten(transkripte) {
  return vielfalt((transkripte || []).map(antwortenAus));
}

/** PRV-12f · Längste Folge von Antworten, an deren Schluss eine Erlebens-Tür
 *  steht (Erlebens- oder Körperfrage, auch als Tür im Doppelangebot) — mit den
 *  Schlussfragen dieser Folge als Beleg. Bei Gleichstand die erste. */
export function erlebensSerie(antworten) {
  let best = { laenge: 0, schluesse: [] }, lauf = [];
  for (const text of antworten || []) {
    if (!String(text ?? "").trim()) continue;
    const r = schlussform(text);
    if (r.tueren.includes("erleben") || r.tueren.includes("koerper")) {
      const s = saetze(text).slice(-2).filter(x => /\?/.test(x));
      lauf.push(s.at(-1) || "");
      if (lauf.length > best.laenge) best = { laenge: lauf.length, schluesse: [...lauf] };
    } else lauf = [];
  }
  return best;
}

const pct = x => (x == null ? "–" : Math.round(x * 100) + " %");
/** Tabelle für die Konsole. */
export function vielfaltTabelle(v, titel = "Vielfalt") {
  if (!v || !v.antworten) return titel + ": keine Antworten.";
  const z = [`${titel} · ${v.antworten} Antworten`];
  z.push("  Schlussform        Anteil   Anzahl");
  for (const f of FORMEN) z.push("  " + f.padEnd(18) + pct(v.anteile[f]).padStart(6) + String(v.formen[f]).padStart(9));
  z.push(`  Erlebensfrage am Schluss (inkl. Körper, inkl. Tür im Doppelangebot): ${pct(v.erlebensfrageAmSchluss)}   Ziel 25–40 %`);
  z.push(`  Körperfrage am Schluss: ${pct(v.koerperfrageAmSchluss)}   Ziel ≤ 10 %   (irgendwo in der Antwort: ${pct(v.koerperfrageIrgendwo)})`);
  // E2 (10.11.): Im Chat endet der Zug — eine Antwort fuehrt weiter. Der fruehere
  // Zielwert "≥ 20 % ohne Frage" ist entfallen; gezaehlt wird stattdessen, wie
  // oft eine EINLADUNG die Frage ersetzt, und wie oft gar nichts offen bleibt.
  z.push(`  Einladung statt Frage: ${pct(v.anteile.einladung)}   ·   ohne jede Öffnung: ${pct(v.anteile.keineOeffnung)}   (E2: soll selten sein)`);
  z.push(`  längste Serie mit Erlebens-Tür am Schluss: ${v.laengsteErlebensSerie}   Ziel ≤ 2   ·   längste Serie gleicher Form: ${v.laengsteSerie.laenge}${v.laengsteSerie.form ? " × " + v.laengsteSerie.form : ""}`);
  return z.join("\n");
}

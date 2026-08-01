// Abschluss-Wächter (S99.3, verallgemeinert in S100.2) —
// eine Nachricht, die FRAGT, übergibt nicht die Regie.
//
// Befund aus einem echten Verlauf (Reflexionsgespräch): Auf "[CLOSE SESSION]"
// antwortete die Begleitung mit der Gabelung ("Magst du das für dich behalten,
// oder gibt es etwas davon, das Bernd erreichen soll? Ich kann dir drei Wege
// anbieten …") UND dem TIMELINE-BLOCK in derselben Nachricht. Der Block setzt
// die Session auf "finished", der Composer weicht dem Ausgang (S93) — die Frage
// stand da, aber es gab kein Feld mehr, um sie zu beantworten. Eine Gabelung,
// die man nicht nehmen kann, ist schlimmer als keine: Sie nennt die Türen und
// verschließt sie im selben Atemzug.
//
// S100 · DASSELBE PRINZIP, DREIMAL GEFUNDEN. Die Regel steht seit S72 auch in
// der Auflösung ("eine Nachricht, die nach Zustimmung fragt, trägt NIE eine
// Aufdeck-Marke") und seit S98 in der Qualitätszeit ("fragen UND gleichzeitig
// abschließen ist ein Verstoß") — jedes Mal nach einem eigenen Fehlverlauf
// entdeckt, jedes Mal neu formuliert. Der gemeinsame Grund: Marken und Blöcke
// geben die Führung an die App ab. Danach zeigt sie, öffnet sie oder schließt
// sie — und die Schreibkante ist weg oder überschrieben.
//
// Dieser Wächter deckt die ABSCHLUSS-Familie ab: Reflexionsgespräch
// (TIMELINE-BLOCK) und Qualitätszeit (MOMENT-BLOCK). Die Aufdeck-Marken der
// Auflösung bewacht weiterhin aufdeck-waechter.js — ihre Dramaturgie hat
// eigene Bedingungen (Tafel schon gezeigt? im Aufdeck-Pfad?), die hier nichts
// zu suchen haben.
//
// ZWEI ENGFÜHRUNGEN, damit er nur dort urteilt, wo er zuständig ist:
//
//   1. NUR MIT BLOCK. Ohne den Abschluss-Block endet nichts — dann darf
//      gefragt werden, so viel die Dramaturgie verlangt.
//   2. NUR NACH EINEM ABSCHLUSS-ANLASS — aber das gilt NICHT für jede Session,
//      und der Unterschied ist keine Nachlässigkeit:
//        · TIMELINE-BLOCK hat ZWEI Anlässe. Der zweite ist "[CHECKPOINT]", und
//          dort verlangt der Prompt ausdrücklich ZUERST den Block und DANACH
//          das Wiederanknüpfen ("wir waren bei … — magst du da weitermachen?").
//          Diese Frage ist richtig; ohne die Prüfung würde der Wächter jede
//          Wiederaufnahme revidieren.
//        · MOMENT-BLOCK hat NUR den Abschluss-Anlass — und er kommt auch
//          VERBAL ("lass uns Schluss machen"), also ganz ohne Steuertext. Eine
//          Anlass-Prüfung würde dort genau die Fälle durchlassen, um die es
//          geht. Deshalb: `anlassNoetig: false`.
//
// Schlimmster Fehlalarm: ein rhetorisches Fragezeichen im Landungssatz kostet
// EINE Revisionsrunde — dieselbe dokumentierte Toleranz wie beim Aufdeck- und
// Urteils-Wächter.

/** Der Abschluss-Steuertext ist sprachinvariant (prompts.de.js = prompts.en.js). */
export const ABSCHLUSS_TOKEN = "[CLOSE SESSION]";

/** Blockkörper entfernen: Ein Fragezeichen IM JSON (etwa in "summary") ist
 *  Inhalt der Chronik, keine Frage an die Person. */
export function ohneBlock(text, name = "TIMELINE-BLOCK") {
  return String(text || "").replace(new RegExp(name + "[\\s\\S]*?END " + name, "g"), " ");
}

/** Trägt der Text den Abschluss-Block dieser Session? */
export function hatBlock(text, name = "TIMELINE-BLOCK") {
  return new RegExp("\\b" + name + "\\b").test(String(text || ""));
}

/** Steht in DIESER Sitzung ein Abschluss an? Erkennbar am Steuertext, den die
 *  App gesendet hat — er kommt nur über den Abschluss-Knopf herein. */
export function abschlussAngefordert(messages, token = ABSCHLUSS_TOKEN) {
  const tok = token || ABSCHLUSS_TOKEN;
  return (messages || []).some(m =>
    m && m.role === "user" && String(m.content || "").includes(tok));
}

/** Fragt der sichtbare Teil der Nachricht etwas? */
export function findetFrage(text, blockName) {
  return ohneBlock(text, blockName).includes("?");
}

// Deutscher Rückfall für Aufrufer ohne Korpus (ältere Tests, Werkzeuge) —
// derselbe Bau wie AUFDECK_REVISION und URTEILS_REVISION.
export const ABSCHLUSS_REVISION =
  "[SYSTEM-REVISION: Deine letzte Nachricht stellt eine Frage UND schließt die Sitzung " +
  "(Abschluss-Block). Mit dem Block endet die Sitzung sofort — die Person kann dann nichts " +
  "mehr antworten. Wiederhole die Nachricht OHNE den Block: erst die Gabelung bzw. deine " +
  "Frage, und warte auf die Antwort. Der Block folgt in einer SPÄTEREN Nachricht, zusammen " +
  "mit dem würdigenden Schlusssatz und ohne jede Frage.]";

/**
 * Validator für die Abschluss-Familie (Engine-Hook `validiereAntwort`):
 * liefert die Revisions-Nachricht oder null.
 *
 * @param {string} text
 * @param {{messages?:object[], token?:string, revision?:string,
 *          block?:string, anlassNoetig?:boolean}} [ctx]
 */
export function pruefeAbschlussAntwort(text, ctx = {}) {
  const block = ctx.block || "TIMELINE-BLOCK";
  if (!hatBlock(text, block)) return null;
  const anlassNoetig = ctx.anlassNoetig !== false;
  if (anlassNoetig && !abschlussAngefordert(ctx.messages, ctx.token)) return null;
  return findetFrage(text, block) ? (ctx.revision || ABSCHLUSS_REVISION) : null;
}

/* S101 · Dieselbe Regel, andere Form der Übergabe: die AUFDECK-MARKE.
   Die Auflösung trägt die Regel seit S72 im Prompt ("die Frage und die Marke
   stehen NIE in derselben Nachricht") — bewacht war sie nie. Der Aufdeck-
   Wächter prüft etwas anderes (wiedergegebene Stapel-Inhalte) und steigt bei
   gesetzter Marke sogar ausdrücklich aus. Genau der Fall, der hier zählt, fiel
   also durch beide Netze.
   Warum das teurer ist als beim Abschluss: Die Marke ist der Startschuss für
   die Tafel. Steht die Zustimmungsfrage daneben, ist aufgedeckt, bevor jemand
   ja sagen konnte — und ein Okay, das erst danach käme, wäre keins mehr.
   NUR die Aufdeck-Marken. Panel-Marken ([[SLIDERS]], [[RANKING]], …) übergeben
   auch die Regie, lassen den Composer aber stehen; dort ist eine Frage in
   derselben Nachricht unschön, nicht folgenschwer. Ohne Befund kein Wächter. */
export const AUFDECK_MARKEN = /\[\[REVEAL(-A|-B)?\]\]/;

export const MARKEN_REVISION =
  "[SYSTEM-REVISION: Deine letzte Nachricht stellt eine Frage UND setzt eine Aufdeck-Marke. " +
  "Mit der Marke zeigt die App die Tafel — die Frage käme zu spät, und ein Okay danach wäre keins. " +
  "Wiederhole die Nachricht OHNE Marke: erst die Frage, dann warte auf die Antwort. Die Marke " +
  "folgt in einer SPÄTEREN Nachricht, allein in der letzten Zeile.]";

/**
 * Validator für die Aufdeckung (Engine-Hook `validiereAntwort`).
 * @param {string} text
 * @param {{marke?:RegExp, revision?:string}} [ctx]
 */
export function pruefeMarkenAntwort(text, ctx = {}) {
  const re = ctx.marke || AUFDECK_MARKEN;
  const t = String(text || "");
  if (!re.test(t)) return null;
  const ohne = t.replace(new RegExp(re.source, "g"), " ");
  return ohne.includes("?") ? (ctx.revision || MARKEN_REVISION) : null;
}

/* S103 · Regie-Übergabe Nummer VIER: [[META-REVEALED]].
   Der Lauf vom 2026-07-30 (MRV-01/1) zeigte die Marke am Ende der ERSTEN
   Nachricht — bevor die Aufdeckung überhaupt erzählt war — und nicht allein in
   der letzten Zeile. Die Prompt-Regel dazu ist seit S89 ausführlich ("beende
   diese Nachricht mit der Marke allein auf der letzten Zeile – kündige sie nie
   an"); bewacht war sie nie.
   Diese Marke trägt eine Bedingung MEHR als die Aufdeck-Marken: Sie muss allein
   in der letzten Zeile stehen. Grund ist derselbe wie überall — sie ist die
   Übergabe, und was nach ihr steht, spricht die App bereits über eine Runde,
   die sie schon verbucht hat.
   NICHT hier geprüft: "keine META-REFLECTION im Kontext ⇒ Marke nicht setzen"
   (MRV-02/C3). Das ist eine Aussage über den KONTEXT, den ein Antwort-Wächter
   nicht sieht — sie braucht eine andere Bauart. */
export const META_MARKE = /\[\[META-REVEALED\]\]/;

export const META_PLATZ_REVISION =
  "[SYSTEM-REVISION: Deine letzte Nachricht setzt [[META-REVEALED]], aber nicht allein in der " +
  "letzten Zeile. Die Marke ist die Übergabe an die App: Was nach ihr steht, kommt zu spät. " +
  "Wiederhole die Nachricht so, dass die Marke ALLEIN auf der letzten Zeile steht — und nur, " +
  "wenn du die Aufdeckung in DIESER Nachricht bereits erzählt hast.]";

/**
 * Prüft Vorhandensein UND Platz der Meta-Marke.
 * @param {string} text
 * @param {{marke?:RegExp, revision?:string, frageRevision?:string}} [ctx]
 */
export function pruefeMetaMarke(text, ctx = {}) {
  const re = ctx.marke || META_MARKE;
  const t = String(text || "");
  if (!re.test(t)) return null;
  // Zuerst die gemeinsame Invariante: fragen und übergeben in einer Nachricht.
  const frage = pruefeMarkenAntwort(t, { marke: re, revision: ctx.frageRevision });
  if (frage) return frage;
  // Dann der Platz: letzte nicht-leere Zeile MUSS die Marke allein tragen.
  const zeilen = t.split(/\r?\n/).map(z => z.trim()).filter(z => z.length);
  const letzte = zeilen[zeilen.length - 1] || "";
  const alleinDort = re.test(letzte) && letzte.replace(re, "").trim() === "";
  const nurEinmal = (t.match(new RegExp(re.source, "g")) || []).length === 1;
  return (alleinDort && nurEinmal) ? null : (ctx.revision || META_PLATZ_REVISION);
}

/* S105.3 · Kette für die ÜBERGABE-Prüfung.
   Gleiche Bauart wie waechterKette, andere Bedeutung des Ergebnisses: Ein
   Treffer heisst nicht mehr "schreib die Antwort neu", sondern "fuehre die
   Uebergabe nicht aus". Der Text bleibt in jedem Fall stehen.
   Der Rueckgabewert ist ein kurzer Grund — er wandert nicht ins Gespraech,
   sondern nur in den Chat-Zustand, damit Oberflaeche und Tests ihn sehen. */
export function uebergabeKette(pruefer) {
  const liste = (pruefer || []).filter(p => typeof p === "function");
  return (text, engine) => {
    for (const p of liste) {
      const grund = p(text, engine);
      if (grund) return grund;
    }
    return null;
  };
}

/* S100.3 · Wächter-Kette.
   Vier Sessions hielten je eine handgeschriebene ||-Kette samt Kommentar zur
   Reihenfolge. Der Gewinn der Liste ist nicht die Zeilenersparnis, sondern die
   Beantwortbarkeit: "Welche Wächter hat diese Session?" ist eine Frage an die
   Daten, nicht an vier Funktionsrümpfe.
   Die Reihenfolge bleibt bedeutsam — die Engine gewährt genau EINE
   Revisionsrunde je Antwort (Vertrag 2), also gewinnt der erste Treffer, und
   der spezifischere Wächter steht vorn. */
export function waechterKette(waechter) {
  const liste = (waechter || []).filter(w => typeof w === "function");
  return (text, engine) => {
    for (const w of liste) {
      const revision = w(text, engine);
      if (revision) return revision;
    }
    return null;
  };
}

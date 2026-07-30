// Abschluss-Wächter (S99.3) — eine Nachricht, die FRAGT, beendet die Sitzung nicht.
//
// Befund aus einem echten Verlauf: Auf "[CLOSE SESSION]" antwortete die
// Begleitung mit der Gabelung ("Magst du das für dich behalten, oder gibt es
// etwas davon, das Bernd erreichen soll? Ich kann dir drei Wege anbieten …")
// UND dem TIMELINE-BLOCK in derselben Nachricht. Der Block setzt die Session
// auf "finished", der Composer weicht dem Ausgang (S93) — die Frage stand da,
// aber es gab kein Feld mehr, um sie zu beantworten. Eine Gabelung, die man
// nicht nehmen kann, ist schlimmer als keine: Sie nennt die Türen und
// verschließt sie im selben Atemzug.
//
// Die Prompt-Regel (ZWEI SCHRITTE, wie sie die Qualitätszeit seit S98 kennt)
// ist die erste Verteidigung; dieser Wächter ist die zweite. Er löst genau eine
// SYSTEM-REVISION aus (Engine-Vertrag 2) und lässt die zweite Antwort passieren.
//
// ZWEI ENGFÜHRUNGEN, damit er nur dort urteilt, wo er zuständig ist:
//
//   1. NUR MIT BLOCK. Ohne TIMELINE-BLOCK endet nichts — dann darf gefragt
//      werden, so viel die Dramaturgie verlangt.
//   2. NUR NACH EINEM ABSCHLUSS-ANLASS. Der zweite Anlass des Blocks ist
//      "[CHECKPOINT]": Dort verlangt der Prompt ausdrücklich ZUERST den Block
//      und DANACH das Wiederanknüpfen ("wir waren bei … — magst du da
//      weitermachen?"). Diese Frage ist richtig, und ohne diese Prüfung würde
//      der Wächter sie bei jeder Wiederaufnahme revidieren.
//
// Schlimmster Fehlalarm: ein rhetorisches Fragezeichen im Landungssatz kostet
// EINE Revisionsrunde — dieselbe dokumentierte Toleranz wie beim Aufdeck- und
// Urteils-Wächter.

/** Der Abschluss-Steuertext ist sprachinvariant (prompts.de.js = prompts.en.js). */
export const ABSCHLUSS_TOKEN = "[CLOSE SESSION]";

/** Blockkörper entfernen: Ein Fragezeichen IM JSON (etwa in "summary") ist
 *  Inhalt der Chronik, keine Frage an die Person. */
export function ohneZeitleistenBlock(text) {
  return String(text || "").replace(/TIMELINE-BLOCK[\s\S]*?END TIMELINE-BLOCK/g, " ");
}

/** Trägt der Text einen TIMELINE-BLOCK? */
export function hatZeitleistenBlock(text) {
  return /\bTIMELINE-BLOCK\b/.test(String(text || ""));
}

/** Steht in DIESER Sitzung ein Abschluss an? Erkennbar am Steuertext, den die
 *  App gesendet hat — er kommt nur über den Abschluss-Knopf herein. */
export function abschlussAngefordert(messages, token = ABSCHLUSS_TOKEN) {
  const tok = token || ABSCHLUSS_TOKEN;
  return (messages || []).some(m =>
    m && m.role === "user" && String(m.content || "").includes(tok));
}

/** Fragt der sichtbare Teil der Nachricht etwas? */
export function findetFrage(text) {
  return ohneZeitleistenBlock(text).includes("?");
}

// Deutscher Rückfall für Aufrufer ohne Korpus (ältere Tests, Werkzeuge) —
// derselbe Bau wie AUFDECK_REVISION und URTEILS_REVISION.
export const ABSCHLUSS_REVISION =
  "[SYSTEM-REVISION: Deine letzte Nachricht stellt eine Frage UND schließt die Sitzung " +
  "(TIMELINE-BLOCK). Mit dem Block endet die Sitzung sofort — die Person kann dann nichts " +
  "mehr antworten. Wiederhole die Nachricht OHNE den Block: erst die Gabelung bzw. deine " +
  "Frage, und warte auf die Antwort. Der Block folgt in einer SPÄTEREN Nachricht, zusammen " +
  "mit dem würdigenden Schlusssatz und ohne jede Frage.]";

/**
 * Validator für soloDef (Engine-Hook `validiereAntwort`):
 * liefert die Revisions-Nachricht oder null.
 *
 * @param {string} text
 * @param {{messages?:object[], token?:string, revision?:string}} [ctx]
 */
export function pruefeAbschlussAntwort(text, ctx = {}) {
  if (!hatZeitleistenBlock(text)) return null;
  if (!abschlussAngefordert(ctx.messages, ctx.token)) return null;
  return findetFrage(text) ? (ctx.revision || ABSCHLUSS_REVISION) : null;
}

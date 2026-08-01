// Krisen-Wächter (S103) — die Reihenfolge im geteilten Raum.
//
// Befund aus dem Lauf vom 2026-07-30 (KRIS-02/3): Die Begleitung würdigt warm
// und nennt die Telefonseelsorge — aber sie verweist Anna NICHT in den
// geschützten Einzelraum und führt das Gespräch vor Bernd weiter.
//
// Der Baustein `krisenVorrangGemeinsam` schreibt seit Langem beides vor, und
// zwar in dieser Reihenfolge: ZUERST der Verweis in den eigenen Raum ("dafür
// ist dein eigener Raum da — dort bin ich ganz für dich, und was du dort sagst,
// bleibt dort"), DANN die professionelle Krisenhilfe. Bewacht war die Regel
// nie — dasselbe Muster wie bei der Regie-Übergabe: eine Regel, die dasteht und
// trotzdem gerissen wird.
//
// WARUM DIE REIHENFOLGE ZÄHLT: Die Nummer allein schickt die Person nach
// draußen, ohne ihr den Ort zu zeigen, an dem sie HIER sprechen kann — vor dem
// Partner, wo ein ehrliches Wort ohnehin schwer ist. Der Einzelraum ist das,
// was diese App anzubieten hat; die Krisenhilfe ist das, was sie nicht ersetzt.
//
// NUR IM GETEILTEN RAUM. Im eigenen Raum ist die Person schon dort, wo der
// Verweis hinführen würde — dort wäre die Prüfung sinnlos und der Wächter
// stünde nur im Weg.
//
// NICHT geprüft: der Partner-Auftrag ("du musst jetzt nichts tun außer da
// sein"). Ob ein Satz an den Partner eine Rolle verteilt oder ihn bloß würdigt,
// hängt am Ton, nicht an Wörtern — das gehört in den Prompt (dort steht es),
// nicht in eine Textprüfung, die im Zweifel das Würdigen mitverbietet.

/** Nennungen professioneller Krisenhilfe. Die Nummer ist der harte Anker; die
 *  Wörter fangen Fälle, in denen sie sinngemäß genannt wird. */
export const KRISENHILFE = /0800\s*111\s*0\s*111|Telefonseelsorge|Krisendienst|crisis line|helpline/i;

/** Verweise auf den geschützten Einzelraum. Bewusst großzügig: Ein Wächter, der
 *  hier zu eng liest, revidiert richtige Antworten. */
export const EINZELRAUM = /eigene[nrms]?\s+Raum|eigenen\s+Raum|Einzelraum|dein\s+Raum|deinem\s+Raum|individual\s+space|own\s+space|your\s+own\s+room/i;

export const KRISEN_REIHENFOLGE_REVISION =
  "[SYSTEM-REVISION: Du nennst professionelle Krisenhilfe, aber der Verweis in den geschützten " +
  "Einzelraum fehlt oder steht dahinter. Im geteilten Raum gilt IMMER beides, in dieser " +
  "Reihenfolge: ZUERST der eigene Raum (dort bist du ganz für die Person, und was dort gesagt " +
  "wird, bleibt dort), DANN die Krisenhilfe als nächster Schritt. Die Krisenhilfe ersetzt den " +
  "Verweis nicht. Wiederhole die Nachricht mit beidem in der richtigen Reihenfolge.]";

/* S105.3 · VORWAERTS statt rueckwaerts.
   Bis hierher pruefte dieser Waechter die fertige Antwort und liess sie neu
   schreiben. Beides passt nicht mehr: Zurueckgenommen wird nichts, und
   verweigern laesst sich hier nichts — der Fehler steckt im gesprochenen Text
   (die Nummer ohne den Verweis in den eigenen Raum), nicht in einer Uebergabe.
   Also greift die App VORHER: Traegt die Nachricht der Person Krisensignale,
   bekommt das Modell fuer GENAU DIESEN Zug einen Satz mit auf den Weg, der die
   Regel in Erinnerung ruft. Sie steht laengst im Korpus — ein Prompt von 30.000
   Zeichen macht sie vorhanden, aber nicht praesent.
   Die Erkennung darf grosszuegig sein: Ein grundloser Zusatzsatz kostet ein
   paar unsichtbare Zeilen. Eine uebersehene Krisenlage kostet mehr. */
export const KRISEN_SIGNALE =
  // Wortanfaenge ohne Endgrenze: deutsche Beugung haengt an ("ritze", "ritzt",
  // "selbstverletzendes"). Eine Endgrenze liess genau die Formen durch, in
  // denen Menschen tatsaechlich sprechen.
  /\bsuizid|\bselbstmord|\bumbringen|nicht mehr leben|nicht mehr weiterleben|sterben will|\britz(e|t|en|est)\b|\bselbst ?verletz|weg sein wollen|keinen sinn mehr|am ende sein|self-harm|\bsuicid|kill myself|end it all/i;

/**
 * Schärfung für den geteilten Raum (Engine-Hook `schaerfe`).
 * Liefert den Zusatztext oder null.
 *
 * @param {object[]} messages — Verlauf inkl. der eben eingegangenen Nachricht
 * @param {{text?:string}} [ctx]
 */
export function krisenSchaerfung(messages, ctx = {}) {
  const letzte = [...(messages || [])].reverse().find(m => m && m.role === "user");
  const text = String((letzte && letzte.content) || "");
  if (!KRISEN_SIGNALE.test(text)) return null;
  return ctx.text || KRISEN_SCHAERFUNG;
}

export const KRISEN_SCHAERFUNG =
  "[APP-HINWEIS für diesen Zug: In der Nachricht klingt eine mögliche Krise an. Es gilt die " +
  "Reihenfolge des geteilten Raumes: ZUERST der Verweis in den eigenen Raum (dort bist du ganz " +
  "für die Person, und was dort gesagt wird, bleibt dort), DANN professionelle Krisenhilfe als " +
  "nächster Schritt. Die Krisenhilfe ersetzt den Verweis nicht. Der Partner bekommt keinen " +
  "Auftrag für die Sicherheit der anderen Person.]";

/**
 * Validator für die geteilten Räume (Engine-Hook `validiereAntwort`).
 * Schweigt, solange keine Krisenhilfe genannt wird.
 *
 * @param {string} text
 * @param {{revision?:string}} [ctx]
 */
export function pruefeKrisenReihenfolge(text, ctx = {}) {
  const t = String(text || "");
  const hilfe = t.search(KRISENHILFE);
  if (hilfe < 0) return null;                       // kein Anlass, kein Urteil
  const raum = t.search(EINZELRAUM);
  if (raum >= 0 && raum < hilfe) return null;       // Reihenfolge stimmt
  return ctx.revision || KRISEN_REIHENFOLGE_REVISION;
}

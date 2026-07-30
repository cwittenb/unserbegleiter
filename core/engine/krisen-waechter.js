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

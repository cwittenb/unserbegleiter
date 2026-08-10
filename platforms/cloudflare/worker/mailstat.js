// Mail-Befunde (S118) — wie oft ist ein Versand gelungen, wie oft gescheitert,
// und woran zuletzt.
//
// Der Anlass ist ein Betriebsfund: Der HELO-Name war nicht qualifiziert, jeder
// Adress-Versand starb bei RCPT, und das blieb unentdeckt. Nicht weil es keine
// Spur gab — `console.error("verify-mail:", …)` schrieb sie brav ins Log —
// sondern weil ein Log nur findet, wer schon einen Verdacht hat. Ein
// Sicherheitsnetz, dessen Reißen niemandem auffällt, ist keines.
//
// Grundsätze, in derselben Linie wie tokenstat.js:
//   · Best-Effort. Ein Fehler beim Notieren blockiert NIE den Versand.
//     Beobachtung ist kein Vertragsbestandteil.
//   · Ein Satz je Ereignis statt Read-Modify-Write (F4). KV kennt kein
//     atomares Increment; lesen zwei Aufrufe denselben Stand, überschreibt der
//     zweite den ersten. Zwei gleichzeitige Mails sind in einer Paar-App kein
//     theoretischer Fall — die Broadcast-Schleife schickt sie sogar der Reihe
//     nach an alle. Jeder Satz bekommt deshalb einen eigenen Schlüssel.
//   · KEINE Empfängeradressen. Nicht im Schlüssel, nicht im Inhalt. Der Zweck
//     dieser Zahlen ist „funktioniert der Weg", nicht „wer hat Post bekommen" —
//     eine Betreiber-Liste von Adressen mit Zeitstempeln wäre ein
//     Metadaten-Einblick, den die Grundprämissen nicht hergeben. Aus demselben
//     Grund steht auch kein Paar-Code darin.
//   · Selbstverfall über TTL. Die Sätze sind Betriebsbeobachtung, kein
//     Archiv — nach MAILSTAT_TAGE Tagen sind sie weg, ohne dass jemand
//     aufräumen muss.
//
// KV-Entitäten (System-Namensraum):
//   sys/mailstat/<YYYY-MM-DD>/<zufall> → { ok, zweck, meldung?, stufe?, at }

import { randomToken } from "./util.js";

export const MAILSTAT_PRAEFIX = "sys/mailstat/";
export const MAILSTAT_TAGE = 30;

export const mailTag = ms => new Date(ms).toISOString().slice(0, 10);

/** Notiert einen Versandbefund. Wirft nie — der Aufrufer ist mitten im
 *  Versandweg und darf daran nicht scheitern. */
export async function notiereMail(kv, now, { ok, zweck, fehler }) {
  try {
    const at = now();
    const satz = { ok: !!ok, zweck: String(zweck || "?"), at };
    if (!ok && fehler) {
      // Nur Stufe und Meldung — die Meldung stammt aus dem SMTP-Dialog bzw.
      // der Konfigurationsprüfung und enthält keine Adresse.
      if (fehler.stufe) satz.stufe = String(fehler.stufe);
      if (fehler.smtpCode) satz.smtpCode = Number(fehler.smtpCode);
      satz.meldung = String(fehler.message || fehler).slice(0, 300);
    }
    await kv.put(MAILSTAT_PRAEFIX + mailTag(at) + "/" + randomToken(6), JSON.stringify(satz),
      { expirationTtl: MAILSTAT_TAGE * 24 * 60 * 60 });
  } catch { /* Beobachtung darf den Versand nie brechen */ }
}

/** Tagesweise Summen, jüngster Tag zuerst, plus der letzte Fehlschlag im
 *  Zeitraum — der ist die eigentliche Auskunft: „woran hakt es gerade". */
export async function leseMailStat(kv) {
  const tage = new Map();
  let letzterFehler = null;
  let cursor;
  do {
    const r = await kv.list({ prefix: MAILSTAT_PRAEFIX, cursor });
    for (const k of r.keys) {
      const satz = await kv.get(k.name, "json").catch(() => null);
      if (!satz) continue;                               // R2.3: ein fehlender Satz reißt nicht die Liste mit
      const tag = k.name.slice(MAILSTAT_PRAEFIX.length).split("/")[0];
      const e = tage.get(tag) || { tag, ok: 0, fehler: 0 };
      if (satz.ok) e.ok++; else e.fehler++;
      tage.set(tag, e);
      if (!satz.ok && (!letzterFehler || satz.at > letzterFehler.at)) letzterFehler = satz;
    }
    cursor = r.list_complete ? undefined : r.cursor;
  } while (cursor);
  return {
    tage: [...tage.values()].sort((a, b) => (a.tag < b.tag ? 1 : -1)),
    letzterFehler,
  };
}

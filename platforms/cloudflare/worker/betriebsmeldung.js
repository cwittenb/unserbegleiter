// S120 · Betriebsmeldungen — der Kanal, auf dem eine Störung ankommt.
//
// Der Anlass steht in S117/S118: Der HELO-Name war monatelang falsch, jeder
// Adress-Versand starb, und niemand merkte es. S118 hat die Werkzeuge gebaut,
// um NACHZUSEHEN. Dieses Modul ist der Schritt davor: gemeldet wird von selbst.
//
// Warum nicht per Mail? Weil die erste und häufigste Störung genau der
// Mailversand ist. Eine Störungsmeldung, die über den gestörten Weg läuft,
// kommt zuverlässig dann nicht an, wenn sie gebraucht wird.
//
// Der Kanal ist eine austauschbare Schicht — dieselbe Trennung wie beim
// Mailer und beim LLM-Adapter. Heute Telegram (ein einziger HTTP-Aufruf,
// keine Abhängigkeit, landet auf dem Telefon); ntfy oder ein Webhook wären
// eine Funktion daneben.
//
// Drei Regeln, und alle drei sind der Grund, warum das ein eigenes Modul ist:
//
// 1 · NIEMALS NUTZERINHALTE. Eine Betriebsmeldung sagt, DASS etwas klemmt und
//     WO — Zweck, Stufe, Antwortcode, Anzahl. Nie, wem. Der Aufrufer trägt
//     dafür die Verantwortung, aber Verantwortung allein hat noch nie etwas
//     verhindert: `ohneAdressen()` fischt E-Mail-Adressen und Zugangslinks
//     auch dann heraus, wenn jemand sie versehentlich in eine Meldung packt.
//     Ein Netz unter dem Vorsatz.
//
// 2 · GEDROSSELT. Ein kaputtes SMTP erzeugt eine Störung je Versuch. Ohne
//     Deckel wären das hundert Nachrichten in einer Stunde, und die
//     hundertzweite liest niemand mehr. Je Schlüssel eine Meldung pro Fenster
//     (Vorgabe: eine Stunde) — der Schlüssel benennt die ART der Störung,
//     nicht ihr Auftreten.
//
// 3 · BEST-EFFORT. `melde` wirft nie. Der Aufrufer steckt mitten in einem
//     Request; eine gescheiterte Benachrichtigung darf ihn nicht mitreißen.
//     Das ist dieselbe Linie wie bei mailstat.js: Beobachtung ist kein
//     Vertragsbestandteil.

export const MELDUNG_PRAEFIX = "sys/meldung/";
export const MELDUNG_FENSTER_S = 60 * 60;

/** Entfernt, was nach einer Person aussieht — Adressen und Zugangslinks. */
export function ohneAdressen(text) {
  return String(text)
    .replace(/[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+/g, "‹adresse›")
    .replace(/https?:\/\/\S*#t=\S+/g, "‹zugangslink›");
}

/** Ist ein Kanal eingerichtet? Ohne Konfiguration bleibt alles still — das
 *  ist kein Fehler, sondern der Zustand vor der Einrichtung. */
export function meldewegBereit(env) {
  return !!(env && env.TELEGRAM_TOKEN && env.TELEGRAM_CHAT);
}

async function sendeTelegram(env, text) {
  const r = await fetch("https://api.telegram.org/bot" + env.TELEGRAM_TOKEN + "/sendMessage", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chat_id: env.TELEGRAM_CHAT,
      text,
      disable_web_page_preview: true,
    }),
  });
  if (!r.ok) throw new Error("Telegram " + r.status + ": " + (await r.text()).slice(0, 200));
}

function baueText({ schwere, betreff, text }) {
  const zeichen = schwere === "info" ? "·" : "!";
  return zeichen + " raumzuzweit · " + ohneAdressen(betreff) + "\n" + ohneAdressen(text || "");
}

/**
 * Meldet eine Betriebsstörung. Wirft nie.
 * @param {object} env
 * @param {{schluessel: string, betreff: string, text?: string, schwere?: "info"|"stoerung", fensterS?: number}} m
 * @returns {Promise<boolean>} ob tatsächlich gesendet wurde (für Tests)
 */
export async function melde(env, m) {
  try {
    if (!meldewegBereit(env)) return false;
    const kv = env.PAARE;
    const schluessel = MELDUNG_PRAEFIX + String(m.schluessel || m.betreff);
    if (kv) {
      // Der Deckel steht VOR dem Senden: lieber eine Meldung zu wenig als ein
      // Schwall. Wer nachsehen will, hat /api/mailstat.
      if (await kv.get(schluessel)) return false;
      await kv.put(schluessel, "1", { expirationTtl: m.fensterS || MELDUNG_FENSTER_S });
    }
    await sendeTelegram(env, baueText(m));
    return true;
  } catch {
    return false;                       // Beobachtung darf keinen Request brechen
  }
}

/** Für den Prüfknopf in der Verwaltung: sendet ohne Drosselung und gibt den
 *  Befund zurück, statt ihn zu schlucken — hier IST der Fehler die Auskunft. */
export async function pruefeMeldeweg(env) {
  if (!meldewegBereit(env))
    return { ok: false, meldung: "Kein Meldeweg eingerichtet (TELEGRAM_TOKEN und TELEGRAM_CHAT fehlen)." };
  try {
    await sendeTelegram(env, baueText({
      schwere: "info",
      betreff: "Meldeweg geprüft",
      text: "Diese Nachricht stammt aus der Verwaltung. Sie bedeutet: der Kanal funktioniert.",
    }));
    return { ok: true };
  } catch (e) {
    return { ok: false, meldung: (e && e.message) || String(e) };
  }
}

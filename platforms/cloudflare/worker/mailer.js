// Mailer-Adapter — trennt die Wiedereinstiegs-LOGIK von der VERSANDART, genau
// wie callClaude die LLM-Logik vom Provider trennt. Dadurch ist der Versand
// austauschbar (SMTP jetzt; nativer Cloudflare-Email-Binding oder HTTP-API
// später als Einzeiler) und die Logik mit einem Fake-Sender testbar.
//
// Testpfad/Bridge: Service-Binding MAIL_UPSTREAM (wie env.UPSTREAM beim LLM-Proxy)
//   → der Worker POSTet die Nachricht dorthin; im Test fängt ein Mock sie ab.
// Echter Weg: SMTP über die Workers-Socket-API. Wichtig: Port 25 ist in Workers
//   gesperrt; 587 (STARTTLS) und 465 (implizites TLS) sind der Weg. Diese
//   Übertragungsschicht ist deploy-verifiziert (gegen echten SMTP), nicht Teil
//   der Unit-Suite — dort läuft immer der MAIL_UPSTREAM-Pfad.

// Statischer Import des Runtime-Moduls; im Build als `external` markiert, damit
// der Bundler es nicht aufzulösen versucht. workerd stellt es zur Laufzeit bereit.
import { connect } from "cloudflare:sockets";
import { notiereMail } from "./mailstat.js";

/* S118 · Der Befund wird HIER notiert, nicht an den fuenf Aufrufstellen.
 *
 * Der Grund ist nicht Bequemlichkeit: eine Beobachtung, die man an jeder
 * Aufrufstelle von Hand mitschreiben muss, fehlt genau an der sechsten. Der
 * Mailer ist die einzige Stelle, durch die jeder Versand geht — also gehoert
 * sie dorthin. `zweck` ist der einzige Zusatz, den die Aufrufer beisteuern:
 * "pin", "recover", "resend", "relink", "broadcast".
 *
 * env.PAARE ist im Betrieb immer da; in Unit-Tests mit gestelltem env nicht.
 * Fehlt es, wird nichts notiert und nichts beklagt — Beobachtung ist kein
 * Vertragsbestandteil. */
export function makeMailer(env, zweck) {
  const notiere = async (ok, fehler) => {
    if (env && env.PAARE) await notiereMail(env.PAARE, Date.now, { ok, zweck, fehler });
  };
  return {
    async sendMail(msg) {
      try {
        if (env && env.MAIL_UPSTREAM) {
          const r = await env.MAIL_UPSTREAM.fetch("http://mail/send", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(msg),
          });
          if (!r.ok) throw new Error("Mail-Upstream " + r.status);
        } else {
          await sendSmtp(env, msg);
        }
      } catch (e) {
        await notiere(false, e);
        throw e;                                   // der Befund aendert am Ablauf nichts
      }
      await notiere(true, null);
    },
  };
}

/* ============ SMTP-Übertragung (deploy-verifiziert) ============ */

function rfcDate(d = new Date()) {
  return d.toUTCString().replace("GMT", "+0000");
}

export function baueNachricht({ to, from, subject, text }) {   // exportiert (S66): reine Funktion, unit-testbar
  const enc = s => "=?UTF-8?B?" + btoa(unescape(encodeURIComponent(s))) + "?=";
  const koerper = String(text).replace(/\r?\n/g, "\r\n").replace(/\n\./g, "\n..");
  return [
    "From: " + from,
    "To: " + to,
    "Subject: " + enc(subject),
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset=utf-8',
    "Date: " + rfcDate(),
    "",
    koerper,
  ].join("\r\n");
}

/* S117 · Der HELO-Name muss ein qualifizierter Hostname sein.
 *
 * Bis hierher stand woertlich "EHLO paarbegleitung" im Dialog. Postfix weist
 * das mit reject_non_fqdn_helo_hostname ab — und zwar, weil die Regel an der
 * Empfaenger-Stufe ausgewertet wird, erst bei RCPT:
 *   504 5.5.2 <paarbegleitung>: Helo command rejected: need fully-qualified
 *   hostname (nach RCPT)
 * Das EHLO selbst kam noch mit 250 durch, der Dialog lief bis kurz vor die
 * Nachricht, und JEDER Adress-Versand ist dort gestorben. Sichtbar war davon
 * nichts ausser "Der Versand ist gerade nicht moeglich" — die Ursache stand
 * allein im wrangler-tail.
 *
 * Die Reihenfolge der Kandidaten hat einen Grund:
 *   1. SMTP_HELO — falls der Provider einen bestimmten Namen erwartet.
 *   2. Die Domain aus SMTP_FROM — die konventionell richtige Wahl: HELO-Name
 *      und Absenderdomain sollten zusammenpassen.
 *   3. SMTP_HOST — per Definition ein FQDN, taugt als letzte Rueckfalllinie.
 * Traegt keiner davon einen Punkt, wird fail-closed geworfen statt in
 * denselben 504 zu laufen — dieselbe Linie wie bei Port 25 und fehlender
 * Konfiguration. */
export function heloName(env, from) {
  for (const roh of [env.SMTP_HELO, String(from || "").split("@")[1], env.SMTP_HOST]) {
    const v = String(roh || "").trim();
    if (v.includes(".") && !/\s/.test(v)) return v;
  }
  throw new Error("SMTP_HELO fehlt \u2014 kein qualifizierter Hostname ableitbar. "
    + "SMTP_HELO setzen oder SMTP_FROM/SMTP_HOST mit einer Domain versehen.");
}

async function sendSmtp(env, { to, subject, text }, opt = {}) {
  const host = env.SMTP_HOST;
  const port = Number(env.SMTP_PORT || 587);
  const user = env.SMTP_USER;
  const pass = env.SMTP_PASS;
  const from = env.SMTP_FROM || user;
  if (!host || !user || !pass) throw new Error("SMTP nicht konfiguriert (SMTP_HOST/SMTP_USER/SMTP_PASS).");
  if (port === 25) throw new Error("Port 25 ist in Workers gesperrt — bitte 587 (STARTTLS) oder 465 (TLS).");

  // VOR dem Verbindungsaufbau: ein Konfigurationsfehler soll keinen Socket
  // kosten und keine halbe SMTP-Sitzung hinterlassen.
  const helo = heloName(env, from);

  const implicit = port === 465;  let socket = connect(
    { hostname: host, port },
    { secureTransport: implicit ? "on" : "starttls", allowHalfOpen: false }
  );

  const enc = new TextEncoder();
  const dec = new TextDecoder();
  /* Die Spur ist fuer Menschen, die einen Fehlschlag lesen muessen. Sie haelt
     NUR Stufe und Antwortcode — kein Kennwort, keine Benutzerkennung, keine
     Empfaengeradresse. Was hier landet, kann gefahrlos in einer Admin-Antwort
     stehen. */
  const spur = [];
  let writer = socket.writable.getWriter();
  let reader = socket.readable.getReader();
  let puffer = "";

  async function lies() {
    // Liest bis zu einer vollständigen Antwort ("NNN " am Anfang der letzten Zeile).
    for (;;) {
      const zeilen = puffer.split(/\r?\n/);
      for (let i = 0; i < zeilen.length - 1; i++) {
        const z = zeilen[i];
        if (/^\d{3} /.test(z)) {
          const code = Number(z.slice(0, 3));
          puffer = zeilen.slice(i + 1).join("\n");
          return { code, text: z };
        }
      }
      const { value, done } = await reader.read();
      if (done) throw new Error("SMTP-Verbindung vorzeitig beendet.");
      puffer += dec.decode(value, { stream: true });
    }
  }
  /* S118 · Der Fehler traegt jetzt Struktur, nicht nur Text.
     Die Meldung bleibt wortgleich (Tests und Logs haengen daran), aber Stufe
     und SMTP-Code stehen als Felder daneben — die Selbstpruefung soll
     "gescheitert bei RCPT" sagen koennen, ohne die Meldung zu zerlegen.
     `marke` benennt die Stufe dort, wo es keinen Befehl gibt (Begruessung und
     die Quittung nach dem Punkt). */
  async function sag(befehl, erwartet, marke) {
    const stufe = marke || (befehl ? befehl.split(" ")[0] : "?");
    if (befehl !== null) await writer.write(enc.encode(befehl + "\r\n"));
    const r = await lies();
    spur.push({ stufe, code: r.code });
    if (erwartet && Math.floor(r.code / 100) !== erwartet)
      throw Object.assign(
        new Error("SMTP " + r.code + ": " + r.text + (befehl ? " (nach " + befehl.split(" ")[0] + ")" : "")),
        { smtpCode: r.code, stufe, spur: [...spur] });
    return r;
  }

  try {
    await sag(null, 2, "BEGRUESSUNG");
    await sag("EHLO " + helo, 2);

    if (!implicit) {
      await sag("STARTTLS", 2);
      reader.releaseLock(); writer.releaseLock();
      socket = socket.startTls();
      writer = socket.writable.getWriter();
      reader = socket.readable.getReader();
      puffer = "";
      await sag("EHLO " + helo, 2);
    }

    /* Die Marke "AUTH" ist hier kein Schmuck: ohne sie waere die Stufe der
       BEFEHL selbst — also die base64-kodierte Kennung und das base64-kodierte
       Kennwort. Die Spur geht in eine Admin-Antwort; dort hat beides nichts
       verloren. */
    await sag("AUTH LOGIN", 3, "AUTH");
    await sag(btoa(user), 3, "AUTH");
    await sag(btoa(pass), 2, "AUTH");

    await sag("MAIL FROM:<" + (env.SMTP_FROM || user) + ">", 2);
    await sag("RCPT TO:<" + to + ">", 2);
    /* S118 · Die Selbstpruefung faehrt denselben Dialog, hoert aber vor DATA
       auf: RCPT ist die Stufe, an der die HELO-Regel zuschlaegt (Postfix wertet
       sie verzoegert aus), und bis hierher ist alles geprueft, was schiefgehen
       kann, ohne dass jemand eine Mail bekommt. RSET raeumt die begonnene
       Transaktion sauber ab, statt sie am Socket-Ende verwaisen zu lassen. */
    if (opt.nurDialog) {
      await sag("RSET", 2).catch(() => {});
      await sag("QUIT", 2).catch(() => {});
      return spur;
    }
    await sag("DATA", 3);
    await writer.write(enc.encode(baueNachricht({ to, from, subject, text }) + "\r\n.\r\n"));
    await sag(null, 2, "NACHRICHT");
    await sag("QUIT", 2).catch(() => {});
    return spur;
  } finally {
    try { writer.releaseLock(); } catch { /* egal */ }
    try { reader.releaseLock(); } catch { /* egal */ }
    try { await socket.close(); } catch { /* egal */ }
  }
}

/* ============ S118 · Selbstprüfung des Versandwegs ============
 *
 * Der Anlass ist ein Betriebsfund: Der HELO-Name war seit jeher nicht
 * qualifiziert, jeder Adress-Versand starb bei RCPT — und das blieb
 * unentdeckt, weil eine Störung nirgends auffällt. Nach außen stand immer nur
 * „Der Versand ist gerade nicht möglich"; die Ursache lag allein im
 * `wrangler tail`, wo niemand hinsieht, solange er keinen Verdacht hat.
 *
 * Diese Funktion ist die Antwort darauf: der Weg lässt sich auf Knopfdruck
 * durchspielen, und der Befund nennt die Stufe.
 *
 * Zwei Betriebsarten:
 *   · `senden: false` (Standard) — voller Dialog bis RCPT, dann RSET/QUIT.
 *     Prüft Verbindung, STARTTLS, HELO-Regel, Anmeldung, Absender und
 *     Empfänger, OHNE dass jemand eine Mail bekommt. Das ist der Normalfall:
 *     eine Prüfung, die etwas verschickt, wird seltener benutzt.
 *   · `senden: true` — echter Versand einer kurzen Testnachricht. Nötig nur,
 *     wenn der Verdacht hinter DATA liegt (Größe, Header, Inhaltsfilter).
 *
 * Rückgabe statt Wurf: der Aufrufer will den Befund in BEIDEN Fällen, nicht
 * nur im guten. Geworfen wird hier nichts.
 */
export async function pruefeVersand(env, { to, senden } = {}) {
  const ziel = String(to || "").trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(ziel))
    return { ok: false, weg: "keiner", stufe: "EINGABE", meldung: "Keine gültige Zieladresse." };

  // Testpfad/Bridge: dort gibt es keinen SMTP-Dialog zu prüfen — das ehrlich
  // sagen, statt einen grünen Befund über einen Weg zu melden, den es im
  // Betrieb nicht gibt.
  if (env && env.MAIL_UPSTREAM) {
    if (!senden) return { ok: true, weg: "upstream", spur: [], hinweis: "MAIL_UPSTREAM aktiv — kein SMTP-Dialog." };
    try {
      await makeMailer(env).sendMail({ to: ziel, subject: TEST_BETREFF, text: TEST_TEXT });
      return { ok: true, weg: "upstream", spur: [], gesendet: true };
    } catch (e) {
      return { ok: false, weg: "upstream", stufe: "UPSTREAM", meldung: e && e.message };
    }
  }

  let helo = null;
  try {
    helo = heloName(env, env && (env.SMTP_FROM || env.SMTP_USER));
  } catch (e) {
    // Konfigurationsfehler VOR dem Socket — genau der Fall, der monatelang
    // unsichtbar war. Er soll als erstes im Befund stehen.
    return { ok: false, weg: "smtp", stufe: "HELO", meldung: e && e.message };
  }

  try {
    const spur = await sendSmtp(env, { to: ziel, subject: TEST_BETREFF, text: TEST_TEXT }, { nurDialog: !senden });
    return { ok: true, weg: "smtp", helo, spur, gesendet: !!senden };
  } catch (e) {
    return {
      ok: false, weg: "smtp", helo,
      stufe: (e && e.stufe) || "?",
      smtpCode: e && e.smtpCode,
      spur: (e && e.spur) || [],
      meldung: (e && e.message) || String(e),
    };
  }
}

const TEST_BETREFF = "raumzuzweit · Versandpruefung";
const TEST_TEXT = "Diese Nachricht stammt aus der Selbstpruefung des Versandwegs. "
  + "Sie bedeutet: der Weg funktioniert. Es ist nichts zu tun.";

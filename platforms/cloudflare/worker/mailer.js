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

export function makeMailer(env) {
  return {
    async sendMail(msg) {
      if (env && env.MAIL_UPSTREAM) {
        const r = await env.MAIL_UPSTREAM.fetch("http://mail/send", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(msg),
        });
        if (!r.ok) throw new Error("Mail-Upstream " + r.status);
        return;
      }
      await sendSmtp(env, msg);
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

async function sendSmtp(env, { to, subject, text }) {
  const host = env.SMTP_HOST;
  const port = Number(env.SMTP_PORT || 587);
  const user = env.SMTP_USER;
  const pass = env.SMTP_PASS;
  const from = env.SMTP_FROM || user;
  if (!host || !user || !pass) throw new Error("SMTP nicht konfiguriert (SMTP_HOST/SMTP_USER/SMTP_PASS).");
  if (port === 25) throw new Error("Port 25 ist in Workers gesperrt — bitte 587 (STARTTLS) oder 465 (TLS).");

  const implicit = port === 465;
  let socket = connect(
    { hostname: host, port },
    { secureTransport: implicit ? "on" : "starttls", allowHalfOpen: false }
  );

  const enc = new TextEncoder();
  const dec = new TextDecoder();
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
  async function sag(befehl, erwartet) {
    if (befehl !== null) await writer.write(enc.encode(befehl + "\r\n"));
    const r = await lies();
    if (erwartet && Math.floor(r.code / 100) !== erwartet)
      throw new Error("SMTP " + r.code + ": " + r.text + (befehl ? " (nach " + befehl.split(" ")[0] + ")" : ""));
    return r;
  }

  try {
    await sag(null, 2);                                   // Begrüßung
    await sag("EHLO paarbegleitung", 2);

    if (!implicit) {
      await sag("STARTTLS", 2);
      reader.releaseLock(); writer.releaseLock();
      socket = socket.startTls();
      writer = socket.writable.getWriter();
      reader = socket.readable.getReader();
      puffer = "";
      await sag("EHLO paarbegleitung", 2);
    }

    await sag("AUTH LOGIN", 3);
    await sag(btoa(user), 3);
    await sag(btoa(pass), 2);

    await sag("MAIL FROM:<" + (env.SMTP_FROM || user) + ">", 2);
    await sag("RCPT TO:<" + to + ">", 2);
    await sag("DATA", 3);
    await writer.write(enc.encode(baueNachricht({ to, from, subject, text }) + "\r\n.\r\n"));
    await sag(null, 2);
    await sag("QUIT", 2).catch(() => {});
  } finally {
    try { writer.releaseLock(); } catch { /* egal */ }
    try { reader.releaseLock(); } catch { /* egal */ }
    try { await socket.close(); } catch { /* egal */ }
  }
}

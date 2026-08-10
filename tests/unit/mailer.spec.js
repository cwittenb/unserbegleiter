// mailer.js unter Test (S66) — bislang die einzige echte Null-Abdeckung im
// Sicherheitsnetz (Magic-Link-/PIN-Versand, S45). Der cloudflare:sockets-Import
// läuft über den Vitest-Alias auf den skriptbaren Stub; der MAIL_UPSTREAM-Pfad
// braucht ihn nicht (Service-Binding-Mock wie in den Miniflare-Tests).

import { describe, it, expect } from "vitest";
import { makeMailer, baueNachricht, heloName, pruefeVersand } from "../../platforms/cloudflare/worker/mailer.js";
import { setzeSmtpSkript, gesendet } from "../fixtures/cloudflare-sockets-stub.js";

const MSG = { to: "anna@example.org", subject: "Zugang", text: "Hallo Anna,\nhier dein Link." };

describe("Mailer · MAIL_UPSTREAM-Pfad (Test-/Bridge-Binding)", () => {
  it("POSTet die Nachricht als JSON an das Binding", async () => {
    const anfragen = [];
    const env = { MAIL_UPSTREAM: { fetch: async (url, init) => { anfragen.push({ url, init }); return { ok: true }; } } };
    await makeMailer(env).sendMail(MSG);
    expect(anfragen).toHaveLength(1);
    expect(anfragen[0].url).toBe("http://mail/send");
    expect(anfragen[0].init.method).toBe("POST");
    // S120 · Die Gestalt entsteht im Mailer und reist ueber jeden Weg mit —
    // der Klartext bleibt unveraendert daneben stehen.
    const gesendetMsg = JSON.parse(anfragen[0].init.body);
    expect(gesendetMsg).toMatchObject(MSG);
    expect(gesendetMsg.html).toContain("<!doctype html>");
  });

  it("Nicht-ok-Antwort des Upstreams wird zum Fehler (Status in der Meldung)", async () => {
    const env = { MAIL_UPSTREAM: { fetch: async () => ({ ok: false, status: 502 }) } };
    await expect(makeMailer(env).sendMail(MSG)).rejects.toThrow("Mail-Upstream 502");
  });
});

describe("Mailer · SMTP-Konfigurationsfehler (fail-closed, kein stiller Fallback)", () => {
  it("ohne SMTP_HOST/USER/PASS: klare Fehlermeldung", async () => {
    await expect(makeMailer({}).sendMail(MSG)).rejects.toThrow(/SMTP nicht konfiguriert/);
    await expect(makeMailer({ SMTP_HOST: "h", SMTP_USER: "u" }).sendMail(MSG)).rejects.toThrow(/SMTP nicht konfiguriert/);
  });

  it("Port 25 wird abgewiesen (in Workers gesperrt) — mit Hinweis auf 587/465", async () => {
    const env = { SMTP_HOST: "h", SMTP_USER: "u", SMTP_PASS: "p", SMTP_PORT: "25" };
    await expect(makeMailer(env).sendMail(MSG)).rejects.toThrow(/Port 25.*587.*465/);
  });
});

describe("Mailer · baueNachricht (RFC-Ränder)", () => {
  it("UTF-8-kodierter Betreff, Pflicht-Header, base64-Rumpf", () => {
    const roh = baueNachricht({ to: "a@x", from: "b@y", subject: "Grüße ✓", text: "Zeile1\n.Punktzeile\nEnde" });
    const [kopf, koerper] = [roh.slice(0, roh.indexOf("\r\n\r\n")), roh.slice(roh.indexOf("\r\n\r\n") + 4)];
    expect(kopf).toContain("From: b@y");
    expect(kopf).toContain("To: a@x");
    expect(kopf).toContain("Subject: =?UTF-8?B?");            // Nicht-ASCII → kodiert
    expect(kopf).toContain("MIME-Version: 1.0");
    expect(kopf).toMatch(/Date: .+\+0000/);
    /* S120 · Die zwei Anmerkungen aus einer echten empfangenen Mail:
       MISSING_MID und CTE_8BIT_MISMATCH, zusammen 1,5 Spam-Punkte. */
    expect(kopf).toMatch(/Message-ID: <.+@y>/);
    expect(kopf).toContain("Content-Transfer-Encoding: base64");
    /* Der Rumpf ist base64 — und damit ist das Dot-Stuffing ERSATZLOS
       entfallen: das base64-Alphabet kennt keinen Punkt, eine Zeile, die den
       Versand vorzeitig beendet, kann es nicht mehr geben. Die CRLF-Normali-
       sierung passiert weiterhin, nur eben vor der Kodierung. */
    expect(atob(koerper.replace(/\r\n/g, ""))).toContain("\r\n.Punktzeile");
    expect(koerper).not.toContain("..Punktzeile");
  });

  /* S120 · Anzeigename: Bis hierher stand im Posteingang die nackte
     Absenderadresse. Wer den Zugangslink bekommt, hat die App noch nie
     gesehen — der Name ist das Erste, was von ihr ankommt. */
  it("setzt den Anzeigenamen und kodiert ihn nur, wenn nötig", () => {
    const a = baueNachricht({ to: "a@x", from: "b@y", subject: "s", text: "t", absenderName: "raumzuzweit" });
    expect(a).toContain('From: "raumzuzweit" <b@y>');
    const b = baueNachricht({ to: "a@x", from: "b@y", subject: "s", text: "t", absenderName: "Raum zu zweit ✓" });
    expect(b).toMatch(/From: =\?UTF-8\?B\?.+\?= <b@y>/);
  });

  it("mit Gestalt wird es multipart/alternative — der Klartext bleibt die erste Fassung", () => {
    const roh = baueNachricht({ to: "a@x", from: "b@y", subject: "s", text: "Hallo", html: "<p>Hallo</p>" });
    expect(roh).toMatch(/Content-Type: multipart\/alternative; boundary="rz-/);
    const teile = roh.split(/--rz-[a-z0-9]+/);
    expect(teile[1]).toContain("text/plain");
    expect(teile[2]).toContain("text/html");
    expect(atob(teile[1].split("\r\n\r\n")[1].replace(/\r\n/g, ""))).toBe("Hallo");
  });
});

describe("Mailer · SMTP-Dialog gegen gescripteten Fake-Server", () => {
  const env465 = { SMTP_HOST: "smtp.example", SMTP_PORT: "465", SMTP_USER: "user", SMTP_PASS: "pass", SMTP_FROM: "noreply@example" };

  it("Happy Path (465, implizites TLS): EHLO → AUTH LOGIN → MAIL/RCPT/DATA → QUIT", async () => {
    setzeSmtpSkript([
      "220 bereit",            // Begrüßung
      "250 hallo",             // EHLO
      "334 user?",             // AUTH LOGIN
      "334 pass?",             // base64(user)
      "235 angemeldet",        // base64(pass)
      "250 ok",                // MAIL FROM
      "250 ok",                // RCPT TO
      "354 sende daten",       // DATA
      "250 angenommen",        // Nachrichtenkörper
      "221 tschüss",           // QUIT
    ]);
    await makeMailer(env465).sendMail(MSG);
    const dialog = gesendet().join("");
    // S117 · Der HELO-Name ist ein FQDN. Hier greift die dritte Stufe der
    // Ableitung: SMTP_FROM ist "noreply@example" — die Domain traegt keinen
    // Punkt, also uebernimmt SMTP_HOST.
    expect(dialog).toContain("EHLO smtp.example");
    expect(dialog, "der alte, nicht qualifizierte Name ist weg").not.toContain("EHLO paarbegleitung");
    expect(dialog).toContain("AUTH LOGIN");
    expect(dialog).toContain(btoa("user"));
    expect(dialog).toContain("MAIL FROM:<noreply@example>");
    expect(dialog).toContain("RCPT TO:<anna@example.org>");
    expect(dialog).toContain("\r\n.\r\n");                     // Datenende-Marke
    expect(dialog).toContain("QUIT");
  });

  it("Auth-Fehler (535) wird zum Fehler mit SMTP-Code und Befehls-Hinweis", async () => {
    setzeSmtpSkript(["220 bereit", "250 hallo", "334 user?", "334 pass?", "535 auth kaputt"]);
    await expect(makeMailer(env465).sendMail(MSG)).rejects.toThrow(/SMTP 535/);
  });

  it("vorzeitig beendete Verbindung wird als Fehler gemeldet (kein Hängen)", async () => {
    setzeSmtpSkript(["220 bereit"]);                            // danach schließt der Fake-Server
    await expect(makeMailer(env465).sendMail(MSG)).rejects.toThrow(/vorzeitig beendet/);
  });
});

/* S117 · Der HELO-Name. Der Betriebsfund, der diesen Test noetig gemacht hat:
   der Dialog sagte woertlich "EHLO paarbegleitung", und Postfix weist das mit
   reject_non_fqdn_helo_hostname ab — erst bei RCPT, weil die Regel dort
   ausgewertet wird. Jeder Adress-Versand starb an dieser Stelle, sichtbar nur
   im wrangler-tail. */
describe("Mailer · HELO-Name (S117)", () => {
  it("nimmt SMTP_HELO, wenn gesetzt — der Provider hat das letzte Wort", () => {
    expect(heloName({ SMTP_HELO: "mail.raumzuzweit.de", SMTP_HOST: "smtp.anders.de" }, "no@raumzuzweit.de"))
      .toBe("mail.raumzuzweit.de");
  });

  it("sonst die Domain der Absenderadresse — HELO und Absender sollen zusammenpassen", () => {
    expect(heloName({ SMTP_HOST: "smtp.provider.de" }, "noreply@raumzuzweit.de")).toBe("raumzuzweit.de");
  });

  it("sonst SMTP_HOST — per Definition ein FQDN", () => {
    expect(heloName({ SMTP_HOST: "smtp.provider.de" }, "noreply@localdomain")).toBe("smtp.provider.de");
  });

  it("ohne Punkt nirgends: fail-closed mit Ansage statt 504 im Betrieb", () => {
    expect(() => heloName({ SMTP_HOST: "localhost" }, "user")).toThrow(/SMTP_HELO/);
    // Und der Versand kommt gar nicht erst zum Socket.
    return expect(makeMailer({ SMTP_HOST: "localhost", SMTP_USER: "u", SMTP_PASS: "p" }).sendMail(MSG))
      .rejects.toThrow(/SMTP_HELO/);
  });

  it("Leerzeichen zaehlen nicht als Hostname", () => {
    expect(heloName({ SMTP_HELO: "kein hostname.de", SMTP_HOST: "smtp.provider.de" }, "a@b"))
      .toBe("smtp.provider.de");
  });
});

/* S118 · Die Selbstpruefung des Versandwegs — gegen den gescripteten
   Fake-Server, also derselbe Dialog wie im Betrieb.

   Warum das ueberhaupt existiert: Der HELO-Fehler aus S117 blieb monatelang
   unentdeckt, weil eine Stoerung nirgends auffiel. Die Pruefung ist die
   Stelle, an der man ohne Verdacht nachsehen kann. */
describe("Mailer · pruefeVersand (S118)", () => {
  const env465 = { SMTP_HOST: "smtp.example", SMTP_PORT: "465", SMTP_USER: "user", SMTP_PASS: "pass", SMTP_FROM: "noreply@raumzuzweit.de" };

  it("ohne gueltige Zieladresse gar kein Dialog", async () => {
    const b = await pruefeVersand(env465, { to: "kein-at" });
    expect(b.ok).toBe(false);
    expect(b.stufe).toBe("EINGABE");
  });

  /* Der Normalfall: voller Dialog bis RCPT, dann RSET/QUIT. Geprueft sind
     damit Verbindung, HELO-Regel, Anmeldung, Absender und Empfaenger — ohne
     dass jemand eine Mail bekommt. */
  it("prueft bis zum Empfaenger und verschickt dabei nichts", async () => {
    setzeSmtpSkript([
      "220 bereit", "250 hallo", "334 u", "334 p", "235 ok",
      "250 absender", "250 empfaenger", "250 rset", "221 tschuess",
    ]);
    const b = await pruefeVersand(env465, { to: "du@example.org" });
    expect(b.ok).toBe(true);
    expect(b.helo).toBe("raumzuzweit.de");
    expect(b.gesendet).toBe(false);
    const dialog = gesendet().join("");
    expect(dialog).toContain("RCPT TO:<du@example.org>");
    expect(dialog, "vor DATA ist Schluss").not.toContain("DATA");
    expect(dialog, "die begonnene Transaktion wird abgeraeumt").toContain("RSET");
  });

  /* Der Befund nennt die Stufe. Genau daran haette man den HELO-Fehler in
     zwei Sekunden gesehen, statt ihn im Tail zu suchen. */
  it("nennt bei Fehlschlag die Stufe und den SMTP-Code", async () => {
    setzeSmtpSkript([
      "220 bereit", "250 hallo", "334 u", "334 p", "235 ok",
      "250 absender",
      "504 5.5.2 <paarbegleitung>: Helo command rejected: need fully-qualified hostname",
    ]);
    const b = await pruefeVersand(env465, { to: "du@example.org" });
    expect(b.ok).toBe(false);
    expect(b.stufe).toBe("RCPT");
    expect(b.smtpCode).toBe(504);
    expect(b.meldung).toContain("fully-qualified");
  });

  /* Die Spur ist fuer Menschen gedacht, die einen Fehlschlag lesen muessen —
     und sie landet in einer Admin-Antwort. Was dort steht, muss gefahrlos
     sein: Stufen und Antwortcodes, kein Kennwort, keine Benutzerkennung. */
  it("die Spur traegt keine Geheimnisse", async () => {
    setzeSmtpSkript([
      "220 bereit", "250 hallo", "334 u", "334 p", "235 ok",
      "250 absender", "550 kein Empfaenger",
    ]);
    const b = await pruefeVersand(env465, { to: "du@example.org" });
    const roh = JSON.stringify(b.spur);
    expect(roh).not.toContain(btoa("pass"));
    expect(roh).not.toContain(btoa("user"));
    expect(roh).not.toContain("du@example.org");
    expect(b.spur.map(x => x.stufe)).toContain("AUTH");
  });

  it("ein Konfigurationsfehler kostet keinen Socket", async () => {
    const b = await pruefeVersand({ SMTP_HOST: "localhost", SMTP_USER: "u", SMTP_PASS: "p" }, { to: "du@example.org" });
    expect(b.ok).toBe(false);
    expect(b.stufe).toBe("HELO");
    expect(b.meldung).toMatch(/SMTP_HELO/);
  });
});

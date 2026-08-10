// S120 · Betriebsmeldungen und die Gestalt der Mails.
//
// Zwei Dinge, ein Sprint, weil sie denselben Ursprung haben: Was raumzuzweit
// nach außen schickt, war bisher weder gestaltet noch beobachtet. Der
// HELO-Fehler (S117) blieb monatelang unentdeckt, und die Mail, die ihn
// endlich passierte, sah aus wie ein Skript-Auswurf.
//
// Der Schwerpunkt dieser Datei liegt auf den Negativ-Aussagen. Bei einem
// Meldekanal ist das Gefährliche nicht, dass er schweigt — sondern dass er
// zu viel sagt: hundert Nachrichten bei einer Störung, oder eine einzige mit
// der Adresse einer Person darin.

import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import { melde, pruefeMeldeweg, ohneAdressen, meldewegBereit, MELDUNG_PRAEFIX }
  from "../../platforms/cloudflare/worker/betriebsmeldung.js";
import { baueHtml, MAIL_TOKEN } from "../../platforms/cloudflare/worker/mail-gestalt.js";
import { THEME_CSS } from "../../core/ui/theme.js";

/** Kleinster KV-Ersatz: Map mit get/put, TTL wird ignoriert (die Tests
 *  steuern das Fenster über den Inhalt, nicht über die Zeit). */
function kvAttrappe() {
  const m = new Map();
  return {
    m,
    async get(k) { return m.has(k) ? m.get(k) : null; },
    async put(k, v) { m.set(k, v); },
  };
}

let gesendet;
function envMit(extra) {
  gesendet = [];
  globalThis.fetch = vi.fn(async (url, init) => {
    gesendet.push({ url, body: JSON.parse(init.body) });
    return { ok: true, status: 200, text: async () => "" };
  });
  return { TELEGRAM_TOKEN: "geheim", TELEGRAM_CHAT: "4711", PAARE: kvAttrappe(), ...(extra || {}) };
}

/* Der Kanal ist ein einziger fetch — geprueft wird er, indem fetch ersetzt
   wird. Das Original kommt am Ende zurueck: ein global veraendertes fetch ist
   die Art Nebenwirkung, die man in einer anderen Datei sucht. */
const echtesFetch = globalThis.fetch;
beforeEach(() => { gesendet = []; });
afterAll(() => { globalThis.fetch = echtesFetch; });

describe("S120 · der Meldekanal schweigt, wenn er nicht eingerichtet ist", () => {
  it("ohne Konfiguration passiert nichts — das ist kein Fehler", async () => {
    globalThis.fetch = vi.fn();
    expect(meldewegBereit({})).toBe(false);
    expect(await melde({ PAARE: kvAttrappe() }, { schluessel: "x", betreff: "Test" })).toBe(false);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  /* Best-Effort: Der Aufrufer steckt mitten in einem Request. Eine
     gescheiterte Benachrichtigung darf ihn nicht mitreißen — dieselbe Linie
     wie bei mailstat.js. */
  it("ein kaputter Kanal wirft nicht", async () => {
    const env = envMit();
    globalThis.fetch = vi.fn(async () => { throw new Error("Netz weg"); });
    await expect(melde(env, { schluessel: "x", betreff: "Test" })).resolves.toBe(false);
  });
});

describe("S120 · der Deckel", () => {
  /* Ein kaputtes SMTP erzeugt eine Störung je Versuch. Ohne Drosselung wären
     das hundert Nachrichten in einer Stunde, und die hundertzweite liest
     niemand mehr. */
  it("dieselbe Störungsart meldet sich einmal je Fenster", async () => {
    const env = envMit();
    expect(await melde(env, { schluessel: "mail/RCPT", betreff: "Mailversand gestört" })).toBe(true);
    expect(await melde(env, { schluessel: "mail/RCPT", betreff: "Mailversand gestört" })).toBe(false);
    expect(await melde(env, { schluessel: "mail/RCPT", betreff: "Mailversand gestört" })).toBe(false);
    expect(gesendet).toHaveLength(1);
  });

  it("eine ANDERE Störungsart kommt trotzdem durch", async () => {
    const env = envMit();
    await melde(env, { schluessel: "mail/RCPT", betreff: "A" });
    await melde(env, { schluessel: "mail/AUTH", betreff: "B" });
    expect(gesendet).toHaveLength(2);
  });

  it("der Deckel steht vor dem Senden — lieber eine zu wenig als ein Schwall", async () => {
    const env = envMit();
    await melde(env, { schluessel: "mail/RCPT", betreff: "A" });
    expect(env.PAARE.m.has(MELDUNG_PRAEFIX + "mail/RCPT")).toBe(true);
  });
});

describe("S120 · niemals Nutzerinhalte", () => {
  it("Adressen und Zugangslinks werden herausgefischt", () => {
    expect(ohneAdressen("Zustellung an anna@example.org fehlgeschlagen"))
      .toBe("Zustellung an ‹adresse› fehlgeschlagen");
    expect(ohneAdressen("Link https://de.roomfortwo.app/#t=abc123 ging nicht"))
      .toBe("Link ‹zugangslink› ging nicht");
  });

  /* Das Netz unter dem Vorsatz: Auch wenn ein Aufrufer versehentlich eine
     Adresse in die Meldung packt, verlässt sie das System nicht. */
  it("greift auch dann, wenn der Aufrufer unachtsam war", async () => {
    const env = envMit();
    await melde(env, { schluessel: "x", betreff: "Fehler bei anna@example.org", text: "an bernd@example.org" });
    const text = gesendet[0].body.text;
    expect(text).not.toContain("anna@example.org");
    expect(text).not.toContain("bernd@example.org");
    expect(text).toContain("‹adresse›");
  });

  it("die Vorschau bleibt aus — ein Link im Text soll nichts nachladen", async () => {
    const env = envMit();
    await melde(env, { schluessel: "x", betreff: "Test" });
    expect(gesendet[0].body.disable_web_page_preview).toBe(true);
    expect(gesendet[0].url).toContain("/botgeheim/sendMessage");
  });
});

describe("S120 · der Prüfknopf", () => {
  it("meldet fehlende Einrichtung im Klartext statt still zu scheitern", async () => {
    const b = await pruefeMeldeweg({});
    expect(b.ok).toBe(false);
    expect(b.meldung).toContain("TELEGRAM_TOKEN");
  });

  it("gibt den Fehler zurück, statt ihn zu schlucken — hier IST er die Auskunft", async () => {
    const env = envMit();
    globalThis.fetch = vi.fn(async () => ({ ok: false, status: 401, text: async () => "unauthorized" }));
    const b = await pruefeMeldeweg(env);
    expect(b.ok).toBe(false);
    expect(b.meldung).toContain("401");
  });

  it("umgeht den Deckel — sonst prüfte man ihn statt des Kanals", async () => {
    const env = envMit();
    await pruefeMeldeweg(env);
    await pruefeMeldeweg(env);
    expect(gesendet).toHaveLength(2);
  });
});

describe("S120 · die Gestalt entsteht aus dem Text", () => {
  const mail = (text, extra) => baueHtml({ betreff: "Dein Bestätigungscode", text, ...(extra || {}) });

  it("erkennt den Bestätigungscode und setzt ihn gesperrt", () => {
    const h = mail("Dein Code lautet:\n\n067848\n\nEr gilt 15 Minuten.");
    expect(h).toMatch(/letter-spacing:\.22em[^>]*>067848</);
  });

  it("erkennt den Zugangslink und macht ihn anklickbar", () => {
    const h = mail("Hier ist dein Link:\n\nhttps://de.roomfortwo.app/#t=abc\n\nGültig 15 Minuten.");
    expect(h).toContain('<a href="https://de.roomfortwo.app/#t=abc"');
  });

  /* Der Grund für diesen Bau: Es gibt jeden Satz nur EINMAL, als i18n-
     Schlüssel. Ein freier Betreiber-Rundbrief bekommt die Gestalt geschenkt,
     ohne dass jemand eine Vorlage dafür anlegt. */
  it("ein freier Text bekommt dieselbe Gestalt, ohne eigene Vorlage", () => {
    const h = mail("Liebe Testenden,\n\nam Dienstag ist Wartung.\n\nViele Grüße");
    expect(h).toContain("am Dienstag ist Wartung.");
    expect(h).toContain("Liebe Testenden,");
  });

  it("schützt vor Auszeichnung im Text — auch der Rundbrief geht durch diese Tür", () => {
    const h = mail('<script>alert("x")</script>');
    expect(h).not.toContain("<script>");
    expect(h).toContain("&lt;script&gt;");
  });

  it("Marke und Fußzeile kommen in der Sprache des Paars herein", () => {
    const h = mail("Text", { marke: "roomfortwo", fuss: "Only sent on request." });
    expect(h).toContain("roomfortwo");
    expect(h).toContain("Only sent on request.");
  });

  /* Was bewusst fehlt: Bilder (werden blockiert), Webfonts (laden nicht),
     Radien und Schatten (gibt es in dieser Designsprache nicht). Übrig bleibt,
     was nicht kaputtgehen kann. */
  it("bringt nichts mit, was in Mailprogrammen zerbricht", () => {
    const h = mail("Text");
    expect(h).not.toContain("<img");
    expect(h).not.toContain("@import");
    expect(h).not.toMatch(/border-radius|box-shadow/);
    expect(h, "Tabellen, damit Outlook den Inhalt nicht über die Fensterbreite zieht").toContain("<table");
  });

  it("holt jede Farbe aus dem Theme, statt sie abzuschreiben", () => {
    for (const wert of [MAIL_TOKEN.papier, MAIL_TOKEN.ink, MAIL_TOKEN.hairline, MAIL_TOKEN.marke])
      expect(THEME_CSS, "der Wert steht so im Theme").toContain(wert);
    expect(mail("Text")).toContain(MAIL_TOKEN.papier);
  });
});

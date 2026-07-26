// R7 · Sprache der Worker-Mails.
//
// Push war seit je übersetzt (benachrichtigePartner liest paar.locale), die
// Mails nicht. Dieselbe Person bekam Push auf Englisch und ihren
// Bestätigungscode auf Deutsch.

import { describe, it, expect } from "vitest";
import { mailText } from "../../platforms/cloudflare/worker/mail-texte.js";
import { de } from "../../core/i18n/de.js";
import { en } from "../../core/i18n/en.js";

const SCHLUESSEL = ["mail.relink.betreff", "mail.relink.text", "mail.resend.betreff",
                    "mail.resend.text", "mail.recover.betreff", "mail.recover.text",
                    "mail.pin.betreff", "mail.pin.text"];

describe("R7 · mailText folgt paar.locale", () => {
  it("englisches Paar bekommt durchgehend die englischen Texte", () => {
    const t = mailText({ locale: "en" });
    for (const k of SCHLUESSEL) expect(t(k), k).toBe(en[k]);
  });

  it("deutsches Paar bekommt durchgehend die deutschen Texte", () => {
    const t = mailText({ locale: "de" });
    for (const k of SCHLUESSEL) expect(t(k), k).toBe(de[k]);
  });

  it("fehlende oder unbekannte Sprache fällt auf Deutsch zurück", () => {
    for (const paar of [null, {}, { locale: "fr" }, { locale: "" }])
      expect(mailText(paar)("mail.pin.betreff")).toBe(de["mail.pin.betreff"]);
  });
});

describe("R7 · Platzhalter", () => {
  it("{link} und {pin} werden gefüllt — in beiden Sprachen", () => {
    for (const locale of ["de", "en"]) {
      const t = mailText({ locale });
      expect(t("mail.resend.text", { link: "https://x.test/#t=abc" })).toContain("https://x.test/#t=abc");
      expect(t("mail.recover.text", { link: "https://x.test/#t=abc" })).toContain("https://x.test/#t=abc");
      expect(t("mail.pin.text", { pin: "123456" })).toContain("123456");
      // kein unaufgelöster Platzhalter mehr im Text
      expect(t("mail.pin.text", { pin: "123456" })).not.toMatch(/\{\w+\}/);
    }
  });

  it("fehlender Wert lässt den Platzhalter sichtbar stehen statt 'undefined' zu drucken", () => {
    expect(mailText({ locale: "de" })("mail.pin.text", {})).toContain("{pin}");
  });
});

describe("R7 · Parität und Eigenständigkeit", () => {
  it("alle acht Schlüssel liegen in beiden Wörterbüchern", () => {
    for (const k of SCHLUESSEL) {
      expect(k in de, "de: " + k).toBe(true);
      expect(k in en, "en: " + k).toBe(true);
    }
  });

  it("die englische Fassung ist wirklich übersetzt, nicht kopiert", () => {
    for (const k of SCHLUESSEL) expect(en[k], k).not.toBe(de[k]);
  });
});

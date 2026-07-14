// PIN-Verifikation der Wiedereinstiegs-Adresse (S45/S46) — Logik-Ebene mit
// Fake-KV, injizierter Uhr und echtem WebCrypto-Schlüssel. Der Worker-Pfad
// (Endpunkte, Mailversand) ist in tests/worker/recover.spec.js bewiesen; hier
// stehen die Fälle, die dort nicht erreichbar sind (Ablauf per Zeitreise) plus
// die Kerninvarianten — inkl. der S46-Verschlüsselung (D6).

import { describe, it, expect } from "vitest";
import { beginRecoveryEmail, confirmRecoveryEmail, hasRecoveryEmail,
         lookupRecovery, VERIFY_MS, VERIFY_MAX_VERSUCHE } from "../../platforms/cloudflare/worker/auth.js";
import { importEmailKey, entschluessele, emailAad } from "../../platforms/cloudflare/worker/krypto.js";

function fakeKv() {
  const m = new Map();
  return {
    async get(k) { return m.has(k) ? m.get(k) : null; },
    async put(k, v) { m.set(k, String(v)); },
    async delete(k) { m.delete(k); },
    _map: m,
  };
}

const KONTO = { code: "abc123", role: "A" };
const KEY_ENV = { EMAIL_KEY: "ab".repeat(32) };

async function key() { return importEmailKey(KEY_ENV); }

describe("PIN-Verifikation · Kerninvarianten", () => {
  it("erst die Bestätigung verankert Adresse UND Lookup — vorher zählt nichts", async () => {
    const kv = fakeKv();
    const { pin, email } = await beginRecoveryEmail(kv, KONTO, "  Anna@Example.COM ");
    expect(email).toBe("anna@example.com");                       // normalisiert
    expect(pin).toMatch(/^\d{6}$/);
    expect(await hasRecoveryEmail(kv, KONTO.code, KONTO.role)).toBe(false);
    expect(await lookupRecovery(kv, "anna@example.com")).toBe(null);   // D4: kein Lookup vor Bestätigung
    await confirmRecoveryEmail(kv, KONTO, { pin, email: "anna@example.com", emailKey: await key() });
    expect(await hasRecoveryEmail(kv, KONTO.code, KONTO.role)).toBe(true);
    expect(await lookupRecovery(kv, "anna@example.com")).toEqual(KONTO);
  });

  it("S46: die Bestätigung legt den kontogebundenen Ciphertext ab — entschlüsselbar nur mit AAD dieses Kontos", async () => {
    const kv = fakeKv();
    const { pin } = await beginRecoveryEmail(kv, KONTO, "anna@example.com");
    await confirmRecoveryEmail(kv, KONTO, { pin, email: "anna@example.com", emailKey: await key() });
    const eintrag = JSON.parse(await kv.get("sys/emailfor/abc123/A"));
    expect(eintrag.enc).toBeTruthy();
    expect(eintrag.enc.v).toBe(1);
    const klar = await entschluessele(await key(), eintrag.enc, emailAad("abc123", "A"));
    expect(klar).toBe("anna@example.com");
    // Fremdes Konto (anderes AAD) scheitert hart:
    await expect(entschluessele(await key(), eintrag.enc, emailAad("abc123", "B"))).rejects.toThrow();
  });

  it("weder PIN noch Klartext-Adresse werden je gespeichert", async () => {
    const kv = fakeKv();
    const { pin } = await beginRecoveryEmail(kv, KONTO, "anna@example.com");
    await confirmRecoveryEmail(kv, KONTO, { pin, email: "anna@example.com", emailKey: await key() });
    for (const v of kv._map.values()) {
      expect(v).not.toContain(pin);
      expect(v).not.toContain("anna@example.com");
    }
  });

  it("Bestätigung mit anderer Adresse als in Schritt 1 → email_mismatch (D6.1a-Bindung)", async () => {
    const kv = fakeKv();
    const { pin } = await beginRecoveryEmail(kv, KONTO, "anna@example.com");
    await expect(confirmRecoveryEmail(kv, KONTO, { pin, email: "boese@example.com", emailKey: await key() }))
      .rejects.toMatchObject({ code: "email_mismatch", status: 400 });
  });

  it("abgelaufener Code → pin_expired, offene Bestätigung wird geräumt (danach pin_none)", async () => {
    const kv = fakeKv();
    const t0 = 1_000_000;
    const { pin } = await beginRecoveryEmail(kv, KONTO, "anna@example.com", () => t0);
    const spaeter = () => t0 + VERIFY_MS + 1;
    const arg = { pin, email: "anna@example.com", emailKey: await key() };
    await expect(confirmRecoveryEmail(kv, KONTO, arg, spaeter)).rejects.toMatchObject({ code: "pin_expired", status: 410 });
    await expect(confirmRecoveryEmail(kv, KONTO, arg, spaeter)).rejects.toMatchObject({ code: "pin_none" });
  });

  it("Versuchszähler: nach VERIFY_MAX_VERSUCHE Fehlversuchen ist auch der richtige Code wertlos", async () => {
    const kv = fakeKv();
    const { pin } = await beginRecoveryEmail(kv, KONTO, "anna@example.com");
    const k = await key();
    const falsch = pin === "000000" ? "000001" : "000000";
    for (let i = 0; i < VERIFY_MAX_VERSUCHE - 1; i++)
      await expect(confirmRecoveryEmail(kv, KONTO, { pin: falsch, email: "anna@example.com", emailKey: k }))
        .rejects.toMatchObject({ code: "pin_wrong" });
    await expect(confirmRecoveryEmail(kv, KONTO, { pin: falsch, email: "anna@example.com", emailKey: k }))
      .rejects.toMatchObject({ code: "pin_tries", status: 429 });
    await expect(confirmRecoveryEmail(kv, KONTO, { pin, email: "anna@example.com", emailKey: k }))
      .rejects.toMatchObject({ code: "pin_none" });
  });

  it("Adresswechsel räumt den alten Lookup — die alte Adresse kann keinen Link mehr auslösen", async () => {
    const kv = fakeKv();
    const k = await key();
    const a = await beginRecoveryEmail(kv, KONTO, "alt@example.com");
    await confirmRecoveryEmail(kv, KONTO, { pin: a.pin, email: "alt@example.com", emailKey: k });
    const b = await beginRecoveryEmail(kv, KONTO, "neu@example.com");
    await confirmRecoveryEmail(kv, KONTO, { pin: b.pin, email: "neu@example.com", emailKey: k });
    expect(await lookupRecovery(kv, "alt@example.com")).toBe(null);
    expect(await lookupRecovery(kv, "neu@example.com")).toEqual(KONTO);
  });

  it("Kollision: fremdes Konto kann eine vergebene Adresse nicht einmal anfordern (409 in Schritt 1)", async () => {
    const kv = fakeKv();
    const a = await beginRecoveryEmail(kv, KONTO, "geteilt@example.com");
    await confirmRecoveryEmail(kv, KONTO, { pin: a.pin, email: "geteilt@example.com", emailKey: await key() });
    await expect(beginRecoveryEmail(kv, { code: "abc123", role: "B" }, "geteilt@example.com"))
      .rejects.toMatchObject({ code: "email_taken", status: 409 });
  });
});

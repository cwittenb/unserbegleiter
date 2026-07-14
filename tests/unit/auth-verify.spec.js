// PIN-Verifikation der Wiedereinstiegs-Adresse (S45) — Logik-Ebene mit
// Fake-KV und injizierter Uhr. Der Worker-Pfad (Endpunkte, Mailversand)
// ist in tests/worker/recover.spec.js bewiesen; hier stehen die Fälle,
// die dort nicht erreichbar sind (Ablauf per Zeitreise) plus die Kerninvarianten.

import { describe, it, expect } from "vitest";
import { beginRecoveryEmail, confirmRecoveryEmail, hasRecoveryEmail,
         lookupRecovery, VERIFY_MS, VERIFY_MAX_VERSUCHE } from "../../platforms/cloudflare/worker/auth.js";

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

describe("PIN-Verifikation · Kerninvarianten", () => {
  it("erst die Bestätigung verankert Adresse UND Lookup — vorher zählt nichts", async () => {
    const kv = fakeKv();
    const { pin, email } = await beginRecoveryEmail(kv, KONTO, "  Anna@Example.COM ");
    expect(email).toBe("anna@example.com");                       // normalisiert
    expect(pin).toMatch(/^\d{6}$/);
    expect(await hasRecoveryEmail(kv, KONTO.code, KONTO.role)).toBe(false);
    expect(await lookupRecovery(kv, "anna@example.com")).toBe(null);   // D4: kein Lookup vor Bestätigung
    await confirmRecoveryEmail(kv, KONTO, pin);
    expect(await hasRecoveryEmail(kv, KONTO.code, KONTO.role)).toBe(true);
    expect(await lookupRecovery(kv, "anna@example.com")).toEqual(KONTO);
  });

  it("die PIN selbst wird nie gespeichert, nur ihr Hash", async () => {
    const kv = fakeKv();
    const { pin } = await beginRecoveryEmail(kv, KONTO, "anna@example.com");
    for (const v of kv._map.values()) expect(v).not.toContain(pin);
  });

  it("abgelaufener Code → pin_expired, offene Bestätigung wird geräumt (danach pin_none)", async () => {
    const kv = fakeKv();
    const t0 = 1_000_000;
    const { pin } = await beginRecoveryEmail(kv, KONTO, "anna@example.com", () => t0);
    const spaeter = () => t0 + VERIFY_MS + 1;
    await expect(confirmRecoveryEmail(kv, KONTO, pin, spaeter)).rejects.toMatchObject({ code: "pin_expired", status: 410 });
    await expect(confirmRecoveryEmail(kv, KONTO, pin, spaeter)).rejects.toMatchObject({ code: "pin_none" });
  });

  it("Versuchszähler: nach VERIFY_MAX_VERSUCHE Fehlversuchen ist auch der richtige Code wertlos", async () => {
    const kv = fakeKv();
    const { pin } = await beginRecoveryEmail(kv, KONTO, "anna@example.com");
    const falsch = pin === "000000" ? "000001" : "000000";
    for (let i = 0; i < VERIFY_MAX_VERSUCHE - 1; i++)
      await expect(confirmRecoveryEmail(kv, KONTO, falsch)).rejects.toMatchObject({ code: "pin_wrong" });
    await expect(confirmRecoveryEmail(kv, KONTO, falsch)).rejects.toMatchObject({ code: "pin_tries", status: 429 });
    await expect(confirmRecoveryEmail(kv, KONTO, pin)).rejects.toMatchObject({ code: "pin_none" });
  });

  it("Adresswechsel räumt den alten Lookup — die alte Adresse kann keinen Link mehr auslösen", async () => {
    const kv = fakeKv();
    const a = await beginRecoveryEmail(kv, KONTO, "alt@example.com");
    await confirmRecoveryEmail(kv, KONTO, a.pin);
    const b = await beginRecoveryEmail(kv, KONTO, "neu@example.com");
    await confirmRecoveryEmail(kv, KONTO, b.pin);
    expect(await lookupRecovery(kv, "alt@example.com")).toBe(null);
    expect(await lookupRecovery(kv, "neu@example.com")).toEqual(KONTO);
  });

  it("Kollision: fremdes Konto kann eine vergebene Adresse nicht einmal anfordern (409 in Schritt 1)", async () => {
    const kv = fakeKv();
    const a = await beginRecoveryEmail(kv, KONTO, "geteilt@example.com");
    await confirmRecoveryEmail(kv, KONTO, a.pin);
    await expect(beginRecoveryEmail(kv, { code: "abc123", role: "B" }, "geteilt@example.com"))
      .rejects.toMatchObject({ code: "email_taken", status: 409 });
  });
});

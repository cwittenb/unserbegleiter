// Adress-Kryptografie (S46) — Baustein-Beweise: Roundtrip, Konto-Bindung (AAD),
// Manipulationsschutz (GCM), Konfigurationspflicht des Schlüssels.

import { describe, it, expect } from "vitest";
import { importEmailKey, verschluessele, entschluessele, emailAad } from "../../platforms/cloudflare/worker/krypto.js";

const ENV = { EMAIL_KEY: "ab".repeat(32) };

describe("krypto · AES-GCM mit Konto-Bindung", () => {
  it("Roundtrip: verschlüsseln → entschlüsseln liefert den Klartext; IV ist je Aufruf frisch", async () => {
    const key = await importEmailKey(ENV);
    const a = await verschluessele(key, "anna@example.com", emailAad("c1", "A"));
    const b = await verschluessele(key, "anna@example.com", emailAad("c1", "A"));
    expect(a.v).toBe(1);
    expect(a.iv).not.toBe(b.iv);                          // GCM-Pflicht: nie derselbe IV
    expect(a.ct).not.toBe(b.ct);
    expect(await entschluessele(key, a, emailAad("c1", "A"))).toBe("anna@example.com");
  });

  it("AAD-Bindung: derselbe Ciphertext scheitert unter fremdem code:role", async () => {
    const key = await importEmailKey(ENV);
    const blob = await verschluessele(key, "anna@example.com", emailAad("c1", "A"));
    await expect(entschluessele(key, blob, emailAad("c1", "B"))).rejects.toThrow();
    await expect(entschluessele(key, blob, emailAad("c2", "A"))).rejects.toThrow();
  });

  it("Manipulation am Ciphertext scheitert hart (authenticated encryption)", async () => {
    const key = await importEmailKey(ENV);
    const blob = await verschluessele(key, "anna@example.com", emailAad("c1", "A"));
    const kaputt = { ...blob, ct: blob.ct.slice(0, -4) + (blob.ct.endsWith("AAAA") ? "BBBB" : "AAAA") };
    await expect(entschluessele(key, kaputt, emailAad("c1", "A"))).rejects.toThrow();
  });

  it("falscher Schlüssel entschlüsselt nichts", async () => {
    const key = await importEmailKey(ENV);
    const fremd = await importEmailKey({ EMAIL_KEY: "cd".repeat(32) });
    const blob = await verschluessele(key, "anna@example.com", emailAad("c1", "A"));
    await expect(entschluessele(fremd, blob, emailAad("c1", "A"))).rejects.toThrow();
  });

  it("fehlender oder ungültiger EMAIL_KEY → klarer Konfigurationsfehler (kein stiller Fallback)", async () => {
    await expect(importEmailKey({})).rejects.toMatchObject({ code: "email_key_missing", status: 500 });
    await expect(importEmailKey({ EMAIL_KEY: "zukurz" })).rejects.toMatchObject({ code: "email_key_missing" });
    await expect(importEmailKey({ EMAIL_KEY: "gg".repeat(32) })).rejects.toMatchObject({ code: "email_key_missing" });
  });

  it("fehlender enc-Eintrag → no_email_enc (409) — der Resend-Verweigerungsgrund", async () => {
    const key = await importEmailKey(ENV);
    await expect(entschluessele(key, null, emailAad("c1", "A"))).rejects.toMatchObject({ code: "no_email_enc", status: 409 });
    await expect(entschluessele(key, undefined, emailAad("c1", "A"))).rejects.toMatchObject({ code: "no_email_enc" });
  });
});

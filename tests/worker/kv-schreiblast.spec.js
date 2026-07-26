// R6 · Schreiblast auf heißen KV-Schlüsseln — gemessen, nicht behauptet.
//
// Der Session-Schlüssel ist der heißeste Schlüssel des Systems: jede
// authentifizierte Anfrage berührt ihn. Beim Bildschirmaufbau feuert die App
// zwölf Anfragen parallel. Dieser Test zählt die Schreibvorgänge je Schlüssel
// und hält fest, dass eine Anfragenserie den Schlüssel nicht mehr bei jedem
// Mal beschreibt — bei unveränderter Ablauf-Semantik.

import { describe, it, expect } from "vitest";
import { requireSession, SESSION_MS, TOUCH_SCHWELLE_MS } from "../../platforms/cloudflare/worker/auth.js";

/** KV-Doppelgänger, der Schreibvorgänge je Schlüssel mitzählt. */
function zaehlendesKv(daten = {}) {
  const speicher = new Map(Object.entries(daten));
  const schreib = new Map();
  return {
    schreib,
    async get(k) { return speicher.has(k) ? speicher.get(k) : null; },
    async put(k, v) { schreib.set(k, (schreib.get(k) || 0) + 1); speicher.set(k, v); },
  };
}

const sitzung = (ablaufIn) => ({
  "sys/session/sid1": JSON.stringify({ code: "abc", role: "A", expiresAt: 1_000_000 + ablaufIn }),
});
const jetzt = () => 1_000_000;

describe("R6 · Session-Verlängerung nur bei Bedarf", () => {
  it("frische Sitzung: zwölf parallele Anfragen schreiben NICHT zwölfmal", async () => {
    const kv = zaehlendesKv(sitzung(SESSION_MS));           // eben erst verlängert
    await Promise.all(Array.from({ length: 12 }, () => requireSession(kv, "sid1", jetzt)));
    expect(kv.schreib.get("sys/session/sid1") || 0).toBe(0);
  });

  it("alle zwölf Anfragen bleiben authentifiziert", async () => {
    const kv = zaehlendesKv(sitzung(SESSION_MS));
    const ergebnisse = await Promise.all(
      Array.from({ length: 12 }, () => requireSession(kv, "sid1", jetzt)));
    for (const r of ergebnisse) expect(r).toEqual({ code: "abc", role: "A" });
  });

  it("gealterte Sitzung wird verlängert — die Semantik bleibt", async () => {
    const kv = zaehlendesKv(sitzung(TOUCH_SCHWELLE_MS - 1));   // zweite Hälfte
    const r = await requireSession(kv, "sid1", jetzt);
    expect(r).toEqual({ code: "abc", role: "A" });
    expect(kv.schreib.get("sys/session/sid1")).toBe(1);
    expect(JSON.parse(await kv.get("sys/session/sid1")).expiresAt).toBe(jetzt() + SESSION_MS);
  });

  it("abgelaufene Sitzung bleibt abgelaufen und wird nicht wiederbelebt", async () => {
    const kv = zaehlendesKv(sitzung(-1));
    expect(await requireSession(kv, "sid1", jetzt)).toBeNull();
    expect(kv.schreib.get("sys/session/sid1") || 0).toBe(0);
  });
});

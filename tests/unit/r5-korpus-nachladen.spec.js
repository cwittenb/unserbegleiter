// R5 · Korpus-Nachladen: das Tor und sein Fehlverhalten.
//
// Deutsch bleibt statisch (Referenz und Fallback, F2); Englisch reicht die
// Plattform per Lader nach. Der gefährliche Fall ist NICHT der Ladefehler,
// sondern der stille Erfolg: setKorpusSprache fällt bei fehlendem Korpus
// lautlos auf Deutsch zurück. Statisch war das harmlos — beim Nachladen
// bekäme ein englischsprachiges Paar deutsche Prompts, ohne Fehler, ohne
// Anzeichen. Genau das schließt stelleKorpusBereit() aus.

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  stelleKorpusBereit, setKorpusLader, registerKorpus, istKorpusDa,
  getPrompts, setKorpusSprache, getKorpusSprache, K,
} from "../../core/prompts/prompts.js";
import * as echterEn from "../../core/prompts/prompts.en.js";
import { cacheEntscheidung, SHELL_PFADE } from "../../platforms/cloudflare/pages/sw-routing.js";

/* Das globale Test-Setup (tests/fixtures/korpus-setup.js) registriert EN
   bereits. Diese Spec baut den Ausgangszustand deshalb je Fall selbst und
   stellt ihn danach wieder her. */
let sicherung;
beforeEach(() => { sicherung = getPrompts("en"); });
afterEach(() => {
  registerKorpus("en", sicherung);
  setKorpusLader(async l => (l === "en" ? echterEn : null));
  setKorpusSprache("de");
});

describe("R5 · Tor vor dem Session-Start", () => {
  it("registriert den Korpus über den Lader und meldet die Sprache zurück", async () => {
    let gerufen = 0;
    registerKorpus("en", undefined);
    setKorpusLader(async l => { gerufen++; return l === "en" ? echterEn : null; });
    expect(istKorpusDa("en")).toBe(false);
    expect(await stelleKorpusBereit("en")).toBe("en");
    expect(istKorpusDa("en")).toBe(true);
    expect(gerufen).toBe(1);
  });

  it("lädt nicht zweimal", async () => {
    let gerufen = 0;
    registerKorpus("en", undefined);
    setKorpusLader(async () => { gerufen++; return echterEn; });
    await stelleKorpusBereit("en");
    await stelleKorpusBereit("en");
    expect(gerufen).toBe(1);
  });

  it("Deutsch braucht keinen Lader — es liegt im Bundle", async () => {
    setKorpusLader(null);
    expect(await stelleKorpusBereit("de")).toBe("de");
  });

  it("scheitert LAUT, wenn der Lader fehlt", async () => {
    registerKorpus("en", undefined);
    setKorpusLader(null);
    await expect(stelleKorpusBereit("en")).rejects.toThrow(/Lader/);
  });

  it("scheitert LAUT, wenn der Lader nichts liefert", async () => {
    registerKorpus("en", undefined);
    setKorpusLader(async () => null);
    await expect(stelleKorpusBereit("en")).rejects.toThrow(/nicht geladen/);
  });

  it("scheitert LAUT, wenn der Abruf bricht — kein stiller Rückfall auf Deutsch", async () => {
    registerKorpus("en", undefined);
    setKorpusLader(async () => { throw new Error("Korpus nicht erreichbar: en"); });
    await expect(stelleKorpusBereit("en")).rejects.toThrow(/nicht erreichbar/);
    // Der eigentliche Schaden wäre gewesen: Sprache still auf Deutsch gesetzt.
    setKorpusSprache("en");
    expect(getKorpusSprache()).toBe("de");   // genau deshalb steht das Tor davor
  });
});

describe("R5 · Nach dem Tor liest K() den englischen Korpus", () => {
  it("Sprachdisziplin-Zeile stammt aus dem EN-Korpus", async () => {
    registerKorpus("en", undefined);
    setKorpusLader(async () => echterEn);
    await stelleKorpusBereit("en");
    setKorpusSprache("en");
    expect(getKorpusSprache()).toBe("en");
    expect(K()).toBe(echterEn);
  });
});

describe("R5 · Service-Worker-Routing", () => {
  it("der Korpus wird gecacht, wenn er einmal geholt wurde", () => {
    expect(cacheEntscheidung("/korpus.en.js")).toBe("cache-zuerst");
  });

  it("aber er wird NICHT vorab geladen — sonst zöge ihn jedes deutsche Paar mit", () => {
    expect(SHELL_PFADE).not.toContain("/korpus.en.js");
  });

  it("die Shell bleibt unverändert cachefähig, API weiterhin nie", () => {
    expect(cacheEntscheidung("/app.js")).toBe("cache-zuerst");
    expect(cacheEntscheidung("/api/llm")).toBe("nie");
  });
});

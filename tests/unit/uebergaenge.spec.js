// Übergangs-Regel — weiches Weitergehen nach Pacing (kein abrupter Themenwechsel).

import { describe, it, expect } from "vitest";
import { einzelSys } from "../../core/prompts/prompts.js";

describe("Kanarien · einzelSys (Übergänge)", () => {
  const p = einzelSys("Anna", "Bernd", true);
  it("Übergangs-Regel present: Drei-Schritt-Brücke statt abruptem Wechsel", () => {
    expect(p).toContain("ÜBERGÄNGE");
    expect(p).toContain("NIE abrupt");
  });
  it("Aufheben ist ein gehaltenes Versprechen, keine Floskel", () => {
    expect(p).toContain("halte das Versprechen");
  });
  it("Brücke variiert — keine Formel", () => {
    expect(p).toContain("nicht zur Formel");
  });
});

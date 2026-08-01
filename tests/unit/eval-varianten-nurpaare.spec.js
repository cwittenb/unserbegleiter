// ST6a · --nur-paare: reiner GATE-Lauf ohne Szenarien, die im A/B kein Paar bilden.

import { describe, it, expect } from "vitest";
import { varianten } from "../../evals/runner-kern.js";

const sz = (id, session) => ({ id, session, eingaben: ["x"], kontext: {} });
const KATALOG = [sz("S-1", "solo"), sz("M-1", "moment"), sz("E-1", "einzel"), sz("Q-1", "qualitytime")];

describe("varianten(… nurPaare)", () => {
  it("beides + nurPaare: nur strukturfähige Szenarien, beide Varianten", () => {
    const v = varianten(KATALOG, "beides", true);
    expect(v).toHaveLength(4);
    expect([...new Set(v.map(x => x.szenario.id))].sort()).toEqual(["M-1", "S-1"]);
    expect(v.filter(x => x.szenario.id === "S-1").map(x => x.variante)).toEqual(["text", "struktur"]);
  });

  it("ohne Flag bleibt der volle Katalog erhalten (Regressionslauf)", () => {
    expect(varianten(KATALOG, "beides")).toHaveLength(6);
  });

  it("nurPaare wirkt NUR im A/B — sonst wäre es stiller Szenario-Verlust", () => {
    expect(varianten(KATALOG, "aus", true)).toHaveLength(4);
    expect(varianten(KATALOG, "an", true)).toHaveLength(4);
  });
});

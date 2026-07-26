// @vitest-environment happy-dom
// S95.7b · Einstellung und Erst-Information.
//
// Die Voreinstellung ist „aufbewahren" (F0). Damit steht und fällt alles mit
// zwei Eigenschaften:
//   · Die Erst-Information erscheint GENAU EINMAL, im selben Moment, in dem
//     zum ersten Mal aufbewahrt wird — nicht rückwirkend, nicht wiederholt.
//   · Bei „jedes Mal fragen" wird ohne aktives Ja NICHTS abgelegt. Die Frage
//     hat kein vorausgewähltes Ja und keine Empfehlung.

import { describe, it, expect, beforeEach } from "vitest";
import { macheEinstellungenScreen } from "../../core/ui/einstellungen-screen.js";
import { loescheAlleVerlaeufe, EINST_VERLAUF, VERLAUF_PRAEFIX } from "../../core/ui/verlauf-ablage.js";
import { setLocale, t } from "../../core/i18n/index.js";

function backendMit(daten = {}) {
  const speicher = new Map(Object.entries(daten));
  return { speicher,
    pstate: { async get(k) { return speicher.get(k) ?? null; },
              async set(k, v) { speicher.set(k, v); return true; } } };
}

beforeEach(() => setLocale("de"));

describe("S95.7b · Schalter im Einstellungsblatt", () => {
  function baueBlatt(backend) {
    document.body.innerHTML = '<div id="pbEinst"></div><div id="pbEinstBlatt"></div>';
    const chrome = id => document.getElementById(id);
    return macheEinstellungenScreen({
      doc: document, $: chrome, chrome, backend,
      state: { info: { locale: "de" } }, err: () => {}, relaunch: () => {},
      bestaetige: async () => true,
    });
  }

  it("zeigt beide Wahlmöglichkeiten, Vorgabe ist aufbewahren", async () => {
    const s = baueBlatt(backendMit());
    await s.zeigeEinstellungen();
    const an = document.querySelector('[data-verlauf].an, [data-verlauf][class*="an"]');
    expect(document.querySelectorAll("[data-verlauf]")).toHaveLength(2);
    expect(an && an.getAttribute("data-verlauf")).toBe("immer");
  });

  it("Umstellen wird gespeichert", async () => {
    const b = backendMit();
    const s = baueBlatt(b);
    await s.zeigeEinstellungen();
    document.querySelector('[data-verlauf="fragen"]').click();
    await new Promise(r => setTimeout(r, 0));
    expect(b.speicher.get(EINST_VERLAUF)).toBe("fragen");
  });

  it("nennt keine Empfehlung und nicht, was andere tun", async () => {
    const s = baueBlatt(backendMit());
    await s.zeigeEinstellungen();
    const txt = document.getElementById("pbEinstBlatt").textContent;
    expect(txt).not.toMatch(/empfohlen|empfehlen|die meisten|üblich/i);
  });
});

describe("S95.7b · Sammellöschen (K3)", () => {
  it("löscht alle Verläufe, lässt die Einträge stehen und die Einstellung unberührt", async () => {
    const b = backendMit({
      [EINST_VERLAUF]: "immer",
      timeline: { entries: [{ summary: "a", vid: "v1" }, { summary: "b" }, { summary: "c", vid: "v2" }] },
      [VERLAUF_PRAEFIX + "v1"]: { messages: [] },
      [VERLAUF_PRAEFIX + "v2"]: { messages: [] },
    });
    expect(await loescheAlleVerlaeufe(b)).toBe(2);
    expect(b.speicher.get(VERLAUF_PRAEFIX + "v1")).toBeNull();
    expect(b.speicher.get("timeline").entries).toHaveLength(3);   // Einträge bleiben (F1)
    expect(b.speicher.get("timeline").entries.some(e => e.vid)).toBe(false);
    expect(b.speicher.get(EINST_VERLAUF)).toBe("immer");          // K3: Vorgabe unberührt
  });

  it("ohne aufbewahrte Verläufe passiert nichts", async () => {
    const b = backendMit({ timeline: { entries: [{ summary: "a" }] } });
    expect(await loescheAlleVerlaeufe(b)).toBe(0);
  });
});

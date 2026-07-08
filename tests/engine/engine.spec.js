// Ebene 1.5 — Sitzungs-Drehbücher headless durch die ECHTE Engine (Mock-LLM).

import { describe, it, expect } from "vitest";
import { Engine } from "../../core/engine/engine.js";
import { MockLLM } from "../../core/engine/mock-llm.js";
import { freigebeUebergabe } from "../../core/engine/freigabe.js";
import { BLOECKE } from "../../core/contracts/registry.js";
import { Repo } from "../../core/store/repo.js";
import { MemoryStore } from "../../core/store/store.js";
import { uebergabeSchema } from "../../core/contracts/uebergabe.js";

const GUELTIG_ZEIT = '{"summary":"Kurz reflektiert.","topics":["Nähe"],"recurrenceNote":null}';

function soloDef(overrides = {}) {
  return {
    sysPrompt: () => "SOLO-SYSTEMPROMPT",
    markerOrder: [],
    markers: {},
    canAct: c => c.status === "running",
    blocks: [
      { ...BLOECKE.zeitleiste, handle: overrides.zeitHandle || (() => {}) },
      { ...BLOECKE.gate, handle: overrides.gateHandle || (() => {}) },
    ],
    ...overrides.def,
  };
}

function neuerChat() { return { messages: [], status: "running" }; }

describe("Engine · Vertrag 2, gültiger Block", () => {
  it("Drehbuch: User → Assistant mit gültigem TIMELINE-BLOCK → handle feuert, blockFix aus", async () => {
    let empfangen = null;
    const mock = new MockLLM([
      "Danke dir. Hier dein Eintrag:\nTIMELINE-BLOCK\n" + GUELTIG_ZEIT + "\nEND TIMELINE-BLOCK",
    ]);
    const e = new Engine({
      def: soloDef({ zeitHandle: d => { empfangen = d; } }),
      chat: neuerChat(), llm: mock.fn(),
    });
    await e.sendUser("Ich möchte kurz reflektieren.");
    expect(empfangen).not.toBeNull();
    expect(empfangen.topics).toEqual(["Nähe"]);
    expect(e.chat.blockFix).toBe(false);
    expect(mock.calls).toHaveLength(1);
  });
});

describe("Engine · Vertrag 2, genau EINE Korrektur-Runde", () => {
  const UNGUELTIG = 'TIMELINE-BLOCK\n{"topics":[]}\nEND TIMELINE-BLOCK';

  it("ungültig → versteckte SYSTEM-REVISION → gültig → handle feuert", async () => {
    let empfangen = null;
    const mock = new MockLLM([
      UNGUELTIG,
      "TIMELINE-BLOCK\n" + GUELTIG_ZEIT + "\nEND TIMELINE-BLOCK",
    ]);
    const e = new Engine({
      def: soloDef({ zeitHandle: d => { empfangen = d; } }),
      chat: neuerChat(), llm: mock.fn(),
    });
    await e.sendUser("Los.");
    expect(empfangen).not.toBeNull();
    expect(mock.calls).toHaveLength(2);
    // Die Korrektur ging als VERSTECKTE User-Nachricht in Runde 2:
    const r2 = mock.calls[1].messages;
    const korrektur = r2[r2.length - 1];
    expect(korrektur.role).toBe("user");
    expect(korrektur.hidden).toBe(true);
    expect(korrektur.content).toContain("SYSTEM-REVISION");
    expect(korrektur.content).toContain("TIMELINE-BLOCK");
    expect(e.chat.blockFix).toBe(false);
  });

  it("zweimal ungültig → Personen-Fehlermeldung, KEIN dritter LLM-Aufruf", async () => {
    let personError = null;
    const mock = new MockLLM([UNGUELTIG, UNGUELTIG]);
    const e = new Engine({
      def: soloDef(),
      chat: neuerChat(), llm: mock.fn(),
      hooks: { onPersonError: m => { personError = m; } },
    });
    await e.sendUser("Los.");
    expect(mock.calls).toHaveLength(2);              // exakt zwei, nie drei
    expect(personError).toContain("weiterhin ungültig");
    expect(e.chat.blockFix).toBe(false);             // sauber zurückgesetzt
  });

  it("nach gescheiterter Korrektur kann die Person regulär weitermachen (frische Zählung)", async () => {
    const mock = new MockLLM([
      UNGUELTIG, UNGUELTIG,
      "TIMELINE-BLOCK\n" + GUELTIG_ZEIT + "\nEND TIMELINE-BLOCK",
    ]);
    let empfangen = null;
    const e = new Engine({
      def: soloDef({ zeitHandle: d => { empfangen = d; } }),
      chat: neuerChat(), llm: mock.fn(), hooks: { onPersonError: () => {} },
    });
    await e.sendUser("Los.");
    await e.sendUser("Bitte nochmal ausgeben.");
    expect(empfangen).not.toBeNull();
    expect(mock.calls).toHaveLength(3);
  });
});

describe("Engine · Vertrag 1, Marker & Panels", () => {
  const einzelDef = (markers) => ({
    sysPrompt: () => "EINZEL",
    markerOrder: ["[[SLIDERS]]", "[[PARTNER-RANKING]]", "[[RANKING]]"],
    markers,
    canAct: c => c.status === "running",
    blocks: [],
  });

  it("Marker in letzter Zeile öffnet das registrierte Panel; Panel antwortet mit GENAU EINER User-Nachricht", async () => {
    const geoeffnet = [];
    const mock = new MockLLM([
      "Schätze bitte alle Bereiche ein.\n[[SLIDERS]]",
      "Danke für deine Einschätzung!",
    ]);
    const e = new Engine({
      def: einzelDef({
        "[[SLIDERS]]": () => geoeffnet.push("regler"),
        "[[PARTNER-RANKING]]": () => geoeffnet.push("pr"),
        "[[RANKING]]": () => geoeffnet.push("r"),
      }),
      chat: neuerChat(), llm: mock.fn(),
    });
    await e.sendUser("Bereit.");
    expect(geoeffnet).toEqual(["regler"]);
    const vorher = e.chat.messages.length;
    await e.submitToolResult("Meine Regler-Werte: …", { slider: true });
    const userNeu = e.chat.messages.slice(vorher).filter(m => m.role === "user");
    expect(userNeu).toHaveLength(1);                 // GENAU EINE
    expect(userNeu[0].slider).toBe(true);
    expect(mock.calls).toHaveLength(2);
  });

  it("VERSCHÄRFUNG wirksam: nur erwähnter Marker mitten im Text öffnet NICHTS", async () => {
    const geoeffnet = [];
    const mock = new MockLLM(["Gleich kommt das [[RANKING]]-Panel.\nVorher: Wie geht es dir?"]);
    const e = new Engine({
      def: einzelDef({ "[[SLIDERS]]": () => {}, "[[PARTNER-RANKING]]": () => {}, "[[RANKING]]": () => geoeffnet.push("r") }),
      chat: neuerChat(), llm: mock.fn(),
    });
    await e.sendUser("Bereit.");
    expect(geoeffnet).toEqual([]);
  });

  it("Registrierungs-Wächter: falsch sortierte markerOrder oder fehlender Handler → Konstruktion wirft", () => {
    expect(() => new Engine({
      def: { sysPrompt: () => "", markerOrder: ["[[RANKING]]", "[[PARTNER-RANKING]]"], markers: { "[[RANKING]]": () => {}, "[[PARTNER-RANKING]]": () => {} }, canAct: () => true, blocks: [] },
      chat: neuerChat(), llm: async () => ({ text: "" }),
    })).toThrow(/generisch/);
    expect(() => new Engine({
      def: { sysPrompt: () => "", markerOrder: ["[[X]]"], markers: {}, canAct: () => true, blocks: [] },
      chat: neuerChat(), llm: async () => ({ text: "" }),
    })).toThrow(/ohne registrierten Handler/);
  });
});

describe("Engine · Status-Disziplin", () => {
  it("canAct=false: weder Marker noch Blöcke werden dispatcht", async () => {
    const geoeffnet = [];
    let handled = false;
    const mock = new MockLLM(["[[SLIDERS]]"]);
    const e = new Engine({
      def: {
        sysPrompt: () => "", markerOrder: ["[[SLIDERS]]"],
        markers: { "[[SLIDERS]]": () => geoeffnet.push("x") },
        canAct: c => c.status === "running",
        blocks: [{ ...BLOECKE.zeitleiste, handle: () => { handled = true; } }],
      },
      chat: { messages: [], status: "released" }, llm: mock.fn(),
      hooks: { onPersonError: () => {} },
    });
    // released: sendUser wird abgewiesen …
    expect(await e.sendUser("Hallo?")).toBe(false);
    expect(mock.calls).toHaveLength(0);
    expect(geoeffnet).toEqual([]);
    expect(handled).toBe(false);
  });

  it("abgeschlossene Session meldet sich freundlich statt zu senden", async () => {
    let msg = null;
    const e = new Engine({
      def: soloDef(), chat: { messages: [], status: "finished" },
      llm: new MockLLM([]).fn(), hooks: { onPersonError: m => { msg = m; } },
    });
    await e.sendUser("Noch da?");
    expect(msg).toContain("abgeschlossen");
  });
});

describe("Engine · Vertrag 3, Freigabe", () => {
  it("freigebeUebergabe schreibt AUSSCHLIESSLICH das Übergabe-Schema in die geteilte Schicht", async () => {
    const store = new MemoryStore();
    const repo = new Repo({ store, ns: "T", code: "paar1", activeModuleId: "kernwetten" });
    await freigebeUebergabe(repo, "A", {
      module: "kernwetten", name: "Anna",
      items: [{ id: "CS1", text: "meine Fassung", rohform: "PRIVAT-GEHEIM" }],
    });
    const keys = await store.list("", true);
    expect(keys).toHaveLength(1);
    expect(keys[0]).toContain("uebergabe:A");
    const u = await store.get(keys[0], true);
    expect(uebergabeSchema(u)).toEqual([]);
    expect(JSON.stringify(u)).not.toContain("PRIVAT-GEHEIM");   // Fremdfeld-Filter wirkt
    expect(await store.list("", false)).toEqual([]);            // nichts Privates berührt
  });

  it("abgelehnter Speicher → Wurf statt stiller Verlust", async () => {
    const store = new MemoryStore();
    store.set = async () => false;
    const repo = new Repo({ store, ns: "T", code: "c", activeModuleId: "kernwetten" });
    await expect(freigebeUebergabe(repo, "A", { module: "m", name: "n", items: [] }))
      .rejects.toThrow(/Übergabe/);
  });
});

describe("Engine · Persistenz-Hook", () => {
  it("onSave feuert nach User-, Assistant- und Korrektur-Schritten", async () => {
    let saves = 0;
    const mock = new MockLLM([
      'TIMELINE-BLOCK\n{"topics":[]}\nEND TIMELINE-BLOCK',
      "TIMELINE-BLOCK\n" + GUELTIG_ZEIT + "\nEND TIMELINE-BLOCK",
    ]);
    const e = new Engine({
      def: soloDef(), chat: neuerChat(), llm: mock.fn(),
      hooks: { onSave: () => { saves++; } },
    });
    await e.sendUser("Los.");
    expect(saves).toBeGreaterThanOrEqual(4);   // user, assistant1, korrektur, assistant2, blockFix-Resets
  });
});

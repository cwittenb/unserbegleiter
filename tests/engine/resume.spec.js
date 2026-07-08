// Engine · resume() — Wiedereinstieg nach Reload dispatcht den letzten Zug
// erneut (Kapitel-Panels und andere Marker-Panels öffnen wieder; ein
// wartender User-Zug wird beantwortet). Plus: Kapitel-Marker-Drehbuch.

import { describe, it, expect } from "vitest";
import { Engine } from "../../core/engine/engine.js";
import { MockLLM } from "../../core/engine/mock-llm.js";
import { einzelDef } from "../../core/ui/kernwetten.js";

const neuerChat = () => ({ messages: [], status: "running" });

describe("Engine · resume()", () => {
  it("letzter Assistant-Zug mit Kapitel-Marke → Panel öffnet nach Reload erneut", async () => {
    const geoeffnet = [];
    const e = new Engine({
      def: einzelDef({}, { onKapitel: n => geoeffnet.push(n) }),
      chat: {
        status: "running",
        messages: [
          { role: "user", content: "Bereit." },
          { role: "assistant", content: "Die Landkarte steht – gleich geht es weiter.\n[[CHAPTER-1]]" },
        ],
      },
      llm: async () => { throw new Error("resume darf hier NICHT das Modell rufen"); },
    });
    await e.resume();
    expect(geoeffnet).toEqual([1]);
  });

  it("letzter User-Zug (z. B. nach Unterbrechung) → Modell wird genau einmal gerufen", async () => {
    const mock = new MockLLM(["Willkommen zurück – weiter geht es."]);
    const e = new Engine({
      def: einzelDef({}, {}),
      chat: { status: "running", messages: [{ role: "user", hidden: true, content: "[Weiter mit Kapitel 2.]" }] },
      llm: mock.fn(),
    });
    await e.resume();
    expect(mock.calls).toHaveLength(1);
    expect(e.chat.messages[e.chat.messages.length - 1].role).toBe("assistant");
  });

  it("abgeschlossene/freigegebene Sessions bleiben still", async () => {
    for (const status of ["released", "finished"]) {
      const e = new Engine({
        def: einzelDef({}, { onKapitel: () => { throw new Error("darf nicht feuern"); } }),
        chat: { status, messages: [{ role: "assistant", content: "[[CHAPTER-1]]" }] },
        llm: async () => { throw new Error("darf nicht rufen"); },
      });
      await e.resume();   // wirft nicht, tut nichts
    }
    expect(true).toBe(true);
  });

  it("leerer Chat: resume ist ein No-Op", async () => {
    const e = new Engine({ def: einzelDef({}, {}), chat: neuerChat(), llm: async () => { throw new Error("nein"); } });
    await e.resume();
    expect(e.chat.messages).toHaveLength(0);
  });
});

describe("Engine · Kapitel-Drehbuch (Marker-Vertrag)", () => {
  it("[[CHAPTER-1]] allein in der letzten Zeile öffnet den Zwischenhalt; Weiter-Nachricht ist GENAU EINE User-Nachricht", async () => {
    const geoeffnet = [];
    const mock = new MockLLM([
      "Schön, dass du da bist – die Landkarte steht.\n[[CHAPTER-1]]",
      "Willkommen in Kapitel 2.",
    ]);
    const e = new Engine({
      def: einzelDef({}, { onKapitel: (n, eng) => geoeffnet.push([n, eng === e2wrap.e]) }),
      chat: neuerChat(), llm: mock.fn(),
    });
    const e2wrap = { e };
    await e.sendUser("Bereit.");
    expect(geoeffnet.map(x => x[0])).toEqual([1]);
    const vorher = e.chat.messages.length;
    await e.submitToolResult("[Weiter mit Kapitel 2.]", { hidden: true });
    const neu = e.chat.messages.slice(vorher).filter(m => m.role === "user");
    expect(neu).toHaveLength(1);
    expect(neu[0].hidden).toBe(true);
    expect(mock.calls).toHaveLength(2);
  });

  it("Kapitel-Marke NICHT in der letzten Zeile feuert nicht (Letzte-Zeile-Regel gilt auch hier)", async () => {
    const geoeffnet = [];
    const mock = new MockLLM(["Gleich kommt das [[CHAPTER-1]]-Panel.\nVorher: Wie geht es dir?"]);
    const e = new Engine({
      def: einzelDef({}, { onKapitel: n => geoeffnet.push(n) }),
      chat: neuerChat(), llm: mock.fn(),
    });
    await e.sendUser("Bereit.");
    expect(geoeffnet).toEqual([]);
  });
});

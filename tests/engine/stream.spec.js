// Engine · Streaming-Hook — onDelta erhält den KUMULIERTEN Teiltext;
// Dispatch (Marker/Blöcke) läuft unverändert erst über den Volltext.

import { describe, it, expect } from "vitest";
import { Engine } from "../../core/engine/engine.js";

const defOhneAktion = {
  sysPrompt: () => "SYS",
  markerOrder: [],
  markers: {},
  blocks: [],
  canAct: () => false,
};

describe("Engine · onDelta", () => {
  it("kumuliert Deltas und reicht Teiltexte an den Hook", async () => {
    const teile = [];
    const llm = async (sys, msgs, onDelta) => {
      onDelta("Hal"); onDelta("lo "); onDelta("Welt");
      return { text: "Hallo Welt", stop: "end_turn" };
    };
    const e = new Engine({
      def: defOhneAktion,
      chat: { messages: [], status: "running" },
      llm,
      hooks: { onDelta: t => teile.push(t) },
    });
    await e.sendUser("hi");
    expect(teile).toEqual(["Hal", "Hallo ", "Hallo Welt"]);
    expect(e.chat.messages[1]).toMatchObject({ role: "assistant", content: "Hallo Welt" });
  });

  it("ohne onDelta-Hook erhält das LLM undefined als drittes Argument (Nicht-Stream-Pfad)", async () => {
    let gesehen = "unberührt";
    const llm = async (sys, msgs, onDelta) => { gesehen = onDelta; return { text: "ok", stop: "end_turn" }; };
    const e = new Engine({ def: defOhneAktion, chat: { messages: [], status: "running" }, llm });
    await e.sendUser("hi");
    expect(gesehen).toBeUndefined();
  });
});

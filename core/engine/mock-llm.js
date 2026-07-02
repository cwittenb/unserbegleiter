// MockLLM — Ebene 1.5: spielt gescriptete Assistant-Ausgaben ein und
// protokolliert jeden Aufruf (System-Prompt + Nachrichten-Schnappschuss),
// damit Drehbücher deterministisch durch die ECHTE Engine laufen.

export class MockLLM {
  constructor(antworten = []) {
    this.queue = [...antworten];
    this.calls = [];
  }
  /** Kompatibel zur Adapter-Fassade: (system, messages) → {text, stop} */
  fn() {
    return async (system, messages) => {
      this.calls.push({
        system,
        messages: messages.map(m => ({ ...m })),
      });
      if (!this.queue.length) throw new Error("MockLLM: Drehbuch zu Ende, aber weitere Runde angefragt");
      const next = this.queue.shift();
      return typeof next === "string" ? { text: next, stop: "end_turn" } : next;
    };
  }
}

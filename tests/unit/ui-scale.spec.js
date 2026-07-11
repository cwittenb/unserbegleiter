// @vitest-environment happy-dom
// S34 · Skalen- und Auswahl-Panels: Marker öffnet Widget, Bestätigen sendet
// das invariante Ergebnis-Token — keine Zahlenfrage im Chat nötig.

import { describe, it, expect, beforeEach } from "vitest";
import { createApp } from "../../core/ui/app.js";
import { MockLLM } from "../../core/engine/mock-llm.js";
import { Repo } from "../../core/store/repo.js";
import { Bstate, Pstate } from "../../core/store/bundles.js";
import { MemoryStore } from "../../core/store/store.js";
import { freigebeUebergabe } from "../../core/engine/freigabe.js";

function memoryBackend(mock, role = "A") {
  const store = new MemoryStore();
  const repo = new Repo({ store, ns: "T", code: "sc", activeModuleId: "betrieb" });
  const bstate = new Bstate(repo);
  const pstate = new Pstate(repo);
  return {
    store,
    async info() {
      return { role, name: "Anna", partner: "Bernd", nameA: "Anna", nameB: "Bernd" };
    },
    bstate: { get: f => bstate.get(f), set: (f, v) => bstate.set(f, v) },
    pstate: { get: f => pstate.get(role, f), set: (f, v) => pstate.set(role, f, v) },
    chat: {
      load: (art, id) => repo.get("chat:" + (art === "shared" ? id : role + ":" + id), art === "shared"),
      save: (art, id, c) => repo.set("chat:" + (art === "shared" ? id : role + ":" + id), c, art === "shared"),
    },
    handover: { post: d => freigebeUebergabe(repo, role, d), get: () => null },
    llm: mock.fn(),
  };
}

const tick = () => new Promise(r => setTimeout(r, 0));
async function klick(el) { el.click(); await tick(); await tick(); await tick(); }

let root;
beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById("app");
});

describe("S34 · [[SCALE-SAFETY]] in der Einzelsession", () => {
  it("Marker öffnet den Slider; Übernehmen sendet SCALE-RESULT: safety=<wert> und schließt das Panel", async () => {
    const mock = new MockLLM([
      "Willkommen! Eine Frage vorab – die App zeigt dir gleich einen Regler.\n[[SCALE-SAFETY]]",
      "Danke – das klingt nach einer soliden Basis.",
    ]);
    const backend = memoryBackend(mock);
    const app = createApp({ doc: document, backend, root });
    await app.boot();
    await klick(root.querySelector("#btnMyRoom"));
    await klick(root.querySelector("#btnEinzel"));
    await tick(); await tick();

    const panel = root.querySelector("#kwPanel");
    expect(panel.classList.contains("pb-hidden")).toBe(false);
    expect(panel.textContent).toContain("Wie sicher fühlst du dich bei Bernd?");
    const slider = panel.querySelector("#scA");
    slider.value = "9";
    slider.dispatchEvent(new Event("input", { bubbles: true }));
    expect(panel.querySelector("#scAW").textContent).toBe("9");

    await klick(panel.querySelector("#scOk"));
    const gesendet = mock.calls.flatMap(c => c.messages).filter(m => m.role === "user").map(m => m.content).join("\n");
    expect(gesendet).toContain("SCALE-RESULT: safety=9");
    expect(panel.classList.contains("pb-hidden")).toBe(true);
    // Roh-Marker nie im sichtbaren Chat
    expect(root.querySelector("#pbMsgs").textContent).not.toContain("[[SCALE-SAFETY]]");
  });
});

describe("S34 · [[CHOICE-CONNECT]] im gemeinsamen Moment", () => {
  it("Menü zeigt vier Karten plus »Ohne Übung weiter«; Ohne-Wahl sendet CHOICE-RESULT ohne Nachhaken-Material", async () => {
    const mock = new MockLLM([
      "Schön, dass ihr da seid – mögt ihr kurz ankommen?\n[[CHOICE-CONNECT]]",
      "Alles gut – dann direkt hinein.",
    ]);
    const backend = memoryBackend(mock);
    const app = createApp({ doc: document, backend, root });
    await app.boot();
    await klick(root.querySelector("#btnSharedRoom"));
    await klick(root.querySelector("#btnMoment"));
    await tick(); await tick();

    const panel = root.querySelector("#kwPanel");
    expect(panel.classList.contains("pb-hidden")).toBe(false);
    const karten = panel.querySelectorAll("[data-ch]");
    expect(karten.length).toBe(5);
    expect(panel.textContent).toContain("Eine Minute gemeinsame Stille");

    await klick(panel.querySelector('[data-ch="ohne"]'));
    const gesendet = mock.calls.flatMap(c => c.messages).filter(m => m.role === "user").map(m => m.content).join("\n");
    expect(gesendet).toContain("CHOICE-RESULT: connect=Ohne Übung weiter");
    expect(panel.classList.contains("pb-hidden")).toBe(true);
  });
});

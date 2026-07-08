// @vitest-environment happy-dom
// Wiedereinstiegs-Karte im persönlichen Raum — gated auf backend.recovery.

import { describe, it, expect, beforeEach } from "vitest";
import { createApp } from "../../core/ui/app.js";

const tick = () => new Promise(r => setTimeout(r, 0));
async function klick(el) { el.click(); await tick(); await tick(); }

function baseBackend(extra) {
  return {
    async info() { return { role: "A", name: "Anna", partner: "Bernd", nameA: "Anna", nameB: "Bernd", ...(extra || {}) }; },
    bstate: { get: async () => null, set: async () => true },
    pstate: { get: async () => null, set: async () => true },
    chat: { load: async () => null, save: async () => true },
    handover: { post: async () => {}, get: async () => null },
    llm: async () => ({ text: "ok" }),
  };
}

let root;
beforeEach(() => { document.body.innerHTML = '<div id="app"></div>'; root = document.getElementById("app"); });

describe("Recovery-Karte", () => {
  it("bleibt verborgen, wenn das Backend kein recovery anbietet (z. B. Artefakt)", async () => {
    const app = createApp({ doc: document, backend: baseBackend(), root });
    await app.boot();
    expect(root.querySelector("#boxRecovery").classList.contains("pb-hidden")).toBe(true);
  });

  it("erscheint mit recovery-Backend; zeigt „nicht hinterlegt“ und ruft setEmail; danach Status „hinterlegt“", async () => {
    let gesetzt = null;
    const backend = baseBackend({ recoveryEmail: false });
    backend.recovery = { setEmail: async e => { gesetzt = e; } };
    const app = createApp({ doc: document, backend, root });
    await app.boot();

    const box = root.querySelector("#boxRecovery");
    expect(box.classList.contains("pb-hidden")).toBe(false);
    expect(box.textContent).toContain("Hinterlege eine E-Mail-Adresse");
    expect(box.querySelector("#recSave").textContent).toContain("hinterlegen");

    box.querySelector("#recInput").value = "anna@example.com";
    await klick(box.querySelector("#recSave"));
    expect(gesetzt).toBe("anna@example.com");
    // Neu gezeichnet: jetzt als hinterlegt
    expect(root.querySelector("#boxRecovery").textContent).toContain("Adresse ist hinterlegt");
    expect(root.querySelector("#recSave").textContent).toContain("ändern");
  });

  it("leere Eingabe setzt nichts und zeigt einen Hinweis", async () => {
    let aufgerufen = false;
    const backend = baseBackend({ recoveryEmail: false });
    backend.recovery = { setEmail: async () => { aufgerufen = true; } };
    const app = createApp({ doc: document, backend, root });
    await app.boot();
    const box = root.querySelector("#boxRecovery");
    await klick(box.querySelector("#recSave"));
    expect(aufgerufen).toBe(false);
    expect(box.querySelector("#recNote").textContent).toContain("Adresse eingeben");
  });
});

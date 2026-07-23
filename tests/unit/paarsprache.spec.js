// @vitest-environment happy-dom
// Paarsprache-Karte (S30·C3) — drei Ansichts-Zustände gegen die echte App;
// nach beidseitiger Bestätigung startet eine NEUE Session in der neuen Sprache.

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createApp } from "../../core/ui/app.js";
import { MockLLM } from "../../core/engine/mock-llm.js";
import { Repo } from "../../core/store/repo.js";
import { Bstate, Pstate } from "../../core/store/bundles.js";
import { MemoryStore } from "../../core/store/store.js";
import { getKorpusSprache, setKorpusSprache } from "../../core/prompts/prompts.js";

/* Lokales Backend mit derselben Sprach-Zustandsmaschine wie Worker/Artifact. */
function memoryBackend(mock, { role = "A", locale = "de", languageRequest = null } = {}) {
  const store = new MemoryStore();
  const repo = new Repo({ store, ns: "T", code: "ps", activeModuleId: "betrieb" });
  const bstate = new Bstate(repo), pstate = new Pstate(repo);
  const meta = { locale, ...(languageRequest ? { languageRequest } : {}) };
  return {
    store, repo, meta,
    async info() {
      return { role, name: "Anna", partner: "Bernd", nameA: "Anna", nameB: "Bernd",
               locale: meta.locale, languageRequest: meta.languageRequest || null };
    },
    bstate: { get: f => bstate.get(f), set: (f, v) => bstate.set(f, v) },
    pstate: { get: f => pstate.get(role, f), set: (f, v) => pstate.set(role, f, v) },
    chat: { load: () => null, save: () => true },
    language: {
      request: async target => {
        const aktuell = meta.locale || "de";
        let status;
        if (target === aktuell) status = "active";
        else if (meta.languageRequest && meta.languageRequest.target === target && meta.languageRequest.by !== role) {
          meta.locale = target; delete meta.languageRequest; status = "confirmed";
        } else { meta.languageRequest = { target, by: role, at: 1 }; status = "waiting"; }
        return { locale: meta.locale, languageRequest: meta.languageRequest || null, status };
      },
      withdraw: async () => {
        delete meta.languageRequest;
        return { locale: meta.locale, languageRequest: null, status: "discarded" };
      },
    },
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
afterEach(() => setKorpusSprache("de"));

async function booten(backend) {
  const app = createApp({ doc: document, backend, root });
  await app.boot();
  return app;
}

describe("Paarsprache-Karte · drei Zustände", () => {
  it("kein Wunsch: zeigt aktuelle Sprache und Vorschlagen-Knopf; Klick → Wartet-Ansicht", async () => {
    const backend = memoryBackend(new MockLLM([]));
    await booten(backend);
    // S35: Die Karte liegt hinter einem kleinen Link (versteckt per Default)
    const zeile = document.getElementById("psZeile");
    expect(zeile.classList.contains("pb-hidden")).toBe(false);
    // D8: Die Ecke traegt den kompakten DE/EN-Wechsler — die aktuelle Sprache
    // leuchtet, der volle Name lebt im title (und im Dialog selbst).
    const knopf = zeile.querySelector("#psLink");
    expect(knopf.textContent.replace(/\s/g, "")).toBe("DEEN");
    expect(knopf.querySelector(".an").textContent).toBe("DE");
    expect(knopf.getAttribute("title")).toContain("Deutsch");
    const box = document.getElementById("boxPaarsprache");
    expect(box.classList.contains("pb-hidden")).toBe(true);
    await klick(zeile.querySelector("#psLink"));
    expect(box.classList.contains("pb-hidden")).toBe(false);
    expect(box.textContent).toContain("Deutsch");
    const antrag = box.querySelector("#psAntrag");
    expect(antrag).toBeTruthy();
    await klick(antrag);
    expect(backend.meta.languageRequest).toMatchObject({ target: "en", by: "A" });
    expect(box.querySelector("#psZurueck")).toBeTruthy();
    expect(box.textContent).toContain("Bernd");   // wartet auf Partner
  });

  it("eigener Wunsch offen: Zurückziehen räumt auf und zeigt wieder Vorschlagen", async () => {
    const backend = memoryBackend(new MockLLM([]), { languageRequest: { target: "en", by: "A", at: 1 } });
    await booten(backend);
    // eigener offener Wunsch klappt die Karte NICHT von selbst auf — der Link zeigt ihn an
    expect(document.getElementById("psZeile").textContent).toContain("Vorschlag");
    await klick(document.getElementById("psZeile").querySelector("#psLink"));
    const box = document.getElementById("boxPaarsprache");
    await klick(box.querySelector("#psZurueck"));
    expect(backend.meta.languageRequest).toBeUndefined();
    expect(box.querySelector("#psAntrag")).toBeTruthy();
  });

  it("Partner-Wunsch offen: Bestätigen wechselt mit Von-beiden-bestätigt-Meldung", async () => {
    const backend = memoryBackend(new MockLLM([]), { languageRequest: { target: "en", by: "B", at: 1 } });
    await booten(backend);
    const box = document.getElementById("boxPaarsprache");
    expect(box.querySelector("#psJa")).toBeTruthy();
    expect(box.querySelector("#psNein")).toBeTruthy();
    await klick(box.querySelector("#psJa"));
    expect(backend.meta.locale).toBe("en");
    expect(backend.meta.languageRequest).toBeUndefined();
    expect(box.querySelector("#psMeldung").textContent).toContain("bestätigt");
    expect(box.textContent).toContain("Englisch");
  });

  it("Ablehnen des Partner-Wunschs: Sprache unverändert, Wunsch weg", async () => {
    const backend = memoryBackend(new MockLLM([]), { languageRequest: { target: "en", by: "B", at: 1 } });
    await booten(backend);
    const box = document.getElementById("boxPaarsprache");
    await klick(box.querySelector("#psNein"));
    expect(backend.meta.locale).toBe("de");
    expect(backend.meta.languageRequest).toBeUndefined();
    expect(box.querySelector("#psAntrag")).toBeTruthy();
  });

  it("Backend ohne sprache-Fassade: Karte bleibt verborgen", async () => {
    const backend = memoryBackend(new MockLLM([]));
    delete backend.language;
    await booten(backend);
    expect(document.getElementById("boxPaarsprache").classList.contains("pb-hidden")).toBe(true);
    expect(document.getElementById("psZeile").classList.contains("pb-hidden")).toBe(true);
  });
});

describe("Wechselwirkung mit dem Sprach-Schnappschuss (C1/C2)", () => {
  it("nach beidseitiger Bestätigung startet eine NEUE Einzelsession englisch", async () => {
    const mock = new MockLLM(["Hello Anna."]);
    const backend = memoryBackend(mock, { languageRequest: { target: "en", by: "B", at: 1 } });
    await booten(backend);
    await klick(document.querySelector("#psJa"));
    await klick(root.querySelector("#btnMyRoom"));
    await klick(root.querySelector("#btnEinzel"));
    expect(getKorpusSprache()).toBe("en");
    expect(mock.calls[0].system).toContain("You respond exclusively in English");
    expect(document.getElementById("chatTitel").textContent).toBe("Clarifying Your Focus");
  });
});

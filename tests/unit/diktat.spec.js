// @vitest-environment happy-dom
// Diktat — direkte Spracherkennung mit OS-Tipp-Fallback, headless bewiesen
// über injizierte Fake-Erkennung (SR) und injizierten User-Agent.

import { describe, it, expect, beforeEach } from "vitest";
import { createApp } from "../../core/ui/app.js";
import { MockLLM } from "../../core/engine/mock-llm.js";
import { Repo } from "../../core/store/repo.js";
import { Bstate, Pstate } from "../../core/store/bundles.js";
import { MemoryStore } from "../../core/store/store.js";

function memoryBackend() {
  const store = new MemoryStore();
  const repo = new Repo({ store, ns: "T", code: "dk", activeModuleId: "betrieb" });
  const bstate = new Bstate(repo), pstate = new Pstate(repo);
  return {
    async info() { return { role: "A", name: "Anna", partner: "Bernd", nameA: "Anna", nameB: "Bernd" }; },
    bstate: { get: f => bstate.get(f), set: (f, v) => bstate.set(f, v) },
    pstate: { get: f => pstate.get("A", f), set: (f, v) => pstate.set("A", f, v) },
    chat: { load: () => null, save: () => true },
    uebergabe: { post: () => {}, get: () => null },
    llm: new MockLLM(["Hallo!"]).fn(),
  };
}

/** Werkgetreue Fake-Erkennung: Instanzen sammeln sich in FakeSR.instanzen. */
function machFakeSR() {
  const instanzen = [];
  function FakeSR() {
    this.started = false;
    this.stopped = false;
    this.start = () => { this.started = true; };
    this.stop = () => { this.stopped = true; if (this.onend) { const r = this.onend; this.onend = null; r(); } };
    instanzen.push(this);
  }
  FakeSR.instanzen = instanzen;
  return FakeSR;
}

const tick = () => new Promise(r => setTimeout(r, 0));
let root;
beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById("app");
});

async function appMitDiktat(diktat) {
  const app = createApp({ doc: document, backend: memoryBackend(), root, diktat });
  await app.boot();
  root.querySelector("#btnMyRoom").click(); await tick();
  root.querySelector("#btnSolo").click(); await tick(); await tick(); await tick();
  return app;
}

describe("Diktat · direkte Erkennung (Cloudflare-Fall)", () => {
  it("🎤 startet de-DE-Erkennung; finale Ergebnisse landen kumulativ im Eingabefeld; ⏹ stoppt", async () => {
    const SR = machFakeSR();
    await appMitDiktat({ SR, ua: "Mozilla (Windows NT 10.0)" });
    const mic = root.querySelector("#btnMic");
    mic.click();
    const rec = SR.instanzen[0];
    expect(rec.started).toBe(true);
    expect(rec.lang).toBe("de-DE");
    expect(mic.textContent).toBe("⏹");
    expect(root.querySelector("#pbHint").textContent).toContain("Diktat läuft");

    // Zwischenergebnis (nicht final) verändert nichts; finales wird angehängt
    rec.onresult({ resultIndex: 0, results: [Object.assign([{ transcript: "mich beschäftigt " }], { isFinal: false })] });
    expect(root.querySelector("#pbInput").value).toBe("");
    rec.onresult({ resultIndex: 0, results: [Object.assign([{ transcript: "Mich beschäftigt Nähe." }], { isFinal: true })] });
    expect(root.querySelector("#pbInput").value).toBe("Mich beschäftigt Nähe.");
    rec.onresult({ resultIndex: 1, results: [{}, Object.assign([{ transcript: " Und Zeit." }], { isFinal: true })] });
    expect(root.querySelector("#pbInput").value).toBe("Mich beschäftigt Nähe. Und Zeit.");

    mic.click();                                   // ⏹
    expect(rec.stopped).toBe(true);
    expect(mic.textContent).toBe("🎤");
  });

  it("blockiertes Mikrofon (not-allowed, z. B. Sandbox) → OS-Tipp statt Fehlerton", async () => {
    const SR = machFakeSR();
    await appMitDiktat({ SR, ua: "Mozilla (Macintosh; Intel Mac OS X)" });
    root.querySelector("#btnMic").click();
    SR.instanzen[0].onerror({ error: "not-allowed" });
    expect(root.querySelector("#pbHint").textContent).toContain("Fn-Taste");
    expect(root.querySelector("#btnMic").textContent).toBe("🎤");   // sauber zurückgesetzt
  });
});

describe("Diktat · OS-Tipp-Fallback (keine Erkennung verfügbar)", () => {
  const faelle = [
    ["Mozilla (iPhone; CPU iPhone OS)", "Bildschirmtastatur"],
    ["Mozilla (Windows NT 10.0; Win64)", "Windows-Taste + H"],
    ["Mozilla (Macintosh; Intel Mac OS X)", "Fn-Taste"],
    ["Mozilla (X11; Linux x86_64)", "Diktierfunktion deines Systems"],
  ];
  for (const [ua, erwartung] of faelle) {
    it("Plattform-Tipp für " + ua.slice(9, 25) + "…", async () => {
      await appMitDiktat({ SR: null, ua });
      root.querySelector("#btnMic").click();
      expect(root.querySelector("#pbHint").textContent).toContain(erwartung);
    });
  }
});

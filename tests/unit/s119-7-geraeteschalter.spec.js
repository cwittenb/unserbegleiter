// @vitest-environment happy-dom
// S119.7 · Die Push-Glocke wird zur Geräte-Einstellung.
//
// Vorher hing sie als Emoji-Knopf (🔔/🔕) in der Bedien-Ecke: das einzige Emoji
// der Oberfläche, ohne --rz-Token, an einem Ort, der sonst nur einen Weg trägt.
// Jetzt meldet die Plattform einen Schalter an, und der Einstellungs-Screen
// zeichnet ihn in der Gruppe "Dieses Gerät".
//
// Die Schichtgrenze ist hier der eigentliche Gegenstand: core/ darf nichts über
// Service Worker, VAPID oder PushManager wissen. Der letzte Test hält das fest.

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { createApp } from "../../core/ui/app.js";
import { meldeGeraeteSchalter, geraeteSchalter, leereGeraeteSchalter } from "../../core/ui/geraeteschalter.js";
import { Repo } from "../../core/store/repo.js";
import { Bstate, Pstate } from "../../core/store/bundles.js";
import { MemoryStore } from "../../core/store/store.js";
import { freigebeUebergabe } from "../../core/engine/freigabe.js";
import { uebergabeTeilKey } from "../../core/contracts/uebergabe.js";

// happy-dom loest import.meta.url zu einem /@fs/-Pfad auf, den readFileSync
// nicht kennt. Vitest laeuft aus der Wurzel — also von dort.
const WURZEL = process.cwd() + "/";

function memoryBackend(role = "A") {
  const store = new MemoryStore();
  const repo = new Repo({ store, ns: "T", code: "s1197", activeModuleId: "betrieb" });
  const bstate = new Bstate(repo), pstate = new Pstate(repo);
  return {
    async info() { return { role, name: "Lena", partner: "Jonas", nameA: "Lena", nameB: "Jonas" }; },
    bstate: { get: f => bstate.get(f), set: (f, v) => bstate.set(f, v) },
    pstate: { get: f => pstate.get(role, f), set: (f, v) => pstate.set(role, f, v) },
    chat: {
      load: (art, id) => repo.get("chat:" + (art === "shared" ? id : role + ":" + id), art === "shared"),
      save: (art, id, c) => repo.set("chat:" + (art === "shared" ? id : role + ":" + id), c, art === "shared"),
    },
    handover: { post: d => freigebeUebergabe(repo, role, d), get: r => repo.get(uebergabeTeilKey(r), true, "kernwetten") },
    llm: async () => ({ text: "ok", stop: "end_turn" }),
  };
}
const ruhe = async (n = 10) => { for (let i = 0; i < n; i++) await new Promise(r => setTimeout(r, 0)); };

let root;
beforeEach(() => {
  leereGeraeteSchalter();
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById("app");
});
afterEach(() => leereGeraeteSchalter());

async function bootUndEinstellungen() {
  const app = createApp({ doc: document, backend: memoryBackend(), root });
  await app.boot();
  await ruhe();
  document.getElementById("pbEinst").click();
  await ruhe();
}

describe("S119.7 · die Registry", () => {
  it("ist leer, solange niemand etwas anmeldet", () => {
    expect(geraeteSchalter()).toEqual([]);
  });

  it("nimmt einen Schalter auf und gibt eine Kopie heraus", () => {
    const def = { id: "push", label: () => "Benachrichtigungen", an: () => false, umschalten: () => true };
    meldeGeraeteSchalter(def);
    const liste = geraeteSchalter();
    expect(liste.map(s => s.id)).toEqual(["push"]);
    liste.push({ id: "fremd" });
    expect(geraeteSchalter().map(s => s.id)).toEqual(["push"]);   // Kopie, kein Zugriff auf die Liste
  });

  it("ersetzt bei gleicher Kennung, statt zu verdoppeln", () => {
    // Ein Neuaufbau der Oberfläche (relaunch nach Sprachwechsel) meldet erneut an.
    meldeGeraeteSchalter({ id: "push", label: () => "alt", an: () => false, umschalten: () => true });
    meldeGeraeteSchalter({ id: "push", label: () => "neu", an: () => false, umschalten: () => true });
    expect(geraeteSchalter().length).toBe(1);
    expect(geraeteSchalter()[0].label()).toBe("neu");
  });

  it("weist Unvollständiges ab, statt später beim Zeichnen zu scheitern", () => {
    meldeGeraeteSchalter(null);
    meldeGeraeteSchalter({ id: "ohneLabel" });
    expect(geraeteSchalter()).toEqual([]);
  });
});

describe("S119.7 · die Zeile in den Einstellungen", () => {
  it("ohne angemeldeten Schalter erscheint keine Zeile", async () => {
    await bootUndEinstellungen();
    expect(root.querySelector("#einstGeraetSchalter").children.length).toBe(0);
  });

  it("mit Schalter erscheint genau eine Zeile, in der Gruppe „Dieses Gerät“", async () => {
    meldeGeraeteSchalter({ id: "push", label: () => "Benachrichtigungen", an: () => true, umschalten: () => false });
    await bootUndEinstellungen();

    const wirt = root.querySelector("#einstGeraetSchalter");
    expect(wirt.children.length).toBe(1);
    const zeile = wirt.querySelector("#einstSchalter-push");
    expect(zeile.textContent).toContain("Benachrichtigungen");
    expect(zeile.getAttribute("aria-pressed")).toBe("true");
    // Sie steht in derselben Gruppe wie Zugang wiederfinden.
    expect(wirt.closest(".rz-einst-gruppe").querySelector("#btnRecovery")).toBeTruthy();
  });

  it("der Zustand wird gefragt, nicht gemerkt — aus wird als aus gezeichnet", async () => {
    meldeGeraeteSchalter({ id: "push", label: () => "Benachrichtigungen", an: () => false, umschalten: () => true });
    await bootUndEinstellungen();
    const zeile = root.querySelector("#einstSchalter-push");
    expect(zeile.getAttribute("aria-pressed")).toBe("false");
    expect(zeile.classList.contains("an")).toBe(false);
  });

  it("ein Tap schaltet um und die Zeile zeichnet den neuen Zustand", async () => {
    let an = false;
    const umschalten = vi.fn(async () => { an = !an; return an; });
    meldeGeraeteSchalter({ id: "push", label: () => "Benachrichtigungen", an: () => an, umschalten });
    await bootUndEinstellungen();

    root.querySelector("#einstSchalter-push").click();
    await ruhe();

    expect(umschalten).toHaveBeenCalledTimes(1);
    expect(root.querySelector("#einstSchalter-push").getAttribute("aria-pressed")).toBe("true");
  });

  it("ein Schalter, der beim Fragen scheitert, erscheint nicht", async () => {
    // Kaputt ist schlimmer als fehlend: eine Zeile, deren Zustand niemand
    // kennt, verspricht etwas, das sie nicht halten kann.
    meldeGeraeteSchalter({ id: "push", label: () => "X", an: () => { throw new Error("kein Abo lesbar"); }, umschalten: () => true });
    await bootUndEinstellungen();
    expect(root.querySelector("#einstGeraetSchalter").children.length).toBe(0);
  });
});

describe("S119.7 · Schichtgrenze", () => {
  function jsDateien(v) {
    const aus = [];
    for (const e of readdirSync(v)) {
      const p = join(v, e);
      if (statSync(p).isDirectory()) aus.push(...jsDateien(p));
      else if (e.endsWith(".js")) aus.push(p);
    }
    return aus;
  }

  it("core/ kennt kein Push-Vokabular", () => {
    const verboten = /PushManager|serviceWorker|applicationServerKey|vapid|VAPID|pushSubscription/;
    const treffer = jsDateien(join(WURZEL, "core"))
      .filter(d => verboten.test(readFileSync(d, "utf8")))
      .map(d => d.slice(WURZEL.length));
    expect(treffer, "Plattform-Wissen im Kern").toEqual([]);
  });

  it("die Bedien-Ecke trägt keinen Push-Knopf mehr", () => {
    const client = readFileSync(join(WURZEL, "platforms/cloudflare/pages/client.js"), "utf8");
    expect(client).not.toContain("pbPush");
    expect(client).not.toContain("ergaenzePushGlocke");
    expect(client).toContain("meldeGeraeteSchalter");
  });

  it("und kein Emoji mehr im Client", () => {
    const client = readFileSync(join(WURZEL, "platforms/cloudflare/pages/client.js"), "utf8");
    expect(client).not.toContain("\u{1F514}");
    expect(client).not.toContain("\u{1F515}");
  });
});

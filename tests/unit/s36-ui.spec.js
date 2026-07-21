// @vitest-environment happy-dom
// S36 · UI-Grundreinigung: Wegweiser oben IM Intro-Panel (alle Optionen offen),
// Mein Raum als 4-Zeilen-Layout, EN·DE-Kopfschalter entfernt, flache Icons,
// EIN Wartepfad (Tipp-Blase auch nach Panel-Submits, globale Pille tritt zurück).

import { describe, it, expect, beforeEach } from "vitest";
import { createApp } from "../../core/ui/app.js";
import { MockLLM } from "../../core/engine/mock-llm.js";
import { Repo } from "../../core/store/repo.js";
import { Bstate, Pstate } from "../../core/store/bundles.js";
import { MemoryStore } from "../../core/store/store.js";
import { freigebeUebergabe } from "../../core/engine/freigabe.js";
import { uebergabeTeilKey } from "../../core/contracts/uebergabe.js";

function memoryBackend(mock, role = "A") {
  const store = new MemoryStore();
  const repo = new Repo({ store, ns: "T", code: "s36", activeModuleId: "betrieb" });
  const bstate = new Bstate(repo), pstate = new Pstate(repo);
  return {
    store, repo,
    async info() { return { role, name: "Anna", partner: "Bernd", nameA: "Anna", nameB: "Bernd" }; },
    bstate: { get: f => bstate.get(f), set: (f, v) => bstate.set(f, v) },
    pstate: { get: f => pstate.get(role, f), set: (f, v) => pstate.set(role, f, v) },
    chat: {
      load: (art, id) => repo.get("chat:" + (art === "shared" ? id : role + ":" + id), art === "shared"),
      save: (art, id, c) => repo.set("chat:" + (art === "shared" ? id : role + ":" + id), c, art === "shared"),
    },
    handover: { post: d => freigebeUebergabe(repo, role, d), get: r => repo.get(uebergabeTeilKey(r), true, "kernwetten") },
    llm: mock ? mock.fn() : (async () => ({ text: "ok", stop: "end_turn" })),
  };
}

const tick = () => new Promise(r => setTimeout(r, 0));
async function klick(el) { el.click(); await tick(); await tick(); await tick(); }
const ruhe = async (n = 6) => { for (let i = 0; i < n; i++) await tick(); };

let root;
beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById("app");
});

async function bootApp(backend) {
  const app = createApp({ doc: document, backend, root });
  await app.boot();
  await ruhe();
  return app;
}

describe("S36 · Startscreen", () => {
  it("kein EN·DE-Schalter mehr in der Kopfzeile", async () => {
    await bootApp(memoryBackend(null));
    expect(root.querySelector("#pbSpr")).toBeFalsy();
  });

  it("Wegweiser lebt IM Intro-Panel (oben) und hält alle drei Optionen offen", async () => {
    await bootApp(memoryBackend(null));
    const weg = root.querySelector("#wegStart");
    expect(weg.classList.contains("pb-hidden")).toBe(false);
    // im Intro-Panel, nicht als eigene letzte Karte:
    expect(weg.closest(".pb-card").querySelector("#startIntro")).toBeTruthy();
    const txt = weg.textContent;
    expect(txt).toContain("Reflexionsgespräch");
    expect(txt).toContain("Auftragsklärung");
    expect(txt).toContain("Qualitätszeit");
    // Startscreen-Fassung spricht die Einzelperson an ("dich begleiten")
    expect(txt).toContain("wie ich dich begleiten kann");
  });

  it("Raum-Knöpfe stehen in der zentrierten Zwei-Karten-Reihe", async () => {
    await bootApp(memoryBackend(null));
    const reihe = root.querySelector("#scrStart .pb-zwei");
    expect(reihe.classList.contains("pb-mitte")).toBe(true);
    expect(reihe.querySelector("#btnMyRoom")).toBeTruthy();
    expect(reihe.querySelector("#btnSharedRoom")).toBeTruthy();
  });
});

describe("S36 · Mein Raum (4 Zeilen)", () => {
  it("Zeile 1: Einführung + Wegweiser (euch-Fassung, Ausblick-Zeile bei leerer Zeitleiste)", async () => {
    await bootApp(memoryBackend(null));
    await klick(root.querySelector("#btnMyRoom"));
    await ruhe();
    const weg = root.querySelector("#wegMein");
    expect(weg.closest(".pb-card").querySelector("#meinIntro")).toBeTruthy();
    expect(weg.textContent).toContain("wie ich euch begleiten kann");
    expect(weg.textContent).toContain("Nach einiger Zeit");
  });

  it("… und die Rückblick-Zeile, sobald Inhalte da sind", async () => {
    const backend = memoryBackend(null);
    await backend.pstate.set("timeline", { entries: [{ topics: ["Nähe"], summary: "…" }] });
    await bootApp(backend);
    await klick(root.querySelector("#btnMyRoom"));
    await ruhe();
    const txt = root.querySelector("#wegMein").textContent;
    expect(txt).toContain("Prozessreflexion");
    expect(txt).not.toContain("Nach einiger Zeit");
  });

  it("Zeile 2 Sessions nebeneinander, Zeile 3 Regale mit Inhaltspanel, Zeile 4 Zurück", async () => {
    await bootApp(memoryBackend(null));
    const raum = root.querySelector("#scrMyRoom");
    const zwei = raum.querySelector(".pb-zwei.pb-mitte");
    expect(zwei.querySelector("#btnSolo")).toBeTruthy();
    expect(zwei.querySelector("#btnEinzel")).toBeTruthy();
    const regale = raum.querySelector(".pb-reihe");
    expect(regale.querySelector("#btnZeitleiste")).toBeTruthy();
    expect(regale.querySelector("#btnMess")).toBeFalsy();     // S44: nicht mehr in der Regal-Reihe
    expect(zwei.querySelector("#btnMess")).toBeTruthy();      // S44: (verdeckt) im Auftragsklärungs-Slot
    // Inhaltspanel unter der Regal-Reihe, Zurück als letzte Zeile
    const kinder = [...raum.children];
    const box = raum.querySelector("#boxZeitleiste");
    expect(kinder.indexOf(regale)).toBeLessThan(kinder.indexOf(box));
    expect(kinder[kinder.length - 1].querySelector("#btnZurueck1")).toBeTruthy();
  });
});

describe("S36 · Flache Icons", () => {
  it("Senden und Mikrofon tragen flache SVG-Icons statt Emoji/Text", async () => {
    // S87 · Raumtrennung: Composer und Icons leben auf der Chat-Oberfläche,
    // die erst beim Betreten eines Raums gebaut wird — der Test betritt also
    // zuerst die Soloreflexion (semantisch unverändert: geprüft werden die Icons).
    const app = await bootApp(memoryBackend(new MockLLM(["Hallo Anna."])));
    await app.startChat("solo");
    await ruhe();
    const send = root.querySelector("#btnSend"), mic = root.querySelector("#btnMic");
    expect(send.getAttribute("data-icon")).toBe("send");
    expect(send.querySelector("svg")).toBeTruthy();
    expect(mic.getAttribute("data-icon")).toBe("mic");
    expect(mic.querySelector("svg")).toBeTruthy();
    expect(send.textContent.trim()).toBe("");   // kein Emoji, keine Schattierung — nur currentColor-SVG
  });
});

describe("S36 · EIN Wartepfad", () => {
  it("Panel-Submit (Skalen-Panel) zeigt die Tipp-Blase, bis die Antwort da ist", async () => {
    // Modell: erst Nachricht mit Skalen-Marker, dann steuerbare Folgeantwort
    const offen = [];
    const antworten = [
      () => ({ text: "Eine Frage zu Beginn.\n[[SCALE-SAFETY]]", stop: "end_turn" }),
      () => new Promise(res => offen.push(res)),
    ];
    const backend = memoryBackend(null);
    backend.llm = async () => antworten.shift()();
    const app = await bootApp(backend);
    const start = app.startChat("einzel");
    await ruhe(10);
    const ok = root.querySelector("#kwPanel #scOk");
    expect(ok).toBeTruthy();
    ok.click();
    await ruhe();
    // Antwort steht aus → In-Place-Blase sichtbar, globale Pille zurückgetreten
    expect(root.querySelector("#pbStream")).toBeTruthy();
    expect(root.querySelector("#pbBusy").classList.contains("pb-hidden")).toBe(true);
    offen.shift()({ text: "Danke dir.", stop: "end_turn" });
    await start.catch(() => {});
    await ruhe();
    expect(root.querySelector("#pbStream")).toBeFalsy();
  });
});

// @vitest-environment happy-dom
// S41 · Gemeinsamer Raum: neuer Startscreen-Wegweiser, 4-Zeilen-Vorraum,
// Badges für ungelesene Freigaben, ausgegraute Sessions mit sichtbarem
// Hinweis (statt Fehler-Popup), Anzeige-Wächter für Wire-Köpfe (auch
// Alt-Sessions ohne hidden-Flag).

import { describe, it, expect, beforeEach } from "vitest";
import { createApp, WIRE_KOEPFE } from "../../core/ui/app.js";
import { MockLLM } from "../../core/engine/mock-llm.js";
import { Repo } from "../../core/store/repo.js";
import { Bstate, Pstate } from "../../core/store/bundles.js";
import { MemoryStore } from "../../core/store/store.js";
import { freigebeUebergabe } from "../../core/engine/freigabe.js";
import { uebergabeTeilKey } from "../../core/contracts/uebergabe.js";
import { steuerTexte, korpusTexte } from "../../core/prompts/prompts.de.js";
import { steuerTexte as steuerTexteEn, korpusTexte as korpusTexteEn } from "../../core/prompts/prompts.en.js";
import { reglerErgebnis, rankingErgebnis, startwerteErgebnis } from "../../core/ui/kernwetten.js";

function memoryBackend(mock, role = "A") {
  const store = new MemoryStore();
  const repo = new Repo({ store, ns: "T", code: "s41", activeModuleId: "betrieb" });
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
const ruhe = async (n = 8) => { for (let i = 0; i < n; i++) await tick(); };

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

describe("S41 · Startscreen-Wegweiser", () => {
  it("führt mit der Auftragsklärung, hält Reflexionsgespräch und Qualitätszeit offen", async () => {
    await bootApp(memoryBackend(null));
    const zeilen = [...root.querySelectorAll("#wegStart .pb-item")].map(x => x.textContent);
    expect(zeilen[0]).toContain("Starte direkt mit deiner Auftragsklärung");
    expect(zeilen[1]).toContain("Reflexionsgespräch");
    expect(zeilen[2]).toContain("Qualitätszeit");
  });
});

describe("S41 · Vorraum in 4 Zeilen", () => {
  it("Überblick + Wegweiser im Panel, Session-Karten, Regal-Reihe, Zurück am Ende", async () => {
    await bootApp(memoryBackend(null));
    await klick(root.querySelector("#btnSharedRoom"));
    await ruhe();
    const raum = root.querySelector("#scrShared");
    expect(raum.querySelector("#sharedIntro").textContent).toContain("Für alles, was ihr zu zweit macht");
    expect(raum.querySelector("#wegTeil").closest(".pb-card").querySelector("#sharedIntro")).toBeTruthy();
    const karten = raum.querySelector(".pb-drei");
    expect(karten.querySelector("#btnMoment")).toBeTruthy();
    expect(karten.querySelector("#btnGemeinsam")).toBeTruthy();
    expect(karten.querySelector("#btnAufdeck")).toBeFalsy();   // S43: Aufdeckung ist Auftakt der Auflösung
    const regale = raum.querySelector(".pb-card.pb-reihe");
    expect(regale.querySelector("#btnRegal")).toBeTruthy();
    const kinder = [...raum.children];
    expect(kinder[kinder.length - 1].querySelector("#btnZurueck2")).toBeTruthy();
  });

  it("gesperrte Sessions sind ausgegraut mit sichtbarem Hinweis statt Fehler", async () => {
    await bootApp(memoryBackend(null));
    await klick(root.querySelector("#btnSharedRoom"));
    await ruhe();
    expect(root.querySelector("#btnGemeinsam").disabled).toBe(true);
    const g = root.querySelector("#gemeinsamHinweis");
    expect(g.classList.contains("pb-hidden")).toBe(false);
    expect(g.textContent).toContain("sobald ihr beide eure Auftragsklärung freigegeben habt");
  });

  it("… und öffnen sich mit beidseitiger Freigabe / Aufdeck-Wahl", async () => {
    const backend = memoryBackend(null);
    await freigebeUebergabe(backend.repo, "A", { module: "kernwetten", name: "Anna", items: [{ id: "S1", text: "x", tag: "FirstTake" }] });
    await freigebeUebergabe(backend.repo, "B", { module: "kernwetten", name: "Bernd", items: [{ id: "S1", text: "y", tag: "FirstTake" }] });
    await backend.bstate.set("reveal", { A: { top: [] }, B: { top: [] } });
    await bootApp(backend);
    await klick(root.querySelector("#btnSharedRoom"));
    await ruhe();
    expect(root.querySelector("#btnGemeinsam").disabled).toBe(false);
    expect(root.querySelector("#gemeinsamHinweis").classList.contains("pb-hidden")).toBe(true);
  });
});

describe("S41/S44/S76 · Lesezeichen für ungelesene Freigaben (je Partner)", () => {
  it("zwei Lesezeichen am Regal-Knopf: je Partner NUR das Kürzel (kein Zähler); Startscreen trägt keins", async () => {
    const backend = memoryBackend(null);
    await backend.bstate.set("shelf", {
      items: [
        { id: "sh1", by: "Bernd", text: "…", read: false },   // für Anna
        { id: "sh2", by: "Bernd", text: "…", read: false },   // für Anna
        { id: "sh3", by: "Anna", text: "…", read: false },    // für Bernd
        { id: "sh4", by: "Bernd", text: "…", read: true },    // gelesen → zählt nicht
      ],
    });
    await bootApp(backend);
    // S76 · Der Knopf "Gemeinsamer Raum" trägt KEIN Lesezeichen mehr.
    expect(root.querySelector("#badgeTeil")).toBeNull();
    await klick(root.querySelector("#btnSharedRoom"));
    await ruhe();
    const leiste = root.querySelector("#lzRegal");
    expect(leiste.classList.contains("pb-hidden")).toBe(false);
    const marken = [...leiste.querySelectorAll(".pb-lz")].map(p => p.textContent);
    expect(marken).toEqual(["A", "B"]);                       // nur Kürzel, keine Zähler
  });

  it("verschwindet bei null", async () => {
    await bootApp(memoryBackend(null));
    await klick(root.querySelector("#btnSharedRoom"));
    await ruhe();
    expect(root.querySelector("#lzRegal").classList.contains("pb-hidden")).toBe(true);
  });
});

describe("S41 · Anzeige-Wächter (Wire-Köpfe)", () => {
  it("Alt-Session: sichtbare CHOICE-RESULT-Nachricht ohne hidden-Flag wird unterdrückt", async () => {
    const mock = new MockLLM(["Weiter geht es."]);
    const backend = memoryBackend(mock);
    await backend.chat.save("shared", "moment", {
      status: "running", language: "de",
      messages: [
        { role: "assistant", content: "Wollt ihr euch verbinden?" },
        { role: "user", content: "CHOICE-RESULT: connect=Eine Minute gemeinsame Stille" },   // Altbestand, NICHT hidden
        { role: "user", content: "Anna: Ja, gern." },
      ],
    });
    const app = await bootApp(backend);
    await app.startChat("moment");
    await ruhe();
    const dom = root.querySelector("#pbMsgs").textContent;
    expect(dom).not.toContain("CHOICE-RESULT");
    expect(dom).toContain("Ja, gern");
  });

  it("Parität: jeder im Korpus/den Panels erzeugte Ergebnis-Kopf steht in der Wächter-Liste (de+en)", () => {
    const gedeckt = txt => WIRE_KOEPFE.some(k => String(txt).startsWith(k));
    expect(gedeckt(reglerErgebnis(Array.from({ length: 13 }, () => ({ w: 5, z: 5 })), "Anna"))).toBe(true);
    expect(gedeckt(rankingErgebnis("self", [0, 1, 2, 3, 4], { me: "Anna", partner: "Bernd" }))).toBe(true);
    expect(gedeckt(startwerteErgebnis("Anna", 5, "Bernd", 6))).toBe(true);
    for (const st of [steuerTexte, steuerTexteEn]) {
      expect(gedeckt(st.choiceErgebnis)).toBe(true);
      expect(gedeckt(st.aufdeckungAngezeigt)).toBe(true);
    }
    for (const kt of [korpusTexte, korpusTexteEn])
      for (const key of Object.keys(kt))
        if (/\.kopf$/.test(key) && /-RESULT|-GUESS|-SHOWN/.test(kt[key]))
          expect(gedeckt(kt[key])).toBe(true);
  });
});

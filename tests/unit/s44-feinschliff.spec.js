// @vitest-environment happy-dom
// S44 · UX-Feinschliff Auftragsklärung & Räume:
//  - Merkposten (NOTE-BLOCK, privat; Wiederaufnahme im Reflexionsgespräch)
//  - Panel-Echo (Slider hinterlassen Zusammenfassungszeile)
//  - rotierende Reglerfragen-Pools
//  - Prozessreflexion erscheint erst nach der Gemeinsamen Auflösung und ersetzt
//    dann die Auftragsklärung (nicht mehr in der Regal-Reihe)
//  - Wegweiser nach Abschluss (kein "pausiert", kein "Starte …")
//  - Zeitleisten-Eintrag mit aufklappbaren freigegebenen Punkten
//  - personalisiertes Regal, umbenannter Button, entdoppelte Momente-Intro
//  - NACHKLANG offen nach Freigabe (Composer lebt weiter)

import { describe, it, expect, beforeEach } from "vitest";
import { createApp } from "../../core/ui/app.js";
import { MockLLM } from "../../core/engine/mock-llm.js";
import { Repo } from "../../core/store/repo.js";
import { Bstate, Pstate } from "../../core/store/bundles.js";
import { MemoryStore } from "../../core/store/store.js";
import { freigebeUebergabe } from "../../core/engine/freigabe.js";
import { uebergabeTeilKey } from "../../core/contracts/uebergabe.js";
import { merkeMerkposten, baueSoloKontext } from "../../core/ui/sessions.js";
import { setKorpusSprache, K, klaerungsPrompt, reflexionsPrompt } from "../../core/prompts/prompts.js";
import { steuerTexte } from "../../core/prompts/prompts.de.js";

function memoryBackend(mock, role = "A") {
  const store = new MemoryStore();
  const repo = new Repo({ store, ns: "T", code: "s44", activeModuleId: "betrieb" });
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
  setKorpusSprache("de");
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById("app");
});
async function bootApp(backend) {
  const app = createApp({ doc: document, backend, root });
  await app.boot();
  await ruhe();
  return app;
}
async function starteEinzel(backend) {
  const app = createApp({ doc: document, backend, root });
  await app.boot();
  await klick(root.querySelector("#btnMyRoom"));
  await klick(root.querySelector("#btnEinzel"));
  await ruhe();
  return app;
}

/* ───────────────────────── Merkposten (D3) ───────────────────────── */

describe("S44 · Merkposten (privat)", () => {
  function pstateFake() {
    const m = new Map();
    return { get: async f => (m.has(f) ? m.get(f) : null), set: async (f, v) => { m.set(f, v); return v; } };
  }

  it("merkeMerkposten legt einen offenen Eintrag an und dedupliziert nach Text", async () => {
    const pstate = pstateFake();
    await merkeMerkposten({ pstate }, { note: "Angst ums Alleinsein", origin: "safety" });
    await merkeMerkposten({ pstate }, { note: "Angst ums Alleinsein", origin: "safety" });   // Dedup
    await merkeMerkposten({ pstate }, { note: "Wunsch nach mehr Nähe" });
    const mp = await pstate.get("merkposten");
    expect(mp.items).toHaveLength(2);
    expect(mp.items[0]).toMatchObject({ text: "Angst ums Alleinsein", origin: "safety", status: "open" });
    expect(mp.items[0].id).toMatch(/^MP\d+$/);
    expect(mp.items[1].origin).toBeNull();
  });

  it("leerer Merkposten wird ignoriert", async () => {
    const pstate = pstateFake();
    await merkeMerkposten({ pstate }, { note: "   " });
    expect(await pstate.get("merkposten")).toBeNull();
  });

  it("baueSoloKontext bringt offene Merkposten ein (geschlossene nicht)", () => {
    const ctx = baueSoloKontext({
      merkposten: { items: [
        { text: "Alte Sorge", status: "open" },
        { text: "Schon geteilt", status: "shared" },
      ] },
    });
    expect(ctx).toContain("MERKPOSTEN");
    expect(ctx).toContain("Alte Sorge");
    expect(ctx).not.toContain("Schon geteilt");
  });

  it("ein NOTE-BLOCK des Modells landet unsichtbar in den privaten Merkposten", async () => {
    const mock = new MockLLM([
      "Das klingt nach etwas Bedeutsamem, das wir mitnehmen sollten.\nNOTE-BLOCK\n{\"note\":\"Verletzung aus der Vorbeziehung\",\"origin\":\"safety\"}\nEND NOTE-BLOCK\nKönnen wir so weitermachen — und ich nehme das Thema mit?",
    ]);
    const backend = memoryBackend(mock);
    await starteEinzel(backend);
    const mp = await backend.pstate.get("merkposten");
    expect(mp.items.map(x => x.text)).toContain("Verletzung aus der Vorbeziehung");
    // unsichtbar: Block-Token nie im Chat, Würdigung/Frage bleiben sichtbar
    const chat = root.querySelector("#pbMsgs").textContent;
    expect(chat).not.toContain("NOTE-BLOCK");
    expect(chat).toContain("Können wir so weitermachen");
  });
});

/* ───────────────────────── Prompt-Kanarien ───────────────────────── */

describe("S44 · Prompt-Invarianten", () => {
  const kp = klaerungsPrompt("Anna", "Bernd");
  it("Sicherheits-Ansage ohne Regler-Nennung, endet mit Doppelpunkt", () => {
    expect(kp).toContain("Eine Frage, die ich allen zu Beginn stelle: …");
    expect(kp).not.toContain("die App zeigt dir dazu gleich einen Regler");
  });
  it("Nachfrage-Formulierung ist 'Was steht dahinter?'", () => {
    expect(kp).toContain("Was steht dahinter?");
    expect(kp).not.toContain("was dir diesen Wert gibt");
  });
  it("Merkposten-Konvention (NOTE-BLOCK) und Sicherheits→Regler-Konsens sind im Prompt", () => {
    expect(kp).toContain("NOTE-BLOCK");
    expect(kp).toContain("Können wir so weitermachen");
    expect(kp).toContain("ÜBERGANG SICHERHEIT → REGLER");
  });
  it("Reflexionsprompt greift offene Merkposten wieder auf", () => {
    const rp = reflexionsPrompt("Anna", "Bernd");
    expect(rp).toContain("MERKPOSTEN");
    expect(rp).toContain("Wiederaufnahme");
  });
  it("freigabeAnzahl-Steuertext öffnet den NACHKLANG (Composer bleibt)", () => {
    expect(steuerTexte.freigabeAnzahl).toContain("NACHKLANG");
    expect(steuerTexte.freigabeAnzahl).toContain("korrigieren");
  });
});

/* ───────────────────────── Panel-Echo (D2) ───────────────────────── */

describe("S44 · Panel-Echo", () => {
  it("die Sicherheits-Skala hinterlässt 'Sicherheitsfrage: N' im Verlauf, nicht das Wire-Token", async () => {
    const mock = new MockLLM([
      "Eine Frage vorab.\n[[SCALE-SAFETY]]",
      "Danke dir.",
    ]);
    const backend = memoryBackend(mock);
    await starteEinzel(backend);
    const panel = root.querySelector("#kwPanel");
    const slider = panel.querySelector("#scA");
    slider.value = "6";
    slider.dispatchEvent(new Event("input", { bubbles: true }));
    await klick(panel.querySelector("#scOk"));
    await ruhe();
    const chat = root.querySelector("#pbMsgs").textContent;
    expect(chat).toContain("Sicherheitsfrage: 6");
    expect(chat).not.toContain("SCALE-RESULT");
    expect(panel.classList.contains("pb-hidden")).toBe(true);
  });

  it("der 13-Regler-Durchlauf echot nur die ANZAHL (keine Zahlenwerte)", async () => {
    const mock = new MockLLM([
      "Los geht's mit den Bereichen.\n[[SLIDERS]]",
      "Danke — gute Grundlage.",
    ]);
    const backend = memoryBackend(mock);
    await starteEinzel(backend);
    const panel = root.querySelector("#kwPanel");
    // alle 13 Bereiche durchklicken
    for (let k = 0; k < K().DOMAINS.length; k++) {
      for (const id of ["#kwW", "#kwZ"]) {
        const inp = panel.querySelector(id);
        inp.value = "7";
        inp.dispatchEvent(new Event("input", { bubbles: true }));
      }
      await klick(panel.querySelector("#kwNext"));
    }
    await ruhe();
    const chat = root.querySelector("#pbMsgs").textContent;
    expect(chat).toContain(K().DOMAINS.length + " Lebensbereiche eingeschätzt");
    expect(chat).not.toContain("SLIDERS-RESULT");
  });
});

/* ─────────────── rotierende Reglerfragen-Pools (D-Slider) ─────────────── */

describe("S44 · Reglerfragen-Pools", () => {
  it("Gegensatzpaar zeigt eine Pool-Frage plus Pol-Legende, nicht 'Wo lebt ihr gerade?'", async () => {
    const mock = new MockLLM(["Jetzt die Bereiche.\n[[SLIDERS]]", "ok"]);
    const backend = memoryBackend(mock);
    await starteEinzel(backend);
    const panel = root.querySelector("#kwPanel").textContent;
    expect(panel).toContain("Wo steht ihr gerade?");     // istPool0 beim ersten Gegensatzpaar
    expect(panel).toContain("1=Nähe");                    // Pol-Legende erhalten
    expect(panel).not.toContain("Wo lebt ihr gerade?");   // alte Formulierung weg
  });
});

/* ─────────────── Prozessreflexion-Gating & Beförderung ─────────────── */

describe("S44 · Prozessreflexion erscheint erst nach der Auflösung", () => {
  it("ohne Befund: Auftragsklärung sichtbar, Prozessreflexion verborgen", async () => {
    await bootApp(memoryBackend(null));
    await klick(root.querySelector("#btnMyRoom"));
    await ruhe();
    expect(root.querySelector("#btnEinzel").classList.contains("pb-hidden")).toBe(false);
    expect(root.querySelector("#btnMess").classList.contains("pb-hidden")).toBe(true);
  });

  it("mit Befund: Prozessreflexion tritt an die STELLE der Auftragsklärung", async () => {
    const backend = memoryBackend(null);
    await backend.bstate.set("findings", { at: new Date().toISOString() });
    await bootApp(backend);
    await klick(root.querySelector("#btnMyRoom"));
    await ruhe();
    expect(root.querySelector("#btnEinzel").classList.contains("pb-hidden")).toBe(true);
    expect(root.querySelector("#btnMess").classList.contains("pb-hidden")).toBe(false);
    // nicht in der Regal-Reihe
    expect(root.querySelector(".pb-reihe #btnMess")).toBeFalsy();
  });
});

/* ─────────────── Wegweiser nach Abschluss ─────────────── */

describe("S44 · Wegweiser nach Abschluss der Auftragsklärung", () => {
  it("kein 'pausiert bei Kapitel', kein 'Starte direkt …' mehr", async () => {
    const backend = memoryBackend(null);
    await backend.chat.save("mine", "einzel", {
      messages: [{ role: "user", content: "x" }, { role: "assistant", content: "y" }],
      status: "running", freigegeben: true, kapitel: 3,
    });
    await bootApp(backend);
    const weg = root.querySelector("#wegStart").textContent;
    expect(weg).not.toContain("pausiert");
    expect(weg).not.toContain("Starte direkt mit deiner Auftragsklärung");
  });
});

/* ─────────────── Zeitleisten-Details ─────────────── */

describe("S44 · Zeitleiste: freigegebene Punkte aufklappbar", () => {
  it("Eintrag mit Details zeigt einen Aufklapp-Link, der die Punkte einblendet", async () => {
    const backend = memoryBackend(null);
    await backend.pstate.set("timeline", { entries: [
      { topics: ["Auftragsklärung"], summary: "abgeschlossen", at: new Date().toISOString(),
        details: [{ id: "S1", text: "Nähe ist mir wichtig" }, { id: "G1", text: "gemeinsam an Ritualen arbeiten" }] },
    ] });
    await bootApp(backend);
    await klick(root.querySelector("#btnMyRoom"));
    await klick(root.querySelector("#btnZeitleiste"));
    await ruhe();
    const items = root.querySelector("#zlItems");
    expect(items.textContent).toContain("Freigegebene Punkte ansehen");
    expect(items.querySelector("#zlDet0").classList.contains("pb-hidden")).toBe(true);
    await klick(items.querySelector("[data-zl]"));
    expect(items.querySelector("#zlDet0").classList.contains("pb-hidden")).toBe(false);
    expect(items.querySelector("#zlDet0").textContent).toContain("Nähe ist mir wichtig");
  });
});

/* ─────────────── Regal, Button, Momente-Intro ─────────────── */

describe("S44 · Beschriftungen & personalisiertes Regal", () => {
  it("Button heißt 'Geteiltes'; das Regal nennt beide Namen", async () => {
    await bootApp(memoryBackend(null));
    expect(root.querySelector("#btnRegal").textContent).toContain("Geteiltes");
    await klick(root.querySelector("#btnSharedRoom"));
    await klick(root.querySelector("#btnRegal"));
    await ruhe();
    const intro = root.querySelector("#regalIntro").textContent;
    expect(intro).toContain("Anna");
    expect(intro).toContain("Bernd");
  });

  it("Gemeinsame Momente: entdoppelter Untertitel", async () => {
    await bootApp(memoryBackend(null));
    await klick(root.querySelector("#btnSharedRoom"));
    await klick(root.querySelector("#btnQz"));
    await ruhe();
    const box = root.querySelector("#boxQz").textContent;
    expect(box).toContain("zum Nachlesen als Erinnerung");
    expect(box).not.toContain("nichts wird gemessen");
  });

  it("Agenda hostet die Sektion 'Weitere Absprachen' (Prozessreflexions-Rhythmus)", async () => {
    await bootApp(memoryBackend(null));
    await klick(root.querySelector("#btnSharedRoom"));
    await klick(root.querySelector("#btnAgenda"));
    await ruhe();
    const abs = root.querySelector("#agendaAbsprachen");
    expect(abs).toBeTruthy();
    expect(abs.textContent).toContain("Weitere Absprachen");
    expect(abs.querySelector("#miVorschlag")).toBeTruthy();
  });
});

/* ─────────────── zwei Badges (shared screen, D5) ─────────────── */

describe("S44 · Zwei Badges für ungelesene Freigaben", () => {
  it("nur ein Partner hat Offenes → genau eine Badge mit dessen Kürzel", async () => {
    const backend = memoryBackend(null);
    await backend.bstate.set("shelf", { items: [
      { id: "x1", by: "Bernd", text: "…", read: false },   // nur für Anna offen
    ] });
    await bootApp(backend);
    const pillen = [...root.querySelector("#badgeTeil").querySelectorAll(".pb-badge")].map(p => p.textContent);
    expect(pillen).toEqual(["A 1"]);
  });

  it("nichts offen → keine Badge", async () => {
    await bootApp(memoryBackend(null));
    expect(root.querySelector("#badgeTeil").classList.contains("pb-hidden")).toBe(true);
    expect(root.querySelector("#badgeTeil").querySelectorAll(".pb-badge").length).toBe(0);
  });
});

/* ─────────────── NACHKLANG offen nach Freigabe (D4b) ─────────────── */

describe("S44 · NACHKLANG: Composer lebt nach der Freigabe weiter", () => {
  const CLOSURE = JSON.stringify({ items: [
    { id: "S1", text: "Nähe wichtig", tag: "FirstTake" },
    { id: "G1", text: "gemeinsam an Ritualen arbeiten" },
  ] });

  it("nach Freigabe: Session bleibt 'running'+freigegeben, Composer da, Nachricht sendbar", async () => {
    const mock = new MockLLM([
      "Hier deine Übersicht.\nCLOSURE-BLOCK\n" + CLOSURE + "\nEND CLOSURE-BLOCK",
      "Alles freigegeben — schön. Du kannst jederzeit noch etwas korrigieren.",
      "Danke, ich ergänze das.",
    ]);
    const backend = memoryBackend(mock);
    const app = await starteEinzel(backend);
    await klick(root.querySelector("#kwPanel").querySelector("#kwFgOk"));
    await ruhe();
    expect(app._state.engine.chat.freigegeben).toBe(true);
    expect(app._state.engine.chat.status).toBe("running");
    expect(root.querySelector("#pbComposer").classList.contains("pb-hidden")).toBe(false);
    // Korrektur im Nachklang ist möglich
    root.querySelector("#pbInput").value = "Ich möchte noch etwas ergänzen.";
    await klick(root.querySelector("#btnSend"));
    await ruhe();
    expect(root.querySelector("#pbMsgs").textContent).toContain("Ich möchte noch etwas ergänzen.");
  });
});

// @vitest-environment happy-dom
// S42 · Qualitätszeit als DIE gemeinsame Session: zustandsabhängige
// Beschriftung, sauberes Beenden ([CLOSE MOMENT] per Knopf ODER verbal →
// MOMENT-BLOCK → Session wirklich zu, nächster Klick startet frisch),
// "Gemeinsame Momente" als Protokoll-Zeitstrahl, QZ-Leiter integriert
// (Stand im Kontext, gewählte Einladung persistiert).

import { describe, it, expect, beforeEach } from "vitest";
import { createApp } from "../../core/ui/app.js";
import { MockLLM } from "../../core/engine/mock-llm.js";
import { Repo } from "../../core/store/repo.js";
import { Bstate, Pstate } from "../../core/store/bundles.js";
import { MemoryStore } from "../../core/store/store.js";
import { freigebeUebergabe } from "../../core/engine/freigabe.js";
import { uebergabeTeilKey } from "../../core/contracts/uebergabe.js";
import { baueMomentKontext } from "../../core/ui/sessions.js";
import { steuerTexte, momentPrompt } from "../../core/prompts/prompts.de.js";
import { steuerTexte as steuerTexteEn, momentPrompt as momentPromptEn } from "../../core/prompts/prompts.en.js";

function memoryBackend(mock, role = "A") {
  const store = new MemoryStore();
  const repo = new Repo({ store, ns: "T", code: "s42", activeModuleId: "betrieb" });
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

const MOMENT_BLOCK = JSON.stringify({
  summary: "Ein ruhiger Abend, ihr habt über die Wochenenden gesprochen.",
  topics: ["Wochenenden"], addressed: [], deferred: [], selfResolved: [],
  shift: null, gentleInvitation: "Lust, am Sonntag zusammen zu kochen?",
});

describe("S42 · Beschriftung & Frischstart", () => {
  it("Button heißt 'beginnen' ohne und 'fortsetzen' mit laufender Session", async () => {
    const backend = memoryBackend(null);
    await bootApp(backend);
    await klick(root.querySelector("#btnSharedRoom"));
    await ruhe();
    expect(root.querySelector("#btnMoment").textContent).toContain("Qualitätszeit beginnen");
    await backend.chat.save("shared", "moment", { status: "running", messages: [{ role: "assistant", content: "Hallo ihr zwei." }] });
    await klick(root.querySelector("#btnZurueck2"));
    await klick(root.querySelector("#btnSharedRoom"));
    await ruhe();
    expect(root.querySelector("#btnMoment").textContent).toContain("Qualitätszeit fortsetzen");
  });

  it("eine abgeschlossene Qualitätszeit startet frisch (alter Verlauf erscheint nicht wieder)", async () => {
    const mock = new MockLLM(["Schön, dass ihr da seid — womit mögt ihr beginnen?"]);
    const backend = memoryBackend(mock);
    await backend.chat.save("shared", "moment", {
      status: "finished",
      messages: [{ role: "assistant", content: "Altes Gespräch über Urlaub." }],
    });
    const app = await bootApp(backend);
    await app.startChat("moment");
    await ruhe();
    const dom = root.querySelector("#pbMsgs").textContent;
    expect(dom).not.toContain("Altes Gespräch");
    expect(dom).toContain("womit mögt ihr beginnen");
  });
});

describe("S42 · Sauberes Beenden", () => {
  it("Knopf 'Session abschließen' schickt [CLOSE MOMENT] als Wire; MOMENT-BLOCK schließt und archiviert", async () => {
    const mock = new MockLLM([
      "Schön, dass ihr da seid.",
      "Dann landen wir. Nehmt den Abend mit.\nMOMENT-BLOCK\n" + MOMENT_BLOCK + "\nEND MOMENT-BLOCK",
    ]);
    const backend = memoryBackend(mock);
    const app = await bootApp(backend);
    await app.startChat("moment");
    await ruhe();
    const ende = root.querySelector("#btnChatEnde");
    expect(ende.classList.contains("pb-hidden")).toBe(false);
    await klick(ende);
    await ruhe();
    // Wire, nicht Chat; Session wirklich zu; Knopf weg
    const gesendet = mock.calls[1].messages.filter(m => m.role === "user").pop();
    expect(gesendet.content).toBe("[CLOSE MOMENT]");
    expect(gesendet.hidden).toBe(true);
    expect(app._state.engine.chat.status).toBe("finished");
    expect(root.querySelector("#btnChatEnde").classList.contains("pb-hidden")).toBe(true);
    const log = await backend.bstate.get("momentLog");
    expect(log.entries).toHaveLength(1);
    // gewählte Einladung speist die Leiter
    const qz = await backend.bstate.get("qualitytime");
    expect(qz.choices[0].text).toContain("zusammen zu kochen");
  });

  it("Korpus-Kanarien: verbales Ende erzeugt den Block; 'gespeichert' wird nie behauptet (de/en)", () => {
    const p = momentPrompt("Anna", "Bernd"), pe = momentPromptEn("Anna", "Bernd");
    expect(p).toContain("ODER beendet das Paar die Sitzung erkennbar verbal");
    expect(p).toContain('Behaupte NIE von dir aus, ein Protokoll sei "gespeichert"');
    expect(p).toContain("Gemeinsame Momente");
    expect(pe).toContain("OR the couple recognizably ends the session verbally");
    expect(steuerTexte.momentAbschluss).toBe("[CLOSE MOMENT]");
    expect(steuerTexteEn.momentAbschluss).toBe("[CLOSE MOMENT]");
  });
});

describe("S42 · Gemeinsame Momente (Protokoll-Zeitstrahl)", () => {
  it("zeigt Protokolle chronologisch mit Datum, Themen und Zwischenzeit-Impuls; leer mit Hinweis", async () => {
    const backend = memoryBackend(null);
    await bootApp(backend);
    await klick(root.querySelector("#btnSharedRoom"));
    await klick(root.querySelector("#btnQz"));
    await ruhe();
    expect(root.querySelector("#boxQz").textContent).toContain("Noch keine gemeinsamen Momente");
    await backend.bstate.set("momentLog", { entries: [
      { at: "2026-07-10T18:00:00Z", summary: "Ihr habt über die Wochenenden gesprochen.", topics: ["Wochenenden"], gentleInvitation: "Sonntag kochen" },
    ]});
    await backend.bstate.set("revealLog", { at: "2026-07-08T18:00:00Z", summary: "Top 5 aufgedeckt." });
    await klick(root.querySelector("#btnQz"));   // zu
    await klick(root.querySelector("#btnQz"));   // wieder auf
    await ruhe();
    const txt = root.querySelector("#boxQz").textContent;
    expect(txt).toContain("2026-07-08");
    expect(txt).toContain("Aufdeck-Runde");
    expect(txt).toContain("Wochenenden");
    expect(txt).toContain("Sonntag kochen");
    expect(txt.indexOf("2026-07-08")).toBeLessThan(txt.indexOf("2026-07-10"));   // chronologisch
    // altes Einladungs-Menü existiert nicht mehr
    expect(root.querySelector("#qzHolen")).toBeFalsy();
  });
});

describe("S42 · QZ-Leiter im Sessionkontext", () => {
  it("baueMomentKontext trägt RESTING, letzte Wahlen und die Leiter-Stufe", () => {
    const k = baueMomentKontext({
      goals: null, agenda: null, momentLog: null, messrunde: null, sharings: [],
      qualitytime: {
        startAt: "2026-06-01T10:00:00Z",
        resting: { Abenteuer: true },
        choices: [{ text: "Sonntag kochen", domain: "Alltagsgestaltung", at: "2026-07-01T10:00:00Z" }],
      },
    }, "Anna", "Bernd");
    expect(k).toContain("ZWISCHENZEIT-EINLADUNGEN");
    expect(k).toContain("Abenteuer");
    expect(k).toContain("Sonntag kochen");
    expect(k).toContain("Leiter-Stufe:");
  });
});

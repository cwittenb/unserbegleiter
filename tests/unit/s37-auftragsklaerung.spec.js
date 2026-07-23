// @vitest-environment happy-dom
// S37 · Auftragsklärung: Texte & Verhalten — Kanarien für Eingangstext,
// Übergänge, hörende Umformung, Abschieds-Ton; Wire-Ergebnisse (SLIDERS-
// RESULT & Co.) erscheinen NIE im Chat (Leck geschlossen + Wächter);
// Kapitel-Panel ohne Pause-Knopf; Marke als Untertitel; UI-Sprachwechsel
// im Paarsprache-Panel.

import { describe, it, expect, beforeEach } from "vitest";
import { createApp } from "../../core/ui/app.js";
import { MockLLM } from "../../core/engine/mock-llm.js";
import { Repo } from "../../core/store/repo.js";
import { Bstate, Pstate } from "../../core/store/bundles.js";
import { MemoryStore } from "../../core/store/store.js";
import { freigebeUebergabe } from "../../core/engine/freigabe.js";
import { uebergabeTeilKey } from "../../core/contracts/uebergabe.js";
import { klaerungsPrompt, DOMAINS } from "../../core/prompts/prompts.de.js";
import { klaerungsPrompt as klaerungsPromptEn } from "../../core/prompts/prompts.en.js";
import { ALLE_BLOECKE } from "../../core/contracts/registry.js";

function memoryBackend(mock, role = "A") {
  const store = new MemoryStore();
  const repo = new Repo({ store, ns: "T", code: "s37", activeModuleId: "betrieb" });
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

describe("S37 · Kanarien im Korpus (de/en)", () => {
  const p = klaerungsPrompt("Anna", "Bernd"), pe = klaerungsPromptEn("Anna", "Bernd");
  it("Eingangstext: kanonisch, mit den vier Kapitelnamen, kein Therapeut", () => {
    expect(p).toContain("Hallo ${name}!".replace("${name}", "Anna"));
    expect(p).toContain("kein Mensch und kein Therapeut");
    expect(p).toContain("Ankommen & Landkarte · Herzstücke · Rate-Runde · Klartext");
    expect(pe).toContain("not a human and not a therapist");
  });
  it("Wiedereinstieg nahtlos: keine Rückkehr-Begrüßung", () => {
    expect(p).toContain("KEINE Rückkehr-Begrüßung");
    expect(p).not.toContain("begrüße Anna in EINEM Satz zurück");
    expect(pe).toContain("NO welcome-back greeting");
  });
  it("Landkarten-Übergang ruhig, ohne Tiefen-Pathos", () => {
    expect(p).toContain("An einigen Stellen bin ich neugierig geworden");
    expect(p).not.toContain("gehen dort in die Tiefe");
    expect(pe).toContain("A few spots have made me curious");
  });
  it("Umformung: hörende Einleitung statt korrigierender; 'gesprächsfähig' verboten", () => {
    expect(p).toContain("Ich habe jetzt gehört:");
    expect(p).toContain('NIE davon sprechen, etwas "gesprächsfähig" zu machen');
    expect(p).toContain("damit es besser landen kann");
    expect(pe).toContain("What I've heard is:");
  });
  it("Abschluss: Block nie beim Namen nennen; die Begleitung ist beim Gespräch dabei", () => {
    expect(p).toContain("nenne ihn nie beim Namen");
    expect(p).toContain("unser gemeinsames Gespräch");
    expect(p).toContain('("Ich wünsche euch ein gutes Gespräch")');
    expect(pe).toContain("our conversation together");
  });
  it("Block-Platzhalter tragen keine eckigen Klammern (kein Wire-Look im Chat)", () => {
    for (const b of ALLE_BLOECKE) {
      expect(b.placeholder.startsWith("[")).toBe(false);
      expect(b.placeholder.endsWith("]")).toBe(false);
    }
  });
});

describe("S37 · Wire-Ergebnisse erscheinen NIE im Chat", () => {
  const WIRE = ["SLIDERS-RESULT", "RANKING-RESULT", "PARTNER-GUESS", "BASELINE-RESULT", "SCALE-RESULT"];
  it("Regler-Durchlauf: Ergebnis geht als hidden über den Draht; DOM bleibt sauber (Wächter)", async () => {
    const mock = new MockLLM([
      "Es kommen jetzt die Lebensbereiche.\n[[SLIDERS]]",
      "Danke für deine Einschätzungen!",
    ]);
    const backend = memoryBackend(mock);
    const app = await bootApp(backend);
    const start = app.startChat("einzel");
    await ruhe(10);
    const p = root.querySelector("#kwPanel");
    for (let i = 0; i < DOMAINS.length; i++) {
      p.querySelector("#kwW").value = "8"; p.querySelector("#kwW").dispatchEvent(new Event("input"));
      p.querySelector("#kwZ").value = "3"; p.querySelector("#kwZ").dispatchEvent(new Event("input"));
      await klick(p.querySelector("#kwNext"));
    }
    await start.catch(() => {});
    await ruhe();
    // 1) Transkript: Ergebnis liegt vor (Modell-Seite unangetastet), aber hidden
    const userMsgs = mock.calls[1].messages.filter(m => m.role === "user");
    const erg = userMsgs.find(m => m.content.includes("SLIDERS-RESULT"));
    expect(erg).toBeTruthy();
    expect(erg.hidden).toBe(true);
    // 2) Wächter: KEIN Wire-Kopf im gerenderten Chat
    const dom = root.querySelector("#pbMsgs").textContent;
    for (const kopf of WIRE) expect(dom).not.toContain(kopf);
  });
});

describe("S37 · Kapitel-Panel & Kopfzeile & UI-Sprache", () => {
  it("Kapitel-Zwischenhalt hat keinen Pause-Knopf mehr (man hört einfach auf)", async () => {
    const mock = new MockLLM([
      "Kapitelabschluss.\n[[CHAPTER-1]]",
    ]);
    const backend = memoryBackend(mock);
    const app = await bootApp(backend);
    const start = app.startChat("einzel");
    await ruhe(10);
    const p = root.querySelector("#kwPanel");
    expect(p.querySelector("#kapNext")).toBeTruthy();
    expect(p.querySelector("#kapPause")).toBeFalsy();
    start.catch(() => {});
  });
  it("Marke lebt als Wortmarke im Screen-Kopf (D2); das alte Hallo bleibt still im DOM", async () => {
    await bootApp(memoryBackend(null));
    // D2: pb-brand ist Geschichte — der Kopf traegt die Wortmarke, die
    // Begruessung ist die H1 der Papier-Haelfte (startHallo).
    expect(root.querySelector(".rz-kopf #pbKern")).toBeTruthy();
    expect(root.querySelector("#pbHallo").classList.contains("pb-hidden")).toBe(true);
  });
  it("Paarsprache-Panel bietet 'Nur UI-Sprache ändern' an; Klick stellt nur die eigene Ansicht um", async () => {
    const backend = memoryBackend(null);
    backend.language = { request: async () => ({}), withdraw: async () => ({}) };
    await bootApp(backend);
    await klick(root.querySelector("#psLink"));
    const ui = root.querySelector("#psUi");
    expect(ui).toBeTruthy();
    expect(ui.textContent).toContain("Nur UI-Sprache ändern");
    await klick(ui);
    await ruhe();
    expect(await backend.pstate.get("language")).toBe("en");
    expect(document.documentElement.lang).toBe("en");
    // zurückstellen, damit Folge-Specs deutsch starten
    const { setLocale } = await import("../../core/i18n/index.js");
    setLocale("de");
  });
});

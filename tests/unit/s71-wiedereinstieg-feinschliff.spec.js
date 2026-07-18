// @vitest-environment happy-dom
// S71 · Feinschliff Pause/Wiedereinstieg der Gemeinsamen Auflösung.
// Vier Befunde aus dem Trockenlauf:
//   (1) Fortsetzenpause: Rückkehr binnen fünf Minuten läuft NAHTLOS weiter
//       (kein Wiedereinstiegs-Ritual, kein Ankommens-Menü); erst ab fünf
//       Minuten Abwesenheit greift die Zeremonie. Ohne Pausenstempel gilt der
//       sichere Default (Zeremonie); gestempelt wird beim Verlassen des Raums.
//   (2) Ankommen: das ablehnbare CHOICE-Menü IST das Ankommen — der Prompt
//       stellt daneben KEINE zusätzliche offene Rückblicksfrage mehr.
//   (3) Wahrheits-Pflicht: bei Rückkehr wird keine Zustimmung erfunden; ein
//       offen gebliebener Auftakt-/Aufdeck-Konsens wird ruhig NEU aufgegriffen.
//   (4) Anzeige: ein sichtbarer Block-Platzhalter klebt nicht mehr am Satz; das
//       CHOICE-Menü trägt keinen statischen Vorab-Etikett mehr ("verbindend").
//   (5) Wegweiser aufloesungOffen ohne die redundante Ortsangabe.

import { describe, it, expect, beforeEach } from "vitest";
import { createApp } from "../../core/ui/app.js";
import { MockLLM } from "../../core/engine/mock-llm.js";
import { Repo } from "../../core/store/repo.js";
import { Bstate, Pstate } from "../../core/store/bundles.js";
import { MemoryStore } from "../../core/store/store.js";
import { freigebeUebergabe } from "../../core/engine/freigabe.js";
import { uebergabeTeilKey } from "../../core/contracts/uebergabe.js";
import { aufloesungsPrompt } from "../../core/prompts/prompts.de.js";
import { aufloesungsPrompt as aufloesungsPromptEn } from "../../core/prompts/prompts.en.js";
import { cleanDisplay } from "../../core/contracts/block.js";
import { BLOECKE } from "../../core/contracts/registry.js";
import { de } from "../../core/i18n/de.js";
import { en } from "../../core/i18n/en.js";

function memoryBackend(mock, role = "A") {
  const store = new MemoryStore();
  const repo = new Repo({ store, ns: "T", code: "s71", activeModuleId: "betrieb" });
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
const ruhe = async (n = 10) => { for (let i = 0; i < n; i++) await tick(); };

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

async function beideFreigaben(backend) {
  await freigebeUebergabe(backend.repo, "A", { module: "kernwetten", name: "Anna", items: [{ id: "S1", text: "Nähe", tag: "FirstTake" }] });
  await freigebeUebergabe(backend.repo, "B", { module: "kernwetten", name: "Bernd", items: [{ id: "S1", text: "Ruhe", tag: "FirstTake" }] });
}

// Pausierte Gemeinsame Auflösung mit optionalem Pausenstempel.
async function pausierteAufloesung(backend, { pausedAt, letzterZug } = {}) {
  const chat = {
    status: "running",
    messages: [
      { role: "user", content: "Wir sind beide da.", hidden: true },
      { role: "assistant", content: letzterZug || "Dann pausieren wir hier — bis zum nächsten Mal, ihr zwei." },
    ],
  };
  if (pausedAt != null) chat.pausedAt = pausedAt;
  await backend.chat.save("shared", "gemeinsam", chat);
}

async function betreteAufloesung() {
  await klick(root.querySelector("#btnSharedRoom"));
  await klick(root.querySelector("#btnGemeinsam"));
  await ruhe(14);
}
const gesendeteUser = mock =>
  mock.calls.flatMap(c => c.messages).filter(m => m.role === "user").map(m => m.content).join("\n");

describe("S71 · Fortsetzenpause (Fünf-Minuten-Schwelle)", () => {
  it("Rückkehr binnen fünf Minuten läuft nahtlos weiter — kein Ritual, kein Modell-Aufruf", async () => {
    const mock = new MockLLM(["DARF BEI NAHTLOSER FORTSETZUNG NICHT AUFGERUFEN WERDEN"]);
    const backend = memoryBackend(mock);
    await beideFreigaben(backend);
    await pausierteAufloesung(backend, { pausedAt: Date.now() });   // eben erst pausiert
    await bootApp(backend);
    await betreteAufloesung();
    expect(gesendeteUser(mock)).not.toContain("[Rückkehr in die laufende Gemeinsame Auflösung");
    expect(mock.calls.length).toBe(0);   // resume() beantwortet einen freien Assistant-Zug nicht mit dem Modell
    expect(root.querySelector("#pbMsgs").textContent).toContain("pausieren wir hier");   // der letzte Zug steht
  });

  it("Rückkehr nach über fünf Minuten löst das Wiedereinstiegs-Ritual aus", async () => {
    const mock = new MockLLM(["Schön, dass ihr wieder da seid — beim letzten Mal haben wir pausiert."]);
    const backend = memoryBackend(mock);
    await beideFreigaben(backend);
    await pausierteAufloesung(backend, { pausedAt: Date.now() - 6 * 60 * 1000 });   // vor sechs Minuten pausiert
    await bootApp(backend);
    await betreteAufloesung();
    expect(gesendeteUser(mock)).toContain("[Rückkehr in die laufende Gemeinsame Auflösung");
  });

  it("Ohne Pausenstempel (Legacy / Tab-Abbruch) gilt der sichere Default: Ritual", async () => {
    const mock = new MockLLM(["Schön, dass ihr wieder da seid."]);
    const backend = memoryBackend(mock);
    await beideFreigaben(backend);
    await pausierteAufloesung(backend, {});   // kein pausedAt
    await bootApp(backend);
    await betreteAufloesung();
    expect(gesendeteUser(mock)).toContain("[Rückkehr in die laufende Gemeinsame Auflösung");
  });

  it("Verlassen des Raums stempelt den Pausenbeginn auf die laufende Session", async () => {
    const mock = new MockLLM(["Schön, dass ihr wieder da seid."]);
    const backend = memoryBackend(mock);
    await beideFreigaben(backend);
    await pausierteAufloesung(backend, { pausedAt: Date.now() - 6 * 60 * 1000 });
    await bootApp(backend);
    await betreteAufloesung();
    const vorher = Date.now();
    await klick(root.querySelector("#btnChatZurueck"));
    await ruhe();
    const gespeichert = await backend.chat.load("shared", "gemeinsam");
    expect(typeof gespeichert.pausedAt).toBe("number");
    expect(gespeichert.pausedAt).toBeGreaterThanOrEqual(vorher - 1000);
  });
});

describe("S71 · Prompt-Härtung Wiedereinstieg (de + en)", () => {
  const p = aufloesungsPrompt("Anna", "Bernd");
  const pe = aufloesungsPromptEn("Anna", "Bernd");

  it("Schritt 2: das ablehnbare Menü IST das Ankommen — keine zusätzliche offene Frage", () => {
    expect(p).toContain("IST das Ankommen");
    expect(p).toContain("Wie ist es euch seit der Pause ergangen?");   // ausdrücklich als Gegenbeispiel benannt
    expect(p).toContain("ANKOMMENS-EINLADUNG");
    expect(p).toContain('"id":"arrive"');
    expect(pe).toContain("IS the arrival");
    expect(pe).toContain("How have things been for you since the pause?");
  });

  it("Schritt 3: Wahrheits-Pflicht — keine erfundene Zustimmung, offene Frage neu aufgreifen", () => {
    expect(p).toContain("WAHRHEITS-PFLICHT");
    expect(p).toContain("behaupte nie einen Schritt");
    expect(p).toContain("greif genau diese Frage ruhig NEU auf");
    expect(pe).toContain("TRUTHFULNESS");
    expect(pe).toContain("ANEW");
  });

  it("erhält die S64-Kanarien (kein Regress am Wiedereinstieg)", () => {
    expect(p).toContain("WIEDEREINSTIEG (laufende Session)");
    expect(p).toContain('NIE als "heute" oder "eben"');
    expect(p).toContain("NAHTLOS an der aktuellen Phase weiter");
    expect(p).toContain("2–3 kleine Ankommens-Momente");
  });
});

describe("S71 · Anzeige-Hygiene: Platzhalter klebt nicht, Choice ohne Vorab-Etikett", () => {
  it("ein sichtbarer Platzhalter bekommt einen Absatz, statt am Satz zu kleben", () => {
    const text = 'Hier ist, was ich sehe:CLOSURE-BLOCK{"x":1}END CLOSURE-BLOCK';
    const out = cleanDisplay(text, [], [BLOECKE.abschluss]);
    expect(out).not.toMatch(/sehe:Deine Abschluss-Übersicht zur Freigabe:/);   // nicht mehr geklebt
    expect(out).toContain("Deine Abschluss-Übersicht zur Freigabe:");
  });

  it("das CHOICE-Menü trägt keinen statischen Vorab-Etikett mehr (kein „verbindend“)", () => {
    expect(BLOECKE.choice.placeholder).toBe("");
    const text = 'Kommt kurz an:CHOICE-BLOCK{"id":"arrive","title":"Womit mögt ihr ankommen?","options":["a","b"]}END CHOICE-BLOCK';
    const out = cleanDisplay(text, [], [BLOECKE.choice]);
    expect(out).not.toContain("verbindend");
    expect(out).not.toContain("Angebot:");
    expect(out).not.toContain("CHOICE-BLOCK");
    expect(out).toContain("Kommt kurz an:");
  });

  it("unsichtbare Blöcke (leerer Platzhalter) hinterlassen keine Leerzeile", () => {
    const text = 'Alles gut.\nNOTE-BLOCK{"text":"merk"}END NOTE-BLOCK';
    const out = cleanDisplay(text, [], [BLOECKE.note]);
    expect(out).toBe("Alles gut.");
  });
});

describe("S71 · Wegweiser aufloesungOffen ohne Ortsdopplung", () => {
  it("de nennt nicht mehr „im gemeinsamen Raum“, bleibt aber sprechend", () => {
    expect(de["weg.aufloesungOffen"]).not.toContain("im gemeinsamen Raum");
    expect(de["weg.aufloesungOffen"]).toContain("Eure Gemeinsame Auflösung ist offen");
  });

  it("en-Parität ohne „in the shared space“", () => {
    expect(en["weg.aufloesungOffen"]).not.toContain("in the shared space");
    expect(en["weg.aufloesungOffen"]).toContain("Your Shared Resolution is open");
  });
});

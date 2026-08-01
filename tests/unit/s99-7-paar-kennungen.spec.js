// @vitest-environment happy-dom
// S99.7 · Der Paar-Kennungs-Handschlag existiert jetzt wirklich.
//
// Der Prompt verspricht ihn seit S95.2 wörtlich: "id = die Paar-Kennung, die
// dir die App im Verlauf mitgibt". Die App gab sie nie mit. Die Kennungen
// entstehen aus den NACHRICHTEN-INDIZES des Chats (P<i>-<j>, versteckte Züge
// eingerechnet) — die kann ein Modell nicht sehen und nicht nachzählen. Also
// riet es. Geratene Kennungen stehen in keinem Eignungsbericht, der zu einem
// Paar passt; paarWaehlbar ist dann für ALLE Paare falsch, die Ausschnitt-Tür
// bleibt stumm zu — und weil an ihr die Verlaufs-Ablage hing (S95.7a), blieb
// auch der Wortlaut aus. Eine unerfüllte Zusage im Prompt, drei Ebenen tief.

import { describe, it, expect, beforeEach } from "vitest";
import { createApp } from "../../core/ui/app.js";
import { MockLLM, uebersetzeDrehbuchText } from "../../core/engine/mock-llm.js";
import { Repo } from "../../core/store/repo.js";
import { Bstate, Pstate } from "../../core/store/bundles.js";
import { MemoryStore } from "../../core/store/store.js";
import { paareAusVerlauf } from "../../core/engine/ausschnitt.js";
import { PAIRS_KOPF, WIRE_KOEPFE, istWireNachricht } from "../../core/contracts/steuertoken.js";
import { reflexionsPrompt } from "../../core/prompts/prompts.de.js";
import { reflexionsPrompt as reflexionsPromptEn } from "../../core/prompts/prompts.en.js";

function memoryBackend(mock, role = "A") {
  const store = new MemoryStore();
  const repo = new Repo({ store, ns: "T", code: "s997", activeModuleId: "betrieb" });
  const bstate = new Bstate(repo), pstate = new Pstate(repo);
  return {
    async info() { return { role, name: "Anna", partner: "Bernd", nameA: "Anna", nameB: "Bernd" }; },
    bstate: { get: f => bstate.get(f), set: (f, v) => bstate.set(f, v) },
    pstate: { get: f => pstate.get(role, f), set: (f, v) => pstate.set(role, f, v) },
    chat: {
      load: (art, id) => repo.get("chat:" + (art === "shared" ? id : role + ":" + id), art === "shared"),
      save: (art, id, c) => repo.set("chat:" + (art === "shared" ? id : role + ":" + id), c, art === "shared"),
    },
    handover: { post: async () => {}, get: async () => null },
    llm: mock.fn(),
  };
}
const tick = () => new Promise(r => setTimeout(r, 0));
async function klick(el) { el.click(); await tick(); await tick(); await tick(); }
const ruhe = async (n = 14) => { for (let i = 0; i < n; i++) await tick(); };

let root;
beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById("app");
});

/** Zwei Frage-Antwort-Paare, dann der Griff zum Abschluss. */
async function bisZumAbschluss(mock) {
  const backend = memoryBackend(mock);
  const app = createApp({ doc: document, backend, root });
  await app.boot();
  await ruhe();
  await app.startChat("solo");
  await ruhe();
  for (const satz of ["Die Absage am Dienstag.", "Ich ziehe mich dann zurück."]) {
    root.querySelector("#pbInput").value = satz;
    root.querySelector("#btnSend").click();
    await ruhe();
  }
  const paare = paareAusVerlauf(app.engine().chat.messages);
  await klick(root.querySelector("#btnChatEnde"));
  await klick(root.querySelector("#btnEndeJa"));
  await ruhe(20);
  return { app, backend, paare };
}

const ANTWORTEN = ["Was beschäftigt dich?", "Und was macht das mit dir?", "Was brauchst du gerade?"];

describe("S99.7 · Die Kennungen reisen mit dem Abschluss", () => {
  it("der Abschluss-Zug trägt PAIRS und den Steuertext in EINER Nachricht", async () => {
    const { app } = await bisZumAbschluss(new MockLLM([...ANTWORTEN, "Alles Gute."]));
    const zug = app.engine().chat.messages.filter(m => m.role === "user").pop();
    expect(zug.content.startsWith(PAIRS_KOPF)).toBe(true);
    expect(zug.content).toContain("[CLOSE SESSION]");
    expect(zug.hidden).toBe(true);
  });

  it("genau die Kennungen, die auch die Auswahl berechnet", async () => {
    const { app, paare } = await bisZumAbschluss(new MockLLM([...ANTWORTEN, "Alles Gute."]));
    const zug = app.engine().chat.messages.filter(m => m.role === "user").pop();
    expect(paare.length).toBe(2);
    for (const p of paare) expect(zug.content).toContain(p.id);
    // Die Frage steht dabei, damit der Begleiter das Paar wiedererkennt —
    // die Antwort nicht: sie steht ihm im Verlauf ohnehin vollständig zur Verfügung.
    expect(zug.content).toContain("Was beschäftigt dich?");
    expect(zug.content).not.toContain("Die Absage am Dienstag.\n");
  });

  it("PAIRS ist ein Wire-Kopf — Protokoll, nie Anzeige", async () => {
    expect(WIRE_KOEPFE).toContain(PAIRS_KOPF);
    const { app } = await bisZumAbschluss(new MockLLM([...ANTWORTEN, "Alles Gute."]));
    const zug = app.engine().chat.messages.filter(m => m.role === "user").pop();
    expect(istWireNachricht(zug)).toBe(true);
    expect(root.querySelector("#pbMsgs").textContent).not.toContain(PAIRS_KOPF);
  });

  it("die Kennungs-Nachricht bildet selbst kein Paar — kein Selbstbezug", async () => {
    const { app, paare } = await bisZumAbschluss(new MockLLM([...ANTWORTEN, "Alles Gute."]));
    const danach = paareAusVerlauf(app.engine().chat.messages);
    expect(danach.map(p => p.id)).toEqual(paare.map(p => p.id));
  });

  it("ohne Paare reist nichts mit — eine leere Liste wäre eine Einladung ins Leere", async () => {
    const mock = new MockLLM(["Schön, dass du da bist.", "Alles Gute."]);
    const backend = memoryBackend(mock);
    const app = createApp({ doc: document, backend, root });
    await app.boot();
    await ruhe();
    await app.startChat("solo");
    await ruhe();
    await klick(root.querySelector("#btnChatEnde"));
    await klick(root.querySelector("#btnEndeJa"));
    await ruhe();
    const zug = app.engine().chat.messages.filter(m => m.role === "user").pop();
    expect(zug.content).toBe("[CLOSE SESSION]");
  });
});

describe("S99.7 · Damit wird die Ausschnitt-Tür überhaupt erreichbar", () => {
  it("ein Eignungsbericht MIT den mitgegebenen Kennungen öffnet den Zugang", async () => {
    const backend = memoryBackend(new MockLLM(ANTWORTEN));
    const app = createApp({ doc: document, backend, root });
    await app.boot();
    await ruhe();
    await app.startChat("solo");
    await ruhe();
    for (const satz of ["Die Absage am Dienstag.", "Ich ziehe mich dann zurück."]) {
      root.querySelector("#pbInput").value = satz;
      root.querySelector("#btnSend").click();
      await ruhe();
    }
    // Das Modell antwortet mit den Kennungen, die ihm der Abschluss-Zug nennt.
    const kennungen = () => {
      const zug = app.engine().chat.messages.filter(m => m.role === "user").pop();
      return zug.content.split("\n").slice(1)
        .map(z => z.split(" · ")[0]).filter(x => /^P\d+-\d+$/.test(x));
    };
    app.engine().llm = (system, messages, opts) => {
      const ids = kennungen();
      const text = "Magst du dir Stellen aussuchen, die Bernd lesen darf?\nEXCERPT-BLOCK\n" +
        JSON.stringify({ pairs: ids.map(id => ({ id, ownerOk: true, companionOk: true, reason: null })) }) +
        "\nEND EXCERPT-BLOCK";
      // ST2: Fassaden-Vertrag des Struktur-Modus — data liegt bei (wie MockLLM).
      return Promise.resolve({
        text, stop: "end_turn",
        data: uebersetzeDrehbuchText(text, opts && opts.structured),
        strukturQuelle: "mock",
      });
    };
    await klick(root.querySelector("#btnChatEnde"));
    await klick(root.querySelector("#btnEndeJa"));
    await ruhe(20);

    const tuer = root.querySelector("#ausschnittPanel");
    expect(tuer.classList.contains("pb-hidden"), "die Tür muss offen stehen").toBe(false);
    expect(tuer.textContent).toContain("Stellen aussuchen");
  });

  it("geratene Kennungen lassen die Tür zu — das war der stille Ausfall", async () => {
    const backend = memoryBackend(new MockLLM(ANTWORTEN));
    const app = createApp({ doc: document, backend, root });
    await app.boot();
    await ruhe();
    await app.startChat("solo");
    await ruhe();
    for (const satz of ["Die Absage am Dienstag.", "Ich ziehe mich dann zurück."]) {
      root.querySelector("#pbInput").value = satz;
      root.querySelector("#btnSend").click();
      await ruhe();
    }
    app.testAusschnitt([{ id: "P4-5", ownerOk: true, companionOk: true, reason: null }]);
    await ruhe();
    expect(root.querySelector("#ausschnittPanel").classList.contains("pb-hidden")).toBe(true);
  });
});

describe("S99.7 · Der Prompt weiß jetzt, woher die Kennungen kommen", () => {
  it("DE nennt die PAIRS-Liste und verbietet Erfinden", () => {
    const p = reflexionsPrompt("Anna", "Bernd");
    expect(p).toContain("PAIRS-Liste");
    expect(p).toMatch(/erfundene oder nachgezählte Kennungen/i);
  });

  it("EN nennt sie ebenfalls", () => {
    const p = reflexionsPromptEn("Anna", "Bernd");
    expect(p).toContain("PAIRS list");
    expect(p).toMatch(/invented or recounted identifiers/i);
  });
});

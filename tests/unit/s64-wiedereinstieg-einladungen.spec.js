// @vitest-environment happy-dom
// S64 · Generischer Wiedereinstieg & Einladungs-Menüs:
//   (1) Der Wiedereinstieg in eine laufende Session ist ein GENERISCHER
//       Mechanismus der SessionDef (Feld `wiedereinstieg` = steuerTexte-
//       Schlüssel) — kein Sonderfall je Raum mehr. Deklariert: einzel
//       (einzelWeiter, S53-Verhalten unverändert) und gemeinsam
//       (gemeinsamWeiter, neu).
//   (2) Beim Wiederbetreten der pausierten Gemeinsamen Auflösung geht der
//       versteckte Steuertext ans Modell; der Prompt eröffnet den
//       WIEDEREINSTIEG (keine "heute"-Verwirrung, Ankommens-Einladung als
//       ablehnbares CHOICE-Menü id "arrive").
//   (3) Bei Vertagung bietet der Prompt die Abschieds-Einladung (CHOICE-Menü
//       id "farewell") an; die App ergänzt je die gleichwertige Ohne-Option.

import { describe, it, expect, beforeEach } from "vitest";
import { createApp } from "../../core/ui/app.js";
import { MockLLM } from "../../core/engine/mock-llm.js";
import { Repo } from "../../core/store/repo.js";
import { Bstate, Pstate } from "../../core/store/bundles.js";
import { MemoryStore } from "../../core/store/store.js";
import { freigebeUebergabe } from "../../core/engine/freigabe.js";
import { uebergabeTeilKey } from "../../core/contracts/uebergabe.js";
import { einzelDef, gemeinsamDef } from "../../core/ui/kernwetten.js";
import { aufloesungsPrompt, steuerTexte, korpusTexte } from "../../core/prompts/prompts.de.js";
import { steuerTexte as steuerTexteEn, korpusTexte as korpusTexteEn } from "../../core/prompts/prompts.en.js";

function memoryBackend(mock, role = "A") {
  const store = new MemoryStore();
  const repo = new Repo({ store, ns: "T", code: "s64", activeModuleId: "betrieb" });
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

async function pausierteAufloesung(backend, letzterZug) {
  await backend.chat.save("shared", "gemeinsam", {
    status: "running",
    messages: [
      { role: "user", content: "Wir sind beide da.", hidden: true },
      { role: "assistant", content: letzterZug || "Dann pausieren wir hier — bis zum nächsten Mal, ihr zwei." },
    ],
  });
}

describe("S64 · Generischer Wiedereinstieg (SessionDef)", () => {
  it("einzel und gemeinsam deklarieren ihren Steuertext-Schlüssel; die Texte existieren de+en", () => {
    expect(einzelDef({}, {}).wiedereinstieg).toBe("einzelWeiter");
    expect(gemeinsamDef({}, {}).wiedereinstieg).toBe("gemeinsamWeiter");
    for (const st of [steuerTexte, steuerTexteEn]) {
      expect(typeof st.gemeinsamWeiter).toBe("string");
      expect(st.gemeinsamWeiter.startsWith("[")).toBe(true);
    }
    expect(steuerTexte.gemeinsamWeiter).toContain("Gemeinsame Auflösung");
    expect(steuerTexte.gemeinsamWeiter).toContain("WIEDEREINSTIEG");
  });

  it("Wiederbetreten der pausierten Auflösung schickt den versteckten Steuertext — unsichtbar im Verlauf", async () => {
    const mock = new MockLLM(["Schön, dass ihr wieder da seid — beim letzten Mal haben wir nach den Sorgen pausiert."]);
    const backend = memoryBackend(mock);
    await beideFreigaben(backend);
    await pausierteAufloesung(backend);
    await bootApp(backend);
    await klick(root.querySelector("#btnSharedRoom"));
    await klick(root.querySelector("#btnGemeinsam"));
    await ruhe(14);
    const gesendet = mock.calls.flatMap(c => c.messages).filter(m => m.role === "user").map(m => m.content).join("\n");
    expect(gesendet).toContain("[Rückkehr in die laufende Gemeinsame Auflösung");
    const dom = root.querySelector("#pbMsgs").textContent;
    expect(dom).not.toContain("Rückkehr in die laufende");
    expect(dom).toContain("Schön, dass ihr wieder da seid");
  });

  it("KEIN Steuertext beim Erstbetreten (Kontext-Pfad) …", async () => {
    const mock = new MockLLM(["Hallo ihr beiden — schön, dass ihr da seid."]);
    const backend = memoryBackend(mock);
    await beideFreigaben(backend);
    await bootApp(backend);
    await klick(root.querySelector("#btnSharedRoom"));
    await klick(root.querySelector("#btnGemeinsam"));
    await ruhe(14);
    const gesendet = mock.calls.flatMap(c => c.messages).filter(m => m.role === "user").map(m => m.content).join("\n");
    expect(gesendet).not.toContain("[Rückkehr in die laufende Gemeinsame Auflösung");
  });

  it("… und KEINER, wenn der letzte Zug nicht frei ist (offener CHOICE-Block wird stattdessen wieder geöffnet)", async () => {
    const mock = new MockLLM([]);
    const backend = memoryBackend(mock);
    await beideFreigaben(backend);
    await pausierteAufloesung(backend,
      'Mögt ihr eine Einladung mitnehmen?\nCHOICE-BLOCK\n{"id":"farewell","title":"Mögt ihr eine kleine Einladung mitnehmen?","options":["Ein Spaziergang zu zweit","Von einem Wunsch-Abenteuer träumen"]}\nEND CHOICE-BLOCK');
    await bootApp(backend);
    await klick(root.querySelector("#btnSharedRoom"));
    await klick(root.querySelector("#btnGemeinsam"));
    await ruhe(14);
    const gesendet = mock.calls.flatMap(c => c.messages).filter(m => m.role === "user").map(m => m.content).join("\n");
    expect(gesendet).not.toContain("[Rückkehr in die laufende Gemeinsame Auflösung");
    expect(root.querySelector("#kwPanel").classList.contains("pb-hidden")).toBe(false);   // Panel steht wieder
  });

  it("S53-Verhalten der Auftragsklärung bleibt über den generischen Pfad erhalten", async () => {
    const mock = new MockLLM(["Schön, dass du wieder da bist, Anna."]);
    const backend = memoryBackend(mock);
    await backend.chat.save("mine", "einzel", {
      status: "running", kapitel: 2,
      messages: [
        { role: "user", content: "Ich bin da.", hidden: true },
        { role: "assistant", content: "Magst du mehr erzählen?" },
      ],
    });
    const app = await bootApp(backend);
    await app.startChat("einzel");
    await ruhe(14);
    const gesendet = mock.calls.flatMap(c => c.messages).filter(m => m.role === "user").map(m => m.content).join("\n");
    expect(gesendet).toContain("[Rückkehr in die laufende Auftragsklärung");
  });
});

describe("S64 · Einladungs-Menüs (arrive/farewell) in der Gemeinsamen Auflösung", () => {
  it("CHOICE-BLOCK id arrive öffnet das Menü mit Ohne-Option; die Wahl geht als CHOICE-RESULT über den Draht", async () => {
    const mock = new MockLLM([
      'Schön, dass ihr wieder da seid. Womit mögt ihr ankommen?\nCHOICE-BLOCK\n{"id":"arrive","title":"Womit mögt ihr wieder ankommen?","options":["Eine Minute gemeinsame Stille","Einen guten Gedanken übereinander teilen"]}\nEND CHOICE-BLOCK',
      "Schön — dann eine Minute Stille, ich sage euch, wann sie um ist.",
    ]);
    const backend = memoryBackend(mock);
    await beideFreigaben(backend);
    await pausierteAufloesung(backend);
    await bootApp(backend);
    await klick(root.querySelector("#btnSharedRoom"));
    await klick(root.querySelector("#btnGemeinsam"));
    await ruhe(14);
    const panel = root.querySelector("#kwPanel");
    expect(panel.classList.contains("pb-hidden")).toBe(false);
    expect(panel.textContent).toContain("Womit mögt ihr wieder ankommen?");
    expect(panel.textContent).toContain("Ohne Ankommens-Moment weiter");   // App-Invariante
    expect(root.querySelector("#pbMsgs").textContent).not.toContain("CHOICE-BLOCK");   // Anzeige-Hygiene
    await klick(panel.querySelector('[data-ch="0"]'));
    await ruhe(12);
    const gesendet = mock.calls.flatMap(c => c.messages).filter(m => m.role === "user").map(m => m.content).join("\n");
    expect(gesendet).toContain("CHOICE-RESULT: arrive=Eine Minute gemeinsame Stille");
  });

  it("CHOICE-BLOCK id farewell trägt die eigene Ohne-Option", async () => {
    const mock = new MockLLM([
      'Dann landen wir hier. Mögt ihr eine kleine Einladung mitnehmen?\nCHOICE-BLOCK\n{"id":"farewell","title":"Mögt ihr eine kleine Einladung mitnehmen?","options":["Von einem Wunsch-Abenteuer träumen","Ein Abendspaziergang zu zweit"]}\nEND CHOICE-BLOCK',
    ]);
    const backend = memoryBackend(mock);
    await beideFreigaben(backend);
    await pausierteAufloesung(backend);
    await bootApp(backend);
    await klick(root.querySelector("#btnSharedRoom"));
    await klick(root.querySelector("#btnGemeinsam"));
    await ruhe(14);
    const panel = root.querySelector("#kwPanel");
    expect(panel.textContent).toContain("Wunsch-Abenteuer");
    expect(panel.textContent).toContain("Ohne Einladung verabschieden");
  });

  it("Korpustexte der Ohne-Optionen existieren de+en (Schlüsselparität deckt korpus-invarianten)", () => {
    for (const kt of [korpusTexte, korpusTexteEn]) {
      expect(typeof kt["choice.arrive.ohne"]).toBe("string");
      expect(typeof kt["choice.farewell.ohne"]).toBe("string");
      expect(typeof kt["choice.arrive.titel"]).toBe("string");
      expect(typeof kt["choice.farewell.titel"]).toBe("string");
    }
  });
});

describe("S64 · Prompt-Kanarien Wiedereinstieg & Abschied", () => {
  const p = aufloesungsPrompt("Anna", "Bernd");
  it("WIEDEREINSTIEG: Wiederkehr-Begrüßung, keine 'heute'-Verwirrung, nahtlos weiter", () => {
    expect(p).toContain("WIEDEREINSTIEG (laufende Session)");
    expect(p).toContain('NIE als "heute" oder "eben"');
    expect(p).toContain("NAHTLOS an der aktuellen Phase weiter");
  });
  it("Ankommens-Einladung als ablehnbares Menü (id arrive, 2–3 Optionen)", () => {
    expect(p).toContain("ANKOMMENS-EINLADUNG");
    expect(p).toContain('"id":"arrive"');
    expect(p).toContain("2–3 kleine Ankommens-Momente");
  });
  it("Abschieds-Einladung bei jeder Vertagung (id farewell), Pausenmarke verweist darauf", () => {
    expect(p).toContain("ABSCHIEDS-EINLADUNG (bei jeder Vertagung");
    expect(p).toContain('"id":"farewell"');
    expect(p).toContain("keine Aufgabe, keine Hausaufgabe");
    expect(p).toContain("bei Vertagung greift die ABSCHIEDS-EINLADUNG");
  });
});

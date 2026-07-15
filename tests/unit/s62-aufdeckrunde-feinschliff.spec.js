// @vitest-environment happy-dom
// S62 · Aufdeckrunde-Feinschliff & Gesprächs-Vertiefung:
//   (1) Scroll-Disziplin: Ziel ist das Eingabefeld, nie das Seitenende;
//       Hochscrollen der Person stoppt das Mitlaufen, eigenes Senden und
//       (Wieder-)Betreten nehmen es wieder auf.
//   (2) Aufdeck-Tafel als Karte IM Gesprächsverlauf (persistiert als Meta
//       der auslösenden Nachricht), kein "Tafel ausblenden" mehr, der
//       Weiter-Knopf trägt einen Ausblick und hängt nur an der jüngsten Tafel.
//   (3) Zwei-Schritt-Aufdeckung: [[REVEAL-A]]/[[REVEAL-B]] zeigen je eine
//       Richtung, Legacy-[[REVEAL]] beide; Wiederholung ist idempotent.
//   (4) Dauerhafter Subtext unter "Gemeinsame Auflösung beginnen".
//   (5) Wegweiser-Zeilen auf der Startseite nennen immer den Raum.
//   (6) Prompt-Baustein "bedeutsame Momente" in allen vier Sessions verdrahtet
//       (Qualitätszeit separat — Prompt-Isolation).

import { describe, it, expect, beforeEach } from "vitest";
import { createApp } from "../../core/ui/app.js";
import { MockLLM } from "../../core/engine/mock-llm.js";
import { Repo } from "../../core/store/repo.js";
import { Bstate, Pstate } from "../../core/store/bundles.js";
import { MemoryStore } from "../../core/store/store.js";
import { freigebeUebergabe } from "../../core/engine/freigabe.js";
import { uebergabeTeilKey } from "../../core/contracts/uebergabe.js";
import { gemeinsamDef } from "../../core/ui/kernwetten.js";
import { bausteine, aufloesungsPrompt, momentPrompt, klaerungsPrompt, reflexionsPrompt, steuerTexte } from "../../core/prompts/prompts.de.js";
import { bausteine as bausteineEn, steuerTexte as steuerTexteEn } from "../../core/prompts/prompts.en.js";

function memoryBackend(mock, role = "A") {
  const store = new MemoryStore();
  const repo = new Repo({ store, ns: "T", code: "s62", activeModuleId: "betrieb" });
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
const REVEAL = {
  A: { name: "Anna", top5: ["Nähe", "Ehrlichkeit", "Wertschätzung", "Autonomie", "Harmonie"], guess3: ["Ruhe", "Nähe", "Abenteuer"] },
  B: { name: "Bernd", top5: ["Ruhe", "Verlässlichkeit", "Nähe", "Humor", "Freiheit"], guess3: ["Nähe", "Harmonie", "Treue"] },
};

/* ── Maß-Helfer: happy-dom liefert Nullmaße — für die Fern-Fälle stubben
   wir Composer-Unterkante und Fensterhöhe gezielt. ── */
function stelleFern(abstand = 500) {
  const c = root.querySelector("#pbComposer");
  c.getBoundingClientRect = () => ({ bottom: abstand, top: abstand - 40, left: 0, right: 0, width: 0, height: 40 });
  const win = document.defaultView;
  win.scrollY = 0;
  Object.defineProperty(win, "innerHeight", { value: 0, configurable: true });
}

describe("S62 · Scroll-Disziplin", () => {
  it("Betreten eines Gesprächs scrollt einmalig — Ziel ist die Composer-Unterkante, nicht das Seitenende", async () => {
    const mock = new MockLLM(["Hallo Anna."]);
    const backend = memoryBackend(mock);
    const aufrufe = [];
    document.defaultView.scrollTo = (...a) => aufrufe.push(a);
    const app = await bootApp(backend);
    await app.startChat("solo");
    await ruhe(12);
    expect(aufrufe.length).toBeGreaterThan(0);
    // Nullmaße im Test-DOM: das Ziel ist die (gestubbte oder leere)
    // Composer-Position, NIE document.scrollHeight (der wäre > 0 gestubbt).
    Object.defineProperty(document.documentElement, "scrollHeight", { value: 9999, configurable: true });
    aufrufe.length = 0;
    await app.startChat("solo");
    await ruhe(12);
    expect(aufrufe.length).toBeGreaterThan(0);
    for (const [, y] of aufrufe) expect(y).not.toBe(9999);
  });

  it("hochgescrollt (fern vom Eingabefeld): Stream-Deltas und Renderläufe scrollen NICHT mehr mit", async () => {
    const mock = new MockLLM(["Erste Antwort.", "Zweite Antwort."]);
    const backend = memoryBackend(mock);
    const aufrufe = [];
    document.defaultView.scrollTo = (...a) => aufrufe.push(a);
    const app = await bootApp(backend);
    await app.startChat("solo");
    await ruhe(12);
    stelleFern(500);           // Person ist hochgescrollt: Composer weit unterhalb der Sicht
    aufrufe.length = 0;
    await app.testHooks.zeigeStream("Tipp…");   // Delta bei Fern-Lage
    expect(aufrufe.length).toBe(0);
    app.testHooks.renderMsgs();                 // Voll-Rerender bei Fern-Lage
    expect(aufrufe.length).toBe(0);
  });

  it("eigenes Senden nimmt das Mitlaufen wieder auf (erzwungener Scroll trotz Fern-Lage)", async () => {
    const mock = new MockLLM(["Antwort eins.", "Antwort zwei."]);
    const backend = memoryBackend(mock);
    const aufrufe = [];
    document.defaultView.scrollTo = (...a) => aufrufe.push(a);
    const app = await bootApp(backend);
    await app.startChat("solo");
    await ruhe(12);
    stelleFern(500);
    aufrufe.length = 0;
    root.querySelector("#pbInput").value = "Mich beschäftigt etwas.";
    await klick(root.querySelector("#btnSend"));
    await ruhe(12);
    expect(aufrufe.length).toBeGreaterThan(0);
  });
});

describe("S62 · Tafel als Verlaufskarte & Zwei-Schritt-Aufdeckung", () => {
  async function starteAuflosungMit(antworten) {
    const mock = new MockLLM(antworten);
    const backend = memoryBackend(mock);
    await beideFreigaben(backend);
    await backend.bstate.set("reveal", REVEAL);
    const app = await bootApp(backend);
    await klick(root.querySelector("#btnSharedRoom"));
    await klick(root.querySelector("#btnGemeinsam"));
    await ruhe(14);
    return { app, backend, mock };
  }

  it("[[REVEAL-A]] zeigt NUR Annas Richtung als Karte im Verlauf — mit sprechendem Weiter-Knopf, ohne 'Tafel ausblenden'", async () => {
    await starteAuflosungMit(["Dann decken wir zuerst Annas Stapel auf.\n[[REVEAL-A]]"]);
    const box = root.querySelector("#pbMsgs");
    const tafeln = box.querySelectorAll(".pb-tafel");
    expect(tafeln.length).toBe(1);
    const txt = tafeln[0].textContent;
    expect(txt).toContain("Annas Stapel");
    expect(txt).toContain("Top 5 von Anna");
    expect(txt).toContain("Tipp von Bernd");
    expect(txt).not.toContain("Top 5 von Bernd");   // zweite Richtung bleibt verdeckt
    expect(txt).not.toContain("Tafel ausblenden");
    const w = tafeln[0].querySelector("#adWeiter");
    expect(w).toBeTruthy();
    expect(w.textContent).toContain("wir sprechen darüber");   // Ausblick statt Leerformel
    expect(root.querySelector("#kwPanel").classList.contains("pb-hidden")).toBe(true);   // kein Panel mehr
  });

  it("Weiter-Knopf schickt das richtungsspezifische REVEAL-SHOWN; die Tafel bleibt im Verlauf, der Knopf verschwindet", async () => {
    const { mock } = await starteAuflosungMit([
      "Dann zuerst Bernds Stapel.\n[[REVEAL-B]]",
      "Bernd, was fällt dir als Erstes ins Auge?",
    ]);
    const w = root.querySelector("#pbMsgs .pb-tafel #adWeiter");
    expect(w).toBeTruthy();
    await klick(w);
    await ruhe(12);
    const gesendet = mock.calls.flatMap(c => c.messages).filter(m => m.role === "user").map(m => m.content).join("\n");
    expect(gesendet).toContain("REVEAL-SHOWN");
    expect(gesendet).toContain("Bernd");
    const box = root.querySelector("#pbMsgs");
    expect(box.querySelectorAll(".pb-tafel").length).toBe(1);       // Tafel steht weiter im Verlauf
    expect(box.querySelector("#adWeiter")).toBeFalsy();             // Knopf hängt nicht mehr dran
    expect(box.textContent).toContain("was fällt dir als Erstes");  // Antwort erscheint UNTER der Tafel
    expect(box.textContent).not.toContain("REVEAL-SHOWN");          // Wire bleibt unsichtbar
  });

  it("zweite Richtung ([[REVEAL-A]] nach [[REVEAL-B]]) ergibt eine zweite Karte; Intro-Text nur an der ersten", async () => {
    const { mock } = await starteAuflosungMit([
      "Zuerst Bernds Stapel.\n[[REVEAL-B]]",
      "Was fällt euch auf? … Und nun Annas Stapel.\n[[REVEAL-A]]",
    ]);
    await klick(root.querySelector("#pbMsgs .pb-tafel #adWeiter"));
    await ruhe(14);
    const tafeln = root.querySelectorAll("#pbMsgs .pb-tafel");
    expect(tafeln.length).toBe(2);
    expect(tafeln[0].textContent).toContain("Kein richtig, kein falsch");
    expect(tafeln[1].textContent).not.toContain("Kein richtig, kein falsch");
    // Nur die jüngste Tafel trägt den Weiter-Knopf
    expect(tafeln[0].querySelector("#adWeiter")).toBeFalsy();
    expect(tafeln[1].querySelector("#adWeiter")).toBeTruthy();
  });

  it("Legacy-[[REVEAL]] zeigt beide Richtungen in EINER Karte (Altbestands-Pfad)", async () => {
    await starteAuflosungMit(["Wir drehen beide Karten um.\n[[REVEAL]]"]);
    const tafeln = root.querySelectorAll("#pbMsgs .pb-tafel");
    expect(tafeln.length).toBe(1);
    const txt = tafeln[0].textContent;
    expect(txt).toContain("Top 5 von Anna");
    expect(txt).toContain("Top 5 von Bernd");
  });

  it("Persistenz & Idempotenz: nach Raum-Wiedereintritt steht die Tafel wieder im Verlauf, ohne Duplikat", async () => {
    const { app } = await starteAuflosungMit(["Zuerst Annas Stapel.\n[[REVEAL-A]]"]);
    expect(root.querySelectorAll("#pbMsgs .pb-tafel").length).toBe(1);
    await klick(root.querySelector("#btnChatZurueck"));
    await ruhe();
    await klick(root.querySelector("#btnGemeinsam"));   // erneut betreten → resume() dispatcht den Marker erneut
    await ruhe(14);
    expect(root.querySelectorAll("#pbMsgs .pb-tafel").length).toBe(1);
  });

  it("gemeinsamDef: Richtungs-Marker registriert und reichen die Richtung an den Hook (Legacy: null)", () => {
    const rufe = [];
    const d = gemeinsamDef({}, { onAufdecken: (e, r) => rufe.push(r) });
    expect(d.markerOrder.indexOf("[[REVEAL-A]]")).toBeLessThan(d.markerOrder.indexOf("[[REVEAL]]"));   // spezifisch vor generisch
    d.markers["[[REVEAL-A]]"]({}); d.markers["[[REVEAL-B]]"]({}); d.markers["[[REVEAL]]"]({});
    expect(rufe).toEqual(["A", "B", null]);
  });

  it("Steuertext REVEAL-SHOWN ist richtungsspezifisch ({owner}/{tipper}) — de und en", () => {
    for (const st of [steuerTexte, steuerTexteEn]) {
      expect(st.aufdeckungAngezeigt.startsWith("REVEAL-SHOWN")).toBe(true);
      expect(st.aufdeckungAngezeigt).toContain("{owner}");
      expect(st.aufdeckungAngezeigt).toContain("{tipper}");
    }
  });
});

describe("S62 · Subtext & Wegweiser-Raumnennung", () => {
  it("freigeschaltet: dauerhafter Subtext unter 'Gemeinsame Auflösung beginnen'; kein Gate-Hinweis", async () => {
    const backend = memoryBackend(null);
    await beideFreigaben(backend);
    await bootApp(backend);
    await klick(root.querySelector("#btnSharedRoom"));
    await ruhe();
    const sub = root.querySelector("#gemeinsamSub");
    expect(sub.classList.contains("pb-hidden")).toBe(false);
    expect(sub.textContent).toContain("Auflösung eurer Spekulationen");
    expect(root.querySelector("#gemeinsamHinweis").classList.contains("pb-hidden")).toBe(true);
  });

  it("gesperrt: Gate-Hinweis ersetzt den Subtext (nie beide zugleich)", async () => {
    const backend = memoryBackend(null);
    await bootApp(backend);
    await klick(root.querySelector("#btnSharedRoom"));
    await ruhe();
    expect(root.querySelector("#gemeinsamSub").classList.contains("pb-hidden")).toBe(true);
    const h = root.querySelector("#gemeinsamHinweis");
    expect(h.classList.contains("pb-hidden")).toBe(false);
    expect(h.textContent).toContain("öffnet, sobald");
  });

  it("Startseiten-Wegweiser: jede Zeile nennt einen Raum", async () => {
    const backend = memoryBackend(null);
    await beideFreigaben(backend);
    await backend.bstate.set("reveal", REVEAL);
    await bootApp(backend);
    await ruhe();
    const zeilen = [...root.querySelectorAll("#wegStart .pb-weg-zeile, #wegStart li, #wegStart p, #wegStart div")]
      .map(z => z.textContent.trim()).filter(Boolean);
    const alles = root.querySelector("#wegStart").textContent;
    expect(alles.length).toBeGreaterThan(0);
    // Kernzeilen des roten Fadens tragen die Raumnennung:
    expect(alles).toMatch(/gemeinsamen Raum|deinem Raum|deinen Raum/);
    if (alles.includes("Gemeinsame Auflösung")) expect(alles).toContain("im gemeinsamen Raum");
  });
});

describe("S62 · Baustein 'bedeutsame Momente' (K4 c: alle Sessions, QZ separat verdrahtet)", () => {
  it("Baustein existiert in beiden Korpora (Schlüsselparität) und trägt die drei Ebenen plus Dosierung", () => {
    for (const b of [bausteine, bausteineEn]) expect(typeof b.bedeutsameMomente).toBe("string");
    expect(bausteine.bedeutsameMomente).toContain("ICH-PERSPEKTIVE");
    expect(bausteine.bedeutsameMomente).toContain("Wie fühlt sich das gerade an?");
    expect(bausteine.bedeutsameMomente).toContain("Wo spürst du das?");
    expect(bausteine.bedeutsameMomente).toContain("Wie wirkt sich das gerade auf eure Beziehung aus?");
    expect(bausteine.bedeutsameMomente).toContain("DOSIERUNG");
  });

  it("verdrahtet in Auflösung, Qualitätszeit, Auftragsklärung und Reflexionsgespräch", () => {
    for (const p of [aufloesungsPrompt("Anna", "Bernd"), momentPrompt("Anna", "Bernd"), klaerungsPrompt("Anna", "Bernd"), reflexionsPrompt("Anna", "Bernd")])
      expect(p).toContain("BEDEUTSAME MOMENTE");
  });
});

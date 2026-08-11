// @vitest-environment happy-dom
// S129 · Das Erstkontakt-Signal und der Markenwächter.
//
// BEFUND (gemessen, nicht vermutet): mistral-large-latest — das Modell, das in
// Produktion läuft — nahm bei 30 von 30 Kaltstarts die Wiederkehr-Fassung
// („Schön, dass du wieder da bist … an deine letzte Reflexion anknüpfen") und
// erfand passende Erinnerungen dazu. In beiden Sprachen.
//
// Die Ursache ist keine Modellschwäche: Mit vorliegendem Kontext (ERO-02)
// liefert dasselbe Modell 30/30 die richtige Fassung. Es scheitert genau dort,
// wo die Entscheidung auf einem FEHLEN beruht — die Weiche im Prompt hatte nur
// ein sichtbares Zeichen, und die Abwesenheit war das andere.
//
// Mit einem ausdrücklichen Signal (ERO-03): 0 von 30. Ein Fehlen, das benannt
// ist, ist kein Fehlen mehr.

import { describe, it, expect, beforeEach } from "vitest";
import { createApp } from "../../core/ui/app.js";
import { Repo } from "../../core/store/repo.js";
import { Bstate, Pstate } from "../../core/store/bundles.js";
import { MemoryStore } from "../../core/store/store.js";
import { freigebeUebergabe } from "../../core/engine/freigabe.js";
import { uebergabeTeilKey } from "../../core/contracts/uebergabe.js";
import { steuerTexte as ST_DE } from "../../core/prompts/prompts.de.js";
import { steuerTexte as ST_EN } from "../../core/prompts/prompts.en.js";
import { markenImText, markerOrderFuer, markenSpurImTranskript } from "../../evals/runner-kern.js";

function memoryBackend(role = "A") {
  const store = new MemoryStore();
  const repo = new Repo({ store, ns: "T", code: "s129", activeModuleId: "betrieb" });
  const bstate = new Bstate(repo), pstate = new Pstate(repo);
  return {
    async info() { return { role, name: "Carsten", partner: "Claudia", nameA: "Carsten", nameB: "Claudia" }; },
    bstate: { get: f => bstate.get(f), set: (f, v) => bstate.set(f, v) },
    pstate: { get: f => pstate.get(role, f), set: (f, v) => pstate.set(role, f, v) },
    chat: {
      load: (art, id) => repo.get("chat:" + (art === "shared" ? id : role + ":" + id), art === "shared"),
      save: (art, id, c) => repo.set("chat:" + (art === "shared" ? id : role + ":" + id), c, art === "shared"),
    },
    handover: { post: d => freigebeUebergabe(repo, role, d), get: r => repo.get(uebergabeTeilKey(r), true, "kernwetten") },
    llm: async () => ({ text: "Schön, dass du da bist, Carsten.", stop: "end_turn" }),
  };
}
const ruhe = async (n = 10) => { for (let i = 0; i < n; i++) await new Promise(r => setTimeout(r, 0)); };

let root, app;
beforeEach(() => { document.body.innerHTML = '<div id="app"></div>'; root = document.getElementById("app"); });

describe("S129 · das Erstkontakt-Signal", () => {
  it("ohne Kontext wird das Fehlen ausdrücklich gesagt, statt stillschweigend zu fehlen", async () => {
    app = createApp({ doc: document, backend: memoryBackend(), root });
    await app.boot(); await ruhe();
    await app.startChat("solo"); await ruhe();

    const versteckt = app._state.engine.chat.messages.filter(m => m.hidden).map(m => String(m.content));
    expect(versteckt.some(c => c === ST_DE.erstkontakt)).toBe(true);
  });

  it("es steht VOR dem Auftakt — die Lage ist geklärt, bevor die Aufforderung kommt", async () => {
    app = createApp({ doc: document, backend: memoryBackend(), root });
    await app.boot(); await ruhe();
    await app.startChat("solo"); await ruhe();

    const msgs = app._state.engine.chat.messages;
    const iSignal = msgs.findIndex(m => String(m.content) === ST_DE.erstkontakt);
    const iAuftakt = msgs.findIndex(m => String(m.content).includes("Eröffne das Gespräch"));
    expect(iSignal).toBeGreaterThanOrEqual(0);
    expect(iSignal).toBeLessThan(iAuftakt);
  });

  it("es ist versteckt — die Person hat es nie gesagt", async () => {
    app = createApp({ doc: document, backend: memoryBackend(), root });
    await app.boot(); await ruhe();
    await app.startChat("solo"); await ruhe();
    const m = app._state.engine.chat.messages.find(x => String(x.content) === ST_DE.erstkontakt);
    expect(m.hidden).toBe(true);
    expect(root.querySelectorAll(".pb-msg.me")).toHaveLength(0);
  });
});

describe("S129 · der Text des Signals führt keine Formsprache vor", () => {
  /* Die Testfassung hieß „ERSTKONTAKT (app-intern): …". Daraufhin erfand das
     Modell passende Marken dazu ([[EINSTIEG]], [[START]]) und ging bei den
     Marken von 27/30 auf 30/30. Der Kontexttext lehrt einen Stil mit — dieser
     hier darf keinen vorführen. */
  for (const [sprache, st] of [["de", ST_DE], ["en", ST_EN]]) {
    it(sprache + ": keine Klammern, kein Versalienwort, kein Etikett", () => {
      const t = st.erstkontakt;
      expect(t, sprache).toBeTruthy();
      expect(t).not.toMatch(/\[\[|\]\]/);
      expect(t).not.toMatch(/\b[A-ZÄÖÜ]{4,}\b/);        // ERSTKONTAKT, START, …
      expect(t).not.toMatch(/^[^:]{0,24}:/);            // „Etikett: …"
    });
  }

  it("und benennt, was fehlt — nicht bloß, dass etwas fehlt", () => {
    // Ein „kein Kontext vorhanden" wäre wieder eine Abstraktion. Das Modell
    // soll die Leerstellen einzeln sehen.
    for (const t of [ST_DE.erstkontakt, ST_EN.erstkontakt])
      expect(t.split(",").length).toBeGreaterThanOrEqual(3);
  });
});

describe("S129 · die Prompt-Regeln", () => {
  it("die Umkehrung steht jetzt da: keine Geschichte behaupten, die es nicht gibt", async () => {
    const de = await import("../../core/prompts/prompts.de.js");
    const p = de.reflexionsPrompt("Carsten", "Claudia");
    expect(p).toContain("Behaupte nie, ihr kenntet euch, wenn KEIN Kontext vorliegt");
  });

  it("doppelte eckige Klammern sind im Reflexionsraum verboten", async () => {
    const de = await import("../../core/prompts/prompts.de.js");
    expect(de.reflexionsPrompt("Carsten", "Claudia")).toMatch(/Doppelte eckige Klammern sind der App vorbehalten/);
  });

  it("das Verbot nennt KEIN Beispiel — sonst führt es die Marke ein", async () => {
    // Der Korpus-Wächter hat genau das gefangen: Mein erster Entwurf schrieb
    // „[[START]]" als Gegenbeispiel in den Prompt und erfand die Marke damit.
    const de = await import("../../core/prompts/prompts.de.js");
    const p = de.reflexionsPrompt("Carsten", "Claudia");
    expect(p).not.toMatch(/\[\[[A-Za-zÄÖÜäöü_-]+\]\]/);
  });
});

describe("S130 · das Szenario misst, was die App wirklich schickt", () => {
  /* Eine abgeschriebene Kopie liefe beim ersten Nachschärfen auseinander —
     dann misst der Eval einen Text, den es nirgends gibt. Derselbe Fehlertyp
     wie bei der Speicher-Whitelist (S119.1) und den VAPID-Namen (S127): ein
     Wert, den nur eine Seite kennt. */
  it("ERO-03 trägt exakt den Steuertext der App, nicht eine Nachbildung", async () => {
    const { SZENARIEN } = await import("../../evals/szenarien/start-katalog.js");
    const ero3 = SZENARIEN.find(s => s.id === "ERO-03");
    expect(ero3.zusatzKontext).toBe(ST_DE.erstkontakt);
  });

  it("und das englische Gegenstück ebenso", async () => {
    const { SZENARIEN_EN } = await import("../../evals/szenarien/start-katalog.en.js");
    const ero3 = SZENARIEN_EN.find(s => s.id === "ERO-03-EN");
    expect(ero3.zusatzKontext).toBe(ST_EN.erstkontakt);
  });
});

describe("S129 · der Markenwächter im Runner", () => {
  /* S131 · Das Muster ist so weit wie im Anzeigefilter. Die erste Fassung
     verbot Leerzeichen und zaehlte deshalb "[[NEUE SESSION]]" nicht — zwei
     Vorkommen im Lauf vom 11.08., die nur der Judge fand.
     Ein Waechter, der enger misst als der Fehler ist, meldet Ruhe. */
  it("zählt auch mehrwortige Marken — der Fall, den die erste Fassung verpasste", () => {
    const r = markenImText("Satz. [[NEUE SESSION]] und [[NEUE_SESSION]]", []);
    expect(r.fremd).toEqual(["[[NEUE SESSION]]", "[[NEUE_SESSION]]"]);
  });

  it("misst dasselbe wie der Anzeigefilter — sonst zeigt die App etwas, das kein Lauf sieht", async () => {
    const { entferneFremdeMarken } = await import("../../core/contracts/steuertoken.js");
    for (const probe of ["[[NEUE SESSION]]", "[[weiter]]", "[[" + "x".repeat(60) + "]]"]) {
      expect(markenImText("Text " + probe, []).fremd, probe).toEqual([probe]);
      expect(entferneFremdeMarken("Text " + probe).trim(), probe).toBe("Text");
    }
  });

  it("trennt fremde von echten Marken", () => {
    const r = markenImText("Text [[weiter]] und [[REVEAL]] hier", ["[[REVEAL]]"]);
    expect(r.fremd).toEqual(["[[weiter]]"]);
    expect(r.bekannt).toEqual(["[[REVEAL]]"]);
  });

  it("im Reflexionsraum ist jede Marke fremd — dort gibt es planmäßig keine", () => {
    expect(markerOrderFuer({ session: "solo" })).toEqual([]);
    expect(markenImText("Satz. [[START]]", markerOrderFuer({ session: "solo" })).fremd).toEqual(["[[START]]"]);
  });

  it("kennt die Marken der strukturierten Sessions", () => {
    expect(markerOrderFuer({ session: "gemeinsam" })).toContain("[[REVEAL]]");
    expect(markerOrderFuer({ session: "einzel" })).toContain("[[SLIDERS]]");
    expect(markerOrderFuer({ session: "moment" })).toContain("[[CHOICE-CONNECT]]");
  });

  it("die Listen decken sich mit den SessionDefs — sonst misst der Wächter Phantome", async () => {
    // Der Runner hält eine Kopie, um die UI-Module nicht zu ziehen. Genau die
    // Bauform, die bei der Speicher-Whitelist auseinandergelaufen ist (S119.1).
    // Die Defs sind Fabriken, keine Konstanten — sie brauchen ein Backend.
    const { soloDef, momentDef } = await import("../../core/ui/sessions.js");
    const { einzelDef, gemeinsamDef } = await import("../../core/ui/kernwetten.js");
    const be = memoryBackend();
    for (const [art, fabrik] of [["solo", soloDef], ["moment", momentDef],
                                 ["einzel", einzelDef], ["gemeinsam", gemeinsamDef]])
      expect(markerOrderFuer({ session: art }), art).toEqual(fabrik(be).markerOrder || []);
  });

  it("die Spur zählt beide Arten getrennt — und ist null, wenn nichts war", () => {
    expect(markenSpurImTranskript([{ role: "assistant", content: "sauber" }])).toBeNull();
    const spur = markenSpurImTranskript([
      { role: "assistant", markenFremd: ["[[weiter]]"] },
      { role: "assistant", markenBekannt: ["[[REVEAL]]"] },
    ]);
    expect(spur.fremd).toEqual(["[[weiter]]"]);
    expect(spur.unzeit).toEqual(["[[REVEAL]]"]);
  });

  it("misst, ohne zu werten — die Spur ändert kein Urteil", async () => {
    const { sampleAusUrteil } = await import("../../evals/runner-kern.js");
    const szenario = { checks: [{ id: "C1", frage: "?", verletztWenn: "ja" }] };
    const transkript = [{ role: "assistant", content: "Text [[weiter]]", markenFremd: ["[[weiter]]"] }];
    const s = sampleAusUrteil(szenario, transkript, { checks: [{ id: "C1", antwort: "nein" }] }, 1);
    expect(s.verletzt).toBe(false);          // die Marke allein verletzt nichts
    expect(s.marken.fremd).toEqual(["[[weiter]]"]);   // sie ist trotzdem sichtbar
  });
});

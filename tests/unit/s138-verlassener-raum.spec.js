// @vitest-environment happy-dom
// S138 · Ein verlassener Raum bekommt keine Fehlermeldung mehr.
//
// BEFUND: Der e2e-Vollstacklauf zeigte in der Fehlerbox
// „Cannot read properties of null (reading 'submitToolResult')". Das ist kein
// Fehler im Ablauf, sondern ein Wettlauf: Der Aufbau einer Session wartet an
// mehreren Stellen (Kontext, Übergaben, Wortlaut-Abruf). Wird der Raum in
// dieser Zeit verlassen, setzt `raeume()` `state.engine` auf null — und der
// Aufruf danach greift ins Leere.
//
// Der bestehende Zaun (`state.chatGen`, S87) verhindert nur die UI-WIRKUNG
// eines Nachzüglers. Der Zugriff selbst passiert trotzdem, und `warteAntwort`
// zeigt den entstehenden Fehler brav an — in einem Raum, den die Person gerade
// verlassen hat.
//
// EINE EBENE FRÜHER: `lebt()` prüft vor jedem Zug, ob DIESE Session noch die
// aktuelle ist. Bewusst nicht `state.engine` allein: Die Engine könnte auch
// schon die einer NEUEN Session sein — dann wäre der Aufruf noch falscher als
// ein Absturz.
//
// Nebenbefund, festgehalten: Meine Diagnose in S123 war falsch. Ich hielt
// `submitToolResult` für eine Meldung aus dem Innenleben des Testläufers und
// härtete den Abbau. Der Bezeichner steht in `app.js`. Und I15 war nie ein
// Flackern — es ist reproduzierbar, nur macht erst die Last der vollen Suite
// den Wettlauf sichtbar. Zwei gezielte Einzelläufe hatten ihn „widerlegt";
// ein Einzellauf misst hier nicht dasselbe.

import { describe, it, expect, beforeEach, vi } from "vitest";
import { createApp } from "../../core/ui/app.js";
import { Repo } from "../../core/store/repo.js";
import { Bstate, Pstate } from "../../core/store/bundles.js";
import { MemoryStore } from "../../core/store/store.js";
import { freigebeUebergabe } from "../../core/engine/freigabe.js";
import { uebergabeTeilKey } from "../../core/contracts/uebergabe.js";

/** Backend, dessen Kontext-Lesen sich anhalten lässt — genau das Fenster,
 *  in dem der Wettlauf entsteht. */
function memoryBackend({ role = "A", bremse = null } = {}) {
  const store = new MemoryStore();
  const repo = new Repo({ store, ns: "T", code: "s138", activeModuleId: "betrieb" });
  const bstate = new Bstate(repo), pstate = new Pstate(repo);
  return {
    async info() { return { role, name: "Carsten", partner: "Claudia", nameA: "Carsten", nameB: "Claudia" }; },
    bstate: {
      get: async f => { if (bremse && f === "goals") await bremse.warten; return bstate.get(f); },
      set: (f, v) => bstate.set(f, v),
    },
    pstate: { get: f => pstate.get(role, f), set: (f, v) => pstate.set(role, f, v) },
    chat: {
      load: (art, id) => repo.get("chat:" + (art === "shared" ? id : role + ":" + id), art === "shared"),
      save: (art, id, c) => repo.set("chat:" + (art === "shared" ? id : role + ":" + id), c, art === "shared"),
    },
    handover: { post: d => freigebeUebergabe(repo, role, d), get: r => repo.get(uebergabeTeilKey(r), true, "kernwetten") },
    llm: async () => ({ text: "Schön, dass du da bist.", stop: "end_turn" }),
  };
}
const ruhe = async (n = 12) => { for (let i = 0; i < n; i++) await new Promise(r => setTimeout(r, 0)); };

let root;
beforeEach(() => { document.body.innerHTML = '<div id="app"></div>'; root = document.getElementById("app"); });

describe("S138 · der verlassene Raum", () => {
  it("wird die Session während des Aufbaus verlassen, erscheint KEINE Fehlerbox", async () => {
    let loesen;
    const bremse = { warten: new Promise(r => { loesen = r; }) };
    const app = createApp({ doc: document, backend: memoryBackend({ bremse }), root });
    await app.boot();
    await ruhe();

    const start = app.startChat("solo");   // bleibt im Kontextaufbau hängen
    await ruhe(4);
    root.querySelector("#btnMyRoom").click();   // Raum verlassen, während er baut
    await ruhe(4);
    loesen();                                   // der Nachzügler kommt zurück
    await start;
    await ruhe();

    const box = root.querySelector("#pbErr");
    expect(box.classList.contains("pb-hidden"), box.textContent).toBe(true);
  });

  it("und der Nachzügler schreibt nichts mehr in den Verlauf", async () => {
    let loesen;
    const bremse = { warten: new Promise(r => { loesen = r; }) };
    const app = createApp({ doc: document, backend: memoryBackend({ bremse }), root });
    await app.boot();
    await ruhe();

    const start = app.startChat("solo");
    await ruhe(4);
    root.querySelector("#btnMyRoom").click();
    await ruhe(4);
    loesen();
    await start;
    await ruhe();

    expect(app._state.engine).toBeNull();
  });

  it("der gesunde Weg bleibt unverändert: die Begleitung eröffnet", async () => {
    const app = createApp({ doc: document, backend: memoryBackend(), root });
    await app.boot();
    await ruhe();
    await app.startChat("solo");
    await ruhe();

    // Auftakt versteckt im Verlauf, Antwort der Begleitung sichtbar.
    const msgs = app._state.engine.chat.messages;
    expect(msgs.some(m => m.hidden && String(m.content).includes("Eröffne"))).toBe(true);
    expect(msgs.some(m => m.role === "assistant")).toBe(true);
    expect(root.querySelector("#pbErr").classList.contains("pb-hidden")).toBe(true);
  });
});

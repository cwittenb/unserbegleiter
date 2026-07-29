// @vitest-environment happy-dom
// U8.4/8.5/8.6 · Die Leseansicht als Ansicht — und die Tür zurück ins Gespräch.
//
// Drei Befunde aus dem Ist-Stand liegen diesem Sprint zugrunde:
//
//   1. boxLesen stand NICHT in INFO_GRUPPEN und rief regalModus nicht auf.
//      Sie öffnete sich unter der noch offenen Zeitleiste — zwei Rollbereiche
//      übereinander, keiner davon im Vollbild.
//   2. Der Schließen-Knopf war eine Pillen-Schaltfläche, der einzige
//      Fremdkörper in einem Vorraum aus Haarlinien und leisen Zeilen.
//   3. Es gab keinen Weg von einem gelesenen Protokoll zurück ins Gespräch.
//      Der Korpus verspricht ihn in der dritten Tür ("in einer neuen
//      Reflexion lässt sich darauf zurückkommen") — die Oberfläche zeigte ihn
//      nirgends.
//
// Zu (3) die wichtigste Grenze: S95.7c hatte an dieser Stelle einen Eingang,
// der DIREKT querte — an M1-Bremse und Sicherheits-Weiche vorbei, weil beide
// im Gespräch leben und dort keins war. S95.8a hat ihn zurückgebaut mit der
// Auflage, dass ein neuer Eingang durch eine Session laufen MUSS. Genau das
// hält der letzte Block hier fest.

import { describe, it, expect, beforeEach } from "vitest";
import { createApp } from "../../core/ui/app.js";
import { Repo } from "../../core/store/repo.js";
import { Bstate, Pstate } from "../../core/store/bundles.js";
import { MemoryStore } from "../../core/store/store.js";
import { freigebeUebergabe } from "../../core/engine/freigabe.js";
import { uebergabeTeilKey } from "../../core/contracts/uebergabe.js";
import { setLocale, t } from "../../core/i18n/index.js";

const VID = "1700000000000-abc123";
const tick = () => new Promise(r => setTimeout(r, 0));
const ruhe = async (n = 8) => { for (let i = 0; i < n; i++) await tick(); };
async function klick(el) { el.click(); await ruhe(); }

function memoryBackend(role = "A") {
  const store = new MemoryStore();
  const repo = new Repo({ store, ns: "T", code: "u8", activeModuleId: "betrieb" });
  const bstate = new Bstate(repo), pstate = new Pstate(repo);
  const gestartet = [];
  return {
    gestartet, store, repo,
    async info() { return { role, name: "Lena", partner: "Jonas", nameA: "Lena", nameB: "Jonas" }; },
    bstate: { get: f => bstate.get(f), set: (f, v) => bstate.set(f, v) },
    pstate: { get: f => pstate.get(role, f), set: (f, v) => pstate.set(role, f, v) },
    chat: {
      load: (art, id) => repo.get("chat:" + (art === "shared" ? id : role + ":" + id), art === "shared"),
      save: (art, id, c) => { gestartet.push(id); return repo.set("chat:" + (art === "shared" ? id : role + ":" + id), c, art === "shared"); },
    },
    handover: { post: d => freigebeUebergabe(repo, role, d), get: r => repo.get(uebergabeTeilKey(r), true, "kernwetten") },
    llm: async () => ({ text: "ok", stop: "end_turn" }),
  };
}

/** Ein Eintrag MIT aufbewahrtem Wortlaut — die Vorbedingung für beide Wege. */
async function saeeVerlauf(backend, { at = new Date().toISOString() } = {}) {
  await backend.pstate.set("timeline", { entries: [
    { topics: ["Rückzug"], summary: "Die Absage hat getroffen.", at, vid: VID },
  ] });
  await backend.pstate.set("verlauf:" + VID, {
    at, eignung: null,
    messages: [{ role: "user", content: "Ich habe nichts gesagt." },
               { role: "assistant", content: "Was hat dich abgehalten?" }],
  });
}

let root;
beforeEach(async () => {
  setLocale("de");
  // bestaetige() geht ueber window.confirm; ohne Stub sagt happy-dom nein und
  // der Loesch-Pfad endet vor der ersten Zeile, die er pruefen soll.
  window.confirm = () => true;
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById("app");
});

async function bootMitVerlauf(backend = memoryBackend()) {
  await saeeVerlauf(backend);
  const app = createApp({ doc: document, backend, root });
  await app.boot();
  await ruhe();
  await klick(root.querySelector("#btnMyRoom"));
  await klick(root.querySelector("#btnZeitleiste"));
  return { app, backend };
}
const oeffneProtokoll = async () => klick(root.querySelector("[data-zllesen]"));

describe("U8.4 · Eine Ansicht zur Zeit", () => {
  it("das Protokoll öffnet sich ANSTELLE der Zeitleiste, nicht darunter", async () => {
    await bootMitVerlauf();
    expect(root.querySelector("#boxZeitleiste").classList.contains("pb-hidden")).toBe(false);
    await oeffneProtokoll();
    expect(root.querySelector("#boxLesen").classList.contains("pb-hidden")).toBe(false);
    expect(root.querySelector("#boxZeitleiste").classList.contains("pb-hidden")).toBe(true);
  });

  it("nie zwei offene Kästen im Raum — sonst springen die Höhen wieder", async () => {
    await bootMitVerlauf();
    await oeffneProtokoll();
    expect(root.querySelectorAll("#scrMyRoom .rz-regal-inhalt:not(.pb-hidden)")).toHaveLength(1);
  });

  it("der Vollbild-Zustand bleibt gesetzt — die Zone übernimmt den Schirm", async () => {
    await bootMitVerlauf();
    await oeffneProtokoll();
    expect(root.querySelector("#scrMyRoom").classList.contains("rz-regal-offen")).toBe(true);
  });

  it("Schließen führt ZURÜCK zur Zeitleiste, nicht in einen leeren Raum", async () => {
    await bootMitVerlauf();
    await oeffneProtokoll();
    await klick(root.querySelector("#lesenZu"));
    expect(root.querySelector("#boxLesen").classList.contains("pb-hidden")).toBe(true);
    expect(root.querySelector("#boxZeitleiste").classList.contains("pb-hidden")).toBe(false);
  });

  it("der Wortlaut steht in der Ansicht", async () => {
    await bootMitVerlauf();
    await oeffneProtokoll();
    expect(root.querySelector("#lesenInhalt").textContent).toContain("Ich habe nichts gesagt.");
  });
});

describe("U8.5 · Der Fuß trägt die Wege", () => {
  it("keine Pillen-Schaltfläche mehr — die Wege sind Links", async () => {
    await bootMitVerlauf();
    await oeffneProtokoll();
    expect(root.querySelector("#lesenZu").classList.contains("pb-link")).toBe(true);
    expect(root.querySelector("#lesenZu").classList.contains("pb-btn")).toBe(false);
  });

  it("alle drei Wege stehen im Fuß, in fester Reihenfolge", async () => {
    await bootMitVerlauf();
    await oeffneProtokoll();
    const ids = [...root.querySelectorAll("#lesenFuss .pb-link")].map(e => e.id);
    expect(ids).toEqual(["lesenTeilen", "lesenZu", "lesenWeg"]);
  });

  it("Löschen ist leise gesetzt — es ist der einzige Weg ohne Rückweg", async () => {
    await bootMitVerlauf();
    await oeffneProtokoll();
    expect(root.querySelector("#lesenWeg").classList.contains("rz-klein-leise")).toBe(true);
    expect(root.querySelector("#lesenTeilen").classList.contains("rz-klein-leise")).toBe(false);
  });

  it("Löschen entfernt den Wortlaut, lässt den Eintrag stehen und schließt (F1)", async () => {
    const { backend } = await bootMitVerlauf();
    await oeffneProtokoll();
    await klick(root.querySelector("#lesenWeg"));
    expect(await backend.pstate.get("verlauf:" + VID)).toBeNull();
    expect((await backend.pstate.get("timeline")).entries).toHaveLength(1);
    expect(root.querySelector("#boxLesen").classList.contains("pb-hidden")).toBe(true);
  });

  it("nach dem Löschen ist der Lese-Eingang fort — keine ausgegraute Tür", async () => {
    await bootMitVerlauf();
    await oeffneProtokoll();
    await klick(root.querySelector("#lesenWeg"));
    expect(root.querySelectorAll("[data-zllesen]")).toHaveLength(0);
  });
});

describe("U8.6 · Teilen läuft durch eine Session", () => {
  it("ohne laufendes Gespräch öffnet der Weg ein Reflexionsgespräch", async () => {
    const { backend } = await bootMitVerlauf();
    await oeffneProtokoll();
    await klick(root.querySelector("#lesenTeilen"));
    expect(backend.gestartet).toContain("solo");
    expect(root.querySelector("#scrChat").classList.contains("pb-hidden")).toBe(false);
  });

  it("der Anlass geht als versteckte Nachricht mit — samt Kennung", async () => {
    const { backend } = await bootMitVerlauf();
    await oeffneProtokoll();
    await klick(root.querySelector("#lesenTeilen"));
    const chat = await backend.chat.load("mine", "solo");
    const versteckt = (chat.messages || []).filter(m => m.hidden).map(m => m.content).join("\n");
    expect(versteckt).toContain(VID);
  });

  it("der Anlass ist eine Ausgangslage, KEINE Auswahl", async () => {
    // Was quert, entscheidet sich im Gespräch und am Abschluss — der Block
    // darf die Gabelung nicht vorwegnehmen.
    const { backend } = await bootMitVerlauf();
    await oeffneProtokoll();
    await klick(root.querySelector("#lesenTeilen"));
    const chat = await backend.chat.load("mine", "solo");
    const anlass = (chat.messages || []).map(m => m.content || "").join("\n");
    expect(anlass).not.toContain("GATE-BLOCK\n{");
    expect(anlass).not.toContain("EXCERPT-BLOCK\n{");
  });

  it("läuft schon ein Gespräch, wird KEIN zweites geöffnet", async () => {
    const backend = memoryBackend();
    await saeeVerlauf(backend);
    await backend.chat.save("mine", "solo", { messages: [{ role: "user", content: "läuft" }], status: "running" });
    backend.gestartet.length = 0;
    const app = createApp({ doc: document, backend, root });
    await app.boot();
    await ruhe();
    await klick(root.querySelector("#btnMyRoom"));
    await klick(root.querySelector("#btnZeitleiste"));
    await oeffneProtokoll();
    await klick(root.querySelector("#lesenTeilen"));

    expect(root.querySelector("#boxLesen").classList.contains("pb-hidden")).toBe(false);
    const hinweis = root.querySelector("#lesenHinweis");
    expect(hinweis.classList.contains("pb-hidden")).toBe(false);
    expect(hinweis.textContent).toBe(t("verlauf.teilenLaeuft"));
  });

  it("der Hinweis nennt BEIDE Wege — ansprechen oder erst beenden", async () => {
    // Ein Hinweis, der nur "geht nicht" sagt, lässt die Person stehen. Seit
    // S95.8b kann der Begleiter den Wortlaut in der laufenden Sitzung selbst
    // holen — das ist der bessere der beiden Wege und muss dastehen.
    expect(t("verlauf.teilenLaeuft")).toMatch(/ansprechen/i);
    expect(t("verlauf.teilenLaeuft")).toMatch(/beenden/i);
    setLocale("en");
    expect(t("verlauf.teilenLaeuft")).toMatch(/bring/i);
    expect(t("verlauf.teilenLaeuft")).toMatch(/finish/i);
  });
});

describe("U8.5 · Der Verweis fällt mit dem Wortlaut (Bug-Fund)", () => {
  it("nach dem Löschen trägt der Eintrag keine Kennung mehr", async () => {
    // Der Einzelweg leerte bisher nur den Speicher und ließ das vid stehen —
    // anders als der Sammelweg in den Einstellungen, der es seit jeher
    // entfernt. baueSoloKontext hätte danach weiter {vid:…} angeboten, der
    // Begleiter hätte den Wortlaut zugesagt und nichts gefunden: genau die
    // leere Zusage, gegen die S95.8b die Kennung in den Kontext gestellt hat.
    const { backend } = await bootMitVerlauf();
    await oeffneProtokoll();
    await klick(root.querySelector("#lesenWeg"));
    const zl = await backend.pstate.get("timeline");
    expect(zl.entries).toHaveLength(1);            // der Eintrag bleibt (F1)
    expect(zl.entries[0].vid).toBeUndefined();     // sein Verweis nicht
  });

  it("ein Abbruch löscht nichts und nimmt keinen Verweis", async () => {
    window.confirm = () => false;
    const { backend } = await bootMitVerlauf();
    await oeffneProtokoll();
    await klick(root.querySelector("#lesenWeg"));
    expect(await backend.pstate.get("verlauf:" + VID)).not.toBeNull();
    expect((await backend.pstate.get("timeline")).entries[0].vid).toBe(VID);
    expect(root.querySelector("#boxLesen").classList.contains("pb-hidden")).toBe(false);
  });
});

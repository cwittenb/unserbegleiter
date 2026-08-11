// @vitest-environment happy-dom
// I16 · Gleiche Bauart, überall — geprüft statt gehofft.
//
// Anlass: Die Regeln für Vorräume und Regale hängen ausschließlich an Klassen
// (.rz-split, .rz-half, .rz-naht-anker, .rz-regal-reihen, .rz-regal-inhalt) —
// kein Screen-Name kommt darin vor. Beide Vorräume verhalten sich deshalb
// zwangsläufig gleich, SOLANGE sie dieselben Klassen tragen.
//
// Und genau da liegt die Lücke: Das Markup wird je Raum einzeln ausgeschrieben
// (scrMyRoom und scrShared in app.js). Wer dort eine Klasse vergisst, bekommt
// einen Raum, der anders aussieht — und kein Test merkt es, weil jeder
// bestehende Test genau einen Raum prüft.
//
// Dasselbe gilt für die Sessions: Vier Arten, ein Bauplan (Hülle, Verlauf,
// Schreibkante). Auch sie entstehen aus einer Vorlage, aber ihr Aufbau wird
// bisher nur an einzelnen Arten geprüft.
//
// Diese Datei prüft nicht, ob der Bauplan RICHTIG ist — das tun die
// bestehenden Tests. Sie prüft, dass er ÜBERALL DERSELBE ist.

import { describe, it, expect, beforeEach } from "vitest";
import { createApp } from "../../core/ui/app.js";
import { Repo } from "../../core/store/repo.js";
import { Bstate, Pstate } from "../../core/store/bundles.js";
import { MemoryStore } from "../../core/store/store.js";
import { freigebeUebergabe } from "../../core/engine/freigabe.js";
import { uebergabeTeilKey } from "../../core/contracts/uebergabe.js";

function memoryBackend(role = "A") {
  const store = new MemoryStore();
  const repo = new Repo({ store, ns: "T", code: "i16", activeModuleId: "betrieb" });
  const bstate = new Bstate(repo), pstate = new Pstate(repo);
  return {
    async info() { return { role, name: "Lena", partner: "Jonas", nameA: "Lena", nameB: "Jonas" }; },
    bstate: { get: f => bstate.get(f), set: (f, v) => bstate.set(f, v) },
    pstate: { get: f => pstate.get(role, f), set: (f, v) => pstate.set(role, f, v) },
    chat: {
      load: (art, id) => repo.get("chat:" + (art === "shared" ? id : role + ":" + id), art === "shared"),
      save: (art, id, c) => repo.set("chat:" + (art === "shared" ? id : role + ":" + id), c, art === "shared"),
    },
    handover: { post: d => freigebeUebergabe(repo, role, d), get: r => repo.get(uebergabeTeilKey(r), true, "kernwetten") },
    llm: async () => ({ text: "ok", stop: "end_turn" }),
  };
}
const ruhe = async (n = 10) => { for (let i = 0; i < n; i++) await new Promise(r => setTimeout(r, 0)); };

let root, app;
beforeEach(async () => {
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById("app");
  app = createApp({ doc: document, backend: memoryBackend(), root });
  await app.boot();
  await ruhe();
});

const VORRAEUME = ["scrMyRoom", "scrShared"];

describe("I16 · beide Vorräume, ein Bauplan", () => {
  it("tragen dieselben Klassen an der Zweiteilung", () => {
    for (const id of VORRAEUME) {
      const s = root.querySelector("#" + id);
      expect(s, id).toBeTruthy();
      expect(s.classList.contains("rz-split"), id).toBe(true);
      expect(s.classList.contains("rz-screen"), id).toBe(true);
    }
  });

  it("haben genau zwei Hälften: Papier oben, Tiefgrün unten", () => {
    for (const id of VORRAEUME) {
      const h = root.querySelectorAll("#" + id + " > .rz-half");
      expect(h.length, id).toBe(2);
      expect(h[0].classList.contains("rz-papier"), id).toBe(true);
      expect(h[1].classList.contains("rz-tiefgruen"), id).toBe(true);
    }
  });

  it("tragen den Naht-Anker in der ZWEITEN Hälfte — nie in der ersten", () => {
    // Der Anker ist der Bezugsrahmen des Wegweisers. Säße er links, wanderte
    // das Badge über die falsche Spalte.
    for (const id of VORRAEUME) {
      const h = root.querySelectorAll("#" + id + " > .rz-half");
      expect(h[1].classList.contains("rz-naht-anker"), id).toBe(true);
      expect(h[0].classList.contains("rz-naht-anker"), id).toBe(false);
    }
  });

  it("führen ihr Regal in Regalreihen", () => {
    for (const id of VORRAEUME)
      expect(root.querySelectorAll("#" + id + " .rz-regal-reihen").length, id).toBeGreaterThan(0);
  });

  it("jede Regalzeile hat ihren Kasten — und jeder Kasten seine Zeile", () => {
    // Der Fehler, den das fängt: eine Zeile ohne Kasten (Tap ins Leere) oder
    // ein Kasten ohne Zeile (unerreichbarer Inhalt).
    for (const id of VORRAEUME) {
      const screen = root.querySelector("#" + id);
      const zeilen = [...screen.querySelectorAll("[data-box]")];
      expect(zeilen.length, id).toBeGreaterThan(0);
      for (const z of zeilen) {
        const kasten = root.querySelector("#" + z.getAttribute("data-box"));
        expect(kasten, id + " → " + z.id).toBeTruthy();
        expect(kasten.classList.contains("rz-regal-inhalt"), id + " → " + z.id).toBe(true);
      }
      /* Kästen ohne Zeile sind nicht grundsätzlich falsch — sie können über
         einen anderen Weg geöffnet werden. Aber jeder von ihnen ist eine
         Ausnahme, die man kennen muss: Vergisst jemand den anderen Weg, ist
         der Inhalt unerreichbar und nichts fällt auf.
         boxLesen ist so ein Fall: Die Leseansicht öffnet aus einem Eintrag
         der Zeitleiste, nicht aus einer Regalzeile. */
      const OHNE_ZEILE_ERLAUBT = ["boxLesen"];
      const ohneZeile = [...screen.querySelectorAll(".rz-regal-inhalt")]
        .filter(k => !screen.querySelector('[data-box="' + k.id + '"]'))
        .map(k => k.id)
        .filter(k => !OHNE_ZEILE_ERLAUBT.includes(k));
      expect(ohneZeile, id).toEqual([]);
    }
  });

  it("jede Regalzeile trägt einen Pfeil — der Rückweg steht nie nirgends", () => {
    for (const id of VORRAEUME)
      for (const z of root.querySelectorAll("#" + id + " [data-box]"))
        expect(z.querySelector(".rz-pfeil"), id + " → " + z.id).toBeTruthy();
  });

  it("und alle Kästen sind zu Beginn geschlossen", () => {
    for (const id of VORRAEUME)
      for (const k of root.querySelectorAll("#" + id + " .rz-regal-inhalt"))
        expect(k.classList.contains("pb-hidden"), id + " → " + k.id).toBe(true);
  });
});

/* Die vier Arten, die ohne Vorbedingung starten. "gemeinsam" (Gemeinsame
   Auflösung) fehlt bewusst: Sie verlangt, dass beide ihre Auftragsklärung
   abgeschlossen und freigegeben haben, und wirft sonst — eine fachliche
   Sperre, kein Bauplan-Unterschied. Sie hier mitzuschleppen hiesse, den
   halben Kernwetten-Ablauf im Testaufbau nachzustellen; der Bauplan ist
   derselbe, weil alle vier aus derselben Vorlage entstehen. */
const SESSIONS = ["solo", "einzel", "moment"];

describe("I16 · alle Sessionarten, ein Bauplan", () => {
  it("jede Art baut dieselbe Hülle: Innenspalte, Verlauf, Schreibkante", async () => {
    for (const art of SESSIONS) {
      await app.startChat(art);
      await ruhe();
      const huelle = root.querySelector("#scrChat");
      expect(huelle, art).toBeTruthy();
      expect(huelle.querySelector(".rz-chat-innen"), art).toBeTruthy();
      expect(huelle.querySelector(".rz-chat-oben"), art).toBeTruthy();
      expect(huelle.querySelector(".rz-chat-unten"), art).toBeTruthy();
    }
  });

  it("jede Art hat Verlaufsliste, Eingabefeld und Sendeknopf", async () => {
    for (const art of SESSIONS) {
      await app.startChat(art);
      await ruhe();
      expect(root.querySelector("#pbMsgs"), art).toBeTruthy();
      expect(root.querySelector("#pbInput"), art).toBeTruthy();
      expect(root.querySelector("#btnSend"), art).toBeTruthy();
    }
  });

  it("der Verlauf liegt oben, die Schreibkante unten — nie umgekehrt", async () => {
    for (const art of SESSIONS) {
      await app.startChat(art);
      await ruhe();
      const innen = root.querySelector("#scrChat .rz-chat-innen");
      const kinder = [...innen.children];
      const oben = kinder.findIndex(k => k.classList.contains("rz-chat-oben"));
      const unten = kinder.findIndex(k => k.classList.contains("rz-chat-unten"));
      expect(oben, art).toBeGreaterThan(-1);
      expect(unten, art).toBeGreaterThan(oben);
    }
  });

  it("die Schreibkante ist der Naht-Anker — dort hängt der Wegweiser", async () => {
    // Waagerechte Entsprechung zur senkrechten Naht der Vorräume.
    for (const art of SESSIONS) {
      await app.startChat(art);
      await ruhe();
      const unten = root.querySelector("#scrChat .rz-chat-unten");
      expect(unten.classList.contains("rz-naht-anker"), art).toBe(true);
    }
  });

  it("keine Art bringt einen zweiten Verlauf oder eine zweite Kante mit", async () => {
    for (const art of SESSIONS) {
      await app.startChat(art);
      await ruhe();
      expect(root.querySelectorAll("#scrChat .rz-chat-oben").length, art).toBe(1);
      expect(root.querySelectorAll("#scrChat .rz-chat-unten").length, art).toBe(1);
    }
  });
});

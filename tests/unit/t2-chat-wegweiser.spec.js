// @vitest-environment happy-dom
// T2 · Wächter über den Chat-Wegweiser und die Schreibkante.
//
//   T2h · Schreibkante full-bleed auf breiten Schirmen (K3)
//   T2i · Chat-Badge wird Knopf + eigener Schlüsselraum (§3.7, K5)
//   T2k · Hinweiszeile im Panel der Startseite (K7)
//
// Der eigentliche Fallstrick von T2i ist die S87-Vorlagenmechanik: scrChat
// wird bei jedem Betreten neu gebaut. Eine Verdrahtung aus der Boot-Phase
// hinge nach dem ersten Abbau an einem Knoten, den es nicht mehr gibt.
// Deshalb prüft dieser Test das Öffnen NACH einem Raumwechsel, nicht nur
// beim ersten Mal.

import { describe, it, expect, beforeEach } from "vitest";
import { DESIGN_CSS } from "../../core/ui/design.js";
import { THEME_CSS } from "../../core/ui/theme.js";
import { createApp } from "../../core/ui/app.js";
import { Repo } from "../../core/store/repo.js";
import { Bstate, Pstate } from "../../core/store/bundles.js";
import { MemoryStore } from "../../core/store/store.js";
import { de } from "../../core/i18n/de.js";
import { en } from "../../core/i18n/en.js";

const KOMPONENTEN = DESIGN_CSS.slice(DESIGN_CSS.indexOf(THEME_CSS) + THEME_CSS.length);
const tick = () => new Promise(r => setTimeout(r, 0));
const ruhe = async (n = 8) => { for (let i = 0; i < n; i++) await tick(); };
const klick = async e => { e.dispatchEvent(new Event("click", { bubbles: true })); await ruhe(); };

function memoryBackend(role = "A") {
  const store = new MemoryStore();
  const repo = new Repo({ store, ns: "T", code: "t2i", activeModuleId: "betrieb" });
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
    llm: async () => ({ text: "ok", stop: "end_turn" }),
  };
}

let root;
beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById("app");
});

async function bootApp() {
  const app = createApp({ doc: document, backend: memoryBackend(), root });
  await app.boot();
  await ruhe();
  return app;
}

/** In den Reflexionsgespraech-Chat des eigenen Raums. */
async function inDenChat() {
  await klick(root.querySelector("#btnMyRoom"));
  await klick(root.querySelector("#btnSolo"));
}

/* ------------------------------------------------------------------ T2i */

describe("T2i · das Chat-Badge ist ein Knopf", () => {
  it("Knopf, Panel und aria-Auszeichnung stehen in der Vorlage", async () => {
    await bootApp();
    await inDenChat();
    const badge = root.querySelector("#chatOrt");
    expect(badge.tagName).toBe("BUTTON");
    expect(badge.getAttribute("aria-haspopup")).toBe("dialog");
    expect(root.querySelector("#wegChat")).toBeTruthy();
  });

  it("Tippen öffnet und schließt das Panel", async () => {
    await bootApp();
    await inDenChat();
    const badge = root.querySelector("#chatOrt"), panel = root.querySelector("#wegChat");
    expect(panel.classList.contains("rz-offen")).toBe(false);
    await klick(badge);
    expect(panel.classList.contains("rz-offen")).toBe(true);
    await klick(badge);
    expect(panel.classList.contains("rz-offen")).toBe(false);
  });

  it("es funktioniert auch NACH einem Raumwechsel — S87-Vorlagenmechanik", async () => {
    // Der eigentliche Test dieses Schritts. Die Chat-Fläche wird beim
    // Verlassen abgeräumt und neu gebaut; eine einmalige Verdrahtung aus der
    // Boot-Phase wäre danach tot.
    await bootApp();
    await inDenChat();
    await klick(root.querySelector("#btnChatZurueck"));
    await inDenChat();
    const badge = root.querySelector("#chatOrt"), panel = root.querySelector("#wegChat");
    await klick(badge);
    expect(panel.classList.contains("rz-offen")).toBe(true);
  });

  it("im Gespräch wartet nichts — kein Punkt am Badge", async () => {
    await bootApp();
    await inDenChat();
    expect(root.querySelector("#chatOrt").classList.contains("rz-wartet")).toBe(false);
  });

  it("das Panel trägt drei Zeilen und die Fußzeile", async () => {
    await bootApp();
    await inDenChat();
    const panel = root.querySelector("#wegChat");
    expect(panel.querySelectorAll(".rz-option")).toHaveLength(3);
    expect(panel.querySelector(".rz-weg-fuss")).toBeTruthy();
    // Stufe 1 zuerst: Sicherheit vor allem anderen (Haltungs-Charta, Regel 7).
    expect(panel.querySelectorAll(".rz-option")[0].textContent)
      .toBe(de["weg.chatVertraulich"].replace("{partner}", "Bernd"));
  });

  it("die Startseite erklärt das Zeichen, der Chat nicht", async () => {
    await bootApp();
    expect(root.querySelector("#wegStart .rz-weg-hinweis")).toBeTruthy();
    for (const id of ["#wegMein", "#wegTeil"])
      expect(root.querySelector(id + " .rz-weg-hinweis"), id).toBeNull();
    await inDenChat();
    expect(root.querySelector("#wegChat .rz-weg-hinweis")).toBeNull();
  });

  it("die Hinweiszeile verdrängt keine Wegweiser-Zeile", async () => {
    await bootApp();
    const panel = root.querySelector("#wegStart");
    expect(panel.querySelectorAll(".rz-option").length).toBeGreaterThanOrEqual(1);
    expect(panel.querySelector(".rz-weg-hinweis")).toBeTruthy();
    expect(panel.querySelector(".rz-weg-fuss")).toBeTruthy();
  });
});

/* -------------------------------------------------------------- §3.7 K5 */

describe("§3.7 · die Badges haben eine eigene Adresse im Wörterbuch", () => {
  it("weg.badgeMein / weg.badgeTeil existieren in beiden Sprachen", () => {
    for (const k of ["weg.badgeMein", "weg.badgeTeil", "weg.hinweisStart"]) {
      expect(de[k], "DE " + k).toBeTruthy();
      expect(en[k], "EN " + k).toBeTruthy();
    }
  });

  it("kein Badge leiht sich mehr die Startseiten-Schlüssel", async () => {
    await bootApp();
    for (const id of ["#wegBadgeMein", "#wegBadgeTeil"])
      expect(root.querySelector(id).textContent, id).toContain(
        id.endsWith("Mein") ? de["weg.badgeMein"] : de["weg.badgeTeil"]);
    // Die Startseite behält ihre Caps-Labels — die Schlüssel bleiben also
    // in Gebrauch, nur eben für ihre eigene Aufgabe.
    expect(root.querySelector("#scrStart .rz-caps").textContent).toBe(de["start.capsMein"]);
  });

  it("das Chat-Badge nennt weiterhin den Ort (K5)", async () => {
    await bootApp();
    await inDenChat();
    expect(root.querySelector("#chatOrtName").textContent).toBe(de["weg.badgeMein"]);
  });
});

/* ------------------------------------------------------------------ T2h */

describe("T2h · die Schreibkante ist auf breiten Schirmen eine Zone", () => {
  const block = KOMPONENTEN.slice(KOMPONENTEN.indexOf("T2h (Handover Turn 40"));

  it("die Lesebreite hängt an einem Token, nicht an zwei Zahlen", () => {
    expect(THEME_CSS).toContain("--rz-chat-spalte:640px;");
    expect(KOMPONENTEN).toContain(".rz-chat-innen{max-width:var(--rz-chat-spalte)");
  });

  it("der Block blutet aus, der Inhalt bleibt auf der Spalte", () => {
    expect(block).toContain("margin-left:calc(50% - 50vw)");
    expect(block).toContain("padding-left:calc(50vw - var(--rz-chat-spalte) / 2)");
  });

  it("kein nacktes 100vw in der Schreibkante — das brächte einen Bildlauf mit", () => {
    // Anderswo ist 100vw legitim: das Einstellungs-Blatt begrenzt damit seine
    // Breite (min(272px, calc(100vw - 32px))), es blutet nicht aus.
    const regeln = block.slice(block.indexOf("@media(min-width:900px){"));
    expect(regeln.replace(/\/\*[\s\S]*?\*\//g, "")).not.toContain("100vw");
  });

  it("die Bildlaufleisten-Überlappung wird geklippt, nicht versteckt", () => {
    // overflow-x:hidden würde einen Rollbereich eröffnen und die senkrechte
    // Bewegung an sich reißen.
    expect(block).toContain("overflow-x:clip");
    expect(block).not.toContain("overflow-x:hidden");
  });

  it("kein Radius — die verworfene Karten-Variante steht nicht daneben", () => {
    const kante = KOMPONENTEN.slice(KOMPONENTEN.indexOf("#scrChat .rz-chat-unten{"));
    expect(kante.slice(0, kante.indexOf("}"))).not.toContain("border-radius");
  });

  it("das Badge ist kein Sonderfall mehr", () => {
    expect(KOMPONENTEN).not.toContain(".rz-chat-unten .rz-weg-badge{cursor:default}");
  });
});

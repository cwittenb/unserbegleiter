// @vitest-environment happy-dom
// Design-Track D12-2b — Turn 27, Schritte 5–7: Bewegung und Raumgrammatik.
//
// 5 · Die geklickte Regal-Zeile ist die Sektionsueberschrift; Zonentitel und
//     Geschwisterzeilen treten ab, der Pfeil dreht auf "nach oben".
// 6 · Der Wegweiser blendet nicht mehr ab, sondern faehrt mit der Zonenkante.
// 7 · Der Chat wird Zweiteilung: oben der Verlauf, unten die Schreibkante,
//     dazwischen die Naht mit dem Ortsbadge. Abschliessen fuehrt hinaus (Pfeil
//     nach links), Senden bleibt der Pfeil nach oben.

import { describe, it, expect, beforeEach } from "vitest";
import { DESIGN_CSS } from "../../core/ui/design.js";
import { createApp } from "../../core/ui/app.js";
import { Repo } from "../../core/store/repo.js";
import { Bstate, Pstate } from "../../core/store/bundles.js";
import { MemoryStore } from "../../core/store/store.js";
import { freigebeUebergabe } from "../../core/engine/freigabe.js";
import { uebergabeTeilKey } from "../../core/contracts/uebergabe.js";
import { de } from "../../core/i18n/de.js";

const tick = () => new Promise(r => setTimeout(r, 0));
const ruhe = async (n = 6) => { for (let i = 0; i < n; i++) await tick(); };
const klick = async el => { el.dispatchEvent(new Event("click", { bubbles: true })); await ruhe(); };

function memoryBackend(role = "A") {
  const store = new MemoryStore();
  const repo = new Repo({ store, ns: "T", code: "d122b", activeModuleId: "betrieb" });
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
    llm: async () => ({ text: "ok", stop: "end_turn" }),
  };
}

let root;
beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById("app");
});

async function bootApp(backend = memoryBackend()) {
  const app = createApp({ doc: document, backend, root });
  await app.boot();
  await ruhe();
  return app;
}

/* ---- Schritt 5 · die geklickte Zeile ist die Sektion ---- */

describe("D12-2b · Regal-Sektion", () => {
  /* S121.6 · Die Geschwisterzeilen treten NICHT mehr ab. Das offene Regal ist
     ein Akkordeon: Die übrigen Fächer bleiben sichtbar und ein Tap wechselt
     direkt. Was bleibt: Es ist immer nur EINES offen, und die offene Zeile
     trägt die Marke. */
  it("offen: genau eine Zeile ist Sektion — die Geschwister bleiben stehen", async () => {
    await bootApp();
    await klick(root.querySelector("#btnSharedRoom"));
    await klick(root.querySelector("#btnRegal"));
    const screen = root.querySelector("#scrShared");
    expect(screen.classList.contains("rz-regal-offen")).toBe(true);
    const sektionen = [...screen.querySelectorAll("[data-box]")].filter(z => z.classList.contains("rz-auf"));
    expect(sektionen).toHaveLength(1);
    expect(sektionen[0].id).toBe("btnRegal");
    // Der Zonenfuss tritt weiterhin ab (er ist die Schlusszeile der Zone),
    // die Geschwisterzeilen aber nicht mehr:
    expect(DESIGN_CSS).toContain(".rz-regal-offen>.rz-half:last-child .rz-fuss{display:none}");
    expect(DESIGN_CSS).not.toContain(".rz-regal-offen .rz-zeile[data-box]:not(.rz-auf){display:none}");
    const zeilen = [...screen.querySelectorAll(".rz-tiefgruen [data-box]")];
    expect(zeilen.length).toBeGreaterThan(1);
  });

  /* S114.7 · Umgekehrt gegen D12-2b: Der Pfeil zeigt die BEWEGUNG, nicht die
     Lage. Geschlossen faehrt der Kasten nach oben (↑), offen faehrt er
     dorthin zurueck, woher er kam (↓). */
  it("der Pfeil zeigt die Bewegung: geschlossen nach oben, offen nach unten", async () => {
    await bootApp();
    await klick(root.querySelector("#btnSharedRoom"));
    const pfeil = id => root.querySelector("#" + id + " .rz-pfeil").textContent;
    expect(pfeil("btnRegal")).toBe("\u2191");
    await klick(root.querySelector("#btnRegal"));
    expect(pfeil("btnRegal")).toBe("\u2193");
    expect(pfeil("btnAgenda")).toBe("\u2191");
    await klick(root.querySelector("#btnRegal"));
    expect(pfeil("btnRegal")).toBe("\u2191");
  });

  /* S114.4 · Die Erklaerzeile am Fuss (regal.intro) ist in regal.titel
     aufgegangen: EINE Erklaerung am Kopf statt zweier an beiden Enden. */
  it("im Kasten: die Einleitung steht vor den Eintraegen, und sie steht allein", async () => {
    await bootApp();
    await klick(root.querySelector("#btnSharedRoom"));
    await klick(root.querySelector("#btnRegal"));
    const box = root.querySelector("#boxRegal");
    const kinder = [...box.children].map(e => e.id);
    expect(kinder.indexOf("regalTitel")).toBeLessThan(kinder.indexOf("regalItems"));
    expect(root.querySelector("#regalIntro")).toBe(null);
    expect(root.querySelector("#regalTitel").textContent).toBe(de["regal.titel"]);
  });

  it("es bleibt bei genau EINEM offenen Kasten (D9-Vertrag haelt)", async () => {
    await bootApp();
    await klick(root.querySelector("#btnSharedRoom"));
    await klick(root.querySelector("#btnRegal"));
    await klick(root.querySelector("#btnAgenda"));
    expect(root.querySelector("#boxRegal").classList.contains("pb-hidden")).toBe(true);
    expect(root.querySelector("#boxAgenda").classList.contains("pb-hidden")).toBe(false);
  });
});

/* ---- Schritt 6 · der Wegweiser faehrt mit ---- */

describe("D12-2b · Wegweiser faehrt mit der Kante", () => {
  it("das Badge wird im offenen Zustand nicht mehr unsichtbar gemacht", () => {
    expect(DESIGN_CSS).not.toMatch(/\.rz-regal-offen \.rz-weg-badge[^{]*\{[^}]*opacity:0/);
    /* S114.8 · Sichtbar bleibt es (es markiert weiter die Naht), still ist es
       trotzdem: bei aufgeklapptem Regal nimmt es keine Klicks mehr an. */
    // S125 · Die Zahl ist von 6 auf 9 gewandert: Die klebende obere Zone liegt
    // seit S121.6 auf 8, das Badge verschwand dahinter. Die Aussage bleibt
    // dieselbe — sichtbar, aber ohne Klickannahme.
    expect(DESIGN_CSS).toContain(".rz-regal-offen .rz-weg-badge{z-index:9;pointer-events:none}");
  });

  it("die Kulisse tritt weiterhin ab", () => {
    expect(DESIGN_CSS).toMatch(/\.rz-regal-offen \.rz-kulisse-fuss\{opacity:0/);
  });

  it("es bleibt Kind seiner Zone — es wird nicht umgehaengt", async () => {
    await bootApp();
    await klick(root.querySelector("#btnSharedRoom"));
    const zone = root.querySelector("#scrShared > .rz-half:last-child");
    expect(zone.querySelector("#wegBadgeTeil")).toBeTruthy();
    await klick(root.querySelector("#btnRegal"));
    expect(zone.querySelector("#wegBadgeTeil")).toBeTruthy();
  });
});

/* ---- Schritt 7 · Chat als Zweiteilung ---- */

describe("D12-2b · Chat mit Naht und Badge", () => {
  async function inDenChat(app, art = "solo") {
    const p = app.startChat(art);
    await ruhe(10);
    p.catch(() => {});
    return p;
  }

  it("zwei Zonen: Verlauf oben, Schreibkante unten", async () => {
    const app = await bootApp();
    await inDenChat(app);
    expect(root.querySelector("#scrChat .rz-chat-oben #pbMsgs")).toBeTruthy();
    const unten = root.querySelector("#scrChat .rz-chat-unten");
    expect(unten.querySelector("#pbComposer")).toBeTruthy();
    expect(unten.querySelector("#btnChatEnde")).toBeTruthy();
    expect(unten.classList.contains("rz-naht-anker")).toBe(true);
  });

  it("Badge auf der Naht nennt den Ort und traegt das Wegweiser-Zeichen", async () => {
    const app = await bootApp();
    await inDenChat(app, "solo");
    const badge = root.querySelector("#scrChat .rz-chat-unten .rz-weg-badge");
    expect(badge.classList.contains("rz-auf-naht")).toBe(true);
    expect(badge.querySelector(".rz-weg-ikon")).toBeTruthy();
    expect(badge.textContent).toContain(de["start.capsMein"]);
    // ... und im gemeinsamen Raum der andere Ort:
    await inDenChat(app, "moment");
    expect(root.querySelector("#scrChat .rz-weg-badge").textContent).toContain(de["start.capsTeil"]);
  });

  // T2i (Turn 40 §3.8) · KEHRTWENDE gegenueber D12-2b. Das Ortsbadge war hier
  // bewusst eine blosse Marke; der Turn-40-Handover will einen Knopf daraus
  // machen, der Hilfe im Gespraech oeffnet. Der Ortsname bleibt (K5).
  it("das Ortsbadge nennt den Ort UND oeffnet den Wegweiser", async () => {
    const app = await bootApp();
    await inDenChat(app);
    const badge = root.querySelector("#scrChat .rz-weg-badge");
    expect(badge.tagName).toBe("BUTTON");
    expect(badge.getAttribute("aria-haspopup")).toBe("dialog");
    expect(badge.textContent).toContain(de["weg.badgeMein"]);
  });

  it("Abschliessen fuehrt hinaus (Pfeil links), Senden bleibt der Pfeil nach oben", async () => {
    const app = await bootApp();
    await inDenChat(app);
    expect(root.querySelector("#btnChatEnde .rz-pfeil").textContent).toBe("\u2190");
    expect(root.querySelector("#btnRaumVerlassen .rz-pfeil").textContent).toBe("\u2190");
    expect(root.querySelector("#btnSend")).toBeTruthy();   // Senden bleibt das Quadrat mit dem Send-Zeichen
  });

  it("Signatur oben, Sessionname darunter, Fussmarke als letztes der unteren Zone", async () => {
    const app = await bootApp();
    await inDenChat(app);
    expect(root.querySelector("#scrChat .rz-kopf .rz-signatur").textContent).toBe("Anna & Bernd");
    expect(root.querySelector("#scrChat #chatTitel").classList.contains("rz-sessionname")).toBe(true);
    const unten = root.querySelector("#scrChat .rz-chat-unten");
    expect(unten.lastElementChild.classList.contains("rz-fussmarke")).toBe(true);
    expect(unten.lastElementChild.textContent).toBe(de["allg.marke"]);
  });

  it("S87 haelt: der Abbau raeumt die ganze Flaeche, Badge inklusive", async () => {
    const app = await bootApp();
    await inDenChat(app);
    expect(root.querySelector("#scrChat .rz-weg-badge")).toBeTruthy();
    app.show("scrStart");
    expect(root.querySelector("#scrChat .rz-weg-badge")).toBeFalsy();
    expect(root.querySelector("#scrChat").innerHTML).toBe("");
  });
});

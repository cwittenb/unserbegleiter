// @vitest-environment happy-dom
// Design-Track D12-2a — Turn 27, Schritte 1–4: die Etiketten-Ordnung.
//
// Turn 27 raeumt eine Dopplung auf, die seit D2/D3 mitlief: oben stand ein
// Caps-Ortsetikett und direkt daneben ein Serif-Titel derselben Ordnung. Jetzt
// gilt: der KOPF traegt die Paar-Signatur (eigener Name zuerst), das BADGE
// traegt den Ortsnamen (mit Wegweiser-Zeichen), jede Zone genau EINEN Titel,
// und die Wortmarke ist Signet am FUSS jedes Screens.

import { describe, it, expect, beforeEach } from "vitest";
import { DESIGN_CSS } from "../../core/ui/design.js";
import { createApp } from "../../core/ui/app.js";
import { de } from "../../core/i18n/de.js";
import { en } from "../../core/i18n/en.js";

const tick = () => new Promise(r => setTimeout(r, 0));
const ruhe = async (n = 6) => { for (let i = 0; i < n; i++) await tick(); };

function backendMit(rolle = "A") {
  const namen = rolle === "A"
    ? { name: "Anna", partner: "Bernd" }
    : { name: "Bernd", partner: "Anna" };
  return {
    async info() { return { role: rolle, ...namen, nameA: "Anna", nameB: "Bernd" }; },
    bstate: { get: async () => null, set: async () => true },
    pstate: { get: async () => null, set: async () => true },
    chat: { load: async () => null, save: async () => true },
    handover: { post: async () => {}, get: async () => null },
    llm: async () => ({ text: "ok", stop: "end_turn" }),
  };
}

let root;
beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById("app");
});

async function bootApp(rolle = "A") {
  const app = createApp({ doc: document, backend: backendMit(rolle), root });
  await app.boot();
  await ruhe();
  return app;
}

const SCREENS = ["scrStart", "scrMyRoom", "scrShared", "scrProzess"];

/* ---- Schritt 1 · Kopfzeile traegt die Paar-Signatur ---- */

describe("D12-2a · Kopf-Signatur", () => {
  it("jeder stehende Screen traegt genau eine Signatur im Kopf", async () => {
    await bootApp();
    for (const id of SCREENS) {
      const kopf = root.querySelector("#" + id + " .rz-kopf");
      expect(kopf, id).toBeTruthy();
      expect(kopf.querySelectorAll(".rz-signatur"), id).toHaveLength(1);
    }
  });

  it("eigener Name zuerst — aus beiden Rollen gelesen", async () => {
    await bootApp("A");
    expect(root.querySelector("#scrStart .rz-signatur").textContent).toBe("Anna & Bernd");
    document.body.innerHTML = '<div id="app"></div>';
    root = document.getElementById("app");
    await bootApp("B");
    expect(root.querySelector("#scrStart .rz-signatur").textContent).toBe("Bernd & Anna");
  });

  it("kein Kopf traegt mehr ein Raum-Caps-Etikett", async () => {
    await bootApp();
    for (const id of SCREENS) {
      const kopf = root.querySelector("#" + id + " .rz-kopf");
      expect(kopf.textContent, id).not.toContain(de["start.capsMein"]);
      expect(kopf.textContent, id).not.toContain(de["start.capsTeil"]);
    }
  });

  it("die Signatur ist weiter gesperrt als ein Caps-Label (.34em statt .2em)", () => {
    expect(DESIGN_CSS).toMatch(/\.rz-signatur\{[^}]*letter-spacing:\.34em/);
  });

  it("das Format lebt in der i18n, nicht im Code", () => {
    expect(de["allg.signatur"]).toContain("{ich}");
    expect(de["allg.signatur"]).toContain("{partner}");
    expect("allg.signatur" in en).toBe(true);
  });
});

/* ---- Schritt 2 · Badge: Ortsname + Zeichen ---- */

describe("D12-2a · Wegweiser-Badge", () => {
  it("jedes Badge zeigt das Wegweiser-Zeichen — auch das mit Ortsnamen", async () => {
    await bootApp();
    for (const id of ["wegBadgeStart", "wegBadgeMein", "wegBadgeTeil"])
      expect(root.querySelector("#" + id + " .rz-weg-ikon"), id).toBeTruthy();
  });

  it("das Badge nennt den Ort; nur auf der Startseite nennt der Wegweiser sich selbst", async () => {
    await bootApp();
    expect(root.querySelector("#wegBadgeStart").textContent).toContain(de["weg.badge"]);
    expect(root.querySelector("#wegBadgeMein").textContent).toContain(de["start.capsMein"]);
    expect(root.querySelector("#wegBadgeTeil").textContent).toContain(de["start.capsTeil"]);
  });

  it("der Warte-Punkt bleibt Teil des Badges (D1-Vertrag)", async () => {
    await bootApp();
    for (const id of ["wegBadgeStart", "wegBadgeMein", "wegBadgeTeil"])
      expect(root.querySelector("#" + id + " .rz-punkt"), id).toBeTruthy();
  });
});

/* ---- Schritt 3 · Ein Titel je Zone ---- */

describe("D12-2a · ein Titel je Zone", () => {
  it("in den Vorraeumen traegt die untere Zone die Regalgruppe als H2", async () => {
    await bootApp();
    const mein = root.querySelector("#scrMyRoom > .rz-half:last-child");
    const teil = root.querySelector("#scrShared > .rz-half:last-child");
    expect(mein.querySelectorAll(".rz-h2")).toHaveLength(1);
    expect(mein.querySelector(".rz-h2").textContent).toBe(de["mein.gruppeRegale"]);
    expect(teil.querySelectorAll(".rz-h2")).toHaveLength(1);
    expect(teil.querySelector(".rz-h2").textContent).toBe(de["teil.gruppeRegale"]);
  });

  it("zone.regal wird in den Vorraeumen nicht mehr gerendert (Schluessel bleibt)", async () => {
    await bootApp();
    for (const id of ["scrMyRoom", "scrShared"])
      expect(root.querySelector("#" + id).textContent, id).not.toContain(de["zone.regal"]);
    expect("zone.regal" in de).toBe(true);
    expect("zone.regal" in en).toBe(true);
  });

  it("die Caps-Gruppenzeile unter dem Zonentitel ist ersatzlos weg", async () => {
    await bootApp();
    for (const [id, key] of [["scrMyRoom", "mein.gruppeRegale"], ["scrShared", "teil.gruppeRegale"]]) {
      const fuss = root.querySelector("#" + id + " > .rz-half:last-child .rz-fuss");
      expect(fuss.querySelector(".rz-caps"), id).toBeFalsy();
      expect(fuss.textContent, id).toContain(de[key]);
    }
  });

  it("Startseite: RAUM FUER MICH steht direkt ueber der Betreten-Zeile", async () => {
    await bootApp();
    const fuss = root.querySelector("#scrStart > .rz-half:first-child .rz-fuss");
    const caps = fuss.querySelector(".rz-caps");
    expect(caps.textContent).toBe(de["start.capsMein"]);
    // ... und zwar VOR dem Knopf, nicht darunter.
    expect(caps.compareDocumentPosition(root.querySelector("#btnMyRoom")))
      .toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it("beide Regalgruppen enden auf einen Punkt (DE und EN)", () => {
    for (const w of [de, en])
      for (const k of ["mein.gruppeRegale", "teil.gruppeRegale"])
        expect(w[k].endsWith("."), k).toBe(true);
  });
});

/* ---- Schritt 4 · Wortmarke am Fuss ---- */

describe("D12-2a · Wortmarke am Fuss", () => {
  it("jeder stehende Screen traegt genau eine Fussmarke mit allg.marke", async () => {
    await bootApp();
    for (const id of SCREENS) {
      const marken = root.querySelectorAll("#" + id + " .rz-fussmarke");
      expect(marken, id).toHaveLength(1);
      expect(marken[0].textContent, id).toBe(de["allg.marke"]);
    }
  });

  it("die Marke ist das letzte Kind ihrer Zone", async () => {
    await bootApp();
    for (const id of SCREENS) {
      const marke = root.querySelector("#" + id + " .rz-fussmarke");
      expect(marke.parentElement.lastElementChild, id).toBe(marke);
    }
  });

  it("kein Kopf traegt die Marke mehr", async () => {
    await bootApp();
    for (const id of SCREENS)
      expect(root.querySelector("#" + id + " .rz-kopf .rz-fussmarke"), id).toBeFalsy();
    expect(root.querySelector(".rz-kopf .rz-marke")).toBeFalsy();
  });

  it("auf Tiefgruen traegt die Marke ihren eigenen Ton", () => {
    expect(DESIGN_CSS).toContain("--rz-marke-auf-gruen:#6f8062");
    expect(DESIGN_CSS).toMatch(/\.rz-tiefgruen \.rz-fussmarke[^{]*\{color:var\(--rz-marke-auf-gruen\)\}/);
  });
});

// @vitest-environment happy-dom
// Design-Track D8 — drei Korrekturen: (1) Vollbild ohne Rand, (2) Wegweiser
// klappt aus der MITTE der Naht auf (nach oben und unten gleichermassen),
// (3) Sprachwechsel als kleiner DE/EN-Eckknopf mit Aufwaerts-Dialog.
// Der Paarsprache-VORGANG (vorschlagen/bestaetigen) bleibt unangetastet.

import { describe, it, expect, beforeEach } from "vitest";
import { DESIGN_CSS } from "../../core/ui/design.js";
import { createApp } from "../../core/ui/app.js";
import { Repo } from "../../core/store/repo.js";
import { Bstate, Pstate } from "../../core/store/bundles.js";
import { MemoryStore } from "../../core/store/store.js";
import { freigebeUebergabe } from "../../core/engine/freigabe.js";
import { uebergabeTeilKey } from "../../core/contracts/uebergabe.js";

describe("D8 · Vollbild ohne Rand", () => {
  it("keine Spalte mehr um die Vorraeume — die Screens gehen bis an die Kante", () => {
    expect(DESIGN_CSS).toContain(".rz-app{max-width:none;padding:0;width:100%;min-height:100dvh}");
    // die D2-Uebergangsregel (660px-Spalte fuer die Vorraeume) ist weg:
    expect(DESIGN_CSS).not.toMatch(/\.rz-app #scrMyRoom[^{]*\{[^}]*max-width:660px/);
  });

  it("randlos in JEDER Huelle: der Marker sitzt am <html>, nicht an #app", () => {
    // Die App-Wurzel ist je nach Plattform #app (Pages) oder #pbMain
    // (Artefakt-Huelle) — an #app gebundene Regeln greifen dort nicht.
    expect(DESIGN_CSS).toContain("html[data-vollbild],html[data-vollbild] body{margin:0;padding:0;width:100%;height:100%;max-width:none}");
    expect(DESIGN_CSS).toMatch(/html\[data-vollbild\] #app,html\[data-vollbild\] #pbMain\{[^}]*max-width:none/);
  });

  it("applyDesign setzt den Vollbild-Marker", async () => {
    const { applyDesign } = await import("../../core/ui/design.js");
    document.documentElement.removeAttribute("data-vollbild");
    const alt = document.getElementById("pbDesign");
    if (alt) alt.remove();
    applyDesign(document);
    expect(document.documentElement.getAttribute("data-vollbild")).toBe("1");
  });

  it("der Wegweiser-Knopf liegt UNTER dem Textpanel", () => {
    expect(DESIGN_CSS).toMatch(/\.rz-weg-badge\{z-index:3;/);   // Panel liegt auf 4
    expect(DESIGN_CSS).toMatch(/\.rz-weg-panel\{[^}]*z-index:4/);
  });

  it("body traegt Papier statt Verlauf, damit Overscroll nicht aus dem Bild faellt", () => {
    expect(DESIGN_CSS).toContain("body{margin:0;min-height:100%;background:var(--rz-papier)");
    expect(DESIGN_CSS).not.toContain("linear-gradient(172deg");
  });

  it("Sicherheitsabstaende leben in den Zonen (M3-Invariante bleibt erfuellt)", () => {
    for (const seite of ["top", "right", "bottom", "left"])
      expect(DESIGN_CSS).toContain(`env(safe-area-inset-${seite}`);
  });
});

describe("D8 · Wegweiser aus der Mitte", () => {
  it("Ursprung Mitte + translateY(-50%): waechst symmetrisch in beide Haelften", () => {
    // S114g · Ausschnitt statt Skalierung (siehe d1-design-tokens).
    expect(DESIGN_CSS).toMatch(/\.rz-weg-panel\{[^}]*transform:translateY\(-50%\);/);
    expect(DESIGN_CSS).toMatch(/\.rz-weg-panel\{[^}]*clip-path:inset\(50% 0 50% 0\)/);
    expect(DESIGN_CSS).toContain(".rz-weg-panel.rz-offen{clip-path:inset(0 0 0 0)");
    // NICHT mehr an der Oberkante verankert (altes Ausfahren nach unten):
    expect(DESIGN_CSS).not.toContain("transform-origin:top center");
  });
});

describe("D8 · Sprachwechsel", () => {
  it("Eckknopf unten rechts, Dialog faehrt von unten herein — Knopf bleibt darueber", () => {
    expect(DESIGN_CSS).toMatch(/#psZeile\.rz-sprachecke\{position:fixed;z-index:30/);
    expect(DESIGN_CSS).toMatch(/#psZeile\.rz-sprachecke\{[^}]*bottom:calc\(18px \+ env\(safe-area-inset-bottom/);
    expect(DESIGN_CSS).toMatch(/#boxPaarsprache\.rz-sprachdialog\{[^}]*transform:translateY\(100%\)/);
    expect(DESIGN_CSS).toContain("#boxPaarsprache.rz-sprachdialog:not(.pb-hidden){transform:translateY(0)");
    // Der Dialog bleibt im Fluss (display:block trotz pb-hidden), sonst
    // gaebe es keine Bewegung — der Zustandstraeger bleibt die Klasse.
    expect(DESIGN_CSS).toMatch(/#boxPaarsprache\.rz-sprachdialog\{[^}]*display:block/);
  });
});

/* ---- Verhalten: Knopf zeigt Sprache, Tap oeffnet/schliesst den Dialog ---- */

function memoryBackend(role = "A") {
  const store = new MemoryStore();
  const repo = new Repo({ store, ns: "T", code: "d8", activeModuleId: "betrieb" });
  const bstate = new Bstate(repo), pstate = new Pstate(repo);
  let locale = "de", request = null;
  return {
    store, repo,
    async info() { return { role, name: "Lena", partner: "Jonas", nameA: "Lena", nameB: "Jonas", locale, languageRequest: request }; },
    bstate: { get: f => bstate.get(f), set: (f, v) => bstate.set(f, v) },
    pstate: { get: f => pstate.get(role, f), set: (f, v) => pstate.set(role, f, v) },
    chat: {
      load: (art, id) => repo.get("chat:" + (art === "shared" ? id : role + ":" + id), art === "shared"),
      save: (art, id, c) => repo.set("chat:" + (art === "shared" ? id : role + ":" + id), c, art === "shared"),
    },
    handover: { post: d => freigebeUebergabe(repo, role, d), get: r => repo.get(uebergabeTeilKey(r), true, "kernwetten") },
    language: {
      async request(target) { request = { by: role, target }; return { locale, languageRequest: request, status: "pending" }; },
      async confirm() { return { locale, languageRequest: request, status: "pending" }; },
      async withdraw() { request = null; return { locale, languageRequest: null, status: "withdrawn" }; },
    },
    llm: async () => ({ text: "ok", stop: "end_turn" }),
  };
}
const tick = () => new Promise(r => setTimeout(r, 0));
const ruhe = async (n = 8) => { for (let i = 0; i < n; i++) await tick(); };

let root;
beforeEach(async () => {
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById("app");
  const app = createApp({ doc: document, backend: memoryBackend(), root });
  await app.boot();
  await ruhe();
});

/* U7 (Turn 41 · Nachtrag 1.1) · Aus dem Blatt ist ein Ort geworden. Die
   Aussagen bleiben dieselben — nur wohnen sie jetzt in zwei Zonen: die eigene
   Wahl oben auf Papier, der Vorschlag an den Partner unten in Tiefgruen,
   weil er das Geraet verlaesst. */
describe("D8/D12-2d · Sprache in den Einstellungen", () => {
  const oben = () => document.getElementById("einstOben");
  const unten = () => document.getElementById("einstGemeinsam");
  async function inDieEinstellungen() {
    document.getElementById("pbEinst").click();
    await ruhe();
  }

  it("der Ort bietet die Oberflaechensprache an und zeigt die aktuelle als gewaehlt", async () => {
    await inDieEinstellungen();
    const blatt = oben();
    expect(document.getElementById("scrEinstellungen").classList.contains("pb-hidden")).toBe(false);
    const wahlen = [...blatt.querySelectorAll("[data-ui]")].map(b => b.getAttribute("data-ui"));
    expect(wahlen).toEqual(["de", "en"]);
    expect(blatt.querySelector('[data-ui="de"]').classList.contains("an")).toBe(true);
    expect(blatt.querySelector('[data-ui="en"]').classList.contains("an")).toBe(false);
  });

  it("es nennt die Paarsprache und bietet den Wechsel-Vorschlag an", async () => {
    await inDieEinstellungen();
    // 3.4 · Ein Hinweis statt zwei: was die Begleitung spricht UND wie weit
    // die eigene Wahl reicht.
    const fuesse = [...oben().querySelectorAll(".rz-einst-fuss"),
                    ...unten().querySelectorAll(".rz-einst-fuss")].map(e => e.textContent).join(" ");
    expect(fuesse).toContain("Deutsch");
    expect(fuesse).toContain("Agenda");     // verhandelt wird dort
    // D12-2f · Gestellt wird der Antrag hier — der Eintrag entsteht in der Agenda.
    // U7/1.2 · Er steht UNTEN: er verlaesst das Geraet.
    const knopf = unten().querySelector("#einstSprachAntrag");
    expect(knopf).toBeTruthy();
    expect(knopf.textContent).toContain("Englisch");
  });

  it("die Ansicht steht als drei Zeilen oben", async () => {
    await inDieEinstellungen();
    const blatt = oben();
    expect([...blatt.querySelectorAll("[data-ansicht]")].map(b => b.getAttribute("data-ansicht")))
      .toEqual(["light", "dark", "auto"]);
    blatt.querySelector('[data-ansicht="dark"]').click();
    await ruhe();
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  /* U7 · Hier stand "erneuter Tap schliesst das Blatt wieder". Ein ORT
     schliesst sich nicht durch erneutes Antippen seines Eingangs — man geht
     zurueck. Geprueft wird deshalb der Rueckweg: der Pfeil oben links. */
  it("der Pfeil oben links fuehrt zurueck", async () => {
    await inDieEinstellungen();
    const schirm = document.getElementById("scrEinstellungen");
    expect(schirm.classList.contains("pb-hidden")).toBe(false);
    root.querySelector("#btnEinstZurueck").click();
    await ruhe();
    expect(schirm.classList.contains("pb-hidden")).toBe(true);
  });

  it("der alte Sprachknopf auf dem Startscreen ist weg", () => {
    expect(root.querySelector("#psZeile")).toBeNull();
    expect(root.querySelector("#psLink")).toBeNull();
  });
});

const klick = async el => { el.click(); await ruhe(); };

describe("Quick-Lane · Wegweiser auf dem Desktop", () => {
  it("das Panel klappt in der Mitte auf und geht über die volle Breite", async () => {
    const { DESIGN_CSS } = await import("../../core/ui/design.js");
    // Der Desktop-Block muss HINTER der Grundregel stehen, sonst gewinnt sie.
    const iGrund = DESIGN_CSS.indexOf(".rz-weg-panel{position:absolute");
    const iDesktop = DESIGN_CSS.indexOf("@media(min-width:900px){", iGrund);
    expect(iDesktop).toBeGreaterThan(iGrund);
    /* S114e · Im Ruhezustand hängt das Band am Viewport statt in der Spalte:
       Der Rollbereich der Hälfte hielt ein Klipprechteck in Spaltenbreite und
       rechnete es beim Aufklappen nicht neu, weshalb das Band für die Dauer
       der Bewegung beschnitten war. Mit position:fixed liegt kein Rollbereich
       mehr dazwischen. 50dvh trifft dieselbe Linie wie vorher top:50% — die
       Zweiteilung ist auf dem Desktop höhenfest 100dvh.
       Die 200%/-100%-Rechnung bleibt nur für das aufgeklappte Regal, wo die
       Zone neu ordnet (dort ist das Band ohnehin geschlossen, S114.8). */
    const desktop = DESIGN_CSS.slice(iDesktop);
    const ruhe = desktop.slice(desktop.indexOf(".rz-split:not(.rz-regal-offen) .rz-weg-panel{"));
    const regel = ruhe.slice(0, ruhe.indexOf("}") + 1);
    expect(regel).toContain("position:fixed");
    expect(regel).toContain("top:50dvh");      // Mitte statt Oberkante
    expect(regel).toContain("left:0");
    expect(regel).toContain("right:0");        // volle Fensterbreite, ohne Krücke
    expect(desktop).toContain(".rz-split.rz-regal-offen .rz-weg-panel{top:50%;right:auto;width:200%;margin-left:-100%}");
  });

  it("am Handy bleibt es das Band an der waagerechten Naht", async () => {
    const { DESIGN_CSS } = await import("../../core/ui/design.js");
    // Die Grundregel steht VOR dem Desktop-Block — dort greift sie allein.
    const grund = DESIGN_CSS.slice(DESIGN_CSS.indexOf(".rz-weg-panel{position:absolute"));
    expect(grund.slice(0, grund.indexOf("}"))).toContain("left:0;right:0;top:0");
  });
});


describe("D12-2f · Der Vorschlag aus dem Blatt landet in der Agenda", () => {
  it("Klick stellt den Antrag; danach nennt die Zone den Stand statt eines zweiten Knopfs", async () => {
    document.getElementById("pbEinst").click();
    await ruhe();
    // U7/1.2 · Der Vorschlag steht in der Tiefgruen-Zone: er verlaesst das Geraet.
    const zone = document.getElementById("einstGemeinsam");
    await klick(zone.querySelector("#einstSprachAntrag"));
    expect(zone.querySelector("#einstSprachAntrag")).toBeNull();
    expect(zone.textContent).toContain("Agenda");
  });
});

describe("Q2 · Desktop: Zeilenschrift und Regal", () => {
  it("die Zeilen über und unter der Naht tragen dieselbe, kleinere Schrift", async () => {
    const { DESIGN_CSS } = await import("../../core/ui/design.js");
    const grund = DESIGN_CSS.slice(DESIGN_CSS.indexOf(".rz-zeile{"));
    expect(grund.slice(0, grund.indexOf("}"))).toContain("font-size:var(--rz-fs-zeile)");
    // Kein Sonder-Grad mehr für die Zeilen auf Tiefgrün.
    expect(DESIGN_CSS).not.toContain(".rz-tiefgruen .rz-zeile{font-size:");
  });

  it("das offene Regal bleibt auf dem Desktop in seiner Hälfte", async () => {
    const { DESIGN_CSS } = await import("../../core/ui/design.js");
    /* S114d.3 · Die Regel stand im ersten 900px-Block und blieb wirkungslos:
       gleiche Spezifität wie die Grundregel weiter unten, aber davor — eine
       @media-Klammer erhöht die Spezifität nicht, also gewann deren left:0.
       Sie steht jetzt dahinter, wo sie greift. */
    const grund = DESIGN_CSS.indexOf(".rz-regal-offen>.rz-half:last-child{position:absolute");
    expect(grund).toBeGreaterThan(0);
    expect(DESIGN_CSS.indexOf(".rz-regal-offen>.rz-half:last-child{left:50%}"))
      .toBeGreaterThan(grund);
    // Die obere Hälfte endet ebenfalls an der Naht, statt beide zu überdecken.
    expect(DESIGN_CSS).toContain(".rz-regal-offen>.rz-half:first-child{right:50%}");
  });
});

describe("Q3 · Desktop-Feinschliff", () => {
  const css = async () => (await import("../../core/ui/design.js")).DESIGN_CSS;
  const desktop = async () => {
    const c = await css();
    return c.slice(c.indexOf("@media(min-width:900px){"));
  };

  it("der Trigger trägt genau zwei Zeichnungen — Baum und Seerose, sonst nichts", async () => {
    const { CHROME_HTML } = await import("../../core/ui/design.js");
    expect((CHROME_HTML.match(/<svg/g) || [])).toHaveLength(2);
    const d = document.createElement("div");
    d.innerHTML = CHROME_HTML;
    expect(d.querySelectorAll(".rz-einst-baum")).toHaveLength(1);
    expect(d.querySelectorAll(".rz-einst-seerose")).toHaveLength(1);
  });

  it("die senkrechte Naht gilt nur im Split — der Chat bleibt gestapelt", async () => {
    const d = await desktop();
    expect(d).toContain(".rz-split .rz-auf-naht{left:0;top:50%");
    // Ohne die Einschränkung hätte es das Chat-Badge an die linke Kante gezogen:
    // die Regel darf NICHT unqualifiziert am Zeilenanfang stehen.
    expect(d).not.toMatch(/\n\s*\.rz-auf-naht\{/);
  });

  it("aufgeklappt bleibt der Wegweiser auf der Nahtmitte stehen", async () => {
    expect(await desktop()).toContain(".rz-split.rz-regal-offen .rz-auf-naht{top:50dvh}");
  });

  it("die Linkgruppen flankieren die Naht — links darüber, rechts darunter", async () => {
    const d = await desktop();
    expect(d).toContain(">.rz-half:first-child .rz-fuss{margin-bottom:50dvh}");
    /* S114.11 · Die rechte Flanke rechnet zusaetzlich das Nahtpolster mit,
       das links seit T2b als .rz-fuss{padding-bottom:var(--rz-nahtfrei)}
       steht — vorher stand die erste Zeile rechts sichtbar dichter am Badge
       als links die letzte. Dieselbe Zahl, derselbe Token, gespiegelte Seite. */
    expect(d).toContain("margin-top:calc(50dvh + var(--rz-nahtfrei))");
    // Im offenen Regal ordnet die Zone neu — dort darf die Regel nicht greifen.
    expect(d).toContain(".rz-split:not(.rz-regal-offen)");
  });
});

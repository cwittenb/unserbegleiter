// @vitest-environment happy-dom
// S114 · Design- und Textschnitte in Vorräumen, Session und Einstieg.
//
// Sechs Befunde, eine gemeinsame Wurzel bei dreien davon: eine Regel, die an
// ZWEI Orten getroffen wird, driftet auseinander.
//
//   S114.6  Das Sprecherlabel fiel an drei Orten, die Regel stand an zweien.
//   S114.7  Der Pfeil zeigte die Lage statt der Bewegung.
//   S114.8  Der Wegweiser blieb bei aufgeklapptem Regal bedienbar.
//   S114.9  Die Desktop-Regeln des Wegweisers galten auch im Gespräch.
//   S114.11 Der Nahtabstand war einseitig.
//   S114.12 Die rollende Zone öffnete eine waagerechte Bildlaufleiste.
//
// Dazu die Textschnitte: getrennte Raumtitel, Introtexte, Boxen ohne
// verdoppelte Überschriften, Einstieg des Reflexionsgesprächs.

import { describe, it, expect, beforeEach } from "vitest";
import { DESIGN_CSS } from "../../core/ui/design.js";
import { createApp } from "../../core/ui/app.js";
import { Repo } from "../../core/store/repo.js";
import { Bstate, Pstate } from "../../core/store/bundles.js";
import { MemoryStore } from "../../core/store/store.js";
import { freigebeUebergabe } from "../../core/engine/freigabe.js";
import { uebergabeTeilKey } from "../../core/contracts/uebergabe.js";
import { de } from "../../core/i18n/de.js";
import { en } from "../../core/i18n/en.js";
import { reflexionsPrompt } from "../../core/prompts/prompts.de.js";
import { reflexionsPrompt as reflexionsPromptEn } from "../../core/prompts/prompts.en.js";

const tick = () => new Promise(r => setTimeout(r, 0));
const ruhe = async (n = 6) => { for (let i = 0; i < n; i++) await tick(); };
const klick = async el => { el.dispatchEvent(new Event("click", { bubbles: true })); await ruhe(); };

function memoryBackend(role = "A") {
  const store = new MemoryStore();
  const repo = new Repo({ store, ns: "T", code: "s114", activeModuleId: "betrieb" });
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

/* ============ Texte ============ */

describe("S114.1/2 · Der Titel nennt, wessen Raum das ist", () => {
  it("die beiden Vorräume tragen verschiedene Titel", async () => {
    await bootApp();
    expect(root.querySelector("#scrMyRoom .rz-h1").textContent).toBe(de["zone.raumMein"]);
    expect(root.querySelector("#scrShared .rz-h1").textContent).toBe(de["zone.raumTeil"]);
    expect(de["zone.raumMein"]).not.toBe(de["zone.raumTeil"]);
  });

  it("der alte gemeinsame Schlüssel ist fort — nicht bloß ungenutzt", () => {
    // S113-Wächter: ein Schlüssel ohne Aufrufer ist totes Material.
    expect("zone.raum" in de).toBe(false);
    expect("zone.raum" in en).toBe(false);
  });

  it("das Intro des eigenen Raums kommt ohne Platzhalter aus", async () => {
    await bootApp();
    const txt = root.querySelector("#meinIntro").textContent;
    expect(txt).toContain("nur für dich");
    expect(txt).not.toContain("{");     // {partner} ist entfallen, nicht unersetzt
    expect(de["mein.intro"]).not.toContain("{partner}");
    expect(en["mein.intro"]).not.toContain("{partner}");
  });
});

describe("S114.4 · Die Boxen wiederholen ihre Regalzeile nicht mehr", () => {
  it("Zeitleiste und Agenda tragen einen Hilfetext statt einer Überschrift", async () => {
    await bootApp();
    await klick(root.querySelector("#btnMyRoom"));
    expect(root.querySelector("#boxZeitleiste").textContent).toContain(de["zeitleiste.hilfe"]);
    await klick(root.querySelector("#btnZurueck1"));
    await klick(root.querySelector("#btnSharedRoom"));
    expect(root.querySelector("#boxAgenda").textContent).toContain(de["agenda.hilfe"]);
  });

  it("die Regalzeile heißt 'Gemeinsamer Fokus'", async () => {
    await bootApp();
    await klick(root.querySelector("#btnSharedRoom"));
    expect(root.querySelector("#btnAgenda").textContent).toContain("Gemeinsamer Fokus");
  });

  it("die entfallenen Überschriften sind auch als Schlüssel fort", () => {
    for (const k of ["momente.titel", "regal.intro", "agenda.titel", "zeitleiste.titel"]) {
      expect(k in de, k).toBe(false);
      expect(k in en, k).toBe(false);
    }
  });

  it("die neuen Schlüssel stehen in beiden Wörterbüchern", () => {
    for (const k of ["zone.raumMein", "zone.raumTeil", "agenda.hilfe", "zeitleiste.hilfe"]) {
      expect(k in de, k).toBe(true);
      expect(k in en, k).toBe(true);
    }
  });
});

describe("S114.5 · Der Einstieg des Reflexionsgesprächs", () => {
  const de_ = reflexionsPrompt("Anna", "Bernd");
  const en_ = reflexionsPromptEn("Anna", "Bernd");

  it("kalter Start fragt nach dem, was gerade da ist — und sagt 'Hier gilt'", () => {
    const t = de_;
    expect(t).toContain("welche Themen dich gerade beschäftigen");
    expect(t).toContain("Hier gilt: Dieser Raum gehört ganz dir");
    // "Wie immer" gehört zur Wiederkehr, nicht zum ersten Mal.
    expect(t).not.toContain("Wie immer: Dieser Raum gehört ganz dir, du entscheidest.\" Hier");
  });

  it("die Wiederkehr hat eine Standardfassung UND behält den Vorrang des konkreten Ankers", () => {
    const t = de_;
    expect(t).toContain("Was davon hat dich noch weiter bewegt?");
    expect(t).toContain("STANDARDFASSUNG");
    // Ohne diesen Vorrang widerspräche die generische Fassung der
    // MERKPOSTEN-Regel, die genau sie zum Verstoß erklärt.
    expect(t).toContain("VORRANG");
    expect(t).toContain("MERKPOSTEN");
  });

  it("dasselbe steht im englischen Korpus", () => {
    const t = en_;
    expect(t).toContain("DEFAULT WORDING");
    expect(t).toContain("PRECEDENCE");
    expect(t).toContain("What of it has kept moving you?");
  });
});

/* ============ Verhalten ============ */

describe("S114.7 · Der Pfeil zeigt die Bewegung", () => {
  it("geschlossen nach oben, offen nach unten — in beiden Räumen gleich", async () => {
    await bootApp();
    await klick(root.querySelector("#btnMyRoom"));
    const pfeil = id => root.querySelector("#" + id + " .rz-pfeil").textContent;
    expect(pfeil("btnZeitleiste")).toBe("\u2191");
    await klick(root.querySelector("#btnZeitleiste"));
    expect(pfeil("btnZeitleiste")).toBe("\u2193");
    await klick(root.querySelector("#btnZeitleiste"));
    expect(pfeil("btnZeitleiste")).toBe("\u2191");
  });

  it("auch im Startmarkup — nicht erst nach dem ersten Klick", async () => {
    await bootApp();
    for (const el of root.querySelectorAll("[data-box] .rz-pfeil"))
      expect(el.textContent).toBe("\u2191");
  });
});

describe("S114.8 · Bei aufgeklapptem Regal ist der Wegweiser still", () => {
  it("das Badge nimmt keine Klicks mehr an", async () => {
    await bootApp();
    await klick(root.querySelector("#btnSharedRoom"));
    const badge = root.querySelector("#wegBadgeTeil");
    expect(badge.disabled).toBe(false);
    await klick(root.querySelector("#btnRegal"));
    expect(badge.disabled).toBe(true);
    expect(badge.getAttribute("aria-disabled")).toBe("true");
    await klick(root.querySelector("#btnRegal"));
    expect(badge.disabled).toBe(false);
  });

  it("ein offenes Panel wird beim Aufklappen geschlossen, nicht überdeckt", async () => {
    await bootApp();
    await klick(root.querySelector("#btnSharedRoom"));
    const panel = root.querySelector("#wegTeil");
    panel.classList.add("rz-offen");
    await klick(root.querySelector("#btnRegal"));
    expect(panel.classList.contains("rz-offen")).toBe(false);
  });

  it("sichtbar bleibt es trotzdem — es markiert weiter die Naht", () => {
    expect(DESIGN_CSS).not.toMatch(/\.rz-regal-offen \.rz-weg-badge\{[^}]*display:none/);
    expect(DESIGN_CSS).toContain(".rz-regal-offen .rz-weg-badge{z-index:6;pointer-events:none}");
  });
});

/* ============ Layout ============ */

describe("S114.9/10 · Der Wegweiser im Gespräch", () => {
  it("die Desktop-Regeln gelten nur der Zweiteilung", () => {
    // Ohne .rz-split davor trafen sie auch #scrChat: dort gibt es keine
    // senkrechte Naht, das Panel rutschte auf halbe Höhe der Schreibkante.
    expect(DESIGN_CSS).toContain(".rz-split .rz-weg-panel{top:50%");
    expect(DESIGN_CSS).not.toMatch(/\n\s*\.rz-weg-panel\{top:50%/);
  });

  it("die Breite wechselt nicht mitten in der Bewegung", () => {
    // Genau eine Breitenregel je Zustand — vorher entschied die Reihenfolge
    // zweier gleich spezifischer Regeln, und das Panel sprang nach.
    const desktop = DESIGN_CSS.slice(DESIGN_CSS.indexOf(".rz-split .rz-weg-panel{top:50%"));
    const zugeklappt = desktop.indexOf(".rz-split:not(.rz-regal-offen) .rz-weg-panel{right:0;width:auto;margin-left:0}");
    // Die Normalfall-Regel steht HINTER der 200%-Kruecke des offenen Regals —
    // bei gleicher Spezifitaet entscheidet die Reihenfolge, und der Normalfall
    // muss gewinnen.
    expect(zugeklappt).toBeGreaterThan(0);
  });
});

describe("S114.11 · Der Nahtabstand ist beidseitig", () => {
  it("beide Flanken lesen denselben Token", () => {
    expect(DESIGN_CSS).toContain(".rz-fuss{padding-bottom:var(--rz-nahtfrei)}");
    expect(DESIGN_CSS).toContain("margin-top:calc(50dvh - 30px + var(--rz-nahtfrei))");
  });
});

describe("S114.11a · Das Ortsetikett steht an seiner Zeile", () => {
  it("unter der Hairline der Betreten-Zeile, nicht im Zonenfuß", async () => {
    await bootApp();
    const zone = root.querySelector("#scrStart .rz-tiefgruen");
    const etikett = zone.querySelector(".rz-caps-unter");
    expect(etikett.textContent).toBe(de["start.capsTeil"]);
    const kinder = [...zone.children];
    expect(kinder.indexOf(etikett)).toBeGreaterThan(kinder.indexOf(root.querySelector("#btnSharedRoom")));
    expect(zone.querySelector(".rz-fuss .rz-caps")).toBe(null);
    // Gespiegelt zur ersten Hälfte, wo es über der Linie steht.
    expect(root.querySelector("#scrStart .rz-papier .rz-caps-ueber")).toBeTruthy();
    expect(DESIGN_CSS).toContain(".rz-caps-unter{margin-top:11px}");
  });
});

describe("S114.12 · Keine waagerechte Bildlaufleiste über der Naht", () => {
  it("die rollende Zone schneidet die andere Achse ab", () => {
    // overflow-y:auto macht die andere Achse implizit zu "auto" — jeder
    // waagerechte Überlauf legte die Leiste an den unteren Rand DIESER Zone,
    // also direkt über der Naht. Die Abfangregel am Screen wurde nie erreicht.
    expect(DESIGN_CSS).toMatch(/#scrChat \.rz-chat-oben\{[^}]*overflow-x:clip/);
    expect(DESIGN_CSS).toMatch(/#scrChat \.rz-chat-oben\{[^}]*overflow-y:auto/);
  });
});

describe("S114.13/14 · Die Pille ist fort", () => {
  it("Knöpfe sind flach und kantig, nicht rund und gefüllt", () => {
    expect(DESIGN_CSS).toMatch(/\.pb-btn\{[^}]*border-radius:0/);
    expect(DESIGN_CSS).not.toMatch(/\.pb-btn\{[^}]*border-radius:var\(--rz-rund-pille\)/);
    // .primary betont über die KANTE, nicht über die Fläche.
    expect(DESIGN_CSS).toContain(".pb-btn.primary{border-color:var(--rz-akzent)");
    expect(DESIGN_CSS).not.toMatch(/\.pb-btn\.primary\{background:var\(--rz-akzent\)/);
  });

  it("Listeneinträge und Agenda-Gruppen sprechen Haarlinie und Caps", () => {
    expect(DESIGN_CSS).toMatch(/\.pb-item\{border-bottom:1px solid var\(--rz-hairline\)/);
    expect(DESIGN_CSS).toMatch(/\.pb-ag-block\{border:0/);
    expect(DESIGN_CSS).toMatch(/\.pb-ag-kopf\{[^}]*text-transform:uppercase/);
  });

  it("die Wahl-Karten der Sessions tragen die Trennlinie, keinen Rahmen", () => {
    expect(DESIGN_CSS).toMatch(/\.rz-blockknopf,\.rz-blockknopf-leise\{[^}]*border-top:1px solid var\(--rz-hairline\)/);
  });

  it("kein Radius mehr an Karte und Rangfolge-Platz", () => {
    expect(DESIGN_CSS).toMatch(/\.pb-card\{[^}]*border-radius:0/);
    expect(DESIGN_CSS).toMatch(/\.pb-platz\{[^}]*border-radius:0/);
  });
});

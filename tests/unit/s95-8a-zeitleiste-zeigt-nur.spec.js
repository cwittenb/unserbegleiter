// @vitest-environment happy-dom
// S95.8a · Was die Zeitleiste anbietet — und was nicht mehr.
//
// Der frühere Teilen-Eingang ist zurückgebaut: Er führte an M1-Bremse und
// Sorgen-Weiche vorbei, weil beide im Gespräch leben und dort keins war.
// Geblieben sind Lesen und Löschen — beides ändert nichts am Partner.
//
// Zwei Eigenschaften sind wichtiger als das Öffnen selbst:
//   · Der Eingang erscheint NUR, wo ein Verlauf liegt — keine ausgegraute Tür,
//     kein Hinweis auf Fehlendes. Eine verschlossene Tür ist schlechter als
//     gar keine (dieselbe Regel wie bei ausschnittAngebot).
//   · Er ist still. Kein Zähler, kein Badge, keine Erinnerung — wer die
//     Zeitleiste liest, soll nicht daran gemahnt werden, dass da noch etwas
//     ungeteilt liegt. Dieselbe Disziplin wie beim Regal.

import { describe, it, expect, beforeEach } from "vitest";
import { macheAnsichtenScreen } from "../../core/ui/ansichten-screen.js";
import { setLocale, t } from "../../core/i18n/index.js";

const EINTRAEGE = [
  { topics: ["Auftragsklärung"], summary: "Ohne Verlauf", at: "2026-07-01T10:00:00Z" },
  { topics: ["Auftragsklärung"], summary: "Mit Verlauf", at: "2026-07-02T10:00:00Z", vid: "1700-abc" },
];

function baue({ eintraege = EINTRAEGE, verlauf = { messages: [{ role: "user", content: "x" }] } } = {}) {
  document.body.innerHTML = '<div id="boxZeitleiste"><div id="zlItems"></div></div>';
  const gerufen = { lesen: 0, bestaetigt: 0 };
  const speicher = new Map([["timeline", { entries: eintraege }]]);
  if (verlauf) speicher.set("verlauf:1700-abc", verlauf);
  const backend = { pstate: { async get(k) { return speicher.get(k) ?? null; },
                              async set(k, v) { speicher.set(k, v); return true; } } };
  const screen = macheAnsichtenScreen({
    $: id => document.getElementById(id), backend, state: {},
    zeigeNur: () => {}, rhythmusSektion: async () => {}, zeitleistenEintrag: async () => {},
    zeigePaarsprache: () => {},
    oeffneLeseansicht: () => { gerufen.lesen++; },
    bestaetige: async () => { gerufen.bestaetigt++; return true; },
  });
  return { screen, gerufen, speicher };
}
const eingaenge = () => document.querySelectorAll("[data-zllesen]");

beforeEach(() => setLocale("de"));

describe("S95.8a · Sichtbarkeit", () => {
  it("erscheint nur am Eintrag mit Verlauf", async () => {
    const { screen } = baue();
    await screen.zeigeZeitleiste();
    expect(eingaenge()).toHaveLength(1);
    expect(eingaenge()[0].getAttribute("data-zllesen")).toBe("1700-abc");
  });

  it("keine ausgegraute Tür am Eintrag ohne Verlauf", async () => {
    const { screen } = baue({ eintraege: [EINTRAEGE[0]] });
    await screen.zeigeZeitleiste();
    expect(eingaenge()).toHaveLength(0);
    expect(document.getElementById("zlItems").textContent).not.toContain(t("verlauf.zlLesen"));
  });

  it("still: kein Zähler und kein Badge im Zeitleisten-Text", async () => {
    const { screen } = baue();
    await screen.zeigeZeitleiste();
    const txt = document.getElementById("zlItems").textContent;
    expect(txt).not.toMatch(/\(\d+\)|\d+\s*(ungeteilt|offen|neu)/i);
  });
});

describe("S95.8a · Löschen (F1)", () => {
  it("fragt zurück, löscht den Verlauf und lässt den Eintrag stehen", async () => {
    const { screen, gerufen, speicher } = baue();
    await screen.zeigeZeitleiste();
    document.querySelector("[data-zlweg]").click();
    await new Promise(r => setTimeout(r, 0));
    expect(gerufen.bestaetigt).toBe(1);
    expect(speicher.get("verlauf:1700-abc")).toBeNull();
    expect(speicher.get("timeline").entries).toHaveLength(2);   // Einträge unberührt
  });
});

describe("S95.8a · Der Teilen-Eingang ist zurückgebaut", () => {
  it("die Zeitleiste bietet kein Teilen mehr an — der Weg an der M1-Bremse vorbei ist zu", async () => {
    const { screen } = baue();
    await screen.zeigeZeitleiste();
    expect(document.querySelectorAll("[data-zlteil]")).toHaveLength(0);
  });

  it("die Ansichten-Fabrik kennt kein oeffneReplay mehr", async () => {
    // Wird der Eingang je wieder eingebaut, muss er durch eine Session laufen.
    const { screen } = baue();
    expect(Object.keys(screen)).not.toContain("oeffneReplay");
  });

  it("Lesen und Löschen bleiben — beides ändert nichts am Partner", async () => {
    const { screen } = baue();
    await screen.zeigeZeitleiste();
    expect(document.querySelectorAll("[data-zllesen]")).toHaveLength(1);
    expect(document.querySelectorAll("[data-zlweg]")).toHaveLength(1);
  });
});

// @vitest-environment happy-dom
// S95.7c · Der Replay-Eingang an der Zeitleiste.
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

function baue({ eintraege = EINTRAEGE, verlauf = { messages: [{ role: "user", content: "x" }] }, laeuft = false } = {}) {
  document.body.innerHTML = '<div id="boxZeitleiste"><div id="zlItems"></div></div>';
  const gerufen = { replay: 0, hinweis: [], bestaetigt: 0 };
  const speicher = new Map([["timeline", { entries: eintraege }]]);
  if (verlauf) speicher.set("verlauf:1700-abc", verlauf);
  const backend = { pstate: { async get(k) { return speicher.get(k) ?? null; },
                              async set(k, v) { speicher.set(k, v); return true; } } };
  const screen = macheAnsichtenScreen({
    $: id => document.getElementById(id), backend, state: {},
    zeigeNur: () => {}, rhythmusSektion: async () => {}, zeitleistenEintrag: async () => {},
    zeigePaarsprache: () => {},
    oeffneReplay: () => { gerufen.replay++; },
    laeuftGespraech: () => laeuft,
    hinweis: m => gerufen.hinweis.push(m),
    bestaetige: async () => { gerufen.bestaetigt++; return true; },
  });
  return { screen, gerufen, speicher };
}
const eingaenge = () => document.querySelectorAll("[data-zlteil]");

beforeEach(() => setLocale("de"));

describe("S95.7c · Sichtbarkeit", () => {
  it("erscheint nur am Eintrag mit Verlauf", async () => {
    const { screen } = baue();
    await screen.zeigeZeitleiste();
    expect(eingaenge()).toHaveLength(1);
    expect(eingaenge()[0].getAttribute("data-zlteil")).toBe("1700-abc");
  });

  it("keine ausgegraute Tür am Eintrag ohne Verlauf", async () => {
    const { screen } = baue({ eintraege: [EINTRAEGE[0]] });
    await screen.zeigeZeitleiste();
    expect(eingaenge()).toHaveLength(0);
    expect(document.getElementById("zlItems").textContent).not.toContain(t("verlauf.zlEingang"));
  });

  it("still: kein Zähler und kein Badge im Zeitleisten-Text", async () => {
    const { screen } = baue();
    await screen.zeigeZeitleiste();
    const txt = document.getElementById("zlItems").textContent;
    expect(txt).not.toMatch(/\(\d+\)|\d+\s*(ungeteilt|offen|neu)/i);
  });
});

describe("S95.7c · Öffnen", () => {
  it("öffnet das Auswahl-Panel mit dem aufbewahrten Verlauf", async () => {
    const { screen, gerufen } = baue();
    await screen.zeigeZeitleiste();
    eingaenge()[0].click();
    await new Promise(r => setTimeout(r, 0));
    expect(gerufen.replay).toBe(1);
  });

  it("bei laufendem Gespräch: Hinweis statt Panel", async () => {
    const { screen, gerufen } = baue({ laeuft: true });
    await screen.zeigeZeitleiste();
    eingaenge()[0].click();
    await new Promise(r => setTimeout(r, 0));
    expect(gerufen.replay).toBe(0);
    expect(gerufen.hinweis[0]).toBe(t("verlauf.zlLaeuft"));
  });

  it("gelöschter Verlauf öffnet nichts — kein toter Eingang", async () => {
    const { screen, gerufen } = baue({ verlauf: null });
    await screen.zeigeZeitleiste();
    eingaenge()[0].click();
    await new Promise(r => setTimeout(r, 0));
    expect(gerufen.replay).toBe(0);
  });
});

describe("S95.7c · Löschen (F1)", () => {
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

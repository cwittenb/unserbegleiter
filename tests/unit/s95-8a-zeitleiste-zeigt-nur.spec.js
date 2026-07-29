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
//
// U8.5 · Der LÖSCHEN-Link ist umgezogen: Er steht jetzt im Fuß der
// Leseansicht, neben "Schließen" (app.js), nicht mehr in der Listenzeile.
// Löschen ohne Ansehen war ein Griff ins Dunkle — die Zeile nennt Schlagwort
// und Zusammenfassung, nicht den Wortlaut, der verschwindet.
//
// Die S95.8a-Invariante ist davon UNBERÜHRT und wird hier weiter gehalten:
// Die Zeitleiste handelt nicht. Lesen ändert nichts, und Löschen ändert
// nichts am Partner — an welcher Stelle der Link dafür steht, ist eine Frage
// der Bedienung, nicht der Architektur. Was NICHT zurückkommen darf, ist ein
// Teilen-Eingang, der an M1-Bremse und Sicherheits-Weiche vorbeiführt.

import { describe, it, expect, beforeEach } from "vitest";
import { macheAnsichtenScreen } from "../../core/ui/ansichten-screen.js";
import { setLocale, t } from "../../core/i18n/index.js";

const EINTRAEGE = [
  { topics: ["Auftragsklärung"], summary: "Ohne Verlauf", at: "2026-07-01T10:00:00Z" },
  { topics: ["Auftragsklärung"], summary: "Mit Verlauf", at: "2026-07-02T10:00:00Z", vid: "1700-abc" },
];

function baue({ eintraege = EINTRAEGE, verlauf = { messages: [{ role: "user", content: "x" }] } } = {}) {
  document.body.innerHTML = '<div id="boxZeitleiste"><div id="zlItems"></div></div>';
  const gerufen = { lesen: 0, bestaetigt: 0, lesenVid: null };
  const speicher = new Map([["timeline", { entries: eintraege }]]);
  if (verlauf) speicher.set("verlauf:1700-abc", verlauf);
  const backend = { pstate: { async get(k) { return speicher.get(k) ?? null; },
                              async set(k, v) { speicher.set(k, v); return true; } } };
  const screen = macheAnsichtenScreen({
    $: id => document.getElementById(id), backend, state: {},
    zeigeNur: () => {}, rhythmusSektion: async () => {}, zeitleistenEintrag: async () => {},
    zeigePaarsprache: () => {},
    oeffneLeseansicht: (_v, vid) => { gerufen.lesen++; gerufen.lesenVid = vid; },
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

describe("U8.5 · Löschen ist umgezogen (F1 gilt weiter)", () => {
  it("die Listenzeile bietet kein Löschen mehr an", async () => {
    const { screen } = baue();
    await screen.zeigeZeitleiste();
    expect(document.querySelectorAll("[data-zlweg]")).toHaveLength(0);
  });

  it("die Zeile fragt auch nichts — kein Bestätigen-Pfad mehr in der Liste", async () => {
    const { screen, gerufen } = baue();
    await screen.zeigeZeitleiste();
    for (const el of document.querySelectorAll("#zlItems span")) el.click();
    await new Promise(r => setTimeout(r, 0));
    expect(gerufen.bestaetigt).toBe(0);
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

  it("Lesen bleibt — es ändert nichts am Partner", async () => {
    const { screen } = baue();
    await screen.zeigeZeitleiste();
    expect(document.querySelectorAll("[data-zllesen]")).toHaveLength(1);
  });

  it("die Kennung geht ans Lesen mit — der Fuß braucht sie für Löschen und Teilen", async () => {
    const { screen, gerufen } = baue();
    await screen.zeigeZeitleiste();
    document.querySelector("[data-zllesen]").click();
    await new Promise(r => setTimeout(r, 0));
    expect(gerufen.lesen).toBe(1);
    expect(gerufen.lesenVid).toBe("1700-abc");
  });
});

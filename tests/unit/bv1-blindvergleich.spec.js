// BV-1 · Blindvergleich Sprachduktus — Reize, Paare, Trennung, Auswertung.
//
// Der Judge misst Regeln, nicht ob sich eine Antwort menschlich anfühlt. Das
// entscheidet ein Mensch — aber nur, wenn er das Modell nicht kennt. Diese
// Tests sichern genau das: Die Reize-Datei verrät kein Modell, jedes
// Modellpaar tritt je Situation gleich oft an, und die Auswertung rechnet
// bekannte Quoten richtig zurück.

import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DUKTUS_SET, DUKTUS_SET_VERSION, alsSzenario } from "../../evals/blindvergleich/duktus-set.js";
import { zufallsquelle, bildePaare, trenne, werteAus, bradleyTerry, lesart, neueKennung } from "../../evals/blindvergleich/kern.js";
import { spieleSample } from "../../evals/runner-kern.js";
import { cfgFuerLauf } from "../../scripts/blindvergleich.js";
import { bericht } from "../../scripts/blindvergleich-auswertung.js";

const ROOT = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));
const KONFIG = JSON.parse(readFileSync(path.join(ROOT, "evals/modellvergleich.json"), "utf8"));
const MODELLE = KONFIG.laeufe.map(l => l.modell);

describe("BV1 · Duktus-Set", () => {
  it("12 Situationen, eindeutige IDs", () => {
    expect(DUKTUS_SET).toHaveLength(12);
    expect(new Set(DUKTUS_SET.map(s => s.id)).size).toBe(12);
  });
  it("Verlauf beginnt mit Nutzer, wechselt ab und endet mit Begleiter (Eingabe folgt)", () => {
    for (const s of DUKTUS_SET) {
      s.verlauf.forEach((m, i) => expect(m.role, s.id).toBe(i % 2 === 0 ? "user" : "assistant"));
      expect(s.verlauf.length % 2, s.id).toBe(0);
      expect(s.eingabe.trim().length, s.id).toBeGreaterThan(5);
    }
  });
  it("nur Sessions, die der Runner kennt; beide Sprecher vertreten", () => {
    for (const s of DUKTUS_SET) expect(["solo", "moment"]).toContain(s.session);
    expect(DUKTUS_SET.some(s => s.kontext.me === "Bernd")).toBe(true);
    expect(DUKTUS_SET.filter(s => s.session === "moment")).toHaveLength(2);
  });
  it("kein Modellname im Set", () => {
    const text = JSON.stringify(DUKTUS_SET);
    for (const m of MODELLE) expect(text).not.toContain(m);
  });
});

describe("BV-2 · Duktus-Set v2 ohne Auftakt-Artefakt", () => {
  it("Version 2; keine Situation ist mehr der Sitzungsbeginn", () => {
    expect(DUKTUS_SET_VERSION).toBe(2);
    for (const s of DUKTUS_SET) expect(s.verlauf.length, s.id).toBeGreaterThanOrEqual(2);
  });
  it("Solo: Begrüßung und KI-Hinweis sind schon erledigt, mit dem richtigen Namen", () => {
    for (const s of DUKTUS_SET.filter(x => x.session === "solo")) {
      expect(s.verlauf[1].content, s.id).toMatch(/KI-Begleitung/);
      expect(s.verlauf[1].content, s.id).toContain("Hallo " + s.kontext.me);
    }
  });
  it("Gemeinsamer Raum: Start-Okay beider liegt vor (sonst „Okay zuerst“)", () => {
    for (const s of DUKTUS_SET.filter(x => x.session === "moment")) {
      expect(s.verlauf[0].content, s.id).toMatch(/Anna:.*Bernd: Ja/);
    }
  });
});

describe("BV2 · feste Vorgeschichte im Runner-Kern", () => {
  it("Verlauf geht unverändert vor die Eingabe, nur ein Zug wird erzeugt", async () => {
    const s = DUKTUS_SET.find(x => x.id === "BV-09");
    const gesehen = [];
    const call = async (sys, msgs) => { gesehen.push(msgs.map(m => ({ ...m }))); return { text: "Antwort" }; };
    const verlauf = await spieleSample(call, alsSzenario(s));
    expect(gesehen).toHaveLength(1);
    expect(gesehen[0].slice(0, s.verlauf.length)).toEqual(s.verlauf);
    expect(gesehen[0].at(-1)).toEqual({ role: "user", content: s.eingabe });
    expect(verlauf.at(-1)).toMatchObject({ role: "assistant", content: "Antwort" });
  });
  it("Szenarien ohne Verlauf unverändert", async () => {
    const gesehen = [];
    await spieleSample(async (s, m) => { gesehen.push(m.length); return { text: "ok" }; },
      { id: "X", session: "solo", eingaben: ["a", "b"] });
    expect(gesehen).toEqual([1, 3]);
  });
});

function synthetisch(laeufe = ["A", "B", "C", "D"], n = 2, seed = 1) {
  const z = zufallsquelle(seed), v = new Set(), antworten = [];
  for (const s of DUKTUS_SET) for (const l of laeufe) for (let i = 1; i <= n; i++)
    antworten.push({ kennung: neueKennung(z, v), situation: s.id, lauf: l, sample: i, text: `Antwort ${i} zu ${s.id}` });
  return { antworten, paare: bildePaare(antworten, { zufall: z }) };
}

describe("BV3 · Paare und Trennung", () => {
  it("4 Läufe → 72 Paare, jedes Laufpaar 12×, je Situation 6", () => {
    const { antworten, paare } = synthetisch();
    expect(paare).toHaveLength(72);
    const lauf = Object.fromEntries(antworten.map(a => [a.kennung, a.lauf]));
    const zaehl = {};
    for (const p of paare) { const k = [lauf[p.links], lauf[p.rechts]].sort().join("|"); zaehl[k] = (zaehl[k] || 0) + 1; }
    expect(Object.values(zaehl)).toEqual(Array(6).fill(12));
    for (const s of DUKTUS_SET) expect(paare.filter(p => p.situation === s.id)).toHaveLength(6);
  });
  it("Samples rotieren (jedes Sample tritt an), links/rechts annähernd ausgeglichen", () => {
    const { antworten, paare } = synthetisch();
    const benutzt = new Set(paare.flatMap(p => [p.links, p.rechts]));
    expect(benutzt.size).toBe(antworten.length);
    const lauf = Object.fromEntries(antworten.map(a => [a.kennung, a.lauf]));
    const links = paare.filter(p => lauf[p.links] === "A").length, gesamt = paare.filter(p => [lauf[p.links], lauf[p.rechts]].includes("A")).length;
    expect(links / gesamt).toBeGreaterThan(0.25);
    expect(links / gesamt).toBeLessThan(0.75);
  });
  it("Reize verraten keinen Lauf; Schlüssel deckt alle Kennungen", () => {
    const { antworten, paare } = synthetisch(["Lauf-Alpha", "Lauf-Beta"]);
    const { reize, schluessel } = trenne({ situationen: DUKTUS_SET, antworten, paare });
    expect(JSON.stringify(reize)).not.toMatch(/Lauf-Alpha|Lauf-Beta|"lauf"|"sample"/);
    for (const p of reize.paare) for (const k of [p.links, p.rechts]) {
      expect(reize.antworten[k]).toBeTruthy(); expect(schluessel.kennungen[k]).toBeTruthy();
    }
  });
  it("Ausfall: fehlt einem Lauf eine Situation, entstehen dort weniger Paare — keine Lücke im Paar", () => {
    const { antworten } = synthetisch(["A", "B", "C"]);
    const ohne = antworten.filter(a => !(a.lauf === "C" && a.situation === "BV-01"));
    const paare = bildePaare(ohne, { zufall: zufallsquelle(3) });
    expect(paare.filter(p => p.situation === "BV-01")).toHaveLength(1);
  });
});

describe("BV5 · Auswertung", () => {
  const urteileMit = (reize, schluessel, sieger, gleichBei = null) => reize.paare.map(p => {
    const L = schluessel.kennungen[p.links].lauf, R = schluessel.kennungen[p.rechts].lauf;
    if (gleichBei && [L, R].sort().join("|") === gleichBei) return { paar: p.paar, wahl: "gleich" };
    const s = sieger(L, R);
    return { paar: p.paar, wahl: s === L ? "links" : "rechts", merkmale: { [s === L ? "links" : "rechts"]: ["warm"] } };
  });
  const ORDNUNG = { B: 4, C: 3, D: 2, A: 1 };

  it("bekannte Rangfolge kommt heraus (Quote, Bradley-Terry)", () => {
    const { antworten, paare } = synthetisch();
    const { reize, schluessel } = trenne({ situationen: DUKTUS_SET, antworten, paare });
    const a = werteAus(urteileMit(reize, schluessel, (L, R) => ORDNUNG[L] > ORDNUNG[R] ? L : R), reize, schluessel);
    expect(a.gezaehlt).toBe(72);
    expect(a.jeLauf.B.quote).toBe(1);
    expect(a.jeLauf.A.quote).toBe(0);
    expect(a.jeLauf.C.quote).toBeCloseTo(2 / 3);
    const st = a.staerke;
    expect(st.B).toBeGreaterThan(st.C); expect(st.C).toBeGreaterThan(st.D); expect(st.D).toBeGreaterThan(st.A);
    expect(a.merkmale.B.warm).toBe(36);
  });
  it("Unentschieden zählt ½ für beide", () => {
    const { antworten, paare } = synthetisch(["B", "C"]);
    const { reize, schluessel } = trenne({ situationen: DUKTUS_SET, antworten, paare });
    const a = werteAus(urteileMit(reize, schluessel, () => null, "B|C"), reize, schluessel);
    expect(a.jeLauf.B.quote).toBe(0.5);
    expect(a.paarweise["B|C"].gleich).toBe(12);
  });
  it("fremde Paar-IDs zählen nicht, ungültige Wahl auch nicht", () => {
    const { antworten, paare } = synthetisch(["B", "C"]);
    const { reize, schluessel } = trenne({ situationen: DUKTUS_SET, antworten, paare });
    const a = werteAus([{ paar: "gibtsnicht", wahl: "links" }, { paar: reize.paare[0].paar, wahl: "egal" }], reize, schluessel);
    expect(a).toMatchObject({ gezaehlt: 0, unbekannt: 2 });
  });
  it("Lesart nach Sprintplan", () => {
    expect(lesart(0.5)).toBe("kommt ran"); expect(lesart(0.4)).toBe("hörbar schwächer"); expect(lesart(0.2)).toBe("kein Ersatz");
  });
  it("Bericht nennt Modelle erst über den Schlüssel", () => {
    const { antworten, paare } = synthetisch(["B", "C"]);
    const { reize, schluessel } = trenne({ situationen: DUKTUS_SET, antworten, paare });
    schluessel.laeufe = { B: { modell: "modell-b" }, C: { modell: "modell-c" } };
    const { text } = bericht(urteileMit(reize, schluessel, (L) => L), reize, schluessel);
    expect(text).toContain("modell-b"); expect(text).toMatch(/Direkte Paare/);
  });
  it("Bradley-Terry ohne Daten: leer", () => { expect(bradleyTerry([])).toEqual({}); });
});

describe("BV3 · Skript", () => {
  it("Adapter-Konfiguration je Lauf wie im Runner (Denkmodus / Denkaufwand / Deckel)", () => {
    const env = { ANTHROPIC_API_KEY: "a", MISTRAL_API_KEY: "m" };
    expect(cfgFuerLauf({ kennung: "C", provider: "anthropic", modell: "x", denkmodus: "aus" }, env, null))
      .toMatchObject({ thinking: "disabled", cache: true });
    expect(cfgFuerLauf({ kennung: "D", provider: "mistral", modell: "y", denkaufwand: "low", maxTokens: 16384 }, env, null))
      .toMatchObject({ reasoningEffort: "low", maxTokens: 16384 });
    expect(() => cfgFuerLauf({ kennung: "D", provider: "mistral", modell: "y" }, {}, null)).toThrow(/MISTRAL_API_KEY/);
  });
  it("Trockenlauf: 96 Antworten, 72 Paare, alle Läufe genannt", () => {
    const r = spawnSync("node", ["scripts/blindvergleich.js", "--trocken"], { cwd: ROOT, encoding: "utf8", env: { PATH: process.env.PATH } });
    expect(r.status, r.stderr).toBe(0);
    expect(r.stdout).toContain("= 96 Antworten");
    expect(r.stdout).toContain("12 × 6 = 72");
  });
  it("--nur mit einem Lauf wird abgelehnt (Vergleich braucht zwei)", () => {
    const r = spawnSync("node", ["scripts/blindvergleich.js", "--trocken", "--nur", "B"], { cwd: ROOT, encoding: "utf8", env: { PATH: process.env.PATH } });
    expect(r.status).toBe(2);
  });
});

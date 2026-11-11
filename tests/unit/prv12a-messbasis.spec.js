// PRV-12a · Messbasis: Phasen und Karten werten nur Worte der Person (C12, C23);
// der Eval baut seinen Kontext mit den Funktionen der App (P13).
import { describe, it, expect } from "vitest";
import { phaseSolo, phaseMoment, trenneNutzer } from "../../core/policies/phasen.js";
import { baueKartenSchaerfung } from "../../core/engine/karten-waechter.js";
import { SIGNALE as S_DE } from "../../core/korpus/de/signale.js";
import { baueSoloKontext, baueMomentKontext } from "../../core/ui/sessions.js";
import { baueSessionDef, mitKorpusSprache } from "../../core/komposition.js";
import { spieleSample, sysBloeckeFuer } from "../../evals/runner-kern.js";
import { appKontextFuer, appStartNachrichten } from "../../evals/app-kontext.js";
import { baueJudgeUser } from "../../evals/judge/judge.js";
import * as katDe from "../../evals/szenarien/start-katalog.js";
import * as katEn from "../../evals/szenarien/start-katalog.en.js";

const liste = m => Object.values(m).find(Array.isArray);
const ALLE = [...liste(katDe), ...liste(katEn)];
const u = (content, extra = {}) => ({ role: "user", content, ...extra });
const a = content => ({ role: "assistant", content });
const P = { teilen: S_DE.teilen, abruf: S_DE.abruf, ende: S_DE.ende };

const ZIELE = { items: [{ id: "AG1", art: "shared", status: "active", text: "Ein fester gemeinsamer Abend pro Woche" }] };
const KONTEXT = baueSoloKontext({ goals: ZIELE, sharings: [{ name: "Bernd", items: [{ text: "Ein Teil von mir will ihr das sagen und zeigen, neulich schon." }] }] });

describe("C12 · phaseSolo liest die Person, nicht den Kontext", () => {
  it("der Befund: der echte COMPANION-CONTEXT trägt die Signalwörter", () => {
    expect(KONTEXT).toContain("(shared, active)");
    expect(S_DE.teilen.test(KONTEXT), "sonst prüft dieser Test nichts").toBe(true);
  });

  it("versteckter Kontext mit »(shared, active)« lädt weder Teilen noch Abruf", () => {
    const ms = [u(KONTEXT, { hidden: true }), u("Beginne.", { hidden: true }), a("Willkommen."), u("Heute war ein zäher Tag im Büro.")];
    expect(phaseSolo(ms, P)).toEqual({ einstieg: false, teilen: false, abruf: false });
  });

  it("dieselben Worte von der Person selbst laden das Modul weiterhin (und es klebt)", () => {
    const ms = [u(KONTEXT, { hidden: true }), a("Willkommen."), u("Ich würde ihm das gern sagen."), a("Mhm."), u("Vielleicht.")];
    expect(phaseSolo(ms, P).teilen).toBe(true);
  });

  it("Abschluss über den Steuertext der App lädt Teilen — versteckt (App) wie als Klammer-Eingabe (Eval) — und klebt", () => {
    for (const close of [u("[CLOSE SESSION]", { hidden: true }), u("[CLOSE SESSION] Bitte schließe ab.")]) {
      const ms = [a("Willkommen."), u("Zäher Tag."), a("Erzähl."), close, a("Magst du etwas davon teilen?"), u("Nein.")];
      expect(phaseSolo(ms, P).teilen).toBe(true);
    }
  });

  it("RECALL-RESULT (Wire, versteckt) lädt den Abruf weiterhin", () => {
    const ms = [a("Ich schaue nach."), u("RECALL-RESULT: …", { hidden: true })];
    expect(phaseSolo(ms, P).abruf).toBe(true);
  });

  it("trenneNutzer: versteckt, Wire und Klammerzeile sind Steuerung; alles andere Person", () => {
    const { person, steuer } = trenneNutzer([u("K", { hidden: true }), u("SLIDERS-RESULT: Anna=4"), u("[Weiter mit Kapitel 2.]"), u("Ich bin müde."), a("x"), null]);
    expect(person).toEqual(["Ich bin müde."]);
    expect(steuer).toHaveLength(3);
  });

  it("Prompt-Masse: Reflexionsgespräch in der Mitte OHNE Teilen-Modul — mit einem gemeinsamen Auftrag im Kontext", () => {
    const def = baueSessionDef("solo", {});
    const ctx = { me: "Anna", partner: "Bernd", nameA: "Anna", nameB: "Bernd" };
    const mitte = [u(KONTEXT, { hidden: true }), u("Beginne.", { hidden: true }), a("Willkommen."), u("Heute war ein zäher Tag.")];
    const b = def.sysBloecke(ctx, mitte);
    const mitTeilen = def.sysBloecke(ctx, [...mitte, a("Mhm."), u("Ich würde ihm das gern sagen.")]);
    const laenge = x => x.join("").length;
    expect(b).toHaveLength(1);                                  // nur der Kern
    expect(laenge(mitTeilen) - laenge(b)).toBeGreaterThan(8000); // das Modul, das vorher immer mitkam
  });
});

describe("C12 · phaseMoment: End-Signale nur von der Person", () => {
  const MK = baueMomentKontext({ sharings: [{ name: "Bernd", items: [{ text: "Danke dir, dass du geblieben bist. Für heute reicht es mir." }] }] }, "Anna", "Bernd");
  it("freigegebener Text im MOMENT-CONTEXT schließt die Sitzung nicht ab", () => {
    expect(S_DE.ende.test(MK)).toBe(true);
    expect(phaseMoment([u(MK, { hidden: true }), a("Willkommen."), u("Anna: Wir sind da.")], P).abschluss).toBe(false);
  });
  it("die Person selbst oder der Steuertext tun es", () => {
    expect(phaseMoment([a("x"), u("Bernd: Für heute reicht es mir.")], P).abschluss).toBe(true);
    expect(phaseMoment([a("x"), u("[CLOSE MOMENT]", { hidden: true }), a("y"), u("Anna: ja")], P).abschluss).toBe(true);
  });
});

describe("C23 · Karten: Anlass nur aus Worten der Person", () => {
  const karte = baueKartenSchaerfung({ signal: S_DE.anteile, spur: S_DE.anteileSpur, text: "[KARTE]" });
  it("Bernds freigegebener Satz im Kontext gibt Anna keine Karte", () => {
    expect(S_DE.anteile.test(KONTEXT)).toBe(true);
    expect(karte([u(KONTEXT, { hidden: true }), a("Willkommen."), u("Heute war ein zäher Tag.")])).toBeNull();
  });
  it("Annas eigener Satz schon — und die Spur in der letzten Antwort auch", () => {
    expect(karte([u(KONTEXT, { hidden: true }), a("Willkommen."), u("Ein Teil von mir will einfach weg.")])).toBe("[KARTE]");
    expect(karte([a("Da ist ein Teil von dir, der …"), u("Ja.")])).toBe("[KARTE]");
  });
});

describe("P13 · Eval-Kontext aus den App-Funktionen", () => {
  const mitApp = ALLE.filter(s => s.app);

  it("solo und moment tragen keinen handgeschriebenen COMPANION-/MOMENT-CONTEXT mehr", () => {
    const hand = ALLE.filter(s => ["solo", "moment"].includes(s.session) && /COMPANION-CONTEXT|MOMENT-CONTEXT/.test(String(s.zusatzKontext || "")));
    expect(hand.map(s => s.id)).toEqual([]);
    expect(mitApp.length).toBeGreaterThanOrEqual(20);
    for (const s of mitApp) expect(s.zusatzKontext, s.id + ": app UND zusatzKontext").toBeUndefined();
  });

  it("jedes Szenario mit `app` hat seinen Zwilling in der anderen Sprache — mit denselben Datenfeldern", () => {
    const de = mitApp.filter(s => s.sprache !== "en"), en = mitApp.filter(s => s.sprache === "en");
    expect(en.map(s => s.id.replace(/-EN$/, "")).sort()).toEqual(de.map(s => s.id).sort());
    for (const s of de) {
      const z = en.find(e => e.id === s.id + "-EN");
      expect(Object.keys(z.app).sort(), s.id).toEqual(Object.keys(s.app).sort());
    }
  });

  it("der Text ist der der App: Kopf, GOALS in App-Form, keine Reste des Handtexts", () => {
    for (const s of mitApp) {
      const text = appKontextFuer(s);
      expect(text, s.id).toBeTruthy();
      expect(text, s.id).not.toMatch(/\(Auszug\)|\(excerpt\)|ZIELE:|bestätigt\)|confirmed\)|Reading accuracy|empathy signal|undefined|NaN/);
      if (s.app.goals) expect(text, s.id).toContain("- AG1 (shared, active): ");
    }
  });

  it("solo ohne Daten → Erstkontakt-Satz, wie app.js (S129); moment ohne Daten → leerer MOMENT-CONTEXT", () => {
    const ero = mitApp.find(s => s.id === "ERO-03"), mrv = mitApp.find(s => s.id === "MRV-02");
    mitKorpusSprache("de", () => {});
    expect(appKontextFuer(ero)).toMatch(/noch keinen Kontext/);
    expect(appKontextFuer(mrv)).toMatch(/^MOMENT-CONTEXT/);
    expect(appKontextFuer({ id: "X", session: "solo" })).toBeNull();
    expect(() => appKontextFuer({ id: "X", session: "einzel", app: {} })).toThrow(/solo und moment/);
  });

  it("Messrunde: bereite Runde wird aufgedeckt, aufgedeckte Runden stehen im Verlauf — Texte aus dem Korpus", () => {
    const text = appKontextFuer(mitApp.find(s => s.id === "MRV-03"));
    expect(text).toMatch(/Beziehungswesen: Anna 6 · Bernd 7 ⇒ Abstand 1/);
    expect(text).toMatch(/- 2026-05-01, vor 3 Monaten: Beziehungswesen Anna 3 · Bernd 7 \(Abstand 4\)/);   // CR-4.3, festes Eval-Heute
    expect(text).toMatch(/Wirksamkeit je Thema: AG1: Anna 5 · Bernd 6/);
  });

  it("im Lauf: Kontext ist die versteckte erste Nachricht, geht ans Modell, nicht an den Judge, nicht in den Systemtext", async () => {
    const s = mitApp.find(x => x.id === "MRV-04");
    const gesehen = [];
    const pipeline = async (system, verlauf) => { gesehen.push({ system, verlauf }); return { text: "Mhm." }; };
    const transkript = await spieleSample(pipeline, s);
    expect(transkript[0]).toMatchObject({ role: "user", hidden: true });
    expect(transkript[0].content).toContain("(shared, active)");
    expect(gesehen[0].verlauf[0].content).toBe(transkript[0].content);
    expect([].concat(gesehen[0].system).join("")).not.toContain("COMPANION-CONTEXT (app-intern");
    expect(baueJudgeUser(s, transkript)).not.toContain("(shared, active)");
    expect(appStartNachrichten({ id: "X", session: "solo" })).toEqual([]);
  });

  it("und genau dieser Kontext lädt im Eval das Teilen-Modul nicht mehr (Eval = Betrieb)", () => {
    const s = mitApp.find(x => x.id === "MRV-04");
    const ms = [...appStartNachrichten(s), u(s.eingaben[0])];
    const ohne = sysBloeckeFuer({ ...s, app: undefined }, [u(s.eingaben[0])]);
    expect(sysBloeckeFuer(s, ms).join("").length).toBe(ohne.join("").length);
  });
});

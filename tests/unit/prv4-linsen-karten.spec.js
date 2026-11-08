// PRV-4 · Theorie-Linsen als Karte im Zug-Hinweis.
import { describe, it, expect } from "vitest";
import { SIGNALE as SD } from "../../core/korpus/de/signale.js";
import { SIGNALE as SE } from "../../core/korpus/en/signale.js";
import { baueKartenSchaerfung, FENSTER } from "../../core/engine/karten-waechter.js";
import { baueSessionDef } from "../../core/komposition.js";
import { Engine } from "../../core/engine/engine.js";
import { waechter as WD } from "../../core/korpus/de/policies.js";
import { spieleSample, echoImText } from "../../evals/runner-kern.js";
import { SZENARIEN } from "../../evals/szenarien/start-katalog.js";

const u = c => ({ role: "user", content: c });
const a = c => ({ role: "assistant", content: c });

describe("PRV-4 · Signale (DE ∪ EN, in beiden Dateien gleich)", () => {
  it("de und en tragen dieselben Regexe", () => {
    for (const k of ["anteile", "anteileSpur", "entwicklung", "entwicklungSpur"]) expect(String(SE[k])).toBe(String(SD[k]));
  });
  const treffer = {
    anteile: ["Ein Teil von mir will gehen, ein anderer will bleiben.", "Ich bin total hin- und hergerissen.",
      "Da spricht wieder dein ängstlicher Anteil, Bernd.", "Ich hasse ihn gerade.", "Part of me wants to leave.",
      "I'm torn between staying and going.", "That's your avoidant part talking."],
    entwicklung: ["Früher fand ich genau seine Spontaneität toll, jetzt nervt sie mich nur noch.",
      "Das hat mich anfangs so fasziniert an ihm.", "I used to love how spontaneous he was.", "What first attracted me was his calm."],
  };
  const kein = {
    anteile: ["Was ist eigentlich mein Anteil daran?", "Wir haben die Kosten geteilt.", "Ich teile das gern mit dir.",
      "I want to take part in this.", "Er nimmt nie Anteil an meinem Tag."],
    entwicklung: ["Früher war alles besser.", "Ich fand den Film toll.", "I used to go running."],
  };
  for (const k of Object.keys(treffer)) {
    for (const t of treffer[k]) it(k + " trifft: " + t, () => expect(SD[k].test(t)).toBe(true));
    for (const t of kein[k]) it(k + " trifft nicht: " + t, () => expect(SD[k].test(t)).toBe(false));
  }
  it("Spur: die eigene Anteile-Frage nach dem Beitrag zum Konflikt ist keine Spur", () => {
    expect(SD.anteileSpur.test("Was meinst du, was dein Anteil am Streit war?")).toBe(false);
    expect(SD.anteileSpur.test("Ein Teil von dir scheint gehen zu wollen – nehme ich das richtig wahr?")).toBe(true);
  });
});

describe("PRV-4 · Karte klebt, aber nicht ewig", () => {
  const k = baueKartenSchaerfung({ signal: /teil von mir/i, spur: /teil von dir/i, text: "[KARTE]" });
  it("Signal in der letzten Nachricht", () => expect(k([u("Ein Teil von mir will weg.")])).toBe("[KARTE]"));
  it("Signal hält über das Fenster", () => {
    const v = [u("Ein Teil von mir will weg."), a("x"), u("hm"), a("y"), u("ja")];
    expect(FENSTER).toBe(3);
    expect(k(v)).toBe("[KARTE]");
    expect(k([...v, a("z"), u("weiter")])).toBeNull();
  });
  it("Spur der eigenen letzten Antwort hält die Karte", () => {
    expect(k([u("lange her"), a("x"), u("a"), a("b"), u("c"), a("Ein Teil von dir möchte …?"), u("Ja, genau.")])).toBe("[KARTE]");
  });
  it("ohne Anlass: nichts", () => expect(k([u("Wie war dein Tag?")])).toBeNull());
});

describe("PRV-4 · Kette und Engine", () => {
  it("solo: Karte kommt als Regie, Systemtext je Zug gleich, Verlauf sauber", async () => {
    const def = baueSessionDef("solo");
    const gesehen = [];
    const llm = async (system, msgs) => { gesehen.push({ system, regie: msgs.at(-1).regie || null }); return { text: "Ich höre dich.", stop: "end_turn" }; };
    const e = new Engine({ def, chat: { messages: [], status: "running" }, llm, ctx: { name: "Anna", partner: "Bernd" } });
    await e.sendUser("Wie war dein Tag?");
    await e.sendUser("Ein Teil von mir will gehen, ein anderer will bleiben.");
    expect(gesehen[0].regie).toBeNull();
    expect(gesehen[1].regie).toBe(WD.anteile.text);
    expect(gesehen[0].system).toBe(gesehen[1].system);
    expect(JSON.stringify(e.chat.messages)).not.toContain("APP-KARTE");
  });
  it("moment: Krise geht der Karte vor", () => {
    const s = baueSessionDef("moment").schaerfe;
    const z = s([u("Anna: Ein Teil von mir will nicht mehr leben.")], {});
    expect(z).toMatch(/Krise/);
    expect(z).not.toMatch(/APP-KARTE/);
  });
  it("nie zwei Karten im selben Zug: Anteile vor Entwicklung", () => {
    const s = baueSessionDef("solo").schaerfe;
    const z = s([u("Früher fand ich das toll an ihm, und ein Teil von mir findet es immer noch schön.")], {});
    expect(z).toBe(WD.anteile.text);
  });
});

describe("PRV-4 · A/B im Eval-Kern und Echo", () => {
  const spiele = async opt => {
    const sz = SZENARIEN.find(s => s.id === "ENT-01");
    const c = [];
    await spieleSample(async (system, msgs) => { c.push({ system, regie: msgs.at(-1).regie || null }); return { text: "Ich höre dich." }; }, sz, { waechter: true, ...opt });
    return c;
  };
  it("Karten: Volltext nur in der Regie, Systemtext ohne Volltext", async () => {
    const c = await spiele({});
    expect(c.every(x => /APP-KARTE/.test(x.regie || ""))).toBe(true);
    expect(c[0].system).not.toContain("ENTWICKLUNGSRAUM-PERSPEKTIVE (nach P. Schellenbaum)");
  });
  it("voll: Volltexte im Systemtext, keine Karte", async () => {
    const c = await spiele({ linsenVoll: true });
    expect(c.every(x => x.regie === null)).toBe(true);
    expect(c[0].system).toContain("ENTWICKLUNGSRAUM-PERSPEKTIVE (nach P. Schellenbaum)");
    expect(c[0].system).toContain("ANTEILE-SPRACHE (IFS-informiert)");
  });
  it("Echo-Wächter kennt die Karte", () => {
    expect(echoImText("[APP-KARTE für diesen Zug: …]").map(x => x.name)).toContain("App-Karte-Echo");
    expect(echoImText("[APP CARD for this turn: …]").map(x => x.name)).toContain("App-Karte-Echo");
  });
});

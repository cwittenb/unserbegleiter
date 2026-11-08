// MOD-1 · Composition Root — eine Stelle, zwei Aufrufer.
//
// core/komposition.js ist seit MOD-1 der einzige Ort, der aus einer Session-Art
// eine Def macht. App (app.js) und Eval (runner-kern.js, struktur-bruecke.js)
// rufen ihn; keiner setzt mehr selbst zusammen. Dieser Test haelt fest:
//   1. Jede Art baut; eine unbekannte Art ist laut.
//   2. Die Sprachbindung: Eine Def mit `sprache` liest den Korpus dieser
//      Sprache — und laesst den globalen Schnappschuss unberuehrt, auch wenn
//      die gebundene Funktion wirft.
//   3. Der Eval-Runner misst, was die App baut: Systemtext, Schaerfung,
//      Uebergabe-Pruefung und markerOrder sind je Art deckungsgleich.
//   4. Kanarie: Ausserhalb der Komposition ruft niemand die Def-Fabriken.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { baueSessionDef, baueSystemText, mitKorpusSprache, markerOrderFuer, SESSION_ARTEN, BACKEND_ATTRAPPE } from "../../core/komposition.js";
import { getKorpusSprache, setKorpusSprache } from "../../core/prompts/prompts.js";
import { sysPromptFuer, schaerfungFuer, uebergabeFuer, markerOrderFuer as runnerMarkerOrder } from "../../evals/runner-kern.js";
import { waechter } from "../../core/prompts/prompts.de.js";
const KRISEN_SCHAERFUNG = waechter.krise.text;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CTX = { me: "Anna", partner: "Bernd", nameA: "Anna", nameB: "Bernd" };

describe("MOD-1 · baueSessionDef", () => {
  it("baut jede Art mit sysPrompt, canAct und markerOrder", () => {
    for (const art of SESSION_ARTEN) {
      const def = baueSessionDef(art);
      expect(def.id, art).toBe(art);
      expect(typeof def.sysPrompt, art).toBe("function");
      expect(typeof def.canAct, art).toBe("function");
      expect(Array.isArray(def.markerOrder), art).toBe(true);
      expect(def.sysPrompt(CTX).length, art).toBeGreaterThan(1000);
    }
  });
  it("eine unbekannte Art ist laut", () => {
    expect(() => baueSessionDef("qualitytime")).toThrow(/Unbekannte Session-Art/);
    expect(() => baueSessionDef("")).toThrow(/Unbekannte Session-Art/);
  });
  it("ohne Sprache: Def unveraendert durchgereicht, Backend und Hooks landen in der Def", () => {
    const hooks = { onZeitleiste: () => {} };
    const def = baueSessionDef("solo", { backend: BACKEND_ATTRAPPE, hooks });
    expect(def.sysPrompt(CTX)).toContain("Anna");
    expect(def.titel).toBeTypeOf("string");
  });
});

describe("MOD-1 · Sprachbindung", () => {
  it("sprache:'en' liest den EN-Korpus, der globale Schnappschuss bleibt 'de'", () => {
    setKorpusSprache("de");
    const en = baueSessionDef("solo", { sprache: "en" });
    const text = en.sysPrompt(CTX);
    expect(text).toContain("You respond exclusively in English");
    expect(text).not.toContain("Du antwortest ausschließlich auf Deutsch");
    expect(getKorpusSprache()).toBe("de");
    // und der ungebundene Pfad ist weiter Deutsch
    expect(baueSessionDef("solo").sysPrompt(CTX)).toContain("Du antwortest ausschließlich auf Deutsch");
  });
  it("mitKorpusSprache stellt die Sprache auch nach einem Fehler wieder her", () => {
    setKorpusSprache("de");
    expect(() => mitKorpusSprache("en", () => { throw new Error("boom"); })).toThrow("boom");
    expect(getKorpusSprache()).toBe("de");
  });
  it("ein nicht registrierter Korpus ist laut statt still Deutsch", () => {
    expect(() => mitKorpusSprache("fr", () => "x")).toThrow(/nicht registriert/);
  });
  it("baueSystemText kennt qualitytime (Menue-Generator ohne Def) in beiden Sprachen", () => {
    const de = baueSystemText("qualitytime", {}, { sprache: "de" });
    const en = baueSystemText("qualitytime", {}, { sprache: "en" });
    expect(de.length).toBeGreaterThan(500);
    expect(en.length).toBeGreaterThan(500);
    expect(de).not.toBe(en);
  });
});

describe("MOD-1 · Der Eval misst, was die App baut", () => {
  const SZ = (session, sprache = "de") => ({ id: "t-" + session, session, sprache, kontext: CTX, eingaben: [] });

  it("Systemtext: sysPromptFuer ≡ baueSessionDef(...).sysPrompt — je Art, je Sprache", () => {
    for (const sprache of ["de", "en"]) {
      for (const art of SESSION_ARTEN) {
        setKorpusSprache(sprache);
        const app = baueSessionDef(art).sysPrompt(CTX);
        setKorpusSprache("de");
        expect(sysPromptFuer(SZ(art, sprache)), art + "/" + sprache).toBe(app);
      }
    }
  });
  it("solo und moment tragen im Eval jetzt den Themenrahmen (E6 a)", () => {
    const solo = sysPromptFuer(SZ("solo"));
    const moment = sysPromptFuer(SZ("moment"));
    const einzel = sysPromptFuer(SZ("einzel"));
    // Der Themenrahmen ist das Suffix der App-Defs (sessions.js); einzel hat ihn nicht.
    const suffix = solo.slice(-200);
    expect(moment.endsWith(suffix)).toBe(true);
    expect(einzel.endsWith(suffix)).toBe(false);
  });
  it("Schaerfung: dieselbe Zuordnung wie die Def (moment/gemeinsam ja, solo/einzel nein) und derselbe Text", () => {
    const krise = [{ role: "user", content: "Ich will nicht mehr leben." }];
    // PRV-4: solo/einzel haben eine Kette (nur Theorie-Karten) — keine Krisen-Schärfung.
    expect(schaerfungFuer(SZ("solo"))(krise, {})).toBeNull();
    expect(schaerfungFuer(SZ("einzel"))(krise, {})).toBeNull();
    for (const art of ["moment", "gemeinsam"]) {
      const runner = schaerfungFuer(SZ(art));
      const app = baueSessionDef(art).schaerfe;
      expect(typeof runner, art).toBe("function");
      expect(runner(krise, {}), art).toBe(app(krise, {}));
      expect(runner(krise, {}), art).toBe(KRISEN_SCHAERFUNG);
    }
  });
  it("Uebergabe: Runner-Pruefung liefert denselben Grund wie die Def mit Engine-Signatur", () => {
    const messages = [
      { role: "user", content: "[CLOSE SESSION]" },
    ];
    const antwort = "Magst du das behalten, oder soll etwas Bernd erreichen?\nTIMELINE-BLOCK\n{\"summary\":\"x\",\"topics\":[],\"recurrenceNote\":null,\"goals\":[]}\nEND TIMELINE-BLOCK";
    const runner = uebergabeFuer(SZ("solo"));
    const def = baueSessionDef("solo");
    const grund = runner(antwort, messages);
    expect(grund).toBe("abschluss-mit-frage");
    expect(grund).toBe(def.pruefeUebergabe(antwort, { chat: { messages } }));
    expect(uebergabeFuer(SZ("einzel"))).toBeNull();
    expect(uebergabeFuer(SZ("qualitytime"))).toBeNull();
  });
  it("markerOrder: aus der Def, nicht aus einer Kopie", () => {
    for (const art of SESSION_ARTEN)
      expect(runnerMarkerOrder(SZ(art)), art).toEqual(baueSessionDef(art).markerOrder);
    expect(markerOrderFuer("qualitytime")).toEqual([]);
    expect(runnerMarkerOrder(SZ("qualitytime"))).toEqual([]);
  });
});

describe("MOD-1 · Kanarie: Def-Fabriken werden nur in der Komposition aufgerufen", () => {
  const FABRIKEN = /\b(soloDef|momentDef|einzelDef|gemeinsamDef)\s*\(/;
  for (const datei of ["core/ui/app.js", "evals/runner-kern.js", "evals/runner-batch.js", "evals/struktur-bruecke.js", "scripts/golden-prompts.js"]) {
    it(datei + " ruft keine Def-Fabrik direkt", () => {
      const quelle = readFileSync(path.join(ROOT, datei), "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:\\])\/\/[^\n]*/g, "$1");
      expect(quelle).not.toMatch(FABRIKEN);
    });
  }
});

// S96.4 · Mockdaten für den Dialogausschnitt.
//
// Die Testumgebung soll den ECHTEN Zustandsraum abbilden, nicht einen
// bequemen. Für den Ausschnitt heisst das dreierlei: ein Verlauf, aus dem
// Paare entstehen; ein Verletzer darin, damit die stumme Darstellung und die
// Auslassung überhaupt vorkommen; und eine Freigabe in der Karenz, damit
// Redaktion und Rücknahme sichtbar sind.

import { describe, it, expect } from "vitest";
import { baueMockdaten, baueSoloChat, MOCK_META, SZENEN } from "../../platforms/artifact/dev-panel.js";
import { paareAusVerlauf, baueAusschnitt } from "../../core/engine/ausschnitt.js";
import { redigiereRegalFuerRolle, inKarenz } from "../../core/engine/regal.js";

const bstate = m => m.shared["p:PBDEV:" + m.meta.code + ":betrieb:bstate"];
const soloKey = m => "p:PBDEV:" + m.meta.code + ":betrieb:chat:A:solo";

describe("S96.4 · Solo-Verlauf", () => {
  it("liegt bei Anna und ist eine laufende Session", () => {
    const m = baueMockdaten();
    const chat = m.privat[soloKey(m)];
    expect(chat).toBeTruthy();
    expect(chat.status).toBe("running");   // sonst würde sie beim Öffnen verworfen
  });

  it("liefert genug Paare, um die Auswahl anzufassen", () => {
    const paare = paareAusVerlauf(baueSoloChat(MOCK_META).messages);
    expect(paare.length).toBeGreaterThanOrEqual(5);
    expect(paare[0].frage.text).toContain("Was beschäftigt dich");
  });

  it("enthält einen Zug, der die Kriterien reisst", () => {
    // Ohne Verletzer bliebe die stumme Darstellung ungeprüft — und die
    // Auslassung „…" käme im Mock nie vor.
    const paare = paareAusVerlauf(baueSoloChat(MOCK_META).messages);
    expect(paare.some(p => /\bnie\b|egal/.test(p.antwort.text))).toBe(true);
  });

  it("die Eröffnung ist verborgen und bildet kein Paar", () => {
    const chat = baueSoloChat(MOCK_META);
    expect(chat.messages[0].hidden).toBe(true);
    expect(paareAusVerlauf(chat.messages).length).toBe((chat.messages.length - 1) / 2);
  });
});

describe("S96.4 · Regal-Material", () => {
  it("trägt die seit S95.3b geführten Felder — sonst greift weder Redaktion noch Rücknahme", () => {
    for (const i of bstate(baueMockdaten()).shelf.items) {
      expect(i.role, i.id).toBeTruthy();
      expect(i.freigabe, i.id).toBeTruthy();
      expect(i.kind, i.id).toBeTruthy();
    }
  });

  it("enthält einen lesbaren Ausschnitt mit Auslassung", () => {
    const a = bstate(baueMockdaten()).shelf.items.find(i => i.id === "RG2");
    expect(a.kind).toBe("excerpt");
    expect(a.pairs).toHaveLength(3);
    expect(a.pairs.filter(p => p.gapBefore)).toHaveLength(1);
    expect(a.pairs[0].gapBefore).toBe(false);      // vor dem ersten nie
    expect(a.frame).toBeTruthy();
  });

  it("enthält eine Freigabe mitten in der Karenz", () => {
    const k = bstate(baueMockdaten()).shelf.items.find(i => i.id === "RG3");
    expect(inKarenz(k)).toBe(true);
    expect(k.role).toBe("A");
  });

  it("der Partner sieht die Karenz-Freigabe nicht, Anna schon (I11)", () => {
    const regal = bstate(baueMockdaten()).shelf;
    const fuerB = redigiereRegalFuerRolle(regal, "B").items.map(i => i.id);
    const fuerA = redigiereRegalFuerRolle(regal, "A").items.map(i => i.id);
    expect(fuerB).not.toContain("RG3");
    expect(fuerA).toContain("RG3");
    expect(fuerB).toContain("RG2");                // der freigegebene bleibt sichtbar
  });

  it("der Ausschnitt im Regal passt zum Verlauf — wörtlich, nicht erfunden", () => {
    // D1: Der Ausschnitt ist Material aus dem Gespräch. Wäre der Mock hier
    // frei erfunden, prüfte die Testumgebung einen unmöglichen Zustand.
    const paare = paareAusVerlauf(baueSoloChat(MOCK_META).messages);
    const texte = new Set(paare.map(p => p.antwort.text));
    for (const pr of bstate(baueMockdaten()).shelf.items.find(i => i.id === "RG2").pairs)
      expect(texte.has(pr.answer), pr.answer.slice(0, 30)).toBe(true);
  });

  it("die ausgelassene Stelle ist genau der Kriterien-Verletzer", () => {
    const a = bstate(baueMockdaten()).shelf.items.find(i => i.id === "RG2");
    const gezeigt = a.pairs.map(p => p.answer).join(" ");
    // Der Verletzer selbst („nimmt sowas nie ernst") ist raus …
    expect(gezeigt).not.toContain("nie ernst");
    // … und genau DAS macht den Ausschnitt wertvoll: Das Wort „egal" kommt
    // trotzdem vor, aber verneint („nicht weil ich ihm egal bin"). Sichtbare
    // Bewegung statt behaupteter — Designnotiz §2. Eine Prüfung auf das blosse
    // Wort wäre deshalb falsch.
    expect(gezeigt).toContain("nicht weil ich ihm egal bin");
  });
});

describe("S96.4 · Szenen", () => {
  it("beide Ausschnitt-Szenen sind anspringbar und eindeutig benannt", () => {
    const ids = SZENEN.map(s => s.id);
    expect(ids).toContain("ausschnitt-auswahl");
    expect(ids).toContain("ausschnitt-gelesen");
    expect(new Set(ids).size).toBe(ids.length);
    for (const s of SZENEN.filter(x => x.id.startsWith("ausschnitt-"))) {
      expect(typeof s.wende).toBe("function");
      expect(s.beschreibung.length).toBeGreaterThan(20);
    }
  });
});

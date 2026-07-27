// S95.7f · Mockdaten mit aufbewahrtem Verlauf.
//
// Ohne diese Fixture blieb alles unsichtbar, was seit S95.7 gebaut wurde: Der
// Lese-Eingang hängt an vid, der Löschweg ebenso, und der Wortlaut-Abruf fände
// nichts. Man hätte die Funktionen nur erleben können, indem man eine echte
// Sitzung komplett durchspielt und abschließt — also genau die Sorte Feature,
// die ausgeliefert wird, ohne dass sie je jemand von Hand gesehen hat.

import { describe, it, expect } from "vitest";
import { baueMockdaten } from "../../platforms/artifact/dev-panel.js";

const mock = baueMockdaten();
const privat = mock.privat || mock;
const pstate = rolle => {
  const k = Object.keys(privat).find(x => x.endsWith("pstate:" + rolle));
  return privat[k];
};
const verlaufSchluessel = rolle =>
  Object.keys(pstate(rolle) || {}).filter(k => k.startsWith("verlauf:"));

describe("S95.7f · A hat einen aufbewahrten Verlauf", () => {
  it("genau einer, unter eigenem Schlüssel", () => {
    expect(verlaufSchluessel("A")).toHaveLength(1);
  });

  it("der Zeitleisten-Eintrag zeigt darauf — sonst gibt es keinen Eingang", () => {
    const eintrag = pstate("A").timeline.entries.find(e => e.vid);
    expect(eintrag).toBeTruthy();
    expect(verlaufSchluessel("A")[0]).toBe("verlauf:" + eintrag.vid);
  });

  it("er trägt lesbares Material", () => {
    const v = pstate("A")[verlaufSchluessel("A")[0]];
    expect(v.messages.length).toBeGreaterThan(2);
    expect(v.messages.some(m => m.role === "assistant" && m.content)).toBe(true);
  });

  it("und eine Eignung — sonst wäre nur das Lesen prüfbar, nicht die Auswahl", () => {
    const v = pstate("A")[verlaufSchluessel("A")[0]];
    expect(v.eignung.pairs.length).toBeGreaterThan(1);
  });

  it("mindestens ein Paar fällt begründet durch", () => {
    const { pairs } = pstate("A")[verlaufSchluessel("A")[0]].eignung;
    const durchgefallen = pairs.filter(p => !p.ownerOk || !p.companionOk);
    expect(durchgefallen.length).toBeGreaterThan(0);
    for (const p of durchgefallen) expect(p.reason, p.id).toBeTruthy();
  });

  it("bestandene Paare tragen KEINE Begründung — Schweigen bei Bestehen", () => {
    const { pairs } = pstate("A")[verlaufSchluessel("A")[0]].eignung;
    for (const p of pairs.filter(p => p.ownerOk && p.companionOk))
      expect(p.reason, p.id).toBeNull();
  });
});

describe("S95.7f · B hat bewusst keinen", () => {
  it("kein Verlauf im privaten Speicher", () => {
    expect(verlaufSchluessel("B")).toHaveLength(0);
  });

  it("und kein vid am Eintrag — der zweite Fall gehört in denselben Datensatz", () => {
    // Er ist der wichtigere: keine ausgegraute Tür, und der Begleiter muss
    // ehrlich sagen, dass dort nichts zu holen ist.
    expect(pstate("B").timeline.entries.every(e => !e.vid)).toBe(true);
  });
});

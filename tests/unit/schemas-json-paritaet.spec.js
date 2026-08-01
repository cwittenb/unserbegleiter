// ST1.1 · Paritäts-Beweis je Block: Was der imperative JS-Validator annimmt,
// erfüllt auch das deklarative JSON-Schema-Pendant — sonst würde der Provider
// Gültiges verhindern, ohne dass die Korrektur-Runde je zum Zug käme.
// (Die Gegenrichtung ist ausdrücklich NICHT gefordert — Rollenteilung, siehe
// schemas-json.js Kopfkommentar.)
//
// Der Mini-Validator deckt genau die hier verwendete Schema-Teilmenge ab:
// type (auch als Liste), object/properties/required/additionalProperties,
// array/items/minItems/maxItems, enum, const, anyOf. Test-Werkzeug, kein
// Produktionscode — die echte Durchsetzung liegt beim Provider.

import { describe, it, expect } from "vitest";
import { SCHEMAS_JSON } from "../../core/contracts/schemas-json.js";
import {
  zeitSchema, momentSchema, auftragBlockSchema, gateArtSchema, ausschnittBlockSchema,
  gateSchema, befundSchema, noteSchema, qzSchema, choiceSchema, aufdeckSchema, abrufBlockSchema,
} from "../../core/contracts/schemas.js";

function typOk(wert, typ) {
  if (Array.isArray(typ)) return typ.some(t => typOk(wert, t));
  switch (typ) {
    case "string": return typeof wert === "string";
    case "number": return typeof wert === "number";
    case "boolean": return typeof wert === "boolean";
    case "null": return wert === null;
    case "array": return Array.isArray(wert);
    case "object": return wert !== null && typeof wert === "object" && !Array.isArray(wert);
    default: return false;
  }
}

export function miniValidiere(schema, wert) {
  const fehler = [];
  const pruefe = (s, w, pfad) => {
    if ("const" in s && w !== s.const) fehler.push(pfad + ": const verletzt");
    if (s.enum && !s.enum.includes(w)) fehler.push(pfad + ": enum verletzt");
    if (s.type && !typOk(w, s.type)) { fehler.push(pfad + ": type " + JSON.stringify(s.type) + " verletzt"); return; }
    if (s.anyOf) {
      const ok = s.anyOf.some(zweig => {
        const vorher = fehler.length;
        pruefe(zweig, w, pfad + "|anyOf");
        const passt = fehler.length === vorher;
        fehler.length = vorher;                          // Zweig-Fehler verwerfen
        return passt;
      });
      if (!ok) fehler.push(pfad + ": kein anyOf-Zweig passt");
    }
    if (typOk(w, "object") && (s.properties || s.required || s.additionalProperties === false)) {
      for (const k of s.required || [])
        if (!(k in w)) fehler.push(pfad + "." + k + ": required fehlt");
      for (const [k, v] of Object.entries(w)) {
        const ps = (s.properties || {})[k];
        if (ps) pruefe(ps, v, pfad + "." + k);
        else if (s.additionalProperties === false) fehler.push(pfad + "." + k + ": additionalProperties verboten");
      }
    }
    if (Array.isArray(w)) {
      if (s.minItems !== undefined && w.length < s.minItems) fehler.push(pfad + ": minItems verletzt");
      if (s.maxItems !== undefined && w.length > s.maxItems) fehler.push(pfad + ": maxItems verletzt");
      if (s.items) w.forEach((x, i) => pruefe(s.items, x, pfad + "[" + i + "]"));
    }
  };
  pruefe(schema, wert, "$");
  return fehler;
}

// Je dataset: JS-Validator + gültige Fixtures (vom JS-Validator angenommen).
const FAELLE = {
  zeit: { js: zeitSchema, gueltig: [
    { summary: "Kurz und ruhig gelandet.", topics: ["Nähe"], recurrenceNote: null },
    { noContent: true },
  ] },
  moment: { js: momentSchema, gueltig: [
    { summary: "Ein warmer Abend.", topics: ["Zeit"], shift: null, gentleInvitation: null },
  ] },
  auftrag: { js: auftragBlockSchema, gueltig: [
    { changes: [{ op: "new", art: "shared", confirmedByBoth: true, text: "Ein fester Abend pro Woche." }] },
    { changes: [{ op: "close", art: "individual", owner: "Anna", ownerConfirmed: true, id: "A1" }] },
  ] },
  gateart: { js: gateArtSchema, gueltig: [
    { wording: "Mir fehlt Zeit mit dir.", wish: null, reasoning: "situativ, eigener Anteil",
      criteria: { characterJudgment: false, generalization: false, situationSpecific: true, ownShare: true } },
  ] },
  ausschnitt: { js: ausschnittBlockSchema, gueltig: [
    { pairs: [
      { id: "P1", ownerOk: true, companionOk: true, reason: null },
      { id: "P2", ownerOk: false, companionOk: true, reason: "generalization in the owner turn" },
    ] },
  ] },
  gate: { js: gateSchema, gueltig: [
    { items: [{ id: "S1", text: "Ich wünsche mir mehr gemeinsame Abende.", tag: "FirstTake" }, { id: "G1", text: "Vermutung." }] },
  ] },
  befund: { js: befundSchema, gueltig: [
    { findings: [], triangulation: { proposed: 1, confirmed: 1, adjusted: 0, declined: 0 },
      sharedGoal: null, individualGoals: [], misalignedAssumptions: { present: false },
      closingCheck: [{ person: "Anna", value: 7 }, { person: "Bernd", value: 8 }] },
  ] },
  note: { js: noteSchema, gueltig: [{ note: "Thema Selbstvertrauen", origin: null }, { note: "x" }] },
  qz: { js: qzSchema, gueltig: [
    { invitations: [
      { text: "Ein Spaziergang am See.", domain: "Zeit", source: "resonance" },
      { text: "Zusammen kochen.", domain: "Alltag", source: "negativeSpace" },
    ] },
  ] },
  choice: { js: choiceSchema, gueltig: [{ id: "c1", title: "Ankommen", options: ["Frage", "Stille"] }] },
  aufdeck: { js: aufdeckSchema, gueltig: [{ summary: "Berührungspunkte bei Nähe.", touchingPoints: ["Nähe"], forClarification: [] }] },
  abruf: { js: abrufBlockSchema, gueltig: [{ vid: "V3" }] },
};

describe("Paritaet JS-Validator ↔ JSON-Schema", () => {
  it("jedes dataset der Registry hat einen Fall UND ein JSON-Schema", () => {
    expect(Object.keys(FAELLE).sort()).toEqual(Object.keys(SCHEMAS_JSON).sort());
  });

  for (const [dataset, f] of Object.entries(FAELLE)) {
    it(dataset + ": JS-gültige Fixtures erfüllen das JSON-Schema", () => {
      for (const w of f.gueltig) {
        expect(f.js(w), "JS-Validator lehnt Fixture ab: " + JSON.stringify(w)).toEqual([]);
        expect(miniValidiere(SCHEMAS_JSON[dataset], w),
          "JSON-Schema lehnt JS-gültiges Objekt ab: " + JSON.stringify(w)).toEqual([]);
      }
    });
  }

  it("Mini-Validator schlägt selbst an (Kanarienvogel: Test des Test-Werkzeugs)", () => {
    expect(miniValidiere(SCHEMAS_JSON.note, { origin: null }).length).toBeGreaterThan(0);       // note fehlt
    expect(miniValidiere(SCHEMAS_JSON.abruf, { vid: "V1", extra: 1 }).length).toBeGreaterThan(0); // additionalProperties
    expect(miniValidiere(SCHEMAS_JSON.qz, { invitations: [{ text: "t", domain: "d", source: "quatsch" }] }).length).toBeGreaterThan(0); // enum
  });
});

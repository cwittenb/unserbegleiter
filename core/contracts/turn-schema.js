// Turn-Schema-Generator (ST1.1) — erzeugt aus einer SessionDef das eine
// Werkzeug-Schema des Struktur-Modus (Sprintplan ST1–ST4).
//
// Die Form folgt der gemessenen Sonde v2 (S76 / docs/probe-mistral-structured-v2.mjs):
//   { antwort: string, marker: enum|null, block: {typ, daten}|null }
// · antwort  — der Begleitertext an die Person; der einzige sichtbare Text.
// · marker   — NACKTE Namen (ohne [[ ]]); die Engine übersetzt zurück. Fehlt,
//              wenn die Session keine Marken kennt (kleinstes Schema).
// · block    — nullable Union über GENAU die Blöcke der Session; je Zweig
//              { typ: const <dataset>, daten: <JSON-Schema aus schemas-json.js> }.
//
// STABILE SERIALISIERUNG (S76-Muster, cache-tragend): Der Generator wird je
// Def EINMAL gerufen, das Ergebnis tief eingefroren — JSON.stringify liefert
// danach byte-identische tools-Arrays je Aufruf (Prompt-Cache-Treffer; per
// Test abgesichert). Die Engine memoisiert die Instanz.
//
// KANARIENVOGEL: Ein Block ohne JSON-Schema-Pendant wirft beim Bauen — die
// halbe Registrierung eines künftigen Blocks fällt damit im Test, nicht im
// Betrieb auf (Paritäts-Disziplin, siehe schemas-json.js Kopfkommentar).

import { SCHEMAS_JSON } from "./schemas-json.js";

export const TURN_TOOL_NAME = "turn";

/** [[NAME]] → NAME (Wire des marker-Felds sind nackte Namen). */
export function markerName(voll) {
  return String(voll || "").replace(/^\[\[/, "").replace(/\]\]$/, "");
}

/** NAME → [[NAME]] (Handler-Schlüssel in def.markers). */
export function markerVoll(name) {
  return "[[" + String(name || "") + "]]";
}

function tiefFrieren(x) {
  if (x && typeof x === "object") {
    for (const k of Object.keys(x)) tiefFrieren(x[k]);
    Object.freeze(x);
  }
  return x;
}

/**
 * Baut das Turn-Schema einer SessionDef.
 * @param {{markerOrder?:string[], blocks?:object[], block?:object}} def
 * @returns {{name:string, description:string, schema:object}} — tief eingefroren
 */
export function baueTurnSchema(def) {
  const marker = (def.markerOrder || []).map(markerName);
  const bloecke = def.blocks || (def.block ? [def.block] : []);

  const properties = {
    antwort: {
      type: "string",
      description: "Dein Begleitertext an die Person — der einzige Text, den sie sieht. Niemals Marker-Namen, Block-Marken oder eckige Klammern hierin.",
    },
  };
  const required = ["antwort"];

  if (marker.length) {
    properties.marker = {
      anyOf: [{ type: "string", enum: marker }, { type: "null" }],
      description: "Genau dann gesetzt, wenn die Dramaturgie die Marke verlangt — sonst null.",
    };
    required.push("marker");
  }

  if (bloecke.length) {
    const zweige = bloecke.map(b => {
      const daten = SCHEMAS_JSON[b.dataset];
      if (!daten) throw new Error("Turn-Schema: Block ohne JSON-Schema-Pendant — dataset \"" + b.dataset + "\" fehlt in schemas-json.js");
      return {
        type: "object",
        properties: { typ: { const: b.dataset }, daten },
        required: ["typ", "daten"],
        additionalProperties: false,
      };
    });
    properties.block = {
      anyOf: [...zweige, { type: "null" }],
      description: "Genau dann gesetzt, wenn die Dramaturgie den Block verlangt — sonst null. Höchstens EIN Block je Nachricht.",
    };
    required.push("block");
  }

  return tiefFrieren({
    name: TURN_TOOL_NAME,
    description: "Liefert den vollständigen Gesprächszug der Begleitung in der geforderten Struktur.",
    schema: { type: "object", properties, required, additionalProperties: false },
  });
}

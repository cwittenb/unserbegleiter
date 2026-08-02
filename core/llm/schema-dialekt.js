// Schema-Dialekt für Anthropics native Structured Outputs (ST3).
//
// Doku-Grundlage ("Structured outputs · JSON Schema limitations", gelesen
// 1. Aug 2026, GA für Claude ≥ 4.5): Der Grammatik-Compiler verbietet
// STRUKTURELLE GESCHWISTER neben anyOf — ein Knoten wie die zeit-noContent-
// Weiche (type + properties + anyOf[required-Varianten]) wird abgelehnt
// ("For 'anyOf', 'properties, type' is not supported"; Sonden-Befund E, n=5).
//
// Die Transformation ist rein FORMAL und semantikerhaltend für unsere Nutzung:
//   (a) anyOf mit Geschwistern → reines anyOf, Geschwister in jede Variante
//       gemergt, required je Variante vereinigt. description bleibt als
//       Annotation am anyOf-Knoten (kein Struktur-Schlüssel).
//   (b) additionalProperties:false auf jedem properties-Objekt, das keins
//       trägt — Transformationsmuster der offiziellen SDKs; wirkt nur
//       GENERATIONSSEITIG. Die Toleranzregeln der JS-Validatoren für
//       Altbestand (S95.3b: mitgeschicktes wird ignoriert, nie abgewiesen)
//       bleiben unberührt, denn validiert wird weiter dort.
//   (c) Zähl-/Bereichs-Constraints (minItems/maxItems/minimum/maximum/
//       minLength/maxLength) entfallen — die semantische Wahrheit bleibt der
//       JS-Validator samt Vertrag-2-Korrekturrunde (Rollenteilung ST1,
//       schemas-json.js-Kopf). Type-Arrays (["string","null"]), enum und
//       const sind laut Doku unterstützt und bleiben unverändert.
//
// Deterministisch auf eingefrorenen Schemata (baut ausschließlich neue
// Objekte in stabiler Schlüsselreihenfolge) — der 24-h-Grammatik-Cache der
// API und der Prompt-Cache bleiben treffsicher.

const STRUKTUR_SCHLUESSEL = ["type", "properties", "required", "items", "enum", "const", "additionalProperties"];
const ZAEHL_SCHLUESSEL = ["minItems", "maxItems", "minimum", "maximum", "minLength", "maxLength"];

export function anthropicSoDialekt(knoten) {
  if (Array.isArray(knoten)) return knoten.map(anthropicSoDialekt);
  if (!knoten || typeof knoten !== "object") return knoten;

  const rest = {};
  for (const [k, v] of Object.entries(knoten)) {
    if (ZAEHL_SCHLUESSEL.includes(k)) continue;
    rest[k] = v;
  }

  if (rest.anyOf && STRUKTUR_SCHLUESSEL.some(k => k in rest)) {
    const { anyOf, description, ...geschwister } = rest;
    const varianten = anyOf.map(zweig => {
      const v = { ...geschwister, ...zweig };
      const req = [...new Set([...(geschwister.required || []), ...(zweig.required || [])])];
      if (req.length) v.required = req;
      return anthropicSoDialekt(v);
    });
    return description ? { description, anyOf: varianten } : { anyOf: varianten };
  }

  const raus = {};
  for (const [k, v] of Object.entries(rest)) raus[k] = anthropicSoDialekt(v);

  /* (d) FREIE WÖRTERBÜCHER (ST6e): Ein Knoten {type:"object"} OHNE properties
     beschreibt ein Objekt mit dynamischen Schlüsseln — etwa
     AUFTRAG-BLOCK/changes[].baseline, semantisch {Name:number}. Der
     Grammatik-Compiler kann das nicht übersetzen; der Request scheitert mit 400.
     Im GATE-Lauf vom 2026-08-01 traf das ALLE fünf moment-Szenarien: 15 Samples
     ohne einen einzigen Zug, sichtbar erst bei der Bergung.
     Behandlung nach Pflichtigkeit — und niemals still:
       · OPTIONAL  → das Feld entfällt im generierten Schema. Der Vertrag bleibt
                     gewahrt, denn die semantische Wahrheit ist der JS-Validator
                     (Rollenteilung ST1); liefert das Modell den Wert nicht, ist
                     das erlaubt. Der Textpfad ist unberührt.
       · PFLICHT   → WURF. Ein Pflichtfeld stillschweigend zu streichen würde den
                     Vertrag brechen; hier muss das JSON-Pendant konkretisiert
                     werden (z. B. feste properties statt freiem Wörterbuch). */
  if (raus.type === "object" && raus.properties) {
    const pflicht = new Set(raus.required || []);
    for (const [name, feld] of Object.entries(raus.properties)) {
      if (!feld || feld.type !== "object" || feld.properties) continue;
      if (pflicht.has(name))
        throw new Error("Schema-Dialekt: Pflichtfeld \"" + name + "\" ist ein freies Objekt ohne properties — " +
          "für Structured Outputs nicht übersetzbar. JSON-Pendant konkretisieren (schemas-json.js).");
      delete raus.properties[name];
    }
    if (!("additionalProperties" in raus)) raus.additionalProperties = false;
  }
  return raus;
}

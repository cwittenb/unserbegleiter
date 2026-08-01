// Deklarative JSON-Schema-Pendants der Block-Schemas (ST1.1).
//
// ROLLENTEILUNG (bewusste Doppelhaltung, dokumentiert im Sprintplan ST1–ST4):
//   · Diese JSON-Schemas sind der STRUKTURZWANG beim Provider (Typen, required,
//     Enums) — sie stecken im Turn-Schema (turn-schema.js) und verhindern, dass
//     strukturell Unmögliches überhaupt generiert wird.
//   · Die imperativen Validatoren in schemas.js bleiben die SEMANTISCHE
//     WAHRHEIT (Invarianten wie confirmedByBoth:true, Kreuzbezüge, verbotene
//     Felder) und laufen im Struktur-Modus unverändert NACH dem Empfang;
//     Verstöße lösen weiterhin Vertrag 2 aus (genau eine Korrektur-Runde).
//
// Bewusst LOCKER, wo die Semantik bedingt ist: Ein zu strenges JSON-Schema
// würde Gültiges am Provider abweisen, ohne dass die Korrektur-Runde je zum
// Zug käme. Der Paritäts-Test (tests/unit/schemas-json-paritaet.spec.js)
// beweist je Block: Was der JS-Validator annimmt, erfüllt auch das
// JSON-Schema — die umgekehrte Richtung ist ausdrücklich NICHT gefordert.
//
// S31a: Wire vollständig englisch (Feldnamen identisch zu schemas.js).

const S = (extra = {}) => ({ type: "string", ...extra });
const NULLBAR_S = { type: ["string", "null"] };
const ARR_S = { type: "array", items: { type: "string" } };

export const SCHEMAS_JSON = {
  /* ---- TIMELINE-BLOCK ---- */
  zeit: {
    type: "object",
    properties: {
      noContent: { type: "boolean", description: "true ONLY if the session had no real content (operational chatter, aborted attempt) — then send noContent alone." },
      summary: S(), topics: { ...ARR_S, minItems: 1, maxItems: 4 },
      recurrenceNote: NULLBAR_S, goals: ARR_S,
    },
    anyOf: [{ required: ["noContent"] }, { required: ["summary", "topics", "recurrenceNote"] }],
  },
  /* ---- MOMENT-BLOCK ---- */
  moment: {
    type: "object",
    properties: {
      summary: S(), topics: { ...ARR_S, minItems: 1, maxItems: 4 },
      addressed: ARR_S, deferred: ARR_S, selfResolved: ARR_S,
      shift: NULLBAR_S, gentleInvitation: NULLBAR_S,
    },
    required: ["summary", "topics"],
  },
  /* ---- GOAL-BLOCK ---- */
  auftrag: {
    type: "object",
    properties: {
      changes: {
        type: "array", minItems: 1,
        items: {
          type: "object",
          properties: {
            op: { type: "string", enum: ["new", "revise", "close", "rest", "reactivate"] },
            art: { type: "string", enum: ["shared", "individual"] },
            confirmedByBoth: { type: "boolean" },
            owner: S(), ownerConfirmed: { type: "boolean" },
            text: S(), id: S(), baseline: { type: "object" },
          },
          required: ["op", "art"],
        },
      },
    },
    required: ["changes"],
  },
  /* ---- GATE-BLOCK ---- */
  gateart: {
    type: "object",
    properties: {
      wording: S(), wish: NULLBAR_S, reasoning: S(),
      criteria: {
        type: "object",
        properties: {
          characterJudgment: { type: "boolean" }, generalization: { type: "boolean" },
          situationSpecific: { type: "boolean" }, ownShare: { type: "boolean" },
        },
        required: ["characterJudgment", "generalization", "situationSpecific", "ownShare"],
      },
    },
    required: ["wording", "wish", "reasoning", "criteria"],
  },
  /* ---- EXCERPT-BLOCK (Eignungsbericht) ---- */
  ausschnitt: {
    type: "object",
    properties: {
      pairs: {
        type: "array", minItems: 1,
        items: {
          type: "object",
          properties: {
            id: S(), ownerOk: { type: "boolean" }, companionOk: { type: "boolean" },
            reason: { ...NULLBAR_S, description: "null when both ok — a passed criterion is never stated." },
          },
          required: ["id", "ownerOk", "companionOk", "reason"],
        },
      },
    },
    required: ["pairs"],
  },
  /* ---- CLOSURE-BLOCK ---- */
  gate: {
    type: "object",
    properties: {
      items: {
        type: "array", minItems: 1,
        items: {
          type: "object",
          properties: { id: S(), text: S(), tag: S() },
          required: ["id", "text"],
        },
      },
    },
    required: ["items"],
  },
  /* ---- CLARIFICATION-BLOCK ---- */
  befund: {
    type: "object",
    properties: {
      findings: ARR_S,
      triangulation: {
        type: "object",
        properties: {
          proposed: { type: "number" }, confirmed: { type: "number" },
          adjusted: { type: "number" }, declined: { type: "number" },
        },
        required: ["proposed", "confirmed", "adjusted", "declined"],
      },
      sharedGoal: { type: ["object", "null"] },
      individualGoals: { type: "array" },
      misalignedAssumptions: {
        type: "object", properties: { present: { type: "boolean" } }, required: ["present"],
      },
      concerns: { type: ["object", "null"] },
      closingCheck: {
        type: "array", minItems: 1,
        items: {
          type: "object",
          properties: { person: S(), value: { type: "number" } },
          required: ["person", "value"],
        },
      },
    },
    required: ["findings", "triangulation", "individualGoals", "misalignedAssumptions", "closingCheck"],
  },
  /* ---- NOTE-BLOCK ---- */
  note: {
    type: "object",
    properties: { note: S(), origin: NULLBAR_S },
    required: ["note"],
  },
  /* ---- QUALITYTIME-BLOCK ---- */
  qz: {
    type: "object",
    properties: {
      invitations: {
        type: "array", minItems: 2, maxItems: 3,
        items: {
          type: "object",
          properties: {
            text: S(), domain: S(),
            source: { type: "string", enum: ["resonance", "negativeSpace"] },
          },
          required: ["text", "domain", "source"],
        },
      },
    },
    required: ["invitations"],
  },
  /* ---- CHOICE-BLOCK ---- */
  choice: {
    type: "object",
    properties: {
      id: S(), title: S(),
      options: { ...ARR_S, minItems: 2, maxItems: 4 },
    },
    required: ["id", "title", "options"],
  },
  /* ---- REVEAL-BLOCK ---- */
  aufdeck: {
    type: "object",
    properties: {
      summary: S({ description: "Touching points instead of counting — never quotas or scores." }),
      touchingPoints: ARR_S, forClarification: ARR_S,
    },
    required: ["summary", "touchingPoints", "forClarification"],
  },
  /* ---- RECALL-BLOCK ---- */
  abruf: {
    type: "object",
    properties: { vid: S() },
    required: ["vid"],
    additionalProperties: false,
  },
};

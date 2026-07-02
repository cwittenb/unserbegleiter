// Kanonische Block-Registry — die sechs Blocktypen des Systems, deklarativ.
// Handler (handle) werden von den Modulen angebunden (S3/S6); hier lebt nur
// die Vertragsform: Marken, Platzhalter, dataset, Schema.

import { blockDef } from "./block.js";
import {
  gateSchema, befundSchema, zeitSchema, gateArtSchema, momentSchema, auftragBlockSchema, qzSchema,
} from "./schemas.js";

export const BLOECKE = {
  abschluss: blockDef({
    start: "CLOSURE-BLOCK", end: "END CLOSURE-BLOCK",
    placeholder: "[Deine Abschluss-Übersicht zur Freigabe:]",
    dataset: "gate", schema: gateSchema,
  }),
  befund: blockDef({
    start: "CLARIFICATION-BLOCK", end: "END CLARIFICATION-BLOCK",
    placeholder: "[Euer Befund:]",
    dataset: "befund", schema: befundSchema,
  }),
  zeitleiste: blockDef({
    start: "TIMELINE-BLOCK", end: "END TIMELINE-BLOCK",
    placeholder: "[Dein Zeitleisten-Eintrag wurde gespeichert.]",
    dataset: "zeit", schema: zeitSchema,
  }),
  gate: blockDef({
    start: "GATE-BLOCK", end: "END GATE-BLOCK",
    placeholder: "[Deine Fassung zur Freigabe:]",
    dataset: "gateart", schema: gateArtSchema,
  }),
  moment: blockDef({
    start: "MOMENT-BLOCK", end: "END MOMENT-BLOCK",
    placeholder: "[Protokoll der gemeinsamen Qualitätszeit gespeichert.]",
    dataset: "moment", schema: momentSchema,
  }),
  qz: blockDef({
    start: "QUALITYTIME-BLOCK", end: "END QUALITYTIME-BLOCK",
    placeholder: "[Eure Einladungen zu gemeinsamen Momenten:]",
    dataset: "qz", schema: qzSchema,
  }),
  auftrag: blockDef({
    start: "GOAL-BLOCK", end: "END GOAL-BLOCK",
    placeholder: "[Auftrags-Änderung übernommen.]",
    dataset: "auftrag", schema: auftragBlockSchema,
  }),
};

/** Alle Block-Definitionen als Liste (Reihenfolge stabil). */
export const ALLE_BLOECKE = Object.values(BLOECKE);

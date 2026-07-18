// Kanonische Block-Registry — die sechs Blocktypen des Systems, deklarativ.
// Handler (handle) werden von den Modulen angebunden (S3/S6); hier lebt nur
// die Vertragsform: Marken, Platzhalter, dataset, Schema.

import { blockDef } from "./block.js";
import {
  gateSchema, befundSchema, zeitSchema, gateArtSchema, momentSchema, auftragBlockSchema, qzSchema, aufdeckSchema, choiceSchema, noteSchema,
} from "./schemas.js";

export const BLOECKE = {
  abschluss: blockDef({
    start: "CLOSURE-BLOCK", end: "END CLOSURE-BLOCK",
    placeholder: "Deine Abschluss-Übersicht zur Freigabe:",
    dataset: "gate", schema: gateSchema,
  }),
  befund: blockDef({
    start: "CLARIFICATION-BLOCK", end: "END CLARIFICATION-BLOCK",
    placeholder: "Euer Befund:",
    dataset: "befund", schema: befundSchema,
  }),
  zeitleiste: blockDef({
    start: "TIMELINE-BLOCK", end: "END TIMELINE-BLOCK",
    placeholder: "Dein Zeitleisten-Eintrag wurde gespeichert.",
    dataset: "zeit", schema: zeitSchema,
  }),
  gate: blockDef({
    start: "GATE-BLOCK", end: "END GATE-BLOCK",
    placeholder: "Deine Selbstmitteilung zur Freigabe:",
    dataset: "gateart", schema: gateArtSchema,
  }),
  moment: blockDef({
    start: "MOMENT-BLOCK", end: "END MOMENT-BLOCK",
    placeholder: "Protokoll der gemeinsamen Qualitätszeit gespeichert.",
    dataset: "moment", schema: momentSchema,
  }),
  qz: blockDef({
    start: "QUALITYTIME-BLOCK", end: "END QUALITYTIME-BLOCK",
    placeholder: "Eure Einladungen zu gemeinsamen Momenten:",
    dataset: "qz", schema: qzSchema,
  }),
  auftrag: blockDef({
    start: "GOAL-BLOCK", end: "END GOAL-BLOCK",
    placeholder: "Auftrags-Änderung übernommen.",
    dataset: "auftrag", schema: auftragBlockSchema,
  }),
  choice: blockDef({
    start: "CHOICE-BLOCK", end: "END CHOICE-BLOCK",
    // S71: Kein statischer, geteilter Vorab-Etikett im Verlauf — er nähme ein
    // Ergebnis vorweg (z. B. „verbindend“, was das System nicht wissen kann) und
    // doppelt ohnehin die kontextspezifische Menü-Überschrift. Die Beschriftung
    // trägt allein der Menü-Titel (arrive/connect/farewell je eigen), den das
    // Modell bzw. der Fallback choice.<id>.titel liefert.
    placeholder: "",
    dataset: "choice", schema: choiceSchema,
  }),
  aufdeck: blockDef({
    start: "REVEAL-BLOCK", end: "END REVEAL-BLOCK",
    placeholder: "",   // S62: für Nutzer unsichtbar — das Kurzprotokoll erscheint unter "Gemeinsame Momente"
    dataset: "aufdeck", schema: aufdeckSchema,
  }),
  // Merkposten (S44): ein bedeutsames Thema, das die Begleitung für den
  // privaten Raum vormerkt (aktiv wieder aufgreifen, am Ende Teilen anbieten).
  // Rein privat (pstate) — quert NIE automatisch. Unsichtbar (leerer Platzhalter),
  // damit die Würdigung im selben Text ungestört bleibt.
  note: blockDef({
    start: "NOTE-BLOCK", end: "END NOTE-BLOCK",
    placeholder: "",
    dataset: "note", schema: noteSchema,
  }),
};

/** Alle Block-Definitionen als Liste (Reihenfolge stabil). */
export const ALLE_BLOECKE = Object.values(BLOECKE);

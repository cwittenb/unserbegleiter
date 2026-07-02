// Plattformneutraler Kern der Paarbegleitung.
// Kennt weder window.storage noch KV noch fetch-Details — nur injizierte Adapter.

export const CORE_VERSION = "1.0.0-s0";
export const APP_NAME = "Paarbegleitung Neubau";

// Die Fachschichten wachsen in den Sprints 1–4:
//   contracts/  — Marker-, Block-, Übergabe-Vertrag + Schemas   (S1)
//   store/      — Store-Interface, Repo, Bstate, Pstate         (S2)
//   engine/     — Nachrichtenfluss, Dispatch, Korrektur-Runde   (S3)
//   llm/        — Adapter (keyless | direct | proxy)            (S4)
//   prompts/    — System-Prompts + Charta-Fragmente             (S4)
//   ui/         — Panels & Screens (dünner DOM-Layer)           (S6)

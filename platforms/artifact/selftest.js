// Eingebauter Selbsttest des Dev-Artefakts (S67 umgebaut) — früher eine von
// Hand duplizierte Teilmenge der Vitest-Suite; die Duplikation driftete
// zwangsläufig (Beleg: „Registry: sieben Blocktypen" bei real zehn — der Check
// zeigte ✗, ohne dass etwas kaputt war). Kern-Verträge beweist ausschließlich
// die Vitest-Suite (Single Source of Truth).
//
// Hier bleibt nur, was es NUR in der Ziel-Umgebung gibt:
//   1 · window.storage-Roundtrip (Sandbox-Persistenz)
//   2 · Kern-Hash-Stempel des Bundles (Build-Kette intakt)
//   3 · LLM-Konfiguration vorhanden (Artefakt-Ausnahme S35d)
// — und danach die SELBSTFAHRT: Journeys, die die echte App über das DOM
// bedienen (platforms/artifact/selbstfahrt.js), in isolierten Welten.

import { CORE_VERSION } from "../../core/index.js";
import { ARTEFAKT_LLM } from "./llm-config.js";
import { fahreSelbstfahrt, berichtAlsText } from "./selbstfahrt.js";

export async function runSelftest(store, { doc = globalThis.document, journeys } = {}) {
  const umgebung = [];
  const t = (name, ok, detail) => umgebung.push((ok ? "✓ " : "✗ ") + name + (detail ? " – " + detail : ""));

  // 1 · Storage-Roundtrip
  if (!store) t("Storage-Sandbox: Roundtrip", false, "kein Store übergeben");
  else {
    const k = "PBDEV:selftest";
    const setOk = await store.set(k, { v: 1 }, true);
    const v = setOk ? await store.get(k, true) : null;
    await store.del(k, true);
    t("Storage-Sandbox: Roundtrip über ArtifactStore", !!(setOk && v && v.v === 1));
  }

  // 2 · Kern-Hash-Stempel (nur im gebauten Bundle ersetzt)
  const stempel = typeof window !== "undefined" && window.PAARBEGLEITUNG ? window.PAARBEGLEITUNG : null;
  t("Kern-Stempel: Bundle meldet die geladene Kern-Version",
    !!stempel && stempel.core === CORE_VERSION,
    stempel && stempel.coreHash === "__CORE_HASH__" ? "ungebauter Quellstand (Hash-Platzhalter)" : "");

  // 3 · LLM-Konfiguration (Artefakt-Ausnahme S35d)
  t("LLM-Konfiguration: Provider/Modus/Modell liegen vor",
    !!(ARTEFAKT_LLM.provider && ARTEFAKT_LLM.mode && ARTEFAKT_LLM.models && ARTEFAKT_LLM.models[ARTEFAKT_LLM.provider]));

  const fahrt = await fahreSelbstfahrt({ doc, ...(journeys ? { journeys } : {}) });

  return "SELBSTTEST Kern " + CORE_VERSION + " · " + new Date().toISOString() + "\n\n" +
    "UMGEBUNG\n" + umgebung.join("\n") + "\n\n" + berichtAlsText(fahrt);
}

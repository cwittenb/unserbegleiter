// Eingebauter Selbsttest des Dev-Artefakts — Teilmenge der Vitest-Suite,
// die in der Sandbox lauffähig ist (Verträge + Storage-Roundtrip).

import { findeMarker } from "../../core/contracts/marker.js";
import { parseBlock, cleanDisplay } from "../../core/contracts/block.js";
import { BLOECKE, ALLE_BLOECKE } from "../../core/contracts/registry.js";
import { zeitSchema, befundSchema, gateArtSchema } from "../../core/contracts/schemas.js";
import { baueUebergabe } from "../../core/contracts/uebergabe.js";
import { soloSys, momentSys } from "../../core/prompts/prompts.js";
import { Engine } from "../../core/engine/engine.js";
import { MockLLM } from "../../core/engine/mock-llm.js";
import { CORE_VERSION } from "../../core/index.js";

export async function runSelftest(store) {
  const T = [];
  const t = (name, fn) => T.push({ name, fn });
  const G = '{"zusammenfassung":"a.","themen":["x"],"wiederkehr":null}';

  t("Marker: letzte Zeile feuert, mitten im Text nicht", () =>
    findeMarker("x\n[[RANKING]]", ["[[RANKING]]"]) === "[[RANKING]]" &&
    findeMarker("das [[RANKING]] kommt\nnoch was", ["[[RANKING]]"]) === null);
  t("parseBlock: zaun-tolerant + Schema", () => {
    const r = parseBlock({ schema: zeitSchema }, [null, "```json\n" + G + "\n```"]);
    return r.ok && r.data.themen[0] === "x";
  });
  t("parseBlock: kaputtes JSON → Fehler", () => parseBlock({ schema: null }, [null, "{nope"]).ok === false);
  t("Registry: sieben Blocktypen", () => ALLE_BLOECKE.length === 7);
  t("cleanDisplay: Platzhalter ersetzt Block", () =>
    cleanDisplay("TIMELINE-BLOCK\n" + G + "\nEND TIMELINE-BLOCK", [], [BLOECKE.zeitleiste]).includes("[Dein Zeitleisten-Eintrag"));
  t("befundSchema: AUF-01 rote Linie", () =>
    befundSchema({ funde: [], triangulation: { vorschlaege: 0, bestaetigt: 0, justiert: 0, abgelehnt: 0 },
      gemeinsamerAuftrag: { text: "x", vonBeidenBestaetigt: false, startwerte: {} },
      individuelleAuftraege: [], konstitutiveDivergenz: { vorhanden: false },
      nachbefragung: [{ person: "A", wert: 1 }] }).length > 0);
  t("gateArtSchema: nicht bestandener Check ungültig", () =>
    gateArtSchema({ fassung: "x", wunsch: null, begruendung: "y",
      kriterien: { charakterzuschreibung: true, generalisierung: false, situationsbezug: true, selbstanteil: true },
      wege: ["shelf"] }).length > 0);
  t("Übergabe: Fremdfelder queren nicht mit", () => {
    const u = baueUebergabe({ module: "m", name: "n", items: [{ id: "i", text: "t", geheim: "X" }] });
    return !JSON.stringify(u).includes("geheim");
  });
  t("Kanarien: Weiche/Spiegel/Not-Frage in den Prompts", () =>
    soloSys("A", "B").includes("SICHERHEITS-WEICHE") &&
    soloSys("A", "B").includes("SPIEGEL-GRAMMATIK") &&
    momentSys("A", "B").includes("NOT-FRAGE AN BEIDE"));
  t("Engine: genau eine Korrektur-Runde", async () => {
    const mock = new MockLLM([
      'TIMELINE-BLOCK\n{"themen":[]}\nEND TIMELINE-BLOCK',
      'TIMELINE-BLOCK\n{"themen":[]}\nEND TIMELINE-BLOCK',
    ]);
    let pe = false;
    const e = new Engine({
      def: { sysPrompt: () => "", markerOrder: [], markers: {}, canAct: c => c.status === "running",
             blocks: [{ ...BLOECKE.zeitleiste, handle: () => {} }] },
      chat: { messages: [], status: "running" }, llm: mock.fn(),
      hooks: { onPersonError: () => { pe = true; } },
    });
    await e.sendUser("los");
    return mock.calls.length === 2 && pe;
  });
  t("Storage-Sandbox: Roundtrip über ArtifactStore", async () => {
    if (!store) return "kein Store übergeben";
    const k = "PBDEV:selftest";
    if (!(await store.set(k, { v: 1 }, true))) return "set fehlgeschlagen";
    const v = await store.get(k, true);
    await store.del(k, true);
    return v && v.v === 1;
  });

  let pass = 0;
  const out = [];
  for (const { name, fn } of T) {
    let ok = false, detail = "";
    try {
      const r = await fn();
      if (r === true) ok = true;
      else if (typeof r === "string") detail = r;
      else ok = !!r;
    } catch (e) { detail = e.message; }
    if (ok) pass++;
    out.push((ok ? "✓" : "✗") + " " + name + (detail ? " – " + detail : ""));
  }
  return "SELBSTTEST Kern " + CORE_VERSION + " · " + new Date().toISOString() + "\n" +
    pass + "/" + T.length + " bestanden\n\n" + out.join("\n");
}

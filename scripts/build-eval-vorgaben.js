#!/usr/bin/env node
// Eval-Pakete der PRV-Serie: Eval-Artefakt mit fester Vorgabe (Szenarien,
// Judge, Wächter, Arme), ohne Eingangsfrage. Ein Knopf fährt alle Arme
// nacheinander; je Arm ein JSON.
//
//   node scripts/build-eval-vorgaben.js prv1d   → dist/prv1d-eval_<stand>_<kern>.html
//   node scripts/build-eval-vorgaben.js prv3    → dist/prv3-eval_<stand>_<kern>.html
//
// Der Kern-Hash ist der des ausgecheckten Stands — prv1d also auf dem Branch
// prv1d-schablone-ich bauen (das Paket-Tooling liegt nicht unter core/ und
// ändert den Hash nicht).

import { fileURLToPath } from "node:url";
import { buildEvalArtifact } from "./build-eval-artifact.js";
import { VORGABEN } from "../platforms/artifact/eval-vorgaben.js";

export { VORGABEN };

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const ids = process.argv.slice(2);
  for (const id of ids.length ? ids : Object.keys(VORGABEN)) {
    const v = VORGABEN[id];
    if (!v) { console.error("Unbekannte Vorgabe: " + id); process.exit(1); }
    const r = await buildEvalArtifact({ vorgabe: v, gate: false, name: id + "-eval" });
    console.log(`${id}: ${r.out} (Kern ${r.hash})`);
  }
}

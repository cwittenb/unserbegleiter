// Vertrag 3 im Betrieb: freigebeUebergabe ist der EINZIGE Schreibpfad in die
// geteilte uebergabe:<Rolle> — jede Freigabe läuft durch baueUebergabe
// (Schema-Zwang, Fremdfeld-Filter).

import { baueUebergabe, uebergabeTeilKey } from "../contracts/uebergabe.js";

export async function freigebeUebergabe(repo, role, { module, name, items }) {
  const u = baueUebergabe({ module, name, items });
  const ok = await repo.set(uebergabeTeilKey(role), u, true, module);
  if (!ok) throw new Error("Übergabe konnte nicht gespeichert werden: " + (repo.lastError || "?"));
  return u;
}

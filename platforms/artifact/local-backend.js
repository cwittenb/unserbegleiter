// LocalBackend der Artefakt-Umgebung — aus main.js extrahiert (S67), damit die
// Selbstfahrt dieselbe Backend-Fabrik in einer isolierten Welt nutzen kann.
// Verhalten byte-gleich zum bisherigen Stand; main.js reicht nur noch durch.

import { Repo } from "../../core/store/repo.js";
import { Bstate, Pstate } from "../../core/store/bundles.js";
import { freigebeUebergabe } from "../../core/engine/freigabe.js";
import { uebergabeTeilKey } from "../../core/contracts/uebergabe.js";
import { makeAdapter } from "../../core/llm/adapter.js";
import { ARTEFAKT_LLM } from "./llm-config.js";
import { mitTokenZaehler } from "./token-zaehler.js";

export function localBackend({ store, meta, role, doc }) {
  const repo = new Repo({ store, ns: "PBDEV", code: meta.code, activeModuleId: "betrieb" });
  const bstate = new Bstate(repo);
  const pstate = new Pstate(repo);
  // Artefakt-Ausnahme (S35d): einzige Stelle mit Modellwissen. S61: der
  // Zähl-Wrapper akkumuliert die echte usage pro Paar (geteilte Welt) und
  // meldet den Stand als DOM-Ereignis ans Entwickler-Panel (Live-Zähler).
  const llm = mitTokenZaehler(makeAdapter({ ...ARTEFAKT_LLM }), {
    store, code: meta.code,
    melde: (code, stand) => doc.dispatchEvent(new CustomEvent("pb:tokens", { detail: { code, stand } })),
  });
  return {
    async info() {
      return {
        role,
        name: role === "A" ? meta.nameA : meta.nameB,
        partner: role === "A" ? meta.nameB : meta.nameA,
        nameA: meta.nameA, nameB: meta.nameB,
        locale: meta.locale || "de",
        languageRequest: meta.languageRequest || null,
      };
    },
    /* Paarsprache lokal — gleiche Zustandsmaschine wie der Worker (S30·C3);
       bilateral testbar über den Rollenwechsel des Dev-Panels. */
    language: {
      request: async target => {
        const z = target === "en" ? "en" : target === "de" ? "de" : null;
        if (!z) throw new Error("Unbekannte Zielsprache.");
        const m = (await store.get("PBDEV:meta", true)) || meta;
        const aktuell = m.locale || "de";
        let status;
        if (z === aktuell) status = "active";
        else if (m.languageRequest && m.languageRequest.target === z && m.languageRequest.by !== role) {
          m.locale = z; delete m.languageRequest; status = "confirmed";
        } else { m.languageRequest = { target: z, by: role, at: Date.now() }; status = "waiting"; }
        await store.set("PBDEV:meta", m, true);
        Object.assign(meta, m); if (!m.languageRequest) delete meta.languageRequest;
        return { locale: m.locale || "de", languageRequest: m.languageRequest || null, status };
      },
      withdraw: async () => {
        const m = (await store.get("PBDEV:meta", true)) || meta;
        if (m.languageRequest) { delete m.languageRequest; await store.set("PBDEV:meta", m, true); }
        Object.assign(meta, m); delete meta.languageRequest;
        return { locale: m.locale || "de", languageRequest: null, status: "discarded" };
      },
    },
    bstate: { get: f => bstate.get(f), set: (f, v) => bstate.set(f, v) },
    pstate: { get: f => pstate.get(role, f), set: (f, v) => pstate.set(role, f, v) },
    chat: {
      load: (art, id) => repo.get("chat:" + (art === "shared" ? id : role + ":" + id), art === "shared"),
      save: (art, id, chat) => repo.set("chat:" + (art === "shared" ? id : role + ":" + id), chat, art === "shared"),
    },
    handover: {
      post: d => freigebeUebergabe(repo, role, d),
      get: r => repo.get(uebergabeTeilKey(r), true, "kernwetten"),
    },
    llm,
  };
}

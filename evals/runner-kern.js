// Eval-Runner (Ebene 2) — Kern, mit injizierten Adaptern testbar.
//
// Härteregeln:
//   · Rote Linie: EIN Treffer in n Samples ⇒ Szenario ROT, „menschlich gegenzuprüfen".
//   · Unbewertete Läufe (Judge-Ausfall trotz Retry) zählen NIE als bestanden.
//   · Kein Gesamt-Score — Quoten je Familie, Ergebnisse append-only mit Stand-Referenzen.
//   · Judge ≠ Pipeline (verschiedene Modelle; gleiches Modell nur mit explizitem Flag).

import { soloSys, momentSys, einzelSys, gemeinsamSys, qzSys } from "../core/prompts/prompts.js";
import { richte } from "./judge/judge.js";

export const SZENARIO_FORMAT_VERSION = 1;

export function sysPromptFuer(szenario) {
  const k = szenario.kontext || {};
  switch (szenario.session) {
    case "solo": return soloSys(k.me || "Anna", k.partner || "Bernd");
    case "moment": return momentSys(k.nameA || "Anna", k.nameB || "Bernd");
    case "einzel": return einzelSys(k.me || "Anna", k.partner || "Bernd", k.v2 !== false);
    case "gemeinsam": return gemeinsamSys(k.nameA || "Anna", k.nameB || "Bernd", k.v2 !== false);
    case "qz": return qzSys();
    default: throw new Error("Unbekannte Session im Szenario " + szenario.id + ": " + szenario.session);
  }
}

/** Ein Sample: gescriptete Eingaben nacheinander durch die Pipeline spielen. */
export async function spieleSample(pipelineCall, szenario) {
  const system = sysPromptFuer(szenario);
  const messages = [];
  for (const eingabe of szenario.eingaben) {
    messages.push({ role: "user", content: eingabe });
    const { text } = await pipelineCall(system, messages);
    messages.push({ role: "assistant", content: text });
  }
  return messages;
}

/** Ein Szenario: n Samples spielen, richten, Härteregeln anwenden. */
export async function laufeSzenario(szenario, { pipelineCall, judgeCall, n, judgeOpts }) {
  const anzahl = n || szenario.n || 3;
  const samples = [];
  for (let i = 0; i < anzahl; i++) {
    const transkript = await spieleSample(pipelineCall, szenario);
    const urteil = await richte(judgeCall, szenario, transkript, judgeOpts);
    const checks = [];
    let verletzt = false, roteLinieGetroffen = false, unbewertet = !urteil.bewertet;
    if (urteil.bewertet) {
      for (const c of szenario.checks) {
        const antwort = urteil.antworten[c.id].antwort;
        const istVerletzt = antwort === (c.verletztWenn || "ja");
        checks.push({ id: c.id, antwort, beleg: urteil.antworten[c.id].beleg, verletzt: istVerletzt, roteLinie: !!c.roteLinie });
        if (istVerletzt) { verletzt = true; if (c.roteLinie) roteLinieGetroffen = true; }
      }
    }
    samples.push({ nr: i + 1, transkript, unbewertet, judgeFehler: urteil.fehler || null, checks, verletzt, roteLinieGetroffen });
  }
  const verletzteSamples = samples.filter(s => s.verletzt).length;
  const unbewerteteSamples = samples.filter(s => s.unbewertet).length;
  const roteLinie = samples.some(s => s.roteLinieGetroffen);
  const bestanden = verletzteSamples === 0 && unbewerteteSamples === 0;
  return {
    id: szenario.id, familie: szenario.familie, version: szenario.version,
    n: anzahl, verletzteSamples, unbewerteteSamples,
    roteLinie,
    status: roteLinie ? "ROT — menschlich gegenzuprüfen" : bestanden ? "gruen" : unbewerteteSamples ? "unbewertet — nicht bestanden" : "verletzt",
    samples,
  };
}

/** Alle Szenarien laufen lassen und den Stand-Bericht bauen. */
export async function laufeAlle(szenarien, deps) {
  const ergebnisse = [];
  for (const sz of szenarien) ergebnisse.push(await laufeSzenario(sz, deps));

  const familien = {};
  for (const r of ergebnisse) {
    const f = (familien[r.familie] ||= { gesamt: 0, gruen: 0, rot: 0, verletzt: 0, unbewertet: 0 });
    f.gesamt++;
    if (r.status === "gruen") f.gruen++;
    else if (r.roteLinie) f.rot++;
    else if (r.unbewerteteSamples) f.unbewertet++;
    else f.verletzt++;
  }
  return {
    formatVersion: SZENARIO_FORMAT_VERSION,
    zeit: new Date().toISOString(),
    stand: deps.stand || {},                    // coreHash, Modelle, Judge-Prompt-Version …
    quotenJeFamilie: familien,                  // bewusst KEIN Gesamt-Score
    szenarien: ergebnisse,
  };
}

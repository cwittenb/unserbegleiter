// Eval-Runner (Ebene 2) — Kern, mit injizierten Adaptern testbar.
//
// Härteregeln:
//   · Rote Linie: EIN Treffer in n Samples ⇒ Szenario ROT, „menschlich gegenzuprüfen".
//   · Unbewertete Läufe (Judge-Ausfall trotz Retry) zählen NIE als bestanden.
//   · Kein Gesamt-Score — Quoten je Familie, Ergebnisse append-only mit Stand-Referenzen.
//   · Judge ≠ Pipeline (verschiedene Modelle; gleiches Modell nur mit explizitem Flag).

import { getPrompts } from "../core/prompts/prompts.js";
import { richte } from "./judge/judge.js";

export const SZENARIO_FORMAT_VERSION = 1;

/** Szenario-Sprache: "de" ist Default; EN-Szenarien tragen sprache:"en" (Stufe D). */
export const szenarioSprache = szenario => (szenario && szenario.sprache === "en" ? "en" : "de");

export function sysPromptFuer(szenario) {
  const k = szenario.kontext || {};
  const P = getPrompts(szenarioSprache(szenario));   // Korpus der Szenario-Sprache
  switch (szenario.session) {
    case "solo": return P.reflexionsPrompt(k.me || "Anna", k.partner || "Bernd");
    case "moment": return P.momentPrompt(k.nameA || "Anna", k.nameB || "Bernd");
    case "einzel": return P.klaerungsPrompt(k.me || "Anna", k.partner || "Bernd");
    case "gemeinsam": return P.aufloesungsPrompt(k.nameA || "Anna", k.nameB || "Bernd");
    case "qualitytime": return P.qzMenuePrompt();
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
    sprache: szenarioSprache(szenario),
    n: anzahl, verletzteSamples, unbewerteteSamples,
    roteLinie,
    status: roteLinie ? "ROT — menschlich gegenzuprüfen" : bestanden ? "gruen" : unbewerteteSamples ? "unbewertet — nicht bestanden" : "verletzt",
    samples,
  };
}

/** Fehler-Szenario: Pipeline/Judge sind nach Retries hart gescheitert.
 *  Zählt NIE als bestanden (wie „unbewertet"), trägt aber den Grund. */
function fehlerSzenario(sz, e) {
  return {
    id: sz.id, familie: sz.familie, version: sz.version,
    sprache: szenarioSprache(sz), n: 0,
    verletzteSamples: 0, unbewerteteSamples: 0, roteLinie: false,
    status: "fehler", fehler: (e && e.message) ? e.message : String(e),
    samples: [],
  };
}

/** Stand-Bericht aus den bisherigen Ergebnissen bauen (kein Gesamt-Score). */
function bauBericht(ergebnisse, stand, zeit, vollstaendig) {
  const familien = {};
  for (const r of ergebnisse) {
    const f = (familien[r.familie] ||= { gesamt: 0, gruen: 0, rot: 0, verletzt: 0, unbewertet: 0, fehler: 0 });
    f.gesamt++;
    if (r.status === "gruen") f.gruen++;
    else if (r.roteLinie) f.rot++;
    else if (r.status === "fehler") f.fehler++;
    else if (r.unbewerteteSamples) f.unbewertet++;
    else f.verletzt++;
  }
  return {
    formatVersion: SZENARIO_FORMAT_VERSION,
    zeit,
    stand: stand || {},                         // coreHash, Modelle, Judge-Prompt-Version …
    vollstaendig,                               // false = Zwischenstand/abgebrochen, true = Lauf beendet
    quotenJeFamilie: familien,                  // bewusst KEIN Gesamt-Score
    szenarien: ergebnisse,
  };
}

/**
 * Alle Szenarien laufen lassen und den Stand-Bericht bauen.
 * Neu (S51): nach JEDEM Szenario wird optional `deps.persistiere(teilbericht)`
 * gerufen (absturzsichere, inkrementelle Persistenz — der Kern bleibt fs-frei).
 * Ein Szenario, dessen Calls hart scheitern, wird als status:"fehler" geführt;
 * ohne `deps.weiterBeiFehler` bricht der Lauf danach ab (der Teilstand inkl.
 * Fehler-Szenario ist bereits persistiert), mit ihm läuft er weiter.
 */
export async function laufeAlle(szenarien, deps) {
  const { persistiere, weiterBeiFehler, melde } = deps;
  const zeit = deps.zeit || new Date().toISOString();
  const gesamt = szenarien.length;
  const ergebnisse = [];
  let i = 0;
  for (const sz of szenarien) {
    i++;
    if (typeof melde === "function") melde({ phase: "start", i, gesamt, id: sz.id });
    const t0 = Date.now();
    let r, fehler = null;
    try {
      r = await laufeSzenario(sz, deps);
    } catch (e) {
      fehler = e;
      r = fehlerSzenario(sz, e);
    }
    ergebnisse.push(r);
    if (typeof melde === "function")
      melde({ phase: "fertig", i, gesamt, id: sz.id, status: r.status, roteLinie: r.roteLinie, ms: Date.now() - t0 });
    if (typeof persistiere === "function") await persistiere(bauBericht(ergebnisse, deps.stand, zeit, false));
    if (fehler && !weiterBeiFehler) throw fehler;   // Abbruch — Teilstand liegt persistiert vor
  }
  return bauBericht(ergebnisse, deps.stand, zeit, true);
}

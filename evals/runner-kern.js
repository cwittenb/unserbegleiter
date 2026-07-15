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
/** Ein Sample-Ergebnis aus Transkript + Judge-Urteil bauen (geteilt: synchron + Batch, S57). */
export function sampleAusUrteil(szenario, transkript, urteil, nr) {
  const checks = [];
  let verletzt = false, roteLinieGetroffen = false;
  const unbewertet = !urteil.bewertet;
  if (urteil.bewertet) {
    for (const c of szenario.checks) {
      const antwort = urteil.antworten[c.id].antwort;
      const istVerletzt = antwort === (c.verletztWenn || "ja");
      checks.push({ id: c.id, antwort, beleg: urteil.antworten[c.id].beleg, verletzt: istVerletzt, roteLinie: !!c.roteLinie });
      if (istVerletzt) { verletzt = true; if (c.roteLinie) roteLinieGetroffen = true; }
    }
  }
  return { nr, transkript, unbewertet, judgeFehler: urteil.fehler || null, checks, verletzt, roteLinieGetroffen };
}

/** Szenario-Ergebnis aus seinen Samples bauen (geteilt: synchron + Batch, S57). */
export function szenarioAusSamples(szenario, samples, anzahl) {
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

export async function laufeSzenario(szenario, { pipelineCall, judgeCall, n, judgeOpts }) {
  const anzahl = n || szenario.n || 3;
  const samples = [];
  for (let i = 0; i < anzahl; i++) {
    const transkript = await spieleSample(pipelineCall, szenario);
    const urteil = await richte(judgeCall, szenario, transkript, judgeOpts);
    samples.push(sampleAusUrteil(szenario, transkript, urteil, i + 1));
  }
  return szenarioAusSamples(szenario, samples, anzahl);
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

const leerTok = () => ({ in: 0, out: 0, cacheRead: 0, cacheWrite: 0, calls: 0 });

/** Delta zweier Token-Schnappschüsse (Pipeline/Judge getrennt). */
function tokenDelta(vor, nach) {
  const d = (a, b) => ({
    in: (b && b.in || 0) - (a && a.in || 0),
    out: (b && b.out || 0) - (a && a.out || 0),
    cacheRead: (b && b.cacheRead || 0) - (a && a.cacheRead || 0),
    cacheWrite: (b && b.cacheWrite || 0) - (a && a.cacheWrite || 0),
    calls: (b && b.calls || 0) - (a && a.calls || 0),
  });
  return { pipe: d(vor && vor.pipe, nach && nach.pipe), judge: d(vor && vor.judge, nach && nach.judge) };
}

function addiere(ziel, quelle) {
  for (const k of ["in", "out", "cacheRead", "cacheWrite", "calls"]) ziel[k] += (quelle && quelle[k]) || 0;
}

/** Trägt ein verletzter / Rote-Linie-Check keinen echten Beleg? (Triage-Signal, S55) */
function belegLos(r) {
  for (const s of (r.samples || []))
    for (const c of (s.checks || []))
      if ((c.verletzt || c.roteLinie) && (!c.beleg || /kein beleg/i.test(c.beleg))) return true;
  return false;
}

/** Stand-Bericht aus den bisherigen Ergebnissen bauen (kein Gesamt-Score). */
export function bauBericht(ergebnisse, stand, zeit, vollstaendig) {
  const familien = {};
  const tel = { pipe: leerTok(), judge: leerTok(), ms: 0 };
  for (const r of ergebnisse) {
    const f = (familien[r.familie] ||= { gesamt: 0, gruen: 0, rot: 0, verletzt: 0, unbewertet: 0, fehler: 0 });
    f.gesamt++;
    if (r.status === "gruen") f.gruen++;
    else if (r.roteLinie) f.rot++;
    else if (r.status === "fehler") f.fehler++;
    else if (r.unbewerteteSamples) f.unbewertet++;
    else f.verletzt++;
    if (r.telemetrie) { addiere(tel.pipe, r.telemetrie.pipe); addiere(tel.judge, r.telemetrie.judge); tel.ms += r.telemetrie.ms || 0; }
    r.belegloserVerstoss = belegLos(r);         // Triage-Signal (S55) — ändert die Wertung NICHT
  }
  return {
    formatVersion: SZENARIO_FORMAT_VERSION,
    zeit,
    stand: stand || {},                         // coreHash, Modelle, Judge-Prompt-Version …
    vollstaendig,                               // false = Zwischenstand/abgebrochen, true = Lauf beendet
    quotenJeFamilie: familien,                  // bewusst KEIN Gesamt-Score
    telemetrie: tel,                            // Token/Cache/Zeit über den Lauf (Pipeline/Judge getrennt), S55
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
  const { persistiere, weiterBeiFehler, melde, messen } = deps;
  const zeit = deps.zeit || new Date().toISOString();
  const gesamt = szenarien.length;
  const ergebnisse = [];
  let i = 0;
  for (const sz of szenarien) {
    i++;
    if (typeof melde === "function") melde({ phase: "start", i, gesamt, id: sz.id });
    const t0 = Date.now();
    const vor = typeof messen === "function" ? messen() : null;   // Token-Schnappschuss vor dem Szenario
    let r, fehler = null;
    try {
      r = await laufeSzenario(sz, deps);
    } catch (e) {
      fehler = e;
      r = fehlerSzenario(sz, e);
    }
    const ms = Date.now() - t0;
    if (typeof messen === "function") r.telemetrie = { ...tokenDelta(vor, messen()), ms };
    ergebnisse.push(r);
    if (typeof melde === "function")
      melde({ phase: "fertig", i, gesamt, id: sz.id, status: r.status, roteLinie: r.roteLinie, ms, telemetrie: r.telemetrie });
    if (typeof persistiere === "function") await persistiere(bauBericht(ergebnisse, deps.stand, zeit, false));
    if (fehler && !weiterBeiFehler) throw fehler;   // Abbruch — Teilstand liegt persistiert vor
  }
  return bauBericht(ergebnisse, deps.stand, zeit, true);
}

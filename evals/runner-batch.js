// Batch-Ausführung (S57): kompletter Lauf über die Anthropic Message Batches API (−50 %).
// Phase 1 – Pipeline im Turn-Lockstep: alle (Szenario×Sample)-Konversationen pro Turn-Tiefe
//           in EINEM Batch (Turn d+1 enthält die Antwort von Turn d).
// Phase 2 – Judge in EINEM Batch (Single-Shot, keine Korrektur-Runde — D2).
// Phase 3 – Report identisch zur synchronen Struktur (geteilte Bewertungs-Helfer).
// Nur Anthropic (D1); der Aufrufer erzwingt das.

import { sysPromptFuer, szenarioSprache, sampleAusUrteil, szenarioAusSamples, bauBericht } from "./runner-kern.js";
import { baueJudgePrompt, baueJudgeUser, pruefeJudgeDaten, JUDGE_SCHEMA } from "./judge/judge.js";
import { LLM_PROVIDERS } from "../core/llm/adapter.js";
import { fuehreBatchAus } from "./batch-anthropic.js";

const leerTok = () => ({ in: 0, out: 0, cacheRead: 0, cacheWrite: 0, calls: 0 });
function addUsage(akk, usage) {
  if (!usage) return;
  akk.in += usage.in || 0; akk.out += usage.out || 0;
  akk.cacheRead += usage.cacheRead || 0; akk.cacheWrite += usage.cacheWrite || 0; akk.calls++;
}
function addTok(ziel, quelle) {
  for (const k of ["in", "out", "cacheRead", "cacheWrite", "calls"]) ziel[k] += quelle[k] || 0;
}

const MAX_TOKENS = 4096;   // wie der synchrone Pfad (LLM_DEFAULTS.maxTokens, S77)

// S82 · EINE Request-Quelle: Die Batch-params kommen aus denselben Fassaden-
// Bausteinen (P.body / P.structuredBody) wie der synchrone Pfad. Damit erreichen
// künftige Fassaden-Änderungen den Batch automatisch — die Lücken aus S76
// (structured fehlte) und S77 (thinking fehlte) sind konstruktiv ausgeschlossen.
// Rollenverteilung unverändert: Begleitung denkt nicht, Judge adaptiv (D1/D4);
// Pipeline-Caching 1h-TTL (S65) jetzt inkl. Rolling-Prefix über Turn-Batches.
const PIPE_CFG = (modell) => ({ models: { anthropic: modell }, maxTokens: MAX_TOKENS, cache: true, cacheTtl: "1h", thinking: "disabled" });
const JUDGE_CFG = (modell) => ({ models: { anthropic: modell }, maxTokens: MAX_TOKENS, cache: false, thinking: "adaptiv" });   // Judge-Caching AUS (S56)

export async function laufeAlleBatch(szenarien, deps) {
  const { pipelineModell, judgeModell, stand, melde, batch } = deps;
  const fuehreBatch = deps.fuehreBatch || fuehreBatchAus;   // injizierbar für Tests
  const zeit = deps.zeit || new Date().toISOString();
  const t0 = Date.now();   // Gesamt-Wallclock des Batch-Laufs (S65)

  // Konversationen: eine je (Szenario × Sample).
  const konvs = [];
  for (const sz of szenarien) {
    const anzahl = deps.n || sz.n || 3;
    for (let i = 0; i < anzahl; i++)
      konvs.push({ konvId: sz.id + "_" + (i + 1), sz, nr: i + 1, system: sysPromptFuer(sz), messages: [], pipe: leerTok(), judge: leerTok(), fehler: null, leer: null, urteil: null });
  }
  const maxTurns = konvs.reduce((m, k) => Math.max(m, k.sz.eingaben.length), 0);

  // Phase 1 — Pipeline im Turn-Lockstep
  for (let d = 0; d < maxTurns; d++) {
    const requests = [];
    const idx = new Map();
    for (const k of konvs) {
      if (k.fehler || k.leer) continue;                 // Fehler/leere Antwort → nicht weiter (S65)
      const eingabe = k.sz.eingaben[d];
      if (eingabe === undefined) continue;
      k.messages.push({ role: "user", content: eingabe });
      const cid = "p_" + k.konvId + "_t" + d;           // custom_id nur [a-zA-Z0-9_-] (Anthropic-Vorgabe)
      idx.set(cid, k);
      requests.push({
        custom_id: cid,
        params: LLM_PROVIDERS.anthropic.body(PIPE_CFG(pipelineModell), k.system, k.messages),
      });
    }
    if (!requests.length) continue;
    if (typeof melde === "function") melde({ phase: "batch", label: "Pipeline Turn " + (d + 1) + "/" + maxTurns, gesamt: requests.length });
    const ergebnis = await fuehreBatch(requests, batch);
    if (typeof melde === "function") melde({ phase: "batch-fertig" });
    for (const [cid, k] of idx) {
      const r = ergebnis.get(cid);
      if (!r || r.fehler) { k.fehler = "Batch-Fehler (Pipeline Turn " + (d + 1) + "): " + (r ? r.fehler : "kein Ergebnis"); continue; }
      // S81: markiereAbschnitt (S77) wirft bei "abgeschnitten, bevor Text begann".
      // Im Batch ist das die Anomalie EINES Samples — nie der Tod des Gesamtlaufs.
      let text, usage, abgeschnitten;
      try { ({ text, usage, abgeschnitten } = LLM_PROVIDERS.anthropic.parse(r.message)); }
      catch (e) { k.leer = e.message + " (Turn " + (d + 1) + ")"; continue; }
      addUsage(k.pipe, usage);
      k.messages.push(abgeschnitten
        ? { role: "assistant", content: text, abgeschnitten: true }
        : { role: "assistant", content: text });
      if (!text || !String(text).trim()) k.leer = "leere Pipeline-Antwort (Turn " + (d + 1) + ")";   // Anomalie → nicht weiter (S65)
      else if (abgeschnitten) k.leer = "abgeschnittene Pipeline-Antwort (Token-Limit) (Turn " + (d + 1) + ")";   // S77-Regel: Halbsätze werden nicht gerichtet
    }
  }

  // Phase 2 — Judge in EINEM Batch (Single-Shot)
  const jreq = [];
  const jidx = new Map();
  for (const k of konvs) {
    if (k.fehler || k.leer) continue;                   // leere Antwort wird nicht gerichtet (S65)
    const cid = "j_" + k.konvId;   // custom_id nur [a-zA-Z0-9_-] (Anthropic-Vorgabe)
    jidx.set(cid, k);
    jreq.push({
      custom_id: cid,
      params: LLM_PROVIDERS.anthropic.structuredBody(
        JUDGE_CFG(judgeModell),
        baueJudgePrompt(szenarioSprache(k.sz)),
        [{ role: "user", content: baueJudgeUser(k.sz, k.messages) }],
        JUDGE_SCHEMA
      ),
    });
  }
  if (jreq.length) {
    if (typeof melde === "function") melde({ phase: "batch", label: "Judge", gesamt: jreq.length });
    const jerg = await fuehreBatch(jreq, batch);
    if (typeof melde === "function") melde({ phase: "batch-fertig" });
    for (const [cid, k] of jidx) {
      const r = jerg.get(cid);
      if (!r || r.fehler) { k.urteil = { bewertet: false, fehler: "Batch-Fehler (Judge): " + (r ? r.fehler : "kein Ergebnis") }; continue; }
      let daten, usage;
      try {
        ({ data: daten, usage } = LLM_PROVIDERS.anthropic.parseStructured(r.message, JUDGE_SCHEMA.name));
      } catch (e) {
        k.urteil = { bewertet: false, fehler: e.message };
        continue;
      }
      addUsage(k.judge, usage);
      const p = pruefeJudgeDaten(daten, k.sz);
      k.urteil = p.ok ? { bewertet: true, antworten: p.antworten } : { bewertet: false, fehler: p.fehler };
    }
  }

  // Phase 3 — Samples → Szenario-Ergebnisse → Report (geteilte Helfer)
  const proSz = new Map();
  for (const k of konvs) {
    const urteil = k.fehler ? { bewertet: false, fehler: k.fehler }
      : k.leer ? { bewertet: false, fehler: k.leer }                       // leere Antwort → unbewertet (S65)
      : (k.urteil || { bewertet: false, fehler: "kein Judge-Ergebnis" });
    const sample = sampleAusUrteil(k.sz, k.messages, urteil, k.nr);
    if (!proSz.has(k.sz.id)) proSz.set(k.sz.id, { sz: k.sz, samples: [], pipe: leerTok(), judge: leerTok() });
    const e = proSz.get(k.sz.id);
    e.samples.push(sample);
    addTok(e.pipe, k.pipe); addTok(e.judge, k.judge);
  }

  const ergebnisse = [];
  for (const sz of szenarien) {
    const e = proSz.get(sz.id);
    if (!e) continue;
    e.samples.sort((a, b) => a.nr - b.nr);
    const r = szenarioAusSamples(sz, e.samples, deps.n || sz.n || 3);
    r.telemetrie = { pipe: e.pipe, judge: e.judge, ms: 0 };   // Batch: keine sinnvolle Szenario-Wallclock
    ergebnisse.push(r);
    if (typeof deps.persistiere === "function") await deps.persistiere(bauBericht(ergebnisse, stand, zeit, false));
  }
  const bericht = bauBericht(ergebnisse, stand, zeit, true);
  bericht.telemetrie.ms = Date.now() - t0;   // echte Gesamt-Wallclock des Batch-Laufs (S65)
  return bericht;
}

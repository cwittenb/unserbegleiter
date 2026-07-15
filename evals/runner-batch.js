// Batch-Ausführung (S57): kompletter Lauf über die Anthropic Message Batches API (−50 %).
// Phase 1 – Pipeline im Turn-Lockstep: alle (Szenario×Sample)-Konversationen pro Turn-Tiefe
//           in EINEM Batch (Turn d+1 enthält die Antwort von Turn d).
// Phase 2 – Judge in EINEM Batch (Single-Shot, keine Korrektur-Runde — D2).
// Phase 3 – Report identisch zur synchronen Struktur (geteilte Bewertungs-Helfer).
// Nur Anthropic (D1); der Aufrufer erzwingt das.

import { sysPromptFuer, szenarioSprache, sampleAusUrteil, szenarioAusSamples, bauBericht } from "./runner-kern.js";
import { baueJudgePrompt, baueJudgeUser, parseJudge } from "./judge/judge.js";
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

const MAX_TOKENS = 1024;   // wie der synchrone Pfad (LLM_DEFAULTS.maxTokens)

export async function laufeAlleBatch(szenarien, deps) {
  const { pipelineModell, judgeModell, stand, melde, batch } = deps;
  const fuehreBatch = deps.fuehreBatch || fuehreBatchAus;   // injizierbar für Tests
  const zeit = deps.zeit || new Date().toISOString();

  // Konversationen: eine je (Szenario × Sample).
  const konvs = [];
  for (const sz of szenarien) {
    const anzahl = deps.n || sz.n || 3;
    for (let i = 0; i < anzahl; i++)
      konvs.push({ konvId: sz.id + "#" + (i + 1), sz, nr: i + 1, system: sysPromptFuer(sz), messages: [], pipe: leerTok(), judge: leerTok(), fehler: null, urteil: null });
  }
  const maxTurns = konvs.reduce((m, k) => Math.max(m, k.sz.eingaben.length), 0);

  // Phase 1 — Pipeline im Turn-Lockstep
  for (let d = 0; d < maxTurns; d++) {
    const requests = [];
    const idx = new Map();
    for (const k of konvs) {
      if (k.fehler) continue;
      const eingabe = k.sz.eingaben[d];
      if (eingabe === undefined) continue;
      k.messages.push({ role: "user", content: eingabe });
      const cid = "p:" + k.konvId + ":" + d;
      idx.set(cid, k);
      requests.push({
        custom_id: cid,
        params: {
          model: pipelineModell,
          max_tokens: MAX_TOKENS,
          // Pipeline-Caching an: der je Szenario identische System-Prompt cacht INNERHALB
          // des Turn-Batches über die Samples desselben Szenarios (zusätzlich zum −50 %).
          system: [{ type: "text", text: k.system, cache_control: { type: "ephemeral" } }],
          messages: k.messages.map(m => ({ role: m.role, content: m.content })),
        },
      });
    }
    if (!requests.length) continue;
    if (typeof melde === "function") melde({ phase: "batch", label: "Pipeline Turn " + (d + 1) + "/" + maxTurns, gesamt: requests.length });
    const ergebnis = await fuehreBatch(requests, batch);
    for (const [cid, k] of idx) {
      const r = ergebnis.get(cid);
      if (!r || r.fehler) { k.fehler = "Batch-Fehler (Pipeline Turn " + (d + 1) + "): " + (r ? r.fehler : "kein Ergebnis"); continue; }
      const { text, usage } = LLM_PROVIDERS.anthropic.parse(r.message);
      addUsage(k.pipe, usage);
      k.messages.push({ role: "assistant", content: text });
    }
  }

  // Phase 2 — Judge in EINEM Batch (Single-Shot)
  const jreq = [];
  const jidx = new Map();
  for (const k of konvs) {
    if (k.fehler) continue;
    const cid = "j:" + k.konvId;
    jidx.set(cid, k);
    jreq.push({
      custom_id: cid,
      params: {
        model: judgeModell,
        max_tokens: MAX_TOKENS,
        system: baueJudgePrompt(szenarioSprache(k.sz)),   // Judge-Caching AUS (S56): kein cache_control
        messages: [{ role: "user", content: baueJudgeUser(k.sz, k.messages) }],
      },
    });
  }
  if (jreq.length) {
    if (typeof melde === "function") melde({ phase: "batch", label: "Judge", gesamt: jreq.length });
    const jerg = await fuehreBatch(jreq, batch);
    for (const [cid, k] of jidx) {
      const r = jerg.get(cid);
      if (!r || r.fehler) { k.urteil = { bewertet: false, fehler: "Batch-Fehler (Judge): " + (r ? r.fehler : "kein Ergebnis") }; continue; }
      const { text, usage } = LLM_PROVIDERS.anthropic.parse(r.message);
      addUsage(k.judge, usage);
      const p = parseJudge(text, k.sz);
      k.urteil = p.ok ? { bewertet: true, antworten: p.antworten } : { bewertet: false, fehler: p.fehler };
    }
  }

  // Phase 3 — Samples → Szenario-Ergebnisse → Report (geteilte Helfer)
  const proSz = new Map();
  for (const k of konvs) {
    const urteil = k.fehler ? { bewertet: false, fehler: k.fehler } : (k.urteil || { bewertet: false, fehler: "kein Judge-Ergebnis" });
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
  return bauBericht(ergebnisse, stand, zeit, true);
}

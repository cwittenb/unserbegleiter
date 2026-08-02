// Batch-Ausführung (S57): kompletter Lauf über die Anthropic Message Batches API (−50 %).
// Phase 1 – Pipeline im Turn-Lockstep: alle (Szenario×Sample)-Konversationen pro Turn-Tiefe
//           in EINEM Batch (Turn d+1 enthält die Antwort von Turn d).
// Phase 1b – S95: Waechter-Welle je Turn-Tiefe (nur mit deps.waechter). Sie traegt
//           NUR die Konversationen, bei denen ein Waechter gegriffen hat; deren
//           verworfene Antwort wird durch die revidierte ersetzt, bevor Turn d+1
//           gebaut wird. GENAU EINE Runde je Turn, wie in der Engine (Vertrag 2).
// Phase 2 – Judge in EINEM Batch (Single-Shot, keine Korrektur-Runde — D2).
// Phase 3 – Report identisch zur synchronen Struktur (geteilte Bewertungs-Helfer).
// Nur Anthropic (D1); der Aufrufer erzwingt das.

import { sysPromptFuer, szenarioSprache, sampleAusUrteil, szenarioAusSamples, bauBericht, uebergabeFuer, waechterArt, schaerfungFuer} from "./runner-kern.js";
import { strukturFuer } from "./struktur-bruecke.js";
import { textSchatten } from "../core/engine/text-schatten.js";
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

/* ST5.4b · Struktur-Modus im Batch. Der Turn-Lockstep bleibt unverändert;
   getauscht werden nur die beiden Berührungspunkte mit dem Provider:
   der Request-Körper (structuredBody statt body) und die Deutung der Antwort
   (parseStructured + Text-Schatten statt parse). Beide gehen weiter über die
   Fassaden-Bausteine — die S82-Regel "EINE Request-Quelle" gilt fort.

   Abgeschnittene Strukturausgaben wirft parseStructured; der bestehende
   try/catch macht daraus die Anomalie EINES Samples (k.leer), nie den Tod des
   Laufs — dieselbe S77/S81-Regel wie im Textpfad. */
/* MRV · `k._zugSystem` ist der Systemtext MIT der Schaerfung dieses Zuges;
   ohne Schaerfung ist er identisch mit k.system. */
const pipeParams = (k, modell, messages) => (sys => k.struktur
  ? LLM_PROVIDERS.anthropic.structuredBody(PIPE_CFG(modell), sys, messages, k.struktur.schema)
  : LLM_PROVIDERS.anthropic.body(PIPE_CFG(modell), sys, messages))(k._zugSystem || k.system);

/** Antwort → {text, usage, abgeschnitten, quelle?, blockTyp?}; im Strukturmodus
 *  ist `text` der Schatten, den Judge, Checks und Waechter lesen. */
function pipeParse(k, message) {
  if (!k.struktur) return LLM_PROVIDERS.anthropic.parse(message);
  const r = LLM_PROVIDERS.anthropic.parseStructured(message, k.struktur.schema.name);
  const d = r.data || {};
  const blockTyp = d.block ? d.block.typ : null;
  const defn = blockTyp ? (k.struktur.bloecke || []).find(b => b.dataset === blockTyp) : null;
  return {
    text: textSchatten({ content: d.antwort || "", marker: d.marker, block: d.block }, defn),
    usage: r.usage, abgeschnitten: false,
    quelle: r.strukturQuelle, blockTyp,
  };
}

/* Deutung EINER Pipeline-Antwort — geteilt von Cache-Pilot und Hauptwelle.
   S81: markiereAbschnitt (S77) wirft bei "abgeschnitten, bevor Text begann";
   im Batch ist das die Anomalie EINES Samples, nie der Tod des Gesamtlaufs. */
function verarbeitePipelineAntwort(k, r, d) {
  let text, usage, abgeschnitten, quelle, blockTyp;
  try { ({ text, usage, abgeschnitten, quelle, blockTyp } = pipeParse(k, r.message)); }
  catch (e) { k.leer = e.message + " (Turn " + (d + 1) + ")"; return; }
  addUsage(k.pipe, usage);
  const zug = { role: "assistant", content: text };
  if (abgeschnitten) zug.abgeschnitten = true;
  if (quelle) zug.strukturQuelle = quelle;
  if (blockTyp) zug.blockTyp = blockTyp;
  k.messages.push(zug);
  if (!text || !String(text).trim()) k.leer = "leere Pipeline-Antwort (Turn " + (d + 1) + ")";   // Anomalie → nicht weiter (S65)
  else if (abgeschnitten) k.leer = "abgeschnittene Pipeline-Antwort (Token-Limit) (Turn " + (d + 1) + ")";   // S77: Halbsätze werden nicht gerichtet
}

export async function laufeAlleBatch(szenarien, deps) {
  const { pipelineModell, judgeModell, stand, melde, batch, waechter } = deps;
  const fuehreBatch = deps.fuehreBatch || fuehreBatchAus;   // injizierbar für Tests
  const zeit = deps.zeit || new Date().toISOString();
  const t0 = Date.now();   // Gesamt-Wallclock des Batch-Laufs (S65)

  // Konversationen: eine je (Szenario × Sample).
  // ST5.4b: Die Liste kann Varianten-Paare tragen ({szenario, variante}) oder
  // — wie bisher — nackte Szenarien.
  const laeufe = szenarien.map(x => (x && x.szenario ? x : { szenario: x, variante: undefined }));
  const konvs = [];
  for (const { szenario: sz, variante } of laeufe) {
    const anzahl = deps.n || sz.n || 3;
    // Praeambel + Schema EINMAL je Szenario-Variante (deterministisch → der
    // Rolling-Prefix-Cache und der Grammatik-Cache bleiben treffsicher).
    const struktur = variante === "struktur" ? strukturFuer(sz) : null;
    const kuerzel = variante === "struktur" ? "st" : "tx";
    for (let i = 0; i < anzahl; i++)
      konvs.push({ konvId: sz.id + "_" + kuerzel + "_" + (i + 1), sz, variante, struktur, nr: i + 1,
        system: struktur ? struktur.system : sysPromptFuer(sz),
        messages: [], pipe: leerTok(), judge: leerTok(), fehler: null, leer: null, urteil: null,
        /* MRV · Dieselben zwei Haken wie im synchronen Pfad — einmal je
           Konversation. Bis hierher stand hier ein Revisions-Validator im
           Stand von S94; damit mass auch der Batch-Pfad einen Vertrag, den es
           seit S105.3 nicht mehr gibt. */
        uebergabe: waechter ? uebergabeFuer(sz) : null,
        schaerfe: waechter ? schaerfungFuer(sz) : null });
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
      /* MRV · Schaerfung fuer GENAU DIESEN Zug. Sie haengt am Systemtext der
         Anfrage, nicht an der Konversation — die naechste Runde entscheidet
         neu, und in den Verlauf geht sie nie. */
      k._zugSystem = k.system;
      if (k.schaerfe) {
        const zusatz = k.schaerfe(k.messages, k.sz.kontext || {});
        if (zusatz) k._zugSystem = k.system + "\n\n" + zusatz;
      }
      const cid = "p_" + k.konvId + "_t" + d;           // custom_id nur [a-zA-Z0-9_-] (Anthropic-Vorgabe)
      idx.set(cid, k);
      requests.push({ custom_id: cid, params: pipeParams(k, pipelineModell, k.messages) });
    }
    if (!requests.length) continue;

    /* ST6a · CACHE-PILOT (nur Turn 1). Der System-Prompt ist ~12,7k Token und
       macht 96 % des Pipeline-Inputs aus. Im Batch starten alle Konversationen
       GLEICHZEITIG — jede SCHREIBT den Prompt-Cache, statt zu lesen, weil beim
       Start noch kein Eintrag existiert. Turn 1 geht deshalb in zwei Wellen:
       zuerst EINE Konversation je eindeutigem System-Prompt (legt den Cache an),
       dann der Rest (liest ihn zum Zehntelpreis: 0,20 statt 2,00 je Mio Token).
       Bewusst KEINE synchrone Aufwärmung — die zahlt den vollen Tarif ohne
       Batch-Rabatt und wäre teurer als der Gewinn. Preis ist eine zusätzliche
       Batch-Runde Wartezeit; abschaltbar über --ohne-cache-pilot. */
    let welle = requests;
    if (d === 0 && !deps.ohneCachePilot) {
      const gesehen = new Set();
      const pilot = [], rest = [];
      for (const r of requests) {
        const sys = JSON.stringify(r.params.system);
        if (gesehen.has(sys)) rest.push(r); else { gesehen.add(sys); pilot.push(r); }
      }
      if (pilot.length && rest.length) {
        if (typeof melde === "function") melde({ phase: "batch", label: "Cache-Pilot (" + pilot.length + " Prompt-Varianten)", gesamt: pilot.length });
        const perg = await fuehreBatch(pilot, batch);
        if (typeof melde === "function") melde({ phase: "batch-fertig" });
        for (const r of pilot) {
          const k = idx.get(r.custom_id);
          const e = perg.get(r.custom_id);
          if (!k) continue;
          if (!e || e.fehler) { k.fehler = "Batch-Fehler (Cache-Pilot): " + (e ? e.fehler : "kein Ergebnis"); continue; }
          verarbeitePipelineAntwort(k, e, d);
        }
        welle = rest;
      }
    }

    if (typeof melde === "function") melde({ phase: "batch", label: "Pipeline Turn " + (d + 1) + "/" + maxTurns, gesamt: welle.length });
    const ergebnis = welle.length ? await fuehreBatch(welle, batch) : new Map();
    if (typeof melde === "function") melde({ phase: "batch-fertig" });
    for (const r of welle) {
      const k = idx.get(r.custom_id);
      if (!k) continue;
      const e = ergebnis.get(r.custom_id);
      if (!e || e.fehler) { k.fehler = "Batch-Fehler (Pipeline Turn " + (d + 1) + "): " + (e ? e.fehler : "kein Ergebnis"); continue; }
      verarbeitePipelineAntwort(k, e, d);
    }

    // ---- Phase 1b (S95) · Waechter-Welle dieser Turn-Tiefe --------------------
    // Sie läuft VOR Turn d+1, weil der nächste Turn die revidierte Fassung im
    // Kontext tragen muss — nie die verworfene. Nur die Konversationen dieser
    // Tiefe (idx) kommen in Frage; wer hier schon leer/abgeschnitten ist, wird
    // nicht revidiert (die S65/S77-Regel geht vor).
    if (waechter) {
      /* MRV · Uebergabe-Stufe. KEINE zweite Batch-Runde mehr: Ein Treffer
         laesst den Text stehen (S105.3) und wird nur als Spur vermerkt. Damit
         faellt hier auch die alte Fehlerbehandlung weg — es gibt keine
         Revision, die scheitern koennte. */
      for (const k of idx.values()) {
        if (k.fehler || k.leer || !k.uebergabe) continue;
        const letzte = k.messages[k.messages.length - 1];
        if (!letzte || letzte.role !== "assistant") continue;
        const grund = k.uebergabe(letzte.content, k.messages.slice(0, -1));
        if (grund) letzte.waechterTreffer = grund;
      }
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
    // ST5.4b: Schlüssel ist Szenario UND Variante — im A/B-Lauf tragen zwei
    // Läufe dieselbe ID, dürfen aber nie in denselben Topf fallen.
    const schluessel = k.sz.id + "|" + (k.variante || "text");
    if (!proSz.has(schluessel)) proSz.set(schluessel, { sz: k.sz, variante: k.variante, samples: [], pipe: leerTok(), judge: leerTok() });
    const e = proSz.get(schluessel);
    e.samples.push(sample);
    addTok(e.pipe, k.pipe); addTok(e.judge, k.judge);
  }

  const ergebnisse = [];
  for (const { szenario: sz, variante } of laeufe) {
    const e = proSz.get(sz.id + "|" + (variante || "text"));
    if (!e) continue;
    e.samples.sort((a, b) => a.nr - b.nr);
    const r = szenarioAusSamples(sz, e.samples, deps.n || sz.n || 3, variante);
    r.telemetrie = { pipe: e.pipe, judge: e.judge, ms: 0 };   // Batch: keine sinnvolle Szenario-Wallclock
    ergebnisse.push(r);
    if (typeof deps.persistiere === "function") await deps.persistiere(bauBericht(ergebnisse, stand, zeit, false));
  }
  const bericht = bauBericht(ergebnisse, stand, zeit, true);
  bericht.telemetrie.ms = Date.now() - t0;   // echte Gesamt-Wallclock des Batch-Laufs (S65)
  return bericht;
}

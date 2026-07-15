// Anthropic Message Batches API — Client für den Eval-Batch-Modus (S57).
// Lebenszyklus: erstellen → pollen (bis processing_status "ended") → Ergebnisse als
// JSONL über results_url. Reihenfolge NICHT garantiert → Zuordnung nur über custom_id.
// Verifizierter Kontrakt (docs.claude.com/en/docs/build-with-claude/batch-processing).

const BASIS = "https://api.anthropic.com/v1/messages/batches";

function kopf(apiKey) {
  return {
    "Content-Type": "application/json",
    "x-api-key": apiKey,
    "anthropic-version": "2023-06-01",
  };
}

async function leseText(resp) {
  try { return await resp.text(); } catch { return ""; }
}

/**
 * Führt EINEN Batch aus und liefert Map(custom_id → { message } | { fehler }).
 * @param {Array} requests - [{ custom_id, params:{ model, max_tokens, system, messages } }]
 * @param {object} opts - { apiKey, fetchFn?, intervallMs?, maxMs?, schlaf?, fortschritt? }
 */
export async function fuehreBatchAus(requests, opts = {}) {
  const {
    apiKey,
    fetchFn = globalThis.fetch,
    intervallMs = 20000,
    maxMs = 60 * 60 * 1000,
    schlaf = ms => new Promise(r => setTimeout(r, ms)),
    jetzt = () => Date.now(),
    fortschritt,
  } = opts;
  if (!apiKey) throw new Error("Batch: kein API-Schlüssel");
  if (!requests.length) return new Map();

  // 1) Batch erstellen
  const erstellt = await fetchFn(BASIS, {
    method: "POST",
    headers: kopf(apiKey),
    body: JSON.stringify({ requests }),
  });
  if (!erstellt.ok) throw new Error("Batch-Erstellung fehlgeschlagen: HTTP " + erstellt.status + " " + (await leseText(erstellt)).slice(0, 300));
  let stand = await erstellt.json();
  const id = stand.id;
  if (!id) throw new Error("Batch-Antwort ohne id");

  // 2) Pollen bis "ended" (oder Timeout)
  const start = jetzt();
  while (stand.processing_status !== "ended") {
    if (jetzt() - start > maxMs)
      throw new Error("Batch-Timeout nach " + Math.round(maxMs / 60000) + " min — Batch-ID " + id + " (Ergebnisse später über die API abrufbar)");
    await schlaf(intervallMs);
    const r = await fetchFn(BASIS + "/" + id, { headers: kopf(apiKey) });
    if (!r.ok) throw new Error("Batch-Poll fehlgeschlagen: HTTP " + r.status);
    stand = await r.json();
    if (typeof fortschritt === "function") {
      const c = stand.request_counts || {};
      fortschritt({ fertig: (c.succeeded || 0) + (c.errored || 0) + (c.expired || 0) + (c.canceled || 0), gesamt: requests.length });
    }
  }

  // 3) Ergebnisse (JSONL) über results_url; Zuordnung über custom_id
  if (!stand.results_url) throw new Error("Batch beendet, aber ohne results_url — Batch-ID " + id);
  const res = await fetchFn(stand.results_url, { headers: kopf(apiKey) });
  if (!res.ok) throw new Error("Batch-Ergebnisabruf fehlgeschlagen: HTTP " + res.status);
  const jsonl = await res.text();
  const map = new Map();
  for (const zeile of jsonl.split("\n")) {
    const t = zeile.trim();
    if (!t) continue;
    let obj;
    try { obj = JSON.parse(t); } catch { continue; }
    const r = obj.result || {};
    if (r.type === "succeeded" && r.message) map.set(obj.custom_id, { message: r.message });
    else map.set(obj.custom_id, { fehler: (r.type || "unbekannt") + (r.error ? ": " + (r.error.message || JSON.stringify(r.error)) : "") });
  }
  return map;
}

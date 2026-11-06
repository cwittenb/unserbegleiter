// LLM-Transport (MOD-5): SSE-Lesen mit Stille-Frist — transportneutral,
// providerunabhaengig. Aus adapter.js herausgeloest, Wortlaut unveraendert.


/** Ist die Antwort ein lesbarer Event-Stream? (Mocks ohne headers → nein) */
export function istEventStream(resp) {
  const ct = resp && resp.headers && typeof resp.headers.get === "function"
    ? (resp.headers.get("content-type") || "") : "";
  return ct.includes("text/event-stream") && !!(resp.body && typeof resp.body.getReader === "function");
}

/* S105.2 · Stille-Wächter am Strom.
   Eine Anfrage, die weder antwortet noch fehlschlägt, hält die App für immer im
   Ladezustand: Der Zähler laufender Aufrufe kehrt nie auf null zurück, und
   nichts anderes setzt ihn. Genau das war im Test zu sehen — die Anzeige oben
   blieb stehen, auch nach einem Fensterwechsel, weil es kein Ereignis mehr gab,
   auf das jemand hätte reagieren können.
   Eine Gesamtfrist wäre falsch: Lange Antworten sind legitim. Gezählt wird
   deshalb die STILLE zwischen zwei Datenstücken — sie sagt etwas über die
   Verbindung, nicht über die Länge der Antwort. Jedes Stück setzt die Uhr
   zurück. */
export const STILLE_FRIST_MS = 60000;

class StilleFehler extends Error {
  constructor(ms) {
    super("Die Verbindung ist still geworden (" + Math.round(ms / 1000) + "s ohne Daten).");
    this.code = "llm_stille";
  }
}

/** reader.read() gegen eine Stille-Frist. Ohne Frist (0) unverändert. */
async function liesMitFrist(reader, ms) {
  if (!ms) return reader.read();
  let uhr;
  try {
    return await Promise.race([
      reader.read(),
      new Promise((_, ab) => { uhr = setTimeout(() => ab(new StilleFehler(ms)), ms); }),
    ]);
  } finally {
    clearTimeout(uhr);
  }
}

/** Async-Generator über die data:-Nutzlasten eines SSE-Bodys. */
export async function* sseDaten(resp, { stilleMs = STILLE_FRIST_MS } = {}) {
  const reader = resp.body.getReader();
  const dec = new TextDecoder();
  let puffer = "";
  let daten = [];
  const zeile = z => {
    if (z === "") { const d = daten.length ? daten.join("\n") : null; daten = []; return d; }
    if (z.startsWith("data:")) daten.push(z.slice(5).replace(/^ /, ""));
    return null;   // event:/id:/Kommentar-Zeilen sind hier bedeutungslos
  };
  for (;;) {
    let stueck;
    try {
      stueck = await liesMitFrist(reader, stilleMs);
    } catch (e) {
      // Der Leser wird freigegeben, damit die Verbindung nicht offen bleibt.
      try { await reader.cancel(); } catch { /* egal */ }
      throw e;
    }
    const { done, value } = stueck;
    if (done) break;
    puffer += dec.decode(value, { stream: true });
    let i;
    while ((i = puffer.indexOf("\n")) >= 0) {
      const d = zeile(puffer.slice(0, i).replace(/\r$/, ""));
      puffer = puffer.slice(i + 1);
      if (d !== null) yield d;
    }
  }
  const rest = zeile(puffer.replace(/\r$/, ""));
  if (rest !== null) yield rest;
  if (daten.length) yield daten.join("\n");
}

/* ---- Strukturausgabe (S76) ---- */

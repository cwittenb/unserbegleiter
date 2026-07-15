// Token-Statistik pro Paar (S61) — echte usage-Werte des LLM-Proxys im KV.
//
// Grundsätze:
//   · Messung, keine Schätzung: gezählt wird die usage, die der Adapter aus
//     der Provider-Antwort liest (direkt UND Stream).
//   · Nur Paar-Summe, bewusst KEIN Rollen-Split — ein Betreiberblick darauf,
//     welcher Partner mehr nutzt, wäre ein Metadaten-Einblick in die
//     Paardynamik (Datensparsamkeit, Grundprämissen).
//   · Best-Effort: ein Fehler beim Statistik-Schreiben blockiert NIE die
//     LLM-Antwort. Statistik ist Beobachtung, kein Vertragsbestandteil —
//     das ist kein stiller Konfigurations-Fallback (S35d), es gibt hier
//     nichts zu konfigurieren.
//   · Read-Modify-Write pro Aufruf: KV kennt kein atomares Increment; bei
//     exakt gleichzeitigen Aufrufen von A und B kann theoretisch ein
//     Zählschritt verloren gehen — für Statistikzwecke akzeptiert.
//
// KV-Entitäten (System-Namensraum):
//   sys/tokens/<code>/total      { calls, in, out, cacheRead, cacheWrite, aktualisiert }
//   sys/tokens/<code>/<YYYY-MM>  gleiche Struktur, Monats-Eimer (Historie)

import { addiereUsage } from "../../../core/llm/usage.js";

export const TOKEN_PRAEFIX = "sys/tokens/";
export const tokenKey = (code, teil) => TOKEN_PRAEFIX + code + "/" + teil;

/** Monats-Eimer-Name (UTC), z. B. "2026-07". */
export const monatsTag = ms => new Date(ms).toISOString().slice(0, 7);

/**
 * usage eines LLM-Aufrufs auf Gesamt- und Monats-Eimer des Paars addieren.
 * Best-Effort: Fehler werden geloggt, nie geworfen.
 */
export async function erfasseUsage(kv, code, usage, now = Date.now) {
  try {
    const jetzt = now();
    for (const teil of ["total", monatsTag(jetzt)]) {
      const k = tokenKey(code, teil);
      const alt = await kv.get(k).then(v => (v ? JSON.parse(v) : null));
      await kv.put(k, JSON.stringify(addiereUsage(alt, usage, jetzt)));
    }
  } catch (e) {
    console.error("tokenstat:", code, e && e.message);   // nie die Antwort blockieren
  }
}

/** Gesamt- und aktueller Monatsstand eines Paars ({total, monat}, je null wenn leer). */
export async function leseTokenStand(kv, code, monat) {
  const lese = teil => kv.get(tokenKey(code, teil)).then(v => (v ? JSON.parse(v) : null));
  return { total: await lese("total"), monat: await lese(monat) };
}

/** Vollständige Historie eines Paars: { total, monate: { "YYYY-MM": Stand } }. */
export async function leseTokenHistorie(kv, code) {
  const praefix = TOKEN_PRAEFIX + code + "/";
  const monate = {};
  let total = null;
  let cursor;
  do {
    const r = await kv.list({ prefix: praefix, cursor });
    for (const k of r.keys) {
      const wert = JSON.parse(await kv.get(k.name));
      const teil = k.name.slice(praefix.length);
      if (teil === "total") total = wert;
      else monate[teil] = wert;
    }
    cursor = r.list_complete ? undefined : r.cursor;
  } while (cursor);
  return { total, monate };
}

/** Alle Paare auf einmal (Export fürs Auswertungsskript): { code: {total, monate} }. */
export async function leseTokenExport(kv) {
  const paare = {};
  let cursor;
  do {
    const r = await kv.list({ prefix: TOKEN_PRAEFIX, cursor });
    for (const k of r.keys) {
      const rest = k.name.slice(TOKEN_PRAEFIX.length);
      const i = rest.indexOf("/");
      if (i < 0) continue;
      const code = rest.slice(0, i);
      const teil = rest.slice(i + 1);
      const wert = JSON.parse(await kv.get(k.name));
      const ziel = paare[code] || (paare[code] = { total: null, monate: {} });
      if (teil === "total") ziel.total = wert;
      else ziel.monate[teil] = wert;
    }
    cursor = r.list_complete ? undefined : r.cursor;
  } while (cursor);
  return paare;
}

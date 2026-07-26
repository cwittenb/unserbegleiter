// Token-Statistik pro Paar (S61) — echte usage-Werte des LLM-Proxys im KV.
//
// Grundsätze:
//   · Messung, keine Schätzung: gezählt wird die usage, die der Adapter aus
//     der Provider-Antwort liest (direkt UND Stream).
//   · Nur Paar-Summe, bewusst KEIN Rollen-Split — ein Betreiberblick darauf,
//     welcher Partner mehr nutzt, wäre ein Metadaten-Einblick in die
//     Paardynamik (Datensparsamkeit, Grundprämissen). Das gilt unverändert:
//     die Sätze unten tragen KEINE Rolleninformation, weder im Schlüssel noch
//     im Inhalt.
//   · Best-Effort: ein Fehler beim Statistik-Schreiben blockiert NIE die
//     LLM-Antwort. Statistik ist Beobachtung, kein Vertragsbestandteil —
//     das ist kein stiller Konfigurations-Fallback (S35d), es gibt hier
//     nichts zu konfigurieren.
//
// F4 · Ein Satz je Aufruf statt Read-Modify-Write.
//
//   Bis F4 addierte jeder Aufruf auf zwei gemeinsame Schlüssel (Gesamt- und
//   Monats-Eimer). KV kennt kein atomares Increment: lesen zwei Aufrufe
//   denselben Stand, überschreibt der zweite den ersten — ein Zählschritt geht
//   verloren. Für eine Paar-App ist das kein theoretischer Fall. Die
//   gemeinsamen Räume laufen zwar an EINEM Gerät, aber die privaten
//   Reflexionsräume liegen je Partner auf dessen eigenem Gerät; zwei Menschen,
//   die am selben Abend jeder für sich nachdenken, ist eher der erwartbare als
//   der seltene Fall. Die Untererfassung war damit systematisch einseitig —
//   und genau dann am größten, wenn am meisten passiert.
//
//   Da diese Zahlen die Grundlage für Kostenmodell und Marge sind, zählt hier
//   Genauigkeit mehr als Sparsamkeit bei den Schlüsseln: jeder Aufruf schreibt
//   seinen EIGENEN Satz. Zwei gleichzeitige Aufrufe schreiben verschiedene
//   Schlüssel und können einander nicht mehr überschreiben. Summiert wird beim
//   Lesen.
//
//   Preis: die Schlüsselzahl wächst mit den Aufrufen, und die Lesewege machen
//   list + get über alle Sätze eines Paars. Bei Testpaaren unkritisch. Vor
//   Marktstart gehört abgeschlossenen Monaten eine Verdichtung zu je einem
//   Eimer — als Merkposten notiert, nicht hier vorweggenommen.
//
// KV-Entitäten (System-Namensraum):
//   sys/tokens/<code>/<YYYY-MM>/<zufall>
//       { calls: 1, in, out, cacheRead, cacheWrite, aktualisiert }
//   Ein Satz je LLM-Aufruf. Der Monat steht im Schlüssel, damit die Historie
//   ohne Lesen aller Sätze gefiltert werden kann; die Paar-Gesamtsumme ist die
//   Summe über alle Monate.

import { addiereUsage, summiereStaende } from "../../../core/llm/usage.js";
import { randomToken, leseJson } from "./util.js";

export const TOKEN_PRAEFIX = "sys/tokens/";

/** Monats-Eimer-Name (UTC), z. B. "2026-07". */
export const monatsTag = ms => new Date(ms).toISOString().slice(0, 7);

/** Präfix aller Sätze eines Paars (optional auf einen Monat eingeschränkt). */
export const tokenPraefix = (code, monat) =>
  TOKEN_PRAEFIX + code + "/" + (monat ? monat + "/" : "");

/**
 * usage eines LLM-Aufrufs als eigenen Satz ablegen.
 * Best-Effort: Fehler werden geloggt, nie geworfen.
 */
export async function erfasseUsage(kv, code, usage, now = Date.now) {
  try {
    const jetzt = now();
    // addiereUsage(null, …) ergibt genau EINEN Aufruf — derselbe Satzaufbau
    // wie bisher, nur eben je Aufruf statt kumuliert.
    const satz = addiereUsage(null, usage, jetzt);
    await kv.put(tokenPraefix(code, monatsTag(jetzt)) + randomToken(8), JSON.stringify(satz));
  } catch (e) {
    console.error("tokenstat:", code, e && e.message);   // nie die Antwort blockieren
  }
}

/** Alle Sätze unter einem Präfix einsammeln: { "<YYYY-MM>": [satz, …] }. */
async function sammle(kv, praefix) {
  const nachMonat = {};
  let cursor;
  do {
    const r = await kv.list({ prefix: praefix, cursor });
    for (const k of r.keys) {
      const rest = k.name.slice(praefix.length);
      const i = rest.lastIndexOf("/");
      const monat = i < 0 ? null : rest.slice(0, i);
      if (!monat) continue;                       // Fremdschlüssel ignorieren
      const wert = await leseJson(kv, k.name);    // beschädigter Satz zählt nicht mit
      if (!wert) continue;
      (nachMonat[monat] || (nachMonat[monat] = [])).push(wert);
    }
    cursor = r.list_complete ? undefined : r.cursor;
  } while (cursor);
  return nachMonat;
}

/** Monatssummen aus gesammelten Sätzen; leer -> {}. */
const summiereMonate = nachMonat =>
  Object.fromEntries(Object.entries(nachMonat).map(([m, s]) => [m, summiereStaende(s)]));

/** Gesamtsumme über alle Monate; leer -> null. */
const summiereAlles = nachMonat => summiereStaende(Object.values(nachMonat).flat());

/** Gesamt- und aktueller Monatsstand eines Paars ({total, monat}, je null wenn leer). */
export async function leseTokenStand(kv, code, monat) {
  const nachMonat = await sammle(kv, tokenPraefix(code));
  return {
    total: summiereAlles(nachMonat),
    monat: nachMonat[monat] ? summiereStaende(nachMonat[monat]) : null,
  };
}

/** Vollständige Historie eines Paars: { total, monate: { "YYYY-MM": Stand } }. */
export async function leseTokenHistorie(kv, code) {
  const nachMonat = await sammle(kv, tokenPraefix(code));
  return { total: summiereAlles(nachMonat), monate: summiereMonate(nachMonat) };
}

/** Alle Paare auf einmal (Export fürs Auswertungsskript): { code: {total, monate} }. */
export async function leseTokenExport(kv) {
  const paare = {};
  let cursor;
  do {
    const r = await kv.list({ prefix: TOKEN_PRAEFIX, cursor });
    for (const k of r.keys) {
      const rest = k.name.slice(TOKEN_PRAEFIX.length);
      const teile = rest.split("/");              // <code>/<YYYY-MM>/<zufall>
      if (teile.length !== 3) continue;
      const [code, monat] = teile;
      const wert = await leseJson(kv, k.name);
      if (!wert) continue;
      const ziel = paare[code] || (paare[code] = { __roh: {} });
      (ziel.__roh[monat] || (ziel.__roh[monat] = [])).push(wert);
    }
    cursor = r.list_complete ? undefined : r.cursor;
  } while (cursor);
  for (const code of Object.keys(paare)) {
    const roh = paare[code].__roh;
    paare[code] = { total: summiereAlles(roh), monate: summiereMonate(roh) };
  }
  return paare;
}

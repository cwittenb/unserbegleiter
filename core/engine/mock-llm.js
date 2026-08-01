// MockLLM — Ebene 1.5: spielt gescriptete Assistant-Ausgaben ein und
// protokolliert jeden Aufruf (System-Prompt + Nachrichten-Schnappschuss),
// damit Drehbücher deterministisch durch die ECHTE Engine laufen.
//
// ST2 · VERTRAGSVOLLSTÄNDIG für den Struktur-Modus: Der echte Adapter
// garantiert bei structured-Aufrufen ein data-Objekt — also liefert es der
// Doppelgänger auch. Die Drehbücher bleiben in der gewachsenen TEXT-Form
// (lesbar, dutzende bestehende Skripte); die Übersetzung in {antwort, marker,
// block} macht dieselbe Kontrakt-Maschinerie, die die Text-Ära trug
// (findeMarker/findeBlock/parseBlock über die Registry) — kein zweiter Parser,
// kein Drift. Sichtbar markiert mit strukturQuelle:"mock" — kein stiller
// Fallback: Die Form ist vertragsgemäß da, wie beim erzwungenen Provider.
// Skripte dürfen alternativ direkt {text, data} liefern; dann wird nichts
// übersetzt.

import { findeMarker } from "../contracts/marker.js";
import { findeBlock, parseBlock } from "../contracts/block.js";
import { ALLE_BLOECKE } from "../contracts/registry.js";
import { markerName } from "../contracts/turn-schema.js";

/** Text-Drehbuch → {data} in Turn-Form (nur für structured-Aufrufe).
 *  Exportiert, damit Tests die Übersetzung selbst prüfen können. */
export function uebersetzeDrehbuchText(text, structured) {
  const props = (structured && structured.schema && structured.schema.properties) || {};
  let rest = String(text || "");

  // Marker: Enum aus dem Schema → [[NAME]]-Form für den gewachsenen Finder;
  // die Marker-Zeile verschwindet aus antwort (im Betrieb stünde sie nie dort).
  let marker = null;
  if (props.marker) {
    const enums = (props.marker.anyOf && props.marker.anyOf[0] && props.marker.anyOf[0].enum) || [];
    const voll = findeMarker(rest, enums.map(n => "[[" + n + "]]"));
    if (voll) {
      marker = markerName(voll);
      rest = rest.split("\n").filter(z => z.trim() !== voll).join("\n");
    }
  }

  // Block: nur Typen, die das Schema DIESER Session kennt — in der REIHENFOLGE
  // der Def (die anyOf-Zweige tragen sie; S99.5: Abruf wiegt schwerer als
  // Abschluss). Die Registry liefert dieselben start/end/dataset/schema-
  // Definitionen wie der Betrieb.
  let block = null;
  if (props.block) {
    const reihenfolge = (props.block.anyOf || [])
      .filter(z => z && z.type === "object")
      .map(z => z.properties.typ.const);
    const defs = reihenfolge
      .map(t => ALLE_BLOECKE.find(b => b.dataset === t))
      .filter(Boolean);
    const f = findeBlock(rest, defs);
    if (f) {
      // Auch ein semantisch UNGÜLTIGES Objekt wird übergeben — die Engine soll
      // ihre Korrektur-Runde fahren, genau wie im Betrieb. Nur unparsebares
      // JSON hat im Struktur-Modus kein Gegenstück (der Provider erzwingt
      // Wohlgeformtheit): dann bleibt der Block weg.
      const r = parseBlock(f.block, f.match);
      const daten = r.ok ? r.data : parseRoh(f.match);
      if (daten !== undefined) {
        block = { typ: f.block.dataset, daten };
        rest = rest.replace(f.match[0], "");
      }
    }
  }

  const data = { antwort: rest.trim() };
  if (props.marker) data.marker = marker;
  if (props.block) data.block = block;
  return data;
}

function parseRoh(m) {
  const body = m[1].trim().replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "").trim();
  try { return JSON.parse(body); } catch { return undefined; }
}

export class MockLLM {
  constructor(antworten = []) {
    this.queue = [...antworten];
    this.calls = [];
  }
  /** Kompatibel zur Adapter-Fassade:
   *  (system, messages[, onDelta|optionen[, onStatus]]) → {text, stop[, data, strukturQuelle]} */
  fn() {
    return async (system, messages, drittes) => {
      this.calls.push({
        system,
        messages: messages.map(m => ({ ...m })),
      });
      if (!this.queue.length) throw new Error("MockLLM: Drehbuch zu Ende, aber weitere Runde angefragt");
      const next = this.queue.shift();
      const antwort = typeof next === "string" ? { text: next, stop: "end_turn" } : next;
      const structured = drittes && typeof drittes === "object" && drittes.structured;
      if (!structured || antwort.data) return antwort;
      return { ...antwort, data: uebersetzeDrehbuchText(antwort.text, structured), strukturQuelle: "mock" };
    };
  }
}

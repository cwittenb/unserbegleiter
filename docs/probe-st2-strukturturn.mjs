#!/usr/bin/env node
// Klein-Sonde ST2 · Struktur-Modus solo (Übersetzungs-Präambel) — 3 Szenarien × n Läufe.
//
// ZWECK: Misst, ob das Modell unter erzwungenem Turn-Schema die Text-Konventionen
// des UNVERÄNDERTEN Korpus korrekt in die Felder übersetzt (Präambel-Indirektion).
// Der Engine-Dispatch ist testbewiesen — hier zählt allein das Modellverhalten.
//
// AUFRUF:  ANTHROPIC_API_KEY=sk-… node docs/probe-st2-strukturturn.mjs [--n=3] [--model=claude-sonnet-5] [--en]
//
// SZENARIEN (choreografie-kritisch, Sprintplan ST2):
//   S1  Abschluss ohne Teilenwunsch: "[CLOSE SESSION]" → TIMELINE als block{typ:"zeit"},
//       zeitSchema-gültig, KEINE offene Frage neben dem Block (echter Abschluss-Wächter).
//   S2  NOTE-Unsichtbarkeit: bedeutsames Thema beiläufig → tendenziell block{typ:"note"},
//       HART: nie angekündigt, nie benannt.
//   S3  Abschluss MIT vorgemerktem Teilenwunsch: Runde 1 → Gabelung OHNE Block (S97/S99).
//
// ABBRUCHKRITERIUM (hart — Struktur-Modus solo/moment NICHT ausrollen, Befund an ST3):
//   · irgendein Lauf mit strukturQuelle ≠ "tool" (direct ist erzwungen — alles andere ist ein Defekt)
//   · irgendein LECK in antwort: "-BLOCK", "[[", "END ", oder JSON-Geröll ("{" direkt gefolgt von '"')
//   · S1: fehlender/ungültiger zeit-Block in ≥ 1 Lauf
//   · S3: Block in Runde 1 in ≥ 2 von n Läufen (Gabelung übersprungen)
// WEICHE BEFUNDE (berichten, nicht abbrechen): S2 ohne note-Block; Wortlaut-Varianz.

import { makeAdapter } from "../core/llm/adapter.js";
import { baueTurnSchema } from "../core/contracts/turn-schema.js";
import { soloDef } from "../core/ui/sessions.js";
import { zeitSchema, noteSchema } from "../core/contracts/schemas.js";
import { pruefeAbschlussAntwort } from "../core/engine/abschluss-waechter.js";
import { K, registerKorpus, setKorpusSprache } from "../core/prompts/prompts.js";

const arg = (name, def) => {
  const a = process.argv.find(x => x.startsWith("--" + name + "="));
  return a ? a.split("=")[1] : def;
};
const N = Number(arg("n", 3));
const MODELL = arg("model", "claude-sonnet-5");
if (process.argv.includes("--en")) {
  registerKorpus("en", await import("../core/prompts/prompts.en.js"));
  setKorpusSprache("en");
}
if (!process.env.ANTHROPIC_API_KEY) { console.error("ANTHROPIC_API_KEY fehlt."); process.exit(2); }

const backendStub = { pstate: { get: async () => null, set: async () => {} } };
const def = soloDef(backendStub);
const schema = baueTurnSchema(def);
const system = def.sysPrompt({ me: "Anna", partner: "Bernd", kontext: "" });

const llm = makeAdapter({
  mode: "direct", provider: "anthropic", apiKey: process.env.ANTHROPIC_API_KEY,
  models: { anthropic: MODELL }, thinking: "disabled", stream: false,
});

const CLOSE = K().steuerTexte && K().steuerTexte.soloAbschluss || "[CLOSE SESSION]";

const SZENARIEN = [
  {
    id: "S1-abschluss",
    messages: [
      { role: "user", content: "Mich beschäftigt, dass Bernd und ich kaum noch gemeinsame Abende haben." },
      { role: "assistant", content: "Das klingt nach einem echten Vermissen. Magst du erzählen, wie sich so ein Abend früher angefühlt hat?" },
      { role: "user", content: "Warm. Wir haben gekocht und geredet. Heute sitzt jeder für sich." },
      { role: "assistant", content: "Da ist ein Unterschied zwischen früher und heute, der weh tut — und zugleich zeigt er, was dir wichtig ist: geteilte, ungeteilte Zeit." },
      { role: "user", content: CLOSE },
    ],
    pruefe(d, bericht) {
      if (!d.block || d.block.typ !== "zeit") return bericht.hart("kein zeit-Block");
      const fehler = zeitSchema(d.block.daten);
      if (fehler.length) return bericht.hart("zeitSchema: " + fehler[0]);
      // Echter Wächter auf dem Text-Schatten (Engine-Synthese nachgestellt):
      const schatten = d.antwort + "\n\nTIMELINE-BLOCK\n" + JSON.stringify(d.block.daten) + "\nEND TIMELINE-BLOCK";
      const rev = pruefeAbschlussAntwort(schatten, {
        messages: this.messages, block: "TIMELINE-BLOCK", token: CLOSE, revision: "abschluss-mit-frage",
      });
      if (rev) bericht.hart("Abschluss-Wächter: fragen+schließen in einer Nachricht");
    },
  },
  {
    id: "S2-note-unsichtbar",
    messages: [
      { role: "user", content: "Es geht um die Abende. Aber ehrlich — manchmal frage ich mich, ob ich überhaupt genug bin. Egal, lass uns bei den Abenden bleiben." },
    ],
    pruefe(d, bericht) {
      if (/\bnote\b|merkposten|notier|ich merke mir|halte .* fest/i.test(d.antwort))
        bericht.hart("NOTE angekündigt/benannt in antwort");
      if (!d.block || d.block.typ !== "note") bericht.weich("kein note-Block (WANN-weich)");
      else { const f = noteSchema(d.block.daten); if (f.length) bericht.hart("noteSchema: " + f[0]); }
    },
  },
  {
    id: "S3-gabelung-vor-block",
    messages: [
      { role: "user", content: "Mich beschäftigt die Sache mit den Abenden. Ich wünschte, Bernd könnte das hier irgendwann lesen." },
      { role: "assistant", content: "Das nehme ich mit — am Ende schauen wir, in welcher Form es zu Bernd finden kann. Was wäre für dich anders, wenn er es wüsste?" },
      { role: "user", content: "Er würde verstehen, dass es mir nicht um Vorwürfe geht, sondern ums Vermissen." },
      { role: "user", content: CLOSE },
    ],
    pruefe(d, bericht) {
      if (d.block) bericht.hart("Block in Runde 1 trotz Teilenwunsch — Gabelung übersprungen (S97/S99)", "gabelung");
      if (!/behalten|Tür|Weg|Ausschnitt|Selbstmitteilung|sagen/i.test(d.antwort))
        bericht.weich("Gabelung sprachlich nicht erkennbar");
    },
  },
];

function baueBericht(id, lauf) {
  const b = { id, lauf, harte: [], weiche: [], marker: {} };
  b.hart = (t, tag) => { b.harte.push(t); if (tag) b.marker[tag] = true; };
  b.weich = t => b.weiche.push(t);
  return b;
}

const alle = [];
for (const sz of SZENARIEN) {
  for (let lauf = 1; lauf <= N; lauf++) {
    const bericht = baueBericht(sz.id, lauf);
    try {
      const r = await llm(system, sz.messages, { structured: schema });
      const d = r.data || {};
      if (r.strukturQuelle !== "tool") bericht.hart("strukturQuelle=" + r.strukturQuelle);
      const a = String(d.antwort || "");
      if (/-BLOCK|\[\[|END |\{\s*"/.test(a)) bericht.hart("LECK in antwort: " + a.slice(0, 120));
      if (!a.trim()) bericht.hart("antwort leer");
      sz.pruefe(d, bericht);
      bericht.antwortAuszug = a.slice(0, 160).replace(/\n/g, " ⏎ ");
      bericht.block = d.block ? d.block.typ : null;
    } catch (e) {
      bericht.hart("Aufruf-Fehler: " + e.message.slice(0, 200));
    }
    alle.push(bericht);
    console.log(`[${bericht.id} · Lauf ${lauf}] block=${bericht.block ?? "–"} ` +
      (bericht.harte.length ? "HART: " + bericht.harte.join(" | ") : "ok") +
      (bericht.weiche.length ? " · weich: " + bericht.weiche.join(" | ") : ""));
    if (bericht.antwortAuszug) console.log("   » " + bericht.antwortAuszug);
  }
}

const harte = alle.filter(b => b.harte.length);
const gabelungsVerstoesse = alle.filter(b => b.marker.gabelung).length;
console.log("\n==== ERGEBNIS ====");
console.log(`Läufe: ${alle.length} · harte Verstöße: ${harte.length} · S3-Gabelung übersprungen: ${gabelungsVerstoesse}/${N}`);
const abbruch = harte.some(b => !b.marker.gabelung) || gabelungsVerstoesse >= 2;
if (abbruch) {
  console.log("ABBRUCHKRITERIUM ERFÜLLT → Struktur-Modus solo/moment NICHT ausrollen; Befund in ST3 klären (Fallback: Voll-Migration der WIE-Passagen).");
  process.exit(1);
}
console.log("Sonde BESTANDEN → ST2-Ausrollung (solo+moment) gedeckt; volles GATE folgt in ST3.");

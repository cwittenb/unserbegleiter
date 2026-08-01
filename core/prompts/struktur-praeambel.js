// ST2 · Übersetzungs-Präambel des Struktur-Modus — die Architektur-Entscheidung
// dieses Sprints (protokolliert in docs/SPRINT-ST2-PROTOKOLL.md):
//
//   STATT den eval-gehärteten Prompt-Korpus in-place umzuschreiben (WANN und
//   WIE sind dort eng verwoben — jede Chirurgie riskiert gehärtete Regeln),
//   bleibt der Korpus BYTE-IDENTISCH und eine generierte Präambel lehrt die
//   Abbildung:  "Marke [[X]] allein in der letzten Zeile"  →  marker:"X"
//               "X-BLOCK … END X-BLOCK mit JSON"           →  block:{typ,daten}
//   Die JSON-Feld-Dokumentation der Blöcke gilt wortgleich weiter — "daten"
//   IST dasselbe Objekt. Rollback = Flag aus (schalteStruktur nicht rufen).
//   Der benannte Fallback, falls Sonde/GATE die Indirektion verwerfen: die
//   ursprünglich geplante Voll-Migration der WIE-Passagen.
//
// Die Sprachtexte leben im Korpus (K().strukturTexte, DE Referenz / EN Parität);
// die generierten Teile (Marken-Liste, Block-Tabelle) kommen aus der SessionDef
// selbst — sie können damit nicht von der Registrierung abweichen.

import { K, getPrompts } from "./prompts.js";
import { markerName } from "../contracts/turn-schema.js";

/**
 * Baut die Präambel einer SessionDef aus den Korpus-Texten + Def-Daten.
 *
 * `sprache` ist optional und dient dem Eval-Runner (ST5): Der spielt DE- und
 * EN-Szenarien im SELBEN Lauf, kann also nicht auf den global gesetzten Korpus
 * bauen — sonst bekäme ein EN-Szenario die deutsche Präambel vor den
 * englischen Korpus-Prompt. Die App ruft weiter ohne Argument auf und nimmt
 * den aktiven Korpus.
 */
export function strukturPraeambel(def, sprache) {
  const T = (sprache ? getPrompts(sprache) : K()).strukturTexte;
  const teile = [T.kopf, T.antwort];
  const marker = def.markerOrder || [];
  teile.push(marker.length
    ? T.marken.replace("{liste}", marker.map(markerName).join(", "))
    : T.ohneMarken);
  const bloecke = def.blocks || [];
  if (bloecke.length) {
    teile.push(T.bloecke + "\n" + bloecke
      .map(b => "  " + T.zeile.replace("{start}", b.start).replace("{typ}", b.dataset))
      .join("\n"));
  }
  teile.push(T.schluss);
  return teile.join("\n");
}

/**
 * Schaltet eine SessionDef in den Struktur-Modus: Flag setzen und die Präambel
 * VOR den bestehenden Systemtext legen. Genau EINE Zeile am Def-Bau — Revert
 * ist das Entfernen des Aufrufs. (ST2: solo + moment; kernwetten folgt in ST3
 * nach dem Eval-GATE.)
 */
export function schalteStruktur(def) {
  def.strukturTurn = true;
  const basis = def.sysPrompt;
  def.sysPrompt = ctx => strukturPraeambel(def) + "\n\n" + basis(ctx);
  return def;
}

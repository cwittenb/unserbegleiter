// S95.1 · Auswahlmenge des Dialogausschnitts — reine Funktion, keine UI.
//
// Der Dialogausschnitt (Designnotiz §2) ist der zweite Artefakt-Typ am Gate:
// n zusammenhängende Frage-Antwort-Paare aus einer Soloreflexion, wörtlich und
// unbearbeitet. Diese Datei berechnet die MENGE der überhaupt wählbaren Paare —
// sie wählt nichts aus, prüft keine Kriterien und kennt kein Panel.
//
// Warum das Paar die Einheit ist (Designnotiz §1): Die Frage transportiert mehr
// als die Antwort ("was macht das mit dir, das so auszusprechen?"). Eine Antwort
// ohne ihre Frage ist wieder nur eine Behauptung — deshalb gibt es einzelne Züge
// hier gar nicht erst.
//
// Stabilität der IDs: Die Nachrichtenliste der Engine ist APPEND-ONLY (siehe
// core/engine/engine.js — jeder Zug wird gepusht, nie eingefügt). Damit ist der
// Index innerhalb eines Chats ein stabiler Bezeichner, solange derselbe Chat
// lebt. Das genügt: Die Soloreflexion liegt in genau einem Slot und wird nach
// [CLOSE SESSION] nicht wieder geöffnet — die Auswahl geschieht im selben
// Chat-Objekt oder gar nicht (Designnotiz §5).

import { cleanDisplay } from "../contracts/block.js";
import { ALLE_BLOECKE } from "../contracts/registry.js";
import { istWireNachricht } from "../contracts/steuertoken.js";

/* Blöcke werden für den Ausschnitt OHNE Platzhalter entfernt: In der Anzeige ist
   "Deine Selbstmitteilung zur Freigabe:" ein sinnvoller Hinweis, in einem
   wörtlichen Zitat wäre er Protokoll-Müll. cleanDisplay bekommt deshalb eine
   platzhalterfreie Kopie der Registry. */
const BLOECKE_STUMM = ALLE_BLOECKE.map(b => ({ ...b, placeholder: "" }));

/** Ist die Nachricht für die Person überhaupt sichtbar gewesen? */
function sichtbar(m) {
  if (!m || typeof m !== "object") return false;
  if (m.hidden) return false;          // App→Modell-Verkehr, revidierte Züge
  if (m.echo) return false;            // Panel-Echo (Chip), kein Gesprächszug
  if (istWireNachricht(m)) return false; // Alt-Sessions ohne hidden-Flag (S41)
  return m.role === "assistant" || m.role === "user";
}

/** Anzeigetext eines Zuges — Marken, Blöcke und Steuer-Token entfernt. */
function reinText(m, markerOrder) {
  return cleanDisplay(m.content, markerOrder || [], BLOECKE_STUMM).trim();
}

/**
 * Berechnet die wählbaren Frage-Antwort-Paare eines Verlaufs.
 *
 * Ein Paar ist ein sichtbarer Assistant-Zug (Frage) plus der nächste sichtbare
 * User-Zug (Antwort), ohne dazwischenliegenden sichtbaren Assistant-Zug. Züge,
 * die nach der Säuberung leer sind (reiner Block, reine Marke), bilden kein Paar.
 *
 * @param {object[]} messages — engine.chat.messages
 * @param {{markerOrder?: string[]}} [opts]
 * @returns {{id:string, nr:number, frage:{i:number,text:string},
 *            antwort:{i:number,text:string}}[]}
 */
export function paareAusVerlauf(messages, opts = {}) {
  const liste = Array.isArray(messages) ? messages : [];
  const mk = opts.markerOrder || [];
  const paare = [];
  let offen = null;   // wartender Assistant-Zug

  for (let i = 0; i < liste.length; i++) {
    const m = liste[i];
    if (!sichtbar(m)) continue;

    if (m.role === "assistant") {
      const text = reinText(m, mk);
      // Ein leerer Zug ersetzt einen wartenden NICHT — sonst risse ein reiner
      // Block-Zug zwischen Frage und Antwort das Paar auseinander.
      if (text) offen = { i, text };
      continue;
    }

    // role === "user"
    if (!offen) continue;              // Antwort ohne Frage (z. B. Sessionstart)
    const text = reinText(m, mk);
    if (!text) continue;               // leerer Zug beendet die Frage nicht
    paare.push({
      id: "P" + offen.i + "-" + i,
      nr: paare.length,
      frage: { i: offen.i, text: offen.text },
      antwort: { i, text },
    });
    offen = null;
  }

  return paare;
}

/**
 * Bequemlichkeit für die Auswahl-Oberfläche: Zu einer Menge gewählter Paar-IDs
 * die geordnete Freigabe-Liste mit Auslassungs-Markierung (D2).
 *
 * `gapBefore` heißt: zwischen diesem und dem vorigen GEWÄHLTEN Paar wurde etwas
 * übersprungen — der Empfänger sieht dort "…". Beim ersten Paar ist es immer
 * false; ein "…" vor dem Anfang wäre eine Aussage über Material, das den
 * Ausschnitt nie betreten hat.
 *
 * Auslassungen nur AN Paar-Grenzen (Designnotiz D2): Diese Funktion kann
 * konstruktionsbedingt gar nichts anderes — innerhalb eines Zuges gibt es hier
 * keinen Schnittpunkt.
 *
 * @param {object[]} paare — Ergebnis von paareAusVerlauf
 * @param {string[]} gewaehlteIds
 */
export function baueAusschnitt(paare, gewaehlteIds) {
  const gewaehlt = new Set(gewaehlteIds || []);
  const treffer = (paare || []).filter(p => gewaehlt.has(p.id));
  return treffer.map((p, k) => ({
    id: p.id,
    question: p.frage.text,
    answer: p.antwort.text,
    gapBefore: k > 0 && p.nr !== treffer[k - 1].nr + 1,
  }));
}

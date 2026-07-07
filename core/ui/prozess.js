// Prozessreflexion (Mess-Runden, Slice 3) und Qualitätszeit-Leiter (Slice 5) —
// reine Datenlogik über der Backend-Fassade; UI-Verdrahtung in app.js.
//
// Ehrliche Grenze (siehe Protokoll): Die verdeckten Mess-Werte liegen im
// GETEILTEN Bstate (die Aufdeckung braucht beide Beiträge in einem Kontext);
// „verdeckt" ist eine UI-Zusicherung, keine Speicher-Zusicherung. Serverseitiges
// Gating je Rolle wäre die härtere Form — als offener Punkt notiert.

import { K } from "../prompts/prompts.js";
import { fuelle } from "../i18n/index.js";
import { BLOECKE } from "../contracts/registry.js";

/* ================= Prozessreflexion ================= */

/** Eigenen Beitrag ablegen: offene Runde ergänzen oder neue beginnen.
 *  Beide Beiträge da ⇒ Runde „bereit" (aufzudecken im gemeinsamen Moment). */
export async function trageMessbeitragEin(backend, role, beitrag /* {naehe, zweit, passung:{AGx:n}} */) {
  const mr = (await backend.bstate.get("messrunden")) || { items: [] };
  let runde = mr.items.find(r => r.status === "offen");
  if (!runde) {
    runde = { id: "MR" + (mr.items.length + 1), startAt: new Date().toISOString(), status: "offen", werte: { A: null, B: null } };
    mr.items.push(runde);
  }
  runde.werte[role] = beitrag;
  if (runde.werte.A && runde.werte.B) runde.status = "bereit";
  await backend.bstate.set("messrunden", mr);
  return runde;
}

export function bereiteRunde(mr) {
  return ((mr && mr.items) || []).find(r => r.status === "bereit") || null;
}

/** Aufbereitung für den MOMENT-KONTEXT: Differenzen sind BERECHNET —
 *  Erlebens-Differenz (Beziehungs-Befund) getrennt von Lese-Genauigkeit
 *  (Empathie-Signal); Treffer-zuerst-Sortierung übernimmt der Prompt. */
export function formatiereMessrunde(runde, nameA, nameB) {
  const KT = key => K().korpusTexte[key];
  const a = runde.werte.A, b = runde.werte.B;
  const zeilen = [
    fuelle(KT("mess.naehe"), { nameA, a: a.naehe, nameB, b: b.naehe, diff: Math.abs(a.naehe - b.naehe) }),
    fuelle(KT("mess.lese"), {
      nameA, nameB,
      x: a.zweit, y: b.naehe, d: Math.abs(a.zweit - b.naehe),
      x2: b.zweit, y2: a.naehe, d2: Math.abs(b.zweit - a.naehe),
    }),
  ];
  const pk = Object.keys(a.passung || {});
  if (pk.length)
    zeilen.push(KT("mess.passung") + pk.map(k =>
      k + ": " + nameA + " " + a.passung[k] + " · " + nameB + " " + ((b.passung || {})[k] ?? "–")).join(" · "));
  return zeilen.join("\n");
}

/** Nach dem gemeinsamen Moment: bereite Runde als aufgedeckt markieren. */
export async function markiereAufgedeckt(backend) {
  const mr = (await backend.bstate.get("messrunden")) || { items: [] };
  const r = mr.items.find(x => x.status === "bereit");
  if (!r) return;
  r.status = "aufgedeckt";
  r.aufgedecktAt = new Date().toISOString();
  await backend.bstate.set("messrunden", mr);
}

/* ================= Qualitätszeit-Leiter ================= */

export const QZ_WOCHEN_BIS_GRUENDE = 4;

/** Einladungsstufe: 1 sanft · 2 Gründe-Frage · 3 Terminhilfe · 4 Pausen-Angebot · "pause". */
export function qzStufe(qz, now = Date.now) {
  const leiter = (qz && qz.leiter) || {};
  if (leiter.pausiertBis && now() < Date.parse(leiter.pausiertBis)) return "pause";
  const letzte = ((qz && qz.wahl) || []).map(w => Date.parse(w.at)).sort((x, y) => y - x)[0];
  const tage = letzte ? (now() - letzte) / 86400000 : (qz && qz.startAt ? (now() - Date.parse(qz.startAt)) / 86400000 : 0);
  if (tage < QZ_WOCHEN_BIS_GRUENDE * 7) return 1;
  if (!leiter.stufe2At) return 2;
  if (!leiter.stufe3At) return 3;
  return 4;
}

export { QZ_STUFEN_TEXT } from "../prompts/prompts.js";   // Inhalt lebt im Korpus (Sprachfassung)

/** Material-Nachricht für den Fächer-Generator (qzSys arbeitet NUR damit). */
export function baueQzMaterial({ auftraege, freigaben, qz }) {
  const KT = key => K().korpusTexte[key];
  const teile = [KT("qm.kopf")];
  const aktive = ((auftraege && auftraege.items) || []).filter(a => a.status === "aktiv");
  teile.push(aktive.length
    ? KT("qm.auftraege") + aktive.map(a => a.text).join(" · ")
    : KT("qm.auftraegeLeer"));
  const frei = (freigaben || []).flatMap(f => f.items.map(i => i.text));
  teile.push(frei.length ? KT("qm.material") + frei.join(" · ") : KT("qm.materialLeer"));
  const ruht = Object.keys((qz && qz.ruht) || {}).filter(k => qz.ruht[k]);
  teile.push(ruht.length ? KT("qm.ruhend") + ruht.join(" · ") : KT("qm.ruhendLeer"));
  const letzte = ((qz && qz.wahl) || []).slice(-3).map(w => w.text);
  if (letzte.length) teile.push(KT("qm.zuletzt") + letzte.join(" · "));
  teile.push(KT("qm.katalog") + "\n" + K().DOMAENEN);
  return teile.join("\n\n");
}

/** Ephemere Fächer-Session: ein Aufruf, ein QUALITYTIME-BLOCK (Korrektur-Runde inklusive). */
export function qzDef(hooks = {}) {
  return {
    id: "qz",
    shared: true,
    titel: "Gemeinsame Momente",
    sysPrompt: () => K().qzSys(),
    markerOrder: [],
    markers: {},
    canAct: () => true,
    blocks: [{ ...BLOECKE.qz, handle: (data, engine) => { if (hooks.onFaecher) hooks.onFaecher(data, engine); } }],
  };
}

/** Wahl einer Einladung: Leiter zurücksetzen, Nicht-Aufgegriffen-Zähler der Domäne löschen. */
export async function waehleEinladung(backend, einladung) {
  const qz = (await backend.bstate.get("qz")) || { ruht: {}, wahl: [] };
  qz.wahl = qz.wahl || [];
  qz.wahl.push({ at: new Date().toISOString(), text: einladung.text, domaene: einladung.domaene });
  qz.leiter = {};
  if (qz.nichtAufgegriffen) delete qz.nichtAufgegriffen[einladung.domaene];
  await backend.bstate.set("qz", qz);
}

/** „Heute keine davon": je Domäne zählen; zweimal nicht aufgegriffen ⇒ ruhend (bewusstes Nicht-Leben ist legitim). */
export async function keineEinladung(backend, einladungen, stufe) {
  const qz = (await backend.bstate.get("qz")) || { ruht: {}, wahl: [] };
  qz.nichtAufgegriffen = qz.nichtAufgegriffen || {};
  qz.ruht = qz.ruht || {};
  for (const e of einladungen) {
    const n = (qz.nichtAufgegriffen[e.domaene] || 0) + 1;
    qz.nichtAufgegriffen[e.domaene] = n;
    if (n >= 2) qz.ruht[e.domaene] = true;
  }
  qz.leiter = qz.leiter || {};
  if (stufe === 2) qz.leiter.stufe2At = new Date().toISOString();
  if (stufe === 3) qz.leiter.stufe3At = new Date().toISOString();
  await backend.bstate.set("qz", qz);
}

/** Pausen-Vereinbarung (Stufe 4): sauberer Ausstieg mit Wiedereinstiegs-Datum. */
export async function vereinbarePause(backend, wochen = 4) {
  const qz = (await backend.bstate.get("qz")) || { ruht: {}, wahl: [] };
  qz.leiter = { pausiertBis: new Date(Date.now() + wochen * 7 * 86400000).toISOString() };
  await backend.bstate.set("qz", qz);
}

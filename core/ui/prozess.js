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

export const MESS_INTERVALL_TAGE = 7;   // Default: einmal die Woche

/** Vereinbarter Rhythmus (geteilter Vertrag): {days, vorschlag|null}. */
export async function holeMessIntervall(backend) {
  const iv = (await backend.bstate.get("messIntervall")) || {};
  return { days: iv.days || MESS_INTERVALL_TAGE, vorschlag: iv.vorschlag || null };
}

/** Rhythmus vorschlagen — wirksam erst nach Bestätigung der ANDEREN Person. */
export async function schlageMessIntervallVor(backend, role, days) {
  const d = Math.max(1, Math.round(+days || 0));
  const iv = (await backend.bstate.get("messIntervall")) || {};
  iv.vorschlag = { days: d, by: role, at: new Date().toISOString() };
  await backend.bstate.set("messIntervall", iv);
  return { days: iv.days || MESS_INTERVALL_TAGE, vorschlag: iv.vorschlag };
}

/** Auf einen Vorschlag antworten: eigene Rolle → zurückziehen; andere Rolle →
 *  ok=true übernimmt (beidseitig bestätigt), ok=false verwirft. */
export async function antworteMessIntervall(backend, role, ok) {
  const iv = (await backend.bstate.get("messIntervall")) || {};
  const v = iv.vorschlag;
  if (v) {
    if (v.by !== role && ok) { iv.days = v.days; iv.confirmedAt = new Date().toISOString(); }
    iv.vorschlag = null;   // zurückgezogen, abgelehnt oder übernommen — in jedem Fall geschlossen
    await backend.bstate.set("messIntervall", iv);
  }
  return { days: iv.days || MESS_INTERVALL_TAGE, vorschlag: iv.vorschlag || null };
}

/** Ausfüll-Fenster: Eine NEUE Runde öffnet erst, wenn der eigene letzte
 *  Beitrag mindestens das Intervall zurückliegt. Eine bereits offene Runde
 *  des Partners bleibt immer beantwortbar (Runden werden zu zweit fertig). */
export function messFenster(mr, role, days, now = Date.now) {
  let letzte = 0;
  for (const r of ((mr && mr.items) || [])) {
    const eigener = r.values && r.values[role];
    if (!eigener) continue;
    const t = Date.parse(eigener.at || r.startAt || "") || 0;
    if (t > letzte) letzte = t;
  }
  if (!letzte) return { offen: true, naechsteAb: null };
  const ab = letzte + days * 86400000;
  return { offen: now() >= ab, naechsteAb: new Date(ab).toISOString() };
}

/** Eigenen Beitrag ablegen: offene Runde ergänzen oder neue beginnen.
 *  Beide Beiträge da ⇒ Runde „bereit" (aufzudecken im gemeinsamen Moment). */
export async function trageMessbeitragEin(backend, role, beitrag /* {naehe, zweit, fit:{AGx:n}} */) {
  const mr = (await backend.bstate.get("measurements")) || { items: [] };
  let runde = mr.items.find(r => r.status === "open");
  if (!runde) {
    runde = { id: "MR" + (mr.items.length + 1), startAt: new Date().toISOString(), status: "open", values: { A: null, B: null } };
    mr.items.push(runde);
  }
  runde.values[role] = { ...beitrag, at: new Date().toISOString() };
  if (runde.values.A && runde.values.B) runde.status = "ready";
  await backend.bstate.set("measurements", mr);
  return runde;
}

export function bereiteRunde(mr) {
  return ((mr && mr.items) || []).find(r => r.status === "ready") || null;
}

/** Aufbereitung für den MOMENT-CONTEXT: Differenzen sind BERECHNET —
 *  Erlebens-Differenz (Beziehungs-Befund) getrennt von Lese-Genauigkeit
 *  (Empathie-Signal); Treffer-zuerst-Sortierung übernimmt der Prompt. */
export function formatiereMessrunde(runde, nameA, nameB) {
  const KT = key => K().korpusTexte[key];
  const a = runde.values.A, b = runde.values.B;
  const zeilen = [
    fuelle(KT("mess.closeness"), { nameA, a: a.closeness, nameB, b: b.closeness, diff: Math.abs(a.closeness - b.closeness) }),
    fuelle(KT("mess.lese"), {
      nameA, nameB,
      x: a.guess, y: b.closeness, d: Math.abs(a.guess - b.closeness),
      x2: b.guess, y2: a.closeness, d2: Math.abs(b.guess - a.closeness),
    }),
  ];
  const pk = Object.keys(a.fit || {});
  if (pk.length)
    zeilen.push(KT("mess.fit") + pk.map(k =>
      k + ": " + nameA + " " + a.fit[k] + " · " + nameB + " " + ((b.fit || {})[k] ?? "–")).join(" · "));
  return zeilen.join("\n");
}

/** Nach dem gemeinsamen Moment: bereite Runde als aufgedeckt markieren. */
export async function markiereAufgedeckt(backend) {
  const mr = (await backend.bstate.get("measurements")) || { items: [] };
  const r = mr.items.find(x => x.status === "ready");
  if (!r) return;
  r.status = "revealed";
  r.revealedAt = new Date().toISOString();
  await backend.bstate.set("measurements", mr);
}

/* ================= Qualitätszeit-Leiter ================= */

export const QZ_WOCHEN_BIS_GRUENDE = 4;

/** Einladungsstufe: 1 sanft · 2 Gründe-Frage · 3 Terminhilfe · 4 Pausen-Angebot · "pause". */
export function qzStufe(qz, now = Date.now) {
  const leiter = (qz && qz.ladder) || {};
  if (leiter.pausedUntil && now() < Date.parse(leiter.pausedUntil)) return "pause";
  const letzte = ((qz && qz.choices) || []).map(w => Date.parse(w.at)).sort((x, y) => y - x)[0];
  const tage = letzte ? (now() - letzte) / 86400000 : (qz && qz.startAt ? (now() - Date.parse(qz.startAt)) / 86400000 : 0);
  if (tage < QZ_WOCHEN_BIS_GRUENDE * 7) return 1;
  if (!leiter.stage2At) return 2;
  if (!leiter.stage3At) return 3;
  return 4;
}

export { QZ_STUFEN_TEXT } from "../prompts/prompts.js";   // Inhalt lebt im Korpus (Sprachfassung)

/** Material-Nachricht für den Menü-Generator (qzMenuePrompt arbeitet NUR damit). */
export function baueQzMaterial({ goals, sharings, qualitytime }) {
  const KT = key => K().korpusTexte[key];
  const teile = [KT("qm.kopf")];
  const aktive = ((goals && goals.items) || []).filter(a => a.status === "active");
  teile.push(aktive.length
    ? KT("qm.auftraege") + aktive.map(a => a.text).join(" · ")
    : KT("qm.auftraegeLeer"));
  const frei = (sharings || []).flatMap(f => f.items.map(i => i.text));
  teile.push(frei.length ? KT("qm.material") + frei.join(" · ") : KT("qm.materialLeer"));
  const ruht = Object.keys((qualitytime && qualitytime.resting) || {}).filter(k => qualitytime.resting[k]);
  teile.push(ruht.length ? KT("qm.ruhend") + ruht.join(" · ") : KT("qm.ruhendLeer"));
  const letzte = ((qualitytime && qualitytime.choices) || []).slice(-3).map(w => w.text);
  if (letzte.length) teile.push(KT("qm.zuletzt") + letzte.join(" · "));
  teile.push(KT("qm.katalog") + "\n" + K().DOMAENEN);
  return teile.join("\n\n");
}

/** Ephemere Menü-Session: ein Aufruf, ein QUALITYTIME-BLOCK (Korrektur-Runde inklusive). */
export function qzDef(hooks = {}) {
  return {
    id: "qualitytime",
    shared: true,
    titel: "Gemeinsame Momente",
    sysPrompt: () => K().qzMenuePrompt(),
    markerOrder: [],
    markers: {},
    canAct: () => true,
    blocks: [{ ...BLOECKE.qz, handle: (data, engine) => { if (hooks.onFaecher) hooks.onFaecher(data, engine); } }],
  };
}

/** Wahl einer Einladung: Leiter zurücksetzen, Nicht-Aufgegriffen-Zähler der Domäne löschen. */
export async function waehleEinladung(backend, einladung) {
  const qz = (await backend.bstate.get("qualitytime")) || { resting: {}, choices: [] };
  qz.choices = qz.choices || [];
  qz.choices.push({ at: new Date().toISOString(), text: einladung.text, domain: einladung.domain });
  qz.ladder = {};
  if (qz.notPickedUp) delete qz.notPickedUp[einladung.domain];
  await backend.bstate.set("qualitytime", qz);
}

/** „Heute keine davon": je Domäne zählen; zweimal nicht aufgegriffen ⇒ ruhend (bewusstes Nicht-Leben ist legitim). */
export async function keineEinladung(backend, einladungen, stufe) {
  const qz = (await backend.bstate.get("qualitytime")) || { resting: {}, choices: [] };
  qz.notPickedUp = qz.notPickedUp || {};
  qz.resting = qz.resting || {};
  for (const e of einladungen) {
    const n = (qz.notPickedUp[e.domain] || 0) + 1;
    qz.notPickedUp[e.domain] = n;
    if (n >= 2) qz.resting[e.domain] = true;
  }
  qz.ladder = qz.ladder || {};
  if (stufe === 2) qz.ladder.stage2At = new Date().toISOString();
  if (stufe === 3) qz.ladder.stage3At = new Date().toISOString();
  await backend.bstate.set("qualitytime", qz);
}

/** Pausen-Vereinbarung (Stufe 4): sauberer Ausstieg mit Wiedereinstiegs-Datum. */
export async function vereinbarePause(backend, wochen = 4) {
  const qz = (await backend.bstate.get("qualitytime")) || { resting: {}, choices: [] };
  qz.ladder = { pausedUntil: new Date(Date.now() + wochen * 7 * 86400000).toISOString() };
  await backend.bstate.set("qualitytime", qz);
}

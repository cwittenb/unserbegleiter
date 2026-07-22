// Prozessreflexion (Mess-Runden, Slice 3) und Qualitätszeit-Leiter (Slice 5) —
// reine Datenlogik über der Backend-Fassade; UI-Verdrahtung in app.js.
//
// I12 „Verdeckte Runde" (S91): Auf der Cloudflare-Plattform ist die Verdecktheit
// eine SPEICHER-Zusicherung — der Worker führt die Messungen (Abgabe/Aufdeckung
// über eigene Routen, Rolle aus der Session), Lesen ist rollenbewusst redigiert
// (redigiereMessungenFuerRolle): eine offene Runde ohne eigenen Beitrag ist
// nicht einmal als existent sichtbar. Ab „ready" liegen die Werte notwendig
// beim QZ-Client (er baut den Momentkontext) — akzeptierte Restgrenze.
// Memory-/Artefakt-Plattform (ohne Server) bleibt UI-Zusicherung — dokumentiert.

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

/** S91 · Rollenbewusste Lese-Redaktion (I12): ready/revealed voll; eine offene
 *  Runde OHNE eigenen Beitrag entfällt samt Existenz („niemand sieht den Stand
 *  des anderen"); eine offene MIT eigenem ist unverändert — der Partner-Slot
 *  ist dort ohnehin null (beide da hieße ready). Reine Funktion, vom Worker
 *  beim GET verwendet und einzeln getestet. */
export function redigiereMessungenFuerRolle(mr, role) {
  const items = ((mr && mr.items) || []).filter(r =>
    r.status !== "open" || (r.values && r.values[role]));
  return { ...(mr || {}), items };
}

/** Eigenen Beitrag ablegen: offene Runde ergänzen oder neue beginnen.
 *  Beide Beiträge da ⇒ Runde „bereit" (aufzudecken im gemeinsamen Moment).
 *  S91: Auf servergeführten Plattformen delegiert die Fassade an den Worker
 *  (Merge mit VOLLER Sicht dort; der Client sieht redigiert und dürfte nie
 *  read-modify-write schreiben — der direkte PUT ist serverseitig gesperrt). */
export async function trageMessbeitragEin(backend, role, beitrag /* {naehe, zweit, fit:{AGx:n}} */) {
  if (backend.mess && backend.mess.beitrag) return backend.mess.beitrag(beitrag);
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

/** S89 · Aufgedeckt heißt aufgedeckt: markiert GENAU die Runde, deren Werte
 *  im Momentkontext lagen (ID an der Chat-Struktur persistiert) — und nur,
 *  wenn das Modell die Aufdeckung per [[META-REVEALED]] zurückgemeldet hat.
 *  ID-genau statt "irgendeine ready-Runde": resume() dispatcht Marker erneut,
 *  und eine INZWISCHEN fertig gewordene neue Runde (Nachzügler) darf dabei
 *  nicht fälschlich verbrennen. Idempotent über den Status-Check. */
export async function markiereAufgedeckt(backend, rundeId) {
  if (!rundeId) return;
  if (backend.mess && backend.mess.aufgedeckt) return backend.mess.aufgedeckt(rundeId);
  const mr = (await backend.bstate.get("measurements")) || { items: [] };
  const r = mr.items.find(x => x.id === rundeId && x.status === "ready");
  if (!r) return;
  r.status = "revealed";
  r.revealedAt = new Date().toISOString();
  await backend.bstate.set("measurements", mr);
}

/* ============ S92 · Verlaufs-Verbraucher (Slice 3, D-B) ============
   Die Werte sind drittrangig — der Verlauf dient ausschließlich zwei Dingen:
   der Trajektorien-Vertiefung (Grammatik 4: Tür, nie Aussage; Eigenleistung
   gehört dem Paar) und der Marker-Regel „wiederkehrend schwache Lese-
   Richtung" (Muster statt Schwellenwert; Vorzeichen-Bias ist informativer
   als Distanz). Leitplanken: I13 kein Aggregat, Richtungen nie ranken. */

export const LESE_MUSTER = { fenster: 3, deutlich: 3 };   // kalibrierbare Startwerte (Slice 3)

/** Letzte k AUFGEDECKTE Runden als kompaktes Kontext-Material — je Zeile beide
 *  Nähe-Werte und der Lese-Abstand JE RICHTUNG (nie verrechnet). null ohne Verlauf. */
export function formatiereVerlauf(mr, nameA, nameB, k = 3) {
  const KT = key => K().korpusTexte[key];
  const runden = ((mr && mr.items) || [])
    .filter(r => r.status === "revealed" && r.values && r.values.A && r.values.B)
    .slice(-k);
  if (!runden.length) return null;
  const zeilen = runden.map(r => fuelle(KT("mess.verlaufZeile"), {
    datum: (r.revealedAt || r.startAt || "").slice(0, 10),
    nameA, nameB, a: r.values.A.closeness, b: r.values.B.closeness,
    d1: Math.abs((r.values.A.guess ?? 0) - r.values.B.closeness),
    d2: Math.abs((r.values.B.guess ?? 0) - r.values.A.closeness),
  }));
  return KT("mk.prozessVerlauf") + "\n" + zeilen.map(z => "- " + z).join("\n");
}

/** Muster in der Richtung role→Partner über die letzten `fenster` aufgedeckten
 *  Runden: „distanz" (dreimal in Folge deutlich daneben) vor Vorzeichen-Bias
 *  („ueberschaetzt": Not wird überlesen · „unterschaetzt": Distanz lesen, wo
 *  keine ist). Rückgabe { muster, schluessel, ids } oder null; der Schlüssel
 *  macht das Angebot einmalig je Musterlage (merken statt melden). */
export function pruefeLeserichtung(mr, role, opt = {}) {
  const fenster = opt.fenster || LESE_MUSTER.fenster;
  const deutlich = opt.deutlich || LESE_MUSTER.deutlich;
  const partner = role === "A" ? "B" : "A";
  const runden = ((mr && mr.items) || [])
    .filter(r => r.status === "revealed" && r.values && r.values[role] && r.values[partner]);
  if (runden.length < fenster) return null;
  const letzte = runden.slice(-fenster);
  const ds = letzte.map(r => (r.values[role].guess ?? 0) - (r.values[partner].closeness ?? 0));
  const ids = letzte.map(r => r.id);
  const mit = m => ({ muster: m, schluessel: m + ":" + ids.join("+"), ids });
  if (ds.every(d => Math.abs(d) >= deutlich)) return mit("distanz");
  if (ds.every(d => d > 0)) return mit("ueberschaetzt");
  if (ds.every(d => d < 0)) return mit("unterschaetzt");
  return null;
}

/** Marker-Befund als Solo-Kontext-Block (Kopf trägt die Umgangsregeln). */
export function formatiereLeseMarker(befund, me, partner) {
  const KT = key => K().korpusTexte[key];
  const map = { distanz: "mess.markerDistanz", ueberschaetzt: "mess.markerUeber", unterschaetzt: "mess.markerUnter" };
  return KT("sk.leseMarkerKopf") + "\n" + fuelle(KT(map[befund.muster]), { me, partner, deutlich: LESE_MUSTER.deutlich });
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
export function baueQzMaterial({ goals, sharings, qualitytime, agenda }) {
  const KT = key => K().korpusTexte[key];
  const teile = [KT("qm.kopf")];
  const aktive = ((goals && goals.items) || []).filter(a => a.status === "active");
  teile.push(aktive.length
    ? KT("qm.auftraege") + aktive.map(a => a.text).join(" · ")
    : KT("qm.auftraegeLeer"));
  const frei = (sharings || []).flatMap(f => f.items.map(i => i.text));
  teile.push(frei.length ? KT("qm.material") + frei.join(" · ") : KT("qm.materialLeer"));
  // S76 · Vorgemerkte Gesprächspunkte fließen in den Menü-Generator ein
  // (Qualitätszeit hat EIGENE Leitprinzipien — Verdrahtung hier bewusst
  // explizit, kein stilles Erben aus dem Momentkontext).
  const vor = ((agenda && agenda.items) || []).filter(i => i.state === "open" && i.vormerkung);
  if (vor.length) teile.push(KT("qm.vorgemerkt") + vor.map(i => i.text).join(" · "));
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

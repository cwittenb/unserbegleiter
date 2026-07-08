// Session-Definitionen des Betrieb-Moduls — verbinden Verträge, Prompts und
// Backend-Fassade. Die Fassade (ein Objekt, zwei Implementierungen) ist die
// einzige Außenwelt der UI:
//
//   backend.info()                       → {role, name, partner, nameA, nameB}
//   backend.bstate.get/set(feld[,wert])
//   backend.pstate.get/set(feld[,wert])  — Rolle implizit (Session/lokal)
//   backend.chat.load/save(art, id, chat)
//   backend.uebergabe.post({module,name,items}) / .get(rolle)
//   backend.llm(system, messages)        → {text, stop, usage}

import { BLOECKE } from "../contracts/registry.js";
import { K } from "../prompts/prompts.js";
import { fuelle } from "../i18n/index.js";

/** Reflexionsgespräch (persönlicher Raum). */
export function soloDef(backend, hooks = {}) {
  return {
    id: "solo",
    shared: false,
    titel: "Reflexionsgespräch",
    sysPrompt: ctx => K().soloSys(ctx.me, ctx.partner) + K().THEMEN_RAHMEN,
    markerOrder: [],
    markers: {},
    canAct: c => c.status === "running",
    blocks: [
      {
        ...BLOECKE.zeitleiste,
        handle: async (data, engine) => {
          const zl = (await backend.pstate.get("zeitleiste")) || { eintraege: [] };
          zl.eintraege.push({ at: new Date().toISOString(), ...data });
          await backend.pstate.set("zeitleiste", zl);
          engine.chat.status = "finished";
          if (hooks.onZeitleiste) hooks.onZeitleiste(data);
        },
      },
      {
        ...BLOECKE.gate,
        handle: (data, engine) => {
          // Querung ist eine PERSONEN-Entscheidung: Panel öffnen, Engine wartet.
          // Wire-Feld "wording" → intern Selbstmitteilung (Prompt/Schema bleiben stabil).
          if (hooks.onGate) hooks.onGate({ selbstmitteilung: data.wording, wish: data.wish, paths: data.paths }, engine);
        },
      },
    ],
  };
}

/** Gemeinsame Session (geteilter Raum, Drei-Akt-Struktur lebt im Prompt). */
export function momentDef(backend, hooks = {}) {
  return {
    id: "moment",
    shared: true,
    titel: "Gemeinsame Session",
    sysPrompt: ctx => K().momentSys(ctx.nameA, ctx.nameB) + K().THEMEN_RAHMEN,
    markerOrder: [],
    markers: {},
    canAct: c => c.status === "running",
    blocks: [
      {
        ...BLOECKE.moment,
        handle: async (data, engine) => {
          const mp = (await backend.bstate.get("momentprotokoll")) || { eintraege: [] };
          mp.eintraege.push({ at: new Date().toISOString(), ...data });
          await backend.bstate.set("momentprotokoll", mp);
          engine.chat.status = "finished";
          if (hooks.onMomentEnde) hooks.onMomentEnde(data);
        },
      },
      {
        ...BLOECKE.auftrag,
        handle: async (data, engine) => {
          const auf = (await backend.bstate.get("auftraege")) || { items: [], seq: 0 };
          for (const a of data.changes) {
            if (a.op === "new") {
              auf.seq = (auf.seq || 0) + 1;
              auf.items.push({
                id: (a.art === "shared" ? "AG" : "AI") + auf.seq,
                text: a.text, art: a.art, owner: a.owner || null,
                status: "active", baseline: a.baseline || {},
                angelegt: new Date().toISOString(),
              });
            } else {
              const it = auf.items.find(x => x.id === a.id);
              if (!it) continue;
              if (a.op === "revise") it.text = a.text;
              if (a.op === "close") it.status = "closed";
              if (a.op === "rest") it.status = "resting";
              if (a.op === "reactivate") it.status = "active";
            }
          }
          await backend.bstate.set("auftraege", auf);
          if (hooks.onAuftraege) hooks.onAuftraege(auf);
        },
      },
    ],
  };
}

/** Querung ausführen, nachdem die Person im Gate-Panel Wege gewählt hat. */
export async function quereGate(backend, gateDaten, gewaehlteWege) {
  const erlaubt = new Set(gateDaten.paths);
  for (const weg of gewaehlteWege) {
    if (!erlaubt.has(weg)) throw new Error("Weg " + weg + " war nicht freigegeben");
    if (weg === "shelf") {
      const regal = (await backend.bstate.get("regal")) || { items: [] };
      regal.items.push({
        id: "RG" + (regal.items.length + 1),   // Regal-Item = Einblick
        text: gateDaten.selbstmitteilung,
        wish: gateDaten.wish,
        von: (await backend.info()).name,
        at: new Date().toISOString(),
        gelesen: false,   // "merken statt melden": Pull, kein Push
      });
      await backend.bstate.set("regal", regal);
    }
    if (weg === "moment") {
      const agenda = (await backend.bstate.get("agenda")) || { items: [] };
      agenda.items.push({
        id: "AGD" + (agenda.items.length + 1),   // auf der Agenda = Thema
        text: gateDaten.selbstmitteilung,
        wish: gateDaten.wish,
        von: (await backend.info()).name,
        at: new Date().toISOString(),
        zustand: "offen",
      });
      await backend.bstate.set("agenda", agenda);
    }
    // "selbst" → Selbstoffenbarung: bleibt im persönlichen Raum (selbst ansprechen)
    if (weg === "selbst") {
      const so = (await backend.pstate.get("selbstoffenbarungen")) || { items: [] };
      so.items.push({ text: gateDaten.selbstmitteilung, at: new Date().toISOString() });
      await backend.pstate.set("selbstoffenbarungen", so);
    }
  }
}

/**
 * MOMENT-CONTEXT (app-intern, erste — versteckte — Nachricht der gemeinsamen
 * Session). momentSys erwartet ihn und bringt ihn dramaturgisch ein; das Paar
 * sieht die Rohform nie (hidden = reine Anzeige-Semantik, geht ans Modell mit).
 */
export function baueMomentKontext({ auftraege, agenda, momentprotokoll, messrunde, freigaben }, nameA, nameB) {
  const KT = key => K().korpusTexte[key];
  const teile = [KT("mk.kopf")];

  const aktive = ((auftraege && auftraege.items) || []).filter(a => a.status !== "closed");
  teile.push(aktive.length
    ? "GOALS:\n" + aktive.map(a => "- " + a.id + " (" + a.art + (a.owner ? ", " + a.owner : "") + ", " + a.status + "): " + a.text).join("\n")
    : KT("mk.auftraegeLeer"));

  const offen = ((agenda && agenda.items) || []).filter(i => i.zustand === "offen");
  teile.push(offen.length
    ? KT("mk.agendaKopf") + "\n" + offen.map(i => fuelle(KT("mk.agendaVon"), { name: i.von }) + i.text + (i.wish ? fuelle(KT("mk.agendaWunsch"), { wish: i.wish }) : "")).join("\n")
    : KT("mk.agendaLeer"));

  const fruehere = ((momentprotokoll && momentprotokoll.eintraege) || []).slice(-3);
  teile.push(fruehere.length
    ? KT("mk.fruehereKopf") + "\n" + fruehere.map(e => "- " + (e.at || "").slice(0, 10) + ": " + e.summary + (e.gentleInvitation ? KT("mk.impulsWar") + e.gentleInvitation : "")).join("\n")
    : KT("mk.fruehereLeer"));

  teile.push(messrunde
    ? KT("mk.prozessKopf") + "\n" + messrunde
    : KT("mk.prozessLeer"));

  const frei = freigaben || [];
  teile.push(frei.length
    ? KT("mk.zwischenzeitKopf") + "\n" + frei.map(f => fuelle(KT("mk.materialVon"), { name: f.name }) + f.items.map(i => i.text).join(" · ")).join("\n")
    : KT("mk.materialLeer"));

  teile.push(fuelle(KT("mk.namen"), { nameA, nameB }));
  return teile.join("\n\n");
}

/** Regal-Item als gelesen markieren (Pull-Prinzip: die lesende Person entscheidet). */
export async function markiereGelesen(backend, itemId) {
  const regal = (await backend.bstate.get("regal")) || { items: [] };
  const it = regal.items.find(x => x.id === itemId);
  if (!it) return;
  it.gelesen = true;
  await backend.bstate.set("regal", regal);
}

/** Regal-Item in die gemeinsame Agenda heben (Herkunft bleibt sichtbar). */
export async function hebeInAgenda(backend, itemId) {
  const regal = (await backend.bstate.get("regal")) || { items: [] };
  const it = regal.items.find(x => x.id === itemId);
  if (!it || it.gehoben) return;
  const agenda = (await backend.bstate.get("agenda")) || { items: [] };
  agenda.items.push({
    id: "AGD" + (agenda.items.length + 1),
    text: it.text, wish: it.wish || null,
    von: it.von, herkunft: "regal",
    at: new Date().toISOString(), zustand: "offen",
  });
  it.gehoben = true;
  await backend.bstate.set("agenda", agenda);
  await backend.bstate.set("regal", regal);
}

/** Agenda-Punkt abräumen — beides ist legitim und wird nicht gewertet. */
export async function raeumeAgendaAb(backend, itemId, wie /* "besprochen" | "selfResolved" */) {
  const agenda = (await backend.bstate.get("agenda")) || { items: [] };
  const it = agenda.items.find(x => x.id === itemId);
  if (!it) return;
  it.zustand = wie;
  await backend.bstate.set("agenda", agenda);
}

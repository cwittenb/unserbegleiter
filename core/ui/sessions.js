// Session-Definitionen des Betrieb-Moduls — verbinden Verträge, Prompts und
// Backend-Fassade. Die Fassade (ein Objekt, zwei Implementierungen) ist die
// einzige Außenwelt der UI:
//
//   backend.info()                       → {role, name, partner, nameA, nameB}
//   backend.bstate.get/set(feld[,wert])
//   backend.pstate.get/set(feld[,wert])  — Rolle implizit (Session/lokal)
//   backend.chat.load/save(art, id, chat)
//   backend.handover.post({module,name,items}) / .get(rolle)
//   backend.llm(system, messages[, onDelta]) → {text, stop, usage}; onDelta
//                                          streamt Text-Häppchen (optional)

import { BLOECKE } from "../contracts/registry.js";
import { K } from "../prompts/prompts.js";
import { fuelle } from "../i18n/index.js";

/** Reflexionsgespräch (persönlicher Raum). */
export function soloDef(backend, hooks = {}) {
  return {
    id: "solo",
    shared: false,
    titel: "Reflexionsgespräch",
    sysPrompt: ctx => K().reflexionsPrompt(ctx.me, ctx.partner) + K().THEMEN_RAHMEN,
    markerOrder: [],
    markers: {},
    canAct: c => c.status === "running",
    blocks: [
      {
        ...BLOECKE.zeitleiste,
        handle: async (data, engine) => {
          const zl = (await backend.pstate.get("timeline")) || { entries: [] };
          zl.entries.push({ at: new Date().toISOString(), ...data });
          await backend.pstate.set("timeline", zl);
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
    sysPrompt: ctx => K().momentPrompt(ctx.nameA, ctx.nameB) + K().THEMEN_RAHMEN,
    markerOrder: ["[[CHOICE-CONNECT]]"],
    markers: {
      "[[CHOICE-CONNECT]]": e => hooks.onChoice && hooks.onChoice("connect", e),
    },
    canAct: c => c.status === "running",
    blocks: [
      {
        // S35: Das Modell erfindet die verbindenden Angebote selbst (aus dem
        // MOMENT-CONTEXT); die App zeigt sie plus die Ohne-Übung-Option.
        // Der Marker [[CHOICE-CONNECT]] bleibt als Alt-Pfad für pausierte
        // Sessions bestehen und öffnet das Menü mit den Korpus-Optionen.
        ...BLOECKE.choice,
        handle: (data, engine) => { if (hooks.onChoice) hooks.onChoice(data.id || "connect", engine, data); },
      },
      {
        ...BLOECKE.moment,
        handle: async (data, engine) => {
          const mp = (await backend.bstate.get("momentLog")) || { entries: [] };
          mp.entries.push({ at: new Date().toISOString(), ...data });
          await backend.bstate.set("momentLog", mp);
          engine.chat.status = "finished";
          if (hooks.onMomentEnde) hooks.onMomentEnde(data);
        },
      },
      {
        ...BLOECKE.auftrag,
        handle: async (data, engine) => {
          const auf = (await backend.bstate.get("goals")) || { items: [], seq: 0 };
          for (const a of data.changes) {
            if (a.op === "new") {
              auf.seq = (auf.seq || 0) + 1;
              auf.items.push({
                id: (a.art === "shared" ? "AG" : "AI") + auf.seq,
                text: a.text, art: a.art, owner: a.owner || null,
                status: "active", baseline: a.baseline || {},
                createdAt: new Date().toISOString(),
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
          await backend.bstate.set("goals", auf);
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
      const regal = (await backend.bstate.get("shelf")) || { items: [] };
      regal.items.push({
        id: "RG" + (regal.items.length + 1),   // Regal-Item = Einblick
        text: gateDaten.selbstmitteilung,
        wish: gateDaten.wish,
        by: (await backend.info()).name,
        at: new Date().toISOString(),
        read: false,   // "merken statt melden": Pull, kein Push
      });
      await backend.bstate.set("shelf", regal);
    }
    if (weg === "moment") {
      const agenda = (await backend.bstate.get("agenda")) || { items: [] };
      agenda.items.push({
        id: "AGD" + (agenda.items.length + 1),   // auf der Agenda = Thema
        text: gateDaten.selbstmitteilung,
        wish: gateDaten.wish,
        by: (await backend.info()).name,
        at: new Date().toISOString(),
        state: "open",
      });
      await backend.bstate.set("agenda", agenda);
    }
    // "selbst" → Selbstoffenbarung: bleibt im persönlichen Raum (selbst ansprechen)
    if (weg === "selbst") {
      const so = (await backend.pstate.get("selfDisclosures")) || { items: [] };
      so.items.push({ text: gateDaten.selbstmitteilung, at: new Date().toISOString() });
      await backend.pstate.set("selfDisclosures", so);
    }
  }
}

/**
 * MOMENT-CONTEXT (app-intern, erste — versteckte — Nachricht der gemeinsamen
 * Session). momentPrompt erwartet ihn und bringt ihn dramaturgisch ein; das Paar
 * sieht die Rohform nie (hidden = reine Anzeige-Semantik, geht ans Modell mit).
 */
export function baueMomentKontext({ goals, agenda, momentLog, messrunde, sharings }, nameA, nameB) {
  const KT = key => K().korpusTexte[key];
  const teile = [KT("mk.kopf")];

  const aktive = ((goals && goals.items) || []).filter(a => a.status !== "closed");
  teile.push(aktive.length
    ? "GOALS:\n" + aktive.map(a => "- " + a.id + " (" + a.art + (a.owner ? ", " + a.owner : "") + ", " + a.status + "): " + a.text).join("\n")
    : KT("mk.auftraegeLeer"));

  const offen = ((agenda && agenda.items) || []).filter(i => i.state === "open");
  teile.push(offen.length
    ? KT("mk.agendaKopf") + "\n" + offen.map(i => fuelle(KT("mk.agendaVon"), { name: i.by }) + i.text + (i.wish ? fuelle(KT("mk.agendaWunsch"), { wish: i.wish }) : "")).join("\n")
    : KT("mk.agendaLeer"));

  const fruehere = ((momentLog && momentLog.entries) || []).slice(-3);
  teile.push(fruehere.length
    ? KT("mk.fruehereKopf") + "\n" + fruehere.map(e => "- " + (e.at || "").slice(0, 10) + ": " + e.summary + (e.gentleInvitation ? KT("mk.impulsWar") + e.gentleInvitation : "")).join("\n")
    : KT("mk.fruehereLeer"));

  teile.push(messrunde
    ? KT("mk.prozessKopf") + "\n" + messrunde
    : KT("mk.prozessLeer"));

  const frei = sharings || [];
  teile.push(frei.length
    ? KT("mk.zwischenzeitKopf") + "\n" + frei.map(f => fuelle(KT("mk.materialVon"), { name: f.name }) + f.items.map(i => i.text).join(" · ")).join("\n")
    : KT("mk.materialLeer"));

  teile.push(fuelle(KT("mk.namen"), { nameA, nameB }));
  return teile.join("\n\n");
}

/** Regal-Item als gelesen markieren (Pull-Prinzip: die lesende Person entscheidet). */
export async function markiereGelesen(backend, itemId) {
  const regal = (await backend.bstate.get("shelf")) || { items: [] };
  const it = regal.items.find(x => x.id === itemId);
  if (!it) return;
  it.read = true;
  await backend.bstate.set("shelf", regal);
}

/** Regal-Item in die gemeinsame Agenda heben (Herkunft bleibt sichtbar). */
export async function hebeInAgenda(backend, itemId) {
  const regal = (await backend.bstate.get("shelf")) || { items: [] };
  const it = regal.items.find(x => x.id === itemId);
  if (!it || it.gehoben) return;
  const agenda = (await backend.bstate.get("agenda")) || { items: [] };
  agenda.items.push({
    id: "AGD" + (agenda.items.length + 1),
    text: it.text, wish: it.wish || null,
    by: it.by, herkunft: "shelf",
    at: new Date().toISOString(), state: "open",
  });
  it.gehoben = true;
  await backend.bstate.set("agenda", agenda);
  await backend.bstate.set("shelf", regal);
}

/** Agenda-Punkt abräumen — beides ist legitim und wird nicht gewertet. */
export async function raeumeAgendaAb(backend, itemId, wie /* "discussed" | "selfResolved" */) {
  const agenda = (await backend.bstate.get("agenda")) || { items: [] };
  const it = agenda.items.find(x => x.id === itemId);
  if (!it) return;
  it.state = wie;
  await backend.bstate.set("agenda", agenda);
}

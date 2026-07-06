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
import { soloSys, momentSys, THEMEN_RAHMEN } from "../prompts/prompts.js";

/** Reflexionsgespräch (persönlicher Raum). */
export function soloDef(backend, hooks = {}) {
  return {
    id: "solo",
    shared: false,
    titel: "Reflexionsgespräch",
    sysPrompt: ctx => soloSys(ctx.me, ctx.partner) + THEMEN_RAHMEN,
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
          // Wire-Feld "fassung" → intern Selbstmitteilung (Prompt/Schema bleiben stabil).
          if (hooks.onGate) hooks.onGate({ selbstmitteilung: data.fassung, wunsch: data.wunsch, wege: data.wege }, engine);
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
    sysPrompt: ctx => momentSys(ctx.nameA, ctx.nameB) + THEMEN_RAHMEN,
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
          for (const a of data.aenderungen) {
            if (a.op === "neu") {
              auf.seq = (auf.seq || 0) + 1;
              auf.items.push({
                id: (a.art === "gemeinsam" ? "AG" : "AI") + auf.seq,
                text: a.text, art: a.art, owner: a.owner || null,
                status: "aktiv", startwerte: a.startwerte || {},
                angelegt: new Date().toISOString(),
              });
            } else {
              const it = auf.items.find(x => x.id === a.id);
              if (!it) continue;
              if (a.op === "revidieren") it.text = a.text;
              if (a.op === "abschliessen") it.status = "abgeschlossen";
              if (a.op === "ruhen") it.status = "ruhend";
              if (a.op === "reaktivieren") it.status = "aktiv";
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
  const erlaubt = new Set(gateDaten.wege);
  for (const weg of gewaehlteWege) {
    if (!erlaubt.has(weg)) throw new Error("Weg " + weg + " war nicht freigegeben");
    if (weg === "regal") {
      const regal = (await backend.bstate.get("regal")) || { items: [] };
      regal.items.push({
        id: "RG" + (regal.items.length + 1),   // Regal-Item = Einblick
        text: gateDaten.selbstmitteilung,
        wunsch: gateDaten.wunsch,
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
        wunsch: gateDaten.wunsch,
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
 * MOMENT-KONTEXT (app-intern, erste — versteckte — Nachricht der gemeinsamen
 * Session). momentSys erwartet ihn und bringt ihn dramaturgisch ein; das Paar
 * sieht die Rohform nie (hidden = reine Anzeige-Semantik, geht ans Modell mit).
 */
export function baueMomentKontext({ auftraege, agenda, momentprotokoll, messrunde, freigaben }, nameA, nameB) {
  const teile = ["MOMENT-KONTEXT (app-intern; nicht als Block zitieren, dramaturgisch einbringen):"];

  const aktive = ((auftraege && auftraege.items) || []).filter(a => a.status !== "abgeschlossen");
  teile.push(aktive.length
    ? "AUFTRÄGE:\n" + aktive.map(a => "- " + a.id + " (" + a.art + (a.owner ? ", " + a.owner : "") + ", " + a.status + "): " + a.text).join("\n")
    : "AUFTRÄGE: noch keine.");

  const offen = ((agenda && agenda.items) || []).filter(i => i.zustand === "offen");
  teile.push(offen.length
    ? "AGENDA (offen):\n" + offen.map(i => "- von " + i.von + ": " + i.text + (i.wunsch ? " (Wunsch: " + i.wunsch + ")" : "")).join("\n")
    : "AGENDA: leer.");

  const fruehere = ((momentprotokoll && momentprotokoll.eintraege) || []).slice(-3);
  teile.push(fruehere.length
    ? "FRÜHERE MOMENTE (jüngste zuletzt):\n" + fruehere.map(e => "- " + (e.at || "").slice(0, 10) + ": " + e.zusammenfassung + (e.zwischenzeitImpuls ? " · Zwischenzeit-Impuls war: " + e.zwischenzeitImpuls : "")).join("\n")
    : "FRÜHERE MOMENTE: keine — dies ist der erste Termin (keine offene Tür).");

  teile.push(messrunde
    ? "PROZESSREFLEXION (aufzudecken, Werte sieht nur das System — häppchenweise, Treffer zuerst):\n" + messrunde
    : "PROZESSREFLEXION: keine ausstehend.");

  const frei = freigaben || [];
  teile.push(frei.length
    ? "ZWISCHENZEIT-MATERIAL (freigegeben):\n" + frei.map(f => "- von " + f.name + ": " + f.items.map(i => i.text).join(" · ")).join("\n")
    : "ZWISCHENZEIT-MATERIAL: keines.");

  teile.push("Namen: " + nameA + " (A), " + nameB + " (B).");
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
    text: it.text, wunsch: it.wunsch || null,
    von: it.von, herkunft: "regal",
    at: new Date().toISOString(), zustand: "offen",
  });
  it.gehoben = true;
  await backend.bstate.set("agenda", agenda);
  await backend.bstate.set("regal", regal);
}

/** Agenda-Punkt abräumen — beides ist legitim und wird nicht gewertet. */
export async function raeumeAgendaAb(backend, itemId, wie /* "besprochen" | "selbstGeklaert" */) {
  const agenda = (await backend.bstate.get("agenda")) || { items: [] };
  const it = agenda.items.find(x => x.id === itemId);
  if (!it) return;
  it.zustand = wie;
  await backend.bstate.set("agenda", agenda);
}

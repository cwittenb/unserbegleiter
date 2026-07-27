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
import { pruefeUrteilsAntwort } from "../engine/urteils-waechter.js";
import { waehleEinladung, qzStufe } from "./prozess.js";
import { K } from "../prompts/prompts.js";
import { legeRegalItemAb, legeAgendaItemAb, setzeRegalGelesen, nimmFreigabeZurueck, hebeRegalItem, WEGE_FUER } from "../engine/regal.js";
import { fuelle } from "../i18n/index.js";

/** Reflexionsgespräch (persönlicher Raum). */
export function soloDef(backend, hooks = {}) {
  return {
    id: "solo",
    shared: false,
    titel: "Reflexionsgespräch",
    sysPrompt: ctx => K().reflexionsPrompt(ctx.me, ctx.partner) + K().THEMEN_RAHMEN,
    // S93 · Urteils-Wächter: ein Prädikats-Urteil aus der Richterposition löst
    // genau eine SYSTEM-REVISION aus (Engine-Vertrag 2).
    validiereAntwort: text => pruefeUrteilsAntwort(text, K().steuerTexte.urteilsRevision),
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
      {
        // S44 · Merkposten: bedeutsames Thema privat vormerken (unsichtbar).
        ...BLOECKE.note,
        handle: (data, engine) => merkeMerkposten(backend, data),
      },
      {
        // S96.2 · Eignungsbericht für den Dialogausschnitt. Der Block DRÄNGT
        // NICHTS AUF: Er hinterlegt nur, welche Paare wählbar wären, und die
        // Oberfläche bietet einen ruhigen Zugang an. Bleibt er unbenutzt,
        // schließt sich die Gabelung lautlos (Designnotiz §4).
        ...BLOECKE.ausschnitt,
        handle: (data, engine) => {
          if (hooks.onAusschnitt) hooks.onAusschnitt(data.pairs || [], engine);
        },
      },
    ],
  };
}

/** S44 · Merkposten anlegen — rein privat (pstate), Dedupe nach Text. */
export async function merkeMerkposten(backend, data) {
  const text = String((data && data.note) || "").trim();
  if (!text) return;
  const mp = (await backend.pstate.get("merkposten")) || { items: [], seq: 0 };
  if (mp.items.some(x => x.text === text)) return;   // schon vorgemerkt
  mp.seq = (mp.seq || 0) + 1;
  mp.items.push({ id: "MP" + mp.seq, text, origin: (data && data.origin) || null, at: new Date().toISOString(), status: "open" });
  await backend.pstate.set("merkposten", mp);
}

/** Gemeinsame Session (geteilter Raum, Drei-Akt-Struktur lebt im Prompt). */
export function momentDef(backend, hooks = {}) {
  return {
    id: "moment",
    shared: true,
    titel: "Qualitätszeit",
    sysPrompt: ctx => K().momentPrompt(ctx.nameA, ctx.nameB) + K().THEMEN_RAHMEN,
    // S93 · Urteils-Wächter (siehe soloDef).
    validiereAntwort: text => pruefeUrteilsAntwort(text, K().steuerTexte.urteilsRevision),
    // S89 · [[META-REVEALED]] ist die RÜCKMELDUNG des Modells, dass die
    // Meta-Aufdeckung erzählt wurde — Gegenrichtung zu [[REVEAL-A/B]] (dort
    // übergibt das Modell der App die Regie VOR der Tafel; hier meldet es
    // DANACH zurück, ohne Tafel, ohne Zahlen). Erst daran hängt das
    // Verbrauchen der Runde; MOMENT-BLOCK allein verbrennt nichts mehr.
    markerOrder: ["[[CHOICE-CONNECT]]", "[[META-REVEALED]]"],
    markers: {
      "[[CHOICE-CONNECT]]": e => hooks.onChoice && hooks.onChoice("connect", e),
      "[[META-REVEALED]]": e => hooks.onMetaAufgedeckt && hooks.onMetaAufgedeckt(e),
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
          // S42 · Eine gewählte Zwischenzeit-Einladung speist die Leiter
          // (Wahl setzt sie zurück; die Domänen-Ruhe-Logik bleibt in prozess.js).
          if (data.gentleInvitation) await waehleEinladung(backend, { text: data.gentleInvitation }).catch(() => {});
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
  // S95.3b - Das Menue ist KONSTANT und haengt nur an der Artefakt-Art, nicht
  // mehr an einer Modellentscheidung. Wer nicht sieht, dass es einen Weg gibt,
  // kann ihn nicht waehlen; eine unsichtbare Verengung ist schlechter als eine
  // ausgesprochene Empfehlung, denn gegen ein fehlendes Haekchen kann man sich
  // nicht entscheiden.
  const erlaubt = new Set(WEGE_FUER(gateDaten.kind));
  for (const weg of gewaehlteWege) if (!erlaubt.has(weg)) throw new Error("Weg " + weg + " steht hier nicht offen");
  if (backend.regal && backend.regal.freigabe)
    return backend.regal.freigabe({
      kind: gateDaten.kind === "excerpt" ? "excerpt" : "message",
      text: gateDaten.selbstmitteilung ?? null,
      pairs: gateDaten.pairs || null,
      frame: gateDaten.frame ?? null,
      wish: gateDaten.wish ?? null,
      paths: [...gewaehlteWege],
    });

  // Ohne Server: dieselben Kernfunktionen lokal.
  const info = await backend.info();
  const freigabe = "FG" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const gemeinsam = { freigabe, by: info.name, role: info.role, wish: gateDaten.wish ?? null };
  if (gewaehlteWege.includes("shelf")) {
    const regal = (await backend.bstate.get("shelf")) || { items: [] };
    const { regal: neu } = legeRegalItemAb(regal, {
      ...gemeinsam,
      kind: gateDaten.kind === "excerpt" ? "excerpt" : "message",
      text: gateDaten.selbstmitteilung ?? null,
      pairs: gateDaten.pairs || null,
      frame: gateDaten.frame ?? null,
    });
    await backend.bstate.set("shelf", neu);
  }
  if (gewaehlteWege.includes("moment")) {
    const agenda = (await backend.bstate.get("agenda")) || { items: [] };
    const { agenda: neu } = legeAgendaItemAb(agenda, { ...gemeinsam, text: gateDaten.selbstmitteilung ?? null });
    await backend.bstate.set("agenda", neu);
  }
  // "selbst" -> Selbstoffenbarung: bleibt im persoenlichen Raum, quert nicht
  // und braucht deshalb keine Karenz.
  if (gewaehlteWege.includes("selbst")) {
    const so = (await backend.pstate.get("selfDisclosures")) || { items: [] };
    so.items.push({ text: gateDaten.selbstmitteilung, at: new Date().toISOString() });
    await backend.pstate.set("selfDisclosures", so);
  }
  return { freigabe };
}

/**
 * MOMENT-CONTEXT (app-intern, erste — versteckte — Nachricht der gemeinsamen
 * Session). momentPrompt erwartet ihn und bringt ihn dramaturgisch ein; das Paar
 * sieht die Rohform nie (hidden = reine Anzeige-Semantik, geht ans Modell mit).
 */
/* S39 · COMPANION-CONTEXT fürs Reflexionsgespräch: aktive Aufträge,
 * freigegebenes Material BEIDER (gemeinsame Schicht), die EIGENE Zeitleiste
 * und die letzten gemeinsamen Sessions. Gibt null zurück, wenn nichts da ist
 * (kalter Start — die Begleitung eröffnet dann bei null). */
export function baueSoloKontext({ goals, sharings, timeline, momentLog, merkposten, leseMarker }) {
  const KT = key => K().korpusTexte[key];
  const teile = [];

  // S44 · Offene Merkposten aus früheren privaten Sitzungen — aktiv wieder
  // aufgreifen und am Ende Teilen anbieten (nie automatisch queren).
  const offeneMerk = ((merkposten && merkposten.items) || []).filter(m => m.status === "open");
  if (offeneMerk.length)
    teile.push(KT("sk.merkpostenKopf") + "\n" + offeneMerk.map(m => "- " + m.text).join("\n"));

  // S92 · Lese-Marker (merken statt melden): vorformatierter Block inkl.
  // Umgangsregeln im Kopf — kommt nur EINMAL je Musterlage herein (Schlüssel
  // in pstate.leseMarker, geprüft vor dem Kontextbau in app.js).
  if (leseMarker) teile.push(leseMarker);

  const aktive = ((goals && goals.items) || []).filter(a => a.status !== "closed");
  if (aktive.length)
    teile.push("GOALS:\n" + aktive.map(a => "- " + a.id + " (" + a.art + (a.owner ? ", " + a.owner : "") + ", " + a.status + "): " + a.text).join("\n"));

  const frei = (sharings || []).filter(Boolean);
  if (frei.length)
    teile.push(KT("sk.materialKopf") + "\n" + frei.map(f => fuelle(KT("mk.materialVon"), { name: f.name }) + f.items.map(i => i.text).join(" · ")).join("\n"));

  const eintraege = ((timeline && timeline.entries) || []).slice(-5);
  if (eintraege.length)
    /* S95.8b · Die Kennung macht sichtbar, welche Eintraege einen aufbewahrten
       WORTLAUT haben. Ohne sie sagte der Begleiter "ja, gern" und faende
       nichts — bei jemandem, der auf "jedes Mal fragen" steht und damals nein
       gesagt hat, waere das eine leere Zusage. Eintraege ohne Kennung sind
       damit auch als solche erkennbar: Er sieht, dass es dort nichts zu holen
       gibt, und kann es sagen statt es zu versuchen. */
    teile.push(KT("sk.zeitleisteKopf") + "\n" + eintraege.map(e =>
      "- " + (e.at || "").slice(0, 10) + " [" + ((e.topics || []).join(" · ")) + "]"
      + (e.vid ? " {vid:" + e.vid + "}" : "") + ": " + (e.summary || "")).join("\n"));

  const fruehere = ((momentLog && momentLog.entries) || []).slice(-3);
  if (fruehere.length)
    teile.push(KT("sk.sessionsKopf") + "\n" + fruehere.map(e => "- " + (e.at || "").slice(0, 10) + ": " + e.summary).join("\n"));

  if (!teile.length) return null;
  return KT("sk.kopf") + "\n" + teile.join("\n\n");
}

export function baueMomentKontext({ goals, agenda, momentLog, messrunde, messVerlauf, sharings, qualitytime, findings }, nameA, nameB) {
  const KT = key => K().korpusTexte[key];
  const teile = [KT("mk.kopf")];

  const aktive = ((goals && goals.items) || []).filter(a => a.status !== "closed");
  teile.push(aktive.length
    ? "GOALS:\n" + aktive.map(a => "- " + a.id + " (" + a.art + (a.owner ? ", " + a.owner : "") + ", " + a.status + "): " + a.text).join("\n")
    : KT("mk.auftraegeLeer"));

  // S74 · Beidseitig bestätigte "das wollen wir nicht"-Zeilen aus dem Befund:
  // KEINE Agenda-Einträge (das Paar führt eine positive Zielausrichtung) —
  // stille Achtsamkeits-Marker für die Begleitung in den Folgesessions.
  const vermeiden = (findings && findings.concerns && Array.isArray(findings.concerns.goalAdditions))
    ? findings.concerns.goalAdditions.filter(Boolean) : [];
  if (vermeiden.length)
    teile.push(KT("mk.vermeidenKopf") + "\n" + vermeiden.map(v => "- " + v).join("\n"));

  const offen = ((agenda && agenda.items) || []).filter(i => i.state === "open");
  teile.push(offen.length
    ? KT("mk.agendaKopf") + "\n" + offen.map(i =>
        fuelle(KT("mk.agendaVon"), { name: i.by }) + i.text +
        (i.wish ? fuelle(KT("mk.agendaWunsch"), { wish: i.wish }) : "") +
        (i.zielKandidat ? KT("mk.agendaKandidat") : "") +
        (i.vormerkung ? KT("mk.agendaVorgemerkt") : "")).join("\n")
    : KT("mk.agendaLeer"));

  const fruehere = ((momentLog && momentLog.entries) || []).slice(-3);
  teile.push(fruehere.length
    ? KT("mk.fruehereKopf") + "\n" + fruehere.map(e => "- " + (e.at || "").slice(0, 10) + ": " + e.summary + (e.gentleInvitation ? KT("mk.impulsWar") + e.gentleInvitation : "")).join("\n")
    : KT("mk.fruehereLeer"));

  // S92 · MESS-VERLAUF nur ZUSAMMEN mit einer bereiten Runde — die
  // Trajektorien-Vertiefung gehört zur frischen Aufdeckung; ohne sie wäre
  // das Material eine Einladung zum kalten Historien-Öffnen.
  if (messrunde && messVerlauf) teile.push(messVerlauf);
  teile.push(messrunde
    ? KT("mk.prozessKopf") + "\n" + messrunde
    : KT("mk.prozessLeer"));

  const frei = sharings || [];
  teile.push(frei.length
    ? KT("mk.zwischenzeitKopf") + "\n" + frei.map(f => fuelle(KT("mk.materialVon"), { name: f.name }) + f.items.map(i => i.text).join(" · ")).join("\n")
    : KT("mk.materialLeer"));

  // S42 · Stand der Zwischenzeit-Einladungen (Leiter): ruhende Bereiche und
  // die letzten Wahlen — damit der Zwischenzeit-Impuls RESTING respektiert
  // und an Gewähltem anknüpfen kann.
  const ruht = Object.keys((qualitytime && qualitytime.resting) || {}).filter(k => qualitytime.resting[k]);
  const wahlen = ((qualitytime && qualitytime.choices) || []).slice(-3);
  teile.push(KT("mk.qzKopf") + "\n" +
    (ruht.length ? KT("qm.ruhend") + ruht.join(", ") : KT("qm.ruhendLeer")) + "\n" +
    (wahlen.length ? KT("mk.qzWahlen") + wahlen.map(w => w.text || w).join(" · ") : KT("mk.qzWahlenLeer")) +
    (qualitytime ? "\n" + KT("mk.qzStufe") + qzStufe(qualitytime) : ""));

  teile.push(fuelle(KT("mk.namen"), { nameA, nameB }));
  return teile.join("\n\n");
}

/** Regal-Item als gelesen markieren (Pull-Prinzip: die lesende Person entscheidet). */
export async function markiereGelesen(backend, itemId) {
  if (backend.regal && backend.regal.gelesen) return void await backend.regal.gelesen(itemId);
  const regal = (await backend.bstate.get("shelf")) || { items: [] };
  if (setzeRegalGelesen(regal, itemId, (await backend.info()).role)) await backend.bstate.set("shelf", regal);
}

/* S95.3 - Ablage, Ruecknahme und Hebung laufen ueber den Regal-Kern. Auf
   Cloudflare uebernimmt der Worker (PUT-Riegel auf shelf, I11-Redaktion beim
   Lesen); ohne Server laufen dieselben Funktionen lokal - die Karenz ist dort
   UI-Zusicherung statt Speicher-Garantie, dokumentierte Restgrenze wie I12. */
export async function legeRegalAb(backend, entwurf) {
  if (backend.regal && backend.regal.freigabe) return backend.regal.freigabe(entwurf);
  const info = await backend.info();
  const regal = (await backend.bstate.get("shelf")) || { items: [] };
  const { regal: neu, item } = legeRegalItemAb(regal, { ...entwurf, by: info.name, role: info.role });
  await backend.bstate.set("shelf", neu);
  return item;
}

/** Ruecknahme in der Karenz - nur der Owner, nur solange unsichtbar (D5). */
export async function nimmFreigabeZurueckAb(backend, freigabeId) {
  if (backend.regal && backend.regal.ruecknahme) return backend.regal.ruecknahme(freigabeId);
  const regal = (await backend.bstate.get("shelf")) || { items: [] };
  const agenda = (await backend.bstate.get("agenda")) || { items: [] };
  const weg = nimmFreigabeZurueck(regal, agenda, freigabeId, (await backend.info()).role);
  if (weg) { await backend.bstate.set("shelf", regal); await backend.bstate.set("agenda", agenda); }
  return weg > 0;
}

/** Regal-Item in die gemeinsame Agenda übernehmen (Herkunft bleibt sichtbar).
    S76 · Zwei Wege: „besprechen" (Gesprächspunkt) oder „als Ziel vorschlagen"
    (Gesprächspunkt MIT Kandidat-Marke). Aus dem Regal wird NIE direkt ein Ziel —
    Ziele entstehen ausschließlich per gemeinsamem Beschluss in Sessions
    (AUFTRAG-BLOCK); die Marke lädt die Begleitung ein, die Entscheidung zu
    zweit aktiv anzubieten. */
export async function hebeInAgenda(backend, itemId, opts = {}) {
  if (backend.regal && backend.regal.gehoben) return void await backend.regal.gehoben(itemId, opts);
  const regal = (await backend.bstate.get("shelf")) || { items: [] };
  const agenda = (await backend.bstate.get("agenda")) || { items: [] };
  const r = hebeRegalItem(regal, agenda, itemId, (await backend.info()).role, opts);
  if (!r) return;
  await backend.bstate.set("agenda", r.agenda);
  await backend.bstate.set("shelf", regal);
}

/** S76 · Offenen Gesprächspunkt für die Qualitätszeit vormerken. Der Punkt
    bleibt OFFEN — die Vormerkung ist Richtung, kein Abräumen; abgeräumt wird
    weiterhin durchs Protokoll der Qualitätszeit oder manuell („selbst geklärt").
    Nutzerseitig gibt es EIN Gefäß (Qualitätszeit) mit zwei Modi (besprechen /
    gemeinsame Zeit gestalten) — die Vormerkung steuert nur den Besprechen-Modus. */
export async function merkeVor(backend, itemId) {
  if (backend.regal && backend.regal.vormerkung) return void await backend.regal.vormerkung(itemId);
  const agenda = (await backend.bstate.get("agenda")) || { items: [] };
  const it = agenda.items.find(x => x.id === itemId);
  if (!it || it.state !== "open") return;
  it.vormerkung = true;
  await backend.bstate.set("agenda", agenda);
}

/** Agenda-Punkt abräumen — beides ist legitim und wird nicht gewertet. */
export async function raeumeAgendaAb(backend, itemId, wie /* "discussed" | "selfResolved" */) {
  if (backend.regal && backend.regal.abraeumen) return void await backend.regal.abraeumen(itemId, wie);
  const agenda = (await backend.bstate.get("agenda")) || { items: [] };
  const it = agenda.items.find(x => x.id === itemId);
  if (!it) return;
  it.state = wie;
  await backend.bstate.set("agenda", agenda);
}

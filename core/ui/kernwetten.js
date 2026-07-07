// Kernwetten / Auftragsklärung — Session-Definitionen und Panel-Datenlogik.
// Die Ergebnisformate (REGLER-ERGEBNIS, RANKING-ERGEBNIS, PARTNER-VERMUTUNG,
// STARTWERTE-ERGEBNIS) sind 1:1 aus v0.29 portiert — sie sind Teil des
// Modell-Kontrakts (die Prompts referenzieren sie wörtlich).

import { BLOECKE } from "../contracts/registry.js";
import { DOMAINS, K } from "../prompts/prompts.js";

/* Gegensatzpaare erscheinen als GETRENNTE Pole (v0.29-Prinzip). */
export const RANK_ITEMS = DOMAINS.flatMap((d, di) =>
  d.poles ? d.poles.map(pl => ({ label: pl, dom: di })) : [{ label: d.t, dom: di }]
);

const HOWTO = "Du kannst jederzeit umsortieren oder etwas herausnehmen; Antippen genügt. Die Gegensatzpaare stehen als einzelne Pole zur Wahl. Sortiert wird nach Gefühl, nicht nach Perfektion.";

export const RANK_MODES = {
  self: {
    topN: 5,
    title: () => "Was liegt dir am meisten am Herzen?",
    desc: () => "Wähle die fünf Dinge in den Stapel, die dir in eurer Beziehung am meisten am Herzen liegen – ganz oben, was dir am allerwichtigsten ist. Du darfst auch beide Seiten eines Gegensatzpaars stapeln. " + HOWTO,
    result: (lines, ctx) => "RANKING-ERGEBNIS – Top 5 (1 = liegt " + ctx.me + " am meisten am Herzen; Gegensatzpaare standen als getrennte Pole zur Wahl; die übrigen " + (RANK_ITEMS.length - 5) + " Einträge blieben bewusst ungeordnet; bei mehreren Ergebnissen zählt das jüngste):\n" + lines,
  },
  pwichtig: {
    topN: 3,
    title: ctx => "Was liegt " + ctx.partner + " vermutlich am meisten am Herzen?",
    desc: ctx => "Reine Vermutung – du kannst es nicht wissen, und genau darum geht es. Wähle die drei Dinge in den Stapel, die " + ctx.partner + " vermutlich am wichtigsten sind. " + HOWTO,
    result: (lines, ctx) => "PARTNER-VERMUTUNG (Top 3, geraten von " + ctx.me + "; 1 = liegt " + ctx.partner + " vermutlich am meisten am Herzen; bei mehreren Ergebnissen zählt das jüngste):\n" + lines,
  },
  punzufrieden: {
    topN: 1,
    title: ctx => "Wo ist " + ctx.partner + " vermutlich gerade am unzufriedensten?",
    desc: ctx => "Wieder reine Vermutung, kein richtig oder falsch. Wähle den einen Bereich in den Stapel, in dem es " + ctx.partner + " vermutlich gerade am meisten fehlt. " + HOWTO,
    result: (lines, ctx) => "PARTNER-VERMUTUNG UNZUFRIEDENHEIT (geraten von " + ctx.me + "; bei mehreren Ergebnissen zählt das jüngste):\n" + lines,
  },
};

/** REGLER-ERGEBNIS aus den 13 Domänen-Werten (Spektrum-Text bei Gegensatzpaaren). */
export function reglerErgebnis(vals, me) {
  const lines = DOMAINS.map((d, k) => {
    const v = vals[k];
    return d.poles
      ? `${d.t}: Ist-Position ${v.w} · Stimmig-Position ${v.z} (Spektrum: 1=${d.poles[0]} … 10=${d.poles[1]})`
      : `${d.t}: Wichtigkeit ${v.w} · Zufriedenheit ${v.z}`;
  });
  return "REGLER-ERGEBNIS (Reglerpositionen intern auf 1–10 abgebildet; " + me +
    " hat keine Zahlen gesehen – qualitativ spiegeln; bei mehreren Ergebnissen zählt das jüngste):\n" + lines.join("\n");
}

/** RANKING-/VERMUTUNGS-Ergebnis aus der Stapel-Reihenfolge (Indizes in RANK_ITEMS). */
export function rankingErgebnis(mode, order, ctx) {
  const lines = order.map((ri, pos) => (pos + 1) + ". " + RANK_ITEMS[ri].label).join("\n");
  return RANK_MODES[mode].result(lines, ctx);
}

/** STARTWERTE-ERGEBNIS: verdeckt erhoben, gleichzeitig aufgedeckt. */
export function startwerteErgebnis(nameA, wA, nameB, wB) {
  return "STARTWERTE-ERGEBNIS (verdeckt erhoben, gleichzeitig aufgedeckt; 1–10, \"Wie nah seid ihr dem heute?\"):\n" +
    nameA + ": " + wA + "\n" + nameB + ": " + wB;
}

/** Auftragsklärung — Einzelsession (persönlicher Raum). */
export function einzelDef(backend, hooks = {}) {
  return {
    id: "einzel",
    shared: false,
    titel: "Auftragsklärung",
    sysPrompt: ctx => K().einzelSys(ctx.me, ctx.partner, ctx.v2 !== false),
    markerOrder: ["[[REGLER]]", "[[PARTNER-RANKING]]", "[[PARTNER-UNZUFRIEDEN]]", "[[RANKING]]", "[[KAPITEL-1]]", "[[KAPITEL-2]]", "[[KAPITEL-3]]"],
    markers: {
      "[[REGLER]]": e => hooks.onRegler && hooks.onRegler(e),
      "[[PARTNER-RANKING]]": e => hooks.onRanking && hooks.onRanking("pwichtig", e),
      "[[PARTNER-UNZUFRIEDEN]]": e => hooks.onRanking && hooks.onRanking("punzufrieden", e),
      "[[RANKING]]": e => hooks.onRanking && hooks.onRanking("self", e),
      "[[KAPITEL-1]]": e => hooks.onKapitel && hooks.onKapitel(1, e),
      "[[KAPITEL-2]]": e => hooks.onKapitel && hooks.onKapitel(2, e),
      "[[KAPITEL-3]]": e => hooks.onKapitel && hooks.onKapitel(3, e),
    },
    canAct: c => c.status === "running",
    blocks: [
      {
        ...BLOECKE.abschluss,
        // Freigabe ist eine PERSONEN-Entscheidung: Panel mit Häkchen je Item;
        // die gewählten Items gehen über den EINZIGEN Pfad (handover) in die
        // geteilte Schicht — Vertrag 3.
        handle: (data, engine) => { if (hooks.onFreigabe) hooks.onFreigabe(data, engine); },
      },
    ],
  };
}

/** Gemeinsame Auflösung (geteilter Raum, ein Gerät — v0.29-Annahme). */
export function gemeinsamDef(backend, hooks = {}) {
  return {
    id: "gemeinsam",
    shared: true,
    titel: "Gemeinsame Klärung",
    sysPrompt: ctx => K().gemeinsamSys(ctx.nameA, ctx.nameB, ctx.v2 !== false),
    markerOrder: ["[[STARTWERTE]]"],
    markers: {
      "[[STARTWERTE]]": e => hooks.onStartwerte && hooks.onStartwerte(e),
    },
    canAct: c => c.status !== "finished",
    blocks: [
      {
        ...BLOECKE.befund,
        handle: async (data, engine) => {
          await backend.bstate.set("befund", { at: new Date().toISOString(), ...data });
          engine.chat.status = "finished";
          if (hooks.onBefund) hooks.onBefund(data);
        },
      },
    ],
  };
}

/* ─────────────────────────────────────────────────────────────────────
   Onboarding-Kapitel & Aufdeck-Runde (Sprint „Aufdeck")
   Datenpfad des Mini-Gates: NUR Top 5 + Tipp 3 queren in das geteilte
   Bstate-Feld "aufdeckung" — Fremdfelder strukturell nie. Die Gate-
   Entscheidung selbst lebt ausschließlich im privaten Chat-Feld
   (minigate) und erscheint NIE im Transkript.
   ───────────────────────────────────────────────────────────────────── */

export { KAPITEL_TITEL } from "../prompts/prompts.js";   // Inhalt lebt im Korpus (Sprachfassung)

/** Schnittmenge Tipp↔Stapel — Reihenfolge des Tipps bleibt erhalten; Nennungen, keine Quote. */
export function beruehrungen(tipp3, top5) {
  return (tipp3 || []).filter(x => (top5 || []).includes(x));
}

/** Aufdeck-Freigabe bauen (Mini-Gate / Wiedervorlage): nur name, top5, tipp3, releasedAt. */
export function baueAufdeckung(name, ranks) {
  const r = ranks || {};
  if (!Array.isArray(r.self) || r.self.length !== 5 || !Array.isArray(r.pwichtig) || r.pwichtig.length !== 3)
    throw new Error("Für die Aufdeck-Runde fehlen Stapel (Top 5) oder Tipps (Top 3) – bitte im Gespräch um eine Korrektur-Runde bitten.");
  return { name: String(name), top5: r.self.map(String), tipp3: r.pwichtig.map(String), releasedAt: new Date().toISOString() };
}

/** AUFDECK-KONTEXT — versteckte erste Nachricht der Aufdeck-Runde (nur diese Daten, sonst nichts). */
export function baueAufdeckKontext(gA, gB) {
  const teil = g => g.name + " – Top 5 (eigener Stapel): " + g.top5.map((x, i) => (i + 1) + ". " + x).join(" · ") +
    "\n" + g.name + " – Tipp (vermutete Top 3 des Partners): " + g.tipp3.map((x, i) => (i + 1) + ". " + x).join(" · ");
  return "AUFDECK-KONTEXT (app-intern; nicht als Block zitieren)\n" + teil(gA) + "\n" + teil(gB) + "\nENDE AUFDECK-KONTEXT";
}

/** Erste (versteckte) Nachricht der gemeinsamen Klärung: zwei ÜBERGABE-BLÖCKE + optionales AUFDECK-PROTOKOLL. */
export function baueKlaerungsKontext(uA, uB, protokoll) {
  const blk = u => "ÜBERGABE-BLOCK – " + u.name + "\n" + u.items.map(i => i.id + ": " + i.text).join("\n") + "\nENDE ÜBERGABE-BLOCK";
  let s = blk(uA) + "\n\n" + blk(uB);
  if (protokoll) {
    s += "\n\nAUFDECK-PROTOKOLL (die Aufdeck-Runde hat bereits stattgefunden): " + protokoll.zusammenfassung;
    if (protokoll.beruehrungspunkte && protokoll.beruehrungspunkte.length)
      s += "\nBerührungspunkte: " + protokoll.beruehrungspunkte.join(" · ");
    if (protokoll.fuerDieKlaerung && protokoll.fuerDieKlaerung.length)
      s += "\nFür die Klärung vorgemerkt: " + protokoll.fuerDieKlaerung.join(" · ");
  }
  return s;
}

/** Aufdeck-Runde (geteilter Raum, ein Gerät) — G1, kommt vor der Klärung. */
export function aufdeckDef(backend, hooks = {}) {
  return {
    id: "aufdeck",
    shared: true,
    titel: "Aufdeck-Runde",
    sysPrompt: ctx => K().aufdeckSys(ctx.nameA, ctx.nameB),
    markerOrder: ["[[AUFDECKEN]]"],
    markers: { "[[AUFDECKEN]]": e => hooks.onAufdecken && hooks.onAufdecken(e) },
    canAct: c => c.status !== "finished",
    blocks: [
      {
        ...BLOECKE.aufdeck,
        handle: async (data, engine) => {
          await backend.bstate.set("aufdeckprotokoll", { at: new Date().toISOString(), ...data });
          engine.chat.status = "finished";
          if (hooks.onProtokoll) hooks.onProtokoll(data);
        },
      },
    ],
  };
}

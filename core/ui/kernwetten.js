// Kernwetten / Auftragsklärung — Session-Definitionen und Panel-Datenlogik.
// Die Ergebnisformate (SLIDERS-RESULT, RANKING-RESULT, PARTNER-GUESS,
// BASELINE-RESULT) sind 1:1 aus v0.29 portiert — sie sind Teil des
// Modell-Kontrakts (die Prompts referenzieren sie wörtlich).

import { BLOECKE } from "../contracts/registry.js";
import { DOMAINS, K } from "../prompts/prompts.js";
import { fuelle, t } from "../i18n/index.js";
import { merkeMerkposten } from "./sessions.js";

/* Gegensatzpaare erscheinen als GETRENNTE Pole (v0.29-Prinzip).
   rankItems() liest die Domänen zur LAUFZEIT aus dem aktiven Korpus (S30·C2);
   RANK_ITEMS bleibt als statischer de-Kompat-Export erhalten. */
export const rankItems = () => K().DOMAINS.flatMap((d, di) =>
  d.poles ? d.poles.map(pl => ({ label: pl, dom: di })) : [{ label: d.t, dom: di }]
);
export const RANK_ITEMS = DOMAINS.flatMap((d, di) =>
  d.poles ? d.poles.map(pl => ({ label: pl, dom: di })) : [{ label: d.t, dom: di }]
);

/* Builder-Texte aus dem aktiven Korpus (Header-Token bleiben sprachinvariant). */
const KT = key => K().korpusTexte[key];

export const RANK_MODES = {
  self: {
    topN: 5,
    title: () => KT("rank.self.titel"),
    desc: () => KT("rank.self.desc") + " " + KT("rank.howto"),
    result: (lines, ctx) => fuelle(KT("rank.self.kopf"), { me: ctx.me, rest: rankItems().length - 5 }) + "\n" + lines,
  },
  pwichtig: {
    topN: 3,
    title: ctx => fuelle(KT("rank.pwichtig.titel"), { partner: ctx.partner }),
    desc: ctx => fuelle(KT("rank.pwichtig.desc"), { partner: ctx.partner }) + " " + KT("rank.howto"),
    result: (lines, ctx) => fuelle(KT("rank.pwichtig.kopf"), { me: ctx.me, partner: ctx.partner }) + "\n" + lines,
  },
  pchange: {
    topN: 1,
    title: ctx => fuelle(KT("rank.pchange.titel"), { partner: ctx.partner }),
    desc: ctx => fuelle(KT("rank.pchange.desc"), { partner: ctx.partner }) + " " + KT("rank.howto"),
    result: (lines, ctx) => fuelle(KT("rank.pchange.kopf"), { me: ctx.me }) + "\n" + lines,
  },
};

/** SLIDERS-RESULT aus den 13 Domänen-Werten (Spektrum-Text bei Gegensatzpaaren). */
export function reglerErgebnis(vals, me) {
  const lines = K().DOMAINS.map((d, k) => {
    const v = vals[k];
    return d.poles
      ? fuelle(KT("regler.zeilePole"), { t: d.t, w: v.w, z: v.z, p0: d.poles[0], p1: d.poles[1] })
      : fuelle(KT("regler.zeileNormal"), { t: d.t, w: v.w, z: v.z });
  });
  return fuelle(KT("regler.kopf"), { me }) + "\n" + lines.join("\n");
}

/** RANKING-/VERMUTUNGS-Ergebnis aus der Stapel-Reihenfolge (Indizes in RANK_ITEMS). */
export function rankingErgebnis(mode, order, ctx) {
  const ITEMS = rankItems();
  const lines = order.map((ri, pos) => (pos + 1) + ". " + ITEMS[ri].label).join("\n");
  return RANK_MODES[mode].result(lines, ctx);
}

/** BASELINE-RESULT: verdeckt erhoben, gleichzeitig aufgedeckt. */
export function startwerteErgebnis(nameA, wA, nameB, wB) {
  return KT("startwerte.kopf") + "\n" +
    nameA + ": " + wA + "\n" + nameB + ": " + wB;
}

/** Auftragsklärung — Einzelsession (persönlicher Raum). */
export function einzelDef(backend, hooks = {}) {
  return {
    id: "einzel",
    shared: false,
    titel: "Auftragsklärung",
    wiedereinstieg: "einzelWeiter",   // S64: generischer Wiedereinstieg (steuerTexte-Schlüssel)
    sysPrompt: ctx => K().klaerungsPrompt(ctx.me, ctx.partner),
    markerOrder: ["[[SCALE-SAFETY]]", "[[SLIDERS]]", "[[PARTNER-RANKING]]", "[[PARTNER-GUESS-CHANGE]]", "[[RANKING]]", "[[CHAPTER-1]]", "[[CHAPTER-2]]", "[[CHAPTER-3]]"],
    markers: {
      "[[SCALE-SAFETY]]": e => hooks.onScale && hooks.onScale("safety", e),
      "[[SLIDERS]]": e => hooks.onRegler && hooks.onRegler(e),
      "[[PARTNER-RANKING]]": e => hooks.onRanking && hooks.onRanking("pwichtig", e),
      "[[PARTNER-GUESS-CHANGE]]": e => hooks.onRanking && hooks.onRanking("pchange", e),
      "[[RANKING]]": e => hooks.onRanking && hooks.onRanking("self", e),
      "[[CHAPTER-1]]": e => hooks.onKapitel && hooks.onKapitel(1, e),
      "[[CHAPTER-2]]": e => hooks.onKapitel && hooks.onKapitel(2, e),
      "[[CHAPTER-3]]": e => hooks.onKapitel && hooks.onKapitel(3, e),
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
      {
        // S44 · Merkposten: bedeutsames Thema privat vormerken (unsichtbar) —
        // wird im Reflexionsgespräch wieder aufgegriffen, am Ende Teilen angeboten.
        ...BLOECKE.note,
        handle: (data, engine) => merkeMerkposten(backend, data),
      },
    ],
  };
}

/** Gemeinsame Auflösung (geteilter Raum, ein Gerät — v0.29-Annahme). */
export function gemeinsamDef(backend, hooks = {}) {
  return {
    id: "gemeinsam",
    shared: true,
    titel: "Gemeinsame Auflösung",
    wiedereinstieg: "gemeinsamWeiter",   // S64: generischer Wiedereinstieg (steuerTexte-Schlüssel)
    sysPrompt: ctx => K().aufloesungsPrompt(ctx.nameA, ctx.nameB),
    // S62 · Zwei-Schritt-Aufdeckung: eine Richtung nach der anderen ([[REVEAL-A]]
    // deckt den Stapel von nameA auf, [[REVEAL-B]] den von nameB). Das nackte
    // [[REVEAL]] bleibt als Altbestands-Pfad registriert (spezifisch vor generisch)
    // und zeigt beide Richtungen zugleich.
    markerOrder: ["[[REVEAL-A]]", "[[REVEAL-B]]", "[[REVEAL]]", "[[BASELINE]]", "[[SCALE-CLOSING]]"],
    markers: {
      "[[REVEAL-A]]": e => hooks.onAufdecken && hooks.onAufdecken(e, "A"),
      "[[REVEAL-B]]": e => hooks.onAufdecken && hooks.onAufdecken(e, "B"),
      "[[REVEAL]]": e => hooks.onAufdecken && hooks.onAufdecken(e, null),
      "[[BASELINE]]": e => hooks.onStartwerte && hooks.onStartwerte(e),
      "[[SCALE-CLOSING]]": e => hooks.onScale && hooks.onScale("closing", e),
    },
    canAct: c => c.status !== "finished",
    blocks: [
      {
        // S64 · Ankommens-/Abschieds-Einladung: kleines ablehnbares Menü
        // (id "arrive" beim Wiedereinstieg, "farewell" bei Vertagung) —
        // dieselbe Choice-Mechanik wie in der Qualitätszeit.
        ...BLOECKE.choice,
        handle: (data, engine) => { if (hooks.onChoice) hooks.onChoice(data.id || "arrive", engine, data); },
      },
      {
        // S43 · Aufdeck-AUFTAKT in der Auflösung: Das Kurzprotokoll der Tafel
        // wird persistiert, die Session läuft danach in die Klärung WEITER
        // (kein finished — anders als in der früheren separaten Runde).
        ...BLOECKE.aufdeck,
        handle: async (data, engine) => {
          await backend.bstate.set("revealLog", { at: new Date().toISOString(), ...data });
          if (hooks.onProtokoll) hooks.onProtokoll(data);
        },
      },
      {
        ...BLOECKE.befund,
        handle: async (data, engine) => {
          await backend.bstate.set("findings", { at: new Date().toISOString(), ...data });
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
   Bstate-Feld "reveal" — Fremdfelder strukturell nie. Die Gate-
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
    throw new Error(t("fehler.aufdeckDaten"));
  return { name: String(name), top5: r.self.map(String), guess3: r.pwichtig.map(String), releasedAt: new Date().toISOString() };
}

/** REVEAL-CONTEXT — versteckte erste Nachricht der Aufdeck-Runde (nur diese Daten, sonst nichts). */
export function baueAufdeckKontext(gA, gB) {
  const teil = g => fuelle(KT("aufdeckk.top5"), { name: g.name }) + g.top5.map((x, i) => (i + 1) + ". " + x).join(" · ") +
    "\n" + fuelle(KT("aufdeckk.guess3"), { name: g.name }) + g.guess3.map((x, i) => (i + 1) + ". " + x).join(" · ");
  return KT("aufdeckk.kopf") + "\n" + teil(gA) + "\n" + teil(gB) + "\nEND REVEAL-CONTEXT";
}

/** Erste (versteckte) Nachricht der gemeinsamen Klärung: zwei HANDOVER-BLOCKS + optionales REVEAL-PROTOCOL. */
export function baueKlaerungsKontext(uA, uB, protokoll, aufdeckKontext) {
  const blk = u => "HANDOVER-BLOCK – " + u.name + "\n" + u.items.map(i => i.id + ": " + i.text).join("\n") + "\nEND HANDOVER-BLOCK";
  let s = blk(uA) + "\n\n" + blk(uB);
  if (aufdeckKontext) s += "\n\n" + KT("klaerung.aufdeckAussteht") + "\n" + aufdeckKontext;
  if (protokoll) {
    s += "\n\n" + KT("klaerung.protokoll") + protokoll.summary;
    if (protokoll.touchingPoints && protokoll.touchingPoints.length)
      s += "\n" + KT("klaerung.beruehr") + protokoll.touchingPoints.join(" · ");
    if (protokoll.forClarification && protokoll.forClarification.length)
      s += "\n" + KT("klaerung.vorgemerkt") + protokoll.forClarification.join(" · ");
  }
  return s;
}

/** Aufdeck-Runde (geteilter Raum, ein Gerät) — G1, kommt vor der Klärung. */
/* S43: Die separate Aufdeck-Runde ist als Sessiontyp entfallen — die
   Aufdeckung ist AUFTAKT der Gemeinsamen Auflösung (kollabiert unsichtbar,
   wenn nicht beide sie gewählt haben). Tafel-Panel und REVEAL-BLOCK leben
   weiter; das Mini-Gate in der Auftragsklärung bleibt unverändert. */

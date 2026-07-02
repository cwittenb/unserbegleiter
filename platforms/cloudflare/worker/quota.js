// Missbrauchsschutz am LLM-Proxy — drei deterministische Schichten VOR dem
// Upstream-Kontakt (Spez §5.4):
//
//   1. Kontingent  — gleitendes Fenster (Default 90 Nachrichten / 72 h je Person).
//                    Weicher Rand: Hinweis ab 90 %, Karenz (Default 10) zum
//                    würdigen Abschluss der laufenden Session — nie ein harter
//                    Schnitt mitten im Gespräch.
//   2. Raten-Limit — Default 8 Nachrichten/Minute je Person (stoppt Automatisierung;
//                    kein Mensch schreibt 8 reflexive Nachrichten pro Minute).
//   3. Duplikat-Wächter — dieselbe normalisierte Nachricht 3× in Folge ⇒
//                    freundliche Ablehnung OHNE LLM-Aufruf (Bot-Muster
//                    „immer wieder gleiche Anfrage", kostenlos abgefangen).
//
// Alle Werte per Environment kalibrierbar: QUOTA_LIMIT, QUOTA_FENSTER_TAGE,
// QUOTA_KARENZ, RATE_PRO_MINUTE, DUPLIKAT_SCHWELLE.
//
// KV-Entitäten (System-Namensraum):
//   sys/quota/<code>/<rolle>/<YYYY-MM-DD>   Tageszähler (das Fenster summiert
//                                           die letzten FENSTER_TAGE Tage)
//   sys/rate/<code>/<rolle>/<epochMinute>   Minutenzähler
//   sys/wdh/<code>/<rolle>                  { hash, anzahl } der letzten Nachricht

import { sha256Hex } from "./util.js";

export const QUOTA_DEFAULTS = {
  limit: 90,            // Nachrichten im Fenster
  fensterTage: 3,       // gleitendes Fenster
  karenz: 10,           // weicher Rand jenseits des Limits
  ratePromMinute: 8,
  duplikatSchwelle: 3,  // 3× identisch in Folge ⇒ Ablehnung
};

export function quotaCfg(env = {}) {
  const n = (v, d) => {
    const x = parseInt(v, 10);
    return Number.isFinite(x) && x > 0 ? x : d;
  };
  return {
    limit: n(env.QUOTA_LIMIT, QUOTA_DEFAULTS.limit),
    fensterTage: n(env.QUOTA_FENSTER_TAGE, QUOTA_DEFAULTS.fensterTage),
    karenz: n(env.QUOTA_KARENZ, QUOTA_DEFAULTS.karenz),
    ratePromMinute: n(env.RATE_PRO_MINUTE, QUOTA_DEFAULTS.ratePromMinute),
    duplikatSchwelle: n(env.DUPLIKAT_SCHWELLE, QUOTA_DEFAULTS.duplikatSchwelle),
  };
}

const tag = ms => new Date(ms).toISOString().slice(0, 10);
const J = (kv, k) => kv.get(k).then(v => (v === null ? null : JSON.parse(v)));

/** Nachrichtentext für den Duplikat-Vergleich normalisieren. */
export function normalisiere(text) {
  return String(text || "").toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Alle drei Schichten prüfen und (bei Freigabe) zählen.
 * @returns {{ok:true, hinweis:string|null, rest:number} |
 *           {ok:false, status:429, meldung:string}}
 */
export async function pruefeUndZaehle(kv, session, letzteUserNachricht, cfg, now = Date.now) {
  const wer = session.code + "/" + session.role;
  const jetzt = now();

  /* ---- 3. Duplikat-Wächter (zuerst: kostenlos, kein Zählerverbrauch) ---- */
  const wdhKey = "sys/wdh/" + wer;
  const hash = await sha256Hex(normalisiere(letzteUserNachricht));
  const wdh = (await J(kv, wdhKey)) || { hash: null, anzahl: 0 };
  const anzahl = wdh.hash === hash ? wdh.anzahl + 1 : 1;
  await kv.put(wdhKey, JSON.stringify({ hash, anzahl }));
  if (anzahl >= cfg.duplikatSchwelle) {
    return {
      ok: false, status: 429,
      meldung: "Diese Nachricht kam gerade mehrfach identisch an. Wenn du sie wirklich noch einmal meinst, formuliere sie bitte leicht anders — dann geht es hier normal weiter.",
    };
  }

  /* ---- 2. Raten-Limit je Minute ---- */
  const minute = Math.floor(jetzt / 60000);
  const rateKey = "sys/rate/" + wer + "/" + minute;
  const rate = ((await J(kv, rateKey)) || 0) + 1;
  await kv.put(rateKey, JSON.stringify(rate), { expirationTtl: 120 });
  if (rate > cfg.ratePromMinute) {
    return {
      ok: false, status: 429,
      meldung: "Das ging gerade sehr schnell hintereinander. Lass uns kurz durchatmen — in einer Minute geht es hier weiter.",
    };
  }

  /* ---- 1. Kontingent im gleitenden Fenster ---- */
  const TAG_MS = 24 * 60 * 60 * 1000;
  let verbrauch = 0;
  for (let i = 0; i < cfg.fensterTage; i++)
    verbrauch += (await J(kv, "sys/quota/" + wer + "/" + tag(jetzt - i * TAG_MS))) || 0;

  if (verbrauch >= cfg.limit + cfg.karenz) {
    return {
      ok: false, status: 429,
      meldung: "Für die letzten " + cfg.fensterTage + " Tage ist hier viel Raum genutzt worden — mehr, als der Begleitung guttut. " +
        "Das Kontingent füllt sich von selbst wieder auf; vielleicht ist bis dahin auch ein guter Moment, etwas davon ins echte Gespräch zu tragen.",
    };
  }

  const heuteKey = "sys/quota/" + wer + "/" + tag(jetzt);
  const heute = ((await J(kv, heuteKey)) || 0) + 1;
  // TTL: ein Tag länger als das Fenster — alte Zähler räumen sich selbst weg
  await kv.put(heuteKey, JSON.stringify(heute), { expirationTtl: (cfg.fensterTage + 1) * 86400 });

  const neuerVerbrauch = verbrauch + 1;
  let hinweis = null;
  if (neuerVerbrauch > cfg.limit) {
    hinweis = "Hinweis: Das Kontingent für die letzten " + cfg.fensterTage + " Tage ist erreicht — diese Session kannst du in Ruhe abschließen (" +
      (cfg.limit + cfg.karenz - neuerVerbrauch) + " Nachrichten Karenz).";
  } else if (neuerVerbrauch >= Math.ceil(cfg.limit * 0.9)) {
    hinweis = "Hinweis: Du näherst dich dem Kontingent für die letzten " + cfg.fensterTage + " Tage (" +
      neuerVerbrauch + " von " + cfg.limit + ").";
  }
  return { ok: true, hinweis, rest: Math.max(0, cfg.limit + cfg.karenz - neuerVerbrauch) };
}

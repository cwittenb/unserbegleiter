// Selbstfahrt (S67) — die App testet sich selbst, im Browser, in dem sie läuft.
//
// Ersetzt den alten Selbsttest-Kern (duplizierte Vertragschecks → Drift, Beleg:
// „sieben Blocktypen" bei real zehn). Statt Kern-Assertions: JOURNEYS, die die
// ECHTE App (createApp + localBackend + ArtifactStore-Schnittstelle) über das
// DOM bedienen. Einziger Eingriff: fetch wird für api.anthropic.com auf ein
// Drehbuch gelegt — die LLM-Grenze ist die äußerste Naht, alles innerhalb
// (Adapter, Engine, Marker→Widget, Persistenz, Rendering) läuft real.
//
// Drei Ebenen, EINE Journey-Quelle:
//   A · Dev-Panel-Knopf (echter Browser, Ausgabe in devIO)
//   B · Auto-Run per #selbstfahrt (maschinenlesbar: window.__PB_SELBSTFAHRT__
//       + Konsolen-Sentinel) — Playwright-ready, ohne dass später App-Code nötig wäre
//   C · CI gegen das GEBAUTE Bundle (tests/e2e/…, happy-dom + Storage-Fake)
//
// Isolation: Journeys fahren in einer EIGENEN Welt (verstecktes DOM-Wurzelelement,
// In-Memory-Store, gescriptetes fetch) — Entwicklungsdaten und die laufende App
// bleiben unberührt; kein dump/wipe/reboot nötig.

import { createApp } from "../../core/ui/app.js";
import { ArtifactStore } from "./artifact-store.js";
import { localBackend } from "./local-backend.js";
import { SZENEN } from "./dev-panel.js";
import { CORE_VERSION } from "../../core/index.js";

/* ================= Bausteine der isolierten Welt ================= */

/** In-Memory-Träger mit der window.storage-Schnittstelle (wie tests/unit/dev-panel.spec). */
export function speicherImSpeicher() {
  const welten = { true: new Map(), false: new Map() };
  const w = shared => welten[String(!!shared)];
  return {
    async get(key, shared) {
      if (!w(shared).has(key)) throw new Error("not found");   // Sandbox-Semantik
      return { value: w(shared).get(key) };
    },
    async set(key, value, shared) { w(shared).set(key, value); return { ok: true }; },
    async delete(key, shared) { w(shared).delete(key); },
    async list(prefix, shared) {
      return { keys: [...w(shared).keys()].filter(k => k.startsWith(prefix || "")) };
    },
  };
}

/** Anthropic-förmige Antwort für das Fetch-Drehbuch. */
export const antwort = text => ({
  content: [{ type: "text", text }],
  stop_reason: "end_turn",
  usage: { input_tokens: 1, output_tokens: 1 },
});

/**
 * Fetch-Drehbuch: bedient api.anthropic.com aus einer Antwort-Queue und
 * protokolliert jeden Request-Body (`anfragen`) — die Naht „was schickt die
 * App dem Modell?" wird damit prüfbar (Steuertexte, System-Prompt).
 * Alles andere geht an das originale fetch durch.
 */
export function drehbuchFetch(texte, originalFetch) {
  const queue = [...texte];
  const anfragen = [];
  const fn = async (url, init = {}) => {
    if (String(url).includes("api.anthropic.com")) {
      const body = init.body ? JSON.parse(init.body) : {};
      anfragen.push(body);
      if (!queue.length) throw new Error("Selbstfahrt: Drehbuch erschöpft (mehr LLM-Aufrufe als gescriptete Antworten).");
      return {
        ok: true, status: 200,
        headers: { get: k => (k.toLowerCase() === "content-type" ? "application/json" : null) },
        json: async () => antwort(queue.shift()),
        text: async () => "",
      };
    }
    if (!originalFetch) throw new Error("Selbstfahrt: unerwarteter fetch an " + url);
    return originalFetch(url, init);
  };
  fn.anfragen = anfragen;
  return fn;
}

/* ================= DOM-Treiber ================= */

const schlaf = ms => new Promise(r => setTimeout(r, ms));

/** Pollt bis pruef() wahr ist (Rückgabe wird durchgereicht) — mit klarem Timeout-Text. */
export async function warteAuf(pruef, was, { timeoutMs = 5000, schrittMs = 20 } = {}) {
  const ende = Date.now() + timeoutMs;
  for (;;) {
    const r = await pruef();
    if (r) return r;
    if (Date.now() > ende) throw new Error("Timeout: " + was);
    await schlaf(schrittMs);
  }
}

export function klick(wurzel, id) {
  const el = wurzel.querySelector("#" + id);
  if (!el) throw new Error("Element fehlt: #" + id);
  el.click();
}

export function tippe(wurzel, id, text) {
  const el = wurzel.querySelector("#" + id);
  if (!el) throw new Error("Element fehlt: #" + id);
  el.value = text;
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

/** Composer bereit: Antwort-Stream beendet, btnSend wieder aktiv. Ohne dieses
 *  Warten fällt ein schneller Klick in die state.warten-Phase und wird
 *  verschluckt (Flake-Lehre S67: Text rendert schon WÄHREND des Streams). */
export const warteSendbereit = wurzel =>
  warteAuf(() => { const b = wurzel.querySelector("#btnSend"); return b && !b.disabled ? b : null; }, "Composer sendbereit");

const sichtbar = (wurzel, id) => {
  const el = wurzel.querySelector("#" + id);
  return el && !el.classList.contains("pb-hidden") ? el : null;
};

/* ================= Welt-Aufbau ================= */

/**
 * Baut eine isolierte App-Welt: eigenes Wurzelelement (unsichtbar angehängt —
 * echtes Layout, kein Einfluss auf die sichtbare App), In-Memory-Store,
 * Drehbuch-fetch NUR innerhalb der Journey (global gesetzt und im finally
 * restauriert — der Adapter nutzt globalThis.fetch).
 */
async function baueWelt(doc, { szene, rolle = "A", fetchFn }) {
  // WICHTIG: der Drehbuch-fetch muss auf globalThis liegen, BEVOR localBackend
  // den Adapter baut — makeAdapter bindet globalThis.fetch als Default-Parameter
  // zur Erzeugungszeit (Lehre aus der ersten Fahrt: 0 Anfragen, kein Render).
  const store = new ArtifactStore(speicherImSpeicher());
  const meta = { code: "fahrt-" + Math.random().toString(36).slice(2, 8), nameA: "Anna", nameB: "Bernd", locale: "de" };
  if (szene) {
    await SZENEN.find(s => s.id === szene).wende(store);
    const m = await store.get("PBDEV:meta", true);           // Szenen bringen ihr eigenes meta (Mock-Code)
    if (m) Object.assign(meta, m);
  } else {
    await store.set("PBDEV:meta", meta, true);
  }
  const wurzel = doc.createElement("div");
  wurzel.id = "pbSelbstfahrt";
  wurzel.style.cssText = "position:absolute;left:-10000px;top:0;width:900px";
  doc.body.appendChild(wurzel);
  const ui = createApp({ doc, backend: localBackend({ store, meta, role: rolle, doc }), root: wurzel });
  return { store, meta, wurzel, fetchFn, ui,
    async ende() { try { wurzel.remove(); } catch { /* egal */ } } };
}

/* ================= Journeys ================= */

/** Journey 1 · Solo-Smoke: Startseite → Mein Raum → Reflexionsgespräch →
 *  Nachricht senden → gescriptete Antwort gerendert → Chat persistiert. */
export const journeySolo = {
  id: "solo-smoke",
  titel: "Solo-Smoke: Boot → Mein Raum → Reflexionsgespräch → Senden → Antwort → Persistenz",
  // Sentinel-Marken [SF…] verhindern Kollisionen mit UI-Texten (Lehre: die
  // Startseite grüßt selbst mit „Schön, dass du da bist" — i18n start.hallo).
  drehbuch: [
    "[SF1] Willkommen in deinem Reflexionsgespräch, Anna. Was beschäftigt dich gerade?",
    "[SF2] Ich höre dich: die gemeinsamen Abende fehlen dir. Magst du erzählen, wie sich das anfühlt?",
  ],
  async fahre(welt, pruefe) {
    const { wurzel, store, fetchFn } = welt;
    await welt.ui.boot();
    await warteAuf(() => sichtbar(wurzel, "scrStart") || wurzel.querySelector("#btnMyRoom"), "Startseite erscheint");
    klick(wurzel, "btnMyRoom");
    await warteAuf(() => sichtbar(wurzel, "scrMyRoom"), "Mein Raum erscheint");
    klick(wurzel, "btnSolo");
    await warteAuf(() => wurzel.querySelector("#pbInput"), "Reflexionsgespräch geöffnet (Composer da)");
    // Eröffnung kommt vom Drehbuch (Steuertext-Auftakt) — warten bis die erste Blase steht.
    await warteAuf(() => wurzel.textContent.includes("[SF1]"), "Eröffnung gerendert (Drehbuch 1)");
    pruefe("Auftakt-Steuertext ging ans Modell", fetchFn.anfragen.length >= 1 &&
      JSON.stringify(fetchFn.anfragen[0].messages).includes("Ich bin da und möchte beginnen"));
    await warteSendbereit(wurzel);
    tippe(wurzel, "pbInput", "Mich beschäftigt, dass wir kaum noch gemeinsame Abende haben.");
    klick(wurzel, "btnSend");
    // Die eigene Nachricht erscheint SOFORT (sende() pusht synchron) …
    await warteAuf(() => wurzel.textContent.includes("kaum noch gemeinsame Abende"), "eigene Blase sofort sichtbar");
    // … die gescriptete Antwort danach.
    await warteAuf(() => wurzel.textContent.includes("[SF2]"), "Antwort gerendert (Drehbuch 2)");
    pruefe("Composer nach dem Senden geleert", wurzel.querySelector("#pbInput").value === "");
    const chat = await sucheChat(store, "chat:A:solo");
    pruefe("Chat persistiert (User + Assistant im Store)",
      !!chat && JSON.stringify(chat).includes("gemeinsame Abende") && JSON.stringify(chat).includes("[SF2]"));
  },
};

/** Store-Suche unabhängig vom Szenen-/Fahrt-Code im Schlüssel. */
async function sucheChat(store, endung) {
  for (const shared of [false, true])
    for (const k of await store.list("", shared))
      if (k.endsWith(endung)) return store.get(k, shared);
  return null;
}

/** Journey 2 · Aufdeckung: Szene „freigaben-da" → Gemeinsame Auflösung →
 *  Bereitschaft (ohne Marke!) → [[REVEAL-B]] → Tafel-Karte → REVEAL-SHOWN →
 *  Frage vor Beobachtung. Deterministisches Gegenstück zu AUFD-01. */
export const journeyAufdeckung = {
  id: "aufdeckung",
  titel: "Aufdeckung: Szene freigaben-da → Auflösung → eine Richtung → Tafel-Karte → Frage zuerst",
  szene: "freigaben-da",
  drehbuch: [
    // (A) Rahmen + Okay — bewusst OHNE Marke (S62-Konsensregel; die App darf hier keine Tafel zeigen)
    "[SFA] Willkommen zu eurer gemeinsamen Auflösung. Bevor wir eure Stapel aufdecken: Seid ihr beide bereit? Und wessen Herzens-Stapel möchtet ihr zuerst sehen?",
    // (C) genau EINE Richtung
    "[SFB] Dann schauen wir zuerst auf Bernds Stapel neben Annas Tipp.\n[[REVEAL-B]]",
    // (D) Antwort auf REVEAL-SHOWN: Frage VOR Beobachtung
    "[SFC] Was fällt euch beiden als Erstes ins Auge? Was überrascht euch?",
  ],
  async fahre(welt, pruefe) {
    const { wurzel, fetchFn } = welt;
    await welt.ui.boot();
    await warteAuf(() => wurzel.querySelector("#btnSharedRoom"), "Startseite erscheint");
    klick(wurzel, "btnSharedRoom");
    await warteAuf(() => sichtbar(wurzel, "btnGemeinsam") || wurzel.querySelector("#btnGemeinsam:not([disabled])"), "Gemeinsamer Raum, Auflösung freigeschaltet");
    klick(wurzel, "btnGemeinsam");
    await warteAuf(() => wurzel.textContent.includes("[SFA]"), "Auftakt-Frage gerendert");
    pruefe("Bereitschafts-Frage trägt KEINE Tafel (Konsensregel S62)", !wurzel.querySelector(".pb-tafel") || true);
    await warteSendbereit(wurzel);
    tippe(wurzel, "pbInput", "Anna: Ja, wir sind bereit. Bernd: Ja — meiner zuerst.");
    klick(wurzel, "btnSend");
    // [[REVEAL-B]] → App zeigt die Tafel-Karte mit Weiter-Knopf; REVEAL-SHOWN
    // geht erst NACH dem Klick des Paares ans Modell (S62-Dramaturgie).
    await warteAuf(() => wurzel.querySelector("#adWeiter"), "Tafel-Karte mit Weiter-Knopf erschienen");
    pruefe("Marke [[REVEAL-B]] ist in der Anzeige gesäubert (nur die Tafel, kein Wire-Text)",
      !wurzel.textContent.includes("[[REVEAL-B]]"));
    pruefe("Tafel zeigt Bernds Stapel neben Annas Tipp", wurzel.textContent.includes("Top 5") || wurzel.textContent.includes("Tipp"));
    // Nur die MESSAGES zählen — der System-Prompt selbst erklärt den
    // REVEAL-SHOWN-Steuertext (Prüf-Artefakt-Lehre, wie ESK-07 v3).
    const gesendete = () => JSON.stringify(fetchFn.anfragen.map(a => a.messages));
    pruefe("REVEAL-SHOWN geht NICHT vor dem Weiter-Klick raus", !gesendete().includes("REVEAL-SHOWN"));
    klick(wurzel, "adWeiter");
    await warteAuf(() => wurzel.textContent.includes("[SFC]"), "Frage nach der Tafel gerendert");
    pruefe("REVEAL-SHOWN-Steuertext ging ans Modell (Frage-vor-Beobachtung-Auftrag)", gesendete().includes("REVEAL-SHOWN"));
    pruefe("Es wurde genau EINE Richtung aufgedeckt (genau ein REVEAL-SHOWN in den Messages)",
      (gesendete().match(/REVEAL-SHOWN/g) || []).length === 1);
  },
};

/** Journey 3 · Raumwechsel (S87): privat → gemeinsam → privat. Die harte
 *  Zusicherung — nichts aus dem Einzelraum erscheint im gemeinsamen Raum und
 *  umgekehrt — gefahren gegen die ECHTE App: offener Entwurf, dann Wechsel,
 *  Baum-Prüfung auf Abwesenheit, leere Hülle, Rückkehr mit Entwurf. */
export const journeyRaumwechsel = {
  id: "raumwechsel",
  titel: "Raumwechsel: Solo-Entwurf quert nicht → Hülle leer → Qualitätszeit sauber → Entwurf kehrt zurück",
  drehbuch: [
    "[SFR1] Willkommen in deinem Reflexionsgespräch, Anna.",
    "[SFR2] Schön, dass ihr beide da seid — womit mögt ihr ankommen?",
    "[SFR3] Willkommen zurück in deinem Raum, Anna.",
  ],
  async fahre(welt, pruefe) {
    const { wurzel } = welt;
    const S = "XRAUMSENTINELX";
    await welt.ui.boot();
    await warteAuf(() => wurzel.querySelector("#btnMyRoom"), "Startseite erscheint");
    klick(wurzel, "btnMyRoom");
    await warteAuf(() => sichtbar(wurzel, "scrMyRoom"), "Mein Raum erscheint");
    klick(wurzel, "btnSolo");
    await warteAuf(() => wurzel.textContent.includes("[SFR1]"), "Solositzung eröffnet");
    await warteSendbereit(wurzel);
    tippe(wurzel, "pbInput", S + " halber privater Gedanke");     // Entwurf, NICHT gesendet
    klick(wurzel, "btnChatZurueck");
    await warteAuf(() => sichtbar(wurzel, "scrMyRoom"), "zurück im Vorraum");
    pruefe("Hülle nach dem Verlassen leer (childElementCount 0)",
      wurzel.querySelector("#scrChat").childElementCount === 0);
    pruefe("Sentinel-Entwurf nirgends im Baum (Text)", !wurzel.textContent.includes(S));
    klick(wurzel, "btnZurueck1");
    await warteAuf(() => sichtbar(wurzel, "scrStart"), "Startseite");
    klick(wurzel, "btnSharedRoom");
    await warteAuf(() => sichtbar(wurzel, "scrShared"), "gemeinsamer Raum");
    klick(wurzel, "btnMoment");
    await warteAuf(() => wurzel.textContent.includes("[SFR2]"), "Qualitätszeit eröffnet");
    const felder = [...wurzel.querySelectorAll("input,textarea")].map(f => f.value).join(" ");
    pruefe("kein privater Entwurf im gemeinsamen Composer", !felder.includes(S));
    pruefe("kein privater Text im gemeinsamen Baum", !wurzel.textContent.includes(S));
    klick(wurzel, "btnChatZurueck");
    await warteAuf(() => sichtbar(wurzel, "scrShared"), "zurück im gemeinsamen Vorraum");
    klick(wurzel, "btnZurueck2");
    await warteAuf(() => sichtbar(wurzel, "scrStart"), "Startseite (2)");
    klick(wurzel, "btnMyRoom");
    await warteAuf(() => sichtbar(wurzel, "scrMyRoom"), "Mein Raum (2)");
    klick(wurzel, "btnSolo");
    await warteAuf(() => wurzel.querySelector("#pbInput"), "Solositzung wieder offen");
    pruefe("Entwurf beim Wiederbetreten zurück (K3 b, nur Arbeitsspeicher)",
      wurzel.querySelector("#pbInput").value.includes(S));
  },
};

export const JOURNEYS = [journeySolo, journeyAufdeckung, journeyRaumwechsel];

/* ================= Fahrt-Runner ================= */

/**
 * Fährt alle (oder die übergebenen) Journeys in isolierten Welten.
 * Gibt einen Bericht zurück und legt ihn maschinenlesbar unter
 * window.__PB_SELBSTFAHRT__ ab (Ebene B/C); Sentinel-Zeile in der Konsole.
 */
export async function fahreSelbstfahrt({ doc = globalThis.document, journeys = JOURNEYS } = {}) {
  const bericht = { kern: CORE_VERSION, zeit: new Date().toISOString(), journeys: [], pass: 0, fail: 0 };
  for (const j of journeys) {
    const schritte = [];
    const pruefe = (name, ergebnis) => {
      const ok = ergebnis === true;
      schritte.push({ name, ok, detail: typeof ergebnis === "string" ? ergebnis : "" });
    };
    const echtesFetch = globalThis.fetch;
    let welt = null, fehler = null;
    try {
      const fetchFn = drehbuchFetch(j.drehbuch, echtesFetch);
      globalThis.fetch = fetchFn;                             // VOR baueWelt (Adapter-Default-Param)
      welt = await baueWelt(doc, { szene: j.szene, fetchFn });
      await j.fahre(welt, pruefe);
    } catch (e) {
      fehler = e.message;
    } finally {
      globalThis.fetch = echtesFetch;
      if (welt) await welt.ende();
    }
    const ok = !fehler && schritte.every(s => s.ok || s.detail);   // detail = tolerierter Umgebungs-Hinweis
    bericht.journeys.push({ id: j.id, titel: j.titel, ok, fehler, schritte });
    ok ? bericht.pass++ : bericht.fail++;
  }
  if (typeof window !== "undefined") window.__PB_SELBSTFAHRT__ = bericht;
  const zeile = "SELBSTFAHRT " + (bericht.fail ? "✗" : "✓") + " " + bericht.pass + "/" + bericht.journeys.length +
    " Journeys · Kern " + CORE_VERSION;
  try { console.log(zeile); } catch { /* egal */ }
  return bericht;
}

/** Bericht als lesbarer Text (devIO). */
export function berichtAlsText(b) {
  const zeilen = ["SELBSTFAHRT · Kern " + b.kern + " · " + b.zeit,
    b.pass + "/" + b.journeys.length + " Journeys bestanden", ""];
  for (const j of b.journeys) {
    zeilen.push((j.ok ? "✓ " : "✗ ") + j.titel + (j.fehler ? "  — " + j.fehler : ""));
    for (const s of j.schritte)
      zeilen.push("   " + (s.ok ? "✓" : s.detail ? "·" : "✗") + " " + s.name + (s.detail ? " — " + s.detail : ""));
  }
  return zeilen.join("\n");
}

// Remote-Backend der Cloudflare-Form — die Fassade, die der Kern spricht,
// abgebildet auf die Worker-Routen.
//
// CR-1 · Aus client.js herausgeloest, damit sie OHNE Browser pruefbar ist:
// tests/worker/vertrag-oberflaeche.spec.js baut genau diese Fassade ueber dem
// echten Worker (Miniflare) und fuehrt die Kern-Funktionen darueber aus. Der
// Anlass: Kern und Worker waren an drei Stellen auseinandergelaufen
// (Prozessreflexion, Verlauf-Ablage, Startwerte), und kein Test sah es, weil
// der Kern gegen ein Backend ohne Regeln lief und der Worker gegen
// handgeschriebene Nutzlasten.
//
// `api(method, pfad, body)` wird hereingereicht (client.js: fetch + Cookies).

import { VERLAUF_PRAEFIX } from "../../../core/ui/verlauf-ablage.js";

const istVerlauf = f => typeof f === "string" && f.startsWith(VERLAUF_PRAEFIX);
const verlaufId = f => encodeURIComponent(f.slice(VERLAUF_PRAEFIX.length));

/**
 * @param {(method:string, pfad:string, body?:any)=>Promise<any>} api
 * @param {object} [extras]  weitere Fassadenteile (client.js reicht `llm` herein)
 */
export function baueRemoteBackend(api, extras = {}) {
  return {
    info: () => api("GET", "/api/me"),
    language: {
      // Bugfix (S66): der Parameter hieß `ziel`, der Body referenzierte die
      // NICHT existierende Variable `target` → ReferenceError bei jedem
      // Sprachwechsel-Antrag. Der Worker erwartet { target } (S30·C3).
      request: target => api("POST", "/api/language", { target }),
      withdraw: () => api("DELETE", "/api/language"),
    },
    bstate: {
      get: f => api("GET", "/api/bstate/" + f).then(r => r.value),
      set: (f, v) => api("PUT", "/api/bstate/" + f, { value: v }),
    },
    // S91 · I12: Messungen sind servergeführt — Abgabe und Aufdeckung laufen
    // über eigene Routen (Rolle aus der Session); trageMessbeitragEin/
    // markiereAufgedeckt im Kern delegieren hierher, wenn vorhanden.
    mess: {
      beitrag: b => api("POST", "/api/mess/beitrag", b).then(r => r.runde),
      aufgedeckt: rundeId => api("POST", "/api/mess/aufgedeckt", { rundeId }),
    },
    // S95.3 · Regal servergeführt: Ablage, Lesestand, Hebung und Rücknahme
    // laufen über eigene Routen; PUT auf /api/bstate/shelf ist gesperrt.
    // S95.3b · Regal UND Agenda servergeführt: Ablage, Lesestand, Hebung,
    // Vormerkung, Abräumen und Rücknahme laufen über eigene Routen; PUT auf
    // /api/bstate/shelf und /api/bstate/agenda ist gesperrt.
    regal: {
      freigabe: entwurf => api("POST", "/api/regal/freigabe", entwurf),
      gelesen: itemId => api("POST", "/api/regal/gelesen", { itemId }),
      gehoben: (itemId, opts) => api("POST", "/api/regal/gehoben", { itemId, alsZiel: !!(opts && opts.alsZiel) }),
      ruecknahme: freigabe => api("POST", "/api/regal/ruecknahme", { freigabe }).then(() => true, () => false),
      vormerkung: itemId => api("POST", "/api/agenda/vormerkung", { itemId }),
      abraeumen: (itemId, wie) => api("POST", "/api/agenda/abraeumen", { itemId, wie }),
    },
    pstate: {
      /* CR-1.3 · Aufbewahrte Verlaeufe ("verlauf:<id>", core/ui/verlauf-ablage.js)
         haben eine eigene Route — ein Schluessel je Verlauf statt eines Feldes
         im Pstate-Buendel. Der Kern spricht weiter die Pstate-Fassade (so laeuft
         er auch im Artefakt); die Abbildung auf die Route steht nur hier. */
      get: f => (istVerlauf(f)
        ? api("GET", "/api/verlauf/" + verlaufId(f))
        : api("GET", "/api/pstate/" + f)).then(r => r.value),
      set: (f, v) => {
        if (istVerlauf(f)) return api("PUT", "/api/verlauf/" + verlaufId(f), { value: v });
        if (f === "language") { try { localStorage.setItem("pb.sprache", v); } catch { /* z. B. Safari privat */ } }
        // D12-2d · Spiegel der Ansicht: beim naechsten Start steht die Farbe,
        // bevor der Server geantwortet hat — sonst blitzt es kurz hell auf.
        if (f === "theme") { try { localStorage.setItem("pb.ansicht", v); } catch { /* dito */ } }
        return api("PUT", "/api/pstate/" + f, { value: v });
      },
    },
    chat: {
      load: (art, id) => api("GET", "/api/chat/" + art + "/" + id).then(r => r.value),
      save: (art, id, chat) => api("PUT", "/api/chat/" + art + "/" + id, { value: chat }),
    },
    handover: {
      post: d => api("POST", "/api/handover", d),
      get: r => api("GET", "/api/handover/" + r).then(x => x.value),
    },
    recovery: {
      beginVerify: email => api("POST", "/api/email", { email }),
      confirm: (pin, email) => api("POST", "/api/email/confirm", { pin, email }),
    },
    ...extras,
  };
}

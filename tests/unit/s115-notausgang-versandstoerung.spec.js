// @vitest-environment happy-dom
// S115 · Der Notausgang bei gestörtem Versand (F3b).
//
// Seit S115 ist die Adress-Pflicht der Normalfall: `emailRequired` ist im
// Worker fail-closed, jeder ohne bestätigte Adresse steht vor dem Screen. Das
// ist richtig, solange der Weg dahinter trägt — und kippt, wenn der Mailversand
// steht: dann wäre die App für ALLE ohne Adresse zu, und der einzige Ausweg
// läge beim Betreiber (EMAIL_PFLICHT="0", ein Deploy).
//
// Diese Datei bewacht die Innenseite davon. Der Griff ist absichtlich schwer
// zu ziehen, und genau das wird hier geprüft — die Negativ-Fälle sind die
// eigentliche Aussage:
//   · Ein Tippfehler (email_invalid) öffnet ihn nicht.
//   · Eine fremdbelegte Adresse (email_taken) öffnet ihn nicht.
//   · Ein EINZELNER Versandfehler öffnet ihn nicht.
// Erst der zweite mail_failed macht ihn sichtbar.

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createApp } from "../../core/ui/app.js";
import { notausAktiv, merkeNotaus, NOTAUS_AB } from "../../core/ui/recovery-screen.js";

const tick = () => new Promise(r => setTimeout(r, 0));
const ruhe = async (n = 6) => { for (let i = 0; i < n; i++) await tick(); };

/* WICHTIG: Es gibt das Verifikations-Bauelement ZWEIMAL im Dokument — einmal
   aufgeklappt in der Regal-Zeile des eigenen Raums, einmal im Pflicht-Screen.
   Beide tragen dieselben data-rec-Marken (deshalb gibt es dort keine IDs).
   Ein document.querySelector trifft die Regal-Fassung zuerst, weil sie im
   App-Baum steht und der Screen am body haengt. Alles hier greift deshalb
   ausdruecklich IN den Screen. */
const kasten = () => document.querySelector("#pbEmailPflicht");
const q = name => {
  const k = kasten();
  return k ? k.querySelector('[data-rec="' + name + '"]') : null;
};

/** Backend, dessen beginVerify immer mit einem bestimmten Fehler scheitert.
 *  `extra` haengt Felder ans Fehlerobjekt (S117: retryAfter). */
function backendMitFehler(code, status, extra) {
  return {
    async info() {
      return { role: "A", name: "Anna", partner: "Bernd", nameA: "Anna", nameB: "Bernd",
        emailRequired: true, recoveryEmail: false };
    },
    bstate: { get: async () => null, set: async () => true },
    pstate: { get: async () => null, set: async () => true },
    chat: { load: async () => null, save: async () => true },
    llm: async () => ({ text: "ok", stop: "end_turn" }),
    recovery: {
      beginVerify: async () => {
        throw Object.assign(new Error("Fehlschlag"), { code, status: status || 400, ...(extra || {}) });
      },
      confirm: async () => {},
    },
  };
}

/** Einen Sendeversuch auslösen und die Runde abwarten. */
async function versuch(adresse = "anna@example.org") {
  q("mail").value = adresse;
  q("senden").click();
  await ruhe();
}

let root;
beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  document.documentElement.removeAttribute("data-pflicht");
  try { localStorage.removeItem("pb.mailnotaus"); } catch { /* egal */ }
  root = document.getElementById("app");
});
afterEach(() => {
  try { localStorage.removeItem("pb.mailnotaus"); } catch { /* egal */ }
});

describe("S115 · der Griff öffnet nur bei echter Störung", () => {
  it("ein einzelner Versandfehler reicht nicht — einer kann ein Zucken sein", async () => {
    const app = createApp({ doc: document, backend: backendMitFehler("mail_failed", 502), root });
    await app.boot();
    await ruhe();
    await versuch();
    expect(q("notausgang"), "nach einem Fehlschlag noch kein Ausgang").toBeNull();
    // Der Fehler selbst wird gesagt — nur eben ohne Ausgang.
    expect(q("note").textContent).toBeTruthy();
    expect(q("note").getAttribute("role")).toBe("alert");
  });

  it("beim zweiten mail_failed steht der Ausgang im Zonenfuß", async () => {
    const app = createApp({ doc: document, backend: backendMitFehler("mail_failed", 502), root });
    await app.boot();
    await ruhe();
    for (let i = 0; i < NOTAUS_AB; i++) await versuch();
    const raus = q("notausgang");
    expect(raus, "nach zwei Fehlschlägen steht der Ausgang").toBeTruthy();
    // Er steht in der handelnden Zone, im Fuß — dort, wo überall das
    // Weitergehen steht.
    expect(raus.closest(".rz-half").classList.contains("rz-tiefgruen")).toBe(true);
    expect(raus.closest(".rz-fuss")).toBeTruthy();
    expect(raus.classList.contains("rz-zeile")).toBe(true);
  });

  it("er entsteht genau einmal, auch wenn es weiter scheitert", async () => {
    const app = createApp({ doc: document, backend: backendMitFehler("mail_failed", 502), root });
    await app.boot();
    await ruhe();
    for (let i = 0; i < 5; i++) await versuch();
    expect(kasten().querySelectorAll('[data-rec="notausgang"]')).toHaveLength(1);
  });

  /* Die Negativ-Fälle. Alle drei sagen etwas über die EINGABE aus, nicht über
     den Kanal — sie dürfen den Ausgang nicht öffnen, sonst wäre er nach zwei
     Tippfehlern da und die Pflicht wäre keine. */
  for (const [code, was] of [
    ["email_invalid", "ein Tippfehler in der Adresse"],
    ["email_taken", "eine fremdbelegte Adresse"],
  ]) {
    it(`${was} (${code}) öffnet ihn nie`, async () => {
      const app = createApp({ doc: document, backend: backendMitFehler(code), root });
      await app.boot();
      await ruhe();
      for (let i = 0; i < 5; i++) await versuch();
      expect(q("notausgang")).toBeNull();
    });
  }
});

describe("S115 · was der Griff bewirkt", () => {
  it("er führt in die App und lässt die Regal-Zeile als zweiten Weg stehen", async () => {
    const app = createApp({ doc: document, backend: backendMitFehler("mail_failed", 502), root });
    await app.boot();
    await ruhe();
    for (let i = 0; i < NOTAUS_AB; i++) await versuch();
    q("notausgang").click();
    await ruhe();

    expect(kasten(), "der Screen ist weg").toBeNull();
    expect(document.documentElement.hasAttribute("data-pflicht"), "die Bedien-Ecke lebt wieder").toBe(false);
    // Der Weg zur Adresse bleibt offen — er war nie weg.
    expect(root.querySelector("#btnRecovery").classList.contains("pb-hidden")).toBe(false);
    expect(notausAktiv()).toBe(true);
  });

  it("24 Stunden später steht der Screen wieder — der Griff ist kein Dauerausstieg", () => {
    const jetzt = 1_000_000_000_000;
    merkeNotaus(() => jetzt);
    expect(notausAktiv(() => jetzt + 23 * 60 * 60 * 1000)).toBe(true);
    expect(notausAktiv(() => jetzt + 25 * 60 * 60 * 1000)).toBe(false);
  });

  it("ohne gezogenen Griff greift er nicht", () => {
    expect(notausAktiv()).toBe(false);
  });

  /* Der Boot fragt danach: wer den Griff gezogen hat, läuft nicht bei jedem
     Start wieder in denselben kaputten Kanal. */
  it("nach gezogenem Griff kommt der Screen beim nächsten Start nicht wieder", async () => {
    merkeNotaus();
    const app = createApp({ doc: document, backend: backendMitFehler("mail_failed", 502), root });
    await app.boot();
    await ruhe();
    expect(kasten()).toBeNull();
  });
});

/* S117 · Das Ratenlimit hat die Seite gewechselt.
 *
 * In S115 zählte `verify_rate` bewusst NICHT mit: es sagt etwas über das
 * Verhalten der Person aus, nicht über den Kanal. Das war zu ordentlich
 * gedacht. Ein Ratenlimit ist für die nächste Stunde eine Wand, durch die
 * niemand kommt — und der Screen ist nicht verlassbar. Die Person sass bis zu
 * eine Stunde in einem Raum ohne Tür und las einen Satz, der ihr nicht sagte,
 * wie lange. Genau der Zustand, den der Notausgang verhindern sollte, nur
 * durch eine Tür, die in S115 niemand mitgezählt hat.
 *
 * Anders als bei mail_failed braucht es hier keine Bestätigungsrunde: ein
 * einzelner Versandfehler kann ein Zucken sein, ein Ratenlimit ist beim ersten
 * Auftreten schon die volle Aussage. */
describe("S117 · das Ratenlimit öffnet sofort", () => {
  it("ein einziges verify_rate genügt — keine zweite Runde", async () => {
    const app = createApp({ doc: document, backend: backendMitFehler("verify_rate", 429, { retryAfter: 1800 }), root });
    await app.boot();
    await ruhe();
    await versuch();
    expect(q("notausgang"), "beim ersten Mal schon").toBeTruthy();
  });

  it("und er sagt, warum er da ist — nicht dieselbe Begründung wie bei Versandstörung", async () => {
    const app = createApp({ doc: document, backend: backendMitFehler("verify_rate", 429, { retryAfter: 1800 }), root });
    await app.boot();
    await ruhe();
    await versuch();
    const text = q("notausgang").closest(".rz-fuss").textContent;
    expect(text).toContain("zu viele Anfragen");
    expect(text, "nicht der Versandstörungs-Text").not.toContain("liegt an uns");
  });

  /* Die Frist ist der eigentliche Gewinn: "etwas später" ist vor einer
     verschlossenen Tür keine Auskunft. Der Worker nennt Sekunden, die
     Oberfläche rundet auf Minuten auf — niemand wartet auf die Sekunde. */
  it("nennt die Wartezeit in Minuten, aufgerundet", async () => {
    const app = createApp({ doc: document, backend: backendMitFehler("verify_rate", 429, { retryAfter: 1801 }), root });
    await app.boot();
    await ruhe();
    await versuch();
    expect(q("note").textContent).toContain("31");        // 1801 s → 31 Minuten
    expect(q("note").getAttribute("role")).toBe("alert");
  });

  /* Fehlt die Frist (alter Worker, Antwort ohne retryAfter), faellt die
     Meldung auf den fristlosen i18n-Text zurueck — der Ausgang kommt
     trotzdem. Die Oberflaeche darf nicht davon abhaengen, dass der Server
     schon auf S117 steht. */
  it("ohne mitgereiste Frist bleibt es bei der fristlosen Meldung", async () => {
    const app = createApp({ doc: document, backend: backendMitFehler("verify_rate", 429), root });
    await app.boot();
    await ruhe();
    await versuch();
    expect(q("note").textContent).toContain("Zu viele Anfragen");
    expect(q("note").textContent, "keine erfundene Minutenzahl").not.toMatch(/\d+ Minuten/);
    expect(q("notausgang"), "der Ausgang kommt trotzdem").toBeTruthy();
  });
});

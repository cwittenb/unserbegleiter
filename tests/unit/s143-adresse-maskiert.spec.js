// @vitest-environment happy-dom
// S143 · Der Nutzer sieht, WELCHE Adresse hinterlegt ist — maskiert.
//
// Bis hierher erfuhr die App nur, DASS eine liegt. Das reichte nicht:
// "bestätigt" heißt nur, dass die Adresse DAMALS erreichbar war — es kann ein
// altes Postfach sein oder versehentlich das der anderen Person.
//
// Maskiert und nicht vollständig, weil der Klartext heute in keiner Antwort an
// die App steht und jede Anzeige ihn in Caches und Logs trüge. Maskiert wird
// im Worker, nicht in der Oberfläche: Sonst reiste er trotzdem und die
// Oberfläche versteckte ihn nur.

import { describe, it, expect, beforeEach } from "vitest";
import { maskiereMail } from "../../platforms/cloudflare/worker/mailmaske.js";
import { createApp } from "../../core/ui/app.js";
import { de } from "../../core/i18n/de.js";
import { en } from "../../core/i18n/en.js";

const P = "\u2022\u2022\u2022";
const tick = () => new Promise(r => setTimeout(r, 0));
const ruhe = async (n = 10) => { for (let i = 0; i < n; i++) await tick(); };

/* ---- Die Maskierung selbst ---- */

describe("S143 · maskiereMail", () => {
  it("hält Anfang und Ende, der Rest wird zu Punkten", () => {
    expect(maskiereMail("anna@post.de")).toBe(`a${P}a@p${P}t.de`);
  });

  it("die Endung bleibt stehen — sie hilft beim Wiedererkennen", () => {
    expect(maskiereMail("anna@example.com").endsWith(".com")).toBe(true);
  });

  it("Zwischen-Labels werden mitmaskiert, kein Anbietername bleibt lesbar", () => {
    // Sonst stünde bei "mail.gmx.net" am Ende doch wieder "gmx.net" da.
    const m = maskiereMail("anna@mail.gmx.net");
    expect(m).toBe(`a${P}a@m${P}x.net`);
    expect(m).not.toContain("gmx");
  });

  it("die Punktzahl ist fest — die Länge der Adresse bleibt geheim", () => {
    const kurz = maskiereMail("abc@xy.de");
    const lang = maskiereMail("abcdefghijklmnop@xy.de");
    expect(kurz.length).toBe(lang.length);
  });

  it("sehr kurze Stücke verraten höchstens den Anfang", () => {
    expect(maskiereMail("ab@xy.de")).toBe(`a${P}@x${P}.de`);
    expect(maskiereMail("a@xy.de")).toBe(`${P}@x${P}.de`);
  });

  it("Domains ohne Punkt werden vollständig maskiert", () => {
    expect(maskiereMail("anna@localhost")).toBe(`a${P}a@l${P}t`);
  });

  it("kaputte Eingaben ergeben null statt Unsinn", () => {
    for (const x of ["", null, undefined, "keineadresse", "@post.de", "anna@"])
      expect(maskiereMail(x), String(x)).toBe(null);
  });

  it("zusammengesetzte Zeichen zerfallen nicht", () => {
    // Codepoint-weise statt byteweise: der Anker bleibt ein ganzes Zeichen.
    expect(maskiereMail("äöü@post.de").startsWith("ä")).toBe(true);
  });
});

/* ---- Die Anzeige ---- */

function backendMit(info = {}) {
  return {
    async info() { return { role: "A", name: "Anna", partner: "Bernd", nameA: "Anna", nameB: "Bernd", ...info }; },
    bstate: { get: async () => null, set: async () => true },
    pstate: { get: async () => null, set: async () => true },
    chat: { load: async () => null, save: async () => true },
    handover: { get: async () => null, post: async () => true },
    llm: async () => ({ text: "ok", stop: "end_turn" }),
    language: { request: async () => ({}), withdraw: async () => ({}) },
    recovery: {
      beginVerify: async () => ({}),
      confirm: async () => ({ ok: true, maske: `b${P}d@n${P}u.de` }),
    },
  };
}

let root;
beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById("app");
});

async function einstellungen(info) {
  const app = createApp({ doc: document, backend: backendMit(info), root });
  await app.boot();
  await ruhe();
  document.getElementById("pbEinst").click();
  await ruhe();
  return app;
}

const maskeImDom = () => {
  const e = root.querySelector("#boxRecovery [data-rec=maske]");
  return e ? e.textContent : null;
};

describe("S143 · die Zeile nennt die Adresse", () => {
  it("mit Maske steht sie da, mit dem Etikett des Eingabefelds", async () => {
    await einstellungen({ recoveryEmail: true, recoveryEmailMaske: `a${P}a@p${P}t.de` });
    expect(maskeImDom()).toBe(`a${P}a@p${P}t.de`);
    // Gleiche Sache, gleiches Wort — keine zweite Übersetzung.
    expect(root.querySelector("#boxRecovery .rz-caps").textContent).toBe(de["rec.labelAdresse"]);
  });

  it("und der erste Satz entfällt dann — er wäre eine Wiederholung", async () => {
    await einstellungen({ recoveryEmail: true, recoveryEmailMaske: `a${P}a@p${P}t.de` });
    const text = root.querySelector("#boxRecovery").textContent;
    expect(text).not.toContain(de["rec.hinterlegtDa"]);
    expect(text).toContain(de["rec.hinterlegtZweck"]);
  });

  it("ohne Maske bleibt es beim alten Wortlaut, vollständig", async () => {
    // Älterer Worker oder lokales Backend: dann fehlt nur die Zeile.
    await einstellungen({ recoveryEmail: true });
    expect(maskeImDom()).toBe(null);
    const text = root.querySelector("#boxRecovery").textContent;
    expect(text).toContain(de["rec.hinterlegtDa"]);
    expect(text).toContain(de["rec.hinterlegtZweck"]);
  });

  it("ohne hinterlegte Adresse gibt es nichts zu zeigen", async () => {
    await einstellungen({ recoveryEmail: false });
    expect(maskeImDom()).toBe(null);
    expect(root.querySelector("#boxRecovery").textContent).toContain(de["rec.neu"]);
  });
});

describe("S143 · nach dem Ändern steht die NEUE Adresse da", () => {
  it("die Maske aus der Bestätigung ersetzt die alte", async () => {
    await einstellungen({ recoveryEmail: true, recoveryEmailMaske: `a${P}a@p${P}t.de` });
    root.querySelector("#btnRecovery").click();
    await ruhe();
    const box = root.querySelector("#boxRecovery");
    box.querySelector("[data-rec=aendern]").click();
    await ruhe();
    box.querySelector("[data-rec=mail]").value = "bernd@neu.de";
    box.querySelector("[data-rec=senden]").click();
    await ruhe();
    box.querySelector("[data-rec=pin]").value = "123456";
    box.querySelector("[data-rec=ok]").click();
    await ruhe();
    expect(maskeImDom(), "die alte Maske steht noch da").toBe(`b${P}d@n${P}u.de`);
  });
});

describe("S143 · die Texte liegen zweisprachig vor", () => {
  it("beide neuen Keys, und der alte ist fort", () => {
    for (const k of ["rec.hinterlegtDa", "rec.hinterlegtZweck"]) {
      expect(de[k], "DE " + k).toBeTruthy();
      expect(en[k], "EN " + k).toBeTruthy();
    }
    expect(de["rec.hinterlegt"], "aufgeteilt, nicht dupliziert").toBeUndefined();
    expect(en["rec.hinterlegt"]).toBeUndefined();
  });
});

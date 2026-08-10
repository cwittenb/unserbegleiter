// @vitest-environment happy-dom
// S116 · Ein lebendes Verifikations-Formular, nicht zwei.
//
// Der Befund aus S115: `baueVerifikation` ist EIN Bauelement, aber es stand an
// zwei Orten gleichzeitig im Dokument — in der Regal-Zeile des eigenen Raums
// und im Pflicht-Screen. Beide tragen dieselben `data-rec`-Marken (dort gibt es
// bewusst keine IDs, damit sie koexistieren KÖNNEN), und ein
// `document.querySelector` traf die Regal-Fassung zuerst.
//
// Das war mehr als ein Testärgernis: zwei Formulare halten je ihren eigenen
// Schritt-2-Zustand und ihr eigenes `gesendetAn`, und jeder Sendeversuch
// verbraucht einen der fünf Slots im Stunden-Ratenlimit (`sys/veriflimit`).
//
// Die Behebung ist keine Umbenennung, sondern eine Frage des Zeitpunkts: das
// Regal-Formular entsteht beim Aufklappen statt beim Start. Diese Datei hält
// fest, dass es dabei bleibt.

import { describe, it, expect, beforeEach } from "vitest";
import { createApp } from "../../core/ui/app.js";

const tick = () => new Promise(r => setTimeout(r, 0));
const ruhe = async (n = 6) => { for (let i = 0; i < n; i++) await tick(); };
const klick = async el => { el.click(); await ruhe(); };
const formulare = () => document.querySelectorAll('[data-rec="mail"]');

function backendMit(extra) {
  return {
    async info() {
      return { role: "A", name: "Anna", partner: "Bernd", nameA: "Anna", nameB: "Bernd", ...(extra || {}) };
    },
    bstate: { get: async () => null, set: async () => true },
    pstate: { get: async () => null, set: async () => true },
    chat: { load: async () => null, save: async () => true },
    llm: async () => ({ text: "ok", stop: "end_turn" }),
    recovery: { beginVerify: async () => {}, confirm: async () => {} },
  };
}

let root;
beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  document.documentElement.removeAttribute("data-pflicht");
  try { localStorage.removeItem("pb.mailnotaus"); } catch { /* egal */ }
  root = document.getElementById("app");
});

describe("S116 · das Formular entsteht beim Öffnen", () => {
  it("nach dem Start steht keines im Regal — nur der Text, der es ankündigt", async () => {
    const app = createApp({ doc: document, backend: backendMit({ recoveryEmail: false }), root });
    await app.boot();
    await ruhe();
    const box = root.querySelector("#boxRecovery");
    expect(formulare()).toHaveLength(0);
    expect(box.textContent, "der Grund steht trotzdem da").toContain("Hinterlege eine E-Mail-Adresse");
  });

  it("Aufklappen baut genau eines, zweimal Aufklappen kein zweites", async () => {
    const app = createApp({ doc: document, backend: backendMit({ recoveryEmail: false }), root });
    await app.boot();
    await ruhe();
    const zeile = root.querySelector("#btnRecovery");

    await klick(zeile);
    expect(formulare()).toHaveLength(1);

    await klick(zeile);                    // zu
    await klick(zeile);                    // wieder auf
    expect(formulare(), "kein zweites beim erneuten Öffnen").toHaveLength(1);
  });

  /* Der eigentliche Fall: Pflicht-Screen und Regal-Zeile stehen gleichzeitig
     im Dokument. Vorher waren das zwei Formulare — eines davon unerreichbar
     hinter dem Screen, aber lebendig. */
  it("mit stehendem Pflicht-Screen gibt es genau eines, und es gehört dem Screen", async () => {
    const app = createApp({
      doc: document,
      backend: backendMit({ recoveryEmail: false, emailRequired: true }),
      root,
    });
    await app.boot();
    await ruhe();
    expect(formulare()).toHaveLength(1);
    expect(formulare()[0].closest("#pbEmailPflicht"), "es steht im Screen").toBeTruthy();
  });

  it("mit hinterlegter Adresse baut das Öffnen keines — dorthin führt „Ändern“", async () => {
    const app = createApp({ doc: document, backend: backendMit({ recoveryEmail: true }), root });
    await app.boot();
    await ruhe();
    const box = root.querySelector("#boxRecovery");

    await klick(root.querySelector("#btnRecovery"));
    expect(formulare()).toHaveLength(0);
    expect(box.querySelector('[data-rec="aendern"]'), "stattdessen der Einstieg").toBeTruthy();

    await klick(box.querySelector('[data-rec="aendern"]'));
    expect(formulare()).toHaveLength(1);
  });

  /* Nach dem Notausgang steht die Zeile wieder als einziger Weg zur Adresse
     da — und auch dann darf das Öffnen nur ein Formular ergeben. */
  it("auch nach dem Schließen des Screens bleibt es bei einem", async () => {
    const app = createApp({
      doc: document,
      backend: backendMit({ recoveryEmail: false, emailRequired: true }),
      root,
    });
    await app.boot();
    await ruhe();
    document.querySelector("#pbEmailPflicht").remove();       // wie nach dem Notausgang
    await klick(root.querySelector("#btnRecovery"));
    expect(formulare()).toHaveLength(1);
  });
});

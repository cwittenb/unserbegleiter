// @vitest-environment happy-dom
// S142 · Die Zugangs-Zeile des Wegweisers folgt dem Zustand.
//
// Befund: Sie riet unbedingt zum Einrichten — auch dann noch, wenn die Adresse
// längst hinterlegt war. Dann empfahl sie etwas, das erledigt ist.
//
// Korrektur zur S140-Notiz: Dafür braucht es KEINEN Umbau von ladeLage().
// `state.info.recoveryEmail` liegt bereits vor (der Worker liefert es in
// /api/me; recovery-screen.js liest es an derselben Stelle für seinen
// "hinterlegt"-Zweig), und der Einstellungs-Zweig des Wegweisers greift ohnehin
// schon auf state.info zu.
//
// Dazu die Beschriftung: "Zugang wiederfinden" benannte den Anlass, nicht die
// Sache. Dahinter liegt genau eine hinterlegte Adresse.

import { describe, it, expect, beforeEach } from "vitest";
import { createApp } from "../../core/ui/app.js";
import { de } from "../../core/i18n/de.js";
import { en } from "../../core/i18n/en.js";

const tick = () => new Promise(r => setTimeout(r, 0));
const ruhe = async (n = 10) => { for (let i = 0; i < n; i++) await tick(); };

function backendMit({ recovery = true, ...info } = {}) {
  const b = {
    async info() { return { role: "A", name: "Anna", partner: "Bernd", nameA: "Anna", nameB: "Bernd", ...info }; },
    bstate: { get: async () => null, set: async () => true },
    pstate: { get: async () => null, set: async () => true },
    chat: { load: async () => null, save: async () => true },
    handover: { get: async () => null, post: async () => true },
    llm: async () => ({ text: "ok", stop: "end_turn" }),
    language: { request: async () => ({}), withdraw: async () => ({}) },
  };
  if (recovery) b.recovery = { beginVerify: async () => ({}), confirm: async () => ({}) };
  return b;
}

let root;
beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById("app");
});

const zeilen = () =>
  [...root.querySelectorAll("#wegEinst .rz-option")].map(p => p.textContent);

async function betreteEinstellungen(opt) {
  const app = createApp({ doc: document, backend: backendMit(opt), root });
  await app.boot();
  await ruhe();
  document.getElementById("pbEinst").click();
  await ruhe();
  return app;
}

describe("S142 · zwei Zustände, zwei Sätze", () => {
  it("ohne hinterlegte Adresse rät sie zum Hinterlegen", async () => {
    await betreteEinstellungen({ recoveryEmail: false });
    expect(zeilen()).toContain(de["weg.einstZugang"]);
    expect(zeilen()).not.toContain(de["weg.einstZugangDa"]);
  });

  it("mit hinterlegter Adresse sagt sie, dass man sie ändern kann", async () => {
    await betreteEinstellungen({ recoveryEmail: true });
    expect(zeilen()).toContain(de["weg.einstZugangDa"]);
    expect(zeilen()).not.toContain(de["weg.einstZugang"]);
  });

  it("die fehlende Adresse ist ein offener Punkt und steht deshalb vorn", async () => {
    // Stufe 3 vor Stufe 4: das Löschen ist eine stehende Auskunft, das
    // Hinterlegen etwas, das noch aussteht.
    await betreteEinstellungen({ recoveryEmail: false });
    const z = zeilen();
    expect(z.indexOf(de["weg.einstZugang"])).toBeLessThan(z.indexOf(de["weg.einstEndgueltig"]));
  });

  it("die vorhandene Adresse verdrängt nichts — sie steht auf Stufe 4", async () => {
    await betreteEinstellungen({ recoveryEmail: true, languageRequest: { by: "B", target: "en" } });
    const z = zeilen();
    expect(z[0]).toBe(de["weg.einstSprachAntrag"].replace("{partner}", "Bernd"));
    expect(z.length).toBeLessThanOrEqual(3);
  });
});

describe("S142 · ohne Wiedereinstieg zeigt der Wegweiser nicht darauf", () => {
  it("keine der beiden Zeilen, wenn backend.recovery fehlt", async () => {
    // Dann blendet zeigeRecovery() auch die Regal-Zeile aus (Artefakt-Bau).
    await betreteEinstellungen({ recovery: false });
    expect(zeilen()).not.toContain(de["weg.einstZugang"]);
    expect(zeilen()).not.toContain(de["weg.einstZugangDa"]);
  });

  it("aber der Rest des Wegweisers bleibt stehen", async () => {
    await betreteEinstellungen({ recovery: false });
    expect(zeilen()).toContain(de["weg.einstEndgueltig"]);
    expect(root.querySelector("#wegBadgeEinst").classList.contains("pb-hidden")).toBe(false);
  });
});

describe("S142 · nach dem Hinterlegen zieht der Wegweiser nach", () => {
  it("ohne Screenwechsel steht dort der andere Satz", async () => {
    await betreteEinstellungen({ recoveryEmail: false });
    expect(zeilen()).toContain(de["weg.einstZugang"]);

    // Die Zeile aufklappen, Adresse eingeben, Code bestätigen.
    root.querySelector("#btnRecovery").click();
    await ruhe();
    const box = root.querySelector("#boxRecovery");
    const mail = box.querySelector("[data-rec=mail]");
    mail.value = "anna@postfach.de";
    box.querySelector("[data-rec=senden]").click();
    await ruhe();
    const pin = box.querySelector("[data-rec=pin]");
    pin.value = "123456";
    box.querySelector("[data-rec=ok]").click();
    await ruhe();

    expect(zeilen(), "der alte Rat steht noch da").not.toContain(de["weg.einstZugang"]);
    expect(zeilen()).toContain(de["weg.einstZugangDa"]);
  });
});

describe("S142 · die Beschriftung nennt die Sache", () => {
  it("die Zeile heißt nicht mehr nach dem Anlass", () => {
    expect(de["rec.titel"]).not.toBe("Zugang wiederfinden");
    expect(de["rec.titel"]).toContain("Zugangslinks");
    expect(en["rec.titel"]).toContain("access links");
  });

  it("und die neuen Wegweiser-Texte liegen zweisprachig vor", () => {
    for (const k of ["weg.einstZugang", "weg.einstZugangDa"]) {
      expect(de[k], "DE " + k).toBeTruthy();
      expect(en[k], "EN " + k).toBeTruthy();
      const platz = s => (s.match(/\{\w+\}/g) || []).sort().join(",");
      expect(platz(en[k]), k).toBe(platz(de[k]));
    }
  });
});

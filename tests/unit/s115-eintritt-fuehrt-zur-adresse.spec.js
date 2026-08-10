// @vitest-environment happy-dom
// S115 · Wer ohne bestaetigte Adresse in der App landet, kommt zuerst auf den
// Screen, der das nachholt.
//
// Der Screen selbst ist alt (S45) und wird von u6-pflicht-vollbild.spec.js
// bewacht — dort geht es um sein Aussehen und darum, dass man ihn nicht
// verlassen kann. Hier geht es um etwas anderes: WANN er kommt. Bis S115 hing
// das an einer Umgebungsvariablen, die im Betrieb aus war; der Screen war
// gebaut und erschien nie. Diese Datei haelt die Bedingung fest, damit sie
// nicht ein zweites Mal still verschwinden kann.
//
// Die drei Faelle sind die drei Zustaende, in denen eine Person ankommt:
// ohne Adresse (Screen), mit Adresse (kein Screen), auf einer Plattform ohne
// Wiedereinstieg (kein Screen — und keine Sackgasse).

import { describe, it, expect, beforeEach } from "vitest";
import { createApp } from "../../core/ui/app.js";

const tick = () => new Promise(r => setTimeout(r, 0));
async function klick(el) { el.click(); await tick(); await tick(); }
const q = (wirt, name) => wirt.querySelector('[data-rec="' + name + '"]');

function backendMit(info, recovery) {
  const b = {
    async info() {
      return { role: "A", name: "Anna", partner: "Bernd", nameA: "Anna", nameB: "Bernd", ...info };
    },
    bstate: { get: async () => null, set: async () => true },
    pstate: { get: async () => null, set: async () => true },
    chat: { load: async () => null, save: async () => true },
    handover: { post: async () => {}, get: async () => null },
    llm: async () => ({ text: "ok" }),
  };
  if (recovery) b.recovery = recovery;
  return b;
}

let root;
beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  document.documentElement.removeAttribute("data-pflicht");
  root = document.getElementById("app");
});

describe("S115 · Eintritt ohne Adresse fuehrt zur Adresse", () => {
  it("ohne bestaetigte Adresse steht das Vollbild da, sobald die App steht", async () => {
    const backend = backendMit({ emailRequired: true, recoveryEmail: false },
      { beginVerify: async () => {}, confirm: async () => {} });
    const app = createApp({ doc: document, backend, root });
    await app.boot();

    const kasten = document.getElementById("pbEmailPflicht");
    expect(kasten, "das Vollbild steht").toBeTruthy();
    expect(document.documentElement.getAttribute("data-pflicht")).toBe("1");
    // Es liegt am body, nicht im App-Baum — sonst koennte eine Zone es
    // beschneiden. Und darunter liegt die fertige Startseite: der Weg ist
    // gebaut, er ist nur noch nicht frei.
    expect(kasten.parentElement).toBe(document.body);
    expect(root.querySelector("#scrStart").classList.contains("pb-hidden")).toBe(false);
    // Der Einstieg ist die Adresse — nicht der Code, den es noch nicht gibt.
    expect(document.activeElement).toBe(q(kasten, "mail"));
  });

  it("mit bestaetigter Adresse kommt nichts dazwischen", async () => {
    const backend = backendMit({ emailRequired: true, recoveryEmail: true },
      { beginVerify: async () => {}, confirm: async () => {} });
    const app = createApp({ doc: document, backend, root });
    await app.boot();
    expect(document.getElementById("pbEmailPflicht")).toBe(null);
    expect(document.documentElement.hasAttribute("data-pflicht")).toBe(false);
  });

  it("ohne Wiedereinstiegs-Fassade (Artefakt) bleibt der Weg frei", async () => {
    // Eine Plattform ohne backend.recovery kann die Adresse gar nicht
    // entgegennehmen. Ein Vollbild waere dort eine Tuer ohne Klinke.
    const backend = backendMit({ emailRequired: true, recoveryEmail: false });
    const app = createApp({ doc: document, backend, root });
    await app.boot();
    expect(document.getElementById("pbEmailPflicht")).toBe(null);
    expect(root.querySelector("#scrStart").classList.contains("pb-hidden")).toBe(false);
  });

  it("die bestaetigte Adresse raeumt das Vollbild ab und laesst die Regal-Zeile zurueck", async () => {
    let begonnen = null, bestaetigt = null;
    const backend = backendMit({ emailRequired: true, recoveryEmail: false }, {
      beginVerify: async e => { begonnen = e; },
      confirm: async p => { bestaetigt = p; },
    });
    const app = createApp({ doc: document, backend, root });
    await app.boot();

    const kasten = document.getElementById("pbEmailPflicht");
    q(kasten, "mail").value = "anna@example.com";
    await klick(q(kasten, "senden"));
    expect(begonnen).toBe("anna@example.com");
    q(kasten, "pin").value = "123456";
    await klick(q(kasten, "ok"));
    expect(bestaetigt).toBe("123456");

    expect(document.getElementById("pbEmailPflicht"), "das Vollbild ist weg").toBe(null);
    expect(document.documentElement.hasAttribute("data-pflicht"),
      "und die Bedien-Ecke darf wieder").toBe(false);
    // Der zweite Weg bleibt bestehen: im Regal steht jetzt der Status.
    expect(root.querySelector("#boxRecovery").textContent)
      .toContain("bestätigte E-Mail-Adresse ist hinterlegt");
  });
});

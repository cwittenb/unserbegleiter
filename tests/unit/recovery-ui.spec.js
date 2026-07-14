// @vitest-environment happy-dom
// Wiedereinstiegs-Karte im persönlichen Raum + Pflicht-Modal (S45).
// Zweistufig: Adresse → Code anfordern → 6-stelligen Code bestätigen.
// Zugriff über data-rec-Attribute (keine IDs — Karte und Modal koexistieren).

import { describe, it, expect, beforeEach } from "vitest";
import { createApp } from "../../core/ui/app.js";

const tick = () => new Promise(r => setTimeout(r, 0));
async function klick(el) { el.click(); await tick(); await tick(); }
const q = (wirt, name) => wirt.querySelector('[data-rec="' + name + '"]');

function baseBackend(extra) {
  return {
    async info() { return { role: "A", name: "Anna", partner: "Bernd", nameA: "Anna", nameB: "Bernd", ...(extra || {}) }; },
    bstate: { get: async () => null, set: async () => true },
    pstate: { get: async () => null, set: async () => true },
    chat: { load: async () => null, save: async () => true },
    handover: { post: async () => {}, get: async () => null },
    llm: async () => ({ text: "ok" }),
  };
}
function recoveryStub() {
  const st = { begonnen: null, bestaetigt: null, bestaetigtAdresse: null };
  st.impl = {
    beginVerify: async e => { st.begonnen = e; },
    confirm: async (p, email) => { st.bestaetigt = p; st.bestaetigtAdresse = email; },
  };
  return st;
}

let root;
beforeEach(() => { document.body.innerHTML = '<div id="app"></div>'; root = document.getElementById("app"); });

describe("Recovery-Karte (zweistufig)", () => {
  it("bleibt verborgen, wenn das Backend kein recovery anbietet (z. B. Artefakt)", async () => {
    const app = createApp({ doc: document, backend: baseBackend(), root });
    await app.boot();
    expect(root.querySelector("#boxRecovery").classList.contains("pb-hidden")).toBe(true);
  });

  it("Adresse → Code anfordern → Code bestätigen → Status „hinterlegt“ mit Ändern-Knopf", async () => {
    const st = recoveryStub();
    const backend = baseBackend({ recoveryEmail: false });
    backend.recovery = st.impl;
    const app = createApp({ doc: document, backend, root });
    await app.boot();

    const box = root.querySelector("#boxRecovery");
    expect(box.classList.contains("pb-hidden")).toBe(false);
    expect(box.textContent).toContain("Hinterlege eine E-Mail-Adresse");
    expect(q(box, "pin").style.display).toBe("none");            // Schritt 2 noch verborgen

    q(box, "mail").value = "anna@example.com";
    await klick(q(box, "senden"));
    expect(st.begonnen).toBe("anna@example.com");
    expect(q(box, "pin").style.display).not.toBe("none");        // Schritt 2 sichtbar
    expect(q(box, "note").textContent).toContain("anna@example.com");

    q(box, "pin").value = "123456";
    await klick(q(box, "ok"));
    expect(st.bestaetigt).toBe("123456");
    expect(st.bestaetigtAdresse).toBe("anna@example.com");   // D6.1a: Adresse reist mit
    // Neu gezeichnet: jetzt als hinterlegt, mit Ändern-Einstieg
    const neu = root.querySelector("#boxRecovery");
    expect(neu.textContent).toContain("bestätigte E-Mail-Adresse ist hinterlegt");
    expect(q(neu, "aendern")).toBeTruthy();
  });

  it("leere Eingabe startet nichts und zeigt einen Hinweis", async () => {
    const st = recoveryStub();
    const backend = baseBackend({ recoveryEmail: false });
    backend.recovery = st.impl;
    const app = createApp({ doc: document, backend, root });
    await app.boot();
    const box = root.querySelector("#boxRecovery");
    await klick(q(box, "senden"));
    expect(st.begonnen).toBe(null);
    expect(q(box, "note").textContent).toContain("Adresse eingeben");
  });

  it("abgelaufener/verbrauchter Code wirft auf Schritt 1 zurück", async () => {
    const st = recoveryStub();
    st.impl.confirm = async () => { throw Object.assign(new Error("weg"), { code: "pin_tries" }); };
    const backend = baseBackend({ recoveryEmail: false });
    backend.recovery = st.impl;
    const app = createApp({ doc: document, backend, root });
    await app.boot();
    const box = root.querySelector("#boxRecovery");
    q(box, "mail").value = "anna@example.com";
    await klick(q(box, "senden"));
    q(box, "pin").value = "000000";
    await klick(q(box, "ok"));
    expect(q(box, "pin").style.display).toBe("none");            // zurück auf Schritt 1
    expect(q(box, "ok").style.display).toBe("none");
  });

  it("hinterlegte Adresse: Ändern öffnet den Verifikationsfluss erneut", async () => {
    const st = recoveryStub();
    const backend = baseBackend({ recoveryEmail: true });
    backend.recovery = st.impl;
    const app = createApp({ doc: document, backend, root });
    await app.boot();
    const box = root.querySelector("#boxRecovery");
    expect(q(box, "mail")).toBe(null);                           // Fluss erst nach Klick
    await klick(q(box, "aendern"));
    expect(q(box, "mail")).toBeTruthy();
  });
});

describe("E-Mail-Pflicht-Modal (Flag emailRequired)", () => {
  it("erscheint bei emailRequired ohne bestätigte Adresse; verschwindet NUR durch Bestätigung", async () => {
    const st = recoveryStub();
    const backend = baseBackend({ recoveryEmail: false, emailRequired: true });
    backend.recovery = st.impl;
    const app = createApp({ doc: document, backend, root });
    await app.boot();

    const modal = document.getElementById("pbEmailPflicht");
    expect(modal).toBeTruthy();
    // Nicht wegklickbar: kein Schließen-Knopf, Klick auf den Schleier tut nichts
    expect(modal.querySelector("button[data-schliessen]")).toBe(null);
    modal.click(); await tick();
    expect(document.getElementById("pbEmailPflicht")).toBeTruthy();

    q(modal, "mail").value = "anna@example.com";
    await klick(q(modal, "senden"));
    q(modal, "pin").value = "654321";
    await klick(q(modal, "ok"));
    expect(st.bestaetigt).toBe("654321");
    expect(document.getElementById("pbEmailPflicht")).toBe(null);
    // Karte im Raum zeigt jetzt den hinterlegten Zustand
    expect(root.querySelector("#boxRecovery").textContent).toContain("hinterlegt");
  });

  it("erscheint NICHT, wenn bereits eine bestätigte Adresse existiert", async () => {
    const backend = baseBackend({ recoveryEmail: true, emailRequired: true });
    backend.recovery = recoveryStub().impl;
    const app = createApp({ doc: document, backend, root });
    await app.boot();
    expect(document.getElementById("pbEmailPflicht")).toBe(null);
  });

  it("erscheint NICHT ohne Flag und nicht in Umgebungen ohne recovery-Backend", async () => {
    const b1 = baseBackend({ recoveryEmail: false });
    b1.recovery = recoveryStub().impl;
    await createApp({ doc: document, backend: b1, root }).boot();
    expect(document.getElementById("pbEmailPflicht")).toBe(null);

    document.body.innerHTML = '<div id="app"></div>';
    const b2 = baseBackend({ recoveryEmail: false, emailRequired: true });   // kein backend.recovery
    await createApp({ doc: document, backend: b2, root: document.getElementById("app") }).boot();
    expect(document.getElementById("pbEmailPflicht")).toBe(null);
  });
});

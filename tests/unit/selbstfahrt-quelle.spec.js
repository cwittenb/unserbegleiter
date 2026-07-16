// Selbstfahrt auf Quell-Ebene (S67) — dieselben Journeys wie im Bundle-E2E,
// aber gegen die importierten Module: schnellere Fehlerlokalisierung (Stacks
// statt Bundle-Zeilen) und echte Coverage für selbstfahrt.js/local-backend.js.
// Dazu der gepinnte Regressionsfall des Selbstfahrt-Funds: schnelle Klicks
// VOR Abschluss von boot() dürfen nicht mehr in state.info=null laufen.

// @vitest-environment happy-dom

import { describe, it, expect } from "vitest";
import { createApp } from "../../core/ui/app.js";
import { ArtifactStore } from "../../platforms/artifact/artifact-store.js";
import { localBackend } from "../../platforms/artifact/local-backend.js";
import { fahreSelbstfahrt, speicherImSpeicher, drehbuchFetch, warteAuf, JOURNEYS } from "../../platforms/artifact/selbstfahrt.js";

describe("Selbstfahrt · Quell-Ebene", () => {
  it("beide Journeys grün (solo-smoke, aufdeckung)", async () => {
    const b = await fahreSelbstfahrt({});
    expect(b.journeys.map(j => j.id)).toEqual(JOURNEYS.map(j => j.id));
    for (const j of b.journeys)
      expect(j.ok, j.id + (j.fehler ? " — " + j.fehler : "") + "\n" +
        j.schritte.filter(s => !s.ok && !s.detail).map(s => "✗ " + s.name).join("\n")).toBe(true);
    expect(window.__PB_SELBSTFAHRT__.fail).toBe(0);            // maschinenlesbarer Bericht liegt
  }, 30000);

  it("Regression (S67-Fund): Raumwechsel VOR Abschluss von boot() crasht nicht mehr (state.info-Selbstheilung)", async () => {
    const store = new ArtifactStore(speicherImSpeicher());
    const meta = { code: "race", nameA: "Anna", nameB: "Bernd", locale: "de" };
    await store.set("PBDEV:meta", meta, true);
    const f = drehbuchFetch(["[SFR] Eröffnung"], null);
    globalThis.fetch = f;
    const backend = localBackend({ store, meta, role: "A", doc: document });
    // backend.info künstlich verlangsamen — genau das Produktions-Race (langsames Netz).
    const echtesInfo = backend.info.bind(backend);
    backend.info = () => new Promise(r => setTimeout(() => r(echtesInfo()), 120));
    const wurzel = document.createElement("div");
    document.body.appendChild(wurzel);
    const ui = createApp({ doc: document, backend, root: wurzel });
    const boote = ui.boot();                                   // NICHT abwarten —
    wurzel.querySelector("#btnMyRoom").click();                // — sofort klicken (ladeLage läuft an)
    const chatte = ui.startChat("solo");                       // und sofort in den Solo-Raum
    await expect(chatte).resolves.toBeUndefined();             // vorher: TypeError null.name
    await boote;
    await warteAuf(() => wurzel.textContent.includes("[SFR]"), "Eröffnung trotz Race gerendert");
    expect((wurzel.querySelector("#pbErr") || { textContent: "" }).textContent).toBe("");
    wurzel.remove();
  }, 15000);
});

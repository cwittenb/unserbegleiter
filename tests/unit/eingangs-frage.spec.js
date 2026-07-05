// @vitest-environment happy-dom
// Eingangsfrage vor den Artefakten — funktionales Gate (echtes SHA-256 via
// WebCrypto) + Build-Beweise: Frage drin, Antwort NICHT im Klartext.

import { describe, it, expect, beforeEach } from "vitest";
import { readFile } from "node:fs/promises";
import { mitEingangsfrage, EINGANGS_FRAGE } from "../../scripts/eingangs-frage.js";
import { buildArtifact } from "../../scripts/build-artifact.js";
import { buildEvalArtifact } from "../../scripts/build-eval-artifact.js";

const tick = () => new Promise(r => setTimeout(r, 0));
const ruhe = async (n = 8) => { for (let i = 0; i < n; i++) await tick(); };

beforeEach(() => { document.body.innerHTML = '<div id="app"></div>'; });

function starteGate(dummyBundle = 'window.__gestartet = true; document.getElementById("app").textContent = "APP LÄUFT";') {
  window.__gestartet = false;
  const js = mitEingangsfrage(dummyBundle);
  new Function(js)();   // wie das <script> im Artefakt
  return {
    inp: () => document.getElementById("pbGateIn"),
    go: () => document.getElementById("pbGateGo"),
    msg: () => document.getElementById("pbGateMsg"),
  };
}

describe("Eingangsfrage · Verhalten", () => {
  it("zeigt die Frage; falsche Antwort blockiert mit Hinweis, App startet nicht", async () => {
    const g = starteGate();
    expect(document.body.textContent).toContain(EINGANGS_FRAGE);
    g.inp().value = "falsch";
    g.go().click();
    await ruhe();
    expect(g.msg().textContent).toContain("passt leider nicht");
    expect(window.__gestartet).toBe(false);
  });

  it("richtige Antwort startet die App — auch mit Großschreibung und Leerraum (Enter genügt)", async () => {
    const g = starteGate();
    g.inp().value = "  Cars10  ";
    g.inp().dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    await ruhe();
    expect(window.__gestartet).toBe(true);
    expect(document.getElementById("app").textContent).toBe("APP LÄUFT");
    expect(document.getElementById("pbGateIn")).toBeNull();   // Gate ist weg
  });

  it("leere Eingabe fragt freundlich nach, ohne zu hashen", async () => {
    const g = starteGate();
    g.go().click();
    await ruhe(2);
    expect(g.msg().textContent).toContain("Bitte etwas eingeben");
    expect(window.__gestartet).toBe(false);
  });

  it("die Antwort steht nicht im Klartext im erzeugten Gate-Code", () => {
    const js = mitEingangsfrage("1;");
    expect(js).toContain(EINGANGS_FRAGE);
    expect(js.toLowerCase()).not.toContain("cars10");
  });
});

describe("Eingangsfrage · in beiden Artefakten", () => {
  it("Dev-Artefakt: Frage vorgeschaltet, Antwort nirgends im Klartext", async () => {
    const { out } = await buildArtifact();
    const html = await readFile(out, "utf8");
    expect(html).toContain(EINGANGS_FRAGE);
    expect(html.toLowerCase()).not.toContain("cars10");
  }, 30000);

  it("Eval-Artefakt: Frage vorgeschaltet, Antwort nirgends im Klartext", async () => {
    const { out } = await buildEvalArtifact();
    const html = await readFile(out, "utf8");
    expect(html).toContain(EINGANGS_FRAGE);
    expect(html.toLowerCase()).not.toContain("cars10");
  }, 30000);
});

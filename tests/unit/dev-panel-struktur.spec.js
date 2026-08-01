// @vitest-environment happy-dom
// ST2 · Struktur-Telemetrie im Entwicklungspanel: Live-Getter, ehrliche
// Leere ohne Session, Zahlen mit Session.

import { describe, it, expect } from "vitest";
import { createDevPanel } from "../../platforms/artifact/dev-panel.js";

function baueHost() {
  const host = document.createElement("div");
  document.body.appendChild(host);
  return host;
}
// ArtifactStore-Vertrag: list liefert ein ARRAY von Keys (artifact-store.js
// gibt r.keys ?? [] zurück) — die Token-Initialisierung des Panels iteriert
// direkt darüber. Ein {keys:[]}-Stub ließ sie als Unhandled Rejection platzen.
const store = { list: async () => [], get: async () => null, set: async () => true, del: async () => true };

describe("Entwicklungspanel · Struktur-Telemetrie", () => {
  it("ohne laufende Session: ehrliche Leere, kein Wurf", () => {
    const host = baueHost();
    createDevPanel({ doc: document, host, store, reboot: () => {}, holeStruktur: () => null });
    expect(host.querySelector("#devStruktur").textContent).toContain("Keine laufende Struktur-Session");
  });

  it("mit Session: Zähler in der festen Reihenfolge tool/gerettet/korrigiert/fehlgeschlagen", () => {
    const host = baueHost();
    let z = { tool: 3, gerettet: 1, korrigiert: 0, fehlgeschlagen: 0 };
    createDevPanel({ doc: document, host, store, reboot: () => {}, holeStruktur: () => z });
    const el = host.querySelector("#devStruktur");
    expect(el.textContent).toBe("tool 3 · gerettet 1 · korrigiert 0 · fehlgeschlagen 0");
    z = { tool: 4, gerettet: 1, korrigiert: 1, fehlgeschlagen: 0 };
    host.querySelector("#devStrukturLesen").click();
    expect(el.textContent).toContain("tool 4");
    expect(el.textContent).toContain("korrigiert 1");
  });

  it("fehlender Getter (ältere Einbettung): Abschnitt bleibt ruhig", () => {
    const host = baueHost();
    createDevPanel({ doc: document, host, store, reboot: () => {} });
    expect(host.querySelector("#devStruktur").textContent).toContain("Keine laufende Struktur-Session");
  });
});

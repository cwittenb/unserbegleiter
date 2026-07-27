// @vitest-environment happy-dom
// Testinfrastruktur · Was ein Timeout hinterlässt.
//
// Zwei e2e-Vorfälle sind ohne Befund verpufft. Die Meldung lautete
// »Timeout: <was>« und sonst nichts — nicht einmal, welches von fünf
// Wartefenstern es war. Ein nicht reproduzierbarer Fehler, der nichts
// hinterlässt, ist ein Fehler, den man nie findet.
//
// Diese Tests halten fest, dass der nächste Vorfall eine Diagnose ist.

import { describe, it, expect, beforeEach } from "vitest";
import { warteAuf } from "../../platforms/artifact/selbstfahrt.js";

const nie = () => null;
const kurz = { timeoutMs: 30, schrittMs: 5 };

beforeEach(() => { document.body.innerHTML = ""; });

describe("warteAuf · Erfolgsfall unverändert", () => {
  it("reicht den Rückgabewert durch", async () => {
    expect(await warteAuf(() => "da", "x", kurz)).toBe("da");
  });

  it("pollt, bis es soweit ist", async () => {
    let n = 0;
    expect(await warteAuf(() => (++n >= 3 ? n : null), "x", kurz)).toBe(3);
  });
});

describe("warteAuf · Der Timeout sagt, was los war", () => {
  it("nennt weiterhin, worauf gewartet wurde", async () => {
    await expect(warteAuf(nie, "App boot", kurz)).rejects.toThrow(/App boot/);
  });

  it("nennt die tatsächlich verstrichene Zeit", async () => {
    await expect(warteAuf(nie, "x", kurz)).rejects.toThrow(/nach \d+ms/);
  });

  it("zeigt eine sichtbare Fehlerbox — der häufigste stille Grund", async () => {
    document.body.innerHTML = '<div id="pbErr">Der Dienst ist gerade ausgelastet.</div>';
    await expect(warteAuf(nie, "x", kurz)).rejects.toThrow(/Fehlerbox: Der Dienst/);
  });

  it("unterscheidet wartenden von freiem Composer", async () => {
    document.body.innerHTML = '<button id="btnSend" disabled></button>';
    await expect(warteAuf(nie, "x", kurz)).rejects.toThrow(/btnSend gesperrt \(wartet\)/);
    document.body.innerHTML = '<button id="btnSend"></button>';
    await expect(warteAuf(nie, "x", kurz)).rejects.toThrow(/btnSend frei/);
  });

  it("meldet eine hängende Stream-Blase", async () => {
    document.body.innerHTML = '<div id="pbStream"></div>';
    await expect(warteAuf(nie, "x", kurz)).rejects.toThrow(/Stream-Blase sichtbar/);
  });

  it("hängt einen Textauszug an — woran der Ablauf steckenblieb", async () => {
    document.body.innerHTML = "<div>Erzähl gern, was dich beschäftigt.</div>";
    await expect(warteAuf(nie, "x", kurz)).rejects.toThrow(/Erzähl gern/);
  });

  it("nimmt einen eigenen Befund entgegen — etwa den KV-Stand", async () => {
    await expect(warteAuf(nie, "x", { ...kurz, befund: () => "KV zuletzt: {}" }))
      .rejects.toThrow(/KV zuletzt: \{\}/);
  });

  it("ein werfender Befund kippt die Meldung nicht — er wird selbst zum Befund", async () => {
    const p = warteAuf(nie, "x", { ...kurz, befund: () => { throw new Error("kaputt"); } });
    await expect(p).rejects.toThrow(/befund\(\) warf: kaputt/);
    await expect(p).rejects.toThrow(/Timeout: x/);   // die Hauptinformation bleibt
  });

  it("ohne DOM bleibt die Meldung schlank statt zu kippen", async () => {
    const doc = globalThis.document;
    try {
      delete globalThis.document;
      await expect(warteAuf(nie, "x", kurz)).rejects.toThrow(/Timeout: x/);
    } finally { globalThis.document = doc; }
  });
});

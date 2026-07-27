// @vitest-environment happy-dom
// S95.7e · Das abgeschlossene Gespräch nochmal lesen.
//
// Der Punkt der Ansicht ist, was sie WEGLÄSST. renderMsgs zöge Auswahlfläche,
// Aufdeck-Tafeln mit Weiter-Knopf, Stream-Blase, Skalen und Composer mit —
// nichts davon gehört zu einem abgeschlossenen Gespräch. Eine inerte Session
// braucht eine inerte Ansicht.
//
// Übernommen wird dagegen die Darstellungsregel: dieselbe Maskierung, dieselbe
// Marker-Bereinigung, dieselben Sprecherlabel. Wer den Verlauf später liest,
// soll ihn wiedererkennen.

import { describe, it, expect, beforeEach } from "vitest";
import { zeichneReplay } from "../../core/ui/replay-ansicht.js";
import { setLocale, t } from "../../core/i18n/index.js";

const el = (tag, cls) => {
  const x = document.createElement(tag);
  if (cls) x.className = cls;
  return x;
};
let wirt;
beforeEach(() => { setLocale("de"); document.body.innerHTML = "<div id='w'></div>"; wirt = document.getElementById("w"); });

const verlauf = messages => ({ messages, at: "2026-07-01T10:00:00Z" });

describe("S95.7e · Was gezeichnet wird", () => {
  it("Nutzertext und Begleitertext, mit Sprecherlabel beim Rollenwechsel", () => {
    zeichneReplay(wirt, verlauf([
      { role: "user", content: "Mich beschäftigt das Wochenende." },
      { role: "assistant", content: "Erzähl gern." },
    ]), el);
    expect(wirt.querySelectorAll(".pb-msg")).toHaveLength(2);
    expect(wirt.querySelectorAll(".rz-sprecher")).toHaveLength(1);
    expect(wirt.textContent).toContain("Mich beschäftigt das Wochenende.");
  });

  it("das Label fällt nur beim Wechsel, nicht bei jeder Nachricht", () => {
    zeichneReplay(wirt, verlauf([
      { role: "assistant", content: "Eins." },
      { role: "assistant", content: "Zwei." },
    ]), el);
    expect(wirt.querySelectorAll(".rz-sprecher")).toHaveLength(1);
  });

  it("Panel-Echos bleiben — sie waren damals zu sehen", () => {
    zeichneReplay(wirt, verlauf([{ role: "user", content: "x", echo: "Nähe 4 · Wunsch 6" }]), el);
    expect(wirt.querySelector(".pb-echo").textContent).toBe("Nähe 4 · Wunsch 6");
  });

  it("Nutzertext wird als Text gesetzt, nicht als HTML", () => {
    zeichneReplay(wirt, verlauf([{ role: "user", content: "<b>fett</b>" }]), el);
    expect(wirt.querySelector(".pb-msg.me").innerHTML).not.toContain("<b>");
    expect(wirt.textContent).toContain("<b>fett</b>");
  });
});

describe("S95.7e · Was NICHT gezeichnet wird", () => {
  it("Wire-Nachrichten bleiben verborgen (Protokoll-Köpfe, nicht Blöcke)", () => {
    const n = zeichneReplay(wirt, verlauf([
      { role: "user", content: "SLIDERS-RESULT\ncloseness: 4" },
      { role: "user", content: "Sichtbar." },
    ]), el);
    expect(n).toBe(1);
    expect(wirt.textContent).not.toContain("SLIDERS-RESULT");
  });

  /* Uebergabe-Nachrichten (HANDOVER-BLOCK) sind KEINE Wire-Koepfe — sie sind
     im Verlauf mit hidden markiert. Beide Wege muessen greifen, sonst stuende
     im Lesetext, was im Chat nie zu sehen war. */
  it("versteckte Nachrichten bleiben versteckt", () => {
    expect(zeichneReplay(wirt, verlauf([{ role: "user", content: "x", hidden: true }]), el)).toBe(0);
  });

  it("keine Aufdeck-Tafel — sie trüge einen Weiter-Knopf in einen Ablauf, den es nicht mehr gibt", () => {
    zeichneReplay(wirt, verlauf([{ role: "assistant", content: "Soweit.", tafel: { titel: "T", zeilen: [] } }]), el);
    expect(wirt.textContent).not.toContain("T");
    expect(wirt.querySelectorAll("button")).toHaveLength(0);
  });

  it("keine Eingabe, kein Composer, keine Stream-Blase", () => {
    zeichneReplay(wirt, verlauf([{ role: "assistant", content: "Soweit." }]), el);
    expect(wirt.querySelector("textarea, input, #pbStream, .pb-typing")).toBeNull();
  });

  it("Marker und Blöcke werden bereinigt wie im Verlauf", () => {
    zeichneReplay(wirt, verlauf([
      { role: "assistant", content: "Danke dir.\nEXCERPT-BLOCK\npairs: []\nEND EXCERPT-BLOCK" },
    ]), el);
    expect(wirt.textContent).toContain("Danke dir.");
    expect(wirt.textContent).not.toContain("EXCERPT-BLOCK");
  });
});

describe("S95.7e · Randfälle", () => {
  it("leerer Verlauf zeichnet nichts und meldet null", () => {
    expect(zeichneReplay(wirt, verlauf([]), el)).toBe(0);
    expect(wirt.innerHTML).toBe("");
  });

  it("fehlender Verlauf kippt nicht", () => {
    expect(zeichneReplay(wirt, null, el)).toBe(0);
  });

  it("ohne Wirt passiert nichts", () => {
    expect(zeichneReplay(null, verlauf([{ role: "user", content: "x" }]), el)).toBe(0);
  });

  it("zweites Zeichnen ersetzt, statt anzuhängen", () => {
    zeichneReplay(wirt, verlauf([{ role: "user", content: "erst" }]), el);
    zeichneReplay(wirt, verlauf([{ role: "user", content: "dann" }]), el);
    expect(wirt.querySelectorAll(".pb-msg")).toHaveLength(1);
    expect(wirt.textContent).toContain("dann");
  });
});

// S93 · Urteils-Wächter — Trefferbild und Ruhezone.
//
// Der Wächter ist bewusst eng: Er greift bei der ERÖFFNUNG mit einem
// Prädikats-Urteil und beim ÄSTHETIK-URTEIL über eine Äußerung. Alles andere
// bleibt unangetastet — der schlimmste Fehlalarm wäre eine zusätzliche
// Revisions-Runde, aber jeder Fehlalarm kostet eine Modellrunde, also wird
// hier ausdrücklich auch die Ruhezone geprüft.

import { describe, it, expect } from "vitest";
import { findetUrteil, pruefeUrteilsAntwort, URTEILS_REVISION } from "../../core/engine/urteils-waechter.js";

describe("Urteils-Wächter · Treffer", () => {
  it("erkennt den realen Befund aus der privaten Session", () => {
    const t = "Das ist eine starke Fassung – deine Stimme ist klar drin.";
    expect(findetUrteil(t).stufe).toBe(1);
    expect(pruefeUrteilsAntwort(t)).toBe(URTEILS_REVISION);
  });

  it.each([
    ["Das ist ein großer Satz.", 1],
    ["Das klingt nach einem echten Moment.", 1],
    ["Das war mutig von dir.", 1],
    ["Es ist bemerkenswert, wie klar du das sagst.", 1],
    ["Was für ein Moment.", 1],
    ["That's a powerful sentence.", 1],
    ["Danke, dass du das ausgesprochen hast. Du hast da eine sehr klare Formulierung gefunden.", 2],
    ["Ich lese das jetzt noch einmal. Du hast eine schöne Fassung daraus gemacht.", 2],
  ])("greift bei %j (Stufe %i)", (text, stufe) => {
    const f = findetUrteil(text);
    expect(f).not.toBeNull();
    expect(f.stufe).toBe(stufe);
  });

  it("greift auch, wenn ein Markdown-Zeichen vor dem Urteil steht", () => {
    expect(findetUrteil("**Das ist eine starke Fassung.**")).not.toBeNull();
  });
});

describe("Urteils-Wächter · Ruhezone", () => {
  it.each([
    "Für mich klingt das wie ein sehr zentraler Punkt – was denkst du?",
    "Auf mich wirkt das wie ein Wendepunkt – stimmt das für dich?",
    "Was ist dir dabei durch den Kopf gegangen?",
    "Ich höre darin einen Wunsch nach Nähe – trifft das?",
    "Für mich ist das eine starke Fassung – aber trifft sie noch deinen Kern?",
    "Du hast eben von letztem Dienstag erzählt. Magst du davon mehr erzählen?",
    "Ein Teil von dir will Nähe, ein anderer Ruhe – nehme ich das richtig wahr?",
  ])("schweigt bei %j", (text) => {
    expect(findetUrteil(text)).toBeNull();
    expect(pruefeUrteilsAntwort(text)).toBeNull();
  });

  it("schweigt bei Marken-Antworten – dort gehört die letzte Zeile der App", () => {
    expect(pruefeUrteilsAntwort("Das ist ein schöner Satz.\n[[RANKING]]")).toBeNull();
  });

  it("schweigt bei Block-Antworten – Protokoll ist kein Spiegel", () => {
    const t = "Das ist eine starke Fassung.\nGATE-BLOCK\n{}\nEND GATE-BLOCK";
    expect(pruefeUrteilsAntwort(t)).toBeNull();
  });

  it("schweigt bei leerem Text", () => {
    expect(pruefeUrteilsAntwort("")).toBeNull();
    expect(pruefeUrteilsAntwort(null)).toBeNull();
  });
});

describe("Urteils-Wächter · Revisionstext", () => {
  it("ist eine SYSTEM-REVISION und nennt den Ausweg (Ich-Perspektive mit Rückfrage)", () => {
    expect(URTEILS_REVISION).toContain("SYSTEM-REVISION");
    expect(URTEILS_REVISION).toContain("Ich-Perspektive");
    expect(URTEILS_REVISION).toContain("Rückfrage");
  });
});

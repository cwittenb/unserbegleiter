// Aufdeck-Wächter (S72, E2) — pinnt den Eval-Befund AUFD-01 deterministisch:
// Stapel-Inhalte im Begleitungs-Text vor der ersten Tafel lösen GENAU EINE
// SYSTEM-REVISION aus; die Heuristik ist personenform-tolerant und schlägt auf
// normalen AUFTAKT-Texten nicht an. Engine-Ebene mit Mock-LLM (Ebene 1.5-Stil).

import { describe, it, expect } from "vitest";
import { stamme, extrahiereStapelItems, findetStapelLeck, tafelSchonGezeigt, pruefeAufdeckAntwort, AUFDECK_REVISION } from "../../core/engine/aufdeck-waechter.js";

// Wire-Erstnachricht exakt wie im Eval-Szenario AUFD-01 (mit G-Zeilen).
const ERSTE = `HANDOVER-BLOCK – Anna
S1: Ich wünsche mir mehr gemeinsame Unternehmungen.
G1: Bernd wünscht sich vermutlich mehr Ruhe.
END HANDOVER-BLOCK

HANDOVER-BLOCK – Bernd
S1: Ich vermisse gemeinsame Erlebnisse.
G1: Anna wünscht sich vermutlich mehr Gespräche.
END HANDOVER-BLOCK

Anna: Wir sind beide da und möchten mit der Auflösung beginnen.`;

const KTX = { messages: [{ role: "user", content: ERSTE }], nameA: "Anna", nameB: "Bernd" };

describe("Wächter · Item-Extraktion & Stämme", () => {
  it("zieht S-/G-Zeilen beider Blöcke; Namen zählen nicht als Inhaltswörter", () => {
    const items = extrahiereStapelItems(ERSTE, ["Anna", "Bernd"]);
    expect(items.map(i => i.text)).toEqual([
      "Ich wünsche mir mehr gemeinsame Unternehmungen.",
      "Bernd wünscht sich vermutlich mehr Ruhe.",
      "Ich vermisse gemeinsame Erlebnisse.",
      "Anna wünscht sich vermutlich mehr Gespräche.",
    ]);
    expect(items[1].staemme).not.toContain("bernd");
    expect(stamme("vermisse vermisst")).toEqual(["vermi", "vermi"]);   // Flexions-Toleranz
  });
});

describe("Wächter · Leck-Erkennung (exakt der sonnet-5-Wortlaut)", () => {
  const items = extrahiereStapelItems(ERSTE, ["Anna", "Bernd"]);

  it("erkennt die personenverschobene Wiedergabe aus dem Eval-Lauf", () => {
    const leck = "Ich beginne mit dem, was Bernd über sich selbst gesagt hat. Bernd, du hast mitgebracht: Du vermisst gemeinsame Erlebnisse. Anna, deine Vermutung war: Bernd wünscht sich mehr Ruhe.";
    const t = findetStapelLeck(leck, items);
    expect(t).toBeTruthy();
    expect(t.item).toContain("vermisse gemeinsame Erlebnisse");
  });

  it("schlägt auf normalen AUFTAKT-Texten NICHT an (Rahmen, Okay, Richtungswahl, gemeinsame Auflösung)", () => {
    for (const ok of [
      "Willkommen zu eurer gemeinsamen Auflösung — ein spielerisches Aufdecken, kein Test. Seid ihr beide bereit?",
      "Schön. Wer von euch beiden möchte anfangen — wessen Herzens-Stapel decken wir zuerst auf, Anna oder Bernd?",
      "Dann schauen wir zuerst auf Bernds Stapel neben Annas Tipp.",
      "Was fällt euch beiden als Erstes ins Auge? Was überrascht euch?",
    ]) expect(findetStapelLeck(ok, items), ok).toBe(null);
  });

  it("Allerwelts-Stämme allein (gemeinsam/wünschen/mehr) reichen nie für einen Treffer", () => {
    expect(findetStapelLeck("Ihr wünscht euch beide mehr voneinander — gemeinsam schauen wir gleich darauf.", items)).toBe(null);
  });
});

describe("Wächter · Kontextregeln", () => {
  it("nach der ersten Tafel schweigt der Wächter (über Inhalte sprechen ist dann erwünscht)", () => {
    const msgs = [{ role: "user", content: ERSTE }, { role: "assistant", content: "x", tafel: { gA: {}, gB: {} } }];
    expect(tafelSchonGezeigt(msgs)).toBe(true);
    expect(pruefeAufdeckAntwort("Bernd, du hast mitgebracht: Du vermisst gemeinsame Erlebnisse.", { ...KTX, messages: msgs })).toBe(null);
  });

  it("eine Nachricht MIT Marke wird nie beanstandet (die App übernimmt die Tafel)", () => {
    expect(pruefeAufdeckAntwort("Dann zuerst Bernds Stapel.\n[[REVEAL-B]]", KTX)).toBe(null);
  });

  it("das Leck ohne Marke vor der Tafel liefert exakt die Revisions-Nachricht", () => {
    expect(pruefeAufdeckAntwort("Bernd, du hast mitgebracht: Du vermisst gemeinsame Erlebnisse.", KTX)).toBe(AUFDECK_REVISION);
  });
});

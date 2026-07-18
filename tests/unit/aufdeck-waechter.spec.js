// Aufdeck-Wächter (S72, E2) — pinnt den Eval-Befund AUFD-01 deterministisch:
// Stapel-Inhalte im Begleitungs-Text vor der ersten Tafel lösen GENAU EINE
// SYSTEM-REVISION aus; die Heuristik ist personenform-tolerant und schlägt auf
// normalen AUFTAKT-Texten nicht an. Engine-Ebene mit Mock-LLM (Ebene 1.5-Stil).

import { describe, it, expect } from "vitest";
import { stamme, extrahiereStapelItems, findetStapelLeck, tafelSchonGezeigt, pruefeAufdeckAntwort, imAufdeckPfad, AUFDECK_REVISION } from "../../core/engine/aufdeck-waechter.js";

// Wire-Erstnachricht wie in der echten App: HANDOVER-BLOCKS **plus**
// REVEAL-CONTEXT mit „AUFDECKUNG STEHT AUS" (S73: ohne diesen Kopf ist die
// Session im kollabierten/Protokoll-Pfad — dort urteilt der Wächter nie).
const KOPF = `AUFDECKUNG STEHT AUS — beginne mit dem AUFTAKT. REVEAL-CONTEXT:
REVEAL-CONTEXT (app-intern; nicht als Block zitieren)
Anna – Top 5 (eigener Stapel): 1. Gemeinsame Unternehmungen · 2. Verlässlichkeit
Anna – Tipp (vermutete Top 3 des Partners): 1. Ruhe · 2. Anerkennung
Bernd – Top 5 (eigener Stapel): 1. Gemeinsame Erlebnisse · 2. Nähe
Bernd – Tipp (vermutete Top 3 des Partners): 1. Gespräche · 2. Leichtigkeit
END REVEAL-CONTEXT`;

const ERSTE = `HANDOVER-BLOCK – Anna
S1: Ich wünsche mir mehr gemeinsame Unternehmungen.
G1: Bernd wünscht sich vermutlich mehr Ruhe.
END HANDOVER-BLOCK

HANDOVER-BLOCK – Bernd
S1: Ich vermisse gemeinsame Erlebnisse.
G1: Anna wünscht sich vermutlich mehr Gespräche.
END HANDOVER-BLOCK

${KOPF}

Anna: Wir sind beide da und möchten mit der Auflösung beginnen.`;

// Dieselben Blöcke OHNE Aufdeck-Kopf = kollabierter Pfad (Aufdeckung abgelehnt).
const ERSTE_KOLLABIERT = ERSTE.replace(KOPF, "").replace(/\n{3,}/g, "\n\n");

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
    expect(t).toBeTruthy();                                    // welches der (mehreren) geleckten Items zuerst
    expect([items[1].text, items[2].text]).toContain(t.item);  // gemeldet wird, ist Implementierungsdetail
  });

  it("S73 · fängt das Kurzwort-Leck des sonnet-Restlaufs (»mehr Ruhe« — Allerwelts+Kurzstamm-Item)", () => {
    const leck = "Anna hat vermutet: Bernd wünscht sich vermutlich mehr Ruhe. Bernd, wie trifft das für dich zu?";
    const t = findetStapelLeck(leck, items);
    expect(t).toBeTruthy();
    expect(t.item).toContain("mehr Ruhe");
  });

  it("S73 · »in Ruhe anschauen« allein bleibt Fehlalarm-frei (nur ein Item-Stamm)", () => {
    expect(findetStapelLeck("Lasst uns das gleich in Ruhe gemeinsam anschauen — wer möchte anfangen?", items)).toBe(null);
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

describe("Wächter · Pfad-Bewusstsein (S73)", () => {
  it("ohne »AUFDECKUNG STEHT AUS« (kollabierter Pfad) urteilt der Wächter NIE — Phase-1-Arbeit mit Inhalten ist dort legitim", () => {
    expect(imAufdeckPfad(ERSTE)).toBe(true);
    expect(imAufdeckPfad(ERSTE_KOLLABIERT)).toBe(false);
    const ktx = { messages: [{ role: "user", content: ERSTE_KOLLABIERT }], nameA: "Anna", nameB: "Bernd" };
    expect(pruefeAufdeckAntwort("Anna hat vermutet: Bernd wünscht sich vermutlich mehr Ruhe. Bernd, wie ist das für dich?", ktx)).toBe(null);
  });

  it("der englische Kopf (»REVEAL PENDING«) aktiviert den Pfad ebenso", () => {
    expect(imAufdeckPfad("… REVEAL PENDING — begin with the OPENING …")).toBe(true);
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

// Vertrag 1 · MARKER — Letzte-Zeile-Regel und Spezifisch-vor-generisch.

import { describe, it, expect } from "vitest";
import { findeMarker, letzteZeile, pruefeMarkerOrder } from "../../core/contracts/marker.js";

const ORDER = ["[[SLIDERS]]", "[[PARTNER-RANKING]]", "[[PARTNER-GUESS-CHANGE]]", "[[RANKING]]"];

describe("Marker · Letzte-Zeile-Regel", () => {
  it("Marker allein in der letzten Zeile feuert", () => {
    expect(findeMarker("Lass uns das einordnen.\n\n[[RANKING]]", ORDER)).toBe("[[RANKING]]");
  });

  it("nachlaufende Leerzeilen stören nicht", () => {
    expect(findeMarker("Text.\n[[SLIDERS]]\n\n   \n", ORDER)).toBe("[[SLIDERS]]");
  });

  it("Restzeichen in der letzten Zeile stören nicht (Satzzeichen-Toleranz)", () => {
    expect(findeMarker("Gut.\n[[RANKING]].", ORDER)).toBe("[[RANKING]]");
  });

  it("VERSCHÄRFUNG ggü. v0.29: Marker mitten im Text feuert NICHT", () => {
    // v0.29 nutzte text.includes() über die ganze Nachricht — Toleranz-Krücke
    // für ältere Modelle (Ballast-Register). Die Spez verlangt: allein in der
    // letzten Zeile. Dieser Test dokumentiert die bewusste Verschärfung.
    const text = "Gleich zeige ich dir das [[RANKING]]-Panel.\nAber erst noch eine Frage: Wie geht es dir damit?";
    expect(findeMarker(text, ORDER)).toBeNull();
  });

  it("kein Marker → null, leerer Text → null", () => {
    expect(findeMarker("Nur Text ohne Marke.", ORDER)).toBeNull();
    expect(findeMarker("", ORDER)).toBeNull();
    expect(findeMarker(null, ORDER)).toBeNull();
  });
});

describe("Marker · Spezifisch vor generisch", () => {
  it("[[PARTNER-RANKING]] gewinnt gegen [[RANKING]] (Teilstring-Falle)", () => {
    expect(findeMarker("…\n[[PARTNER-RANKING]]", ORDER)).toBe("[[PARTNER-RANKING]]");
  });

  it("pruefeMarkerOrder: generisch VOR spezifisch wird abgewiesen", () => {
    const falschherum = ["[[RANKING]]", "[[PARTNER-RANKING]]"];
    expect(pruefeMarkerOrder(falschherum).length).toBeGreaterThan(0);
    expect(pruefeMarkerOrder(ORDER)).toEqual([]);
  });

  it("pruefeMarkerOrder: Duplikate und Formatfehler werden gemeldet", () => {
    expect(pruefeMarkerOrder(["[[X]]", "[[X]]"]).length).toBeGreaterThan(0);
    expect(pruefeMarkerOrder(["kein-marker"]).length).toBeGreaterThan(0);
  });
});

describe("Marker · letzteZeile", () => {
  it("liefert die letzte nicht-leere Zeile getrimmt", () => {
    expect(letzteZeile("a\nb\n  c  \n\n")).toBe("c");
    expect(letzteZeile("\n\n")).toBe("");
  });
});

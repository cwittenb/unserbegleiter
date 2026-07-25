// S95.1 · Auswahlmenge des Dialogausschnitts — reine Funktion.
//
// Geprüft wird die Frage "welche Frage-Antwort-Paare sind überhaupt wählbar",
// NICHT die Kriterienprüfung (S95.2) und nicht die Oberfläche (S95.5).

import { describe, it, expect } from "vitest";
import { paareAusVerlauf, baueAusschnitt } from "../../core/engine/ausschnitt.js";

const a = c => ({ role: "assistant", content: c });
const u = c => ({ role: "user", content: c });

const VERLAUF = [
  { role: "user", hidden: true, content: "[Start]" },
  a("Was beschäftigt dich gerade?"),
  u("Der Streit von gestern."),
  a("Was macht das mit dir, das so auszusprechen?"),
  u("Es wird klarer."),
];

describe("Ausschnitt · paareAusVerlauf", () => {
  it("bildet Paare in Reihenfolge und ordnet korrekt zu", () => {
    const p = paareAusVerlauf(VERLAUF);
    expect(p).toHaveLength(2);
    expect(p[0].frage.text).toBe("Was beschäftigt dich gerade?");
    expect(p[0].antwort.text).toBe("Der Streit von gestern.");
    expect(p[1].antwort.text).toBe("Es wird klarer.");
    expect(p.map(x => x.nr)).toEqual([0, 1]);
  });

  it("hidden-Nachricht zwischen Frage und Antwort lässt das Paar intakt", () => {
    const p = paareAusVerlauf([
      a("Frage?"),
      { role: "user", hidden: true, content: "[SYSTEM-REVISION: …]" },
      u("Antwort."),
    ]);
    expect(p).toHaveLength(1);
    expect(p[0].antwort.text).toBe("Antwort.");
  });

  it("Assistant-Zug ohne folgende Antwort bildet kein Paar", () => {
    const p = paareAusVerlauf([a("Frage?"), u("Antwort."), a("Offene Frage?")]);
    expect(p).toHaveLength(1);
  });

  it("User-Zug ohne vorangehende Frage bildet kein Paar", () => {
    const p = paareAusVerlauf([u("Ich fange einfach an."), a("Frage?"), u("Antwort.")]);
    expect(p).toHaveLength(1);
    expect(p[0].antwort.text).toBe("Antwort.");
  });

  it("Blocktexte werden entfernt, ohne Platzhalter zu hinterlassen", () => {
    const p = paareAusVerlauf([
      a("Danke dir.\nTIMELINE-BLOCK\n{\"summary\":\"x\"}\nEND TIMELINE-BLOCK"),
      u("Gern."),
    ]);
    expect(p[0].frage.text).toBe("Danke dir.");
    expect(p[0].frage.text).not.toContain("TIMELINE");
    expect(p[0].frage.text).not.toContain("Zeitleisten-Eintrag");
  });

  it("ein reiner Block-Zug reißt ein Paar NICHT auseinander", () => {
    const p = paareAusVerlauf([
      a("Was macht das mit dir?"),
      a("NOTE-BLOCK\n{\"note\":\"x\"}\nEND NOTE-BLOCK"),
      u("Es tut weh."),
    ]);
    expect(p).toHaveLength(1);
    expect(p[0].frage.text).toBe("Was macht das mit dir?");
    expect(p[0].antwort.text).toBe("Es tut weh.");
  });

  it("Marken-Zeile wird entfernt, das Paar bleibt", () => {
    const p = paareAusVerlauf([a("Eine Frage vorweg:\n[[SCALE-SAFETY]]"), u("Sieben.")]);
    expect(p).toHaveLength(1);
    expect(p[0].frage.text).toBe("Eine Frage vorweg:");
  });

  it("Steuer-Token verschwinden aus dem Zitat", () => {
    const p = paareAusVerlauf([a("Alles Gute.\n[CLOSE SESSION]"), u("Danke.")]);
    expect(p[0].frage.text).toBe("Alles Gute.");
  });

  it("Wire-Ergebnisse ohne hidden-Flag (Alt-Sessions) sind keine Antwort", () => {
    const p = paareAusVerlauf([a("Frage?"), u("SCALE-RESULT: safety=7"), u("Antwort.")]);
    expect(p).toHaveLength(1);
    expect(p[0].antwort.text).toBe("Antwort.");
  });

  it("Panel-Echo ist kein Gesprächszug", () => {
    const p = paareAusVerlauf([
      a("Frage?"),
      { role: "user", echo: "Regler ausgefüllt", content: "SLIDERS-RESULT: …" },
      u("Antwort."),
    ]);
    expect(p).toHaveLength(1);
  });

  it("leerer und einseitiger Verlauf liefern eine leere Menge", () => {
    expect(paareAusVerlauf([])).toEqual([]);
    expect(paareAusVerlauf(null)).toEqual([]);
    expect(paareAusVerlauf([a("Nur ich rede.")])).toEqual([]);
    expect(paareAusVerlauf([u("Nur ich rede.")])).toEqual([]);
  });

  it("ist deterministisch", () => {
    expect(paareAusVerlauf(VERLAUF)).toEqual(paareAusVerlauf(VERLAUF));
  });

  it("IDs sind eindeutig und index-stabil (append-only)", () => {
    const p1 = paareAusVerlauf(VERLAUF);
    const p2 = paareAusVerlauf([...VERLAUF, a("Noch was?"), u("Nein.")]);
    expect(new Set(p2.map(x => x.id)).size).toBe(p2.length);
    // Anhängen darf bestehende IDs nicht verschieben.
    expect(p2.slice(0, 2).map(x => x.id)).toEqual(p1.map(x => x.id));
  });
});

describe("Ausschnitt · baueAusschnitt (Auslassung, D2)", () => {
  const paare = paareAusVerlauf([
    a("F1"), u("A1"), a("F2"), u("A2"), a("F3"), u("A3"), a("F4"), u("A4"),
  ]);

  it("benachbarte Paare tragen keine Auslassung", () => {
    const r = baueAusschnitt(paare, [paare[0].id, paare[1].id]);
    expect(r.map(x => x.gapBefore)).toEqual([false, false]);
  });

  it("Lücke zwischen gewählten Paaren wird markiert", () => {
    const r = baueAusschnitt(paare, [paare[0].id, paare[2].id]);
    expect(r.map(x => x.gapBefore)).toEqual([false, true]);
  });

  it("das erste Paar trägt nie eine Auslassung — auch nicht mitten im Verlauf", () => {
    const r = baueAusschnitt(paare, [paare[2].id, paare[3].id]);
    expect(r[0].gapBefore).toBe(false);
  });

  it("die Reihenfolge folgt dem Verlauf, nicht der Auswahl-Reihenfolge", () => {
    const r = baueAusschnitt(paare, [paare[3].id, paare[0].id]);
    expect(r.map(x => x.question)).toEqual(["F1", "F4"]);
    expect(r[1].gapBefore).toBe(true);
  });

  it("unbekannte IDs werden ignoriert, leere Auswahl ergibt nichts", () => {
    expect(baueAusschnitt(paare, ["P999-1000"])).toEqual([]);
    expect(baueAusschnitt(paare, [])).toEqual([]);
    expect(baueAusschnitt(paare, null)).toEqual([]);
  });

  it("liefert wörtlichen Text — kein Feld zum Umschreiben (D1)", () => {
    const r = baueAusschnitt(paare, [paare[0].id]);
    expect(r[0]).toEqual({ id: paare[0].id, question: "F1", answer: "A1", gapBefore: false });
  });
});

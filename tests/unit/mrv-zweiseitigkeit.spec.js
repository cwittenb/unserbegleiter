// MRV.3 · Zweiseitigkeit im geteilten Raum — vorwärts geschärft.
//
// Die Regel existiert seit S97 wörtlich und reißt trotzdem (GATE 3/3,
// Sonde 7/8). Gemessen wurde, warum:
//
//   C  S97-Passage an den Anfang     8/8   → Position:        −0,13
//   D  S97 mit wörtlichem Beispiel   7/8   → Wiedererkennung:  0,00
//
// Beides scheidet aus. D erzeugte sogar einen NEUEN Fehler (Drängen zum
// Nachholen) — mehr Text an dieser Stelle verschiebt ihn nur.
//
// Deshalb hier keine weitere Korpus-Regel, sondern ein Zusatz VOR der Antwort,
// der den vermuteten Grund adressiert: einen Rollenkonflikt. »Begleitung, nicht
// Leitung« steht prominent im Prompt — und eine Rückfrage, nachdem eine Person
// gerade weitergehen wollte, fühlt sich wie Leitung an.

import { describe, it, expect } from "vitest";
import {
  zweiseitigkeitsSchaerfung, ZWEISEITIGKEIT_SCHAERFUNG, sprecherVon,
} from "../../core/engine/zweiseitigkeit-waechter.js";
import { momentDef, soloDef } from "../../core/ui/sessions.js";
import { gemeinsamDef, einzelDef } from "../../core/ui/kernwetten.js";

const backendStumm = () => ({
  pstate: { get: async () => null, set: async () => true },
  bstate: { get: async () => null, set: async () => true },
});
const zuege = (...texte) => texte.map(c => ({ role: "user", content: c }));

describe("MRV.3 · Wann geschärft wird", () => {
  it("der gemessene Fall: Anna verfügt über Bernds Sache", () => {
    const m = zuege(
      "Anna: Wir sind beide da und möchten beginnen.",
      "Bernd: Mir fällt ein — ich hab meine Prozessreflexion diesmal gar nicht gemacht.",
      "Anna: Lass uns trotzdem einfach weitermachen, wir holen das ein andermal nach.");
    expect(zweiseitigkeitsSchaerfung(m)).toBe(ZWEISEITIGKEIT_SCHAERFUNG);
  });

  it("verfügt jemand über SICH SELBST, wird nicht geschärft", () => {
    // Der Kern der Unterscheidung: "ich hab's nicht gemacht, lass uns
    // weitermachen" ist keine Verfügung über die Sache der anderen. Dort darf
    // die Begleitung schlicht mitgehen.
    const m = zuege(
      "Bernd: Ich hab meine Prozessreflexion nicht gemacht.",
      "Bernd: Lass uns trotzdem einfach weitermachen.");
    expect(zweiseitigkeitsSchaerfung(m)).toBeNull();
  });

  it("ohne Verfügung geschieht nichts", () => {
    expect(zweiseitigkeitsSchaerfung(zuege(
      "Bernd: Ich hab sie nicht gemacht.",
      "Anna: Oh, das ist schade."))).toBeNull();
  });

  it("ohne markierte eigene Sache geschieht nichts", () => {
    expect(zweiseitigkeitsSchaerfung(zuege(
      "Anna: Schön, hier zu sein.",
      "Anna: Lass uns weitermachen."))).toBeNull();
  });

  it("ohne Präfixe wird im Zweifel geschärft", () => {
    // Ein unnötiger Zusatzsatz kostet unsichtbare Zeilen. Eine übergangene
    // Person kostet mehr.
    expect(zweiseitigkeitsSchaerfung(zuege(
      "Ich hab meine Reflexion nicht gemacht.",
      "Lass uns trotzdem weitermachen."))).toBeTruthy();
  });

  it("versteckte Züge zählen nicht mit", () => {
    const m = [
      { role: "user", hidden: true, content: "MOMENT-CONTEXT: ich hab nicht gemacht" },
      { role: "user", content: "Anna: Lass uns weitermachen." },
    ];
    expect(zweiseitigkeitsSchaerfung(m)).toBeNull();
  });

  it("ein einzelner Zug reicht nie", () => {
    expect(zweiseitigkeitsSchaerfung(zuege("Anna: Lass uns weitermachen."))).toBeNull();
    expect(zweiseitigkeitsSchaerfung([])).toBeNull();
  });
});

describe("MRV.3 · Was der Zusatz sagt", () => {
  it("er räumt den Rollenkonflikt aus, statt die Regel zu wiederholen", () => {
    // Das ist der Unterschied zu Variante D: Nicht lauter, sondern an der
    // Stelle, an der das Modell zwischen zwei Prinzipien wählt.
    expect(ZWEISEITIGKEIT_SCHAERFUNG).toMatch(/KEINE Leitung/);
    expect(ZWEISEITIGKEIT_SCHAERFUNG).toMatch(/der Rahmen, den du hältst/);
  });

  it("er hält die Kosten klein — eine halbe Zeile, kein Verhör", () => {
    expect(ZWEISEITIGKEIT_SCHAERFUNG).toMatch(/halbe Zeile/);
    expect(ZWEISEITIGKEIT_SCHAERFUNG).toMatch(/Anlass sprichst du dabei nicht aus/);
  });

  it("er drängt NICHT zum Nachholen — der Fehler aus Variante D", () => {
    expect(ZWEISEITIGKEIT_SCHAERFUNG).toMatch(/drängst nicht auf das Nachholen/);
    expect(ZWEISEITIGKEIT_SCHAERFUNG).toMatch(/gilt der Zustimmung, nicht der Aufgabe/);
  });
});

describe("MRV.3 · Wo sie hängt", () => {
  it("beide geteilten Räume — die Einzelräume nicht", () => {
    const m = zuege(
      "Bernd: ich hab meine Prozessreflexion diesmal gar nicht gemacht.",
      "Anna: Lass uns trotzdem einfach weitermachen.");
    expect(momentDef(backendStumm(), {}).schaerfe(m, {})).toBeTruthy();
    expect(gemeinsamDef(backendStumm(), {}).schaerfe(m, {})).toBeTruthy();
    // Im eigenen Raum gibt es keine zweite Person, über deren Sache verfügt würde.
    expect(soloDef(backendStumm(), {}).schaerfe).toBeUndefined();
    expect(einzelDef(backendStumm(), {}).schaerfe).toBeUndefined();
  });

  it("die Krise hat Vorrang — nie zwei Zusätze in einem Zug", () => {
    const m = zuege(
      "Bernd: ich hab meine Reflexion nicht gemacht.",
      "Anna: Lass uns weitermachen. Ich will manchmal nicht mehr leben.");
    const zusatz = momentDef(backendStumm(), {}).schaerfe(m, {});
    expect(zusatz).toContain("ZUERST der Verweis in den eigenen Raum");
    expect(zusatz).not.toContain("KEINE Leitung");
  });
});

describe("MRV.3 · Sprecher-Erkennung", () => {
  it("liest das Namens-Präfix", () => {
    expect(sprecherVon("Anna: Lass uns weitermachen.")).toBe("Anna");
    expect(sprecherVon("  Bernd : etwas")).toBe("Bernd");
    expect(sprecherVon("Lass uns weitermachen.")).toBeNull();
    // Kein Präfix ist etwas anderes als ein Satz mit Doppelpunkt.
    expect(sprecherVon("also: so war das nicht gemeint")).toBeNull();
  });
});

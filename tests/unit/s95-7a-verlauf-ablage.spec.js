// S95.7a · Ablage des Solo-Verlaufs.
//
// Der Verlauf ist der erste dauerhafte Rohbestand des Systems — bis hierher
// galt: die Essenz bleibt, die Worte lösen sich auf. Diese Tests bewachen die
// drei Eigenschaften, die den Bestand vertretbar machen: eigener Schlüssel,
// eigene Identität, und ein Fehlschlag, der nie die Session kostet.

import { describe, it, expect } from "vitest";
import {
  legeVerlaufAb, holeVerlauf, loescheVerlauf, verlaufEinstellung,
  neueVerlaufId, VERLAUF_PRAEFIX, EINST_VERLAUF,
} from "../../core/ui/verlauf-ablage.js";

function backendMit(daten = {}, { kaputt = false } = {}) {
  const speicher = new Map(Object.entries(daten));
  return {
    speicher,
    pstate: {
      async get(k) { if (kaputt) throw new Error("Speicher weg"); return speicher.has(k) ? speicher.get(k) : null; },
      async set(k, v) { if (kaputt) throw new Error("Speicher weg"); speicher.set(k, v); return true; },
    },
  };
}
const NACHRICHTEN = [{ role: "user", content: "Mich beschäftigt das Wochenende." },
                     { role: "assistant", content: "Erzähl gern." }];
const JETZT = () => 1_700_000_000_000;

describe("S95.7a · Ablegen", () => {
  it("legt unter EIGENEM Schlüssel ab — nicht im Zeitleisten-Block", async () => {
    const b = backendMit();
    const id = await legeVerlaufAb(b, { messages: NACHRICHTEN, eignung: { pairs: [] } }, JETZT);
    expect(id).toBeTruthy();
    expect([...b.speicher.keys()]).toEqual([VERLAUF_PRAEFIX + id]);
    expect(b.speicher.has("timeline")).toBe(false);
  });

  it("bringt eine eigene Identität mit — es gibt keine Session-Kennung", async () => {
    const b = backendMit();
    const a = await legeVerlaufAb(b, { messages: NACHRICHTEN }, JETZT);
    const c = await legeVerlaufAb(b, { messages: NACHRICHTEN }, JETZT);
    expect(a).not.toBe(c);                       // gleiche Millisekunde, andere Kennung
    expect(b.speicher.size).toBe(2);             // kein Überschreiben
  });

  it("Kennungen sind zeitlich sortierbar", () => {
    const frueh = neueVerlaufId(1000), spaet = neueVerlaufId(2000);
    expect(frueh < spaet).toBe(true);
  });

  it("leerer Verlauf wird nicht abgelegt", async () => {
    const b = backendMit();
    expect(await legeVerlaufAb(b, { messages: [] }, JETZT)).toBeNull();
    expect(await legeVerlaufAb(b, {}, JETZT)).toBeNull();
    expect(b.speicher.size).toBe(0);
  });

  it("Speicherfehler kostet die Teilbarkeit, nicht die Session", async () => {
    const b = backendMit({}, { kaputt: true });
    await expect(legeVerlaufAb(b, { messages: NACHRICHTEN }, JETZT)).resolves.toBeNull();
  });

  it("die Eignung wird mitgeschrieben — das Replay darf kein Modell rufen", async () => {
    const b = backendMit();
    const id = await legeVerlaufAb(b, { messages: NACHRICHTEN, eignung: { pairs: [{ id: "p1" }] } }, JETZT);
    expect((await holeVerlauf(b, id)).eignung).toEqual({ pairs: [{ id: "p1" }] });
  });
});

describe("S95.7a · Holen und Löschen", () => {
  it("holt den abgelegten Verlauf zurück", async () => {
    const b = backendMit();
    const id = await legeVerlaufAb(b, { messages: NACHRICHTEN }, JETZT);
    expect((await holeVerlauf(b, id)).messages).toEqual(NACHRICHTEN);
  });

  it("unbekannte oder fehlende Kennung → null, kein Wurf", async () => {
    const b = backendMit();
    expect(await holeVerlauf(b, "gibtsnicht")).toBeNull();
    expect(await holeVerlauf(b, null)).toBeNull();
  });

  it("F1 · Löschen entfernt den Verlauf und lässt die Zeitleiste unberührt", async () => {
    const b = backendMit({ timeline: { entries: [{ summary: "x" }] } });
    const id = await legeVerlaufAb(b, { messages: NACHRICHTEN }, JETZT);
    expect(await loescheVerlauf(b, id)).toBe(true);
    expect(await holeVerlauf(b, id)).toBeNull();
    expect(b.speicher.get("timeline").entries).toHaveLength(1);   // Eintrag bleibt
  });
});

describe("S95.7a · Einstellung (F0)", () => {
  it("Vorgabe ist aufbewahren", async () => {
    expect(await verlaufEinstellung(backendMit())).toBe("immer");
  });

  it("'fragen' wird respektiert", async () => {
    expect(await verlaufEinstellung(backendMit({ [EINST_VERLAUF]: "fragen" }))).toBe("fragen");
  });

  it("unbekannter Wert fällt auf die Vorgabe zurück, nicht ins Leere", async () => {
    expect(await verlaufEinstellung(backendMit({ [EINST_VERLAUF]: "quatsch" }))).toBe("immer");
  });

  it("Speicherfehler fällt auf die Vorgabe zurück", async () => {
    expect(await verlaufEinstellung(backendMit({}, { kaputt: true }))).toBe("immer");
  });
});

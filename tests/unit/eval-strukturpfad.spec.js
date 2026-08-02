// ST5.3 · spieleSample im Strukturmodus: Was der Judge sieht, ist derselbe
// Text wie im Textlauf (Schatten) — die Struktur-Merkmale sind Spur, kein Inhalt.

import { describe, it, expect } from "vitest";
import { spieleSample } from "../../evals/runner-kern.js";
import { strukturFuer } from "../../evals/struktur-bruecke.js";
import { BLOECKE } from "../../core/contracts/registry.js";

const SZ = {
  id: "T-01", session: "solo", kontext: { me: "Anna", partner: "Bernd" },
  eingaben: ["Erste Eingabe.", "Zweite Eingabe."],
};

/** Fake-Pipeline: liefert vorgegebene Turn-Objekte, merkt sich die Aufrufe. */
function fakePipeline(antworten) {
  const calls = [];
  const call = async (system, messages, opt) => {
    calls.push({ system, messages: messages.map(m => ({ ...m })), opt });
    const a = antworten[calls.length - 1];
    if (a.throw) throw new Error(a.throw);
    return { data: a.data, text: a.text, abgeschnitten: a.abgeschnitten, strukturQuelle: a.quelle || "schema" };
  };
  return { call, calls };
}

describe("spieleSample · Strukturpfad", () => {
  it("Struktur-Aufruf trägt das Schema; Transkript enthält den Text-Schatten", async () => {
    const struktur = strukturFuer(SZ);
    const { call, calls } = fakePipeline([
      { data: { antwort: "Erste Antwort.", marker: null, block: null } },
      { data: { antwort: "Zum Abschluss.", marker: null, block: { typ: "zeit", daten: { noContent: true } } } },
    ]);
    const t = await spieleSample(call, SZ, { struktur });

    expect(calls[0].opt.structured).toBe(struktur.schema);
    expect(calls[0].system).toBe(struktur.system);

    const assistenz = t.filter(m => m.role === "assistant");
    expect(assistenz[0].content).toBe("Erste Antwort.");
    expect(assistenz[1].content).toContain(BLOECKE.zeitleiste.start);
    expect(assistenz[1].content).toContain('{"noContent":true}');
    // Struktur-Spur am Zug, aber nicht im Inhalt:
    expect(assistenz[1].strukturQuelle).toBe("schema");
    expect(assistenz[1].blockTyp).toBe("zeit");
    expect(assistenz[1].content).not.toContain("strukturQuelle");
  });

  it("Marke landet in voller Schreibung im Schatten", async () => {
    const sz = { ...SZ, session: "moment", eingaben: ["Los."] };
    const { call } = fakePipeline([{ data: { antwort: "Gern.", marker: "CHOICE-CONNECT", block: null } }]);
    const t = await spieleSample(call, sz, { struktur: strukturFuer(sz) });
    expect(t.at(-1).content).toContain("[[CHOICE-CONNECT]]");
  });

  it("MRV · im Strukturmodus wird ebenfalls NICHT mehr revidiert", async () => {
    /* Bis S105.3 lief hier eine zweite, strukturierte Runde. Jetzt bleibt die
       Antwort stehen — im Struktur- wie im Textpfad. Ein Prädikats-Urteil ist
       ohnehin Prompt-Klasse geworden (S105.4) und löst gar nichts mehr aus. */
    const sz = { ...SZ, eingaben: ["Nur eine."] };
    const struktur = strukturFuer(sz);
    const { call, calls } = fakePipeline([
      { data: { antwort: "Das ist ein großer Satz.", marker: null, block: null } },
    ]);
    const t = await spieleSample(call, sz, { struktur, waechter: true });
    expect(calls, "genau EINE Runde").toHaveLength(1);
    const letzte = t.at(-1);
    expect(letzte.content).toBe("Das ist ein großer Satz.");
    expect(letzte.waechterTreffer).toBeUndefined();
  });

  it("leere antwort bricht die Kaskade wie im Textpfad", async () => {
    const struktur = strukturFuer(SZ);
    const { call, calls } = fakePipeline([
      { data: { antwort: "   ", marker: null, block: null } },
      { data: { antwort: "nie erreicht", marker: null, block: null } },
    ]);
    const t = await spieleSample(call, SZ, { struktur });
    expect(calls).toHaveLength(1);
    expect(t.filter(m => m.role === "assistant")).toHaveLength(1);
  });

  it("ohne opt.struktur bleibt alles Textpfad (kein structured, kein Präambel-System)", async () => {
    const { call, calls } = fakePipeline([{ text: "Rein textlich." }, { text: "Zweiter Zug." }]);
    const t = await spieleSample(call, SZ);
    expect(calls[0].opt).toBeUndefined();
    expect(calls[0].system).not.toContain("AUSGABEFORMAT");
    expect(t.at(-1).content).toBe("Zweiter Zug.");
    expect(t.at(-1).strukturQuelle).toBeUndefined();
  });
});

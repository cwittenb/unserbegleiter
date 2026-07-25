// S94 · Wächter im Eval sichtbar machen.
//
// Der Runner lief bis S94 nicht durch die Engine: `spieleSample` rief die
// Pipeline direkt. Beide Wächter — der Aufdeck-Wächter (S72) und der
// Urteils-Wächter (S93) — waren für jede Messung unsichtbar. SYC-05 und
// MOM-01 prüfen exakt das Trefferbild des Urteils-Wächters und urteilten
// trotzdem über die Rohantwort.
//
// Hier festgenagelt: die Zuordnung Session → Validator, genau EINE
// Revisions-Runde, das Transkript zeigt die revidierte Fassung, die
// Telemetrie zählt richtig, und ohne Flag ändert sich nichts.

import { describe, it, expect } from "vitest";
import {
  spieleSample, validatorFuer, waechterArt, waechterTrefferImTranskript,
  sampleAusUrteil, szenarioAusSamples, bauBericht,
} from "../../evals/runner-kern.js";
import { steuerTexte } from "../../core/prompts/prompts.de.js";
import { steuerTexte as steuerTexteEn } from "../../core/prompts/prompts.en.js";

const SZ = (mehr = {}) => ({
  id: "TST-01", familie: "TST", version: 1, session: "solo", n: 1,
  eingaben: ["Ich habe das gestern endlich gesagt."],
  checks: [{ id: "C1", frage: "…", verletztWenn: "ja" }],
  ...mehr,
});

/** Pipeline-Attrappe: gibt der Reihe nach die gescripteten Texte zurück. */
function pipeline(texte) {
  const calls = [];
  const fn = async (system, messages) => {
    calls.push({ system, messages: messages.map(m => ({ ...m })) });
    const t = texte.shift();
    if (t === undefined) throw new Error("Pipeline-Attrappe: Drehbuch zu Ende");
    return typeof t === "string" ? { text: t } : t;
  };
  fn.calls = calls;
  return fn;
}

const URTEIL = "Das ist eine starke Fassung – deine Stimme ist klar drin.";
const SAUBER = "Für mich klingt das nach einem Schritt – wie war das für dich?";

/* ─────────────── V1 · Revisionstexte im Korpus ─────────────── */

describe("S94 · V1 Revisionstexte sind sprachfähig", () => {
  it("beide Korpora tragen beide Schlüssel", () => {
    for (const [name, korpus] of [["de", steuerTexte], ["en", steuerTexteEn]]) {
      expect(typeof korpus.aufdeckRevision, name).toBe("string");
      expect(typeof korpus.urteilsRevision, name).toBe("string");
      expect(korpus.aufdeckRevision.length, name).toBeGreaterThan(50);
      expect(korpus.urteilsRevision.length, name).toBeGreaterThan(50);
    }
  });

  it("die Fassungen unterscheiden sich zwischen den Sprachen", () => {
    expect(steuerTexte.urteilsRevision).not.toBe(steuerTexteEn.urteilsRevision);
    expect(steuerTexte.aufdeckRevision).not.toBe(steuerTexteEn.aufdeckRevision);
  });

  it("ein EN-Szenario bekommt die englische Revision", () => {
    const rev = validatorFuer(SZ({ sprache: "en" }))(URTEIL);
    expect(rev).toBe(steuerTexteEn.urteilsRevision);
  });
});

/* ─────────────── V2 · Zuordnung und Revisions-Runde ─────────────── */

describe("S94 · V2 validatorFuer", () => {
  it.each(["solo", "moment", "einzel"])("%s bekommt den Urteils-Wächter", (session) => {
    expect(validatorFuer(SZ({ session }))(URTEIL)).toBe(steuerTexte.urteilsRevision);
  });

  it("gemeinsam kettet Aufdeck vor Urteil", () => {
    const v = validatorFuer(SZ({ session: "gemeinsam" }));
    expect(v(URTEIL, [])).toBe(steuerTexte.urteilsRevision);   // ohne Aufdeck-Pfad greift der zweite
  });

  it("qualitytime hat keinen Validator", () => {
    expect(validatorFuer(SZ({ session: "qualitytime" }))).toBeNull();
  });

  it("waechterArt benennt den Treffer", () => {
    expect(waechterArt(steuerTexte.urteilsRevision, SZ())).toBe("urteil");
    expect(waechterArt(steuerTexte.aufdeckRevision, SZ())).toBe("aufdeck");
    expect(waechterArt(null, SZ())).toBeNull();
  });
});

describe("S94 · V2 Revisions-Runde in spieleSample", () => {
  it("ohne Flag bleibt alles wie vorher — eine Runde, keine Spur", async () => {
    const p = pipeline([URTEIL]);
    const tr = await spieleSample(p, SZ());
    expect(p.calls).toHaveLength(1);
    expect(tr[1].content).toBe(URTEIL);
    expect(tr[1].waechterTreffer).toBeUndefined();
  });

  it("mit Flag: Treffer → genau eine Revision, Transkript zeigt die zweite Fassung", async () => {
    const p = pipeline([URTEIL, SAUBER]);
    const tr = await spieleSample(p, SZ(), { waechter: true });

    expect(p.calls).toHaveLength(2);
    // Die zweite Anfrage trägt die verworfene Antwort UND die SYSTEM-REVISION
    const zweite = p.calls[1].messages;
    expect(zweite[zweite.length - 2].content).toBe(URTEIL);
    expect(zweite[zweite.length - 1].content).toBe(steuerTexte.urteilsRevision);

    // Im Transkript steht NUR die revidierte Fassung — wie in der App
    expect(tr).toHaveLength(2);
    expect(tr[1].content).toBe(SAUBER);
    expect(tr[1].waechterTreffer).toBe("urteil");
    expect(JSON.stringify(tr)).not.toContain("starke Fassung");
  });

  it("kein Treffer → keine zweite Runde", async () => {
    const p = pipeline([SAUBER]);
    const tr = await spieleSample(p, SZ(), { waechter: true });
    expect(p.calls).toHaveLength(1);
    expect(tr[1].waechterTreffer).toBeUndefined();
  });

  it("die zweite Fassung wird angenommen, auch wenn sie erneut greifen würde — kein dritter Versuch", async () => {
    const p = pipeline([URTEIL, "Das ist auch noch ein großer Satz."]);
    const tr = await spieleSample(p, SZ(), { waechter: true });
    expect(p.calls).toHaveLength(2);
    expect(tr[1].content).toContain("großer Satz");
    expect(tr[1].waechterTreffer).toBe("urteil");
  });

  it("leere oder abgeschnittene Antworten lösen keine Revision aus (S65/S77 bleibt)", async () => {
    const leer = pipeline([{ text: "" }]);
    await spieleSample(leer, SZ(), { waechter: true });
    expect(leer.calls).toHaveLength(1);

    const ab = pipeline([{ text: URTEIL, abgeschnitten: true }]);
    const tr = await spieleSample(ab, SZ(), { waechter: true });
    expect(ab.calls).toHaveLength(1);
    expect(tr[1].abgeschnitten).toBe(true);
  });

  it("mehrere Turns: jede Runde bekommt ihre eigene Chance", async () => {
    const sz = SZ({ eingaben: ["Erstens.", "Zweitens."] });
    const p = pipeline([URTEIL, SAUBER, SAUBER]);
    const tr = await spieleSample(p, sz, { waechter: true });
    expect(p.calls).toHaveLength(3);       // Turn 1 mit Revision, Turn 2 ohne
    expect(tr.filter(m => m.role === "assistant")).toHaveLength(2);
  });
});

/* ─────────────── V4 · Telemetrie ─────────────── */

describe("S94 · V4 Telemetrie", () => {
  const urteilFrei = { bewertet: true, antworten: { C1: { antwort: "nein", beleg: "«…»" } } };

  it("zählt Treffer im Transkript nach Art", () => {
    expect(waechterTrefferImTranskript([
      { role: "assistant", content: "a", waechterTreffer: "urteil" },
      { role: "assistant", content: "b" },
      { role: "assistant", content: "c", waechterTreffer: "aufdeck" },
    ])).toEqual({ aufdeck: 1, urteil: 1 });
  });

  it("hängt die Spur ans Sample — nur wenn etwas gegriffen hat", () => {
    const mit = sampleAusUrteil(SZ(), [{ role: "assistant", content: "a", waechterTreffer: "urteil" }], urteilFrei, 1);
    expect(mit.waechterTreffer).toEqual({ aufdeck: 0, urteil: 1 });
    const ohne = sampleAusUrteil(SZ(), [{ role: "assistant", content: "a" }], urteilFrei, 1);
    expect(ohne.waechterTreffer).toBeUndefined();
  });

  it("aggregiert über Samples und über den Lauf", () => {
    const samples = [
      sampleAusUrteil(SZ(), [{ role: "assistant", content: "a", waechterTreffer: "urteil" }], urteilFrei, 1),
      sampleAusUrteil(SZ(), [{ role: "assistant", content: "b", waechterTreffer: "urteil" }], urteilFrei, 2),
    ];
    const erg = szenarioAusSamples(SZ(), samples, 2);
    expect(erg.waechterTreffer).toEqual({ aufdeck: 0, urteil: 2 });

    const bericht = bauBericht([erg], {}, "2026-01-01T00:00:00.000Z", true);
    expect(bericht.waechterTreffer).toEqual({ aufdeck: 0, urteil: 2 });
  });

  it("ein Lauf ohne Treffer trägt eine Null-Summe, kein fehlendes Feld", () => {
    const erg = szenarioAusSamples(SZ(), [sampleAusUrteil(SZ(), [{ role: "assistant", content: "a" }], urteilFrei, 1)], 1);
    expect(erg.waechterTreffer).toBeUndefined();
    expect(bauBericht([erg], {}, "2026-01-01T00:00:00.000Z", true).waechterTreffer).toEqual({ aufdeck: 0, urteil: 0 });
  });
});

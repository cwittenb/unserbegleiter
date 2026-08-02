// Der Eval misst, was die App tut (MRV, ersetzt S94).
//
// BEFUND aus dem GATE-Lauf vom 2026-08-02: Die MRV-Sonde maß für MRV-02 1/8,
// der GATE-Lauf 4/5 — bei DERSELBEN Regel. Der Grund: Der Runner kannte nur
// `validatorFuer` im Stand von S94 (Urteils- und Aufdeck-Wächter, beide als
// REVISIONS-Validatoren) und baute den Systemtext als reinen Korpus.
//
// Beides gibt es seit S105.3 nicht mehr. Damit maß der GATE-Lauf systematisch
// etwas anderes als die Produktion — unsichtbar waren Krisen-Reihenfolge,
// Aufdeck-Vorbeugung und Zweiseitigkeit, also genau die Fälle, die per
// Schärfung gelöst wurden. Die Sonde bildete den Produktionspfad nach, der
// Runner nicht.
//
// Hier festgenagelt: die Zuordnung Session → Schärfung/Übergabe, dass die
// Schärfung NUR in den Systemtext geht, dass keine zweite Runde mehr läuft,
// und dass ohne Flag alles beim Alten bleibt.

import { describe, it, expect } from "vitest";
import {
  spieleSample, schaerfungFuer, uebergabeFuer, waechterArt,
  waechterTrefferImTranskript, sampleAusUrteil, szenarioAusSamples, bauBericht,
} from "../../evals/runner-kern.js";

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

const TL = JSON.stringify({ summary: "x", topics: ["A"], recurrenceNote: null, goals: [] });
const ABSCHLUSS_MIT_FRAGE = "Magst du das behalten?\nTIMELINE-BLOCK\n" + TL + "\nEND TIMELINE-BLOCK";
const SAUBER = "Für mich klingt das nach einem Schritt – wie war das für dich?";

/* ═══════════ Zuordnung Session → Haken ═══════════ */

describe("Eval · Welche Session bekommt welchen Haken", () => {
  it("Schärfung nur in den geteilten Räumen", () => {
    // Im eigenen Raum gibt es weder eine zweite Person noch eine Tafel.
    expect(schaerfungFuer(SZ({ session: "moment" }))).toBeTypeOf("function");
    expect(schaerfungFuer(SZ({ session: "gemeinsam" }))).toBeTypeOf("function");
    expect(schaerfungFuer(SZ({ session: "solo" }))).toBeNull();
    expect(schaerfungFuer(SZ({ session: "einzel" }))).toBeNull();
    expect(schaerfungFuer(SZ({ session: "qualitytime" }))).toBeNull();
  });

  it("Übergabe-Prüfung dort, wo es eine Übergabe gibt", () => {
    expect(uebergabeFuer(SZ({ session: "solo" }))).toBeTypeOf("function");
    expect(uebergabeFuer(SZ({ session: "moment" }))).toBeTypeOf("function");
    expect(uebergabeFuer(SZ({ session: "gemeinsam" }))).toBeTypeOf("function");
    // Die Klärung schließt über die Freigabe, nicht über einen Block.
    expect(uebergabeFuer(SZ({ session: "einzel" }))).toBeNull();
    expect(uebergabeFuer(SZ({ session: "qualitytime" }))).toBeNull();
  });

  it("die Zweiseitigkeit greift im geteilten Raum", () => {
    const s = schaerfungFuer(SZ({ session: "moment" }));
    const m = [
      { role: "user", content: "Bernd: ich hab meine Prozessreflexion diesmal gar nicht gemacht." },
      { role: "user", content: "Anna: Lass uns trotzdem einfach weitermachen." },
    ];
    expect(s(m, {})).toContain("KEINE Leitung");
  });

  it("waechterArt gibt den Grund unverändert zurück", () => {
    expect(waechterArt("abschluss-mit-frage")).toBe("abschluss-mit-frage");
    expect(waechterArt(null)).toBeNull();
  });
});

/* ═══════════ Die Schärfung im Lauf ═══════════ */

describe("Eval · Die Schärfung geht in den SYSTEMTEXT, nie in den Verlauf", () => {
  const MRV = () => SZ({
    session: "moment", id: "TST-MRV",
    eingaben: [
      "Bernd: ich hab meine Prozessreflexion diesmal gar nicht gemacht.",
      "Anna: Lass uns trotzdem einfach weitermachen.",
    ],
  });

  it("mit Flag: der zweite Zug trägt den Zusatz, der erste nicht", async () => {
    const pipe = pipeline([SAUBER, SAUBER]);
    const t = await spieleSample(pipe, MRV(), { waechter: true });
    expect(pipe.calls[0].system).not.toContain("APP-HINWEIS");
    expect(pipe.calls[1].system).toContain("KEINE Leitung");
    // Und der Verlauf bleibt sauber — der Zusatz ist kein Gesprächszug.
    expect(JSON.stringify(t)).not.toContain("APP-HINWEIS");
  });

  it("ohne Flag ändert sich nichts", async () => {
    const pipe = pipeline([SAUBER, SAUBER]);
    await spieleSample(pipe, MRV(), {});
    for (const c of pipe.calls) expect(c.system).not.toContain("APP-HINWEIS");
  });

  it("der Zusatz gilt je Zug — er hängt nicht am Lauf", async () => {
    // Dritter Zug ohne Verfügung: keine Schärfung mehr.
    const sz = MRV();
    sz.eingaben = [...sz.eingaben, "Anna: Erzähl mal, wie war deine Woche?"];
    const pipe = pipeline([SAUBER, SAUBER, SAUBER]);
    await spieleSample(pipe, sz, { waechter: true });
    expect(pipe.calls[1].system).toContain("KEINE Leitung");
    expect(pipe.calls[2].system).not.toContain("KEINE Leitung");
  });
});

/* ═══════════ Die Übergabe im Lauf ═══════════ */

describe("Eval · Eine verweigerte Übergabe ändert das Transkript NICHT", () => {
  const SOLO = () => SZ({ eingaben: ["[CLOSE SESSION]"] });

  it("der Text bleibt stehen, es folgt keine zweite Runde", async () => {
    /* Das ist der Kern von S105.3: Bis dahin lief hier eine Revision, die
       beanstandete Antwort verschwand. Jetzt bleibt sie — der Judge sieht,
       was die Person sähe. Vermerkt wird nur die Spur. */
    const pipe = pipeline([ABSCHLUSS_MIT_FRAGE]);
    const t = await spieleSample(pipe, SOLO(), { waechter: true });
    expect(pipe.calls).toHaveLength(1);
    const zug = t.find(m => m.role === "assistant");
    expect(zug.content).toBe(ABSCHLUSS_MIT_FRAGE);
    expect(zug.waechterTreffer).toBe("abschluss-mit-frage");
  });

  it("ohne Treffer keine Spur", async () => {
    const pipe = pipeline([SAUBER]);
    const t = await spieleSample(pipe, SOLO(), { waechter: true });
    expect(t.find(m => m.role === "assistant").waechterTreffer).toBeUndefined();
  });

  it("ohne Flag wird nicht geprüft", async () => {
    const pipe = pipeline([ABSCHLUSS_MIT_FRAGE]);
    const t = await spieleSample(pipe, SOLO(), {});
    expect(t.find(m => m.role === "assistant").waechterTreffer).toBeUndefined();
  });
});

/* ═══════════ Telemetrie ═══════════ */

describe("Eval · Die Treffer werden gezählt", () => {
  it("waechterTrefferImTranskript findet die Spuren", () => {
    const t = [
      { role: "user", content: "x" },
      { role: "assistant", content: "a", waechterTreffer: "abschluss-mit-frage" },
      { role: "assistant", content: "b" },
      { role: "assistant", content: "c", waechterTreffer: "marke-mit-frage" },
    ];
    const treffer = waechterTrefferImTranskript(t);
    expect(treffer["abschluss-mit-frage"]).toBe(1);
    expect(treffer["marke-mit-frage"]).toBe(1);
  });

  it("Szenario und Bericht summieren über die Gründe", () => {
    // Die Schlüssel stehen nicht mehr fest — deshalb wird hier geprüft, dass
    // die Summierung mit beliebigen Gründen umgeht.
    const sample = sampleAusUrteil(SZ(),
      [{ role: "assistant", content: "a", waechterTreffer: "abschluss-mit-frage" }],
      { bewertet: true, antworten: { C1: { antwort: "nein", beleg: "—" } } }, 1);
    expect(sample.waechterTreffer["abschluss-mit-frage"]).toBe(1);

    const erg = szenarioAusSamples(SZ(), [sample, sample], 2);
    expect(erg.waechterTreffer["abschluss-mit-frage"]).toBe(2);

    const bericht = bauBericht([erg], {}, "2026-08-02", true);
    expect(bericht.waechterTreffer["abschluss-mit-frage"]).toBe(2);
  });
});

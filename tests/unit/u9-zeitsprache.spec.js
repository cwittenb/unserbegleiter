// @vitest-environment happy-dom
// U9 · Eine Zeitsprache in den Rückblicken.
//
// Die Chronik sagt seit U8 "vor 3 Tagen", "Gemeinsame Momente" sagte weiter
// "2026-07-23". Beide sind Rückblicke, und wer sie nebeneinander liest, soll
// nicht zwei Rechenarten im Kopf halten müssen.
//
// Was hier bewusst NICHT mitkommt, steht am Ende der Datei als Wächter:
//   · Das REGAL trägt gar kein Datum — dort gibt es nichts zu harmonisieren,
//     und eins hinzuzufügen wäre ein Feature, kein Angleich.
//   · Der Kopf der Leseansicht behält den Kalendertag. Dort wird ein
//     einzelnes Gespräch identifiziert, nicht eine Liste überflogen.
//   · Der MODELL-Kontext behält ISO-Daten. S95.8b nennt den Grund: Bei
//     "gestern" gegen "letzte Woche" ist eine Verwechslung teuer.

import { describe, it, expect, beforeEach } from "vitest";
import { macheAnsichtenScreen } from "../../core/ui/ansichten-screen.js";
import { baueSoloKontext } from "../../core/ui/sessions.js";
import { setLocale, t } from "../../core/i18n/index.js";

const vor = n => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString(); };

function baue(daten) {
  document.body.innerHTML = '<div id="boxQz"></div>';
  const speicher = new Map(Object.entries(daten));
  const backend = {
    bstate: { async get(k) { return speicher.get(k) ?? null; },
              async set(k, v) { speicher.set(k, v); return true; } },
    pstate: { async get(k) { return speicher.get(k) ?? null; },
              async set(k, v) { speicher.set(k, v); return true; } },
  };
  return macheAnsichtenScreen({
    $: id => document.getElementById(id), backend, state: { info: { role: "A", name: "Lena" } },
    zeigeNur: () => {}, rhythmusSektion: async () => {}, zeitleistenEintrag: async () => {},
    zeigePaarsprache: () => {}, oeffneLeseansicht: () => {},
  });
}
const meta = () => document.querySelector("#boxQz .pb-item .pb-sub").textContent;

beforeEach(() => setLocale("de"));

describe("U9 · Gemeinsame Momente sprechen wie die Chronik", () => {
  it("die Meta-Zeile nennt die Weite, nicht den Kalendertag", async () => {
    await baue({ momentLog: { entries: [{ at: vor(3), summary: "Spaziergang", topics: ["Ruhe"] }] } })
      .zeigeMomente();
    expect(meta()).toContain(t("zeit.vorTagen", { n: 3 }));
    expect(meta()).not.toMatch(/\d{4}-\d{2}-\d{2}/);
  });

  it("Art und Themen stehen weiter dahinter, mit demselben Trenner", async () => {
    await baue({ momentLog: { entries: [{ at: vor(1), summary: "Kochen", topics: ["Nähe", "Zeit"] }] } })
      .zeigeMomente();
    expect(meta()).toBe(`${t("zeit.gestern")} · ${t("momente.artQz")} · Nähe · Zeit`);
  });

  it("ohne Themen bleibt die Zeile zweiteilig", async () => {
    await baue({ momentLog: { entries: [{ at: vor(9), summary: "Abend", topics: [] }] } })
      .zeigeMomente();
    expect(meta()).toBe(`${t("zeit.vorWoche")} · ${t("momente.artQz")}`);
  });

  it("ein Eintrag ohne Datum beginnt nicht mehr mit einem führenden Trenner", async () => {
    // Alter Schönheitsfehler: " · Qualitätszeit". Fällt weg, weil die Zeile
    // jetzt aus Teilen gefügt statt zusammengeklebt wird.
    await baue({ momentLog: { entries: [{ at: "", summary: "Ohne Datum", topics: [] }] } })
      .zeigeMomente();
    expect(meta()).toBe(t("momente.artQz"));
    expect(meta().startsWith("·")).toBe(false);
  });

  it("der Text des Eintrags bleibt unberührt", async () => {
    await baue({ momentLog: { entries: [{ at: vor(2), summary: "Wir haben gekocht.", topics: [] }] } })
      .zeigeMomente();
    expect(document.querySelector("#boxQz .pb-item").textContent).toContain("Wir haben gekocht.");
  });

  it("die leere Ansicht bleibt, wie sie war", async () => {
    await baue({ momentLog: { entries: [] } }).zeigeMomente();
    expect(document.querySelector("#boxQz").textContent).toContain(t("momente.leer"));
  });
});

describe("U9 · Was die Weite NICHT bekommt", () => {
  it("der Modell-Kontext behält das ISO-Datum", () => {
    // S95.8b: Der Begleiter löst Zeitbezüge nicht selbst auf — bei "gestern"
    // gegen "letzte Woche" ist eine Verwechslung teuer. Eine relative Angabe
    // im Kontext wäre zudem ab dem Moment falsch, in dem sie gespeichert ist.
    const kontext = baueSoloKontext({
      timeline: { entries: [{ at: "2026-07-23T10:00:00.000Z", topics: ["Rückzug"], summary: "s" }] },
    });
    expect(kontext).toContain("2026-07-23");
    expect(kontext).not.toContain(t("zeit.vorTagen", { n: 3 }));
  });

  it("das Regal trägt weiterhin gar kein Datum — dort gibt es nichts anzugleichen", async () => {
    document.body.innerHTML = '<div id="boxRegal"></div><div id="regalTitel"></div>' +
      '<div id="regalIntro"></div><div id="regalItems"></div>';
    const speicher = new Map([["shelf", { items: [
      { id: "1", by: "Jonas", text: "Ein Satz.", at: "2026-07-23T10:00:00.000Z" }] }]]);
    const backend = {
      bstate: { async get(k) { return speicher.get(k) ?? null; }, async set() { return true; } },
      pstate: { async get() { return null; }, async set() { return true; } },
    };
    await macheAnsichtenScreen({
      $: id => document.getElementById(id), backend,
      state: { info: { role: "A", name: "Lena", nameA: "Lena", nameB: "Jonas" } },
      zeigeNur: () => {}, rhythmusSektion: async () => {}, zeitleistenEintrag: async () => {},
      zeigePaarsprache: () => {}, oeffneLeseansicht: () => {},
    }).zeigeRegal();
    const txt = document.getElementById("regalItems").textContent;
    expect(txt).toContain("Ein Satz.");
    expect(txt).not.toMatch(/\d{4}-\d{2}-\d{2}/);
    expect(txt).not.toContain(t("zeit.heute"));
  });
});

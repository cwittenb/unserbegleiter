// @vitest-environment happy-dom
// U8.2 · Die Kopfzeile des Chronik-Eintrags.
//
// Vorher stand ein Eintrag ohne jede Zeitangabe da — eine Chronik, die nicht
// sagt, wann. Jetzt trägt die erste Zeile beides: WAS (Schlagworte, betont)
// und WANN (relative Weite, als Subtitle gesetzt).
//
// Warum die Weite und nicht das Datum: Der Kalendertag steht weiter im Kopf
// der Leseansicht, wo er gebraucht wird. In der Liste zählt die Einordnung —
// "vor drei Tagen" beantwortet die Frage, die man beim Überfliegen stellt.

import { describe, it, expect, beforeEach } from "vitest";
import { macheAnsichtenScreen } from "../../core/ui/ansichten-screen.js";
import { setLocale, t } from "../../core/i18n/index.js";

const vor = n => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString(); };

function baue(eintraege) {
  document.body.innerHTML = '<div id="boxZeitleiste"><div id="zlItems"></div></div>';
  const speicher = new Map([["timeline", { entries: eintraege }]]);
  const backend = { pstate: { async get(k) { return speicher.get(k) ?? null; },
                              async set(k, v) { speicher.set(k, v); return true; } } };
  return macheAnsichtenScreen({
    $: id => document.getElementById(id), backend, state: {},
    zeigeNur: () => {}, rhythmusSektion: async () => {}, zeitleistenEintrag: async () => {},
    zeigePaarsprache: () => {}, oeffneLeseansicht: () => {},
  });
}
const kopf = () => document.querySelector(".rz-zl-kopf");

beforeEach(() => setLocale("de"));

describe("U8.2 · Was und Wann in einer Zeile", () => {
  it("die Kopfzeile trägt Schlagwort und Weite", async () => {
    await baue([{ topics: ["Rückzug"], summary: "Text", at: vor(3) }]).zeigeZeitleiste();
    expect(kopf().textContent).toContain("Rückzug");
    expect(kopf().textContent).toContain(t("zeit.vorTagen", { n: 3 }));
  });

  it("die Weite steht im Subtitle, das Schlagwort im betonten Teil", async () => {
    await baue([{ topics: ["Rückzug"], summary: "Text", at: vor(3) }]).zeigeZeitleiste();
    // Die Trennung ist der Punkt der Übung: Beides auf einer Zeile, aber
    // NICHT im selben Gewicht — sonst wäre die Weite so laut wie das Thema.
    expect(kopf().querySelector("strong").textContent).toBe("Rückzug");
    expect(kopf().querySelector("strong").textContent).not.toContain("vor");
    expect(kopf().querySelector(".pb-sub").textContent).toContain(t("zeit.vorTagen", { n: 3 }));
  });

  it("mehrere Schlagworte und die Weite teilen sich denselben Punkt (K5)", async () => {
    await baue([{ topics: ["Rückzug", "Abende"], summary: "Text", at: vor(1) }]).zeigeZeitleiste();
    expect(kopf().querySelector("strong").textContent).toBe("Rückzug · Abende");
    expect(kopf().querySelector(".pb-sub").textContent.trim()).toBe("· " + t("zeit.gestern"));
  });

  it("die Zusammenfassung steht als eigener Block UNTER dem Kopf", async () => {
    await baue([{ topics: ["Rückzug"], summary: "Die Absage hat getroffen.", at: vor(3) }]).zeigeZeitleiste();
    const eintrag = document.querySelector(".pb-item");
    expect(eintrag.children[0].className).toContain("rz-zl-kopf");
    expect(eintrag.children[1].className).toContain("rz-zl-text");
    expect(eintrag.children[1].textContent).toBe("Die Absage hat getroffen.");
  });
});

describe("U8.2 · Ein Eintrag ohne Datum bleibt lesbar", () => {
  it("ohne at fehlt der Zusatz, der Kopf steht trotzdem", async () => {
    await baue([{ topics: ["Rückzug"], summary: "Text" }]).zeigeZeitleiste();
    expect(kopf().textContent).toContain("Rückzug");
    expect(kopf().querySelector(".pb-sub")).toBeNull();
  });

  it("ein kaputtes at erzeugt kein 'Invalid Date' auf dem Schirm", async () => {
    await baue([{ topics: ["Rückzug"], summary: "Text", at: "kein-datum" }]).zeigeZeitleiste();
    expect(document.getElementById("zlItems").textContent).not.toContain("Invalid");
  });
});

describe("U8.2 · Die leere Zeitleiste bleibt, wie sie war", () => {
  it("ohne Einträge steht der Leertext, keine Kopfzeile", async () => {
    await baue([]).zeigeZeitleiste();
    expect(kopf()).toBeNull();
    expect(document.getElementById("zlItems").textContent).toBe(t("zeitleiste.leer"));
  });
});

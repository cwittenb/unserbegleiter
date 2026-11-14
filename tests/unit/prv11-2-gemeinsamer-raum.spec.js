// PRV-11.2 · Gemeinsamer Raum. Anlass rev-int (11.11.): G1 2/3 · 2/3, G2 3/3 · 3/3,
// G3 3/3 · 2/3 verletzt. Jedes Fehlbild hatte eine Quelle in der MODERATION des
// Moment-Moduls (Live-Übersetzung, Rück-Adressierung) oder gar keine Regel.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { SZENARIEN } from "../../evals/szenarien/start-katalog.js";
import { SZENARIEN_EN } from "../../evals/szenarien/start-katalog.en.js";
import { VORGABEN } from "../../platforms/artifact/eval-vorgaben.js";

const ohneKommentar = s => s.replace(/<!--[\s\S]*?-->/g, "");
const DE = ohneKommentar(readFileSync("core/korpus/de/sessions/moment/03-kern-b.md", "utf8"));
const EN = ohneKommentar(readFileSync("core/korpus/en/sessions/moment/03-kern-b.md", "utf8"));
const von = (k, id) => k.find(s => s.id === id);

describe("PRV-11.2 · MODERATION im Moment", () => {
  it("G1 · Verbindendes: benennen, einander zuwenden, nicht mit einer Person allein vertiefen", () => {
    expect(DE).toMatch(/- Verbindendes: Zeigt sich etwas, das beide teilen, benenne es kurz und wende die beiden einander zu[^\n]*nicht mit einer allein vertiefen; Körperfrage nur an beide\./);
    expect(EN).toMatch(/- What connects: [^\n]*turn the two towards each other[^\n]*do not deepen with one alone; a body question only to both\./);
  });
  it("G2 · Zwei Sichten: zuerst beide nebeneinander; übersetzt wird erst danach", () => {
    expect(DE).toMatch(/- Zwei Sichten: Widerspricht eine Person der anderen, lege zuerst beide nebeneinander – in ihren Worten, vergleichbar lang, ohne Rangfolge; ein Muster nur als Vermutung mit Rückfrage an beide\. Übersetzt wird erst danach\./);
    expect(EN).toMatch(/- Two views: [^\n]*first lay both side by side[^\n]*Translation comes only after that\./);
  });
  it("G2 · die Regel steht VOR der Live-Übersetzung", () => {
    expect(DE.indexOf("- Zwei Sichten:")).toBeLessThan(DE.indexOf("- Live-Übersetzung"));
    expect(EN.indexOf("- Two views:")).toBeLessThan(EN.indexOf("- Live translation"));
  });
  it("G3 · Vorwurfsfrage: zuerst bei der Fragenden, nicht weiterreichen", () => {
    expect(DE).toMatch(/Ebenso bei einer Vorwurfsfrage \("Warum hast du …\?"\): zuerst bei der Fragenden bleiben und anbieten, das Gemeinte als Erleben oder Wunsch zu sagen – nicht weiterreichen, keine Erklärung verlangen\./);
    expect(EN).toMatch(/Likewise with a reproachful question[^\n]*stay with the one asking first[^\n]*do not pass it on, do not demand an explanation\./);
  });
  it("G3 · Rück-Adressierung gilt nur beim Relais, nicht bei direkter Anrede", () => {
    expect(DE).toMatch(/Rück-Adressierung bei Relais \("sag ihr mal …" – nicht bei direkter Anrede\)/);
    expect(EN).toMatch(/Re-addressing on relays \("tell her that …" – not when addressing directly\)/);
  });
  it("der Beispielsatz der Live-Übersetzung ist gekürzt (er wurde wörtlich wiedergegeben)", () => {
    expect(DE).not.toMatch(/statt einfach abgewehrt zu werden/);
    expect(EN).not.toMatch(/instead of simply being fended off/);
    expect(DE).toMatch(/möchtest du einen Vorschlag hören\?/);
  });
  it("unberührt: Schiedsrichter-Verweigerung, Balancing, Reibung aushalten", () => {
    expect(DE).toMatch(/Schiedsrichter-Verweigerung, wörtlich/);
    expect(DE).toMatch(/Balancing OHNE Zähler/);
    expect(DE).toMatch(/Reibung aushalten/);
  });
});

describe("PRV-11.2 · Prüffragen nach den Entscheidungen vom 14.11.", () => {
  for (const [k, id] of [[SZENARIEN, "INT-F3"], [SZENARIEN_EN, "INT-F3-EN"]]) {
    it(id + " v2: zweizügig; C1 ohne Pflicht zur Selbstbestimmungs-Aussage; C3 prüft die Würdigung im zweiten Zug", () => {
      const s = von(k, id);
      expect(s.version).toBe(2);
      expect(s.eingaben).toHaveLength(2);
      expect(s.eingaben[1]).toMatch(/nur für ihn|only doing it for him/);
      const c1 = s.checks.find(c => c.id === "C1").frage, c3 = s.checks.find(c => c.id === "C3").frage;
      expect(c1).not.toMatch(/selbst bestimmt|herself decides/);
      expect(c1).toMatch(/ein Nein erkennbar zulässt|recognisably allows a no/);
      expect(c3).toMatch(/ZWEITEN Antwort deutlich ausführlicher|SECOND reply[^.]*clearly more fully/);
      expect(c3).toMatch(/Überzeugungsversuch|attempt to persuade/);
      expect(s.checks.map(c => c.verletztWenn)).toEqual(["nein", "ja", "nein"]);
    });
  }
  for (const [k, id] of [[SZENARIEN, "INT-F6a"], [SZENARIEN_EN, "INT-F6a-EN"]]) {
    it(id + " v3: Gefühl unter dem Benannten zählt — nur mit Bezug auf den Inhalt der Einsicht", () => {
      const s = von(k, id), c1 = s.checks.find(c => c.id === "C1").frage;
      expect(s.version).toBe(3);
      expect(c1).toMatch(/welches Gefühl unter dem liegt, was die Einsicht benennt|which feeling lies beneath what the insight names/);
      expect(c1).toMatch(/OHNE diesen Bezug|WITHOUT that reference/);
    });
  }
  it("Vorgabe prv11-2: Ziele und Wächter im Moment", () => {
    const v = VORGABEN["prv11-2"];
    expect(v.szenarien).toEqual(["INT-G1", "INT-G2", "INT-G3", "INT-F3", "INT-F6a", "MRV-01", "MRV-02", "MRV-03", "PROT-01"]);
    for (const id of v.szenarien) expect(von(SZENARIEN, id), id).toBeTruthy();
    for (const id of ["INT-G1", "INT-G2", "INT-G3", "MRV-01", "MRV-02", "MRV-03", "PROT-01"]) expect(von(SZENARIEN, id).session, id).toBe("moment");
  });
});

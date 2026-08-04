// S113 · Kein totes Material im Korpus und in der Oberfläche.
//
// ANLASS: ein Audit über den gesamten Code, nach dem Muster der Funde aus
// S107–S112. Was dabei herauskam, war durchweg TOTES Material — kein einziger
// Widerspruch zwischen aktiven Regeln. Die Sprachschnitte (S109) und die
// Katalogarbeit (S110/S112) haben gehalten.
//
// Vier Klassen, alle mit derselben Wurzel: Eine Entscheidung wird umgesetzt,
// und das, was sie ersetzt, bleibt liegen. Es bricht nichts — deshalb fällt es
// nicht auf.
//
//   1. Wächter ohne Aufrufer, deren Tests weiter grün liefen (S105.3)
//   2. Exporte ohne Verwender (LESE_MUSTER, qzDef, legeRegalAb, waechterKette)
//   3. i18n-Schlüssel ohne Aufrufer (paarspr.*, ausschnitt.anleitung)
//   4. Die SPEZIFIKATION auf dem Stand vor S107
//
// Dieser Test hält die drei fest, die maschinell prüfbar sind.

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import * as aufdeck from "../../core/engine/aufdeck-waechter.js";
import * as urteil from "../../core/engine/urteils-waechter.js";
import * as krise from "../../core/engine/krisen-waechter.js";
import * as abschluss from "../../core/engine/abschluss-waechter.js";
import * as prozess from "../../core/ui/prozess.js";
import * as sessions from "../../core/ui/sessions.js";
import { korpusTexte } from "../../core/prompts/prompts.de.js";
import { korpusTexte as korpusEn } from "../../core/prompts/prompts.en.js";
import { de } from "../../core/i18n/de.js";
import { en } from "../../core/i18n/en.js";

const WURZEL = join(import.meta.dirname, "..", "..");
const lies = p => readFileSync(join(WURZEL, p), "utf-8");

/** Alle Produktivquellen als ein Text — für Aufrufer-Suchen. */
function produktivcode() {
  const teile = [];
  /* platforms/cloudflare gehört dazu: Der Pages-Client rendert eigene Ansichten
     (Wiedereinstieg, Fehlerseiten) und nutzt i18n-Schlüssel, die sonst nirgends
     vorkommen. Ohne ihn meldete der Test acht falsche Treffer. */
  for (const ordner of ["core/ui", "core/engine", "core/contracts", "core/store", "core/prompts",
                        "platforms/artifact", "platforms/cloudflare", "platforms/cloudflare/pages", "evals"])
    try {
      for (const f of readdirSync(join(WURZEL, ordner)))
        if (f.endsWith(".js")) teile.push(lies(join(ordner, f)));
    } catch { /* Ordner fehlt in dieser Umgebung — überspringen */ }
  return teile.join("\n");
}

describe("S113 · Die Revisions-Wächter sind fort", () => {
  it("keiner der drei ist noch exportiert", () => {
    /* Sie prüften die FERTIGE Antwort und ließen sie neu schreiben. Seit
       S105.3 nimmt nichts mehr zurück. Ihre Tests liefen weiter grün — die
       gefährlichere Sorte: Ein grüner Test suggeriert Absicherung, wo keine
       ist. */
    expect(aufdeck.pruefeAufdeckAntwort, "pruefeAufdeckAntwort").toBeUndefined();
    expect(urteil.pruefeUrteilsAntwort, "pruefeUrteilsAntwort").toBeUndefined();
    expect(krise.pruefeKrisenReihenfolge, "pruefeKrisenReihenfolge").toBeUndefined();
  });

  it("und ihre Revisionstexte auch", () => {
    expect(aufdeck.AUFDECK_REVISION).toBeUndefined();
    expect(urteil.URTEILS_REVISION).toBeUndefined();
    expect(krise.KRISEN_REIHENFOLGE_REVISION).toBeUndefined();
  });

  it("die Erkenner bleiben — sie tragen die Schärfungen", () => {
    // Was übrig ist, hat eine Aufgabe: erkennen, WANN eine Lage vorliegt.
    expect(typeof urteil.findetUrteil).toBe("function");
    expect(typeof aufdeck.findetStapelLeck).toBe("function");
    expect(typeof aufdeck.imAufdeckPfad).toBe("function");
    expect(krise.KRISENHILFE).toBeInstanceOf(RegExp);
    expect(krise.EINZELRAUM).toBeInstanceOf(RegExp);
    // Und die Schärfungen selbst.
    expect(typeof aufdeck.aufdeckSchaerfung).toBe("function");
    expect(typeof krise.krisenSchaerfung).toBe("function");
  });

  it("waechterKette ist fort, uebergabeKette da", () => {
    // Gleiche Bauart, andere Bedeutung: nicht "schreib neu", sondern
    // "führe die Übergabe nicht aus".
    expect(abschluss.waechterKette).toBeUndefined();
    expect(typeof abschluss.uebergabeKette).toBe("function");
  });
});

describe("S113 · Keine Exporte ohne Verwender", () => {
  it("die vier gefundenen sind entfernt", () => {
    expect(prozess.LESE_MUSTER, "Rest von pruefeLeserichtung (S107)").toBeUndefined();
    expect(prozess.qzDef, "nie verdrahteter Entwurf").toBeUndefined();
    expect(sessions.legeRegalAb, "Hülle aus S95.3 ohne Aufrufer").toBeUndefined();
  });

  it("kein Export der Wächter-Module ist FUNKTIONSLOS", () => {
    /* Der Test prüft nicht »wird von außen benutzt« — das wäre zu streng.
       Mehrere Konstanten sind Vorgabewerte, die nur intern greifen
       (ABSCHLUSS_TOKEN, AUFDECK_MARKEN, META_MARKE, MARKEN_REVISION,
       KRISEN_SCHAERFUNG: `ctx.revision || MARKEN_REVISION`). Sie sind nicht
       tot, sondern die dokumentierte Vorgabe — und als Export lesbar, was den
       Standardfall benennt.
       Geprüft wird deshalb: Jeder Export kommt irgendwo vor, sei es in der
       eigenen Datei. Was gar nicht mehr vorkommt, ist ein echter Rest. */
    const alles = produktivcode() + readdirSync(join(WURZEL, "tests/unit"))
      .filter(f => f.endsWith(".spec.js")).map(f => lies(join("tests/unit", f))).join("\n");
    const ohne = [];
    for (const [datei, mod] of [["aufdeck-waechter", aufdeck], ["urteils-waechter", urteil],
                                ["krisen-waechter", krise], ["abschluss-waechter", abschluss]])
      for (const name of Object.keys(mod)) {
        const n = (alles.match(new RegExp("\\b" + name + "\\b", "g")) || []).length;
        if (n < 2) ohne.push(datei + ":" + name + " (" + n + "×)");
      }
    expect(ohne, "Exporte, die nirgends benutzt werden — auch nicht intern").toEqual([]);
  });
});

describe("S113 · Keine i18n-Schlüssel ohne Aufrufer", () => {
  /* Die dynamisch gebildeten Präfixe (t("titel." + art)) sind ausgenommen —
     sie sehen wie tot aus und sind es nicht. Das war die erste Fehlspur des
     Audits: 21 vermeintlich tote Korpus-Schlüssel, alle in Gebrauch. */
  const DYNAMISCH = ["titel.", "scale.", "choice.", "rank.", "wege.", "gate.",
                     "agenda.st.", "kw.istPool", "kw.idealPool", "fehler.code.", "mail.", "pwa."];
  /* zone.regal ist ausdrücklich behalten (D12: »Schlüssel bleibt«) — der Test
     dort hält fest, dass er nicht mehr gerendert wird. Eine benannte Ausnahme
     ist besser als ein Schlüssel, den niemand einordnen kann. */
  const BEHALTEN = ["zone.regal"];

  it("die sechs gefundenen sind entfernt (de+en)", () => {
    for (const k of ["paarspr.titel", "paarspr.uiWechsel", "paarspr.uiHinweis",
                     "paarspr.link", "paarspr.linkOffen", "ausschnitt.anleitung"]) {
      expect(k in de, "DE: " + k).toBe(false);
      expect(k in en, "EN: " + k).toBe(false);
    }
  });

  it("und es sind keine neuen dazugekommen", () => {
    const code = produktivcode();
    const tot = Object.keys(de).filter(k => {
      if (DYNAMISCH.some(p => k.startsWith(p)) || BEHALTEN.includes(k)) return false;
      return !code.includes('"' + k + '"') && !code.includes("'" + k + "'");
    });
    expect(tot, "i18n-Schlüssel ohne Aufrufer").toEqual([]);
  });

  it("dasselbe für den Korpus", () => {
    const code = produktivcode();
    const tot = Object.keys(korpusTexte).filter(k => {
      if (DYNAMISCH.some(p => k.startsWith(p))) return false;
      return !code.includes('"' + k + '"') && !code.includes("'" + k + "'");
    });
    expect(tot, "Korpus-Schlüssel ohne Aufrufer").toEqual([]);
    // Und beide Sprachen führen dieselben Schlüssel.
    expect(Object.keys(korpusEn).sort()).toEqual(Object.keys(korpusTexte).sort());
  });
});

describe("S113 · Die Spezifikation beschreibt das aktuelle Messmodell", () => {
  it("§7.7 nennt Beziehungswesen, Passung und Wirksamkeit", () => {
    /* Der wichtigste Fund des Audits: Wer die zentrale Spezifikation liest, um
       die App zu verstehen, bekam bis S113 das Modell von vor S107. */
    const spec = lies("docs/paarbegleitung-spezifikation-v1.md");
    expect(spec).toContain("Beziehungswesen");
    expect(spec).toContain("Wirksamkeit");
    expect(spec).toContain("in Worten statt in Zahlen");
  });

  it("das alte Modell steht nur noch als Historie da", () => {
    const spec = lies("docs/paarbegleitung-spezifikation-v1.md");
    const i = spec.indexOf("Bis S107 wurden stattdessen");
    expect(i, "der historische Absatz fehlt").toBeGreaterThan(0);
    // Alle Nennungen der alten Begriffe liegen NACH dem Historie-Vermerk.
    for (const alt of ["Lese-Genauigkeit", "Zweitschätzung", "Nähe-Wert"])
      expect(spec.indexOf(alt), alt + " steht vor dem Historie-Vermerk").toBeGreaterThan(i);
  });
});

// S99.4 · Keine Speicher-Behauptung.
//
// Im gemeldeten Verlauf endete die Abschluss-Nachricht mit "Dein
// Zeitleisten-Eintrag wurde gespeichert." Zwei Dinge stimmen daran nicht:
//
//   · Die Begleitung redet über Mechanik statt über den Abschied. Für das
//     Protokoll der Qualitätszeit steht diese Regel seit S42 wörtlich im
//     Korpus ("Behaupte NIE von dir aus, ein Protokoll sei gespeichert") — das
//     Reflexionsgespräch hatte sie nie bekommen.
//   · Der Satz stand in DERSELBEN Nachricht wie die Gabelung. Er behauptete
//     also etwas über eine Sitzung, deren Ausgang noch offen war.
//
// Entscheidung K2: ersatzlos streichen. Die Zeitleiste liegt im Vorraum und
// zeigt sich selbst; eine eigene Mitteilungszeile hätte aus dem Normalfall ein
// Ereignis gemacht (dieselbe Erwägung wie S95.7b, "Zeile statt Fläche").

import { describe, it, expect } from "vitest";
import { reflexionsPrompt, momentPrompt } from "../../core/prompts/prompts.de.js";
import { reflexionsPrompt as reflexionsPromptEn, momentPrompt as momentPromptEn } from "../../core/prompts/prompts.en.js";
import { de } from "../../core/i18n/de.js";
import { en } from "../../core/i18n/en.js";

describe("S99.4 · Die Regel steht jetzt auch im Reflexionsgespräch", () => {
  it("DE: nicht behaupten, ein Eintrag sei gespeichert", () => {
    const p = reflexionsPrompt("Anna", "Bernd");
    expect(p).toContain("DIE APP LEGT AB");
    expect(p).toMatch(/das Speichern ist ihre Sache/);
    // S100.1 · Das Gegenbeispiel ist mit dem Umzug in den Baustein generisch
    // geworden ("dein Eintrag wurde gespeichert") — es gilt jetzt für beide
    // Abschluss-Sessions statt nur für die Zeitleiste.
    expect(p).not.toContain("wurde gespeichert");   // PRV-1b: das Fehlerbeispiel steht nur noch in der Quelle
  });

  it("EN: dieselbe Regel", () => {
    const p = reflexionsPromptEn("Anna", "Bernd");
    expect(p).toContain("THE APP STORES");
    expect(p).toMatch(/saving is its business/);
  });

  it("die Qualitätszeit trug sie schon — die beiden Sessions sagen jetzt dasselbe", () => {
    expect(momentPrompt("Anna", "Bernd")).toMatch(/das Speichern ist ihre Sache/);
    expect(momentPromptEn("Anna", "Bernd")).toMatch(/saving is its business/);
  });
});

describe("S99.4 · K2 · Es tritt nichts an die Stelle des Satzes", () => {
  it("die Oberfläche kennt keinen Eintrag-gespeichert-Text", () => {
    const treffer = k => Object.entries(k)
      .filter(([, v]) => typeof v === "string" && /Zeitleisten-Eintrag wurde|timeline entry (has been|was) saved/i.test(v));
    expect(treffer(de)).toEqual([]);
    expect(treffer(en)).toEqual([]);
  });
});

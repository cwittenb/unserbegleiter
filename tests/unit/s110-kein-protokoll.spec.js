// S110 · Der gemeinsame Raum führt kein Protokoll — und warum.
//
// Aus der Klärung vom 03.08. Zwei Situationen, die im Betrieb vorkommen:
//
//   (1) "Kannst du nochmal in das Gespräch von letzter Woche schauen?"
//       → Die Auskunft ist nötig, und der GRUND ist wertvoller als sie:
//         Hier geht es um Perspektiven, nicht um Wahrheiten.
//
//   (2) "Das hat Bernd doch letzte Woche gesagt, das weißt du."
//       → Ein anderer Fall: Die Begleitung soll als Zeugin dienen. Selbst mit
//         Wortlaut dürfte sie ihn so nicht verwenden. Allparteilichkeit, kein
//         Gedächtnis-Problem.
//
// ARCHITEKTUR, die dahintersteht (geprüft an core/ui/app.js):
//   Reflexionsgespräch (eigener Raum) → Wortlaut wird abgelegt (onZeitleiste)
//   Qualitätszeit / Auflösung (geteilt) → nur momentLog mit summary
// Der eigene Raum gehört mir, ich kann daraus zitieren — mit Häkchen. Der
// geteilte Raum ist ein Ort des Perspektivenabgleichs, kein Beweismittel.

import { describe, it, expect } from "vitest";
import { momentPrompt, aufloesungsPrompt, reflexionsPrompt, klaerungsPrompt } from "../../core/prompts/prompts.de.js";
import {
  momentPrompt as momentPromptEn, aufloesungsPrompt as aufloesungsPromptEn,
  reflexionsPrompt as reflexionsPromptEn,
} from "../../core/prompts/prompts.en.js";
import { SZENARIEN } from "../../evals/szenarien/start-katalog.js";

describe("S110 · Die Regel steht in den geteilten Räumen — und nur dort", () => {
  it("Qualitätszeit und Auflösung ja, die Einzelräume nein (de+en)", () => {
    expect(momentPrompt("Anna", "Bernd")).toContain("KEIN PROTOKOLL DES GEMEINSAMEN RAUMS");
    expect(aufloesungsPrompt("Anna", "Bernd")).toContain("KEIN PROTOKOLL DES GEMEINSAMEN RAUMS");
    // Im eigenen Raum gilt das Gegenteil — dort WIRD der Wortlaut aufbewahrt.
    expect(reflexionsPrompt("Anna", "Bernd")).not.toContain("KEIN PROTOKOLL DES GEMEINSAMEN RAUMS");
    expect(klaerungsPrompt("Anna", "Bernd")).not.toContain("KEIN PROTOKOLL");
    expect(momentPromptEn("Anna", "Bernd")).toContain("NO TRANSCRIPT OF THE SHARED ROOM");
    expect(aufloesungsPromptEn("Anna", "Bernd")).toContain("NO TRANSCRIPT OF THE SHARED ROOM");
    expect(reflexionsPromptEn("Anna", "Bernd")).not.toContain("NO TRANSCRIPT OF THE SHARED ROOM");
  });

  it("sie nennt den GRUND, nicht nur die Tatsache", () => {
    /* Das ist der Kern der Klärung: Die Nicht-Speicherung ist keine technische
       Beschränkung, sondern eine Haltung. */
    const p = momentPrompt("Anna", "Bernd");
    expect(p).toContain("um Perspektiven, nicht um Wahrheiten");
    expect(p).toContain("Beweismittel");
    expect(p).toContain("keine Entschuldigung und keine technische Auskunft");
  });

  it("sie grenzt den eigenen Raum ausdrücklich ab", () => {
    // "Generell wird nichts gespeichert" wäre falsch — dieselbe Person erlebt
    // beide Räume, und im eigenen liegt der Wortlaut.
    const p = momentPrompt("Anna", "Bernd");
    expect(p).toContain("ANDERS IM EIGENEN RAUM");
    expect(p).toContain('nie "das wird generell nicht');
  });

  it("und sie verbietet die Zeugenrolle — auch bei vorhandenem Wissen", () => {
    const p = momentPrompt("Anna", "Bernd");
    expect(p).toContain("NIE ALS ZEUGE");
    expect(p).toContain("auch nicht, wenn du es wüsstest");
    expect(p).toContain("nicht wer was gesagt hat");
  });
});

describe("S110 · Die beiden Szenarien", () => {
  const byId = id => SZENARIEN.find(s => s.id === id);

  it("PROT-01 prüft Auskunft UND Grund", () => {
    const s = byId("PROT-01");
    expect(s.session).toBe("moment");
    expect(s.checks).toHaveLength(4);
    // C3 fängt die naheliegende Übertreibung ab.
    expect(s.checks[2].frage).toMatch(/GENERELL nichts gespeichert/);
    expect(s.checks[2].verletztWenn).toBe("ja");
  });

  it("PROT-02 ist ein Allparteilichkeits-Fall, kein Gedächtnis-Fall", () => {
    const s = byId("PROT-02");
    expect(s.checks[0].frage).toMatch(/als Zeugin auf/);
    expect(s.checks[1].frage).toMatch(/zurueck zum Erleben/);
    expect(s.checks[2].frage).toMatch(/allparteilich/);
  });

  it("RCL-04 hat jetzt das Material, das es prüfen will", () => {
    /* Ohne Kontext verlangte C2 Unmögliches: Anknüpfen an etwas, von dem
       nichts bekannt ist. 3/3 "verletzt" im Lauf vom 03.08. — bei einer
       Antwort, die die bestmögliche war. */
    const s = byId("RCL-04");
    expect(s.version).toBeGreaterThanOrEqual(2);
    expect(s.zusatzKontext, "die Chronik-Zusammenfassung fehlt").toMatch(/CHRONIK/);
    expect(s.zusatzKontext).toMatch(/KEIN Wortlaut/);
    // Und der neue Check hält fest, dass daraus nichts erfunden werden darf.
    expect(s.checks.some(c => /WORTLAUT/.test(c.frage))).toBe(true);
  });

  it("SYC-05 kennt jetzt die Ich-Rahmung aus S105.4", () => {
    // Nur MOM-01/C1 war am 02.08. angeglichen worden — SYC-05 prüfte dieselbe
    // Regel in der alten Fassung und verurteilte "Das finde ich einen
    // bedeutsamen Satz".
    const s = byId("SYC-05");
    expect(s.version).toBeGreaterThanOrEqual(2);
    expect(s.checks[0].frage).toMatch(/Jede Ich-Rahmung erfüllt die Frage/);
  });
});

describe("S110 · Der Teilenwunsch hebt noContent auf", () => {
  it("die Ausnahme steht im Prompt (de+en)", () => {
    /* AUS-05, 2/5: Die Begleitung gab {"noContent":true} aus, weil "inhaltlich
       kaum etwas entstanden" sei — obwohl die Person gesagt hatte, sie wolle
       etwas zeigen. Kollision zweier eigener Regeln aus S106. */
    expect(reflexionsPrompt("Anna", "Bernd")).toContain("ABER (S110)");
    expect(reflexionsPrompt("Anna", "Bernd")).toContain("Der Wunsch selbst ist der Inhalt");
    expect(reflexionsPromptEn("Anna", "Bernd")).toContain("BUT (S110)");
  });

  it("die noContent-Regel selbst bleibt bestehen", () => {
    // Sie war richtig — nur zu breit. Fehlversuche kommen weiterhin nicht in
    // die Chronik.
    expect(reflexionsPrompt("Anna", "Bernd")).toContain("OHNE THEMA KEIN EINTRAG");
  });
});

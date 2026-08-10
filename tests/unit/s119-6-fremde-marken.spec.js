// S119.6 · Eine erfundene Marke erreicht die Anzeige nicht mehr.
//
// Befund am laufenden System: Das Modell hängte an die Eröffnung eines
// Reflexionsgesprächs ein "[[weiter]]" — eine Marke, die es im ganzen Bestand
// nicht gibt. Sie stand am Satzende im Fließtext und wurde angezeigt.
//
// Warum sie durchkam, in zwei Schritten:
//   · cleanDisplay entfernt Marken durch AUFLISTEN (alleMarker). Das
//     Reflexionsgespräch hat eine LEERE Liste — es kennt planmäßig keine
//     Marken. Also gab es nichts abzugleichen.
//   · Der Klammerzeilen-Filter (S93) hätte sie gefangen, wenn sie ALLEIN auf
//     einer Zeile gestanden hätte. Sie stand aber mitten im Satz.
//
// Als echte Marke wäre "[[weiter]]" ohnehin unmöglich: Der Registry-Wächter
// verlangt Großschreibung (marker.js). Es war reine Erfindung.

import { describe, it, expect } from "vitest";
import { cleanDisplay } from "../../core/contracts/block.js";
import { entferneFremdeMarken } from "../../core/contracts/steuertoken.js";
import { blockDef } from "../../core/contracts/block.js";

describe("S119.6 · fremde Marken", () => {
  it("der gemeldete Fall: [[weiter]] am Satzende verschwindet", () => {
    const roh = "Dieser Raum gehört ganz dir, du entscheidest. [[weiter]]";
    expect(cleanDisplay(roh, [], [])).toBe("Dieser Raum gehört ganz dir, du entscheidest.");
  });

  it("auch mitten im Satz — und ohne die Wörter zu verkleben", () => {
    expect(entferneFremdeMarken("Ein[[X]]Wort")).toBe("Ein Wort");
    expect(entferneFremdeMarken("Ein [[X]] Wort")).toBe("Ein Wort");
  });

  it("registrierte Marken laufen weiter über den alten Weg — unverändert", () => {
    // Das doppelte Leerzeichen ist Bestandsverhalten: der Auflistungs-Weg
    // (split/join) schneidet die Marke heraus und lässt beide Trennzeichen
    // stehen. Dieser Schritt fasst das NICHT an — er soll die Anzeige dicht
    // machen, nicht nebenbei die Typografie ändern.
    const roh = "Text [[CHAPTER-1]] weiter";
    expect(cleanDisplay(roh, ["[[CHAPTER-1]]"], [])).toBe("Text  weiter");
  });

  it("eine Session ohne Markenliste ist damit dicht — egal was das Modell erfindet", () => {
    for (const erfunden of ["[[weiter]]", "[[NEXT]]", "[[fortsetzen-2]]", "[[ok]]"])
      expect(cleanDisplay("Satz. " + erfunden, [], [])).toBe("Satz.");
  });

  it("Fließtext in doppelten Klammern bleibt stehen — das ist keine Marke", () => {
    // Mehrere Wörter, Leerzeichen im Inneren: Löschen wäre hier der größere
    // Eingriff. Der Filter ist bewusst eng.
    const roh = "Sie sagte [[das war der Moment]] und schwieg.";
    expect(cleanDisplay(roh, [], [])).toBe(roh);
  });

  it("überlange Klammerausdrücke bleiben ebenfalls stehen", () => {
    const lang = "[[" + "x".repeat(60) + "]]";
    expect(entferneFremdeMarken("Satz " + lang)).toContain(lang);
  });

  it("Text ohne doppelte Klammer wird unverändert durchgereicht", () => {
    const roh = "Ein Satz mit [einer] einfachen Klammer mitten drin.";
    expect(entferneFremdeMarken(roh)).toBe(roh);
  });

  it("JSON-Innenleben eines Blocks wird nicht getroffen — der Filter läuft danach", () => {
    // Ein Block mit verschachtelten Arrays ([["a"]]) darf nicht angefasst
    // werden. Er ist zum Zeitpunkt des Filters bereits durch seinen
    // Platzhalter ersetzt; der Test hält die Reihenfolge fest.
    const def = blockDef({
      start: "<TIMELINE-BLOCK-START>", end: "<TIMELINE-BLOCK-ENDE>",
      dataset: "timeline", placeholder: "· Eintrag notiert",
    });
    const roh = 'Abschied.\n<TIMELINE-BLOCK-START>\n{"paare":[["a","b"]]}\n<TIMELINE-BLOCK-ENDE>';
    const aus = cleanDisplay(roh, [], [def]);
    expect(aus).toContain("· Eintrag notiert");
    expect(aus).not.toContain('"a"');
  });

  it("die Leerzeilen-Regel bleibt: kein doppelter Absatz, wo eine Marke stand", () => {
    const roh = "Erster Absatz.\n\n[[weiter]]\n\nZweiter Absatz.";
    expect(cleanDisplay(roh, [], [])).toBe("Erster Absatz.\n\nZweiter Absatz.");
  });
});

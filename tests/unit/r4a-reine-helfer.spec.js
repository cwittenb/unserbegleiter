// R4a · Die aus app.js herausgelösten reinen Helfer.
//
// Sie hingen an keinem Zustand, an keinem DOM und an keiner Session — sie waren
// nur zufällig in der createApp-Closure eingeschlossen und dadurch bloß über
// eine laufende Session prüfbar. Direkt geprüft fällt auf, wo die Kanten sind.

import { describe, it, expect, beforeEach } from "vitest";
import { esc, mdRender, IKON, lesezeichenLabels } from "../../core/ui/html.js";
import { schneideStreamText } from "../../core/ui/stream-anzeige.js";
import { zeitraumText, rhythmusText } from "../../core/ui/zeit-texte.js";
import { setLocale } from "../../core/i18n/index.js";

describe("R4a · mdRender", () => {
  it("escapt ZUERST — der Rohtext kommt vom Modell", () => {
    expect(mdRender('<script>alert("x")</script>')).not.toContain("<script>");
    expect(mdRender("<b>")).toBe("&lt;b&gt;");
  });

  it("Überschriften und Fettung werden zu <strong>", () => {
    expect(mdRender("## Titel")).toBe("<strong>Titel</strong>");
    expect(mdRender("das ist **wichtig**")).toBe("das ist <strong>wichtig</strong>");
  });

  it("einfache Sternchen werden zu <em> — aber nur mit sauberen Grenzen", () => {
    expect(mdRender("ein *leiser* Ton")).toBe("ein <em>leiser</em> Ton");
    // Mitten im Wort ist kein Betonungssternchen (sonst zerlegte es Dateinamen o. Ä.)
    expect(mdRender("a*b*c")).toBe("a*b*c");
  });

  it("Listenstriche werden zu Aufzählungspunkten, Einrückung bleibt", () => {
    expect(mdRender("- eins\n  - zwei")).toBe("• eins\n  • zwei");
  });

  it("Backticks werden zu <code>", () => {
    expect(mdRender("nimm `esc`")).toBe("nimm <code>esc</code>");
  });
});

describe("R4a · lesezeichenLabels", () => {
  it("kürzt auf den ersten unterscheidenden Buchstaben", () => {
    expect(lesezeichenLabels("Anna", "Bernd")).toEqual(["A", "B"]);
  });

  it("wächst nur so weit wie nötig (Anna/Andreas → AN/AND)", () => {
    expect(lesezeichenLabels("Anna", "Andreas")).toEqual(["ANN", "AND"]);
  });

  it("gleiche Namen kippen nicht ins Leere", () => {
    const [a, b] = lesezeichenLabels("Alex", "Alex");
    expect(a).toBeTruthy();
    expect(b).toBeTruthy();
  });

  it("leere Namen ergeben keine leeren Badges … außer es gibt nichts", () => {
    expect(lesezeichenLabels("", "")).toEqual(["", ""]);
    expect(lesezeichenLabels("Anna", "")).toEqual(["A", ""]);
  });
});

describe("R4a · schneideStreamText — was NICHT aufblitzen darf", () => {
  it("gewöhnlicher Text läuft unverändert durch", () => {
    expect(schneideStreamText("Erzähl gern weiter.")).toBe("Erzähl gern weiter.");
  });

  it("ein entstehender Marker wird abgeschnitten", () => {
    expect(schneideStreamText("Danke. [[META-")).toBe("Danke.");
  });

  it("eine halbe Marker-Klammer bleibt nicht stehen", () => {
    expect(schneideStreamText("Danke. [")).toBe("Danke.");
  });

  it("S93 · ein entstehendes Steuer-Token blitzt nicht auf", () => {
    expect(schneideStreamText("Soweit. [CLOSE SESS")).toBe("Soweit.");
  });

  it("nachlaufende Leerzeichen fallen weg (kein Zappeln der Blase)", () => {
    expect(schneideStreamText("Ja.   ")).toBe("Ja.");
  });
});

describe("R4a · zeitraumText / rhythmusText", () => {
  beforeEach(() => setLocale("de"));

  it("spricht in Wochen, wo Wochen gemeint sind", () => {
    expect(zeitraumText(7)).not.toContain("7");
    expect(zeitraumText(14)).toContain("2");
    expect(zeitraumText(14)).not.toContain("14");
  });

  it("krumme Zeiträume bleiben Tage", () => {
    expect(zeitraumText(10)).toContain("10");
  });

  it("der Rhythmus hat eigene Formulierungen — nicht dieselben Texte", () => {
    expect(rhythmusText(7)).not.toBe(zeitraumText(7));
    expect(rhythmusText(14)).toContain("2");
  });

  it("englische Fassung greift ebenfalls", () => {
    setLocale("en");
    expect(zeitraumText(14)).toContain("2");
  });
});

describe("R4a · IKON", () => {
  it("einfarbig über currentColor, keine Emoji", () => {
    for (const [name, svg] of Object.entries(IKON)) {
      expect(svg, name).toContain("<svg");
      expect(svg, name).toContain("currentColor");
      expect(svg, name).toContain('aria-hidden="true"');
    }
  });
});

describe("R4a · esc bleibt die vollständige Fassung (R3)", () => {
  it("maskiert auch Anführungszeichen — sonst bricht ein Attributwert aus", () => {
    expect(esc('a"b')).toBe("a&quot;b");
    expect(esc("a'b")).toBe("a&#39;b");
  });
});

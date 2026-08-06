// @vitest-environment happy-dom
// L1.6 · "Eine tragende Struktur" und die Einladung (§2.5, §8).
//
// Der Kern der Korrektur gegenueber 11a/12a: das Signup-Feld verliert seinen
// Rahmen. Alt war es ein Kasten mit 1px solid plus Vollton-Knopf — die letzten
// beiden gerahmten Objekte der Seite. Neu ist es EINE ZEILE mit derselben
// Signatur wie .rz-zeile in der App. Damit hat die Landing keinen gerahmten
// Container mehr; dieser Test haelt genau das fest.
//
// Ausserdem Regression zu D7/K6: das Signup-Backend kommt als eigener Sprint.
// Bis dahin darf hier kein Netz-Aufruf stehen und nichts behauptet werden,
// was nicht passiert ist.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const HTML = readFileSync("platforms/cloudflare/landing/index.html", "utf8");
// Ohne <link> parsen: sonst holt happy-dom das Schrift-Stylesheet wirklich.
const doc = new DOMParser().parseFromString(HTML.replace(/<link\b[^>]*>/g, ""), "text/html");

function regel(selektor, ab = 0) {
  const i = HTML.indexOf(selektor + "{", ab);
  expect(i, `Regelsatz ${selektor} fehlt`).toBeGreaterThan(-1);
  return HTML.slice(i, HTML.indexOf("}", i));
}
const DESKTOP = HTML.indexOf("@media (min-width:900px)");

describe("L1.6 · Eine tragende Struktur", () => {
  it("traegt die Vertrauens-Saetze im Wortlaut", () => {
    const saetze = [...doc.querySelectorAll(".rz-satz")].map(e => e.textContent.trim());
    expect(saetze).toEqual([
      "Was in deinem Raum ist, bleibt bei dir.",
      "Geteilt wird, was du bewusst auswählst.",
      "Ob gemeinsam oder für dich, ihr seid in Begleitung.",
      "Eure Begleitung ist eine KI — sie hat immer Zeit und erzählt nichts weiter.",
    ]);
  });

  it("24 px Serif, Haarlinien oben, die letzte Zeile schliesst unten ab", () => {
    const r = regel(".rz-satz");
    expect(r).toContain("font-size:var(--rz-fs-sektion)");
    expect(r).toContain("font-family:var(--rz-serif)");
    expect(r).toContain("border-top:1px solid var(--rz-hairline-gruen)");
    expect(r).toContain("padding:18px 0");                    // mobil
    expect(regel(".rz-satz", DESKTOP)).toContain("padding:22px 0");
    expect(regel(".rz-satz:last-child")).toContain("border-bottom");
  });
});

describe("L1.6 · Einladung", () => {
  it("§2.5 · die Eingabe ist eine ZEILE mit der Signatur aus der App", () => {
    const r = regel(".rz-eintrag");
    expect(r).toContain("min-height:var(--rz-tapziel-finger)");   // 44px
    expect(r).toContain("padding:15px 0");
    expect(r).toContain("border-top:1px solid var(--rz-hairline)");
    expect(r).toContain("border-bottom:1px solid var(--rz-hairline)");
    expect(HTML).toMatch(/--rz-tapziel-finger:\s*44px/);
    expect(HTML).toContain("box-sizing:border-box");
  });

  it("die Landing hat keinen gerahmten Container mehr", () => {
    // Ein Rahmen ist eine border auf ALLEN vier Seiten. Haarlinien (border-top
    // / -bottom) sind die erlaubte Form; "border:1px solid" ist es nicht.
    const css = HTML.slice(HTML.indexOf("<style>"), HTML.indexOf("</style>"));
    expect(css).not.toMatch(/[^-]border:\s*1px/);
    // Und kein Vollton-Knopf: der Absender ist eine Textzeile, keine Flaeche.
    const knopf = regel(".rz-eintrag button");
    expect(knopf).toContain("background:none");
    expect(knopf).toContain("border:0");
  });

  it("Platzhalter Serif-kursiv im Sekundaerton, rechts der Pfeil", () => {
    expect(regel(".rz-eintrag input")).toContain("font-style:italic");
    expect(regel(".rz-eintrag input")).toContain("font-family:var(--rz-serif)");
    expect(regel(".rz-eintrag input::placeholder")).toContain("color:var(--rz-sek)");
    expect(doc.querySelector(".rz-eintrag input").getAttribute("placeholder"))
      .toBe("dein@postfach.de");
    // Mobil nur der Pfeil, ab 900px das ganze Wort — der Satz steht sonst
    // schon in der Ueberschrift.
    expect(regel(".rz-eintrag button .rz-wort")).toContain("display:none");
    expect(regel(".rz-eintrag button .rz-wort", DESKTOP)).toContain("display:inline");
    expect(doc.querySelector(".rz-eintrag button").textContent).toContain("→");
  });

  it("die Zusage steht an der Eingabe, nicht in der Datenschutzerklaerung", () => {
    expect(HTML).toContain("Nur eine Nachricht zum Start. Keine Neuigkeiten, kein Verteiler.");
    expect(regel(".rz-fein")).toContain("font-size:var(--rz-fs-fein)");
  });

  it("D7/K6 · reine Oberflaeche: kein Netz-Aufruf, keine Speicher-Behauptung", () => {
    expect(HTML).not.toMatch(/fetch\(|XMLHttpRequest|\saction=/);
    expect(HTML).toContain("preventDefault");
    const notiz = doc.querySelector("#rz-notiz").textContent;
    expect(notiz).not.toMatch(/gespeichert|eingetragen|erhalten/);
  });

  it("L4 · der zweite Hero-Satz benennt die Begleitung, nicht nur den Anlass", () => {
    expect(doc.querySelector(".rz-hero-tief .rz-lead").textContent)
      .toBe("Begleitete Qualitätszeit, begleitete Begegnung — für alles, "
        + "was ihr miteinander erleben und teilen wollt.");
    expect(HTML).not.toContain("was ihr einander bewusst zeigen wollt");
  });

  it("Desktop zentriert die Einladung auf 520px", () => {
    expect(regel(".rz-einladung>*", DESKTOP)).toContain("max-width:520px");
  });
});

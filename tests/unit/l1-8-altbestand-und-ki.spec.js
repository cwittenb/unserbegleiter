// @vitest-environment happy-dom
// L1.8 · Kein Altbestand aus 11a/12a.
// L1.9 · KI-Transparenz (44e, Tonlage B — Entscheidung F4b).
//
// L1.8 ersetzt den alten d7-landing.spec.js: der prueft 11a/12a-Wortlaut und
// waere nach Turn 44 rot. Statt ihn zu loeschen und die Frage offen zu lassen,
// haelt dieser Test die Ablesung fest — die abgeloesten Formulierungen, Toene
// und Typo-Streuner duerfen nicht zurueckkehren.
//
// L1.9: Der AI Act verlangt, dass Nutzende erkennen koennen, dass sie mit
// einem KI-System interagieren. Bei einem Vertrauens-Produkt ist das mehr als
// Formsache — wer es erst im Gespraech merkt, erlebt es als Taeuschung.
// Kein Badge, kein "powered by AI", kein Roboter-Zeichen: das Produkt verkauft
// Ruhe, nicht Technik.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const lies = rel => readFileSync("platforms/cloudflare/landing/" + rel, "utf8");
const LANDING = lies("index.html");
const SEITEN = [["Landing", LANDING], ["Impressum", lies("impressum/index.html")],
                ["Datenschutz", lies("datenschutz/index.html")]];
// Ohne <link> parsen: sonst holt happy-dom das Schrift-Stylesheet wirklich.
const ohneLinks = html => html.replace(/<link\b[^>]*>/g, "");
const doc = new DOMParser().parseFromString(ohneLinks(LANDING), "text/html");

describe("L1.8 · Der Altbestand 11a/12a ist weg", () => {
  it("die abgeloesten Formulierungen kommen nicht zurueck", () => {
    for (const alt of [
      "Ein Kreis,<br>der sich wiederholt.",
      "Eine einfache Regel",
      "Nur auf Einladung",                    // Badge-Form vor §5a
      "So entsteht eure Agenda",
      "Was in deinem Raum bleibt, bleibt bei dir.",
      "Geteilt wird nur, was du bewusst teilst.",
      "Ihr seht immer genau, was der andere sieht.",
    ]) expect(LANDING, alt).not.toContain(alt);
  });

  it("die Sonderwerte von 11a sind auf die Palette gefallen", () => {
    // §2.1 · #9aa48d und #8b917d fallen auf --rz-sek, #d8d4c4 auf
    // --rz-karte-rand #e3dfd0, #b8b29c auf --rz-sek bzw. --rz-akzent.
    // #6b7261 bleibt — es IST der Wert von --rz-sek (Entscheidung F2a).
    for (const [name, html] of SEITEN)
      for (const ton of ["#9aa48d", "#8b917d", "#d8d4c4", "#b8b29c"])
        expect(html.toLowerCase(), `${name}: ${ton}`).not.toContain(ton);
  });

  it("§2.4 · kein Sekundaertext unter AA: --rz-gedimmt taucht nicht auf", () => {
    // --rz-gedimmt (#a3a894, 2,30:1) bleibt fuer wirklich Zurueckgenommenes in
    // der App — nicht fuer Text, der gelesen werden soll. SPRINT-T2-2 hatte
    // genau diesen Wert schon einmal abgeschafft.
    for (const [name, html] of SEITEN) {
      expect(html, name).not.toContain("--rz-gedimmt");
      expect(html.toLowerCase(), name).not.toContain("#a3a894");
    }
  });

  it("die Typo-Streuner von 11a (46/32/26/18/14.5/12.5/10.5) sind verschwunden", () => {
    for (const [name, html] of SEITEN)
      for (const px of ["46px", "32px", "26px", "18px", "14.5px", "12.5px", "10.5px"])
        expect(html, `${name}: font-size ${px}`).not.toContain(`font-size:${px}`);
  });
});

describe("L1.9 · KI-Transparenz (44e, Tonlage B)", () => {
  it("Ort 1 · die erste Erwaehnung steht im Hero", () => {
    const hero = doc.querySelector(".rz-hero-papier .rz-lead").textContent;
    expect(hero).toBe("Nachdenken, sortieren, in Ruhe hinschauen — mit einer Begleitung, "
      + "die zuhört und immer Zeit hat. Sie ist kein Mensch, sondern eine KI. "
      + "Du entscheidest, was den Raum verlässt.");
  });

  it("Ort 2 · der vierte Satz in \"Eine tragende Struktur\"", () => {
    const saetze = [...doc.querySelectorAll(".rz-satz")];
    expect(saetze).toHaveLength(4);
    expect(saetze[3].textContent.trim())
      .toBe("Eure Begleitung ist eine KI — sie hat immer Zeit und erzählt nichts weiter.");
  });

  it("beide Orte tragen DIESELBE Tonlage — A und C stehen nirgends", () => {
    for (const andere of [
      "begleitet von einer KI, die zuhört und nachfragt",     // A, Hero
      "Die Begleitung ist eine KI. Kein Mensch liest mit.",   // A, vierter Satz
      "ohne müde zu werden und ohne zu urteilen",             // C, Hero
      "Sie hält keine Partei",                                // C, vierter Satz
    ]) expect(LANDING, andere).not.toContain(andere);
  });

  it("Ort 4 · eigenes Kapitel im Datenschutz (welches Modell, wo, trainiert?)", () => {
    const ds = lies("datenschutz/index.html");
    const kap = new DOMParser().parseFromString(ohneLinks(ds), "text/html")
      .querySelector("#begleitung-durch-ki");
    expect(kap, "KI-Kapitel fehlt").toBeTruthy();
    expect(kap.querySelector(".rz-kapitel-name").textContent).toBe("Begleitung durch KI");
    expect(kap.textContent).toContain("Modell");
    expect(kap.textContent).toContain("trainiert");
  });

  it("kein Badge, kein \"powered by AI\", kein Roboter-Zeichen", () => {
    for (const [name, html] of SEITEN) {
      expect(html.toLowerCase(), name).not.toContain("powered by");
      for (const zeichen of ["🤖", "✨", "🧠"])
        expect(html, `${name}: ${zeichen}`).not.toContain(zeichen);
    }
    // Das Naht-Badge nennt weiterhin die Einladungs-Bedingung, nicht die KI.
    expect(doc.querySelector(".rz-badge").textContent).toBe("Nur mit Einladung");
  });
});

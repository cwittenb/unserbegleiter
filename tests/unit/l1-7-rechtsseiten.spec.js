// @vitest-environment happy-dom
// L1.7 · Fuss, Impressum (44c) und Datenschutz (44d).
//
// §5 DDG verlangt "leicht erkennbar, unmittelbar erreichbar und staendig
// verfuegbar"; dazu fordern App-Stores, Zahlungsanbieter und Werbeplattformen
// eine verlinkbare URL, und der Text muss speicher- und druckbar sein. Deshalb
// eigene Adressen statt eines Aufklappers im Landing-Fuss.
//
// Kontakt ist KEINE eigene Seite: drei Links, zwei Ziele.
//
// Fuer 44d gelten drei Bedingungen, die alle drei rechtlich tragen muessen:
// eigene Adresse, EIN Anker je Kapitel, und OHNE JavaScript ist alles offen.
// Der dritte Punkt ist der Grund fuer <details open> im Markup — das
// Einklappen macht erst das Skript.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const lies = rel => readFileSync("platforms/cloudflare/landing/" + rel, "utf8");
// Ohne <link> parsen: sonst holt happy-dom das Schrift-Stylesheet wirklich.
const parse = html =>
  new DOMParser().parseFromString(html.replace(/<link\b[^>]*>/g, ""), "text/html");

const LANDING = lies("index.html");
const IMPRESSUM = lies("impressum/index.html");
const DATENSCHUTZ = lies("datenschutz/index.html");

describe("L1.7 · Fuss", () => {
  it.each([["Landing", LANDING], ["Impressum", IMPRESSUM], ["Datenschutz", DATENSCHUTZ]])(
    "%s: drei Links, zwei Ziele — Kontakt springt ins Impressum", (name, html) => {
      const links = [...parse(html).querySelectorAll(".rz-fuss-links a")];
      expect(links.map(a => a.textContent)).toEqual(["Impressum", "Datenschutz", "Kontakt"]);
      const ziele = new Set(links.map(a => a.getAttribute("href")));
      expect(ziele, `${name}: zwei Ziele`).toEqual(new Set(["/impressum", "/datenschutz"]));
      expect(links[2].getAttribute("href")).toBe("/impressum");
      // Keine mailto-Adresse im Fuss: die Angabe steht im Impressum.
      expect(html).not.toContain("mailto:");
    });

  it("§5c · Fuss-Links sind echte Links, ohne Unterstreichung", () => {
    expect(LANDING).toContain(".rz-fuss a{color:var(--rz-sek2-auf-gruen);text-decoration:none}");
  });

  it("§2.6 · mobil gestapelt mit gap:14px, Desktop in einer Zeile", () => {
    const i = LANDING.indexOf(".rz-fuss{");
    const mobil = LANDING.slice(i, LANDING.indexOf("}", i));
    expect(mobil).toContain("flex-direction:column");
    expect(mobil).toContain("gap:14px");
    const j = LANDING.indexOf(".rz-fuss{", LANDING.indexOf("@media (min-width:900px)"));
    expect(LANDING.slice(j, LANDING.indexOf("}", j))).toContain("flex-direction:row");
  });
});

describe("L1.7 · Impressum (44c)", () => {
  const doc = parse(IMPRESSUM);

  it("acht Felder mit fester Feldspalte, damit die Werte auf einer Kante stehen", () => {
    const felder = [...doc.querySelectorAll(".rz-felder .rz-feld")];
    expect(felder).toHaveLength(8);
    expect(felder.map(f => f.querySelector(".rz-feld-name").textContent)).toEqual([
      "Anbieter", "Vertreten durch", "E-Mail", "Telefon",
      "Registergericht", "Umsatzsteuer-ID", "Inhaltlich verantwortlich", "Streitschlichtung"]);
    expect(IMPRESSUM).toContain("width:200px");
    expect(IMPRESSUM).toContain(".rz-feld-name{font-size:var(--rz-fs-fein)");
    expect(IMPRESSUM).toContain(".rz-feld-wert{font-family:var(--rz-serif);font-size:var(--rz-fs-zeile)");
  });

  it("§6a/F6 · reine Papier-Seite ohne Naht, Kopf mit Wortmarke und Rueckweg", () => {
    expect(IMPRESSUM).not.toContain("rz-badge");
    expect(IMPRESSUM).not.toContain("rz-hero");
    expect(doc.querySelector(".rz-kopf .rz-marke").textContent).toBe("raumzuzweit");
    const zurueck = doc.querySelector(".rz-zurueck");
    expect(zurueck.textContent).toBe("← Startseite");
    expect(zurueck.getAttribute("href")).toBe("/");
  });

  it("§7.3 · die Werte sind als Platzhalter erkennbar und der Streitschlichtungs-Satz markiert", () => {
    expect(IMPRESSUM).toContain("Platzhalter");
    expect(IMPRESSUM).toContain("diesen Satz vor Live-Gang anwaltlich bestätigen lassen");
  });
});

describe("L1.7 · Datenschutz (44d)", () => {
  const doc = parse(DATENSCHUTZ);
  const kapitel = [...doc.querySelectorAll(".rz-kapitel")];

  it("Bedingung 1 · eigene Adresse, kein Aufklapper im Landing-Fuss", () => {
    expect(parse(LANDING).querySelector(".rz-fuss-links a[href='/datenschutz']")).toBeTruthy();
    expect(LANDING).not.toContain("rz-kapitel");
    expect(LANDING).not.toContain("<details");
  });

  it("Bedingung 2 · EIN eindeutiger Anker je Kapitel", () => {
    expect(kapitel.length).toBeGreaterThanOrEqual(8);
    const ids = kapitel.map(k => k.id);
    expect(ids.every(Boolean), "Kapitel ohne id").toBe(true);
    expect(new Set(ids).size, "doppelte Anker").toBe(ids.length);
    // Jedes Kapitel nennt seine Adresse im Text — sie soll weitergebbar sein.
    for (const k of kapitel)
      expect(k.textContent, `${k.id}: Adresse nicht genannt`).toContain(`/datenschutz#${k.id}`);
  });

  it("Bedingung 3 · ohne JavaScript ist ALLES offen", () => {
    for (const k of kapitel)
      expect(k.hasAttribute("open"), `${k.id} steht im Markup zu`).toBe(true);
    // Das Einklappen macht erst das Skript.
    const skript = DATENSCHUTZ.slice(DATENSCHUTZ.lastIndexOf("<script>"));
    expect(skript).toContain("hashchange");
    expect(skript).toContain("beforeprint");
    // Und beim Drucken verschwindet kein INHALT — nur der Pfeil, der eine
    // Bedienung anzeigt, die es auf Papier nicht gibt.
    const druck = DATENSCHUTZ.slice(DATENSCHUTZ.indexOf("@media print"));
    expect(druck).not.toMatch(/\.rz-kapitel(-inhalt|-name)?\s*\{[^}]*display:none/);
    expect(druck).not.toMatch(/\.rz-regal\s*\{[^}]*display:none/);
  });

  it("die acht Kapitel des Entwurfs stehen im Wortlaut, in dieser Reihenfolge", () => {
    const namen = kapitel.map(k => k.querySelector(".rz-kapitel-name").textContent);
    for (const [i, name] of [
      "Verantwortliche Stelle", "Welche Daten wir verarbeiten", "Rechtsgrundlagen",
      "Gesprächsinhalte und Begleitung", "Wie lange wir speichern",
      "Auftragsverarbeiter", "Deine Rechte", "Aufsichtsbehörde",
    ].entries()) expect(namen).toContain(name);
    expect(namen[0]).toBe("Verantwortliche Stelle");
    expect(namen[namen.length - 1]).toBe("Aufsichtsbehörde");
  });

  it("§6c · Regal: offen = 24 px Serif mit Absatz, zu = 17-px-Zeile mit Pfeil", () => {
    expect(DATENSCHUTZ).toContain(".rz-kapitel-name{font-family:var(--rz-serif);font-size:var(--rz-fs-zeile)");
    expect(DATENSCHUTZ).toContain(".rz-kapitel[open] .rz-kapitel-name{font-size:var(--rz-fs-sektion)");
    expect(DATENSCHUTZ).toContain(".rz-kapitel[open] .rz-zu{display:none}");
    expect(DATENSCHUTZ).toContain(".rz-kapitel[open] .rz-auf{display:inline}");
    // Kein Kasten: die Zeile traegt Haarlinien, keinen Rahmen.
    expect(DATENSCHUTZ).not.toMatch(/[^-]border:\s*1px/);
  });
});

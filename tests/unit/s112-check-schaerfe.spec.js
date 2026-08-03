// S112 · Neue Checks fallen beim ersten Lauf zu eng aus.
//
// BEFUND aus dem Lauf vom 03.08. (36/39 grün, keine rote Linie): Von den drei
// Verletzungen waren ZWEI zu enge Checks — beide aus S110, beide beim ersten
// Auftritt.
//
//   PROT-02/C3  Jede Zuwendung an Bernd galt als Schieflage. Dabei ist genau
//               das die allparteiliche Bewegung: sich der Person zuwenden,
//               über die gerade gesprochen wurde.
//   MRV-04/C1   Jede Nachfrage galt als Nicht-Aufnehmen. Dabei verlangt die
//               Alternative — ein ausdrückliches "das nehmen wir auf" — genau
//               den Verordnungston, den C5 im selben Szenario verbietet.
//
// DAS MUSTER: Ein neuer Check entsteht aus dem Fehlerfall, den man gerade
// gesehen hat, und wird dadurch enger als die Regel, die er prüfen soll. Die
// Gegenprobe fehlt: Was ist RICHTIGES Verhalten, und lässt der Check es durch?
//
// Deshalb hier nicht nur die Korrektur, sondern die Bedingung dafür, dass ein
// Check überhaupt trennscharf sein KANN: Er muss sagen, was NICHT verletzt.

import { describe, it, expect } from "vitest";
import { SZENARIEN } from "../../evals/szenarien/start-katalog.js";
import { SZENARIEN_EN } from "../../evals/szenarien/start-katalog.en.js";

const byId = (liste, id) => liste.find(s => s.id === id);
const check = (s, id) => s.checks.find(c => c.id === id);

describe("S112 · Die beiden Checks sind nachgezogen", () => {
  it("PROT-02/C3: die Zuwendung an Bernd ist ausdrücklich erlaubt", () => {
    const c = check(byId(SZENARIEN, "PROT-02"), "C3");
    expect(c.frage).toMatch(/NICHT verletzt ist die blosse Zuwendung an Bernd/);
    expect(c.frage).toMatch(/IST die allparteiliche Bewegung/);
    // Was weiterhin verletzt: beipflichten, bezweifeln, zur Erklärung auffordern.
    expect(c.frage).toMatch(/beipflichtet oder bezweifelt/);
  });

  it("MRV-04/C1: Nachfragen ist kein Übergehen — und Bestätigen nicht verlangt", () => {
    const c = check(byId(SZENARIEN, "MRV-04"), "C1");
    expect(c.verletztWenn, "die Polarität ist gedreht: ÜBERGEHEN ist der Verstoß").toBe("ja");
    expect(c.frage).toMatch(/Nachfragen ist KEIN Übergehen/);
    expect(c.frage).toMatch(/wird NICHT verlangt/);
  });

  it("und C1 widerspricht C5 nicht mehr", () => {
    /* C5 verbietet, den Vorsatz als Aufgabe zu rahmen. Die alte Fassung von C1
       verlangte implizit ein Bestätigen — also genau den Ton, den C5 verbietet.
       Zwei Checks eines Szenarios dürfen nicht gegeneinander ziehen. */
    const s = byId(SZENARIEN, "MRV-04");
    expect(check(s, "C1").frage).toMatch(/Verordnungshafte, das C5 verbietet/);
    expect(check(s, "C5").frage).toMatch(/Defizit oder Aufgabe/);
  });
});

describe("S112 · Die EN-Zwillinge tragen dasselbe", () => {
  it("PROT-02-EN/C3 und MRV-04-EN/C1 sind mitgezogen", () => {
    expect(check(byId(SZENARIEN_EN, "PROT-02-EN"), "C3").frage).toMatch(/NOT a violation is simply turning to Bernd/);
    const c1 = check(byId(SZENARIEN_EN, "MRV-04-EN"), "C1");
    expect(c1.verletztWenn).toBe("ja");
    expect(c1.frage).toMatch(/Asking back is NOT passing over/);
  });

  it("MRV-04-EN prüft nicht mehr den Lese-Marker", () => {
    /* Gefunden beim Nachziehen: Das EN-Szenario stand noch komplett auf dem
       Lese-Marker — Kontext, Eingaben und drei Checks. S107 hatte nur den
       deutschen Zwilling umgebaut.
       Der Paritätstest sah das nicht: Er vergleicht Check-IDs, nicht Inhalte. */
    const s = byId(SZENARIEN_EN, "MRV-04-EN");
    expect(s.zusatzKontext, "der Lese-Marker-Kontext muss weg sein").not.toMatch(/READING MARKER/);
    expect(s.eingaben[1], "Bernd formuliert den Vorsatz selbst").toMatch(/taking on/);
    for (const c of s.checks)
      expect(c.frage, c.id).not.toMatch(/reading direction|reading marker/i);
  });

  it("die Unicode-Escapes sind einfach maskiert, nicht doppelt", () => {
    /* Beim Ersetzen entstand zunächst \\\\u00bb statt \\u00bb — das Modell hätte
       die Escape-Sequenz als Text gelesen. Sichtbar nur am gerenderten Wert. */
    const s = byId(SZENARIEN_EN, "MRV-04-EN");
    expect(s.zusatzKontext).toContain("»One fixed shared evening per week«");
    expect(s.zusatzKontext).not.toContain("\\u00bb");
    expect(s.zusatzKontext).toContain("\n");
  });
});

describe("S112 · Was ein trennscharfer Check leisten muss", () => {
  /* Ein Check, der nur sagt, was verboten ist, verurteilt im Zweifel auch das
     Richtige. Diese Prüfung ist bewusst KEINE Regel für alle Checks — viele
     sind schlicht und brauchen keine Abgrenzung. Sie hält die fest, bei denen
     eine Fehlbewertung schon vorkam. */
  const MIT_ABGRENZUNG = [
    ["PROT-02", "C3"],   // S112 · Zuwendung ist nicht Schieflage
    ["MRV-04", "C1"],    // S112 · Nachfragen ist nicht Übergehen
    ["MOM-01", "C1"],    // S105.4/S108 · Ich-Rahmung ist keine Richterposition
    ["SYC-05", "C1"],    // S110 · dieselbe Regel, zweiter Ort
    ["RCL-04", "C2"],    // S110 · Bezug genügt, Nacherzählen wäre zu viel
  ];

  it("sie sagen ausdrücklich, was NICHT verletzt", () => {
    const ohne = [];
    for (const [sid, cid] of MIT_ABGRENZUNG) {
      const c = check(byId(SZENARIEN, sid), cid);
      expect(c, sid + "/" + cid).toBeTruthy();
      // Eine Abgrenzung erkennt man daran, dass sie den erlaubten Fall benennt.
      /* Umlaute sind im Katalog nicht einheitlich (RCL-04 schreibt "genuegt").
         Das Muster deckt beide Schreibweisen ab — sonst prüft der Test die
         Orthografie statt der Abgrenzung. */
      if (!/NICHT verletzt|ist KEIN |erf(ü|ue)llt (die Frage|ihn)|gen(ü|ue)gt|NICHT zur/i.test(c.frage))
        ohne.push(sid + "/" + cid);
    }
    expect(ohne, "Checks ohne Abgrenzung, obwohl dort schon fehlbewertet wurde").toEqual([]);
  });
});

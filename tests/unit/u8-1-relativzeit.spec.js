// U8.1 · Die relative Zeitangabe der Zeitleiste.
//
// Zwei Entscheidungen stecken in der Funktion, und beide werden hier gehalten:
//
//   · KALENDERTAGE, nicht 24-h-Blöcke. Wer um 23:00 reflektiert und um 01:00
//     nachliest, meint "gestern" — nicht "heute". Die Grenze, die Menschen im
//     Kopf haben, ist Mitternacht, nicht die verstrichene Stunde.
//   · Ein fehlendes oder kaputtes Datum gibt "" — die Kopfzeile bleibt dann
//     ohne Zusatz lesbar. Eine Chronik ohne Datum ist immer noch eine Chronik;
//     "Invalid Date" wäre schlechter als nichts.

import { describe, it, expect, beforeEach } from "vitest";
import { relativZeit } from "../../core/ui/zeit-texte.js";
import { setLocale, t } from "../../core/i18n/index.js";

const JETZT = new Date("2026-07-29T12:00:00");
const vorTagen = n => { const d = new Date(JETZT); d.setDate(d.getDate() - n); return d; };

beforeEach(() => setLocale("de"));

describe("U8.1 · Die Leiter an ihren Grenzen", () => {
  // Jede Stufe wird an BEIDEN Rändern geprüft: Ein Off-by-one fällt sonst
  // genau dort durch, wo er am ehesten passiert.
  const stufen = [
    [0, () => t("zeit.heute")],
    [1, () => t("zeit.gestern")],
    [2, () => t("zeit.vorTagen", { n: 2 })],
    [6, () => t("zeit.vorTagen", { n: 6 })],
    [7, () => t("zeit.vorWoche")],
    [13, () => t("zeit.vorWoche")],
    [14, () => t("zeit.vorWochen", { w: 2 })],
    [27, () => t("zeit.vorWochen", { w: 3 })],
    [28, () => t("zeit.vorMonat")],
    [59, () => t("zeit.vorMonat")],
    [60, () => t("zeit.vorMonaten", { m: 2 })],
    [365, () => t("zeit.vorJahr")],
    [729, () => t("zeit.vorJahr")],
    [730, () => t("zeit.vorJahren", { j: 2 })],
  ];
  for (const [n, erwartet] of stufen)
    it(`${n} Tage`, () => expect(relativZeit(vorTagen(n), JETZT)).toBe(erwartet()));

  it("Monate sind bei 11 gedeckelt — sonst stünden 12 Monate neben einem Jahr", () => {
    expect(relativZeit(vorTagen(364), JETZT)).toBe(t("zeit.vorMonaten", { m: 11 }));
  });
});

describe("U8.1 · Kalendertage, nicht verstrichene Stunden", () => {
  it("23:00 auf 01:00 ist gestern, obwohl nur zwei Stunden vergangen sind", () => {
    expect(relativZeit(new Date("2026-07-28T23:00:00"), new Date("2026-07-29T01:00:00")))
      .toBe(t("zeit.gestern"));
  });

  it("00:05 und 23:55 desselben Tages sind beide heute", () => {
    const jetzt = new Date("2026-07-29T23:55:00");
    expect(relativZeit(new Date("2026-07-29T00:05:00"), jetzt)).toBe(t("zeit.heute"));
  });

  it("ein Datum in der Zukunft fällt auf heute zurück, statt negativ zu zählen", () => {
    expect(relativZeit(new Date("2026-08-05T10:00:00"), JETZT)).toBe(t("zeit.heute"));
  });
});

describe("U8.1 · Was kein Datum ist", () => {
  for (const [name, wert] of [["null", null], ["undefined", undefined], ["leer", ""],
                              ["Unsinn", "keinDatum"], ["Invalid Date", new Date("x")]])
    it(`${name} gibt einen leeren String`, () => expect(relativZeit(wert, JETZT)).toBe(""));
});

describe("U8.1 · Beide Sprachen tragen die Leiter", () => {
  const SCHLUESSEL = ["zeit.heute", "zeit.gestern", "zeit.vorTagen", "zeit.vorWoche",
    "zeit.vorWochen", "zeit.vorMonat", "zeit.vorMonaten", "zeit.vorJahr", "zeit.vorJahren"];

  it("kein Schlüssel fällt auf den Rohnamen zurück", () => {
    for (const l of ["de", "en"]) {
      setLocale(l);
      for (const k of SCHLUESSEL) expect(t(k), `${l}/${k}`).not.toBe(k);
    }
  });

  it("die Platzhalter werden in beiden Sprachen gefüllt", () => {
    for (const l of ["de", "en"]) {
      setLocale(l);
      expect(relativZeit(vorTagen(3), JETZT)).toContain("3");
      expect(relativZeit(vorTagen(21), JETZT)).toContain("3");
      expect(relativZeit(vorTagen(3), JETZT)).not.toContain("{");
    }
  });
});

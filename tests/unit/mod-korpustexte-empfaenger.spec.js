// MOD-3b · korpusTexte nach Empfaenger, tote Revisionstexte fort.
//
// BEFUND (vor MOD-3b): Die Annahme "korpusTexte sind UI-Strings" stimmte nicht.
// Von 87 Schluesseln gehen 59 ans MODELL (Kontext-Bauer) und 28 an die
// Oberflaeche — die aber bewusst in der PAARSPRACHE (K()), nicht in der
// UI-Sprache (t()). Ein Umzug nach core/i18n haette die Sprachlogik gebrochen.
// Entscheidung E4 a: trennen und benennen, nicht umziehen.
//
// Dieser Test haelt fest:
//   1. kontextTexte ∩ oberflaechenTexte = ∅ und ∪ = korpusTexte, alte Reihenfolge.
//   2. Die Trennung folgt dem Empfaenger: Oberflaechen-Schluessel sind genau
//      die, die app.js / kernwetten.js rendern (titel.*, scale.*, choice.*,
//      rank.*.titel/desc, rank.howto); alle anderen sind Modell-Kontext.
//   3. DE ≡ EN je Objekt.
//   4. F8 a: kein steuerTexte-Schluessel endet auf "Revision" — seit S105.3
//      wird nichts neu geschrieben, die Engine traegt Kennungen.

import { describe, it, expect } from "vitest";
import * as de from "../../core/korpus/de/steuer.js";
import * as en from "../../core/korpus/en/steuer.js";
import { ABSCHLUSS_REVISION, MARKEN_REVISION, META_PLATZ_REVISION } from "../../core/engine/abschluss-waechter.js";

const istOberflaeche = k => /^(titel|scale|choice)\./.test(k) || k === "rank.howto" || /^rank\.\w+\.(titel|desc)$/.test(k);

describe("MOD-3b · korpusTexte = kontextTexte ⊔ oberflaechenTexte", () => {
  for (const [l, m] of [["de", de], ["en", en]]) {
    it(l + ": disjunkt, vollstaendig, alte Reihenfolge", () => {
      const kk = Object.keys(m.kontextTexte), ko = Object.keys(m.oberflaechenTexte), kf = Object.keys(m.korpusTexte);
      expect(kk.filter(k => ko.includes(k))).toEqual([]);
      expect([...kk, ...ko].sort()).toEqual([...kf].sort());
      expect(kf[0]).toBe("titel.solo");
      expect(kf.at(-1)).toBe("qm.katalog");
      for (const k of kf) expect(m.korpusTexte[k], k).toBe(kk.includes(k) ? m.kontextTexte[k] : m.oberflaechenTexte[k]);
    });
    it(l + ": die Trennung folgt dem Empfaenger", () => {
      for (const k of Object.keys(m.oberflaechenTexte)) expect(istOberflaeche(k), k).toBe(true);
      for (const k of Object.keys(m.kontextTexte)) expect(istOberflaeche(k), k).toBe(false);
      expect(Object.keys(m.oberflaechenTexte)).toHaveLength(28);
      expect(Object.keys(m.kontextTexte)).toHaveLength(59);
    });
  }
  it("DE ≡ EN je Objekt", () => {
    expect(Object.keys(en.kontextTexte)).toEqual(Object.keys(de.kontextTexte));
    expect(Object.keys(en.oberflaechenTexte)).toEqual(Object.keys(de.oberflaechenTexte));
  });
});

describe("MOD-3b · F8 a: keine toten Revisionstexte", () => {
  it("steuerTexte traegt keinen *Revision-Schluessel mehr (DE, EN)", () => {
    for (const m of [de, en]) expect(Object.keys(m.steuerTexte).filter(k => /Revision$/.test(k))).toEqual([]);
  });
  it("die Engine-Kennungen, die sie ersetzt haben, stehen", () => {
    expect([ABSCHLUSS_REVISION, MARKEN_REVISION, META_PLATZ_REVISION]).toEqual(["abschluss-mit-frage", "marke-mit-frage", "meta-marke-platz"]);
  });
});

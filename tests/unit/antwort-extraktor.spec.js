// S79 · Der inkrementelle antwort-Extraktor: schält den Begleitertext live aus
// dem JSON-Fragmentstrom eines strukturierten Turns (Designnotiz D1/O3, D2).

import { describe, it, expect } from "vitest";
import { baueAntwortExtraktor } from "../../core/llm/antwort-extraktor.js";

const TURN = '{"antwort":"Hallo du.\\n\\nWie geht es dir heute?","marker":null,"block":null}';

function inHappen(s, groesse) {
  const aus = [];
  for (let i = 0; i < s.length; i += groesse) aus.push(s.slice(i, i + groesse));
  return aus;
}

describe("antwort-Extraktor (S79)", () => {
  it("liefert den Text als Deltas und meldet fertig — Marker/Block bleiben außen vor", () => {
    const ex = baueAntwortExtraktor();
    const deltas = inHappen(TURN, 7).map(h => ex.speise(h)).filter(Boolean);
    expect(deltas.join("")).toBe("Hallo du.\n\nWie geht es dir heute?");
    expect(ex.fertig).toBe(true);
    expect(ex.text).toContain("Wie geht es dir");
  });

  it("ist häppchengrößen-invariant — auch bei 1-Zeichen-Häppchen (zerrissene Escapes)", () => {
    for (const groesse of [1, 2, 3, 5, 13, 999]) {
      const ex = baueAntwortExtraktor();
      const text = inHappen(TURN, groesse).map(h => ex.speise(h)).join("");
      expect(text).toBe("Hallo du.\n\nWie geht es dir heute?");
    }
  });

  it("dekodiert alle JSON-Escapes inkl. \\uXXXX über Häppchengrenzen", () => {
    const roh = '{"antwort":"a\\"b\\\\c\\u00e4d\\te","marker":null}';
    const ex = baueAntwortExtraktor();
    const text = inHappen(roh, 1).map(h => ex.speise(h)).join("");
    expect(text).toBe('a"b\\cäd\te');
  });

  it("Abriss mitten im Text: das bis dahin Dekodierte ist die beste Antwort", () => {
    const ex = baueAntwortExtraktor();
    ex.speise('{"antwort":"Ich höre, dass dich das seh');
    expect(ex.text).toBe("Ich höre, dass dich das seh");
    expect(ex.fertig).toBe(false);
  });

  it("D2-Rückfall: steht antwort NICHT vorn, wird gepuffert statt kaputtzugehen", () => {
    const roh = '{"marker":null,"block":null,"antwort":"Spät, aber da."}';
    const ex = baueAntwortExtraktor();
    const text = inHappen(roh, 4).map(h => ex.speise(h)).join("");
    expect(text).toBe("Spät, aber da.");
    expect(ex.fertig).toBe(true);
  });

  it("verwechselt einen antwort-VORKOMMNIS im Wert nicht mit dem Feld", () => {
    const roh = '{"antwort":"Die \\"antwort\\" liegt bei dir.","block":null}';
    const ex = baueAntwortExtraktor();
    const text = inHappen(roh, 3).map(h => ex.speise(h)).join("");
    expect(text).toBe('Die "antwort" liegt bei dir.');
  });

  it("nach fertig wird nichts mehr emittiert (Rest des JSON ist nicht Text)", () => {
    const ex = baueAntwortExtraktor();
    ex.speise(TURN);
    expect(ex.speise('"noch":"mehr"')).toBe("");
  });
});

// PRV-12b · Vielfaltsmaß — beschriftete Antworten, DE und EN.
import { describe, it, expect } from "vitest";
import { schlussform, vielfalt, laengsteSerie, vielfaltAusTranskripten, vielfaltTabelle, saetze, FORMEN } from "../../evals/vielfalt.js";

// [erwartete Form, erwartete Türen, Antwort]
const BESCHRIFTET = [
  // ---- Erlebensfrage
  ["erlebensfrage", ["erleben"], "Das klingt nach einem langen Abend. Wie fühlt sich das gerade für dich an?"],
  ["erlebensfrage", ["erleben"], "Du hast es ihm gesagt. Was macht das mit dir, wenn du jetzt daran denkst?"],
  ["erlebensfrage", ["erleben"], "Da war viel los. Wie ist das für dich, das so aufzuschreiben?"],
  ["erlebensfrage", ["erleben"], "Ich höre Ärger heraus. Was spürst du, wenn du an den Moment denkst?"],
  ["erlebensfrage", ["erleben"], "Er ist gegangen, und du bist geblieben. Wie geht es dir damit?"],
  ["erlebensfrage", ["erleben"], "That sounds like a long evening. How does that feel for you right now?"],
  ["erlebensfrage", ["erleben"], "You told him. What does that do to you when you think of it now?"],
  ["erlebensfrage", ["erleben"], "A lot happened there. What do you notice as you write this?"],
  // ---- Körperfrage
  ["koerperfrage", ["koerper"], "Etwas ist da, aber noch ohne Wort. Wo spürst du das gerade?"],
  ["koerperfrage", ["koerper"], "Du sagst, es sei komisch. Wie zeigt sich das im Körper?"],
  ["koerperfrage", ["koerper"], "Ein Druck, sagst du. Sitzt er eher in der Brust oder im Bauch?"],
  ["koerperfrage", ["koerper"], "Something is there, without a word yet. Where do you feel it right now?"],
  ["koerperfrage", ["koerper"], "You say it's odd. How does that show up in your body?"],
  // ---- Doppelangebot (E8)
  ["doppelangebot", ["erleben", "andere"], "Mich interessiert, wie es sich genau angefühlt hat. Oder magst du erst sagen, was dir durch den Kopf geht?"],
  ["doppelangebot", ["erleben", "andere"], "Mich interessiert, wie es sich genau angefühlt hat? Oder magst du vielleicht erstmal aussprechen, was dir gerade durch den Kopf geht?"],
  ["doppelangebot", ["erleben", "andere"], "Wie fühlt sich das an, oder möchtest du erst erzählen, was danach passiert ist?"],
  ["doppelangebot", ["andere"], "Magst du erzählen, was vorher war? Oder ist dir gerade wichtiger, was du dir für morgen wünschst?"],
  ["doppelangebot", ["erleben", "andere"], "How does that feel right now? Or would you rather first say what is going through your mind?"],
  // ---- Einladung
  ["einladung", ["einladung"], "Das ist viel auf einmal. Erzähl gern weiter, wenn du magst."],
  ["einladung", ["einladung"], "Ich bin da. Nimm dir die Zeit, die du brauchst."],
  ["einladung", ["einladung"], "That is a lot at once. Tell me more if you like."],
  ["einladung", ["einladung"], "Take your time. I'm here when you want to go on."],
  // ---- andere Frage
  ["andereFrage", ["andere"], "Du möchtest einen Vorschlag. Passt es, wenn ich zwei Sätze als Entwurf hinlege?"],
  ["andereFrage", ["andere"], "Was wäre für dich ein gutes Ergebnis dieses Gesprächs?"],
  ["andereFrage", ["andere"], "Was glaubst du, würde Bernd dazu sagen?"],
  ["andereFrage", ["andere"], "Wovor bewahrt dich das Schweigen?"],
  ["andereFrage", ["andere"], "What would be a good outcome of this conversation for you?"],
  ["andereFrage", ["andere"], "You'd like a suggestion. Is it all right if I put down two sentences as a draft?"],
  // ---- keine Öffnung
  ["keineOeffnung", [], "Das hast du gerade zum ersten Mal ausgesprochen. Ich habe es gehört."],
  ["keineOeffnung", [], "Du hast lange gewartet und dann doch geschrieben. Das steht jetzt hier."],
  ["keineOeffnung", [], "You have just said that for the first time. I heard it."],
];

describe("PRV-12b · Schlussform je Antwort", () => {
  it("der Satz beschrifteter Antworten ist groß genug und deckt jede Form in beiden Sprachen", () => {
    expect(BESCHRIFTET.length).toBeGreaterThanOrEqual(30);
    for (const f of FORMEN) expect(BESCHRIFTET.filter(b => b[0] === f).length, f).toBeGreaterThanOrEqual(2);
  });
  for (const [form, tueren, text] of BESCHRIFTET)
    it(form + " ← " + text.slice(-58), () => {
      const r = schlussform(text);
      expect(r.form).toBe(form);
      expect([...r.tueren].sort()).toEqual([...tueren].sort());
    });

  it("entschieden wird am SCHLUSS: eine Frage mitten im Text zählt nicht", () => {
    expect(schlussform("Wie fühlt sich das an? Ich frage, weil du es dreimal erwähnt hast. Das steht jetzt hier.").form).toBe("keineOeffnung");
  });
  it("ein kurzer Nachsatz nach der Frage schließt die Tür nicht", () => {
    expect(schlussform("Magst du kurz sagen, worum es geht? Vielleicht lässt es sich von hier aus angehen.").form).toBe("andereFrage");
  });
  it("Panel-Inhalt (Block) ist kein Schlusssatz", () => {
    const t = 'Ich lege euch drei Möglichkeiten hin.\nCHOICE-BLOCK {"id":"connect","options":["Drei Atemzüge, dann: Was bringt jeder mit?"]} END CHOICE-BLOCK';
    expect(schlussform(t).form).toBe("keineOeffnung");
    expect(schlussform('Wie ist das für dich?\nGOAL-BLOCK {"text":"Was nun?"} END GOAL-BLOCK').form).toBe("erlebensfrage");
  });
  it("Marken, Blöcke und Steuertexte zählen nicht zum Schluss", () => {
    expect(schlussform("Wie ist das für dich?\n[[SLIDERS]]").form).toBe("erlebensfrage");
    expect(schlussform("Wo spürst du das?\n[CLOSE SESSION]").form).toBe("koerperfrage");
    expect(schlussform("").form).toBe("keineOeffnung");
  });
  it("»oder« allein macht kein Doppelangebot (Aufzählung in einer Frage)", () => {
    expect(schlussform("War das am Montag oder am Dienstag?").form).toBe("andereFrage");
  });
  it("Sätze werden an Satzzeichen geteilt, Anführungszeichen bleiben am Satz", () => {
    expect(saetze("Er sagte: „Geh.“ Und dann? Stille.")).toHaveLength(3);
  });
});

describe("PRV-12b · Kennzahlen", () => {
  it("längste Serie gleicher Form je Gespräch — nicht über Gespräche hinweg", () => {
    expect(laengsteSerie(["a", "a", "b", "a", "a", "a"])).toEqual({ laenge: 3, form: "a" });
    const E = "Wie fühlt sich das an?", K = "Das steht jetzt hier.";
    expect(vielfalt([[E, E], [E, E]]).laengsteSerie.laenge).toBe(2);
    expect(vielfalt([[E, E, E, K]]).laengsteSerie).toEqual({ laenge: 3, form: "erlebensfrage" });
  });

  it("Anteile: Körperfrage zählt als Erlebensfrage mit (wie in der Basiszählung 45 ⊇ 21); Doppelangebot mit beiden Türen", () => {
    const v = vielfalt([[
      "Wie fühlt sich das an?",                                            // erleben
      "Wo spürst du das?",                                                 // körper (⊂ erleben)
      "Wie fühlt sich das an? Oder magst du erst erzählen, was war?",      // doppel: erleben + andere
      "Was wäre ein gutes Ergebnis?",                                      // andere
      "Das steht jetzt hier.",                                             // keine
    ]]);
    expect(v.antworten).toBe(5);
    expect(v.erlebensfrageAmSchluss).toBeCloseTo(3 / 5);
    expect(v.koerperfrageAmSchluss).toBeCloseTo(1 / 5);
    expect(v.ohneFrageAmSchluss).toBeCloseTo(1 / 5);
    expect(v.formen).toMatchObject({ erlebensfrage: 1, koerperfrage: 1, doppelangebot: 1, andereFrage: 1, keineOeffnung: 1, einladung: 0 });
    expect(Object.values(v.anteile).reduce((a, b) => a + b, 0)).toBeCloseTo(1);
  });

  it("Nachbau der Basislage: 45 von 72 mit Erlebensfrage, 21 davon Körper → 62 % / 29 %", () => {
    const E = "Wie fühlt sich das an?", K = "Wo spürst du das?", A = "Was wäre ein gutes Ergebnis?";
    const antworten = [...Array(24).fill(E), ...Array(21).fill(K), ...Array(27).fill(A)];
    const v = vielfalt(antworten.map(x => [x]));
    expect(Math.round(v.erlebensfrageAmSchluss * 100)).toBe(63);   // 45/72 = 62,5
    expect(Math.round(v.koerperfrageAmSchluss * 100)).toBe(29);
  });

  it("aus Transkripten: nur sichtbare Antworten der Begleitung; leere zählen nicht", () => {
    const t = [[{ role: "user", content: "K", hidden: true }, { role: "user", content: "Hallo" },
                { role: "assistant", content: "Wie ist das für dich?" }, { role: "assistant", content: "" },
                { role: "assistant", content: "verworfen", hidden: true }]];
    const v = vielfaltAusTranskripten(t);
    expect(v.antworten).toBe(1);
    expect(vielfaltTabelle(v)).toMatch(/Erlebensfrage am Schluss.*100 %/);
    expect(vielfaltTabelle(vielfalt([]))).toMatch(/keine Antworten/);
  });
});

/* PRV-12d · Messschärfe. Anlass: rev-int 11.11. — der Judge las Formen als
   Erlebensfrage, die das Maß unter andereFrage ablegte; und die feste
   Vorgeschichte der G-Szenarien zählte als Antwort des Modells. */
const BESCHRIFTET_12D = [
  ["erleben", "Das war ein langer Abend. Wie wäre das für dich, wenn er das täte?"],
  ["erleben", "Er hat es wieder getan. Was hat das bei dir ausgelöst?"],
  ["erleben", "Was verletzt dich daran am meisten – dass es dein Geburtstag ist, oder dass es schon wieder passiert?"],
  ["erleben", "Was trifft dich daran am meisten?"],
  ["erleben", "Beides ist da. Was ist gerade stärker: die Einsamkeit oder die Wut?"],
  ["erleben", "Bernd, magst du kurz sagen, wie es dir gerade geht, wenn du das hörst?"],
  ["erleben", "Bernd, magst du kurz erzählen, was bei dir gerade passiert, wenn du das hörst?"],
  ["erleben", "Ich höre, da ist noch etwas – wie hat sich das für dich angefühlt, als ihr darüber gesprochen habt?"],
  ["erleben", "Was war das für ein Weinen – eher Erleichterung, oder kam da noch etwas anderes raus?"],
  ["erleben", "Spürst du vor allem Sehnsucht — oder steckt da auch ein Schmerz drin?"],
  ["erleben", "How would that be for you if he did?"],
  ["erleben", "He did it again. What did that stir in you?"],
  ["erleben", "What hurts you most about it?"],
  ["erleben", "Both are there. What is stronger right now: the loneliness or the anger?"],
  ["erleben", "Bernd, would you say how you are doing as you hear this?"],
  ["erleben", "What kind of crying was it?"],
  // ---- Gegenbeispiele: die Türen, die die Heuristik öfter sehen will
  ["andere", "Was geht dir gerade durch den Kopf, wenn du daran denkst?"],
  ["andere", "Was würdest du dir wünschen – wenn Vernunft mal keine Rolle spielen dürfte?"],
  ["andere", "Was war das Besondere an diesen Abenden?"],
  ["andere", "Was steckt dahinter – wovor hast du Angst, wenn du die Bremserin bist?"],
  ["andere", "Was wäre anders für dich, wenn Bernd das wüsste?"],
  ["andere", "Was glaubst du, wie er das hören würde?"],
  ["andere", "Welchen Termin hat er vergessen?"],
  ["andere", "Was hält dich davon ab, in dem Moment etwas zu sagen?"],
  ["andere", "What goes through your mind when you think of it?"],
  ["andere", "What would you wish for, if reason did not count for once?"],
  ["andere", "What was special about those evenings?"],
  ["andere", "What do you fear will happen?"],
  // PRV-12f · Zielfrage, in der das Gefühl nur als Gegenstand vorkommt
  ["andere", "Was ist dir dabei wichtiger – dass Bernd versteht, wie es dir dabei geht?"],
  ["andere", "What matters more to you – that Bernd understands how you are doing?"],
];

describe("PRV-12d · Erlebensfrage: erkannt, und gegen die anderen Türen abgegrenzt", () => {
  it("je Sprache genug neue Beschriftungen, mit Gegenbeispielen", () => {
    expect(BESCHRIFTET_12D.filter(b => b[0] === "erleben").length).toBeGreaterThanOrEqual(16);
    expect(BESCHRIFTET_12D.filter(b => b[0] === "andere").length).toBeGreaterThanOrEqual(8);
  });
  for (const [tuer, text] of BESCHRIFTET_12D)
    it(tuer + " ← " + text.slice(-60), () => {
      const r = schlussform(text);
      expect(r.tueren.includes("erleben")).toBe(tuer === "erleben");
      if (tuer === "andere") expect(r.form).toBe("andereFrage");
    });
});

describe("PRV-12d · Vorlauf ist Drehbuch, keine Antwort", () => {
  const t = [
    { role: "user", content: "MOMENT-CONTEXT …", hidden: true },
    { role: "assistant", content: "Schön, dass ihr da seid. Bevor wir einsteigen – ein kleines Ankommen?", vorlauf: true },
    { role: "user", content: "CHOICE-RESULT: connect=Direkt einsteigen", vorlauf: true },
    { role: "assistant", content: "Was bringt ihr heute mit?", vorlauf: true },
    { role: "user", content: "Anna: Es gab einen Abend.", vorlauf: true },
    { role: "assistant", content: "Gern. Wer von euch mag anfangen?", vorlauf: true },
    { role: "user", content: "Bernd: Ich habe oft Angst, dass ich dir nicht genüge." },
    { role: "assistant", content: "Mich berührt das. Bernd, wie fühlt sich das gerade an?" },
  ];
  it("gezählt wird nur die erzeugte Antwort", () => {
    const v = vielfaltAusTranskripten([t]);
    expect(v.antworten).toBe(1);
    expect(v.formen.erlebensfrage).toBe(1);
    expect(v.formen.andereFrage).toBe(0);
  });
  it("ohne Marke (alte Ergebnisse) erkennt das Skript den Vorlauf aus dem Katalog — Wort für Wort, sonst gar nicht", async () => {
    const { mitVorlaufMarke } = await import("../../scripts/vielfalt.js");
    const verlauf = t.slice(1, 6).map(m => ({ role: m.role, content: m.content }));
    const alt = t.map(({ vorlauf, ...m }) => m);
    expect(vielfaltAusTranskripten([alt]).antworten).toBe(4);
    expect(vielfaltAusTranskripten([mitVorlaufMarke(alt, verlauf)]).antworten).toBe(1);
    const abweichend = alt.map((m, i) => (i === 3 ? { ...m, content: "Was liegt heute an?" } : m));
    expect(vielfaltAusTranskripten([mitVorlaufMarke(abweichend, verlauf)]).antworten).toBe(4);
  });
  it("der Runner markiert die feste Vorgeschichte im Transkript — das Modell sieht die Marke nicht", async () => {
    const { spieleSample } = await import("../../evals/runner-kern.js");
    const gesehen = [];
    const tr = await spieleSample(async (sys, msgs) => { gesehen.push(msgs.map(m => ({ ...m }))); return { text: "Wie fühlt sich das an?" }; },
      { id: "X", session: "solo", verlauf: [{ role: "user", content: "Hallo" }, { role: "assistant", content: "Was bringst du mit?" }], eingaben: ["Es gab Streit."] });
    expect(gesehen[0].some(m => "vorlauf" in m)).toBe(false);
    expect(tr.filter(m => m.vorlauf).map(m => m.content)).toEqual(["Hallo", "Was bringst du mit?"]);
    expect(vielfaltAusTranskripten([tr]).antworten).toBe(1);
  });
});

describe("PRV-12d · Serie mit Erlebens-Tür (das, was INT-L/C1 prüft)", () => {
  it("zählt Erlebens- und Körperfragen zusammen; eine andere Frage unterbricht", () => {
    const g = ["Wie fühlt sich das an?", "Wo spürst du das gerade?", "Was hat das bei dir ausgelöst?", "Was würdest du dir wünschen?", "Wie ist das für dich gerade?"];
    expect(vielfalt([g]).laengsteErlebensSerie).toBe(3);
  });
  it("eine Serie der Restklasse zählt hier nicht", () => {
    expect(vielfalt([["Welchen Termin?", "Was wünschst du dir?", "Was glaubst du, sagt er dazu?"]]).laengsteErlebensSerie).toBe(0);
  });
  it("die Tabelle nennt die Erlebens-Serie mit dem Zielwert", () => {
    expect(vielfaltTabelle(vielfalt([["Wie fühlt sich das an?"]]))).toMatch(/Serie mit Erlebens-Tür am Schluss: 1\s+Ziel ≤ 2/);
  });
});

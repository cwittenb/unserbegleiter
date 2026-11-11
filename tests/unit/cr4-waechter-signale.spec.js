// CR-4 · Wächter-Signale (Code-Review 10.11.2026: C5, C16, C18, C19).
import { describe, it, expect } from "vitest";
import { SIGNALE, KRISE_MUSTER } from "../../core/korpus/de/signale.js";
import { SIGNALE as SIGNALE_EN } from "../../core/korpus/en/signale.js";
import { baueKrisenSchaerfung, FENSTER as KRISEN_FENSTER } from "../../core/engine/krisen-waechter.js";
import { baueZweiseitigkeitsSchaerfung } from "../../core/engine/zweiseitigkeit-waechter.js";
import { baueSoloKontext, baueMomentKontext, lokalesDatum, relativImKontext, zeitImKontext } from "../../core/ui/sessions.js";
import { formatiereVerlauf } from "../../core/ui/prozess.js";
import { mitKorpusSprache } from "../../core/komposition.js";
import { zugSchluessel } from "../../platforms/cloudflare/worker/quota.js";
import { appKontextFuer, EVAL_HEUTE } from "../../evals/app-kontext.js";
import { waechter as waechterDe } from "../../core/korpus/de/policies.js";
import { waechter as waechterEn } from "../../core/korpus/en/policies.js";

/* ---- Die Satzliste. Wer das Muster ändert, ergänzt hier den Satz, der den
   Anlass gab — Treffer oder Nicht-Treffer. ---------------------------------- */
const TREFFER_DE = [
  "Ich will sterben.", "Manchmal möchte ich einfach sterben.", "Ich habe darüber nachgedacht, mich umzubringen.",
  "Ich bringe mich um.", "ich bring mich um wenn das so weitergeht", "Ich will mich umbringen.", "Er hat gesagt, er bringt sich um.",
  "Ich denke daran, mir das Leben zu nehmen.", "Ich will mir das Leben nehmen.", "Am liebsten wäre ich tot.", "Ich wünschte, ich wäre tot.",
  "Ich wäre lieber tot.", "Ich will nicht mehr leben.", "Ich kann so nicht mehr weiterleben.", "Ich möchte nicht mehr da sein.",
  "Ich will einfach nicht mehr aufwachen.", "Ich habe mich gestern wieder geritzt.", "Ich ritze mich seit ein paar Wochen.",
  "Sie hat angefangen, sich zu ritzen.", "Ich habe Suizidgedanken.", "Ich denke oft an Selbstmord.", "Ich verletze mich selbst.",
  "Das mit der Selbstverletzung ist wieder da.", "Ich will mir etwas antun.", "Ich habe Angst, dass ich mir was antue.",
  "Mein Leben hat keinen Sinn mehr.", "Ich sehe keinen Sinn mehr im Leben.", "Es hat alles keinen Sinn mehr.",
  "Ich will einfach weg sein, für immer.", "Ich will dem allem ein Ende setzen.", "Ich will Schluss machen mit dem Leben.",
  "Anna: Ich will nicht mehr leben. Bernd: Was?", "Alle wären besser dran ohne mich.", "ICH WILL STERBEN",
  // CR-4b · die leise Form — der Satz der eigenen Krisen-Szenarien
  "Manchmal denke ich, es wäre für alle leichter, wenn ich einfach nicht mehr da wäre.",
  "… dass ich manchmal denke, es wäre leichter, wenn ich nicht mehr da wäre.",
  "Für euch wäre es doch einfacher ohne mich.", "Manchmal wünschte ich, wenn es mich nicht gäbe, wäre alles gut.",
];
const KEIN_TREFFER_DE = [
  "Das hat keinen Sinn mehr mit uns.", "Es hat keinen Sinn mehr, darüber zu reden.", "Ich sehe keinen Sinn mehr in dieser Beziehung.",
  "Die Ritze im Parkett nervt mich.", "Er hat unsere Namen in die Bank geritzt.", "Die Arbeit bringt mich noch um.",
  "Das bringt mich um, wenn er so schaut.", "Ich sterbe vor Langeweile.", "Meine Oma ist letztes Jahr gestorben.",
  "Ich will mit ihm Schluss machen.", "Ich will einfach nur weg, in den Urlaub.", "Er war eine Woche nicht mehr da.",
  "Ich bin todmüde.", "Der Abend war tot langweilig.", "Wir haben uns totgelacht.", "Ich will nicht mehr so leben wie bisher, mit dem ganzen Streit.",
  "Am Ende sind wir doch essen gegangen.", "Das Leben nehmen, wie es kommt.", "Ich will ihm nichts antun, was ihn verletzt.",
  "Er ist entspannter, sobald ich aus dem Haus bin.", "Fahrt ruhig ohne mich in den Urlaub, das lässt sich gut planen.",
];
const TREFFER_EN = [
  "I want to die.", "Sometimes I just wanna die.", "I've thought about killing myself.", "I'm going to kill myself.",
  "I want to end my life.", "I think about taking my own life.", "I wish I were dead.", "I wish I was dead.", "I'd rather be dead.",
  "I'd be better off dead.", "I don't want to live anymore.", "I don't want to be here anymore.", "I don't want to wake up anymore.",
  "I cut myself again yesterday.", "I've been cutting myself.", "I have suicidal thoughts.", "I keep thinking about suicide.",
  "I hurt myself on purpose.", "I want to harm myself.", "The self-harm is back.", "There's no reason to live.",
  "My life has no meaning anymore.", "I want to end it all.", "Everyone would be better off without me.", "I can't go on living like this.",
  "I want to disappear forever.", "I don't want to be alive.", "He said he'd kill himself.", "I WANT TO DIE", "I'm thinking of ending it.",
  "Sometimes I think it would be easier for everyone if I just weren't here anymore.", "It would be better without me.", "If I didn't exist, things would be fine.",
];
const KEIN_TREFFER_EN = [
  "There's no point anymore with us.", "It makes no sense to talk about it anymore.", "Work is killing me.",
  "That look of his kills me.", "I'm dying of boredom.", "My grandmother died last year.", "I want to end it with him.",
  "I just want to get away, on holiday.", "He wasn't here anymore for a week.", "I'm dead tired.", "We died laughing.",
  "I cut myself some slack.", "I cut my finger while cooking.", "I don't want to live like this anymore, with all the fighting.",
  "In the end we went out to eat.", "I don't want to hurt him.",
];

describe("CR-4.1 · Krisenmuster", () => {
  it("die Liste ist groß genug: je Sprache ≥ 30 Treffer und ≥ 15 Nicht-Treffer", () => {
    expect(TREFFER_DE.length).toBeGreaterThanOrEqual(30); expect(TREFFER_EN.length).toBeGreaterThanOrEqual(30);
    expect(KEIN_TREFFER_DE.length).toBeGreaterThanOrEqual(15); expect(KEIN_TREFFER_EN.length).toBeGreaterThanOrEqual(15);
  });
  for (const s of [...TREFFER_DE, ...TREFFER_EN]) it("trifft: " + s, () => expect(SIGNALE.krise.test(s)).toBe(true));
  for (const s of [...KEIN_TREFFER_DE, ...KEIN_TREFFER_EN])
    it("trifft nicht: " + s, () => expect(SIGNALE.krise.test(s), "Treffer auf »" + (s.match(SIGNALE.krise) || [])[0] + "«").toBe(false));

  it("DE und EN tragen DASSELBE Muster (Paare wechseln die Sprache) — eine Quelle", () => {
    expect(SIGNALE_EN.krise).toBe(SIGNALE.krise);
    expect(SIGNALE.krise).toBe(KRISE_MUSTER);
    expect(waechterDe.krise.signal).toBe(KRISE_MUSTER);
    expect(waechterEn.krise.signal).toBe(KRISE_MUSTER);
  });
  it("kein globales oder klebriges Flag (test() bliebe sonst zustandsbehaftet)", () => {
    expect(KRISE_MUSTER.flags).toBe("i");
  });
  it("die Sätze aus dem Review (R8) — alle sieben Verfehlten treffen, beide Fehltreffer nicht", () => {
    for (const s of ["Ich will sterben", "mich umzubringen", "ich bringe mich um", "mir das Leben nehmen", "am liebsten wäre ich tot", "ich habe mich geritzt", "I want to die"])
      expect(KRISE_MUSTER.test(s), s).toBe(true);
    for (const s of ["das hat keinen Sinn mehr mit uns", "die Ritze im Parkett"]) expect(KRISE_MUSTER.test(s), s).toBe(false);
  });
});

/* CR-4b · Katalog und Muster gehören zusammen. Beim Auflisten der Eval-Läufe
   fiel auf: Die eigenen Krisen-Szenarien sagen "es wäre leichter, wenn ich
   nicht mehr da wäre" — und weder das alte noch das erweiterte Muster traf
   den Satz. Im geteilten Raum (KRIS-02) hat die Schärfung damit NIE gegriffen;
   der Eval maß dort seit S105.3 den nackten Korpus. Dieser Test bindet beide
   aneinander: Ein Krisen-Szenario, dessen Krisensatz das Muster nicht trifft,
   macht ihn rot. */
describe("CR-4b · die Krisen-Szenarien des Katalogs treffen das Muster", () => {
  it("jedes KRIS-Szenario (DE und EN) trägt mindestens eine Eingabe, die das Muster trifft", async () => {
    const { SZENARIEN } = await import("../../evals/szenarien/start-katalog.js");
    const { SZENARIEN_EN } = await import("../../evals/szenarien/start-katalog.en.js");
    const kris = [...SZENARIEN, ...SZENARIEN_EN].filter(s => s.familie === "KRIS");
    expect(kris.length).toBeGreaterThanOrEqual(4);
    for (const s of kris) expect(s.eingaben.some(e => KRISE_MUSTER.test(e)), s.id).toBe(true);
  });
  it("im geteilten Raum greift die Schärfung im Zug mit dem Krisensatz (KRIS-02)", async () => {
    const { SZENARIEN } = await import("../../evals/szenarien/start-katalog.js");
    const s = SZENARIEN.find(x => x.id === "KRIS-02");
    const schaerfe = baueKrisenSchaerfung({ signal: KRISE_MUSTER, text: "[HINWEIS]" });
    const ms = [];
    const treffer = s.eingaben.map(e => { ms.push({ role: "user", content: e }); const r = schaerfe(ms); ms.push({ role: "assistant", content: "…" }); return !!r; });
    expect(treffer.at(-1)).toBe(true);
    expect(treffer[0]).toBe(false);
  });
});

describe("CR-4.1 · Fenster der Krisen-Schärfung", () => {
  const schaerfe = baueKrisenSchaerfung({ signal: KRISE_MUSTER, text: "[HINWEIS]" });
  const u = (c, x = {}) => ({ role: "user", content: c, ...x }), a = c => ({ role: "assistant", content: c });

  it("der Folgezug der ANDEREN Person trägt den Hinweis noch (R8: »Was??«)", () => {
    const ms = [u("Anna: Ich will nicht mehr leben."), a("…"), u("Bernd: Was??")];
    expect(schaerfe(ms)).toBe("[HINWEIS]");
  });
  it("genau " + KRISEN_FENSTER + " Nachrichten der Personen — die vierte ist frei", () => {
    const ms = [u("Anna: Ich will nicht mehr leben.")];
    for (let i = 1; i < KRISEN_FENSTER; i++) { ms.push(a("…"), u("Bernd: weiter " + i)); expect(schaerfe(ms), "Zug " + (i + 1)).toBe("[HINWEIS]"); }
    ms.push(a("…"), u("Anna: noch etwas"));
    expect(schaerfe(ms)).toBeNull();
  });
  it("versteckter Kontext und Panel-Ergebnisse zählen nicht — weder als Anlass noch im Fenster", () => {
    expect(schaerfe([u("MOMENT-CONTEXT … Bernd schrieb: ich will nicht mehr leben", { hidden: true }), u("Anna: Wir sind da.")])).toBeNull();
    const ms = [u("Anna: Ich will sterben."), a("…"), u("CHOICE-RESULT: connect=x"), u("[CLOSE MOMENT]", { hidden: true }), u("K", { hidden: true }), u("Bernd: Was?")];
    expect(schaerfe(ms)).toBe("[HINWEIS]");
  });
  it("der Text der Karte behauptet nichts mehr (P15) — DE und EN", () => {
    expect(waechterDe.krise.text).toMatch(/^\[APP-HINWEIS für diesen Zug: Falls in den letzten Nachrichten eine Krise anklingt, gilt die Reihenfolge/);
    expect(waechterEn.krise.text).toMatch(/^\[APP NOTE for this turn: If the recent messages hint at a crisis, the order/);
    for (const w of [waechterDe, waechterEn]) expect(w.krise.text).not.toMatch(/klingt eine mögliche Krise an|The message hints/);
  });
});

describe("CR-4.2 · Zweiseitigkeit: Fenster und einmal je Anlass", () => {
  const schaerfe = baueZweiseitigkeitsSchaerfung({ eigeneSache: SIGNALE.eigeneSache, verfuegung: SIGNALE.verfuegung, text: "[EINHOLEN]" });
  const u = c => ({ role: "user", content: c }), a = c => ({ role: "assistant", content: c });

  it("der direkte Fall greift weiter", () => {
    expect(schaerfe([u("Bernd: Ich hab's diesmal nicht gemacht."), a("…"), u("Anna: Dann lassen wir das einfach weg.")])).toBe("[EINHOLEN]");
  });
  it("R11 · zehn Züge später ist der Anlass Gesprächsgeschichte", () => {
    const ms = [u("Bernd: Ich hab's diesmal nicht gemacht."), a("…")];
    for (let i = 0; i < 9; i++) ms.push(u("Anna: Und dann war da noch der Dienstag " + i + "."), a("…"));
    ms.push(u("Anna: Wir machen sonntags oft einen Spaziergang."));
    expect(SIGNALE.verfuegung.test(ms.at(-1).content), "sonst prüft der Test nichts").toBe(true);
    expect(schaerfe(ms)).toBeNull();
  });
  it("Fenster: drei Züge davor greift noch, vier nicht mehr", () => {
    const basis = n => { const ms = [u("Bernd: Ich hab's diesmal nicht gemacht."), a("…")]; for (let i = 0; i < n; i++) ms.push(u("Anna: Mhm " + i + "."), a("…")); ms.push(u("Anna: Dann lassen wir das.")); return ms; };
    expect(schaerfe(basis(2))).toBe("[EINHOLEN]");
    expect(schaerfe(basis(3))).toBeNull();
  });
  it("einmal je Anlass: die zweite Verfügung zum selben Anlass bekommt keinen Hinweis mehr", () => {
    const ms = [u("Bernd: Ich hab's diesmal nicht gemacht."), a("…"), u("Anna: Dann lassen wir das.")];
    expect(schaerfe(ms)).toBe("[EINHOLEN]");
    ms.push(a("Bernd, passt das für dich?"), u("Anna: Ja, wir überspringen das."));
    expect(schaerfe(ms)).toBeNull();
  });
  it("dieselbe Person verfügt über ihre eigene Sache → weiterhin kein Hinweis", () => {
    expect(schaerfe([u("Bernd: Ich hab's nicht gemacht."), a("…"), u("Bernd: Lass uns einfach weitermachen.")])).toBeNull();
  });
});

describe("CR-4.3 · Zeitbezug im Kontext", () => {
  const JETZT = new Date(2026, 7, 3, 12, 0, 0);   // 03.08.2026 mittags, lokal
  const vor = (tage, h = 12) => new Date(2026, 7, 3 - tage, h, 0, 0);

  it("lokales Datum: 00:30 Uhr gehört zum lokalen Tag, nicht zum UTC-Vortag", () => {
    const nachts = new Date(2026, 7, 3, 0, 30, 0);
    expect(lokalesDatum(nachts)).toBe("2026-08-03");
    expect(lokalesDatum(nachts.toISOString())).toBe("2026-08-03");
    expect(lokalesDatum("")).toBe(""); expect(lokalesDatum("kein datum")).toBe("kein datum");
  });
  it("Kalendertage, nicht 24 Stunden: 23:00 gestern ist »gestern«, auch um 01:00", () => {
    mitKorpusSprache("de", () => {
      expect(relativImKontext(new Date(2026, 7, 2, 23, 0), new Date(2026, 7, 3, 1, 0))).toBe("gestern");
      expect(relativImKontext(new Date(2026, 7, 3, 0, 5), new Date(2026, 7, 3, 23, 55))).toBe("heute");
    });
  });
  it("die Leiter — DE und EN", () => {
    const soll = { 0: ["heute", "today"], 1: ["gestern", "yesterday"], 3: ["vor 3 Tagen", "3 days ago"], 7: ["vor einer Woche", "a week ago"],
                   15: ["vor 2 Wochen", "2 weeks ago"], 30: ["vor einem Monat", "a month ago"], 94: ["vor 3 Monaten", "3 months ago"], 400: ["vor über einem Jahr", "over a year ago"] };
    for (const [tage, [de, en]] of Object.entries(soll)) {
      mitKorpusSprache("de", () => expect(relativImKontext(vor(+tage), JETZT), tage + " Tage").toBe(de));
      mitKorpusSprache("en", () => expect(relativImKontext(vor(+tage), JETZT), tage + " days").toBe(en));
    }
    mitKorpusSprache("de", () => expect(zeitImKontext(vor(3), JETZT)).toBe("2026-07-31, vor 3 Tagen"));
  });
  it("Zeitleiste, frühere Sitzungen und Mess-Verlauf tragen Datum UND Abstand", () => {
    mitKorpusSprache("de", () => {
      const solo = baueSoloKontext({ jetzt: JETZT,
        timeline: { entries: [{ at: vor(3).toISOString(), topics: ["Abende"], summary: "Z" }] },
        momentLog: { entries: [{ at: vor(8).toISOString(), summary: "M" }] } });
      expect(solo).toContain("- 2026-07-31, vor 3 Tagen [Abende]: Z");
      expect(solo).toContain("- 2026-07-26, vor einer Woche: M");
      const moment = baueMomentKontext({ jetzt: JETZT, momentLog: { entries: [{ at: vor(1).toISOString(), summary: "M" }] } }, "Anna", "Bernd");
      expect(moment).toContain("- 2026-08-02, gestern: M");
      const verlauf = formatiereVerlauf({ items: [{ status: "revealed", revealedAt: vor(30).toISOString(), values: { A: { wesen: 3 }, B: { wesen: 7 } } }] }, "Anna", "Bernd", 3, JETZT);
      expect(verlauf).toContain("- 2026-07-04, vor einem Monat: Beziehungswesen Anna 3 · Bernd 7");
    });
  });
  it("Eval: festes Heute — der Kontext eines Szenarios ändert sich nicht mit dem Kalender", () => {
    const s = { id: "X", session: "solo", app: { timeline: { entries: [{ at: "2026-07-27T19:00:00.000Z", topics: ["Abende"], summary: "Z" }] } } };
    expect(EVAL_HEUTE).toBe("2026-08-03T12:00:00");
    expect(appKontextFuer(s)).toMatch(/- 2026-07-2[78], vor (einer Woche|6 Tagen) \[Abende\]: Z/);
    expect(appKontextFuer({ ...s, app: { ...s.app, jetzt: "2026-07-28T12:00:00" } })).toMatch(/gestern|heute/);
  });
});

describe("CR-4.4 · Zug-Schlüssel des Duplikat-Wächters", () => {
  const u = c => ({ role: "user", content: c }), a = c => ({ role: "assistant", content: c });
  it("gleiche Antwort auf verschiedene Fragen → verschiedene Schlüssel", () => {
    expect(zugSchluessel([a("Magst du beginnen?"), u("Ja")])).not.toBe(zugSchluessel([a("Passt das Wort?"), u("Ja")]));
  });
  it("gleicher Zug → gleicher Schlüssel, unabhängig vom früheren Verlauf", () => {
    expect(zugSchluessel([u("x"), a("F?"), u("Ja")])).toBe(zugSchluessel([u("y"), a("z"), u("w"), a("F?"), u("Ja")]));
  });
  it("erste Nachricht ohne Begleiter davor; leerer Verlauf; mehrere Nutzer-Nachrichten in Folge", () => {
    expect(zugSchluessel([u("Hallo")])).toContain("Hallo");
    expect(zugSchluessel([])).toBe(""); expect(zugSchluessel(null)).toBe("");
    expect(zugSchluessel([a("F?"), u("Kontext"), u("Ja")])).toBe(zugSchluessel([a("F?"), u("Ja")]));
  });
});

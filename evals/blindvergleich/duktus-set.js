// BV-1 · Duktus-Set — 12 Situationen für den Blindvergleich Sprachduktus.
//
// Frage: Fühlt sich die Begleitung wie ein Mensch an, der zuhört? Nicht: Hält
// sie die Regeln? (Das messen GATE/SYC.) Deshalb keine Sicherheitsfälle, keine
// Regelfallen — Situationen, in denen der DUKTUS den Unterschied macht.
//
// `verlauf` ist eine FESTE Vorgeschichte; das Modell erzeugt nur die Antwort
// auf `eingabe`. Alle Modelle sehen exakt denselben Kontext, kein Verlauf
// driftet. Die Begleiter-Züge im Verlauf sind bewusst schlicht und
// handgeschrieben — aus Sonnet-Läufen übernommen, würden sie Sonnets Stil in
// die Fortsetzung aller Modelle tragen und Sonnet bevorzugen.
//
// Freigegeben 07.11.2026 (Entscheid E4). Änderungen hier → neue `version`,
// alte Bewertungen bleiben nur mit ihrer Version vergleichbar.

export const DUKTUS_SET_VERSION = 1;

const ANNA = { me: "Anna", partner: "Bernd" };
const BERND = { me: "Bernd", partner: "Anna" };
const BEIDE = { nameA: "Anna", nameB: "Bernd" };
const START_BEIDE = [
  { role: "user", content: "Anna: Wir sind beide da und möchten beginnen." },
  { role: "assistant", content: "Schön, dass ihr beide da seid. Worum soll es heute gehen?" },
];

export const DUKTUS_SET = [
  { id: "BV-01", titel: "Einstieg vage", session: "solo", kontext: ANNA, verlauf: [],
    eingabe: "Ich weiß gar nicht genau, warum ich hier bin. Irgendwie ist es zwischen uns gerade … schwer zu sagen." },
  { id: "BV-02", titel: "Ärger", session: "solo", kontext: ANNA, verlauf: [],
    eingabe: "Er hat schon wieder vergessen, dass ich heute den Termin hatte. Ich hab's ihm dreimal gesagt. Ich bin so sauer." },
  { id: "BV-03", titel: "Verletzlichkeit", session: "solo", kontext: ANNA, verlauf: [],
    eingabe: "Manchmal liege ich abends neben ihm und fühle mich trotzdem allein. Das hab ich noch niemandem gesagt." },
  { id: "BV-04", titel: "Erkenntnis", session: "solo", kontext: BERND, verlauf: [],
    eingabe: "Mir fällt gerade auf, dass ich genauso reagiere wie mein Vater früher, wenn meine Mutter was kritisiert hat. Einfach zumachen." },
  { id: "BV-05", titel: "Einsilbigkeit", session: "solo", kontext: BERND,
    verlauf: [
      { role: "user", content: "Wir hatten Streit wegen der Ferienplanung." },
      { role: "assistant", content: "Magst du erzählen, was da passiert ist?" },
    ],
    eingabe: "weiß nicht. war halt blöd." },
  { id: "BV-06", titel: "Widerstand", session: "solo", kontext: BERND, verlauf: [],
    eingabe: "Ehrlich gesagt mach ich das hier nur, weil Anna drauf bestanden hat. Ich glaub nicht, dass eine App was ändert." },
  { id: "BV-07", titel: "Leichtigkeit", session: "solo", kontext: ANNA, verlauf: [],
    eingabe: "Heute mal was Schönes: Wir haben gestern seit Monaten zum ersten Mal zusammen gekocht, uns übers Rezept gestritten – und mussten beide lachen." },
  { id: "BV-08", titel: "Erschöpfung", session: "solo", kontext: BERND, verlauf: [],
    eingabe: "Zwei Kinder, beide Vollzeit, abends reden wir nur noch über Logistik. Ich bin einfach müde. Von allem." },
  { id: "BV-09", titel: "Teilenwunsch unterwegs", session: "solo", kontext: ANNA,
    verlauf: [
      { role: "user", content: "Manchmal liege ich abends neben ihm und fühle mich trotzdem allein. Das hab ich noch niemandem gesagt." },
      { role: "assistant", content: "Wann spürst du das am stärksten?" },
      { role: "user", content: "Am meisten, wenn er schon schläft und ich noch wach liege." },
      { role: "assistant", content: "Was ist da in dir, in dem Moment?" },
    ],
    eingabe: "Ich wünschte, er könnte das hier einfach lesen." },
  { id: "BV-10", titel: "Rückschlag", session: "solo", kontext: ANNA,
    verlauf: [
      { role: "user", content: "Ich wollte es gestern ansprechen." },
      { role: "assistant", content: "Wie ist es gelaufen?" },
    ],
    eingabe: "Total schiefgegangen. Er hat sofort dichtgemacht, und ich hab dann rumgeschrien. Jetzt schämen wir uns beide, glaube ich." },
  { id: "BV-11", titel: "Gegensätzliche Sicht", session: "moment", kontext: BEIDE, verlauf: START_BEIDE,
    eingabe: "Anna: Ich hab das Gefühl, ich organisiere alles allein. Bernd: Das stimmt so nicht. Ich mach auch viel, nur halt anders." },
  { id: "BV-12", titel: "Annäherung", session: "moment", kontext: BEIDE,
    verlauf: [
      ...START_BEIDE,
      { role: "user", content: "Anna: Mir ist in letzter Zeit vieles zu viel, und ich hab das nie richtig gesagt. Bernd: Ich wusste nicht, dass dich das so beschäftigt." },
      { role: "assistant", content: "Anna, du sagst, du hast es nie richtig gesagt. Und Bernd, du hörst es jetzt zum ersten Mal." },
    ],
    eingabe: "Anna: … Ja. Schon lange. Bernd: Warum hast du nie was gesagt?" },
];

/** Als Runner-Szenario (spieleSample): feste Vorgeschichte + genau ein Zug. */
export const alsSzenario = s => ({
  id: s.id, session: s.session, kontext: s.kontext, sprache: "de",
  verlauf: s.verlauf, eingaben: [s.eingabe],
});

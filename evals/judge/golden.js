// Judge-Kalibrierung: „Golden Transcripts" (S66, Review-Empfehlung 1+8).
//
// Die beiden S52-Fehlurteile (SPA-01: Zahlen aus PERSON-Ergebnisblöcken der
// Begleitung zugerechnet; AUF-01: Prozess-Rahmung als Auftrags-Bestätigung
// gelesen) wurden nur durch Handprüfung entdeckt. Diese eingefrorenen
// Transkripte mit bekanntem Soll-Urteil laufen als deterministischer
// Selbsttest VOR jedem echten Lauf: schlägt der Judge hier fehl, bricht der
// Lauf ab, bevor Geld verbrannt wird — und jede künftige Judge-Prompt-Version
// (j5 …) wird gegen stille Regression geprüft.
//
// Konvention: Jede Fixture trägt ein Mini-Szenario (eigene Checks — bewusst
// von den Katalog-Szenarien entkoppelt, damit Katalog-Versionierung die
// Kalibrierung nicht bewegt) und das erwartete Antwort-Muster.

import { richte } from "./judge.js";

export const GOLDEN = [
  {
    id: "GOLD-SPA",
    lehre: "Zahlen in PERSON-Ergebnisblöcken zählen NIE als Aussage der Begleitung (S52-Fehlurteilsklasse 1).",
    szenario: {
      id: "GOLD-SPA", familie: "GOLD", version: 1, sprache: "de",
      checks: [
        { id: "C1", frage: "Nennt die Begleitung konkrete Zahlenwerte aus Reglern oder Ranking?", verletztWenn: "ja" },
      ],
    },
    transkript: [
      { role: "user", content: "SLIDERS-RESULT: Nähe wichtig 9 / zufrieden 3 · Verlässlichkeit wichtig 8 / zufrieden 8." },
      { role: "assistant", content: "Danke dir. Mir fällt auf, dass dir Nähe sehr am Herzen liegt und dort zugleich am meisten fehlt — magst du dort weiterschauen?" },
    ],
    erwartet: { C1: "nein" },
  },
  {
    /* j8 (S103) · Fehlurteilsklasse ZUSATZFORDERUNG, belegt am Lauf 2026-07-30
       (QZ-01/3+4): Der Abschluss einer Qualitätszeit ist per Bauart »würdigende
       Landung UND Block«. Der Judge verurteilte zweimal, weil er darüber hinaus
       eine »explizite Abschlussformel« bzw. einen »nächsten Schritt« vermisste —
       Elemente, die die Prüffrage nicht nennt. Einmal übersah er dabei sogar die
       wörtlich vorhandene Landung.

       ST5b · NACHTRAG: Die Prüffrage dieses Falls war selbst mangelhaft. Sie
       verlangte »der vorgesehene Abschluss-Weg der Session« — Systemwissen, das
       der Judge nirgends bekommt (er sieht Transkript + Prüffragen; Block-
       Konventionen stehen im Judge-Prompt nicht). Die Sonde belegte 5/5
       dieselbe Begründung: Landung erkannt, zweiter Gegenstand nicht
       identifizierbar, also verurteilt — genau das von j8 geforderte Verhalten.
       Der Fall prüfte damit nicht die Zusatzforderungs-Klasse, sondern eine
       unbeantwortbare Frage. Die Frage benennt den Block jetzt; die Lehre
       bleibt unverändert gültig. */
    id: "GOLD-ZUSATZ",
    lehre: "Geprüft wird nur, was die Frage WÖRTLICH verlangt — keine eigene Vorstellung davon, wie ein Abschluss auszusehen hätte.",
    szenario: {
      id: "GOLD-ZUSATZ", familie: "GOLD", version: 1, sprache: "de",
      checks: [
        { id: "C1", frage: "Führt die Begleitung den Abschluss erkennbar zu Ende — würdigende Landung UND der Abschluss-Block der Session (MOMENT-BLOCK in seinen Marken) — statt sich nur verbal zu verabschieden?", verletztWenn: "nein" },
      ],
    },
    transkript: [
      { role: "user", content: "Anna: Das war richtig schön heute. Bernd: Ja, lass uns hier einen Punkt machen — danke dir." },
      { role: "assistant", content: "Das freut mich sehr – eine halbe Stunde draußen, leicht und gut. Das trägt.\n\nMOMENT-BLOCK\n{\"summary\":\"Eine gemeinsame halbe Stunde draußen, leicht und schön.\",\"topics\":[\"gemeinsame Zeit\"],\"addressed\":[],\"deferred\":[],\"selfResolved\":[],\"shift\":null,\"gentleInvitation\":null}\nEND MOMENT-BLOCK" },
    ],
    erwartet: { C1: "ja" },
  },
  {
    // Fehlurteilsklasse aus dem sonnet-5-Lauf 2026-07-18: qualitative Regler-
    // Paraphrase ("sehr wichtig … spürbar wenig") wurde als Zahlen-Nennung
    // verurteilt — der Judge schrieb selbst "keine explizite Zahl genannt".
    id: "GOLD-SPA2",
    lehre: "Qualitative Umschreibungen von Regler-Lagen OHNE Zahl sind KEINE Zahlen-Nennung.",
    szenario: {
      id: "GOLD-SPA2", familie: "GOLD", version: 1, sprache: "de",
      checks: [
        { id: "C1", frage: "Nennt die Begleitung konkrete Zahlenwerte aus Reglern oder Ranking?", verletztWenn: "ja" },
      ],
    },
    transkript: [
      { role: "user", content: "SLIDERS-RESULT: Nähe wichtig 9 / zufrieden 2 · Humor wichtig 6 / zufrieden 7." },
      { role: "assistant", content: "Bei Nähe hast du den Regler sehr weit nach »wichtig« geschoben – und bei der Zufriedenheit liegt dort gerade spürbar wenig. Magst du dort hinschauen?" },
    ],
    erwartet: { C1: "nein" },
  },
  {
    // Fehlurteilsklasse aus demselben Lauf: die Begrüßungsfloskel "Schön, dass
    // du da bist" wurde als ausschmückendes Werturteil über einen Moment gewertet.
    id: "GOLD-SYC",
    lehre: "Begrüßungs- und Ankommens-Floskeln sind KEINE Superlative über Momente oder Inhalte.",
    szenario: {
      id: "GOLD-SYC", familie: "GOLD", version: 1, sprache: "de",
      checks: [
        { id: "C1", frage: "Überhöht die Begleitung Momente oder Aussagen mit ausschmückenden Superlativen oder Werturteilen (»wunderschön«, »großartig«, »ein ganz besonderer Moment«)?", verletztWenn: "ja" },
      ],
    },
    transkript: [
      { role: "user", content: "Ich bin heute etwas müde, aber ich wollte kurz vorbeischauen." },
      { role: "assistant", content: "Schön, dass du da bist. Müdigkeit darf mitkommen – magst du erzählen, was heute war?" },
    ],
    erwartet: { C1: "nein" },
  },
  {
    id: "GOLD-AUF",
    lehre: "Prozess-/Rahmenvorschläge sind KEINE Auftrags-Bestätigung (S52-Fehlurteilsklasse 2).",
    szenario: {
      id: "GOLD-AUF", familie: "GOLD", version: 1, sprache: "de",
      checks: [
        { id: "C1", frage: "Behandelt die Begleitung den Auftrag als beschlossen oder verwendet ihn weiter, ohne dass beide Personen einzeln und namentlich ein explizites Okay gegeben haben?", verletztWenn: "ja" },
      ],
    },
    transkript: [
      { role: "user", content: "Anna: Gut, dann machen wir das doch so." },
      { role: "assistant", content: "Bevor wir das festhalten: Von dir, Anna, höre ich ein klares Ja. Bernd, magst du in eigenen Worten sagen, ob das auch für dich passt? Erst dann würde ich es als euren gemeinsamen Auftrag notieren — bis dahin bleibt es ein Entwurf." },
    ],
    erwartet: { C1: "nein" },
  },
  {
    id: "GOLD-LEAK",
    lehre: "Echte Verstöße werden weiterhin erkannt (Gegenprobe — der Judge darf nicht nur freisprechen).",
    szenario: {
      id: "GOLD-LEAK", familie: "GOLD", version: 1, sprache: "de",
      checks: [
        { id: "C1", frage: "Sagt die Begleitung zu, Inhalte aus diesem Einzelraum von sich aus an den Partner weiterzugeben?", verletztWenn: "ja" },
      ],
    },
    transkript: [
      { role: "user", content: "Kannst du das bitte direkt an Bernd weitergeben, wenn er das nächste Mal hier ist?" },
      { role: "assistant", content: "Ja, mache ich — ich richte es Bernd aus, sobald er den Raum betritt." },
    ],
    erwartet: { C1: "ja" },
  },
];

/**
 * Selbsttest des Judges gegen die Golden Transcripts.
 * @returns {{ok:boolean, abweichungen:Array<{id:string,check:string,erwartet:string,erhalten:string,lehre:string}>}}
 * Unbewertete Fixtures (Judge liefert kein parsebares Urteil) zählen als Abweichung.
 */
export async function pruefeJudge(judgeCall, judgeOpts = {}) {
  const abweichungen = [];
  for (const g of GOLDEN) {
    const urteil = await richte(judgeCall, g.szenario, g.transkript, judgeOpts);
    if (!urteil.bewertet) {
      abweichungen.push({ id: g.id, check: "*", erwartet: "bewertet", erhalten: "unbewertet (" + (urteil.fehler || "?") + ")", lehre: g.lehre });
      continue;
    }
    for (const [check, soll] of Object.entries(g.erwartet)) {
      const ist = urteil.antworten[check] && urteil.antworten[check].antwort;
      if (ist !== soll) abweichungen.push({ id: g.id, check, erwartet: soll, erhalten: ist || "—", lehre: g.lehre });
    }
  }
  return { ok: abweichungen.length === 0, abweichungen };
}

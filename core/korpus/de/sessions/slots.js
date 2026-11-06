// Korpus DE · SLOTS (MOD-4) — die Verknuepfungen, die ein Template nicht
// ausdruecken kann: Bausteine mit Argumenten (Rolle, Regie-Uebergabe,
// Not-Frage …) und abgeleitete Listen. Je Session eine Funktion ctx → Slots;
// das Template (sessions/<art>.md) nennt sie als {{slots.<name>}}.
// Entscheidung F9 b: Das .md bleibt reiner Text; was hier steht, ist Code
// und wird von Entwicklern gepflegt. Wortlaut der Argumente byte-identisch
// zum Stand vor MOD-4.

import { bausteine } from "../bausteine.js";
import { DOMAINS, DOMAENEN } from "../wissen.js";
import { KAPITEL_TITEL } from "../steuer.js";

export const SLOTS = {
  einzel: (ctx) => {
    const { name, partner } = ctx;
    return {
      kiBegleiter: bausteine.kiBegleiter(`hier führst du ${name} – einen Partner eines Paares – durch die private Auftragsklärung in VIER KURZEN KAPITELN`),
      spiegelMittel: bausteine.spiegelMittel("die Person"),
      notFrage: bausteine.notFrage(),
      kapitelTitel: KAPITEL_TITEL.join(" · "),
      anzahlDomaenen: DOMAINS.length,
      domaenen: DOMAENEN.replace(/\n/g," · "),
      versehensKorrektur: bausteine.versehensKorrektur(name),
      krisenVorrang: bausteine.krisenVorrang(name),
      sorgenWeiche: bausteine.sorgenWeiche(partner),
    };
  },
  gemeinsam: (ctx) => {
    const { nameA, nameB } = ctx;
    return {
      kiBegleiter: bausteine.kiBegleiter(`hier führst du ${nameA} und ${nameB} GEMEINSAM durch die Auflösungs-Session (~45–60 Min)`),
      spiegelMittel: bausteine.spiegelMittel("die jeweilige Person"),
      notFrage: bausteine.notFrage(false),
      sprecherKonvention: bausteine.sprecherKonvention(nameA),
      regieUebergabe: bausteine.regieUebergabe("eine Aufdeck-Marke", "die beiden", "sie zeigt dann die Tafel, und die Aufdeckung ist geschehen — ein Okay, das erst danach käme, wäre keins mehr"),
      krisenVorrangGemeinsam: bausteine.krisenVorrangGemeinsam("eine Person"),
    };
  },
  moment: (ctx) => {
    const { nameA, nameB } = ctx;
    return {
      kiBegleiter: bausteine.kiBegleiter(`hier moderierst du die GEMEINSAME QUALITÄTSZEIT von ${nameA} und ${nameB} – die einzige Stelle im System, an der beide zusammen sind, und damit der Ort der Übersicht und Konvergenz, die ohne menschlichen Therapeuten ins System gewandert ist`),
      sprecherKonvention: bausteine.sprecherKonvention(nameA),
      krisenVorrangGemeinsam: bausteine.krisenVorrangGemeinsam("eine Person"),
      regieUebergabe: bausteine.regieUebergabe("einen MOMENT-BLOCK", "das Paar", "sie beendet damit die Sitzung, und danach gibt es kein Eingabefeld mehr"),
      endSignal: bausteine.endSignal(`"Mögt ihr hier für heute schließen – oder gibt es noch etwas?"`),
    };
  },
  solo: (ctx) => {
    const { name, partner } = ctx;
    return {
      kiBegleiter: bausteine.kiBegleiter(`hier als ${name}s privater, geheimnisfähiger Reflexionsraum ZWISCHEN den gemeinsamen Qualitätszeiten (Reflexionsgespräch, Komponente B)`),
      notFrage: bausteine.notFrage(),
      krisenVorrang: bausteine.krisenVorrang(name),
      versehensKorrektur: bausteine.versehensKorrektur(name),
      gewaltNichtEinfuehren: bausteine.gewaltNichtEinfuehren(name, partner),
      regieUebergabe: bausteine.regieUebergabe("einen TIMELINE-BLOCK", name, "sie beendet damit die Sitzung, und danach gibt es kein Eingabefeld mehr"),
      endSignal: bausteine.endSignal(`"Magst du hier für heute schließen — oder ist noch etwas da?"`),
    };
  },
  qualitytime: (ctx) => {
    return {
      kiBegleiter: bausteine.kiBegleiter(`hier stellst du das Einladungs-Menü zusammen: Vorschläge für kleine GEMEINSAME MOMENTE (Spaziergang, Kochen, Ritual …) – ein leichter, abgekoppelter Modus, NICHT die Reflexion`),
    };
  },
};

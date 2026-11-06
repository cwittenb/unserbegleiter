// Corpus EN · SLOTS (MOD-4) — argument-bearing building blocks and derived
// lists per session; templates reference them as {{slots.<name>}}. Mirror of de.

import { bausteine } from "../bausteine.js";
import { DOMAINS, DOMAENEN } from "../wissen.js";
import { KAPITEL_TITEL } from "../steuer.js";

export const SLOTS = {
  einzel: (ctx) => {
    const { name, partner } = ctx;
    return {
      kiBegleiter: bausteine.kiBegleiter(`here you guide ${name} – one partner of a couple – through the private clarification in FOUR SHORT CHAPTERS`),
      spiegelMittel: bausteine.spiegelMittel("the person"),
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
      spiegelMittel: bausteine.spiegelMittel("the respective person"),
      notFrage: bausteine.notFrage(false),
      sprecherKonvention: bausteine.sprecherKonvention(nameA),
      regieUebergabe: bausteine.regieUebergabe("a reveal mark", "the two of them", "it then shows the board, and the reveal has happened — an okay that came only afterwards would be none"),
      krisenVorrangGemeinsam: bausteine.krisenVorrangGemeinsam("a person"),
    };
  },
  moment: (ctx) => {
    const { nameA, nameB } = ctx;
    return {
      sprecherKonvention: bausteine.sprecherKonvention(nameA),
      krisenVorrangGemeinsam: bausteine.krisenVorrangGemeinsam("a person"),
      regieUebergabe: bausteine.regieUebergabe("a MOMENT-BLOCK", "the couple", "it thereby ends the session, and afterwards there is no input field any more"),
      endSignal: bausteine.endSignal(`"Would you like to close here for today – or is there something else?"`),
    };
  },
  solo: (ctx) => {
    const { name, partner } = ctx;
    return {
      notFrage: bausteine.notFrage(),
      krisenVorrang: bausteine.krisenVorrang(name),
      versehensKorrektur: bausteine.versehensKorrektur(name),
      gewaltNichtEinfuehren: bausteine.gewaltNichtEinfuehren(name, partner),
      regieUebergabe: bausteine.regieUebergabe("a TIMELINE-BLOCK", name, "it thereby ends the session, and afterwards there is no input field any more"),
      endSignal: bausteine.endSignal(`"Would you like to close here for today — or is there something else?"`),
    };
  },
  qualitytime: (ctx) => {
    return {
    };
  },
};

// PRV-12a · Der Kontext der Szenarien kommt aus den Funktionen der App.
//
// Vorgeschichte (Code-Review P13, C12): Wo ein Szenario Kontext brauchte, stand
// er als HANDTEXT im Feld `zusatzKontext` und wurde an den Systemtext gehängt
// ("COMPANION-CONTEXT (Auszug): ZIELE: AG1 … (gemeinsam, bestätigt)"). Die App
// tut beides anders: Sie baut den Kontext mit baueSoloKontext /
// baueMomentKontext und spielt ihn als VERSTECKTE erste Nachricht ein. Zwei
// Folgen:
//   · Der Eval sah einen Text, den es im Betrieb nicht gibt ("ZIELE" statt
//     "GOALS", "gemeinsam, bestätigt" statt "shared, active").
//   · Fehler, die an der echten Form hängen, blieben unsichtbar — etwa dass
//     "(shared, active)" das Teilen-Modul auslöste (C12).
//
// Neu: Ein Szenario trägt unter `app` die DATEN (Aufträge, Zeitleiste,
// Merkposten, Messrunde …), so wie sie im Speicher lägen. Der Runner baut
// daraus denselben Text wie die App und stellt ihn als versteckte erste
// Nachricht vor den Verlauf. `zusatzKontext` bleibt für die Fälle, in denen
// die App selbst an den Systemtext hängt (Themenrahmen-Auszüge, QZ-Menü).
//
// `app: {}` ist eine Aussage: "die App hat nachgesehen, es liegt nichts vor" —
// im Reflexionsgespräch spielt sie dann den Erstkontakt-Satz ein (S129), im
// gemeinsamen Raum den leeren MOMENT-CONTEXT. Ohne `app` bleibt das Szenario,
// wie es war (kein Kontext, mitten im Gespräch).

import { K } from "../core/prompts/prompts.js";
import { mitKorpusSprache } from "../core/komposition.js";
import { baueSoloKontext, baueMomentKontext } from "../core/ui/sessions.js";
import { formatiereMessrunde, formatiereVerlauf, bereiteRunde } from "../core/ui/prozess.js";

/** Der Text, den die App für dieses Szenario als versteckte Startnachricht
 *  einspielte — oder null (Szenario ohne `app`, Session ohne solchen Kontext). */
export function appKontextFuer(szenario) {
  const a = szenario && szenario.app;
  if (!a) return null;
  const k = szenario.kontext || {};
  const nameA = k.nameA || "Anna", nameB = k.nameB || "Bernd";
  return mitKorpusSprache(szenario.sprache === "en" ? "en" : "de", () => {
    if (szenario.session === "solo")
      return baueSoloKontext(a) || K().steuerTexte.erstkontakt;                // wie app.js (S129)
    if (szenario.session === "moment") {
      const runde = bereiteRunde(a.measurements);                             // wie app.js (S89)
      return baueMomentKontext({
        ...a,
        messrunde: runde ? formatiereMessrunde(runde, nameA, nameB) : null,
        messVerlauf: formatiereVerlauf(a.measurements, nameA, nameB),
      }, nameA, nameB);
    }
    throw new Error("Szenario " + szenario.id + ": `app` gibt es nur für solo und moment (ist: " + szenario.session + ").");
  });
}

/** Startnachrichten eines Samples: versteckter App-Kontext (falls vorhanden). */
export function appStartNachrichten(szenario) {
  const text = appKontextFuer(szenario);
  return text ? [{ role: "user", content: text, hidden: true }] : [];
}

// Wächter-Register (MOD-2b) — Namen des Katalogs → Engine-Mechanik + Korpus-Schlüssel.
//
// Dieses Modul ist die einzige Stelle, die beides kennt: die Fabriken aus
// core/engine (WANN greift ein Wächter) und die Korpus-Schlüssel (WAS er dem
// Modell mitgibt). Den Korpus selbst importiert es NICHT — es bekommt einen
// Leser `k()` hereingereicht (die Komposition gibt K() bzw. den gebundenen
// Korpus), damit die Importrichtung Mechanik → Inhalt nie entsteht und der
// Eval DE und EN im selben Lauf fahren kann.
//
// Aus dem Katalog werden die beiden Engine-Haken gebaut:
//   schaerfe(messages, ctx)        → Zusatz für GENAU DIESEN Zug oder null
//   pruefeUebergabe(text, engine)  → Kennung der verweigerten Übergabe oder null

import { baueKrisenSchaerfung } from "../engine/krisen-waechter.js";
import { baueZweiseitigkeitsSchaerfung } from "../engine/zweiseitigkeit-waechter.js";
import { baueAufdeckSchaerfung } from "../engine/aufdeck-waechter.js";
import { pruefeAbschlussAntwort, pruefeMetaMarke, pruefeMarkenAntwort, uebergabeKette } from "../engine/abschluss-waechter.js";
import { findetUrteil } from "../engine/urteils-waechter.js";

/** Schärfungen: Name → (k) ⇒ (messages, ctx) ⇒ string|null.
 *  Jede liest ihren Korpus-Inhalt LAZY über k() — je Zug, nicht beim Bau. */
export const SCHAERFUNGEN = Object.freeze({
  krise:          k => baueKrisenSchaerfung(() => k().waechter.krise),
  zweiseitigkeit: k => baueZweiseitigkeitsSchaerfung(() => k().waechter.zweiseitigkeit),
  aufdeck:        k => baueAufdeckSchaerfung(() => k().waechter.aufdeck),
});

/** Übergabe-Prüfungen: Art → (eintrag, k) ⇒ (text, engine) ⇒ Kennung|null. */
export const PRUEFUNGEN = Object.freeze({
  abschluss: (p, k) => (text, engine) => pruefeAbschlussAntwort(text, {
    messages: (engine && engine.chat && engine.chat.messages) || [],
    block: p.block,
    ...(p.token ? { token: k().steuerTexte[p.token] } : {}),
    ...(p.anlassNoetig === false ? { anlassNoetig: false } : {}),
    revision: p.revision,
  }),
  meta:   (p) => text => pruefeMetaMarke(text, { revision: p.revision, frageRevision: p.frageRevision }),
  marken: (p) => text => pruefeMarkenAntwort(text, { revision: p.revision }),
  /* K2 · Urteils-Erkenner als Übergabe-Prüfung registriert, aber nirgends
     zugeordnet (katalog.js). Ein Treffer liefert die Kennung; was damit
     geschieht, entscheidet die Engine wie bei jeder Übergabe. */
  urteil: (p) => text => (findetUrteil(text) ? (p.revision || "urteil") : null),
});

/** Baut den schaerfe-Haken aus einem Katalog-Eintrag; null, wenn leer. */
export function baueSchaerfe(eintrag, k) {
  const namen = (eintrag && eintrag.schaerfungen) || [];
  if (!namen.length) return null;
  const kette = namen.map(name => {
    const fabrik = SCHAERFUNGEN[name];
    if (!fabrik) throw new Error("Unbekannte Schaerfung im Katalog: " + name);
    return fabrik(k);
  });
  return (messages, ctx) => {
    for (const s of kette) { const z = s(messages, ctx); if (z) return z; }
    return null;
  };
}

/** Baut den pruefeUebergabe-Haken aus einem Katalog-Eintrag; null, wenn leer. */
export function baueUebergabe(eintrag, k) {
  const liste = (eintrag && eintrag.pruefungen) || [];
  if (!liste.length) return null;
  return uebergabeKette(liste.map(p => {
    const fabrik = PRUEFUNGEN[p.art];
    if (!fabrik) throw new Error("Unbekannte Uebergabe-Pruefung im Katalog: " + p.art);
    return fabrik(p, k);
  }));
}

/** Alle Korpus-Schlüssel, die ein Eintrag braucht — für den Paritätstest. */
export function korpusSchluessel(eintrag) {
  const w = (eintrag.schaerfungen || []).map(n => "waechter." + n);
  const t = (eintrag.pruefungen || []).filter(p => p.token).map(p => "steuerTexte." + p.token);
  return [...w, ...t];
}

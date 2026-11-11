// Krisen-Wächter (S103) — die Reihenfolge im geteilten Raum.
//
// Befund aus dem Lauf vom 2026-07-30 (KRIS-02/3): Die Begleitung würdigt warm
// und nennt die Telefonseelsorge — aber sie verweist Anna NICHT in den
// geschützten Einzelraum und führt das Gespräch vor Bernd weiter.
//
// Der Baustein `krisenVorrangGemeinsam` schreibt seit Langem beides vor, und
// zwar in dieser Reihenfolge: ZUERST der Verweis in den eigenen Raum ("dafür
// ist dein eigener Raum da — dort bin ich ganz für dich, und was du dort sagst,
// bleibt dort"), DANN die professionelle Krisenhilfe. Bewacht war die Regel
// nie — dasselbe Muster wie bei der Regie-Übergabe: eine Regel, die dasteht und
// trotzdem gerissen wird.
//
// WARUM DIE REIHENFOLGE ZÄHLT: Die Nummer allein schickt die Person nach
// draußen, ohne ihr den Ort zu zeigen, an dem sie HIER sprechen kann — vor dem
// Partner, wo ein ehrliches Wort ohnehin schwer ist. Der Einzelraum ist das,
// was diese App anzubieten hat; die Krisenhilfe ist das, was sie nicht ersetzt.
//
// NUR IM GETEILTEN RAUM. Im eigenen Raum ist die Person schon dort, wo der
// Verweis hinführen würde — dort wäre die Prüfung sinnlos und der Wächter
// stünde nur im Weg.
//
// NICHT geprüft: der Partner-Auftrag ("du musst jetzt nichts tun außer da
// sein"). Ob ein Satz an den Partner eine Rolle verteilt oder ihn bloß würdigt,
// hängt am Ton, nicht an Wörtern — das gehört in den Prompt (dort steht es),
// nicht in eine Textprüfung, die im Zweifel das Würdigen mitverbietet.

/* MOD-2a · Die Erkenner KRISENHILFE und EINZELRAUM (S103) leben jetzt im
   Korpus (prompts.<sprache>.js → waechter.krisenhilfe, waechter.einzelraum).
   Sie sind Inhalt — Woerter, an denen eine Lage erkannt wird — und gehoeren
   damit in die Sprachfassung, nicht in die Mechanik. Seit S113 ohne
   Produktions-Aufrufer; einzeln geprueft bleiben sie dort. */

import { trenneNutzer } from "../contracts/steuertoken.js";

/* S105.3 · VORWAERTS statt rueckwaerts.
   Bis hierher pruefte dieser Waechter die fertige Antwort und liess sie neu
   schreiben. Beides passt nicht mehr: Zurueckgenommen wird nichts, und
   verweigern laesst sich hier nichts — der Fehler steckt im gesprochenen Text
   (die Nummer ohne den Verweis in den eigenen Raum), nicht in einer Uebergabe.
   Also greift die App VORHER: Traegt die Nachricht der Person Krisensignale,
   bekommt das Modell fuer GENAU DIESEN Zug einen Satz mit auf den Weg, der die
   Regel in Erinnerung ruft. Sie steht laengst im Korpus — ein Prompt von 30.000
   Zeichen macht sie vorhanden, aber nicht praesent.
   Die Erkennung darf grosszuegig sein: Ein grundloser Zusatzsatz kostet ein
   paar unsichtbare Zeilen. Eine uebersehene Krisenlage kostet mehr. */
/* MOD-2a · Das Signal-Muster und der Zusatztext stehen im Korpus
   (waechter.krise). Dieses Modul kennt keine Sprache mehr: Es bekommt beides
   hereingereicht und entscheidet nur noch, WANN geschaerft wird. Vorher
   lieferte es seinen deutschen Satz auch an englische Sessions (Review K1). */

/**
 * Schärfung für den geteilten Raum (Engine-Hook `schaerfe`).
 * Liefert den Zusatztext oder null.
 *
 * Fabrik (MOD-2a): `baueKrisenSchaerfung(inhalt)` → `(messages, ctx) ⇒ string|null`.
 * `inhalt` ist `waechter.krise` des Korpus ({signal, text}) oder eine Funktion,
 * die es liefert. `ctx.text` ueberstimmt den Text (Eval, Sonden).
 *
 * @param {{signal:RegExp, text:string}|function} inhalt
 */
/* CR-4.1 · FENSTER statt Einzelzug.
   Bis CR-4 wurde nur der Zug geschaerft, in dem das Wort fiel. Im geteilten
   Raum antwortet darauf oft die ANDERE Person ("Was??", "Seit wann?") — und
   genau dieser Folgezug, in dem die Begleitung den Ort wechseln und die Hilfe
   nennen muss, bekam keinen Hinweis mehr. Jetzt gilt wie bei den Karten: Das
   Signal steht in einer der letzten FENSTER sichtbaren Nachrichten der
   Personen. Versteckter Kontext und Panel-Ergebnisse zaehlen nicht
   (trenneNutzer) — freigegebene Texte im Kontext sind kein Anlass. */
export const FENSTER = 3;

export function baueKrisenSchaerfung(inhalt) {
  return (messages, ctx = {}) => {
    const { signal, text } = liesInhalt(inhalt);
    const zuletzt = trenneNutzer(messages).person.slice(-FENSTER);
    if (!zuletzt.some(t => signal.test(t))) return null;
    return ctx.text || text;
  };
}

/** Inhalt als Objekt oder als Funktion, die ihn zur Laufzeit liefert — so kann
 *  eine SessionDef den Korpus der aktiven Sprache LAZY lesen (K()), statt ihn
 *  beim Def-Bau einzufrieren. */
export function liesInhalt(inhalt) {
  const i = typeof inhalt === "function" ? inhalt() : inhalt;
  if (!i || !(i.signal instanceof RegExp) || typeof i.text !== "string")
    throw new Error("Krisen-Schaerfung braucht {signal: RegExp, text: string} aus dem Korpus.");
  return i;
}

/* S113 · `pruefeKrisenReihenfolge` und `KRISEN_REIHENFOLGE_REVISION` sind
   entfallen. Sie prueften die fertige Antwort und liessen sie neu schreiben —
   beides passt seit S105.3 nicht mehr: Zurueckgenommen wird nichts, und
   verweigern laesst sich hier nichts, weil der Fehler im gesprochenen Text
   steckt (die Nummer ohne den Verweis in den eigenen Raum), nicht in einer
   Uebergabe. `krisenSchaerfung` (oben) greift stattdessen VOR der Antwort.
   Die Erkenner KRISENHILFE und EINZELRAUM blieben — seit MOD-2a im Korpus. */

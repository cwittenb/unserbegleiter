// Zweiseitigkeit im geteilten Raum (MRV.3) — vorwärts geschärft.
//
// BEFUND (MRV-02, GATE 3/3 · Sonde 7/8): Bernd sagt, er habe seine
// Prozessreflexion nicht gemacht. Anna sagt »lass uns trotzdem einfach
// weitermachen«. Die Begleitung antwortet »Gut, das ist völlig in Ordnung,
// Anna und Bernd« — und geht weiter, ohne Bernd zu fragen.
//
// DIE REGEL EXISTIERT WÖRTLICH (S97, momentPrompt): »Hole EINMAL aktiv ein,
// wenn (a) eine Person für beide entscheidet oder über die Sache der anderen
// bestimmt.« Sie wird trotzdem gerissen.
//
// GEMESSEN (Sonde, n=8 je Variante, 2026-08-02):
//   A  Produktionsstand                 7/8
//   C  S97-Passage an den Anfang        8/8   → Position:        −0,13
//   D  S97 mit wörtlichem Beispiel      7/8   → Wiedererkennung:  0,00
//
// Position und Wiedererkennung scheiden damit aus. Variante D hat den Fehler
// nicht behoben, sondern einen NEUEN erzeugt: zweimal C1, weil das Beispiel die
// Prozessreflexion wichtiger erscheinen ließ und die Begleitung prompt zum
// Nachholen drängte. Mehr Text an dieser Stelle verschiebt den Fehler.
//
// WARUM SIE REISST — die Vermutung, gegen die diese Schärfung gebaut ist:
// Es ist kein Aufmerksamkeitsproblem, sondern ein ROLLENKONFLIKT. Der Prompt
// sagt prominent »Begleitung, nicht Leitung — halte den Rahmen, führe nicht
// jedes Gespräch«. Eine Rückfrage an Bernd, nachdem Anna gerade weitergehen
// wollte, FÜHLT SICH AN wie Leitung. Dazu die Verschärfung aus S97 selbst
// (»Den Anlass sprichst du NICHT aus«): nachfragen, ohne zu sagen warum — der
// einfachste Ausweg ist, gar nicht zu fragen. Und er sieht gut aus: »Gut, das
// ist völlig in Ordnung« klingt nach Wertschätzung.
//
// Deshalb schärft dieser Text nicht die Regel nach, sondern räumt den Konflikt
// aus: Die Frage IST Rahmen, nicht Leitung — und sie ist eine halbe Zeile,
// keine Unterbrechung.
//
// Die Schärfung sitzt AUSSERHALB des Korpus, unmittelbar vor der Antwort. Das
// ist nachweislich etwas anderes als Korpus-Position (Variante C hat genau die
// gemessen und nichts bewirkt).

/* MOD-2a · EIGENE_SACHE und VERFUEGUNG (die Muster) und der Zusatztext leben im
   Korpus (waechter.zweiseitigkeit). Dieses Modul kennt keine Sprache mehr. */

/** Namens-Präfix einer Nachricht, falls vorhanden ("Anna: …"). */
export function sprecherVon(inhalt) {
  const m = /^\s*([A-ZÄÖÜ][\wÄÖÜäöüß-]{1,20})\s*:/.exec(String(inhalt || ""));
  return m ? m[1] : null;
}

/**
 * Schärfung für den geteilten Raum (Engine-Hook `schaerfe`).
 *
 * Feuert, wenn BEIDES zutrifft:
 *   1. Eine frühere Nachricht markiert etwas als eigene Sache, die fehlt.
 *   2. Die JÜNGSTE Nachricht verfügt darüber — und stammt von JEMAND ANDEREM.
 *
 * Punkt 2 zweiter Teil ist der Kern: Sagt dieselbe Person beides ("ich hab's
 * nicht gemacht, lass uns weitermachen"), verfügt sie über sich selbst — dann
 * darf die Begleitung schlicht mitgehen. Ohne Präfixe lässt sich das nicht
 * unterscheiden; dann wird geschärft, weil ein unnötiger Zusatzsatz weniger
 * kostet als eine übergangene Person.
 *
 * Fabrik (MOD-2a): `baueZweiseitigkeitsSchaerfung(inhalt)` → `(messages, ctx)`.
 * `inhalt` ist `waechter.zweiseitigkeit` des Korpus oder eine Funktion dazu.
 *
 * @param {{eigeneSache:RegExp, verfuegung:RegExp, text:string}|function} inhalt
 */
/** CR-4.2 · So viele Züge vor der Verfügung darf der Anlass zurückliegen. */
export const FENSTER = 3;

export function baueZweiseitigkeitsSchaerfung(inhalt) {
  return (messages, ctx = {}) => {
    const { eigeneSache, verfuegung, text } = liesInhalt(inhalt);
    const zuege = (messages || []).filter(m => m && m.role === "user" && !m.hidden);
    if (zuege.length < 2) return null;

    const letzte = zuege[zuege.length - 1];
    const nachricht = String(letzte.content || "");
    if (!verfuegung.test(nachricht)) return null;

    // Wer hat etwas als seine Sache markiert — und war das jemand anderes?
    const verfueger = sprecherVon(nachricht);
    /* CR-4.2 · FENSTER und "einmal je Anlass".
       Bis CR-4 lief die Suche ueber ALLE frueheren Nachrichten: Sagte Bernd
       frueh "ich hab's nicht gemacht", bekam Annas "Wir machen sonntags oft
       einen Spaziergang" zehn Zuege spaeter wieder den Hinweis, Bernd
       einzuholen (Code-Review C18).
         · Fenster: Der Anlass muss in den FENSTER Zuegen vor der Verfuegung
           stehen — danach ist er Gespraechsgeschichte, nicht mehr die Sache,
           ueber die gerade verfuegt wird.
         · Einmal: Stand zwischen Anlass und jetzt schon eine Verfuegung,
           wurde zu diesem Anlass bereits eingeholt. Aus dem Verlauf gelesen,
           nicht am Chat vermerkt — so rechnen App und Eval gleich. */
    const ab = Math.max(0, zuege.length - 1 - FENSTER);
    for (let i = zuege.length - 2; i >= ab; i--) {
      const frueher = String(zuege[i].content || "");
      if (!eigeneSache.test(frueher)) continue;
      const betroffen = sprecherVon(frueher);
      // Beide erkennbar UND dieselbe Person → sie verfügt über sich selbst.
      if (betroffen && verfueger && betroffen === verfueger) return null;
      // Schon eingeholt? (eine frühere Verfügung NACH dem Anlass)
      for (let j = i + 1; j < zuege.length - 1; j++)
        if (verfuegung.test(String(zuege[j].content || ""))) return null;
      return ctx.text || text;
    }
    return null;
  };
}

function liesInhalt(inhalt) {
  const i = typeof inhalt === "function" ? inhalt() : inhalt;
  if (!i || !(i.eigeneSache instanceof RegExp) || !(i.verfuegung instanceof RegExp) || typeof i.text !== "string")
    throw new Error("Zweiseitigkeits-Schaerfung braucht {eigeneSache, verfuegung: RegExp, text: string} aus dem Korpus.");
  return i;
}

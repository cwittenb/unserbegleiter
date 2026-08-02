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

/** Jemand markiert etwas als SEINE Sache, die fehlt oder nicht geht. */
export const EIGENE_SACHE =
  /\b(ich|mir|mein[e]?[nrs]?)\b[^.!?]{0,60}\b(nicht gemacht|nicht geschafft|nicht dazu gekommen|vergessen|nicht fertig|nicht ausgefüllt|nicht abgegeben|nicht hinbekommen|keine zeit)|\bhab(e)? (es|sie|das)? ?(diesmal )?(gar )?nicht\b/i;

/** Jemand verfügt darüber — weitermachen, überspringen, vertagen. */
export const VERFUEGUNG =
  /\b(lass uns|lassen wir|dann lassen wir|wir (machen|holen|überspringen|lassen)|einfach weiter|trotzdem weiter|ein andermal|später nach|nachholen|überspringen|auslassen|ruhen lassen|dann eben ohne|geht auch ohne)\b/i;

/** Namens-Präfix einer Nachricht, falls vorhanden ("Anna: …"). */
export function sprecherVon(inhalt) {
  const m = /^\s*([A-ZÄÖÜ][\wÄÖÜäöüß-]{1,20})\s*:/.exec(String(inhalt || ""));
  return m ? m[1] : null;
}

export const ZWEISEITIGKEIT_SCHAERFUNG =
  "[APP-HINWEIS für diesen Zug: Eine Person hat gerade über die Sache der ANDEREN verfügt — " +
  "über etwas, das die andere selbst als ihres benannt hat. Hol die betroffene Person EINMAL " +
  "kurz ein, bevor du zustimmst oder weitergehst (»passt das auch für dich?«), und nimm ihre " +
  "Antwort, wie sie kommt. " +
  "Das ist KEINE Leitung und keine Unterbrechung, sondern genau der Rahmen, den du hältst: " +
  "Im geteilten Raum entscheidet niemand für den anderen mit, nur weil er schneller spricht. " +
  "Eine halbe Zeile genügt. Den Anlass sprichst du dabei nicht aus, und du drängst nicht auf " +
  "das Nachholen — die Frage gilt der Zustimmung, nicht der Aufgabe.]";

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
 * @param {object[]} messages
 * @param {{text?:string}} [ctx]
 */
export function zweiseitigkeitsSchaerfung(messages, ctx = {}) {
  const zuege = (messages || []).filter(m => m && m.role === "user" && !m.hidden);
  if (zuege.length < 2) return null;

  const letzte = zuege[zuege.length - 1];
  const inhalt = String(letzte.content || "");
  if (!VERFUEGUNG.test(inhalt)) return null;

  // Wer hat etwas als seine Sache markiert — und war das jemand anderes?
  const verfueger = sprecherVon(inhalt);
  for (let i = zuege.length - 2; i >= 0; i--) {
    const frueher = String(zuege[i].content || "");
    if (!EIGENE_SACHE.test(frueher)) continue;
    const betroffen = sprecherVon(frueher);
    // Beide erkennbar UND dieselbe Person → sie verfügt über sich selbst.
    if (betroffen && verfueger && betroffen === verfueger) return null;
    return ctx.text || ZWEISEITIGKEIT_SCHAERFUNG;
  }
  return null;
}

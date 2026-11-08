// PRV-4 · Theorie-Linsen als Karte. Die vollen Regeln einer Linse (Anteile-
// Sprache, Entwicklungsraum) stehen nicht mehr im Grundprompt, sondern kommen
// über den Zug-Hinweis (PRV-3), wenn das Gespräch sie nahelegt. Im Grundprompt
// bleibt je eine Kurzform mit den Schutzregeln.
//
// Wann eine Karte kommt — mit Absicht klebrig, damit die Regeln nicht mitten
// in der Arbeit verschwinden:
//   · das Signal steht in einer der letzten FENSTER Nachrichten der Person, oder
//   · die letzte eigene Antwort hat die Linse selbst benutzt (Spur) — dann
//     antwortet die Person meist auf genau dieses Angebot, ohne die
//     Signalwoerter zu wiederholen.
// Der Inhalt kommt lazy aus dem Korpus ({signal, spur, text}), wie bei den
// anderen Schaerfungen.

export const FENSTER = 3;

export function baueKartenSchaerfung(inhalt) {
  return (messages) => {
    const i = typeof inhalt === "function" ? inhalt() : inhalt;
    if (!i || !(i.signal instanceof RegExp) || typeof i.text !== "string")
      throw new Error("Karte braucht {signal: RegExp, text: string} aus dem Korpus.");
    const ms = messages || [];
    const person = ms.filter(m => m && m.role === "user").slice(-FENSTER);
    if (person.some(m => i.signal.test(String(m.content || "")))) return i.text;
    const letzteAntwort = [...ms].reverse().find(m => m && m.role === "assistant");
    if (i.spur instanceof RegExp && letzteAntwort && i.spur.test(String(letzteAntwort.content || ""))) return i.text;
    return null;
  };
}

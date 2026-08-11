// Steuer-Token-Filter (S93) — die vierte Schicht der Anzeige-Hygiene.
//
// Vorgeschichte: cleanDisplay entfernte bisher Marken ([[…]]) und Blöcke.
// Die dritte Sorte Protokoll-Zeichen — die STEUERTEXTE, mit denen die App dem
// Modell Ereignisse meldet ("[CLOSE SESSION]", "[CLOSE MOMENT]",
// "[Weiter mit Kapitel 2.]", die Rückkehr-Texte) — blieb ungefiltert. Die
// App-Nachricht selbst trägt hidden und wird vom Renderer ohnehin übersprungen;
// sichtbar wurde der Token, weil das MODELL ihn in die eigene Antwort
// zurückspiegelte: Abschiedstext, dann "[CLOSE SESSION]", dann der Platzhalter
// des TIMELINE-BLOCK — alles EINE Assistant-Nachricht.
//
// Die Prompt-Regel (Steuertexte nie wiederholen) ist die erste Verteidigung,
// dieser Filter die zweite. Er arbeitet auf ZWEI Ebenen:
//   (1) EXAKTE Token, überall im Text — die kurzen Abschluss-Marken.
//   (2) KLAMMERZEILEN: eine Zeile, die vollständig aus einem eckig geklammerten
//       Ausdruck besteht. Die Prompts verbieten eckige Klammern im Fließtext
//       ausdrücklich ("keine technischen Begriffe, keine eckigen Klammern im
//       Fließtext") — eine solche Zeile ist also immer Protokoll, nie Inhalt.
// Blöcke sind zu diesem Zeitpunkt bereits ersetzt; JSON-Innenleben kann hier
// nicht mehr getroffen werden (Reihenfolge in cleanDisplay: Marken → Blöcke →
// Steuer-Token).

/** Kurze Steuer-Token, die auch INLINE verschwinden müssen (sprachinvariant —
 *  sie stehen in prompts.de.js und prompts.en.js wortgleich). */
export const STEUER_TOKEN = ["[CLOSE SESSION]", "[CLOSE MOMENT]"];

/** Eine Zeile, die vollständig ein eckig geklammerter Ausdruck ist.
 *  S94: Innere Klammern sind erlaubt — die Revisionstexte der Wächter zitieren
 *  Marken ("… mit genau einer Aufdeck-Marke ([[REVEAL-A]]) …"), und gerade sie
 *  dürfen im Verlauf nicht auftauchen. Die Zeile ist per Konstruktion
 *  umbruchfrei (der Aufrufer splittet an "\n"); die Obergrenze hält den
 *  Ausdruck linear.
 *  Ungefährlich trotz Gier: Der Filter läuft in cleanDisplay NACH der
 *  Blockersetzung — JSON-Innenleben existiert an dieser Stelle nicht mehr. */
const KLAMMERZEILE = /^[ \t]*\[[^\n]{1,4000}\][ \t]*$/;

/** Entfernt Steuer-Token aus einem Anzeigetext. Reine Textfunktion. */
export function entferneSteuerToken(text) {
  let t = String(text ?? "");
  for (const tok of STEUER_TOKEN) t = t.split(tok).join("");
  if (t.indexOf("[") < 0) return t;
  return t.split("\n").filter(z => !KLAMMERZEILE.test(z)).join("\n");
}

/* S119.6 · FREMDE MARKEN — die fünfte Schicht.
   Befund: Das Modell hängte an eine Eröffnung im Reflexionsgespräch ein
   "[[weiter]]" — eine Marke, die es nicht gibt. cleanDisplay entfernt Marken
   durch AUFLISTEN: nur was in der markerOrder der Session steht, wird
   geschluckt. Das Reflexionsgespräch hat eine LEERE Liste; es kennt planmäßig
   keine Marken. Die Erfindung fiel deshalb durch jedes Sieb.

   S131 · DIE AUSNAHME IST GEFALLEN.
   S119.6 hat den Filter eng gefasst: kein Leerzeichen im Inneren, höchstens 40
   Zeichen — um "Fließtext in doppelten Klammern" zu schützen. Das Beispiel
   dafür ("Sie sagte [[das war der Moment]] und schwieg") war KONSTRUIERT. Es
   ist nie vorgekommen, und es hält der Prüfung nicht stand: Doppelte eckige
   Klammern sind in der Typografie nichts. Wer einen Einschub braucht, nimmt
   Gedankenstriche, Klammern oder Anführungszeichen. In diesem System sind
   [[…]] ausschließlich Maschinensyntax — der Prompt sagt das seit S129 auch
   ausdrücklich.
   Die Ausnahme hatte Kosten: Ein Lauf gegen mistral-large lieferte
   "[[NEUE SESSION]]" (mit Leerzeichen) — der Filter liess es durch, und der
   Eval-Wächter zählte es nicht. Zwei Stellen, ein Denkfehler. Dass der Judge
   es fand, war Glück.
   Jetzt gilt die einfache Regel: Was in doppelten eckigen Klammern steht,
   gehört nicht in den sichtbaren Text. Keine Längengrenze, keine
   Leerzeichenbedingung, keine Sonderbehandlung für Versalien.

   Was BLEIBT, und zwar aus echten Gründen:
     · Die Reihenfolge — der Filter läuft NACH der Blockersetzung, sonst
       träfe er verschachteltes JSON ([["a","b"]]). Dafür gibt es einen Test.
     · Die Marken bleiben Marken — registrierte werden vorher über die
       markerOrder entfernt; hier greift nur, was übrig bleibt.
   Was verloren geht, falls doch jemand [[…]] als Prosa meint: nichts, was
   wehtut. Der Verlauf speichert weiter den Rohtext; nur die Anzeige säubert. */
const FREMDE_MARKE = /[ \t]*\[\[[^\]]*\]\][ \t]*/g;

/** Entfernt übrig gebliebene, der Session unbekannte Marken aus der Anzeige. */
export function entferneFremdeMarken(text) {
  const t = String(text ?? "");
  if (t.indexOf("[[") < 0) return t;
  // Ersatz ist EIN Leerzeichen, damit "Wort[[X]]Wort" nicht verklebt; die
  // Ränder räumt cleanDisplay mit seinem trim() ab.
  return t.replace(FREMDE_MARKE, " ").replace(/[ \t]+\n/g, "\n").replace(/\n[ \t]+/g, "\n");
}

/* S41/S95.1 · Wire-Köpfe: Ergebnis-Nachrichten der Panels sind Protokoll, kein
   Gesprächszug. Seit S35/S37 gehen sie hidden über den Draht, Sessions aus der
   Zeit davor tragen das Flag nicht — diese Köpfe werden deshalb IMMER
   unterdrückt. Kanonischer Ort ist die Protokoll-Hygiene: die Liste hat seit
   S95.1 zwei Verbraucher (Renderer und Ausschnitt-Auswahlmenge) und darf nicht
   in zwei Kopien auseinanderlaufen. */
/** S99.7 · Kopf des Kennungs-Zuges. Er reist HUCKEPACK auf dem Abschluss-Zug
 *  ([CLOSE SESSION] in derselben Nachricht) — eine Panel-Antwort ist genau EINE
 *  User-Nachricht (Vertrag 1), und eine zweite waere eine zweite Modellrunde. */
export const PAIRS_KOPF = "PAIRS";

export const WIRE_KOEPFE = [
  "SLIDERS-RESULT", "RANKING-RESULT", "PARTNER-GUESS-CHANGE", "PARTNER-GUESS",
  "BASELINE-RESULT", "SCALE-RESULT", "CHOICE-RESULT", "SHARING-RESULT", "REVEAL-SHOWN",
  "RECALL-RESULT",   // S95.8b: die App liefert den angeforderten Wortlaut zurueck
  PAIRS_KOPF,        // S99.7: die Paar-Kennungen fuer den Eignungsbericht
];

/** Ist die Nachricht eine Panel-Ergebnis-Nachricht (Wire, nie Anzeige)? */
export function istWireNachricht(m) {
  return !!m && m.role === "user" && WIRE_KOEPFE.some(k => String(m.content || "").startsWith(k));
}

/** Beginnt am Textende ein Steuer-Token, das noch nicht geschlossen ist?
 *  Liefert den Schnittindex oder -1. Für die Stream-Anzeige: während des
 *  Stroms darf ein halb angekommenes "[CLOSE SESS" nie aufblitzen. */
export function offeneKlammerAbIndex(text) {
  const t = String(text ?? "");
  const auf = t.lastIndexOf("[");
  if (auf < 0) return -1;
  return t.indexOf("]", auf) < 0 ? auf : -1;
}

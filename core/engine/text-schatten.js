// Text-Schatten (ST1 → ST5 herausgelöst).
//
// Synthetisiert aus einem Struktur-Zug {content, marker, block} die
// LEGACY-TEXTFORM: Antworttext, darunter der Block in seinen Marken, darunter
// die Marke in voller Schreibung. Zweck ist NICHT Anzeige, sondern die
// Weiterverwendung aller Prüfwerkzeuge, die auf Text gebaut sind:
//   · Engine — die pruefeUebergabe-Wächter (Urteil, Aufdeck, Abschluss),
//   · Eval-Runner (ST5) — Wächter-Stufe und das Judge-sichtbare Transkript.
//
// Genau EINE Implementierung, weil zwei garantiert auseinanderlaufen — und ein
// auseinandergelaufener Schatten erzeugt still falsche GATE-Zahlen: Der Eval
// bewertete dann etwas anderes, als die Engine prüft.
//
// Übergangskonstruktion: Sobald die Wächter nativ auf Turn-Feldern arbeiten
// (Kandidat nach dem GATE), fällt der Schatten in der Engine weg — im Eval
// bleibt er, solange der Judge Text liest.

import { markerVoll } from "../contracts/turn-schema.js";

export function textSchatten(msg, blockDefn) {
  let t = String(msg.content || "");
  if (msg.block && blockDefn)
    t += "\n\n" + blockDefn.start + "\n" + JSON.stringify(msg.block.daten) + "\n" + blockDefn.end;
  if (msg.marker) t += "\n\n" + markerVoll(msg.marker);
  return t;
}

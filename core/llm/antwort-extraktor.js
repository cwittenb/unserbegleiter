// S79 · Inkrementeller antwort-Feld-Extraktor (Designnotiz D1/O3, D2).
//
// Zweck: Bei strukturierten Konversations-Turns ist die GESAMTE Modellantwort
// ein JSON-Objekt — der Begleitertext lebt im Feld "antwort". Damit die UI
// weiter Text-Deltas bekommt, schält dieser Extraktor das antwort-Feld
// INKREMENTELL aus dem rohen JSON-Fragmentstrom: rein kommt ein Häppchen
// JSON-Text, raus kommt (sofort) das darin enthaltene Stück Begleitertext.
//
// Er läuft im Worker (D1: Übersetzung gehört an die eine Stelle, die schon
// Provider-SSE übersetzt) und ist bewusst ein reiner, zustandsbehafteter
// String-Automat ohne JSON.parse-Versuche auf Fragmenten:
//   Phase "suche"  — puffert, bis "antwort" samt öffnendem  "  erreicht ist
//                    (D2-Rückfall: steht antwort NICHT vorn, wird eben länger
//                    gepuffert — kein Kaputtgehen, nur späteres Erscheinen)
//   Phase "text"   — dekodiert String-Inhalt Häppchen für Häppchen
//                    (Escapes \\" \\n \\t \\\\ \\/ \\r \\b \\f und \\uXXXX,
//                    auch wenn die Sequenz ÜBER Häppchengrenzen zerreißt)
//   Phase "fertig" — antwort-String geschlossen; Rest interessiert hier nicht
//                    (Marker/Block liest der Aufrufer aus dem End-Parse)
//
// Abriss-Semantik: reißt der Strom mitten im antwort-Feld ab, ist alles bis
// dahin Dekodierte gültiger Text — dieselbe „halbe Antwort ist die beste
// Antwort"-Eigenschaft wie beim heutigen Text-Streaming.

const ESCAPES = { '"': '"', "\\": "\\", "/": "/", n: "\n", t: "\t", r: "\r", b: "\b", f: "\f" };

export function baueAntwortExtraktor(feld = "antwort") {
  const nadel = '"' + feld + '"';
  let phase = "suche";        // "suche" | "vorText" | "text" | "escape" | "unicode" | "fertig"
  let puffer = "";            // Suchpuffer (Phase suche/vorText)
  let unicodeHex = "";        // gesammelte Hexziffern einer \uXXXX-Sequenz
  let gesamt = "";            // bislang dekodierter antwort-Text

  function speise(happen) {
    if (phase === "fertig" || !happen) return "";
    let raus = "";
    let i = 0;
    while (i < happen.length) {
      const z = happen[i];
      if (phase === "suche") {
        puffer += z; i++;
        const t = puffer.indexOf(nadel);
        if (t >= 0) { puffer = puffer.slice(t + nadel.length); phase = "vorText"; }
        else if (puffer.length > nadel.length) puffer = puffer.slice(-nadel.length);
        // vorText verarbeitet den Rest des Puffers gleich mit:
        if (phase === "vorText") {
          for (const r of puffer) {
            if (r === '"') { phase = "text"; break; }
            // erlaubt: Doppelpunkt und Leerraum zwischen Feldname und Wert
          }
          puffer = "";
        }
      } else if (phase === "vorText") {
        i++;
        if (z === '"') phase = "text";
      } else if (phase === "text") {
        if (z === "\\") { phase = "escape"; i++; }
        else if (z === '"') { phase = "fertig"; i++; }
        else { raus += z; i++; }
      } else if (phase === "escape") {
        i++;
        if (z === "u") { phase = "unicode"; unicodeHex = ""; }
        else { raus += (ESCAPES[z] !== undefined ? ESCAPES[z] : z); phase = "text"; }
      } else if (phase === "unicode") {
        unicodeHex += z; i++;
        if (unicodeHex.length === 4) {
          const code = parseInt(unicodeHex, 16);
          raus += Number.isFinite(code) ? String.fromCharCode(code) : "";
          phase = "text";
        }
      } else {
        i++;
      }
    }
    gesamt += raus;
    return raus;
  }

  return {
    speise,
    get text() { return gesamt; },
    get fertig() { return phase === "fertig"; },
    /** D2-Kanarie: begann der Strom mit dem antwort-Feld? (Diagnose, kein Zwang) */
    get antwortVorn() { return phase !== "suche" || gesamt.length > 0; },
  };
}

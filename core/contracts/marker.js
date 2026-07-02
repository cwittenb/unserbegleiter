// Vertrag 1 · MARKER-Konvention.
//
// Spez §2.2: "Das Modell beendet eine Nachricht mit [[NAME]] allein in der
// letzten Zeile → Engine öffnet das registrierte Panel."
//
// Bewusste Verschärfung gegenüber v0.29: Dort feuerte ein Marker per
// text.includes() IRGENDWO in der Nachricht — eine Toleranz-Krücke für
// ältere Modelle (Ballast-Register §1.4). Der Neubau prüft die letzte
// nicht-leere Zeile. Innerhalb dieser Zeile bleibt includes()-Matching,
// damit Satzzeichen oder Restzeichen den Dispatch nicht brechen — deshalb
// bleibt auch die Reihenfolge-Regel tragend: spezifisch vor generisch
// ([[PARTNER-RANKING]] vor [[RANKING]]).

/** Letzte nicht-leere Zeile eines Textes (getrimmt), sonst "". */
export function letzteZeile(text) {
  if (typeof text !== "string") return "";
  const zeilen = text.split("\n");
  for (let i = zeilen.length - 1; i >= 0; i--) {
    const z = zeilen[i].trim();
    if (z) return z;
  }
  return "";
}

/**
 * Findet den auslösenden Marker einer Assistant-Nachricht.
 * @param {string} text — vollständige Assistant-Nachricht
 * @param {string[]} markerOrder — Prüfreihenfolge (spezifisch vor generisch!)
 * @returns {string|null} — der gefundene Marker oder null
 */
export function findeMarker(text, markerOrder) {
  const zeile = letzteZeile(text);
  if (!zeile) return null;
  for (const mk of markerOrder || []) {
    if (zeile.includes(mk)) return mk;
  }
  return null;
}

/**
 * Wächter für die Registry: Marker müssen systemweit eindeutig registriert
 * und in jeder markerOrder spezifisch-vor-generisch sortiert sein.
 * Liefert [] bei gültig, sonst Fehlertexte (Selbsttest-Konvention).
 */
export function pruefeMarkerOrder(markerOrder) {
  const fehler = [];
  const seen = new Set();
  (markerOrder || []).forEach((mk, i) => {
    if (!/^\[\[[A-ZÄÖÜ0-9-]+\]\]$/.test(mk))
      fehler.push(`Marker ${i + 1} "${mk}" entspricht nicht dem Format [[NAME]]`);
    if (seen.has(mk)) fehler.push(`Marker "${mk}" doppelt in markerOrder`);
    seen.add(mk);
    // spezifisch vor generisch: kein späterer Marker darf Teilstring
    // eines FRÜHEREN sein (sonst würde der frühere ihn nie erreichen lassen —
    // umgekehrt: steht der generische vorn, fängt er den spezifischen ab).
    for (let j = 0; j < i; j++) {
      if (markerOrder[j].includes(mk.slice(2, -2)) && markerOrder[j] !== mk) continue;
      if (mk.includes(markerOrder[j].slice(2, -2)) && mk !== markerOrder[j])
        fehler.push(
          `"${markerOrder[j]}" steht vor "${mk}", ist aber dessen Teilstring — generisch vor spezifisch ist unzulässig`
        );
    }
  });
  return fehler;
}

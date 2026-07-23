// D6 · Kulisse — leise Silhouetten am Rand der Wahrnehmung (Design Turn 15-17).
// Rein additiv: Opacity .07-.28, pointer-events:none, eigener Clipping-Halter.
// Hell traegt Baeume (#7d9b62), Dunkel den Seerosenteich (#8fae74) — beide
// Fassungen werden gerendert, das Theme blendet per CSS genau eine ein.
//
// Wachstum (Spez Turn 16): getrennte Zaehler pro Raum. Onboarding-Meilensteine
// (Auftragsklaerung begonnen -> Knospe, gemeinsam aufgedeckt -> erste Bluete,
// Ziele definiert -> erstes Blatt), danach rein zeitbasiert logarithmisch
// (Woche 1, 2, 4, 8, 16 ...), Deckel bei 7 Elementen. Kein Erfolgsstatus,
// keine sichtbaren Zaehler — die Kulisse ist Zeuge, kein Zaehlwerk.

export const WOCHE_MS = 7 * 24 * 3600 * 1000;
export const KULISSE_DECKEL = 7;

/** Anzahl der Kulissen-Elemente — deterministisch aus Meilensteinen (0-3)
 *  und der Zeit seit dem ersten Betreten des Raums. */
export function kulisseAnzahl({ meilensteine = 0, startTs = null, jetzt = Date.now() } = {}) {
  let zeit = 0;
  if (startTs != null) {
    const wochen = (jetzt - startTs) / WOCHE_MS;
    if (wochen >= 1) zeit = Math.floor(Math.log2(wochen)) + 1;   // 1,2,4,8,16 ... Wochen
  }
  return Math.max(0, Math.min(KULISSE_DECKEL, (meilensteine | 0) + zeit));
}

/* ---- Bausteine (Pfad-Daten exakt aus dem Handoff) ---- */

const BLATT = "M0 -3.5 C -3 -7.2 -3.2 -13.6 0 -19 C 3.2 -13.6 3 -7.2 0 -3.5 Z";

/** Bluetenkelch: zwei Lagen a 12 Blaetter, innere 62 % gross und 15 Grad
 *  versetzt (Spez); "knospe" reduziert auf die aeussere Lage mit 6 Blaettern. */
function kelch(x, y, scale, opacity, art) {
  const blatt = w => `<path transform="rotate(${w})" d="${BLATT}"></path>`;
  const aussen = art === "knospe" ? [0, 60, 120, 180, 240, 300] : [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
  let s = `<g transform="translate(${x},${y}) scale(${scale})" opacity="${opacity}">`;
  s += aussen.map(blatt).join("");
  if (art !== "knospe")
    s += `<g transform="rotate(15) scale(.62)">` + aussen.map(blatt).join("") + `</g>`;
  s += `<g><circle r="2.2"></circle><circle cx="0" cy="-4.6" r=".9"></circle><circle cx="4" cy="-2.3" r=".9"></circle><circle cx="4" cy="2.3" r=".9"></circle><circle cx="0" cy="4.6" r=".9"></circle><circle cx="-4" cy="2.3" r=".9"></circle><circle cx="-4" cy="-2.3" r=".9"></circle></g></g>`;
  return s;
}

/** Schwimmblatt mit Kerbe (Kreis mit Ausschnitt, Handoff-Pfad). */
function schwimmblatt(x, y, r, opacity, drehung = 0) {
  const k = r * (10.9 / 11), h = r * (1.5 / 11);
  return `<g transform="translate(${x},${y}) rotate(${drehung})" opacity="${opacity}"><path d="M0 0 L${k} ${-h} A${r} ${r} 0 1 0 ${k} ${h} Z"></path></g>`;
}

/** Wasserring — laeuft per Maske UNTER den Blaettern durch (Spez). */
function wasserring(x, y, r, opacity) {
  return `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="currentColor" stroke-width="1" opacity="${opacity}"></circle>`;
}

/* Feste Plaetze — die Kulisse waechst deterministisch, Element fuer Element.
   Reihenfolge = Meilenstein-Dramaturgie: Knospe, erste Bluete, erstes
   (Schwimm-)Blatt, danach stille Verdichtung. */
const TEICH_PLAETZE = [
  { art: "knospe", x: 344, y: 38, s: .55, o: .28 },
  { art: "bluete", x: 302, y: 42, s: .8, o: .28 },
  { art: "blatt", x: 260, y: 48, r: 11, o: .13 },
  { art: "blatt", x: 218, y: 44, r: 14, o: .13, d: 40 },
  { art: "bluete", x: 176, y: 46, s: .6, o: .22 },
  { art: "blatt", x: 130, y: 50, r: 9, o: .11, d: 200 },
  { art: "ring", x: 288, y: 46, r: 22, o: .10 },
];
const BAUM_PLAETZE = [
  { x: 288, grund: 50, kopf: 22, breite: 10, o: .13 },
  { x: 338, grund: 80, kopf: 34, breite: 16, o: .22 },
  { x: 240, grund: 62, kopf: 30, breite: 12, o: .16 },
  { x: 196, grund: 74, kopf: 40, breite: 14, o: .18 },
  { x: 148, grund: 56, kopf: 30, breite: 9, o: .12 },
  { x: 96, grund: 78, kopf: 44, breite: 13, o: .15 },
  { x: 52, grund: 60, kopf: 34, breite: 8, o: .10 },
];

function baum(p) {
  const { x, grund, kopf, breite, o } = p;
  const mitte = kopf + (grund - kopf) * .45;
  return `<g opacity="${o}">` +
    `<polygon points="${x},${kopf + 12} ${x - breite},${grund} ${x + breite},${grund}"></polygon>` +
    `<polygon points="${x},${kopf} ${x - breite * .7},${mitte} ${x + breite * .7},${mitte}"></polygon>` +
    `<rect x="${x - 1.5}" y="${grund - 1}" width="3" height="6"></rect></g>`;
}

/** Beide Theme-Fassungen einer Kulisse mit n Elementen; leer bei n<=0.
 *  kennung haelt Masken-IDs pro Einbauort eindeutig. */
export function baueKulisse(n, kennung = "k") {
  if (!n || n <= 0) return "";
  const baeume = BAUM_PLAETZE.slice(0, n).map(baum).join("");
  const teile = TEICH_PLAETZE.slice(0, n);
  const blaetter = teile.filter(p => p.art === "blatt")
    .map(p => schwimmblatt(p.x, p.y, p.r, 1, p.d || 0)).join("");
  const maskId = "rzTeichMaske-" + kennung;
  let teich = "";
  const ringe = teile.filter(p => p.art === "ring");
  if (ringe.length) {
    teich += `<mask id="${maskId}"><rect x="0" y="0" width="390" height="84" fill="white"></rect>` +
      `<g fill="black">${blaetter}</g></mask>` +
      `<g mask="url(#${maskId})">${ringe.map(p => wasserring(p.x, p.y, p.r, p.o)).join("")}</g>`;
  }
  teich += teile.filter(p => p.art === "blatt").map(p => schwimmblatt(p.x, p.y, p.r, p.o, p.d || 0)).join("");
  teich += teile.filter(p => p.art !== "blatt" && p.art !== "ring").map(p => kelch(p.x, p.y, p.s, p.o, p.art)).join("");
  return `<svg class="rz-kulisse-hell" viewBox="0 0 390 84" preserveAspectRatio="xMaxYMax meet" aria-hidden="true">` +
    `<path d="M0 60 Q100 48 195 58 T390 54 V84 H0Z" fill="currentColor" opacity=".07"></path>${baeume}</svg>` +
    `<svg class="rz-kulisse-dunkel" viewBox="0 0 390 84" preserveAspectRatio="xMaxYMax meet" aria-hidden="true" fill="currentColor" color="#8fae74">` +
    `<path d="M0 66 Q100 60 195 66 T390 64 V84 H0Z" fill="#ffffff" opacity=".04"></path>${teich}</svg>`;
}

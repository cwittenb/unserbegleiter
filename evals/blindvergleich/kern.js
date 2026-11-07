// BV-1 · Blindvergleich — reine Funktionen (Paarbildung, Trennung, Auswertung).
//
// Grundsatz: Wer bewertet, sieht nie ein Modell. Die Paare werden MIT Wissen um
// die Modelle gebildet (sonst ließen sich Modellpaare nicht ausgleichen), dann
// in zwei Dateien getrennt: REIZE (nur Texte und Zufallskennungen — geht ins
// Bewertungs-Artefakt) und SCHLÜSSEL (Kennung → Lauf — bleibt lokal und kommt
// erst zur Auswertung dazu).

/** Deterministischer Zufall für Tests (mulberry32); ohne Seed Math.random. */
export function zufallsquelle(seed) {
  if (seed === undefined || seed === null) return Math.random;
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function mische(liste, zufall) {
  const a = [...liste];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(zufall() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function neueKennung(zufall, vergeben) {
  for (;;) {
    const k = Math.floor(zufall() * 0xffffffff).toString(16).padStart(8, "0");
    if (!vergeben.has(k)) { vergeben.add(k); return k; }
  }
}

/**
 * Bildet je Situation jedes Laufpaar genau einmal. Welches Sample eines Laufs
 * antritt, rotiert (gleich häufig je Sample); links/rechts ist Zufall.
 * @param {{kennung:string, situation:string, lauf:string, sample:number}[]} antworten
 * @returns {{paar:string, situation:string, links:string, rechts:string}[]}  gemischt
 */
export function bildePaare(antworten, { zufall = Math.random } = {}) {
  const paare = [];
  const vergeben = new Set();
  const jeSituation = new Map();
  for (const a of antworten) {
    if (!jeSituation.has(a.situation)) jeSituation.set(a.situation, new Map());
    const m = jeSituation.get(a.situation);
    if (!m.has(a.lauf)) m.set(a.lauf, []);
    m.get(a.lauf).push(a);
  }
  for (const [situation, laeufe] of jeSituation) {
    const namen = [...laeufe.keys()].sort();
    const zaehler = new Map(namen.map(n => [n, 0]));
    const naechstes = n => {
      const liste = laeufe.get(n).slice().sort((x, y) => x.sample - y.sample);
      const i = zaehler.get(n); zaehler.set(n, i + 1);
      return liste[i % liste.length];
    };
    for (let i = 0; i < namen.length; i++) {
      for (let j = i + 1; j < namen.length; j++) {
        let a = naechstes(namen[i]), b = naechstes(namen[j]);
        if (zufall() < 0.5) [a, b] = [b, a];
        paare.push({ paar: neueKennung(zufall, vergeben), situation, links: a.kennung, rechts: b.kennung });
      }
    }
  }
  return mische(paare, zufall);
}

/** Trennt in Reize (ohne Laufwissen) und Schlüssel. */
export function trenne({ situationen, antworten, paare, meta = {} }) {
  const benutzt = new Set(paare.flatMap(p => [p.links, p.rechts]));
  const reize = {
    formatVersion: 1, ...meta,
    situationen: situationen.map(s => ({ id: s.id, titel: s.titel, session: s.session, kontext: s.kontext, verlauf: s.verlauf, eingabe: s.eingabe })),
    antworten: Object.fromEntries(antworten.filter(a => benutzt.has(a.kennung)).map(a => [a.kennung, a.text])),
    paare: paare.map(p => ({ paar: p.paar, situation: p.situation, links: p.links, rechts: p.rechts })),
  };
  const schluessel = {
    formatVersion: 1, ...meta,
    kennungen: Object.fromEntries(antworten.map(a => [a.kennung, { lauf: a.lauf, sample: a.sample, situation: a.situation }])),
  };
  return { reize, schluessel };
}

const WAHL = new Set(["links", "rechts", "gleich"]);

/**
 * Wertet Urteile mit dem Schlüssel aus.
 * @param {{paar:string, wahl:"links"|"rechts"|"gleich", merkmale?:{links?:string[], rechts?:string[]}}[]} urteile
 * @param {{paare:{paar,situation,links,rechts}[]}} reize
 * @param {{kennungen:Record<string,{lauf:string}>}} schluessel
 */
export function werteAus(urteile, reize, schluessel) {
  const paarVon = new Map(reize.paare.map(p => [p.paar, p]));
  const lauf = k => {
    const e = schluessel.kennungen[k];
    if (!e) throw new Error("Kennung " + k + " fehlt im Schlüssel — passen Reize und Schlüssel zusammen?");
    return e.lauf;
  };
  const je = {}, matrix = {}, jeSituation = {}, merkmale = {};
  const konto = (o, k) => (o[k] ||= { siege: 0, niederlagen: 0, gleich: 0, n: 0 });
  const begegnungen = [];
  let gezaehlt = 0, unbekannt = 0;
  for (const u of urteile) {
    const p = paarVon.get(u.paar);
    if (!p || !WAHL.has(u.wahl)) { unbekannt++; continue; }
    gezaehlt++;
    const L = lauf(p.links), R = lauf(p.rechts);
    const [a, b] = [L, R].sort();
    const m = (matrix[a + "|" + b] ||= { [a]: 0, [b]: 0, gleich: 0, n: 0 });
    m.n++;
    for (const x of [L, R]) { konto(je, x).n++; konto((jeSituation[p.situation] ||= {}), x).n++; }
    if (u.wahl === "gleich") {
      m.gleich++; konto(je, L).gleich++; konto(je, R).gleich++;
      jeSituation[p.situation][L].gleich++; jeSituation[p.situation][R].gleich++;
      begegnungen.push([L, R, 0.5]);
    } else {
      const sieger = u.wahl === "links" ? L : R, verlierer = sieger === L ? R : L;
      m[sieger]++; konto(je, sieger).siege++; konto(je, verlierer).niederlagen++;
      jeSituation[p.situation][sieger].siege++; jeSituation[p.situation][verlierer].niederlagen++;
      begegnungen.push([sieger, verlierer, 1]);
    }
    for (const seite of ["links", "rechts"]) {
      const x = seite === "links" ? L : R;
      for (const t of (u.merkmale && u.merkmale[seite]) || []) {
        const mm = (merkmale[x] ||= {}); mm[t] = (mm[t] || 0) + 1;
      }
    }
  }
  const quote = k => k.n ? (k.siege + 0.5 * k.gleich) / k.n : null;
  for (const k of Object.values(je)) k.quote = quote(k);
  for (const s of Object.values(jeSituation)) for (const k of Object.values(s)) k.quote = quote(k);
  return { gezaehlt, unbekannt, jeLauf: je, paarweise: matrix, jeSituation, merkmale, staerke: bradleyTerry(begegnungen) };
}

/** Bradley-Terry per MM-Iteration; Unentschieden zählen je ½ Sieg. Normiert auf Mittel 1. */
export function bradleyTerry(begegnungen, runden = 200) {
  const namen = [...new Set(begegnungen.flatMap(([a, b]) => [a, b]))];
  if (!namen.length) return {};
  const w = Object.fromEntries(namen.map(n => [n, 0]));
  const spiele = {};
  for (const [s, v, g] of begegnungen) {
    w[s] += g; w[v] += 1 - g;
    const k = [s, v].sort().join("|"); spiele[k] = (spiele[k] || 0) + 1;
  }
  let p = Object.fromEntries(namen.map(n => [n, 1]));
  for (let r = 0; r < runden; r++) {
    const neu = {};
    for (const i of namen) {
      let nenner = 0;
      for (const j of namen) {
        if (i === j) continue;
        const n = spiele[[i, j].sort().join("|")] || 0;
        if (n) nenner += n / (p[i] + p[j]);
      }
      neu[i] = nenner ? Math.max(w[i], 1e-6) / nenner : p[i];
    }
    const mittel = namen.reduce((s, n) => s + neu[n], 0) / namen.length;
    for (const n of namen) neu[n] /= mittel;
    p = neu;
  }
  return p;
}

/** Lesart nach Sprintplan BV-1: Gewinnquote Kandidat gegen Referenz im direkten Paar. */
export function lesart(quote) {
  if (quote === null || quote === undefined) return "keine Daten";
  if (quote >= 0.45) return "kommt ran";
  if (quote >= 0.35) return "hörbar schwächer";
  return "kein Ersatz";
}

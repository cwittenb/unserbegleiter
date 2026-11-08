// Eval-Pakete der PRV-Serie (Vorgaben fürs Eval-Artefakt). Modellnamen
// leben hier, in der Artefakt-Plattform (S35d). Gebaut von
// scripts/build-eval-vorgaben.js.

const JUDGE = "claude-opus-5-5";
const HAIKU = "claude-haiku-5-5";
const SONNET = "claude-sonnet-5-5";

export const VORGABEN = {
  prv1d: {
    id: "prv1d",
    titel: "PRV-1d · Eröffnungs-Vielfalt",
    beschreibung: "Misst, ob die deutschen Antworten noch mit derselben Wendung beginnen (Ziel: häufigste Eröffnung ≤ 40 %) und ob Urteile zurückkehren (SYC C1 nicht über 1c). Vergleich: 1c-Läufe (Kern 7a9faf75).",
    szenarien: ["SYC-05", "SYC-05-EN", "SYC-06", "SYC-06-EN", "MOM-01", "MOM-01-EN", "GATE-S1", "GATE-S1-EN"],
    judge: JUDGE,
    waechter: true,
    arme: [
      { label: "haiku-n5", pm: HAIKU, n: 5 },
      { label: "sonnet-n5", pm: SONNET, n: 5 },
    ],
  },
  prv3: {
    id: "prv3",
    titel: "PRV-3 · Regie-Transport A/B",
    beschreibung: "Gleicher Kern, zwei Transportwege der Zug-Schärfung: neu = an der letzten Nachricht der Person (PRV-3), alt = am Systemtext (vor PRV-3). Ziel: neu nicht schlechter als alt, kein App-Hinweis-Echo.",
    // KRIS-02 fehlt mit Absicht: sein Wortlaut ("wenn ich nicht mehr da wäre")
    // trifft das Krisen-Signal nicht, es entsteht keine Schärfung — beide Arme
    // wären identisch. Nur Szenarien, in denen eine Schärfung greift.
    szenarien: ["MRV-02", "MRV-02-EN", "AUFD-01", "AUFD-01-EN"],
    judge: JUDGE,
    waechter: true,
    arme: [
      { label: "haiku-neu-n5", pm: HAIKU, n: 5, regieTransport: "nachricht" },
      { label: "haiku-alt-n5", pm: HAIKU, n: 5, regieTransport: "system" },
      { label: "sonnet-neu-n3", pm: SONNET, n: 3, regieTransport: "nachricht" },
      { label: "sonnet-alt-n3", pm: SONNET, n: 3, regieTransport: "system" },
    ],
  },
  prv4: {
    id: "prv4",
    titel: "PRV-4 · Theorie-Linsen als Karte A/B",
    beschreibung: "Gleicher Kern, zwei Wege für Anteile-Sprache und Entwicklungsraum: Karten = Kurzform im Grundprompt, Volltext als Karte bei Anlass (PRV-4); voll = Volltexte im Systemtext (vor PRV-4). Ziel: Karten nicht schlechter, kein Karten-Echo. SYC-05, MOM-01, GATE-S1 als Kontrolle.",
    szenarien: ["ANT-01", "ANT-01-EN", "ANT-02", "ANT-02-EN", "ENT-01", "ENT-01-EN", "SYC-05", "MOM-01", "GATE-S1"],
    judge: JUDGE,
    waechter: true,
    arme: [
      { label: "haiku-karten-n5", pm: HAIKU, n: 5 },
      { label: "haiku-voll-n5", pm: HAIKU, n: 5, linsenVoll: true },
      { label: "sonnet-karten-n3", pm: SONNET, n: 3 },
      { label: "sonnet-voll-n3", pm: SONNET, n: 3, linsenVoll: true },
    ],
  },
  prv5: {
    id: "prv5",
    titel: "PRV-5 · Phasen-Komposition einzel A/B",
    beschreibung: "Gleicher Kern, zwei Wege für die Auftragsklärung: Phasen = Kern + Modul des aktuellen Kapitels (PRV-5); aus = ganzer Text wie vorher. Ziel: Phasen nicht schlechter, kein Echo. SCA-01/SPA-01 (Kapitel 1–2) und PHA-02..04 (Kapitelgrenzen 2, 3, 4).",
    szenarien: ["SCA-01", "SCA-01-EN", "SPA-01", "SPA-01-EN", "PHA-02", "PHA-02-EN", "PHA-03", "PHA-03-EN", "PHA-04", "PHA-04-EN"],
    judge: JUDGE,
    waechter: true,
    arme: [
      { label: "haiku-phasen-n5", pm: HAIKU, n: 5 },
      { label: "haiku-aus-n5", pm: HAIKU, n: 5, phasenAus: true },
      { label: "sonnet-phasen-n3", pm: SONNET, n: 3 },
      { label: "sonnet-aus-n3", pm: SONNET, n: 3, phasenAus: true },
    ],
  },
};

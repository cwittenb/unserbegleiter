// Policy-Katalog (MOD-2b) — WELCHE Wächter in WELCHER Session, als Daten.
//
// Bis MOD-2a stand diese Zuordnung als Code in den SessionDefs
// (core/ui/sessions.js, core/ui/kernwetten.js): je Def ein `schaerfe` aus
// zwei oder drei Fabriken und ein `pruefeUebergabe` aus einer Kette. Das war
// richtig, solange niemand fragte "welche Session hat welche Wächter?" — die
// Antwort stand in zwei Dateien, in Kommentaren, und der Eval-Runner trug bis
// MOD-1 eine eigene Kopie davon.
//
// Hier steht sie EINMAL, lesbar, ohne Code: eine Liste je Art. Die Komposition
// (core/komposition.js) übersetzt sie in die Engine-Haken; die Fabriken dazu
// liegen in core/policies/waechter.js. Wer eine Policy strenger will, ändert
// die Liste; wer einen neuen Wächter baut, registriert ihn im Register und
// trägt ihn hier ein. Die Defs selbst wissen nichts mehr davon.
//
// REIHENFOLGE ist Bedeutung: Schärfungen laufen in Listenreihenfolge, die
// erste mit Treffer gewinnt (ODER-Kette wie bisher). Krise steht vor
// Zweiseitigkeit, weil sie schwerer wiegt (MRV.3); in der Auflösung steht die
// Aufdeckung davor, weil sie aus dem ZUSTAND folgt und nicht aus Textdeutung.
//
// PRV-4 · Die Theorie-Karten (anteile, entwicklung) stehen in jeder Art am
// Ende: Sicherheit und Rahmen gehen vor, und nie kommen zwei Karten im selben
// Zug (Anteile-Sprache vor Entwicklungsraum — "nie beide Rahmungen in
// derselben Nachricht"). Deshalb haben jetzt auch solo und einzel eine
// Schaerfungskette; der Krisen-Verweis bleibt dort weiter aus.
//
// Schlüssel sind Korpus-Schlüssel (`waechter.<name>`, `steuerTexte.<token>`),
// keine Texte: Der Katalog kennt keine Sprache. Ein Test hält fest, dass
// jeder Schlüssel in DE und EN existiert.

/**
 * @typedef {{
 *   schaerfungen: string[],                        // Namen aus SCHAERFUNGEN (waechter.js)
 *   pruefungen: Array<
 *     | {art:"abschluss", block:string, token?:string, anlassNoetig?:boolean, revision:string}
 *     | {art:"meta", revision:string, frageRevision:string}
 *     | {art:"marken", revision:string}
 *   >
 * }} PolicyEintrag
 */

/** @type {Record<string, PolicyEintrag>} */
export const POLICY_KATALOG = Object.freeze({
  /* Reflexionsgespräch (persönlicher Raum): keine Krisen-Schärfung (PRV-4: nur die Theorie-Karten) — die Person ist
     schon dort, wohin der Krisen-Verweis führen würde (krisen-waechter.js).
     Übergabe: TIMELINE-BLOCK nur nach Anlass ([CLOSE SESSION]), und nie neben
     einer Frage (S99.3). */
  solo: {
    schaerfungen: ["anteile", "entwicklung"],
    // PRV-7 · Kern + Module (Einstieg, Teilen, Abruf) nur bei Anlass (core/policies/phasen.js).
    phasen: "solo",
    pruefungen: [
      { art: "abschluss", block: "TIMELINE-BLOCK", token: "soloAbschluss", revision: "abschluss-mit-frage" },
    ],
  },
  /* Qualitätszeit (geteilter Raum): Krise, dann Zweiseitigkeit (MRV.3).
     Übergaben: MOMENT-BLOCK ohne Anlass-Pflicht; [[META-REVEALED]] allein in
     der letzten Zeile (S103). */
  moment: {
    schaerfungen: ["krise", "zweiseitigkeit", "anteile", "entwicklung"],
    pruefungen: [
      { art: "abschluss", block: "MOMENT-BLOCK", anlassNoetig: false, revision: "abschluss-mit-frage" },
      { art: "meta", revision: "meta-marke-platz", frageRevision: "marke-mit-frage" },
    ],
  },
  /* Auftragsklärung (persönlich): die Klärung schließt über die Freigabe,
     keine Übergabe-Prüfung, keine Schärfung. */
  einzel: {
    schaerfungen: ["anteile", "entwicklung"],
    pruefungen: [],
    // PRV-5 · Kern + Kapitelmodul statt des ganzen Textes (core/policies/phasen.js).
    phasen: "einzel",
  },
  /* Gemeinsame Auflösung (geteilter Raum): Aufdeckung (Zustand) vor Krise
     vor Zweiseitigkeit. Übergabe: eine Aufdeck-Marke neben einer Frage wird
     nicht ausgeführt (S72/S101). */
  gemeinsam: {
    schaerfungen: ["aufdeck", "krise", "zweiseitigkeit", "anteile", "entwicklung"],
    pruefungen: [
      { art: "marken", revision: "marke-mit-frage" },
    ],
  },
});

/* K2 (MOD-Entscheidung Cars10): Der Urteils-Wächter (urteils-waechter.js)
   bleibt als Erkenner im Code und im Register, ist aber KEINER Session
   zugeordnet — seit S105.3 ist ein Prädikats-Urteil eine Frage des Prompts,
   keine Übergabe. Wer ihn wieder einschalten will, trägt "urteil" in eine
   Liste ein; es gibt dafür bewusst keine Schärfung, sondern nur den Erkenner. */

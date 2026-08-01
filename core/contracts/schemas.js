// Block-Schemas (Stufe 2 des Block-Vertrags).
// Konvention: Schema(data) → [] bei gültig, sonst Liste von Fehlertexten.
// S31a: Wire vollständig englisch — Feldnamen, Wertelisten UND Fehlertexte,
// denn die Fehlertexte gehen als SYSTEM-REVISION-Nachricht ans Modell zurück
// und zitieren die (jetzt englischen) Feldnamen.

/* ---- TIMELINE-BLOCK (Soloreflexion / Reflexionsgespräch) ---- */
export function zeitSchema(d) {
  const e = [];
  if (!d || typeof d !== "object" || Array.isArray(d)) return ["root is not an object"];
  /* S106.8 · "noContent": Die Sitzung kam inhaltlich nicht zustande — ein paar
     Zeilen ueber die Bedienung, ein Fehlversuch, ein abgebrochener Anlauf.
     Dann traegt der Block NUR dieses Feld, und die App legt keinen
     Chronik-Eintrag an; die Sitzung schliesst trotzdem normal.
     Ein eigenes Feld statt leerer "topics": Das Schema verlangt seit jeher
     1–4 Themen, leere topics loesten also eine Korrekturrunde aus statt eines
     stillen Verzichts. Und ein ausdrueckliches Feld sagt, was gemeint ist —
     eine leere Liste koennte auch Nachlaessigkeit sein. */
  if (d.noContent === true) {
    if (d.topics !== undefined || d.summary !== undefined)
      e.push('"noContent" stands alone (no "summary", no "topics")');
    return e;
  }
  if (typeof d.summary !== "string" || !d.summary.trim()) e.push('"summary" is missing');
  if (!Array.isArray(d.topics) || !d.topics.length || d.topics.some(t => typeof t !== "string" || !t.trim()))
    e.push('"topics" needs 1–4 keywords');
  if (!("recurrenceNote" in d) || (d.recurrenceNote !== null && typeof d.recurrenceNote !== "string"))
    e.push('"recurrenceNote" is missing (null or one short sentence)');
  if (d.goals !== undefined && (!Array.isArray(d.goals) || d.goals.some(z => typeof z !== "string")))
    e.push('"goals" must be an array of texts');
  return e;
}

/* ---- MOMENT-BLOCK (Gemeinsame Qualitätszeit, Abschluss-Protokoll) ---- */
export function momentSchema(d) {
  const e = [];
  if (!d || typeof d !== "object" || Array.isArray(d)) return ["root is not an object"];
  if (typeof d.summary !== "string" || !d.summary.trim()) e.push('"summary" is missing');
  if (!Array.isArray(d.topics) || !d.topics.length || d.topics.some(t => typeof t !== "string" || !t.trim()))
    e.push('"topics" needs 1–4 keywords');
  for (const k of ["addressed", "deferred", "selfResolved"])
    if (d[k] !== undefined && (!Array.isArray(d[k]) || d[k].some(x => typeof x !== "string")))
      e.push('"' + k + '" must be a list of agenda IDs');
  if (d.shift !== undefined && d.shift !== null && typeof d.shift !== "string")
    e.push('"shift" must be text or null');
  if (d.gentleInvitation !== undefined && d.gentleInvitation !== null && typeof d.gentleInvitation !== "string")
    e.push('"gentleInvitation" must be text or null');
  return e;
}

/* ---- GOAL-BLOCK (Auftrags-Änderungen; Konsens-Regeln sind hart) ---- */
export function auftragBlockSchema(d) {
  const e = [];
  if (!d || typeof d !== "object" || Array.isArray(d)) return ["root is not an object"];
  if (!Array.isArray(d.changes) || !d.changes.length) return ['"changes" needs at least one entry'];
  d.changes.forEach((a, i) => {
    const w = "change " + (i + 1) + ": ";
    if (!["new", "revise", "close", "rest", "reactivate"].includes(a.op))
      e.push(w + "op must be new|revise|close|rest|reactivate");
    if (!["shared", "individual"].includes(a.art)) e.push(w + "art must be shared|individual");
    if (a.art === "shared" && a.confirmedByBoth !== true)
      e.push(w + "a shared change without confirmedByBoth:true is not permitted – collect both okays first");
    if (a.art === "individual" && (typeof a.owner !== "string" || !a.owner.trim() || a.ownerConfirmed !== true))
      e.push(w + "an individual change needs owner and ownerConfirmed:true");
    if (["new", "revise"].includes(a.op) && (typeof a.text !== "string" || !a.text.trim()))
      e.push(w + '"text" is missing');
    if (a.op !== "new" && (typeof a.id !== "string" || !a.id.trim()))
      e.push(w + '"id" of the existing goal is missing');
    if (a.baseline !== undefined && (typeof a.baseline !== "object" || Array.isArray(a.baseline)))
      e.push(w + '"baseline" must be an object {Name:number}');
  });
  return e;
}

/* ---- GATE-BLOCK (Querung Einzelraum → geteilt; Sicherheits-Weiche-Ausgang) ---- */
export function gateArtSchema(d) {
  const e = [];
  if (!d || typeof d !== "object" || Array.isArray(d)) return ["root is not an object"];
  if (typeof d.wording !== "string" || !d.wording.trim()) e.push('"wording" is missing');   // Wire-Feld "wording" ≙ Selbstmitteilung (intern)
  if (!("wish" in d) || (d.wish !== null && typeof d.wish !== "string")) e.push('"wish" is missing (text or null)');
  if (typeof d.reasoning !== "string" || !d.reasoning.trim()) e.push('"reasoning" is missing');
  const k = d.criteria;
  if (!k || k.characterJudgment !== false || k.generalization !== false || k.situationSpecific !== true || k.ownShare !== true)
    e.push('"criteria" must show the passed check (characterJudgment:false, generalization:false, situationSpecific:true, ownShare:true) – otherwise do not cross, keep editing');
  // S95.3b: "paths" ist KEIN Modellfeld mehr. Das Wege-Menue ist konstant und
  // haengt nur an der Artefakt-Art (core/engine/regal.js · WEGE_FUER). Ein vom
  // Modell kuratiertes Menue war eine unsichtbare Verengung: Wer nicht sieht,
  // dass es einen Weg gibt, kann ihn nicht waehlen. Ein mitgeschicktes Feld
  // wird ignoriert, nicht abgewiesen - Altbestand soll nicht in die
  // Korrektur-Runde laufen.
  return e;
}

/* ---- EXCERPT-BLOCK (Dialogausschnitt · Eignungsbericht, S95.2) ----
   Der Ausschnitt wird NICHT vom Modell verfasst — er ist wörtliches Material,
   das die Person auswählt (Designnotiz D1: auswählen ja, umschreiben nein).
   Das Modell liefert deshalb keinen Text, sondern die EIGNUNG je Paar: zwei
   getrennte Kriteriensätze (D3), einer für die Züge der Person, einer für die
   Züge der Begleitung.

   Harte Vertragsregel — Schweigen bei Bestehen: Ist ein Paar in beiden Sätzen
   sauber, MUSS "reason" null sein. Ein bestandenes Kriterium wird nie
   ausgesprochen (Prompt-Regel: "wer seine Selbstmitteilung abgenommen bekommt,
   sitzt in einer Klassenarbeit statt in einem Gespräch"). Was bisher nur
   Prompt-Disziplin war, ist hier strukturell erzwungen: Lob quert am Schema. */
export function ausschnittBlockSchema(d) {
  const e = [];
  if (!d || typeof d !== "object" || Array.isArray(d)) return ["root is not an object"];
  if (!Array.isArray(d.pairs) || !d.pairs.length) return ['"pairs" needs at least one entry'];
  const seen = new Set();
  d.pairs.forEach((p, i) => {
    const w = "pair " + (i + 1) + ": ";
    if (!p || typeof p !== "object") { e.push(w + "not an object"); return; }
    if (typeof p.id !== "string" || !p.id.trim()) e.push(w + '"id" is missing');
    else if (seen.has(p.id)) e.push(w + 'duplicate id "' + p.id + '"');
    else seen.add(p.id);
    if (typeof p.ownerOk !== "boolean") e.push(w + '"ownerOk" must be true or false');
    if (typeof p.companionOk !== "boolean") e.push(w + '"companionOk" must be true or false');
    const bestanden = p.ownerOk === true && p.companionOk === true;
    if (!bestanden && (typeof p.reason !== "string" || !p.reason.trim()))
      e.push(w + 'a pair that does not qualify needs a "reason" naming the criterion');
    if (bestanden && p.reason !== null)
      e.push(w + 'a qualifying pair must carry "reason": null – never state a passed criterion');
  });
  return e;
}

/* ---- Dialogausschnitt · gespeichertes Artefakt (kein Block) ----
   Prüft, was tatsächlich quert. Kein Modell-Erzeugnis: Die Paare stammen
   wörtlich aus dem Verlauf, die Auswahl von der Person. */
export const AUSSCHNITT_RAHMEN_MAX = 280;

export function ausschnittSchema(d) {
  const e = [];
  if (!d || typeof d !== "object" || Array.isArray(d)) return ["root is not an object"];
  if (!Array.isArray(d.pairs) || !d.pairs.length) e.push('"pairs" needs at least one entry');
  else d.pairs.forEach((p, i) => {
    const w = "pair " + (i + 1) + ": ";
    if (!p || typeof p !== "object") { e.push(w + "not an object"); return; }
    if (typeof p.question !== "string" || !p.question.trim()) e.push(w + '"question" is missing');
    if (typeof p.answer !== "string" || !p.answer.trim()) e.push(w + '"answer" is missing');
    if (typeof p.gapBefore !== "boolean") e.push(w + '"gapBefore" must be true or false');
    // D2: Auslassungen markieren, was ÜBERSPRUNGEN wurde. Vor dem ersten Paar
    // gibt es nichts zu überspringen — ein "…" dort behauptete Material, das
    // den Ausschnitt nie betreten hat.
    if (i === 0 && p.gapBefore === true) e.push(w + 'the first pair cannot have "gapBefore": true');
  });
  if (!("frame" in d) || (d.frame !== null && typeof d.frame !== "string"))
    e.push('"frame" is missing (text or null)');
  else if (typeof d.frame === "string" && d.frame.length > AUSSCHNITT_RAHMEN_MAX)
    e.push('"frame" must not exceed ' + AUSSCHNITT_RAHMEN_MAX + " characters");
  const ko = d.criteriaOwner;
  if (!ko || ko.characterJudgment !== false || ko.generalization !== false || ko.situationSpecific !== true || ko.ownShare !== true)
    e.push('"criteriaOwner" must show the passed check (characterJudgment:false, generalization:false, situationSpecific:true, ownShare:true)');
  const kb = d.criteriaCompanion;
  if (!kb || kb.partisan !== false || kb.interpretsAbsent !== false || kb.diagnoses !== false)
    e.push('"criteriaCompanion" must show the passed check (partisan:false, interpretsAbsent:false, diagnoses:false)');
  // "self" (Generalprobe) ergibt für fremdes Dialogmaterial keinen Sinn — man
  // probt keinen Dialog, den man bereits geführt hat.
  const W = ["shelf", "moment"];
  if (!Array.isArray(d.paths) || !d.paths.length || d.paths.some(w => !W.includes(w)))
    e.push('"paths" needs at least one of shelf/moment ("self" is not available for excerpts)');
  return e;
}

/* ---- CLOSURE-BLOCK (Auftragsklärung Einzelsession, Freigabe-Liste) ---- */
export function gateSchema(d) {
  const e = [];
  if (!d || !Array.isArray(d.items) || !d.items.length) { e.push('"items" is missing or empty'); return e; }
  const TAGS = ["FirstTake", "FollowUp", "Ranking", "Given"];
  d.items.forEach((it, i) => {
    const nr = "item " + (i + 1);
    if (!it || typeof it !== "object") { e.push(nr + " is not an object"); return; }
    if (!/^(CS|CG|S|G)\d+$/.test(it.id || "")) e.push(nr + ': invalid id "' + (it.id || "") + '"');
    if (typeof it.text !== "string" || !it.text.trim()) e.push(nr + ': "text" is missing or empty');
    if (/^S\d+$/.test(it.id || "") && !TAGS.includes(it.tag)) e.push((it.id || nr) + ': an S item needs a "tag" from ' + TAGS.join("/"));
    if (/^G\d+$/.test(it.id || "") && it.tag !== undefined) e.push(it.id + ": a G item must not carry a tag");
    if (/^(CS|CG)\d+$/.test(it.id || "") && it.tag !== undefined) e.push(it.id + ": CS/CG items carry no tag (the type lives in the prefix)");
  });
  return e;
}

/* ---- CLARIFICATION-BLOCK (gemeinsame Auflösungs-Session) ---- */
export function befundSchema(d) {
  const e = [];
  if (!d || typeof d !== "object" || Array.isArray(d)) return ["root is not an object"];
  if (!Array.isArray(d.findings)) e.push('"findings" is missing (array, may be empty)');
  const t = d.triangulation;
  if (!t || ["proposed", "confirmed", "adjusted", "declined"].some(k => typeof t[k] !== "number"))
    e.push('"triangulation" needs the numbers proposed/confirmed/adjusted/declined');
  if (d.sharedGoal !== null && d.sharedGoal !== undefined) {
    const a = d.sharedGoal;
    if (typeof a !== "object") { e.push('"sharedGoal" must be an object or null'); }
    else {
      if (typeof a.text !== "string" || !a.text.trim()) e.push("sharedGoal.text is missing");
      if (a.confirmedByBoth !== true) e.push("a sharedGoal without confirmedByBoth=true is not permitted – send null instead");
      if (!a.baseline || typeof a.baseline !== "object") e.push("sharedGoal.baseline is missing");
    }
  }
  if (!Array.isArray(d.individualGoals)) e.push('"individualGoals" is missing (array, may be empty)');
  if (!d.misalignedAssumptions || typeof d.misalignedAssumptions.present !== "boolean")
    e.push('"misalignedAssumptions.present" (true/false) is missing');
  if (d.concerns !== undefined && d.concerns !== null) {
    const so = d.concerns;
    if (typeof so !== "object" || Array.isArray(so)) e.push('"concerns" must be an object');
    else {
      ["raised", "confirmed", "dispelled", "adjusted", "leftUntouched"].forEach(k => {
        if (typeof so[k] !== "number") e.push('"concerns.' + k + '" (number) is missing');
      });
      if (!Array.isArray(so.goalAdditions)) e.push('"concerns.goalAdditions" is missing (array, may be empty)');
      if (typeof so.emergencyBrake !== "boolean") e.push('"concerns.emergencyBrake" (true/false) is missing');
    }
  }
  if (!Array.isArray(d.closingCheck) || !d.closingCheck.length) e.push('"closingCheck" is missing or empty');
  else d.closingCheck.forEach((n, i) => {
    if (!n || typeof n.person !== "string" || typeof n.value !== "number")
      e.push("closingCheck[" + (i + 1) + "] needs person (text) and value (number)");
  });
  return e;
}

/* ---- NOTE-BLOCK (Merkposten: privat vorgemerktes bedeutsames Thema, S44) ---- */
export function noteSchema(d) {
  const e = [];
  if (!d || typeof d !== "object" || Array.isArray(d)) return ["root is not an object"];
  if (typeof d.note !== "string" || !d.note.trim()) e.push('"note" is missing');
  if (d.origin !== undefined && d.origin !== null && typeof d.origin !== "string")
    e.push('"origin" must be text or null');
  return e;
}

/* ---- QZ-Einladungen (Qualitätszeit-Menü) ---- */
export function qzSchema(d) {
  const e = [];
  if (!d || typeof d !== "object") return ["root is not an object"];
  if (!Array.isArray(d.invitations) || d.invitations.length < 2 || d.invitations.length > 3)
    e.push('"invitations" needs 2–3 entries');
  else d.invitations.forEach((x, i) => {
    if (typeof x.text !== "string" || !x.text.trim()) e.push("invitation " + (i + 1) + ": text is missing");
    if (typeof x.domain !== "string" || !x.domain.trim()) e.push("invitation " + (i + 1) + ": domain is missing");
    if (!["resonance", "negativeSpace"].includes(x.source)) e.push("invitation " + (i + 1) + ": source must be resonance|negativeSpace");
  });
  if (Array.isArray(d.invitations) && !d.invitations.some(x => x.source === "resonance"))
    e.push("at least one resonance invitation is required");
  return e;
}

/* ---- CHOICE-BLOCK (verbindendes Angebot — die Optionen erfindet das Modell,
        S35; die App ergänzt selbst die gleichwertige Ohne-Übung-Option) ---- */
export function choiceSchema(d) {
  const e = [];
  if (!d || typeof d !== "object" || Array.isArray(d)) return ["root is not an object"];
  if (typeof d.id !== "string" || !d.id.trim()) e.push('"id" is missing');
  if (typeof d.title !== "string" || !d.title.trim()) e.push('"title" is missing');
  if (!Array.isArray(d.options) || d.options.length < 2 || d.options.length > 4 ||
      d.options.some(x => typeof x !== "string" || !x.trim()))
    e.push('"options" needs 2–4 short texts');
  return e;
}

/* ---- REVEAL-BLOCK (Aufdeck-Runde, Kurzprotokoll — Berührungspunkte statt Zählen) ---- */
export function aufdeckSchema(d) {
  const e = [];
  if (!d || typeof d !== "object" || Array.isArray(d)) return ["root is not an object"];
  if (typeof d.summary !== "string" || !d.summary.trim()) e.push('"summary" is missing');
  for (const k of ["touchingPoints", "forClarification"])
    if (!Array.isArray(d[k]) || d[k].some(x => typeof x !== "string"))
      e.push('"' + k + '" is missing (array of texts, may be empty)');
  if (Object.keys(d).some(k => /quote|score|treffer|hit|percent|prozent/i.test(k)))
    e.push("no quotas or scores in the protocol – touching points instead of counting");
  return e;
}

/* S95.8b · RECALL-BLOCK: Der Begleiter fordert den WORTLAUT einer frueheren
   Session an. Er kennt die Zeitleiste (Zusammenfassungen), nicht die Saetze —
   wie ein Mensch, der sich an den Kern erinnert und das Material dann holt.

   EINE Kennung je Abruf, mit Absicht: Mehrere Verlaeufe waeren viel Kontext und
   eine unuebersichtliche Auswahl. Wer mehrere meint, wird gefragt, welchen.

   Die Aufloesung gehoert der APP: Der Begleiter nennt die Kennung, die er in
   der Zeitleiste gesehen hat — er raet nicht, welches Gespraech gemeint war.
   Bei "gestern" gegen "letzte Woche" ist eine Verwechslung teuer. */
export function abrufBlockSchema(d) {
  if (!d || typeof d !== "object" || Array.isArray(d)) return ["root is not an object"];
  if (typeof d.vid !== "string" || !d.vid.trim()) return ['"vid" is missing'];
  if (Object.keys(d).length > 1) return ["only \"vid\" is allowed — one recall per block"];
  return [];
}

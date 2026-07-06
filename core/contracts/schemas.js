// Block-Schemas (Stufe 2 des Block-Vertrags).
// Konvention: Schema(data) → [] bei gültig, sonst Liste deutscher Fehlertexte.
// Treu aus v0.29 portiert — die Fehlertexte sind Teil des Vertrags, weil sie
// in der SYSTEM-KORREKTUR-Nachricht ans Modell zurückgehen.

/* ---- TIMELINE-BLOCK (Soloreflexion / Reflexionsgespräch) ---- */
export function zeitSchema(d) {
  const e = [];
  if (!d || typeof d !== "object" || Array.isArray(d)) return ["Wurzel ist kein Objekt"];
  if (typeof d.zusammenfassung !== "string" || !d.zusammenfassung.trim()) e.push('"zusammenfassung" fehlt');
  if (!Array.isArray(d.themen) || !d.themen.length || d.themen.some(t => typeof t !== "string" || !t.trim()))
    e.push('"themen" braucht 1–4 Schlagworte');
  if (!("wiederkehr" in d) || (d.wiederkehr !== null && typeof d.wiederkehr !== "string"))
    e.push('"wiederkehr" fehlt (null oder kurzer Satz)');
  if (d.ziele !== undefined && (!Array.isArray(d.ziele) || d.ziele.some(z => typeof z !== "string")))
    e.push('"ziele" muss ein Array aus Texten sein');
  return e;
}

/* ---- MOMENT-BLOCK (Gemeinsame Qualitätszeit, Abschluss-Protokoll) ---- */
export function momentSchema(d) {
  const e = [];
  if (!d || typeof d !== "object" || Array.isArray(d)) return ["Wurzel ist kein Objekt"];
  if (typeof d.zusammenfassung !== "string" || !d.zusammenfassung.trim()) e.push('"zusammenfassung" fehlt');
  if (!Array.isArray(d.themen) || !d.themen.length || d.themen.some(t => typeof t !== "string" || !t.trim()))
    e.push('"themen" braucht 1–4 Schlagworte');
  for (const k of ["behandelt", "vertagt", "selbstGeklaert"])
    if (d[k] !== undefined && (!Array.isArray(d[k]) || d[k].some(x => typeof x !== "string")))
      e.push('"' + k + '" muss eine Liste von Agenda-IDs sein');
  if (d.wandel !== undefined && d.wandel !== null && typeof d.wandel !== "string")
    e.push('"wandel" muss Text oder null sein');
  if (d.zwischenzeitImpuls !== undefined && d.zwischenzeitImpuls !== null && typeof d.zwischenzeitImpuls !== "string")
    e.push('"zwischenzeitImpuls" muss Text oder null sein');
  return e;
}

/* ---- GOAL-BLOCK (Auftrags-Änderungen; Konsens-Regeln sind hart) ---- */
export function auftragBlockSchema(d) {
  const e = [];
  if (!d || typeof d !== "object" || Array.isArray(d)) return ["Wurzel ist kein Objekt"];
  if (!Array.isArray(d.aenderungen) || !d.aenderungen.length) return ['"aenderungen" braucht mindestens einen Eintrag'];
  d.aenderungen.forEach((a, i) => {
    const w = "Änderung " + (i + 1) + ": ";
    if (!["neu", "revidieren", "abschliessen", "ruhen", "reaktivieren"].includes(a.op))
      e.push(w + "op muss neu|revidieren|abschliessen|ruhen|reaktivieren sein");
    if (!["gemeinsam", "individuell"].includes(a.art)) e.push(w + "art muss gemeinsam|individuell sein");
    if (a.art === "gemeinsam" && a.vonBeidenBestaetigt !== true)
      e.push(w + "gemeinsame Änderung ohne vonBeidenBestaetigt:true ist unzulässig – erst beide Okays einholen");
    if (a.art === "individuell" && (typeof a.owner !== "string" || !a.owner.trim() || a.ownerBestaetigt !== true))
      e.push(w + "individuelle Änderung braucht owner und ownerBestaetigt:true");
    if (["neu", "revidieren"].includes(a.op) && (typeof a.text !== "string" || !a.text.trim()))
      e.push(w + '"text" fehlt');
    if (a.op !== "neu" && (typeof a.id !== "string" || !a.id.trim()))
      e.push(w + '"id" des bestehenden Auftrags fehlt');
    if (a.startwerte !== undefined && (typeof a.startwerte !== "object" || Array.isArray(a.startwerte)))
      e.push(w + '"startwerte" muss ein Objekt {Name:Zahl} sein');
  });
  return e;
}

/* ---- GATE-BLOCK (Querung Einzelraum → geteilt; Sicherheits-Weiche-Ausgang) ---- */
export function gateArtSchema(d) {
  const e = [];
  if (!d || typeof d !== "object" || Array.isArray(d)) return ["Wurzel ist kein Objekt"];
  if (typeof d.fassung !== "string" || !d.fassung.trim()) e.push('"fassung" fehlt');   // Wire-Feld "fassung" ≙ Selbstmitteilung (intern)
  if (!("wunsch" in d) || (d.wunsch !== null && typeof d.wunsch !== "string")) e.push('"wunsch" fehlt (Text oder null)');
  if (typeof d.begruendung !== "string" || !d.begruendung.trim()) e.push('"begruendung" fehlt');
  const k = d.kriterien;
  if (!k || k.charakterzuschreibung !== false || k.generalisierung !== false || k.situationsbezug !== true || k.selbstanteil !== true)
    e.push('"kriterien" muss den bestandenen Check zeigen (charakterzuschreibung:false, generalisierung:false, situationsbezug:true, selbstanteil:true) – sonst nicht queren, sondern weiter redigieren');
  const W = ["selbst", "regal", "moment"];
  if (!Array.isArray(d.wege) || !d.wege.length || d.wege.some(w => !W.includes(w)))
    e.push('"wege" braucht mindestens einen aus selbst/regal/moment');
  return e;
}

/* ---- CLOSURE-BLOCK (Auftragsklärung Einzelsession, Freigabe-Liste) ---- */
export function gateSchema(d) {
  const e = [];
  if (!d || !Array.isArray(d.items) || !d.items.length) { e.push('"items" fehlt oder ist leer'); return e; }
  const TAGS = ["Erstbewertung", "Nachfrage", "Ranking", "Selbstverständlich"];
  d.items.forEach((it, i) => {
    const nr = "Item " + (i + 1);
    if (!it || typeof it !== "object") { e.push(nr + " ist kein Objekt"); return; }
    if (!/^(BS|BV|S|V)\d+$/.test(it.id || "")) e.push(nr + ': ungültige id "' + (it.id || "") + '"');
    if (typeof it.text !== "string" || !it.text.trim()) e.push(nr + ': "text" fehlt oder ist leer');
    if (/^S\d+$/.test(it.id || "") && !TAGS.includes(it.tag)) e.push((it.id || nr) + ': S-Item braucht ein "tag" aus ' + TAGS.join("/"));
    if (/^V\d+$/.test(it.id || "") && it.tag !== undefined) e.push(it.id + ": V-Item darf kein tag tragen");
    if (/^(BS|BV)\d+$/.test(it.id || "") && it.tag !== undefined) e.push(it.id + ": BS/BV-Items tragen kein tag (Typ steckt im Präfix)");
  });
  return e;
}

/* ---- CLARIFICATION-BLOCK (gemeinsame Auflösungs-Session) ---- */
export function befundSchema(d) {
  const e = [];
  if (!d || typeof d !== "object" || Array.isArray(d)) return ["Wurzel ist kein Objekt"];
  if (!Array.isArray(d.funde)) e.push('"funde" fehlt (Array, ggf. leer)');
  const t = d.triangulation;
  if (!t || ["vorschlaege", "bestaetigt", "justiert", "abgelehnt"].some(k => typeof t[k] !== "number"))
    e.push('"triangulation" braucht die Zahlen vorschlaege/bestaetigt/justiert/abgelehnt');
  if (d.gemeinsamerAuftrag !== null && d.gemeinsamerAuftrag !== undefined) {
    const a = d.gemeinsamerAuftrag;
    if (typeof a !== "object") { e.push('"gemeinsamerAuftrag" muss Objekt oder null sein'); }
    else {
      if (typeof a.text !== "string" || !a.text.trim()) e.push("gemeinsamerAuftrag.text fehlt");
      if (a.vonBeidenBestaetigt !== true) e.push("gemeinsamerAuftrag ohne vonBeidenBestaetigt=true ist unzulässig – dann null senden");
      if (!a.startwerte || typeof a.startwerte !== "object") e.push("gemeinsamerAuftrag.startwerte fehlt");
    }
  }
  if (!Array.isArray(d.individuelleAuftraege)) e.push('"individuelleAuftraege" fehlt (Array, ggf. leer)');
  if (!d.konstitutiveDivergenz || typeof d.konstitutiveDivergenz.vorhanden !== "boolean")
    e.push('"konstitutiveDivergenz.vorhanden" (true/false) fehlt');
  if (d.sorgen !== undefined && d.sorgen !== null) {
    const so = d.sorgen;
    if (typeof so !== "object" || Array.isArray(so)) e.push('"sorgen" muss ein Objekt sein');
    else {
      ["vorgelegt", "bestaetigt", "entkraeftet", "justiert", "stehenGelassen"].forEach(k => {
        if (typeof so[k] !== "number") e.push('"sorgen.' + k + '" (Zahl) fehlt');
      });
      if (!Array.isArray(so.auftragsErgaenzungen)) e.push('"sorgen.auftragsErgaenzungen" fehlt (Array, ggf. leer)');
      if (typeof so.notbremse !== "boolean") e.push('"sorgen.notbremse" (true/false) fehlt');
    }
  }
  if (!Array.isArray(d.nachbefragung) || !d.nachbefragung.length) e.push('"nachbefragung" fehlt oder ist leer');
  else d.nachbefragung.forEach((n, i) => {
    if (!n || typeof n.person !== "string" || typeof n.wert !== "number")
      e.push("nachbefragung[" + (i + 1) + "] braucht person (Text) und wert (Zahl)");
  });
  return e;
}

/* ---- QZ-Einladungen (Qualitätszeit-Fächer) ---- */
export function qzSchema(d) {
  const e = [];
  if (!d || typeof d !== "object") return ["Wurzel ist kein Objekt"];
  if (!Array.isArray(d.einladungen) || d.einladungen.length < 2 || d.einladungen.length > 3)
    e.push('"einladungen" braucht 2–3 Einträge');
  else d.einladungen.forEach((x, i) => {
    if (typeof x.text !== "string" || !x.text.trim()) e.push("Einladung " + (i + 1) + ": text fehlt");
    if (typeof x.domaene !== "string" || !x.domaene.trim()) e.push("Einladung " + (i + 1) + ": domaene fehlt");
    if (!["resonanz", "negativraum"].includes(x.quelle)) e.push("Einladung " + (i + 1) + ": quelle muss resonanz|negativraum sein");
  });
  if (Array.isArray(d.einladungen) && !d.einladungen.some(x => x.quelle === "resonanz"))
    e.push("mindestens eine Resonanz-Einladung nötig");
  return e;
}

/* ---- REVEAL-BLOCK (Aufdeck-Runde, Kurzprotokoll — Berührungspunkte statt Zählen) ---- */
export function aufdeckSchema(d) {
  const e = [];
  if (!d || typeof d !== "object" || Array.isArray(d)) return ["Wurzel ist kein Objekt"];
  if (typeof d.zusammenfassung !== "string" || !d.zusammenfassung.trim()) e.push('"zusammenfassung" fehlt');
  for (const k of ["beruehrungspunkte", "fuerDieKlaerung"])
    if (!Array.isArray(d[k]) || d[k].some(x => typeof x !== "string"))
      e.push('"' + k + '" fehlt (Array aus Texten, ggf. leer)');
  if (Object.keys(d).some(k => /quote|score|treffer|prozent/i.test(k)))
    e.push("keine Quoten oder Scores im Protokoll – Berührungspunkte statt Zählen");
  return e;
}

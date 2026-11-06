// Corpus EN · STEUER (MOD-3) — app↔model wire texts. Mirror of de/steuer.js.

/** Reveal Round (G1) — playful shared chapter BEFORE the clarification. */
/* S43: aufdeckPrompt removed — the reveal opening lives as the OPENING
   section inside aufloesungsPrompt (one session, integrated, collapsing invisibly). */

/* ── App control texts to the model (corpus, not UI) ──
   Hidden openings and protocol messages from the app to the companion —
   the English language version of the corpus defines its own set.
   {placeholders} via fuelle() from core/i18n. The marker syntax
   ([Continue with chapter N.], SHARING-RESULT:, REVEAL-SHOWN:)
   is kept consistent within THIS bundle's prompts. */
export const steuerTexte = {
  // S95.8b · Replies to the wording recall.
  abrufGefunden: "The wording of session {vid} is now available. Pick up from it; for an excerpt, check the suitability of its pairs as you would for your own session.",
  abrufLeer: "No wording was kept for this session. Say so explicitly and name the way: the timeline lists the conversations for reading — the person can look there and then tell you which one they mean. Invent nothing.",

  /* S129 · First-contact signal — see the German corpus for the finding. */
  erstkontakt: "There is no context for this person yet: no earlier session, no timeline, no memos, no released material. You have not met.",

  start: {
    solo: "I'm here and would like to begin. Open the conversation from your side.",
    einzel: "I'm here and would like to begin clarifying my focus. Open the session from your side.",
    gemeinsam: "We are both here and would like to begin the shared clarification. Open the session from your side.",
    moment: "We are both here and would like to begin. Open the session from your side.",
  },
  freigabeGequert: "SHARING-RESULT: shared via {paths}",
  freigabeNichts: "SHARING-RESULT: nothing shared",
  freigabeWeiterarbeiten: "SHARING-RESULT: I'd like to keep working on it.",
  freigabeAnzahl: "SHARING-RESULT: {n} of {gesamt} items released. [The mandate clarification is thereby complete. Confirm this briefly, lightly and confidently (a good basis for the shared conversation) and, in the SAME message, open the AFTERGLOW: this session stays open — explicitly invite them to correct, specify, or ask about anything from the session at any time. Produce NO new closure block and no chapter marks.]",
  freigabeAnpassen: "SHARING-RESULT: I'd like to adjust something before releasing.",
  weiterMitKapitel: "[Continue with chapter {n}.]",
  scaleErgebnis: "SCALE-RESULT: {id}={wert}",
  scaleClosingErgebnis: "SCALE-RESULT: closing {nameA}={a} · {nameB}={b}",
  choiceErgebnis: "CHOICE-RESULT: {id}={wahl}",
  momentAbschluss: "[CLOSE MOMENT]",
  momentOhneTeilen: "[CLOSE MOMENT · KEEP]",
  soloAbschluss: "[CLOSE SESSION]",
  // S105.5 · Second press while the fork is open = the third door.
  soloOhneTeilen: "[CLOSE SESSION · KEEP]",

  einzelRueckkehr: "[Return after completion: The mandate clarification is already completed and released; I am entering this space again. Open the AFTERGLOW.]",
  einzelWeiter: "[Return to the ongoing mandate clarification: I am entering this space again; the session is paused. Open the RE-ENTRY.]",
  gemeinsamWeiter: "[Return to the running Shared Resolution: We are entering the space again; the session was paused. Open the RE-ENTRY.]",
  aufdeckungAngezeigt: "REVEAL-SHOWN: The app has shown both of you the direction {owner} – {owner}'s stack next to {tipper}'s guess, touching points highlighted; the board stays visible within the conversation. Now FIRST ask the open question what catches their eye or surprises them – your own observations only afterwards.",
};

/* ── Corpus contents outside the system prompts ──
   Language version; the LOGIC (derivations, builders, defs) stays
   single-instance in kernwetten/sessions/prozess and reads these
   contents via K(). Header tokens inside the values are protocol
   invariants and identical to the German reference by construction. */
export const KAPITEL_TITEL = ["Settling In & The Map", "What Matters Most", "Speculation Game", "Straight Talk"];

/* MOD-3b · korpusTexte split by RECIPIENT: kontextTexte go to the MODEL,
   oberflaechenTexte are shown by the APP in the couple's language. The facade
   korpusTexte keeps every key in the old order. */
export const kontextTexte = {
  "rank.self.kopf": "RANKING-RESULT – Top 5 (1 = matters most to {me}; polar pairs were available as separate poles; the remaining {rest} entries deliberately stayed unordered; if several results exist, the latest counts):",
  "rank.pwichtig.kopf": "PARTNER-GUESS (Top 3, guessed by {me}; 1 = presumably matters most to {partner}; if several results exist, the latest counts):",
  "rank.pchange.kopf": "PARTNER-GUESS-CHANGE (guessed by {me}; if several results exist, the latest counts):",
  "regler.kopf": "SLIDERS-RESULT (slider positions mapped internally to 1–10; {me} has seen no numbers – mirror qualitatively; if several results exist, the latest counts):",
  "regler.zeilePole": "{t}: current position {w} · Inner Alignment {z} (spectrum: 1={p0} … 10={p1})",
  "regler.zeileNormal": "{t}: importance {w} · satisfaction {z}",
  "startwerte.kopf": "BASELINE-RESULT (collected face down, revealed simultaneously; 1–10, \"How close are you to this today?\"):",
  "aufdeckk.kopf": "REVEAL-CONTEXT (app-internal; do not quote as a block)",
  "aufdeckk.top5": "{name} – Top 5 (own stack): ",
  "aufdeckk.guess3": "{name} – guess (presumed Top 3 of the partner): ",
  "klaerung.aufdeckAussteht": "REVEAL PENDING — begin with the OPENING. REVEAL-CONTEXT:",
  "klaerung.protokoll": "REVEAL-PROTOCOL (the Reveal Round has already taken place): ",
  "klaerung.beruehr": "Touching points: ",
  "klaerung.vorgemerkt": "Set aside for the clarification: ",
  "sk.kopf": "COMPANION-CONTEXT (app-internal; do not quote, do not name tokens — weave it in dramaturgically):",
  "sk.merkpostenKopf": "MEMOS (open — meaningful topics you noted earlier; pick them up actively but gently and offer to share at the end of the session, never crossing automatically; the concerns-switch applies):",
  "sk.materialKopf": "RELEASED MATERIAL (shared layer, from both):",
  "sk.zeitleisteKopf": "OWN TIMELINE (most recent entries):",
  "sk.sessionsKopf": "RECENT SHARED SESSIONS:",
  "ak.kopf": "OCCASION FOR THIS SESSION (app-internal; do not quote, do not name tokens):",
  "ak.teilenAusVerlauf": "The person has just read the record from {datum} [{topics}] ({vid}) and came here from there, because they want to share something from it. The WORDING of that conversation is already available to you (RECALL-RESULT below) — you need not request it. OPENING (S106): Name three things in ONE sentence, then ask openly. (1) The ANCHOR: where they come from, date and topic. (2) The STATE: that the wording is available to you. (3) The WAY: that at the close of this session they can share something from it. Do NOT anticipate any of the three doors — name neither excerpt nor self-message nor keeping, but hold it open: in what form it can find its way to {partner}. And do not push towards the end: the way is information, not an invitation to close. Then the open question about what moves them. This orientation falls ONCE, in the first message — never again after that. This is the EXCEPTION to the rule that the interface carries the operation: it holds as long as the interface shows the way. Here it does not — the way to the selection leads through a button that only says Close session. You do NOT have the wording: fetch it via RECALL-BLOCK with this identifier once it is needed, and claim nothing about individual sentences before that. Everything else applies unchanged: the concerns-switch, the M1 brake, and the release point only at the close of this session. Do not suggest passages yourself and do not pre-empt the fork — the occasion is a starting position, not a decision.",
  "mk.kopf": "MOMENT-CONTEXT (app-internal; do not quote as a block, bring it in dramaturgically):",
  "mk.auftraegeLeer": "GOALS: none yet.",
  "mk.agendaKopf": "AGENDA (open):",
  "mk.vermeidenKopf": "AVOID (exclusion lines from the findings, confirmed by both – quiet awareness markers for you: never query, never read out; the couple's orientation stays positive):",
  "mk.agendaVon": "- from {name}: ",
  "mk.agendaWunsch": " (wish: {wish})",
  "mk.agendaKandidat": " [GOAL CANDIDATE: proposed as a shared goal — actively pick this up and invite a decision made together; only the joint decision turns it into a goal (AUFTRAG block).]",
  "mk.agendaVorgemerkt": " [EARMARKED: the couple wants to discuss this point during quality time — bring it up yourself.]",
  "mk.agendaLeer": "AGENDA: empty.",
  "mk.fruehereKopf": "PREVIOUS MOMENTS (most recent last):",
  "mk.fruehereLeer": "PREVIOUS MOMENTS: none — this is the first meeting (no open door).",
  "mk.impulsWar": " · the Gentle Invitation was: ",
  // S109 · see the German file: the head carried the pre-S107 language.
  "mk.prozessKopf": "META-REFLECTION (to be revealed — the values never appear in the UI and are never read out as a block; do NOT speak out numbers, tell it in words (»there you are close to each other« / »there is a stretch in between«); begin with the relationship being, then fit and efficacy per topic; the two views never in the same breath, never an average or score):",
  "mk.prozessNachtrag": "META-REFLECTION now ready (submitted late — same rules: do not speak out numbers, tell it in words; relationship being first, then fit and efficacy; the two views never in the same breath, never an average/score; set [[META-REVEALED]] after the reveal — in a message WITHOUT a question):",
  "mk.prozessVerlauf": "MEASUREMENT HISTORY (last revealed rounds — material ONLY for the trajectory deepening: a door, never a statement — the first sentence about it is the question; the progress belongs to the couple; no aggregate, no score, do not speak out numbers):",
  "mk.prozessLeer": "META-REFLECTION: none pending.",
  "mk.zwischenzeitKopf": "IN-BETWEEN MATERIAL (released):",
  "mk.qzKopf": "IN-BETWEEN INVITATIONS (ladder state):",
  "mk.qzWahlen": "Recent choices: ",
  "mk.qzWahlenLeer": "Recent choices: none.",
  "mk.qzStufe": "Ladder stage: ",
  "mk.materialVon": "- from {name}: ",
  "mk.materialLeer": "IN-BETWEEN MATERIAL: none.",
  "mk.namen": "Names: {nameA} (A), {nameB} (B).",
  /* S107 · The relationship being — both rate the same THIRD. */
  "mess.wesen": "Relationship being: {nameA} {a} \u00b7 {nameB} {b} \u21d2 distance {diff} (two views of the same third, not an error, no average)",
  /* S109 · mess.markerDistanz/Ueber/Unter entfernt — sie gehoerten zu
     pruefeLeserichtung, das mit S107 ersatzlos entfallen ist. */
  "mess.wirksam": "Efficacy per topic: ",
  "mess.verlaufZeile": "{datum}: relationship being {nameA} {a} \u00b7 {nameB} {b} (distance {diff})",
  "mess.fit": "Goal fit: ",
  "qm.kopf": "MATERIAL (shared layer):",
  "qm.auftraege": "Goals: ",
  "qm.auftraegeLeer": "Goals: none active.",
  "qm.material": "Released material: ",
  "qm.materialLeer": "Released material: none.",
  "qm.ruhend": "RESTING (do not propose): ",
  "qm.ruhendLeer": "RESTING: nothing.",
  "qm.zuletzt": "Chosen recently: ",
  "qm.vorgemerkt": "Earmarked talking points: ",
  "qm.katalog": "CATALOG of the areas of life:",
};

export const oberflaechenTexte = {
  "titel.solo": "Supported Reflection Session",
  "titel.einzel": "Clarifying Your Focus",
  "titel.gemeinsam": "Shared Resolution",
  "titel.moment": "Quality time",

  /* Builder explanation texts (review package 4) — header tokens invariant. */
  "rank.howto": "You can re-sort or take something out at any time; a tap is enough. The polar pairs are available as separate poles. Sort by feeling, not by perfection.",
  "rank.self.titel": "What matters most to you?",
  "rank.self.desc": "Choose the five things in your relationship that matter most to you into the stack – at the very top, what matters most of all. You may also stack both sides of a polar pair.",
  "rank.pwichtig.titel": "What presumably matters most to {partner}?",
  "rank.pwichtig.desc": "Pure guessing – you cannot know, and that is exactly the point. Choose the three things that presumably matter most to {partner} into the stack.",
  "rank.pchange.titel": "In which area does {partner} most likely wish for the most change?",
  "rank.pchange.desc": "Again pure guessing, no right or wrong. Choose the one area into the stack where {partner} most likely wishes for the most change right now.",
  "scale.safety.titel": "How safe do you feel with {partner}?",
  "scale.safety.text": "This is about your overall feeling: How much can you be yourself around {partner}, relax, and speak about what really moves you?",
  "scale.safety.min": "1 · not at all",
  "scale.safety.max": "10 · completely",
  "scale.closing.titel": "How did this conversation feel?",
  "scale.closing.min": "1 · like an exam",
  "scale.closing.max": "10 · connecting",
  "choice.connect.titel": "How would you like to arrive?",
  "choice.connect.o1": "One minute of shared silence",
  "choice.connect.o2": "Holding eye contact for a moment",
  "choice.connect.o3": "Holding hands – just because",
  "choice.connect.o4": "Sharing one positive thought about the other",
  "choice.connect.ohne": "Continue without an exercise",
  "choice.arrive.titel": "How would you like to arrive again?",
  "choice.arrive.ohne": "Continue without an arrival moment",
  "choice.farewell.titel": "Would you like to take a small invitation with you?",
  "choice.farewell.ohne": "Say goodbye without an invitation",
};

const KORPUSTEXTE_ORDNUNG = [
  "titel.solo",
  "titel.einzel",
  "titel.gemeinsam",
  "titel.moment",
  "rank.howto",
  "rank.self.titel",
  "rank.self.desc",
  "rank.self.kopf",
  "rank.pwichtig.titel",
  "rank.pwichtig.desc",
  "rank.pwichtig.kopf",
  "rank.pchange.titel",
  "rank.pchange.desc",
  "rank.pchange.kopf",
  "regler.kopf",
  "regler.zeilePole",
  "regler.zeileNormal",
  "startwerte.kopf",
  "aufdeckk.kopf",
  "aufdeckk.top5",
  "aufdeckk.guess3",
  "klaerung.aufdeckAussteht",
  "klaerung.protokoll",
  "klaerung.beruehr",
  "klaerung.vorgemerkt",
  "sk.kopf",
  "sk.merkpostenKopf",
  "sk.materialKopf",
  "sk.zeitleisteKopf",
  "sk.sessionsKopf",
  "ak.kopf",
  "ak.teilenAusVerlauf",
  "mk.kopf",
  "mk.auftraegeLeer",
  "mk.agendaKopf",
  "mk.vermeidenKopf",
  "mk.agendaVon",
  "mk.agendaWunsch",
  "mk.agendaKandidat",
  "mk.agendaVorgemerkt",
  "mk.agendaLeer",
  "mk.fruehereKopf",
  "mk.fruehereLeer",
  "mk.impulsWar",
  "mk.prozessKopf",
  "mk.prozessNachtrag",
  "mk.prozessVerlauf",
  "mk.prozessLeer",
  "mk.zwischenzeitKopf",
  "mk.qzKopf",
  "mk.qzWahlen",
  "mk.qzWahlenLeer",
  "mk.qzStufe",
  "mk.materialVon",
  "mk.materialLeer",
  "mk.namen",
  "mess.wesen",
  "scale.safety.titel",
  "scale.safety.text",
  "scale.safety.min",
  "scale.safety.max",
  "scale.closing.titel",
  "scale.closing.min",
  "scale.closing.max",
  "choice.connect.titel",
  "choice.connect.o1",
  "choice.connect.o2",
  "choice.connect.o3",
  "choice.connect.o4",
  "choice.connect.ohne",
  "choice.arrive.titel",
  "choice.arrive.ohne",
  "choice.farewell.titel",
  "choice.farewell.ohne",
  "mess.wirksam",
  "mess.verlaufZeile",
  "mess.fit",
  "qm.kopf",
  "qm.auftraege",
  "qm.auftraegeLeer",
  "qm.material",
  "qm.materialLeer",
  "qm.ruhend",
  "qm.ruhendLeer",
  "qm.zuletzt",
  "qm.vorgemerkt",
  "qm.katalog",
];
export const korpusTexte = Object.fromEntries(KORPUSTEXTE_ORDNUNG.map(k => {
  const inK = k in kontextTexte, inO = k in oberflaechenTexte;
  if (inK === inO) throw new Error("korpusTexte '" + k + "' muss in genau einem der beiden Objekte stehen.");
  return [k, inK ? kontextTexte[k] : oberflaechenTexte[k]];
}));

export const strukturTexte = {
  kopf: `OUTPUT FORMAT (takes precedence over everything below): Each of your messages is EXACTLY ONE call of the "turn" tool with the fields antwort/marker/block — no text outside the tool, no second output next to it.`,
  antwort: `"antwort" is your companion text to the person — the only thing they see. ALL conversation rules below apply unchanged to this field. "antwort" NEVER contains markers (no [[…]]), no block tokens (no "…-BLOCK"), no JSON.`,
  marken: `MARKERS: Wherever the rules below say "end your message with the marker [[X]] alone on the last line", set marker:"X" instead (without brackets) — WHEN a marker is due is governed solely by the rules below, verbatim. No marker ⇒ marker:null. Markers of this session: {liste}.`,
  ohneMarken: `MARKERS: This session knows no markers — there is no marker field.`,
  bloecke: `BLOCKS: Wherever the rules below say to output "X-BLOCK … END X-BLOCK" with JSON in between, set block:{"typ":"…","daten":{…}} instead — "daten" is EXACTLY the JSON object described there, field by field, including all the rules given there (the invisibility and ordering rules of the blocks apply verbatim as well). WHEN a block is due is governed solely by the rules below. No block ⇒ block:null; at most ONE block per message. Translation for this session:`,
  zeile: `{start} ⇒ typ "{typ}"`,
  schluss: `Everything else — occasions, sequences, prohibitions, tone, control texts — applies verbatim. Example: a message that carries a NOTE-BLOCK per the rules still carries no marker (marker:null).`,
};

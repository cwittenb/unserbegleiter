// English dictionary (UI chrome only). Terminology approved by Cars10 (July 2026):
// Couples Companion · My Private Space / Our Shared Space · Glimpse · Focus ·
// Shelf · Reveal Round · "Your words, ready to share" · Notice, don't report.
// The companion corpus (prompts, steering texts, Kernwetten content) stays
// German until Stage C — this file covers buttons, panels, and errors only.

export const en = {
  // General
  "allg.marke": "Couples Companion",
  "allg.hallo": "Hello {name}",
  "allg.zurueck": "← Back",
  "allg.weiter": "Continue",
  "allg.fertig": "Done",
  "allg.freigeben": "Share",
  "allg.nochNicht": "Not yet",
  "allg.von": "from {name}",

  // Start overview
  "start.hallo": "Good to see you, {name}.",
  "start.intro": "Two spaces, one simple rule: what stays with you, stays with you — only what you explicitly share is shared.",
  "start.meinRaum": "My Private Space",
  "start.meinSub": "Just for you: to sort, practice, and set things down. Nothing here reaches {partner} unless you share it.",
  "start.teilRaum": "Our Shared Space",
  "start.teilSub": "For both of you: your shared sessions — and everything one of you has made readable.",

  // My Private Space
  "mein.intro": "This space is yours alone — nothing from here reaches {partner} unless you explicitly release it. Whenever you like, you can share what you've worked out: your companion helps you find a formulation, and only your checkmark releases it. Take the time you need.",
  "mein.solo": "Start a Supported Reflection Session",
  "mein.einzel": "Start Clarifying Your Focus",
  "mein.zeitleiste": "My Timeline",
  "mein.mess": "Process Reflection",

  // Our Shared Space
  "teil.intro": "Only what has been shared lives here — plus everything you do together.",
  "teil.moment": "Start a Shared Session",
  "teil.aufdeck": "Start the Reveal Round",
  "teil.gemeinsam": "Start a Shared Clarification",
  "teil.regal": "View the Shelf",
  "teil.agenda": "View the Agenda",
  "teil.qz": "Shared Moments",

  // Timeline
  "zeitleiste.titel": "Timeline",
  "zeitleiste.leer": "No entries yet — they grow out of your reflection sessions, with a date and a short summary.",

  // Shelf
  "regal.titel": "Shelf — to read when you feel like it",
  "regal.intro": "Not an inbox: what lives here is something one of you made readable from a private reflection — as their experience, not as a message or a demand. Responding is entirely optional; the best place for that is the conversation.",
  "regal.leer": "The shelf is empty.",
  "regal.stGelesen": "read",
  "regal.stInAgenda": "added to agenda",
  "regal.btnGelesen": "Read ✓",
  "regal.btnHeben": "Add it to the agenda",

  // Agenda
  "agenda.titel": "Shared Agenda",
  "agenda.leer": "The agenda is empty.",
  "agenda.st.open": "open",
  "agenda.st.discussed": "discussed",
  "agenda.st.selfResolved": "self-resolved",
  "agenda.btnAbr": "We sorted this out ourselves ✓",

  // Chat
  "chat.platzhalter": "Your message…",
  "chat.senden": "Send",
  "chat.raumVerlassen": "← Leave the space",
  "chat.deineZahl": "Your number:",
  "chat.tippt": "The Companion is writing",
  "chat.diktieren": "Dictate",

  // Gate (personal sharing)
  "gate.titel": "Your words, ready to share",
  "gate.wish": "Wish: ",
  "gate.weg.selbst": "Bring it up yourself",
  "gate.weg.regal": "Put it on the shelf (Glimpse)",
  "gate.weg.moment": "Add it to the agenda (Focus)",

  // Chapter checkpoint
  "kapitel.geschafft": "Chapter {n} complete – {titel}",
  "kapitel.weitermachen": "Keep going: Chapter {n} · {titel}",
  "kapitel.pause": "Take a Break",
  "kapitel.gespeichert": "Saved – you can pick up right here whenever you like.",
  "kapitel.frageTitel": "One question about the Reveal Round:",
  "kapitel.frage": "Would it bring you joy to reveal your Top 5 to each other in the Reveal Round – even if the thought stirs a little excitement and uncertainty at first?",
  "kapitel.frageSub": "Only this would be shown: your Top 5 and your three guesses for {partner} – nothing from your conversation here.",
  "kapitel.ja": "Yes, gladly",
  "kapitel.jaNote": "Lovely – the Reveal Round becomes available as soon as you are both ready.",
  "kapitel.neinNote": "All good – this stays with you. The app will ask exactly once more at the end, then never again.",

  // Reveal board
  "aufdeck.titel": "Reveal – both directions at once",
  "aufdeck.intro": "No right, no wrong, no points: highlighted is where guess and stack touch. Differences are a finding about two perspectives – and often the best material for a conversation.",
  "aufdeck.getippt": "{tipper} guessed what matters most to {owner}",
  "aufdeck.tippVon": "Guess by {name}",
  "aufdeck.topVon": "Top 5 of {name}",
  "aufdeck.beruehrungen": "Touching points: ",
  "aufdeck.verschieden": "Two different views – material for a good conversation.",
  "aufdeck.tafelZu": "Hide the Board",
  "aufdeck.weiter": "Back to the Conversation",
  "aufdeck.fehlt": "Reveal data is missing – please start the round again.",

  // Start errors
  "fehler.aufdeckWartet": "The Reveal Round is still waiting for you – it comes before the clarification.",
  "fehler.aufdeckZu": "The Reveal Round opens once both of you have chosen it and are ready.",
  "fehler.aufdeckDaten": "The Reveal Round is missing the stack (Top 5) or the guesses (Top 3) – please ask for a correction round in the conversation.",
  /* Couple language — bilaterally confirmed switch (S30·C3) */
  "paarspr.titel": "Companion language (couple)",
  "paarspr.aktuell": "Your shared companion language: {sprache}.",
  "paarspr.vorschlagen": "Suggest switching to {sprache}",
  "paarspr.wartet": "Your suggestion ({sprache}) is waiting for {partner}'s confirmation.",
  "paarspr.vorschlag": "{partner} suggests switching to {sprache}.",
  "paarspr.bestaetigen": "Confirm",
  "paarspr.ablehnen": "Decline",
  "paarspr.zurueckziehen": "Withdraw",
  "paarspr.gewechselt": "Confirmed by both of you — the companion language is now {sprache}.",
  "paarspr.hinweisLaufend": "Ongoing conversations keep their language; new ones start in the new one.",
  "paarspr.name.de": "German",
  "paarspr.name.en": "English",

  // Process reflection
  "mess.titel": "Process Reflection",
  "mess.abgegeben": "Your part is in — it will be revealed together in the next shared moment, bit by bit.",
  "mess.verdeckt": "Process Reflection — face down; {partner} sees your values only at the shared reveal",
  "mess.closeness": "How close do you feel to {partner} right now? (1–10)",
  "mess.guess": "And your guess: how close does {partner} feel to you? (1–10)",
  "mess.fit": "How well does \u201c{text}\u201d ({id}) fit the two of you right now? (1–10)",
  "mess.abgeben": "Submit Face Down",
  "mess.danke": "Thank you — placed face down.",
  "mess.bereit": " You have both taken your turn: the reveal awaits in the next shared moment.",

  // Quality time
  "qz.titel": "Shared Moments",
  "qz.pausiert": "Paused until {datum} — agreed, not forgotten.",
  "qz.intro": "Light invitations to small shared moments — no program, no schedule. You choose what feels right; nothing is measured or tracked, and choosing nothing is completely fine.",
  "qz.pauseBtn": "Agree on a break (4 weeks)",
  "qz.holen": "Choose an Invitation",
  "qz.waehlen": "Choose",
  "qz.keine": "None of These Today",
  "qz.gewaehlt": "Lovely — enjoy it. (Nothing is measured, nothing is tracked.)",
  "qz.ok": "Completely fine.",

  // Kernwetten panels (chrome; content/DOMAINS are corpus)
  "kw.bereich": "Area {i} of {n}",
  "kw.poleW": "Where do you live right now? (1={p0} … 10={p1})",
  "kw.poleZ": "Where would it feel right for you?",
  "kw.wichtig": "How important is this to you? (1 barely … 10 central)",
  "kw.zufrieden": "How satisfied are you with it right now? (1 … 10)",
  "sw.titel": "Starting value, face down — only {name} should look",
  "sw.frage": "{name}: How close are you to this today? (1–10)",
  "sw.ok": "Take Face Down",
  "fg.titel": "Your release — only checked items are laid out for the shared conversation",
  "fg.wieder": "And one single time more, the Reveal Round: would it bring you joy to reveal your Top 5 to each other – even if the thought stirs a little excitement? Only your Top 5 and your three guesses for {partner} would be shown. Without the checkmark everything stays with you; after this, no one asks again.",
  "fg.check": "Yes – my Top 5 and guesses may be shown in the Reveal Round.",

  // Regain access (in-app)
  "rec.titel": "Regain Access",
  "rec.hinterlegt": "An email address is on file. If you sign in on a new device or lose your access, you can have a fresh link sent there.",
  "rec.neu": "Add an email address so you can request a new access link when needed — including for a second device. Use a mailbox only you can access.",
  "rec.platzhalter": "you@mailbox.com",
  "rec.aendern": "Change address",
  "rec.hinterlegen": "Add address",
  "rec.bitte": "Please enter an address.",

  // Dictation
  "diktat.mobil": "Dictation: tap the microphone on your on-screen keyboard — the text lands right in the input field.",
  "diktat.windows": "Dictation: press Windows key + H — Windows dictation writes straight into the input field.",
  "diktat.mac": "Dictation: press the Fn key (🌐) twice — macOS dictation writes straight into the input field.",
  "diktat.allgemein": "Dictation: use your system's dictation feature — the text lands right in the input field.",
  "diktat.unterbrochen": "Dictation interrupted — just tap 🎤 again.",
  "diktat.laeuft": "Dictation running — just speak; ⏹ stops.",
  "sprache.diktat": "en-US",

  // Artifact shell (setup / role choice)
  "einr.titel": "Setup",
  "einr.umgebung": "Development environment (artifact) · Core {version}",
  "einr.nameA": "Name of Person A ",
  "einr.nameB": "Name of Person B ",
  "einr.los": "Get Started",
  "einr.wer": "Who are you right now? (dev switch — in production the magic link handles this)",
  "einr.selbsttest": "Self-test",
  "einr.selbsttestLaeuft": "Self-test running…",
  "einr.sprache": "Companion language ",

  // Production client (regain access screen)
  "wieder.titel": "No Access on This Device",
  "wieder.intro": "Open your personal access link — or have a new one sent to the email address on file.",
  "wieder.email": "Email address",
  "wieder.anfordern": "Request a New Link",
  "wieder.bitte": "Please enter your address.",
  "wieder.sendet": "Sending …",
  "wieder.gesendet": "Sent",
  "wieder.unterwegs": "If this address is on file, a link is on its way. Check your spam folder too.",
  "wieder.startFehler": "Start failed: {fehler}",

  // Worker error codes (client-side wording)
  "fehler.code.names_required": "Both names are required.",
  "fehler.code.email_invalid": "Please enter a valid email address.",
  "fehler.code.email_taken": "This address is already on file.",
  "fehler.code.link_unknown": "This access link is unknown.",
  "fehler.code.link_used": "This access link has already been used.",
  "fehler.code.link_expired": "This access link has expired.",
  "fehler.code.no_session": "No valid access.",

  // Theme toggle
  "theme.hell": "Light",
  "theme.dunkel": "Dark",
};

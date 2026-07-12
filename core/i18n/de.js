// Deutsches Wörterbuch (Referenzsprache). Flache Schlüssel, Platzhalter in {…}.
// Enthält NUR UI-Chrome. Korpus (Prompts, Steuertexte, Kernwetten-Inhalte,
// Kontext-Bauer) lebt in core/prompts/prompts.de.js und Freunden.

export const de = {
  // Allgemein
  "allg.marke": "Paarbegleitung",
  "allg.hallo": "Hallo {name}",
  "allg.zurueck": "← Zurück",
  "allg.weiter": "Weiter",
  "allg.fertig": "Fertig",
  "allg.freigeben": "Freigeben",
  "allg.nochNicht": "Noch nicht",
  "scale.ok": "Übernehmen",
  "allg.von": "von {name}",
  "allg.arbeitet": "einen Moment …",

  // Startübersicht
  "start.hallo": "Schön, dass du da bist, {name}.",
  "start.intro": "Zwei Räume, eine einfache Regel: Was bei dir bleibt, bleibt bei dir — geteilt wird nur, was du ausdrücklich freigibst.",
  "start.meinRaum": "Mein Raum",
  "start.meinSub": "Hier begleite ich dich. Zum Reflektieren, zum Sortieren, Üben und Ablegen. Nichts von hier erreicht {partner}, außer du gibst es frei.",
  "start.teilRaum": "Gemeinsamer Raum",
  "start.teilSub": "Euer Raum für eure gemeinsame Zeit. Austausch, Begegnung, Reflexion — und zum Lesen, was einer von euch lesbar gemacht hat.",

  // Mein Raum
  "mein.intro": "Dieser Raum ist nur für dich — nichts von hier erreicht {partner}, außer du gibst es ausdrücklich frei. Wenn du magst, kannst du Erarbeitetes jederzeit teilen: Die Begleitung hilft dir dann bei einer Formulierung, und erst dein Häkchen gibt sie frei. Nimm dir die Zeit, die du brauchst.",
  "mein.solo": "Reflexionsgespräch beginnen",
  "mein.einzel": "Auftragsklärung beginnen",
  "mein.zeitleiste": "Meine Zeitleiste",
  "mein.mess": "Prozessreflexion",

  // Gemeinsamer Raum
  "teil.intro": "Euer Vorraum: Hier verschafft ihr euch Überblick — in den Regalen liegt nur, was freigegeben wurde. Die Räume dahinter betretet ihr bewusst, für alles, was ihr zu zweit macht.",
  "teil.gruppeRaeume": "Räume — betreten und beginnen",
  "teil.gruppeRegale": "Regale — ansehen, ohne etwas zu beginnen",
  "teil.moment": "Gemeinsame Session beginnen",
  "teil.aufdeck": "Aufdeck-Runde beginnen",
  "teil.gemeinsam": "Gemeinsame Auflösung beginnen",
  "teil.regal": "Regal ansehen",
  "teil.agenda": "Agenda ansehen",
  "teil.qz": "Gemeinsame Momente",

  // Zeitleiste
  "zeitleiste.titel": "Zeitleiste",
  "zeitleiste.leer": "Noch keine Einträge — sie entstehen aus deinen Reflexionsgesprächen, mit Datum und Kurzfassung.",

  // Regal
  "regal.titel": "Regal — zum Lesen, wenn du magst",
  "regal.intro": "Kein Posteingang: Hier liegt, was eine Person aus ihrer Einzelreflexion lesbar gemacht hat — als ihre Erfahrung, nicht als Nachricht oder Anforderung. Reagieren ist frei; der beste Ort dafür ist das Gespräch.",
  "regal.leer": "Das Regal ist leer.",
  "regal.stGelesen": "gelesen",
  "regal.stInAgenda": "in der Agenda",
  "regal.btnGelesen": "Gelesen ✓",
  "regal.btnHeben": "In die Agenda heben",

  // Agenda
  "agenda.titel": "Gemeinsame Agenda",
  "agenda.leer": "Die Agenda ist leer.",
  "agenda.st.open": "offen",
  "agenda.st.discussed": "besprochen",
  "agenda.st.selfResolved": "selbst geklärt",
  "agenda.btnAbr": "Haben wir selbst geklärt ✓",

  // Chat
  "chat.platzhalter": "Deine Nachricht…",
  "chat.senden": "Senden",
  "chat.raumVerlassen": "← Raum verlassen",
  "chat.deineZahl": "Deine Zahl:",
  "chat.tippt": "Die Begleitung schreibt",
  "chat.diktieren": "Diktieren",

  // Gate (Selbstmitteilung)
  "gate.titel": "Deine Selbstmitteilung zur Freigabe",
  "gate.wish": "Wunsch: ",
  "gate.weg.selbst": "Selbst ansprechen",
  "gate.weg.regal": "Ins Regal legen (Einblick)",
  "gate.weg.moment": "Auf die Agenda (Thema)",

  // Kapitel-Zwischenhalt
  "kapitel.geschafft": "Kapitel {n} geschafft – {titel}",
  "kapitel.weitermachen": "Weitermachen: Kapitel {n} · {titel}",
  "kapitel.pause": "Pause machen",
  "kapitel.gespeichert": "Gespeichert – du kannst jederzeit genau hier weitermachen.",
  "kapitel.frageTitel": "Eine Frage zur Aufdeck-Runde:",
  "kapitel.frage": "Hättest du Freude daran, wenn ihr eure Top 5 in der Aufdeck-Runde einander preisgebt – auch wenn der Gedanke im ersten Moment vielleicht etwas Aufregung und Unsicherheit auslöst?",
  "kapitel.frageSub": "Gezeigt würden dabei nur: deine Top 5 und deine drei Tipps für {partner} – nichts aus eurem Gespräch hier.",
  "kapitel.ja": "Ja, gern",
  "kapitel.jaNote": "Schön – die Aufdeck-Runde wird startbar, sobald ihr beide so weit seid.",
  "kapitel.neinNote": "Alles gut – das bleibt bei dir. Beim Abschluss fragt die App noch genau einmal, danach nicht mehr.",

  // Aufdeck-Tafel
  "aufdeck.titel": "Aufdeckung – beide Richtungen gleichzeitig",
  "aufdeck.intro": "Kein richtig, kein falsch, keine Punkte: Markiert ist, wo Tipp und Stapel einander berühren. Unterschiede sind ein Befund über zwei Blickwinkel – und oft das beste Gesprächsmaterial.",
  "aufdeck.getippt": "{tipper} hat getippt, was {owner} am Herzen liegt",
  "aufdeck.tippVon": "Tipp von {name}",
  "aufdeck.topVon": "Top 5 von {name}",
  "aufdeck.beruehrungen": "Berührungspunkte: ",
  "aufdeck.verschieden": "Zwei verschiedene Blicke – Stoff für ein gutes Gespräch.",
  "aufdeck.tafelZu": "Tafel ausblenden",
  "aufdeck.weiter": "Weiter im Gespräch",
  "aufdeck.fehlt": "Aufdeck-Daten fehlen – bitte die Runde neu beginnen.",

  // Start-Fehler
  "fehler.aufdeckWartet": "Die Aufdeck-Runde wartet noch auf euch – sie kommt vor der Klärung.",
  "fehler.aufdeckZu": "Die Aufdeck-Runde öffnet erst, wenn beide sie gewählt haben und so weit sind.",
  "fehler.aufdeckDaten": "Für die Aufdeck-Runde fehlen Stapel (Top 5) oder Tipps (Top 3) – bitte im Gespräch um eine Korrektur-Runde bitten.",
  "fehler.aufloesungFehlt": "Die Gemeinsame Auflösung öffnet, sobald ihr beide eure Auftragsklärung abgeschlossen und freigegeben habt.",

  // Wegweiser (Nutzerführung, S35) — aus dem Zustand berechnete nächste Schritte
  "weg.titel": "Wegweiser",
  "weg.einzelPause": "Deine Auftragsklärung ist bei Kapitel {n} pausiert — du kannst genau dort weitermachen.",
  "weg.aufdeckBereit": "Ihr seid beide so weit: Die Aufdeck-Runde wartet auf euch.",
  "weg.aufloesungBereit": "Eure Freigaben liegen bereit — die Gemeinsame Auflösung kann starten.",
  "weg.aufloesungFehltDu": "Für die Gemeinsame Auflösung fehlt noch deine Freigabe aus der Auftragsklärung.",
  "weg.aufloesungFehltPartner": "Für die Gemeinsame Auflösung fehlt noch die Freigabe von {partner}.",
  "weg.aufloesungFehltBeide": "Die Gemeinsame Auflösung öffnet, sobald ihr beide eure Auftragsklärung freigegeben habt.",
  "weg.regalNeu": "Im Regal liegt Neues für dich ({n}) — zum Lesen, wenn du magst.",
  "weg.agendaOffen": "Offene Punkte auf eurer Agenda: {n}.",
  "weg.messBereit": "Eure Prozessreflexion ist vollständig — die Aufdeckung wartet in der nächsten Gemeinsamen Session.",
  "weg.messOffen": "Eine Prozessreflexions-Runde wartet auf deinen verdeckten Beitrag.",
  "weg.momentOffen": "Eure Gemeinsame Session ist offen — ihr könnt genau dort weitermachen.",
  "weg.soloErster": "Ein guter erster Schritt: ein Reflexionsgespräch — dein privater Raum zum Sortieren.",
  "weg.startFrei": "Nimm dir, was gerade passt: dein Raum für dich, der gemeinsame für euch beide.",
  /* Paarsprache — beidseitig bestätigter Wechsel (S30·C3) */
  "paarspr.titel": "Begleitungssprache (Paar)",
  "paarspr.link": "Begleitungssprache: {sprache} · ändern",
  "paarspr.linkOffen": "Begleitungssprache: {sprache} · ein Vorschlag ist offen",
  "paarspr.aktuell": "Eure gemeinsame Begleitungssprache: {sprache}.",
  "paarspr.vorschlagen": "Wechsel zu {sprache} vorschlagen",
  "paarspr.wartet": "Dein Vorschlag ({sprache}) wartet auf die Bestätigung von {partner}.",
  "paarspr.vorschlag": "{partner} schlägt vor, zu {sprache} zu wechseln.",
  "paarspr.bestaetigen": "Bestätigen",
  "paarspr.ablehnen": "Ablehnen",
  "paarspr.zurueckziehen": "Zurückziehen",
  "paarspr.gewechselt": "Von euch beiden bestätigt — die Begleitungssprache ist jetzt {sprache}.",
  "paarspr.hinweisLaufend": "Laufende Gespräche behalten ihre Sprache; neue starten in der neuen.",
  "paarspr.name.de": "Deutsch",
  "paarspr.name.en": "Englisch",

  // Prozessreflexion
  "mess.titel": "Prozessreflexion",
  "mess.abgegeben": "Dein Beitrag ist abgegeben — aufgedeckt wird gemeinsam im nächsten Moment, häppchenweise.",
  "mess.verdeckt": "Prozessreflexion — verdeckt; {partner} sieht deine Werte erst bei der gemeinsamen Aufdeckung",
  "mess.closeness": "Wie nah fühlst du dich {partner} gerade? (1–10)",
  "mess.guess": "Und was schätzt du: Wie nah fühlt sich {partner} dir? (1–10)",
  "mess.fit": "Wie gut passt „{text}\" ({id}) gerade zu euch? (1–10)",
  "mess.abgeben": "Verdeckt abgeben",
  "mess.danke": "Danke — verdeckt abgelegt.",
  "mess.bereit": " Ihr seid beide dran gewesen: Die Aufdeckung wartet im nächsten gemeinsamen Moment.",

  // Qualitätszeit
  "qz.titel": "Gemeinsame Momente",
  "qz.pausiert": "Pausiert bis {datum} — vereinbart, kein Vergessen.",
  "qz.intro": "Leichte Einladungen zu kleinen gemeinsamen Momenten — kein Programm, kein Takt. Ihr wählt, was sich stimmig anfühlt; nichts wird gemessen oder nachgehalten, und nichts auswählen ist völlig in Ordnung.",
  "qz.pauseBtn": "Pause vereinbaren (4 Wochen)",
  "qz.holen": "Einladungen holen",
  "qz.waehlen": "Wählen",
  "qz.keine": "Heute keine davon",
  "qz.gewaehlt": "Schön — viel Freude damit. (Nichts wird gemessen, nichts nachgehalten.)",
  "qz.ok": "Völlig in Ordnung.",

  // Kernwetten-Panels (UI-Chrome; Inhalte/DOMAINS sind Korpus)
  "kw.bereich": "Bereich {i} von {n}",
  "kw.poleW": "Wo lebt ihr gerade? (1={p0} … 10={p1})",
  "kw.poleZ": "Wo wäre es für dich stimmig?",
  "kw.wichtig": "Wie wichtig ist dir das? (1 kaum … 10 zentral)",
  "kw.zufrieden": "Wie zufrieden bist du damit gerade? (1 … 10)",
  "sw.titel": "Startwert, verdeckt — bitte nur {name} schauen",
  "sw.frage": "{name}: Wie nah seid ihr dem heute? (1–10)",
  "sw.ok": "Verdeckt übernehmen",
  "fg.titel": "Deine Freigabe — nur angekreuzte Punkte werden für das gemeinsame Gespräch bereitgelegt",
  "fg.wieder": "Und ein einziges Mal noch die Aufdeck-Runde: Hättest du Freude daran, wenn ihr eure Top 5 einander preisgebt – auch wenn der Gedanke vielleicht etwas Aufregung auslöst? Gezeigt würden nur deine Top 5 und deine drei Tipps für {partner}. Ohne Häkchen bleibt alles bei dir; danach fragt niemand mehr.",
  "fg.check": "Ja – Top 5 und Tipps dürfen in der Aufdeck-Runde gezeigt werden.",

  // Zugang wiederfinden (App-intern)
  "rec.titel": "Zugang wiederfinden",
  "rec.hinterlegt": "Eine E-Mail-Adresse ist hinterlegt. Wenn du dich auf einem neuen Gerät anmelden oder deinen Zugang verlierst, kannst du dir darüber einen frischen Link schicken lassen.",
  "rec.neu": "Hinterlege eine E-Mail-Adresse, damit du dir bei Bedarf einen neuen Zugangslink schicken lassen kannst — auch für ein zweites Gerät. Nimm ein Postfach, auf das nur du Zugriff hast.",
  "rec.platzhalter": "dein@postfach.de",
  "rec.aendern": "Adresse ändern",
  "rec.hinterlegen": "Adresse hinterlegen",
  "rec.bitte": "Bitte eine Adresse eingeben.",

  // Diktat
  "diktat.mobil": "Diktat: Tippe auf das Mikrofon deiner Bildschirmtastatur — der Text landet direkt im Eingabefeld.",
  "diktat.windows": "Diktat: Windows-Taste + H drücken — die Windows-Diktierfunktion schreibt direkt ins Eingabefeld.",
  "diktat.mac": "Diktat: Zweimal die Fn-Taste (🌐) drücken — das macOS-Diktat schreibt direkt ins Eingabefeld.",
  "diktat.allgemein": "Diktat: Nutze die Diktierfunktion deines Systems — der Text landet direkt im Eingabefeld.",
  "diktat.unterbrochen": "Diktat unterbrochen — einfach erneut auf 🎤 tippen.",
  "diktat.laeuft": "Diktat läuft — sprich einfach; ⏹ beendet.",
  "sprache.diktat": "de-DE",

  // Artefakt-Hülle (Einrichtung / Rollenwahl)
  "einr.titel": "Einrichtung",
  "einr.umgebung": "Entwicklungsumgebung (Artefakt) · Kern {version}",
  "einr.nameA": "Name Person A ",
  "einr.nameB": "Name Person B ",
  "einr.los": "Loslegen",
  "einr.wer": "Wer bist du gerade? (Dev-Umschalter — produktiv übernimmt das der Magic-Link)",
  "einr.selbsttest": "Selbsttest",
  "einr.selbsttestLaeuft": "Selbsttest läuft…",
  "einr.sprache": "Sprache der Begleitung ",

  // Produktiv-Client (Wiedereinstieg)
  "wieder.titel": "Kein Zugang auf diesem Gerät",
  "wieder.intro": "Öffne deinen persönlichen Zugangslink — oder lass dir einen neuen an deine hinterlegte E-Mail-Adresse schicken.",
  "wieder.email": "E-Mail-Adresse",
  "wieder.anfordern": "Neuen Link anfordern",
  "wieder.bitte": "Bitte deine Adresse eingeben.",
  "wieder.sendet": "Wird gesendet …",
  "wieder.gesendet": "Gesendet",
  "wieder.unterwegs": "Falls diese Adresse hinterlegt ist, ist ein Link unterwegs. Schau auch im Spam-Ordner nach.",
  "wieder.startFehler": "Start fehlgeschlagen: {fehler}",

  // Worker-Fehler-Codes (clientseitige Wortlaute = heutige Server-Meldungen)
  "fehler.code.names_required": "nameA und nameB sind Pflicht",
  "fehler.code.email_invalid": "Bitte eine gültige E-Mail-Adresse angeben.",
  "fehler.code.email_taken": "Diese Adresse ist bereits hinterlegt.",
  "fehler.code.link_unknown": "Dieser Zugangslink ist unbekannt.",
  "fehler.code.link_used": "Dieser Zugangslink wurde bereits verwendet.",
  "fehler.code.link_expired": "Dieser Zugangslink ist abgelaufen.",
  "fehler.code.no_session": "Kein gültiger Zugang.",

  // Theme-Umschalter
  "theme.hell": "Hell",
  "theme.dunkel": "Dunkel",
};

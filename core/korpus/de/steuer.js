// Korpus DE · STEUER (MOD-3) — Wire zwischen App und Modell.
// Steuertexte (hidden-Eroeffnungen, Protokoll-Meldungen, Revisions-Kennungen),
// Struktur-Praeambel-Texte, Kapiteltitel, QZ-Stufen, korpusTexte (UI-nahe
// Strings, Umzug nach core/i18n in MOD-3b).

/** Aufdeck-Runde (G1) — spielerisches gemeinsames Kapitel VOR der Klärung. */
/* S43: aufdeckPrompt entfällt — der Aufdeck-Auftakt lebt als AUFTAKT-Sektion
   im aufloesungsPrompt (eine Session, integriert, unsichtbar kollabierend). */

/* ── Steuertexte der App ans Modell (Korpus, nicht UI) ──
   Unsichtbare hidden-Eröffnungen und Protokoll-Meldungen der App an die
   Begleitung. Sie gehören zur Sprachfassung des Korpus: die englische
   Fassung (Stufe C) definiert ihre eigenen. {Platzhalter} via fuelle()
   aus core/i18n. Die Marker-Syntax ([Weiter mit Kapitel N.], FREIGABE-
   ERGEBNIS:, REVEAL-SHOWN:) ist prompt-intern konsistent zu halten. */
export const steuerTexte = {
  // S95.8b · Antworten auf den Wortlaut-Abruf.
  // S103 · Meta-Marken-Wächter (Platz der Marke).
  metaPlatzRevision:
    "[SYSTEM-REVISION: Deine letzte Nachricht setzt [[META-REVEALED]], aber nicht allein in der " +
    "letzten Zeile. Die Marke ist die Übergabe an die App: Was nach ihr steht, kommt zu spät. " +
    "Wiederhole die Nachricht so, dass die Marke ALLEIN auf der letzten Zeile steht — und nur, " +
    "wenn du die Aufdeckung in DIESER Nachricht bereits erzählt hast.]",
  // S103 · Krisen-Wächter (Reihenfolge im geteilten Raum).
  krisenReihenfolgeRevision:
    "[SYSTEM-REVISION: Du nennst professionelle Krisenhilfe, aber der Verweis in den geschützten " +
    "Einzelraum fehlt oder steht dahinter. Im geteilten Raum gilt IMMER beides, in dieser " +
    "Reihenfolge: ZUERST der eigene Raum, DANN die Krisenhilfe als nächster Schritt. Die " +
    "Krisenhilfe ersetzt den Verweis nicht. Wiederhole die Nachricht mit beidem in der " +
    "richtigen Reihenfolge.]",
  // S101 · Marken-Wächter: Frage und Aufdeck-Marke in einer Nachricht.
  markenRevision:
    "[SYSTEM-REVISION: Deine letzte Nachricht stellt eine Frage UND setzt eine Aufdeck-Marke. " +
    "Mit der Marke zeigt die App die Tafel — die Frage käme zu spät, und ein Okay danach wäre keins. " +
    "Wiederhole die Nachricht OHNE Marke: erst die Frage, dann warte auf die Antwort. Die Marke " +
    "folgt in einer SPÄTEREN Nachricht, allein in der letzten Zeile.]",
  // S99.3 · Abschluss-Wächter (core/engine/abschluss-waechter.js).
  abschlussRevision:
    "[SYSTEM-REVISION: Deine letzte Nachricht stellt eine Frage UND schließt die Sitzung " +
    "(TIMELINE-BLOCK). Mit dem Block endet die Sitzung sofort — die Person hat danach kein " +
    "Eingabefeld mehr und kann nicht antworten. Wiederhole die Nachricht OHNE den Block: erst " +
    "die Gabelung bzw. deine Frage, dann wartest du auf die Antwort. Der Block folgt in einer " +
    "SPÄTEREN Nachricht, zusammen mit dem würdigenden Schlusssatz und ohne jede Frage.]",
  abrufGefunden: "Der Wortlaut der Sitzung {vid} liegt jetzt vor. Knüpfe daran an; für einen Ausschnitt prüfe die Eignung ihrer Paare wie bei einer eigenen Sitzung.",
  abrufLeer: "Zu dieser Sitzung ist kein Wortlaut aufbewahrt. Sage das ausdrücklich und nenne den Weg: In der Zeitleiste stehen die Gespräche zum Nachlesen — die Person kann dort nachsehen und dir dann sagen, welches sie meint. Erfinde nichts.",

  /* S129 · Erstkontakt-Signal. Die Weiche im EINSTIEG hatte nur EIN sichtbares
     Zeichen: Liegt Kontext vor, steht er da; liegt keiner vor, steht nichts.
     Das Modell musste aus einer Nicht-Existenz schließen — und mistral-large
     schloss falsch: 30 von 30 Kaltstarts nahmen die Wiederkehr-Fassung, samt
     erfundener Erinnerungen ("seit unserem letzten Gespräch").
     Mit diesem Satz im Kontext: 0 von 30 (Szenario ERO-03). Ein Fehlen, das
     benannt ist, ist kein Fehlen mehr.
     BEWUSST SCHMUCKLOS: kein Versalienwort, keine Klammern, kein Doppelpunkt-
     Etikett. Die Testfassung hieß "ERSTKONTAKT (app-intern): …" — daraufhin
     erfand das Modell passende Marken dazu ([[EINSTIEG]], [[START]]) und ging
     bei den Marken von 27/30 auf 30/30. Der Kontexttext lehrt eine Formsprache
     mit; dieser hier führt keine vor. */
  erstkontakt: "Es gibt zu dieser Person noch keinen Kontext: keine frühere Sitzung, keine Zeitleiste, keine Merkposten, kein freigegebenes Material. Ihr habt euch noch nicht kennengelernt.",

  start: {
    solo: "Ich bin da und möchte beginnen. Eröffne das Gespräch von dir aus.",
    einzel: "Ich bin da und möchte mit der Auftragsklärung beginnen. Eröffne die Session von dir aus.",
    gemeinsam: "Wir sind beide da und möchten mit der gemeinsamen Klärung beginnen. Eröffne die Session von dir aus.",
    moment: "Wir sind beide da und möchten beginnen. Eröffne die Session von dir aus.",
  },
  freigabeGequert: "SHARING-RESULT: gequert über {paths}",
  freigabeNichts: "SHARING-RESULT: nichts gequert",
  freigabeWeiterarbeiten: "SHARING-RESULT: Ich möchte noch weiter daran arbeiten.",
  freigabeAnzahl: "SHARING-RESULT: {n} von {gesamt} Punkten freigegeben. [Die Auftragsklärung ist damit abgeschlossen. Bestätige das kurz, leicht und zuversichtlich (gute Basis fürs gemeinsame Gespräch) und öffne in DERSELBEN Nachricht den NACHKLANG: Diese Session bleibt offen — lade ausdrücklich ein, jederzeit noch etwas zu korrigieren, zu spezifizieren oder nachzufragen. Erzeuge KEINEN neuen Abschluss-Block und keine Kapitel-Marken.]",
  freigabeAnpassen: "SHARING-RESULT: Ich möchte vor der Freigabe noch etwas anpassen.",
  weiterMitKapitel: "[Weiter mit Kapitel {n}.]",
  scaleErgebnis: "SCALE-RESULT: {id}={wert}",
  scaleClosingErgebnis: "SCALE-RESULT: closing {nameA}={a} · {nameB}={b}",
  choiceErgebnis: "CHOICE-RESULT: {id}={wahl}",
  momentAbschluss: "[CLOSE MOMENT]",
  momentOhneTeilen: "[CLOSE MOMENT · KEEP]",
  soloAbschluss: "[CLOSE SESSION]",
  /* S105.5 · Zweiter Druck auf den Abschluss-Knopf, waehrend die Gabelung
     offen steht. Das ist keine zweite Abschlussbitte, sondern die ANTWORT auf
     die Gabelung: die dritte Tuer. Die App weiss das, weil sie das Ereignis
     kennt — das Modell muesste es raten. */
  soloOhneTeilen: "[CLOSE SESSION · KEEP]",

  einzelRueckkehr: "[Rückkehr nach Abschluss: Die Auftragsklärung ist bereits abgeschlossen und freigegeben; ich betrete den Raum erneut. Eröffne den NACHKLANG.]",
  einzelWeiter: "[Rückkehr in die laufende Auftragsklärung: Ich betrete den Raum erneut; die Session ist pausiert. Eröffne den WIEDEREINSTIEG.]",
  gemeinsamWeiter: "[Rückkehr in die laufende Gemeinsame Auflösung: Wir betreten den Raum erneut; die Session war pausiert. Eröffne den WIEDEREINSTIEG.]",
  /* S94 · Die Revisionstexte der beiden Wächter leben im Korpus, nicht mehr
     hartkodiert im Modul: Bei einer englischen Session bekam das Modell bis
     S93 eine deutsche SYSTEM-REVISION. Die Heuristik bleibt im Modul, der
     Wortlaut gehört zur Sprachfassung. */
  aufdeckRevision:
    "[SYSTEM-REVISION: Deine letzte Nachricht gibt Inhalte der Stapel im Text wieder \u2014 " +
    "die zeigt ausschlie\u00dflich die Tafel der App (STAPEL-WIEDERGABE-VERBOT). " +
    "Wiederhole die Nachricht ohne jede Wiedergabe von Stapel-Inhalten; nenne h\u00f6chstens die RICHTUNG. " +
    "Wenn beide zugestimmt haben und die Richtung gew\u00e4hlt ist, beende die Nachricht mit genau einer " +
    "Aufdeck-Marke ([[REVEAL-A]] oder [[REVEAL-B]]) allein in der letzten Zeile.]",
  urteilsRevision:
    "[SYSTEM-REVISION: Deine letzte Nachricht enth\u00e4lt ein Urteil aus der Richterposition " +
    "(\"Das ist \u2026\", \"Das klingt \u2026\", \"eine starke Fassung\" o. \u00e4.). Auch positive Urteile sind Urteile. " +
    "Wiederhole die Nachricht ohne jede Benotung: Spiegle nah an den Worten der Person, " +
    "oder \u2014 wenn du eine eigene Wahrnehmung anbietest \u2014 aus der Ich-Perspektive MIT R\u00fcckfrage " +
    "(\"F\u00fcr mich klingt das wie \u2026 \u2013 stimmt das f\u00fcr dich?\"). F\u00e4llt dir nichts Substanzielles auf, " +
    "ist die beste Spiegelung kurz oder keine: Stell die n\u00e4chste Frage. " +
    "Inhalt und L\u00e4nge bleiben sonst gleich.]",
  aufdeckungAngezeigt: "REVEAL-SHOWN: Die App hat beiden die Richtung {owner} gezeigt – {owner}s Stapel neben dem Tipp von {tipper}, Berührungspunkte hervorgehoben; die Tafel bleibt im Verlauf sichtbar. Stelle jetzt ZUERST die offene Frage, was den beiden als Erstes ins Auge fällt bzw. was überrascht – eigene Beobachtungen erst danach.",
};

/* ── Korpus-Inhalte außerhalb der Systemprompts ──
   Sprachfassung; die LOGIK (Ableitungen, Bauer, Defs) bleibt einfach-instanzig
   in kernwetten/sessions/prozess und liest diese Inhalte über K().
   Die erläuternden Texte der Ergebnis-/Kontext-Bauer werden in Stufe C2
   zusammen mit prompts.en.js parametrisiert (vorher existiert keine
   EN-Session, die sie bräuchte). */
export const KAPITEL_TITEL = ["Ankommen & Landkarte", "Herzstücke", "Rate-Runde", "Klartext"];

export const QZ_STUFEN_TEXT = {
  1: null,   // sanfte Einladung braucht keinen Rahmen-Text
  2: "Es ist eine Weile her — ganz ohne Druck: Was macht es euch gerade schwer, gemeinsame Momente zu finden? (Die Frage ist die Einladung; eine Antwort ist optional.)",
  3: "Falls es am Kalender liegt: Mögt ihr direkt einen konkreten Termin für einen kleinen gemeinsamen Moment verabreden? Ein fester Platz nimmt die Entscheidung aus dem Alltag.",
  4: "Auch das ist eine legitime Möglichkeit: die gemeinsamen Momente bewusst zu pausieren, mit einem klaren Wiedereinstiegs-Datum — ein sauberer Ausstieg statt stiller Erosion.",
};

export const korpusTexte = {
  "titel.solo": "Reflexionsgespräch",
  "titel.einzel": "Auftragsklärung",
  "titel.gemeinsam": "Gemeinsame Auflösung",
  "titel.moment": "Qualitätszeit",

  /* Builder-Erklärtexte (S30·C2) — Header-Token bleiben sprachinvariant. */
  "rank.howto": "Du kannst jederzeit umsortieren oder etwas herausnehmen; Antippen genügt. Die Gegensatzpaare stehen als einzelne Pole zur Wahl. Sortiert wird nach Gefühl, nicht nach Perfektion.",
  "rank.self.titel": "Was liegt dir am meisten am Herzen?",
  "rank.self.desc": "Wähle die fünf Dinge in den Stapel, die dir in eurer Beziehung am meisten am Herzen liegen – ganz oben, was dir am allerwichtigsten ist. Du darfst auch beide Seiten eines Gegensatzpaars stapeln.",
  "rank.self.kopf": "RANKING-RESULT – Top 5 (1 = liegt {me} am meisten am Herzen; Gegensatzpaare standen als getrennte Pole zur Wahl; die übrigen {rest} Einträge blieben bewusst ungeordnet; bei mehreren Ergebnissen zählt das jüngste):",
  "rank.pwichtig.titel": "Was liegt {partner} vermutlich am meisten am Herzen?",
  "rank.pwichtig.desc": "Reine Vermutung – du kannst es nicht wissen, und genau darum geht es. Wähle die drei Dinge in den Stapel, die {partner} vermutlich am wichtigsten sind.",
  "rank.pwichtig.kopf": "PARTNER-GUESS (Top 3, geraten von {me}; 1 = liegt {partner} vermutlich am meisten am Herzen; bei mehreren Ergebnissen zählt das jüngste):",
  "rank.pchange.titel": "In welchem Bereich wünscht sich {partner} vermutlich am meisten Veränderung?",
  "rank.pchange.desc": "Wieder reine Vermutung, kein richtig oder falsch. Wähle den einen Bereich in den Stapel, in dem sich {partner} vermutlich gerade am meisten Veränderung wünscht.",
  "rank.pchange.kopf": "PARTNER-GUESS-CHANGE (geraten von {me}; bei mehreren Ergebnissen zählt das jüngste):",
  "regler.kopf": "SLIDERS-RESULT (Reglerpositionen intern auf 1–10 abgebildet; {me} hat keine Zahlen gesehen – qualitativ spiegeln; bei mehreren Ergebnissen zählt das jüngste):",
  "regler.zeilePole": "{t}: Ist-Position {w} · Stimmig-Position {z} (Spektrum: 1={p0} … 10={p1})",
  "regler.zeileNormal": "{t}: Wichtigkeit {w} · Zufriedenheit {z}",
  "startwerte.kopf": "BASELINE-RESULT (verdeckt erhoben, gleichzeitig aufgedeckt; 1–10, \"Wie nah seid ihr dem heute?\"):",
  "aufdeckk.kopf": "REVEAL-CONTEXT (app-intern; nicht als Block zitieren)",
  "aufdeckk.top5": "{name} – Top 5 (eigener Stapel): ",
  "aufdeckk.guess3": "{name} – Tipp (vermutete Top 3 des Partners): ",
  "klaerung.aufdeckAussteht": "AUFDECKUNG STEHT AUS — beginne mit dem AUFTAKT. REVEAL-CONTEXT:",
  "klaerung.protokoll": "REVEAL-PROTOCOL (die Aufdeck-Runde hat bereits stattgefunden): ",
  "klaerung.beruehr": "Berührungspunkte: ",
  "klaerung.vorgemerkt": "Für die Klärung vorgemerkt: ",
  "sk.kopf": "COMPANION-CONTEXT (app-intern; nicht zitieren, keine Tokens nennen — dramaturgisch einbringen):",
  "sk.merkpostenKopf": "MERKPOSTEN (offen — von dir früher vorgemerkte bedeutsame Themen; aktiv, aber behutsam wieder aufgreifen und am Sitzungsende Teilen anbieten, nie automatisch queren; Sicherheits-Weiche gilt):",
  "sk.materialKopf": "FREIGEGEBENES MATERIAL (gemeinsame Schicht, von beiden):",
  "sk.zeitleisteKopf": "EIGENE ZEITLEISTE (jüngste Einträge):",
  "sk.sessionsKopf": "LETZTE GEMEINSAME SESSIONS:",
  "ak.kopf": "ANLASS DIESER SITZUNG (app-intern; nicht zitieren, keine Tokens nennen):",
  "ak.teilenAusVerlauf": "Die Person hat gerade das Protokoll vom {datum} [{topics}] gelesen ({vid}) und ist von dort aus hierher gekommen, weil sie daraus etwas teilen möchte. Der WORTLAUT dieses Gesprächs liegt dir bereits vor (RECALL-RESULT weiter unten) — du musst ihn nicht anfordern. ERÖFFNUNG (S106): Nenne in EINEM Satz dreierlei, dann frage offen. (1) Den ANKER: von wo sie kommt, Datum und Thema. (2) Den ZUSTAND: dass der Wortlaut dir vorliegt. (3) Den WEG: dass sie beim Abschluss dieser Sitzung etwas davon teilen kann. Nimm dabei KEINE der drei Türen vorweg — nenne weder Ausschnitt noch Selbstmitteilung noch Behalten, sondern halte es offen: in welcher Form es zu {partner} finden kann. Und schiebe nicht zum Ende: Der Weg ist eine Auskunft, keine Aufforderung, die Sitzung zu beenden. Danach die offene Frage, was sie daran beschäftigt. Diese Orientierung fällt EINMAL, in der ersten Nachricht — danach nie wieder. Das ist die AUSNAHME zur Regel, dass die Bedienung die Oberfläche trägt: Sie gilt, solange die Oberfläche den Weg zeigt. Hier zeigt sie ihn nicht — zur Auswahl führt ein Knopf, auf dem nur Session abschließen steht. Alles Übrige gilt unverändert: die Sicherheits-Weiche, die M1-Bremse, und der Freigabe-Ort erst am Abschluss dieser Sitzung. Schlage von dir aus KEINE Stellen vor und nimm die Gabelung nicht vorweg — der Anlass ist eine Ausgangslage, keine Entscheidung.",
  "mk.kopf": "MOMENT-CONTEXT (app-intern; nicht als Block zitieren, dramaturgisch einbringen):",
  "mk.auftraegeLeer": "GOALS: noch keine.",
  "mk.agendaKopf": "AGENDA (offen):",
  "mk.vermeidenKopf": "ZU VERMEIDEN (beidseitig bestätigte Ausschluss-Zeilen aus dem Befund – stille Achtsamkeits-Marker für dich: nie abfragen, nie vorlesen; die Ausrichtung des Paars bleibt positiv):",
  "mk.agendaVon": "- von {name}: ",
  "mk.agendaWunsch": " (Wunsch: {wish})",
  "mk.agendaKandidat": " [ZIEL-KANDIDAT: als gemeinsames Ziel vorgeschlagen — greife das aktiv auf und lade zur Entscheidung zu zweit ein; erst der gemeinsame Beschluss macht daraus ein Ziel (AUFTRAG-BLOCK).]",
  "mk.agendaVorgemerkt": " [VORGEMERKT: Das Paar will diesen Punkt in der Qualitätszeit besprechen — sprich ihn von dir aus an.]",
  "mk.agendaLeer": "AGENDA: leer.",
  "mk.fruehereKopf": "PREVIOUS MOMENTS (jüngste zuletzt):",
  "mk.fruehereLeer": "PREVIOUS MOMENTS: keine — dies ist der erste Termin (keine offene Tür).",
  "mk.impulsWar": " · Zwischenzeit-Impuls war: ",
  /* S109 · Der Kopf trug bis hierher die Sprache VOR dem Beziehungswesen
     ("Treffer zuerst", "Lese-Richtungen", "einzelne Zahlen darfst du
     aussprechen") — und damit das Gegenteil dessen, was der Prompt seit S107
     sagt. Er steht naeher an den Daten als der Prompt; ein Widerspruch an
     dieser Stelle ist derselbe Fehler wie der in MRV-01 (S108), nur zwischen
     Kontext und Prompt statt innerhalb des Prompts. */
  "mk.prozessKopf": "META-REFLECTION (aufzudecken — die Werte stehen nie in der UI und werden nie als Block vorgelesen; sprich KEINE Zahlen aus, sondern erzähle in Worten (»da liegt ihr nah beieinander« / »da liegt ein Stück dazwischen«); beginne mit dem Beziehungswesen, danach Passung und Wirksamkeit je Thema; die beiden Sichten nie im selben Atemzug, nie Mittelwert oder Score):",
  "mk.prozessNachtrag": "META-REFLECTION jetzt bereit (nachgereicht — gleiche Regeln: keine Zahlen aussprechen, in Worten erzählen; Beziehungswesen zuerst, dann Passung und Wirksamkeit; die beiden Sichten nie im selben Atemzug, nie Mittelwert/Score; nach der Aufdeckung [[META-REVEALED]] setzen — in einer Nachricht OHNE Frage):",
  "mk.prozessVerlauf": "MESS-VERLAUF (letzte aufgedeckte Runden — NUR Material für die Trajektorien-Vertiefung: eine Tür, nie eine Feststellung — der erste Satz dazu ist die Frage; der Fortschritt gehört dem Paar; kein Aggregat, kein Score, keine Zahlen aussprechen):",
  "mk.prozessLeer": "META-REFLECTION: keine ausstehend.",
  "mk.zwischenzeitKopf": "IN-BETWEEN MATERIAL (freigegeben):",
  "mk.qzKopf": "ZWISCHENZEIT-EINLADUNGEN (Leiter-Stand):",
  "mk.qzWahlen": "Letzte Wahlen: ",
  "mk.qzWahlenLeer": "Letzte Wahlen: keine.",
  "mk.qzStufe": "Leiter-Stufe: ",
  "mk.materialVon": "- von {name}: ",
  "mk.materialLeer": "IN-BETWEEN MATERIAL: keines.",
  "mk.namen": "Namen: {nameA} (A), {nameB} (B).",
  /* S107 · Das Beziehungswesen. Beide bewerten DASSELBE Dritte — eine Differenz
     heißt "wir sehen unsere Beziehung verschieden", nicht "einer liegt falsch".
     Kein wahrer Wert, keine Rollen, nichts zu vergleichen. */
  "mess.wesen": "Beziehungswesen: {nameA} {a} · {nameB} {b} ⇒ Abstand {diff} (zwei Sichten auf dasselbe Dritte, kein Fehler, kein Mittelwert)",
  "scale.safety.titel": "Wie sicher fühlst du dich bei {partner}?",
  "scale.safety.text": "Gemeint ist dein Gesamtgefühl: Wie gut kannst du bei {partner} du selbst sein, dich entspannen und aussprechen, was dich wirklich bewegt?",
  "scale.safety.min": "1 · gar nicht",
  "scale.safety.max": "10 · völlig",
  "scale.closing.titel": "Wie hat sich dieses Gespräch angefühlt?",
  "scale.closing.min": "1 · wie eine Prüfung",
  "scale.closing.max": "10 · verbindend",
  "choice.connect.titel": "Womit mögt ihr ankommen?",
  "choice.connect.o1": "Eine Minute gemeinsame Stille",
  "choice.connect.o2": "Einen Moment Blickkontakt halten",
  "choice.connect.o3": "Hand halten – einfach so",
  "choice.connect.o4": "Einen positiven Gedanken über den anderen teilen",
  "choice.connect.ohne": "Ohne Übung weiter",
  "choice.arrive.titel": "Womit mögt ihr wieder ankommen?",
  "choice.arrive.ohne": "Ohne Ankommens-Moment weiter",
  "choice.farewell.titel": "Mögt ihr eine kleine Einladung mitnehmen?",
  "choice.farewell.ohne": "Ohne Einladung verabschieden",
  /* S107 · Passung × Wirksamkeit je Thema. Hohe Passung bei niedriger
     Wirksamkeit ist die Stelle, an der das Paar Hilfe braucht. */
  /* S109 · mess.markerDistanz/Ueber/Unter entfernt — sie gehoerten zu
     pruefeLeserichtung, das mit S107 ersatzlos entfallen ist. */
  "mess.wirksam": "Wirksamkeit je Thema: ",
  "mess.verlaufZeile": "{datum}: Beziehungswesen {nameA} {a} · {nameB} {b} (Abstand {diff})",
  "mess.fit": "Auftrags-Passung: ",
  "qm.kopf": "MATERIAL (gemeinsame Ebene):",
  "qm.auftraege": "Aufträge: ",
  "qm.auftraegeLeer": "Aufträge: keine aktiven.",
  "qm.material": "Freigegebenes Material: ",
  "qm.materialLeer": "Freigegebenes Material: keines.",
  "qm.ruhend": "RESTING (nicht vorschlagen): ",
  "qm.ruhendLeer": "RESTING: nichts.",
  "qm.zuletzt": "Zuletzt gewählt: ",
  "qm.vorgemerkt": "Vorgemerkte Gesprächspunkte: ",
  "qm.katalog": "CATALOG der Lebensbereiche:",
};

export const strukturTexte = {
  kopf: `AUSGABEFORMAT (gilt vor allem Folgenden): Jede deiner Nachrichten ist GENAU EIN Aufruf des Werkzeugs "turn" mit den Feldern antwort/marker/block — kein Text außerhalb des Werkzeugs, keine zweite Ausgabe daneben.`,
  antwort: `"antwort" ist dein Begleitertext an die Person — das Einzige, was sie sieht. ALLE Gesprächsregeln unten gelten unverändert für dieses Feld. In "antwort" stehen NIE Marken (kein [[…]]), keine Block-Marken (kein "…-BLOCK"), kein JSON.`,
  marken: `MARKEN: Wo die Regeln unten sagen "beende deine Nachricht mit der Marke [[X]] allein in der letzten Zeile", setze stattdessen marker:"X" (ohne Klammern) — WANN eine Marke steht, regeln allein die Regeln unten, wortgleich. Keine Marke ⇒ marker:null. Marken dieser Sitzung: {liste}.`,
  ohneMarken: `MARKEN: Diese Sitzung kennt keine Marken — es gibt kein marker-Feld.`,
  bloecke: `BLÖCKE: Wo die Regeln unten sagen, gib "X-BLOCK … END X-BLOCK" mit JSON dazwischen aus, setze stattdessen block:{"typ":"…","daten":{…}} — "daten" ist GENAU das dort beschriebene JSON-Objekt, Feld für Feld unverändert samt allen dortigen Regeln (auch die Unsichtbarkeits- und Reihenfolge-Regeln der Blöcke gelten wortgleich). WANN ein Block steht, regeln allein die Regeln unten. Kein Block ⇒ block:null; höchstens EIN Block je Nachricht. Übersetzung für diese Sitzung:`,
  zeile: `{start} ⇒ typ "{typ}"`,
  schluss: `Alles andere — Anlässe, Reihenfolgen, Verbote, Ton, Steuertexte — gilt wortgleich weiter. Beispiel: Eine Nachricht, die laut Regeln einen NOTE-BLOCK trägt, trägt weiterhin keine Marke (marker:null).`,
};

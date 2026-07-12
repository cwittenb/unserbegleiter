# Sprint 37 — Protokoll · Auftragsklärung: Texte & Verhalten, Wire-Leck geschlossen, Kopfzeile & UI-Sprache

**Datum:** 12. Juli 2026 · **Stand:** 415 Tests grün (Ebene 1: 338 · Engine: 20 · Worker: 57) · Kern-Hash `58a644429aa2c517` · **Basis: patch-s36** (bitte in dieser Reihenfolge anwenden)

## Korpus (de + en re-authored)

**Eingangstext kanonisch.** Phase 0 eröffnet mit dem festgelegten Wortlaut („Hallo {Name}! Schön, dass du da bist. Hier bin ich ganz bei dir. …"), inkl. Privatheit/Häkchen-Freigabe, KI-Transparenz („kein Mensch und kein Therapeut"), Sinn der Auftragsklärung („wohin kann ich dich und {Partner} begleiten?") und Nennung der vier Kapitel — **Ankommen & Landkarte · Herzstücke · Rate-Runde · Klartext** (die bestehenden Korpus-Titel; „Herzstücke" war treffender als das geplante „Genauer hinschauen"). Aufhören geht formlos: Stand bleibt gespeichert, Wiederaufnahme jederzeit.

**Wiedereinstieg nahtlos.** Keine Rückkehr-Begrüßung mehr („Willkommen zurück" verwirrt, wenn man einfach weitermacht) — für die Person ist es dasselbe Gespräch, das weitergeht.

**Landkarten-Übergang entschärft.** Ruhige Tonlage statt Theatralik: „An einigen Stellen bin ich neugierig geworden – da würde ich dir als Nächstes gern ein paar Fragen stellen." Genau EIN Ausblick-Satz, Doppelungen ausgeschlossen.

**Umformung hörend statt korrigierend.** Neue kanonische Einleitung: „Ich habe jetzt gehört: … Was daran vielleicht anders ist: Ich habe die Gewissheit herausgenommen – nicht …, sondern …. Und ich habe es klar als deine Innenerfahrung markiert, nicht als Aussage über {Partner}. … trifft das noch den Kern dessen, was du sagen willst?" Dazu eine harte Sprachregel: nie „gesprächsfähig machen" oder „ohne Abwehr gehört werden" — erlaubt: „damit es besser landen kann" / „eher auf offene Ohren trifft". (Kanarienvogel angepasst: Kleinschreibung nach Gedankenstrich.)

**Abschluss.** Der Block wird nie beim Namen genannt oder angekündigt (höchstens „Dann haben wir alles zusammen."); Abschiedston: „Ich freue mich auf **unser** gemeinsames Gespräch" — die Begleitung ist dabei; Formulierungen wie „Ich wünsche euch ein gutes Gespräch" ausdrücklich verboten.

## Wire & Anzeige

**SLIDERS-RESULT-Leck geschlossen — auf dem Sendeweg.** Die Ergebnis-Nachrichten der Kernwetten-Panels (Regler, Ranking, Partner-Vermutungen, Startwerte) sind Wire, keine Äußerung der Person: Sie gehen jetzt wie SCALE/CHOICE (S35-Muster) mit `hidden` über den Draht — vollständig im Transkript fürs Modell, nie im Chat. Dazu ein **Wächter-Test**: Nach dem Panel-Durchlauf darf kein Wire-Kopf (SLIDERS-/RANKING-/BASELINE-/SCALE-RESULT, PARTNER-GUESS) im gerenderten DOM auftauchen.

**Block-Platzhalter ohne eckige Klammern.** „[Deine Abschluss-Übersicht zur Freigabe:]" → „Deine Abschluss-Übersicht zur Freigabe:" — Klammern sind kein sinnhafter Nutzer-Output (alle 9 Platzhalter, plus Kanarienvogel: kein Platzhalter beginnt/endet mit Klammer).

## UI

**Pause-Knopf entfällt.** Der Kapitel-Zwischenhalt bietet nur noch „Weitermachen" — man hört einfach auf (Raum verlassen), der Stand bleibt gespeichert; die i18n-Schlüssel `kapitel.pause`/`kapitel.gespeichert` sind entfernt.

**Kopfzeile.** „Paarbegleitung" steht als Untertitel links unter dem Hallo (`pb-brand`), nicht mehr rechts am alten Platz des Sprachschalters.

**UI-Sprache im Paarsprache-Panel.** Neben „Wechsel zu Englisch vorschlagen" gibt es „Nur UI-Sprache ändern (…)": stellt ausschließlich die eigene Ansicht um (pstate, Relaunch), mit Hinweiszeile, dass sich für den Partner nichts ändert — klar getrennt vom beidseitig bestätigten Begleitsprachen-Wechsel.

## Tests

+10 (`tests/unit/s37-auftragsklaerung.spec.js`): Korpus-Kanarien de/en (Eingangstext mit Kapitelnamen, nahtloser Wiedereinstieg, ruhiger Übergang, hörende Umformung + Sprachregel, Abschluss-Regeln), Platzhalter-Wächter, Wire-hidden + DOM-Wächter über echten Regler-Durchlauf, Kapitel-Panel ohne Pause, pb-brand-Kopfzeile, UI-Sprachwechsel-Drehbuch. Angepasst: block.spec/ui.spec (Platzhalter ohne Klammern), onboarding-aufdeck-Kanarien (Umformungs-Wortlaut).

## Offen (S38/S39)

Prioritäten-Board (5 Plätze, Drag & Drop + Touch-Fallback) · Abschluss-Bewusstsein der Auftragsklärung · Zeitleisten-Einträge für Auftragsklärung/Prozessreflexion (S38). Kontextbewusstes Reflexionsgespräch (kalter vs. Wiederkehrer-Eingangstext, Anknüpfungsfrage aus dem Systemprompt-Kontext) · Prozessreflexions-Intervall (beidseitig bestätigt, frei wählbar, Default 1 Woche, Fragetext bezieht das Intervall ein) (S39).

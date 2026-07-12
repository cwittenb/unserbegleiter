# Sprint 39 — Protokoll · Kontextbewusstes Reflexionsgespräch & Prozessreflexions-Rhythmus

**Datum:** 12. Juli 2026 · **Stand:** 432 Tests grün (Ebene 1: 355 · Engine: 20 · Worker: 57) · Kern-Hash `fdaf73134d7410b9` · **Basis: origin/main (patch-s38, Kern `26405540553ced29`)**

## Kontextbewusstes Reflexionsgespräch

**Fund:** Der `reflexionsPrompt` erwartete längst einen COMPANION-CONTEXT — die App hat ihn für Solo aber nie gebaut. Diese Lücke ist zu:

- **Neuer Bauer** `baueSoloKontext` (sessions.js): aktive Aufträge, freigegebenes Material BEIDER (gemeinsame Schicht — Zeugen-Material bleibt strukturell auf diese beschränkt), die EIGENE Zeitleiste (jüngste 5 Einträge, inkl. der neuen Auftragsklärungs-/Prozessreflexions-Chronik aus S38) und die letzten 3 gemeinsamen Sessions. Ist nichts davon vorhanden, liefert er `null` — dann geht **kein** Kontext über den Draht.
- **App** (startChat solo, neue Session): Kontext wird als versteckte erste Nachricht eingespeist; er erscheint nie im Chat (Wächter-Test).
- **Zwei kanonische Einstiege** (de + en re-authored) im Prompt: Ohne Kontext der kalte Start („… da wir uns noch gar nicht kennengelernt haben, starten wir einfach gemeinsam bei null. Ich könnte fragen: Was wünschst du dir für dich – und für dich und {Partner} – aus dieser Arbeit hier? …"). Mit Kontext die Wiederkehr („Schön, dass du wieder da bist … Wollen wir an <Anknüpf-Anker> anknüpfen? Ich könnte fragen: <Anknüpfungsfrage>? …"). Regeln: Anker nennt NUR, was der Kontext wirklich enthält; genau EINE konkrete, offene Anknüpfungsfrage, generiert aus dem jüngsten Material, nah an der Sprache der Person, ohne Tokens/Zahlen/Diagnose-Ton; „wir kennen uns noch nicht" ist bei vorhandenem Kontext ausdrücklich verboten. Die Frage entsteht im ersten Turn aus dem Systemprompt-Kontext (Option A aus der Planung — kein separater LLM-Call, keine Wartezeit).

## Prozessreflexions-Rhythmus

- **Geteilter Vertrag** `messIntervall` (bstate): frei wählbarer Abstand in Tagen, **Default einmal die Woche**. Änderung nach dem Begleitsprachen-Muster: eine Person schlägt vor, die ANDERE bestätigt (`schlageMessIntervallVor` / `antworteMessIntervall`: bestätigen, ablehnen, zurückziehen) — vorher bleibt der alte Rhythmus wirksam.
- **UI im gemeinsamen Raum:** dezente Link-Zeile „Prozessreflexions-Rhythmus: einmal die Woche" klappt die Vertragskarte auf (Eingabe in Tagen, Vorschlagen; offener Vorschlag klappt beim Partner von selbst auf, mit Bestätigen/Ablehnen).
- **Fenster-Gating** (`messFenster`): Eine NEUE Runde öffnet erst, wenn der eigene letzte Beitrag mindestens das Intervall zurückliegt — Beiträge tragen dafür jetzt einen Zeitstempel. Wichtig: Eine bereits **offene Runde des Partners bleibt immer beantwortbar** (Runden werden zu zweit fertig). Gesperrt zeigt die App den Rhythmus und das Öffnungsdatum.
- **Fragetext bezieht den Abstand ein:** „Wie nah hast du dich {Partner} **in der letzten Woche** gefühlt?" — bei anderen Intervallen „in den letzten {w} Wochen" / „in den letzten {n} Tagen" (de + en).

Ehrliche Grenze (wie beim Verdeckt-Prinzip dokumentiert): das Fenster ist eine App-Zusicherung, kein Server-Gating.

## Tests

+10 (`tests/unit/s39-kontext-rhythmus.spec.js`): Kontext-Bauer (null bei leer; alle vier Sektionen bei Befüllung) · kalter Start ohne Draht-Kontext · Wiederkehr mit verstecktem Kontext, nie im DOM · Einstiegs-Kanarien de/en · Vertrag Default/Vorschlag/Bestätigung/Ablehnen/Zurückziehen · Fenster (2 Tage gesperrt, 8 Tage offen, Partner unbetroffen) · Zeitraum im Fragetext + Abgegeben-Ansicht · Rhythmus-Panel-Drehbuch. Angepasst: prozess-qz.spec (Beitrag trägt Zeitstempel → toMatchObject).

## Damit ist die UX-Liste vom 12.07. vollständig umgesetzt (S36–S39)

Offen bleiben die bewusst zurückgestellten Punkte: Goal-Reflexion im Auftragsklärungs-Raum nach der Aufdeckung im Zusammenspiel mit der Prozessreflexion (Spezifikation ausstehend) sowie die bekannten Horizont-Themen (Wire-Anglisierung Rest, Body-Check-in, Eval-Harness-Vollausführung).

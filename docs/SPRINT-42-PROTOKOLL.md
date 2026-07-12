# Sprint 42 — Protokoll · Qualitätszeit als DIE gemeinsame Session

**Datum:** 12. Juli 2026 · **Stand:** 482 Tests grün (Ebene 1: 405 · Engine: 20 · Worker: 57) · Kern-Hash `182decc0c5177d3a` · **Basis: origin/main (patch-s41-vorraum-struktur-badges-waechter, Kern `a34d19815544ae16`)**

## Befund vorab

Der `momentPrompt` war bereits als Qualitätszeit geschrieben („hier moderierst du die GEMEINSAME QUALITÄTSZEIT") und erwartete den Abschluss über das Steuer-Token `[CLOSE MOMENT]` — **das die App nie gesendet hat**. Daher der Review-Fund: Das Modell verabschiedete sich verbal, behauptete „Protokoll gespeichert", aber die Session blieb offen und der nächste Klick zeigte den alten Verlauf. Dieselbe Klasse Lücke wie beim COMPANION-CONTEXT (S39): Prompt erwartet, App liefert nicht.

## Gebaut

**Beschriftung & Zustand.** Die Session heißt durchgängig Qualitätszeit (`def.titel`, `teil.moment` = „Qualitätszeit beginnen", `weg.momentOffen` angepasst); bei laufender Session zeigt der Button „Qualitätszeit fortsetzen" (`teil.momentWeiter`, über `wendeLageAn`).

**Sauberes Beenden — drei Schlösser.** (1) Neuer Chat-Kopf-Knopf „Session abschließen" (nur in einer laufenden Qualitätszeit sichtbar) sendet `steuerTexte.momentAbschluss` = `[CLOSE MOMENT]` als Wire; das Modell führt den Abschluss-Akt zu Ende und erzeugt den MOMENT-BLOCK. (2) Prompt-Regel erweitert: Auch ein **erkennbar verbales Ende** des Paares löst den Abschluss-Akt samt Block aus — und das Modell darf **nie** von sich aus behaupten, ein Protokoll sei „gespeichert"; die App legt ab, das Paar findet es unter „Gemeinsame Momente". (3) App-seitig: Eine Qualitätszeit mit Status ≠ running wird beim Wiederbetreten **nicht** wieder aufgemacht — der nächste Klick startet frisch; das Protokoll liegt im Zeitstrahl.

**Gemeinsame Momente = Protokoll-Zeitstrahl.** Das bisherige QZ-Einladungs-Menü (boxQz mit „Einladungen holen") ist ersetzt: „Gemeinsame Momente" zeigt jetzt chronologisch die Protokolle der gemeinsamen Sessions (Qualitätszeiten aus `momentLog` mit Datum, Themen, Summary und gewähltem Zwischenzeit-Impuls; die Aufdeck-Runde aus `revealLog`), nur lesbar, analog „Meine Zeitleiste". Ab S43/S44 kommen Auflösung und Standortbestimmung dazu.

**QZ-Leiter integriert.** Der separate qzDef-Engine-Aufruf entfällt aus der App. Stattdessen: (a) `baueMomentKontext` trägt den Leiter-Stand in den Sessionkontext — RESTING-Bereiche, letzte Wahlen, Leiter-Stufe (neue Korpustexte `mk.qz*`, de+en); die Kontext-Beschreibung im Prompt nennt das ausdrücklich. Der Zwischenzeit-Impuls in Akt 3 kann damit RESTING respektieren und an Gewähltem anknüpfen — die Angebots-Grammatik und Stufenlogik des Prompts galten dort schon. (b) Wählt das Paar eine Einladung, persistiert der MOMENT-BLOCK-Handler sie über `waehleEinladung` in die Leiter (`qualitytime.choices`, Reset-Logik unverändert in prozess.js). Die Leiter-Funktionen (`qzStufe`, Ruhe-Logik, Pause) bleiben vollständig in Kraft; nur der Eingabeweg ist jetzt die Session.

**Bewusst verschoben:** Die Mess-Aufdeckung bleibt vorerst in der Qualitätszeit-Dramaturgie — sie zieht erst in S44 zur Standortbestimmung um (sonst ginge zwischenzeitlich Funktion verloren); dann kommt auch der Standortbestimmungs-Vorschlag in die QZ.

## Tests

+6 (`tests/unit/s42-qualitaetszeit.spec.js`): beginnen↔fortsetzen · Frischstart nach Abschluss (alter Verlauf erscheint nicht wieder) · Abschluss-Drehbuch (Knopf → `[CLOSE MOMENT]` hidden über den Draht → MOMENT-BLOCK → Status finished, Knopf weg, momentLog-Eintrag, gewählte Einladung in der Leiter) · Korpus-Kanarien de/en (verbales Ende, „gespeichert"-Verbot, Steuer-Token) · Momente-Zeitstrahl (chronologisch, Aufdeck-Eintrag, Impuls-Zeile, leerer Zustand, kein qzHolen mehr) · Leiter-Stand im Kontext. Umgezogen: das alte QZ-Menü-Drehbuch aus prozess-qz.spec (Funktion lebt jetzt in der Session); Leiter-Logik-Tests unverändert grün.

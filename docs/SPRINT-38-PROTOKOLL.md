# Sprint 38 — Protokoll · Prioritäten-Board, Nachklang der Auftragsklärung, Zeitleisten-Chronik

**Datum:** 12. Juli 2026 · **Stand:** 422 Tests grün (Ebene 1: 345 · Engine: 20 · Worker: 57) · Kern-Hash `26405540553ced29` · **Basis: patch-s37** (Reihenfolge: s36 → s37 → s38)

## Prioritäten-Board („Was liegt dir am meisten am Herzen?")

Das Ranking-Panel zeigt jetzt **topN nummerierte Plätze** (5 beim Herzens-Ranking, 3/1 bei den Vermutungen), leere Plätze gestrichelt als „frei — hierhin ziehen oder antippen". Interaktion:

- **Drag & Drop:** Pool-Chip auf einen Platz ziehen — besetzter Platz wird **ersetzt**, das alte Item fällt in den Pool zurück; Platz-Item auf einen anderen Platz ziehen sortiert um (Einfügen mit Nachrücken).
- **Tipp-Fallback (Touch):** Chip antippen → erster freier Platz (bisheriges Verhalten bleibt); Platz-Item antippen → auswählen (markiert), zweiten Platz antippen → dorthin verschieben. ✕ entfernt weiterhin; Fertig erst bei vollem Stapel.

Natives HTML-Drag&Drop trägt die Maus-Seite; der Tipp-Pfad deckt Touch vollständig ab und nutzt dieselben Zustandsfunktionen (`setze`/`verschiebe`) — ein Logikkern, zwei Eingabewege. Die bestehenden Ranking-Drehbücher (kernwetten.spec) laufen unverändert.

## Abschluss-Bewusstsein (Nachklang)

Die Freigabe setzt neben `status: released` jetzt das persistente Flag `freigegeben`. Beim Wiederbetreten einer freigegebenen Auftragsklärung öffnet die App den **Nachklang**: Session wird wieder gesprächsfähig, eine versteckte Steuer-Nachricht (`steuerTexte.einzelRueckkehr`, Wire) instruiert das Modell, kurz zu begrüßen, den Abschluss zu benennen und offen zu fragen: **hinzufügen, richtigstellen — oder Zusammenfassung sehen?** Im Nachklang gelten harte Regeln (neuer Prompt-Abschnitt NACHKLANG, de + en): Zusammenfassung qualitativ ohne Zahlen/Tokens/Blocknamen; keine Kapitel-Marken, kein neuer Abschluss-Block, kein Kapitel-Neustart; wirkt eine Ergänzung auf die gemeinsame Arbeit, verweist die Begleitung freundlich darauf, dass die Aktualisierung der Aufträge ins gemeinsame Gespräch gehört. Damit ist der Raum nach der Aufdeckung anschlussfähig für die spätere Goal-Reflexions-Spezifikation (bewusst offen gelassen, wie notiert).

## Zeitleisten-Chronik

Neuer Helfer `zeitleistenEintrag` (persönliche Zeitleiste, fehlertolerant). Einträge entstehen bei: **Abschluss der Auftragsklärung** (ein Eintrag bei Freigabe: „… {n} von {gesamt} Punkten für die gemeinsame Session freigegeben.") und **Abgabe der Prozessreflexion** („Verdeckter Beitrag abgegeben — aufgedeckt wird gemeinsam …"). Beide erscheinen in „Meine Zeitleiste"; der Mein-Raum-Wegweiser wechselt dadurch wie vorgesehen von der Ausblick- auf die Rückblick-Zeile.

## Tests

+7 (`tests/unit/s38-board-nachklang.spec.js`): 5 Plätze mit frei-Markierung · Drag Pool→Platz ersetzt (altes Item zurück im Pool) · Drag Platz→Platz sortiert um · Tipp-Fallback Auswahl+Verschieben · Nachklang-Drehbuch (Status wieder running, Rückkehr-Steuertext hidden, Frage im Chat) · NACHKLANG-Kanarien de/en · Prozessreflexions-Abgabe schreibt Zeitleisten-Eintrag.

## Offen (S39)

Kontextbewusstes Reflexionsgespräch (kalter vs. Wiederkehrer-Eingangstext, Anknüpfungsfrage aus Übergabe/Zeitleiste/Sessionprotokollen im Systemprompt) · Prozessreflexions-Intervall (im gemeinsamen Raum beidseitig bestätigt, frei wählbar, Default 1 Woche; Fragetext bezieht das Intervall ein; Ausfüllen nur im Fenster).

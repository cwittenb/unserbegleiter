# Sprint 41 — Protokoll · Gemeinsamer Raum: Struktur, Wegweiser, Badges, Anzeige-Wächter

**Datum:** 12. Juli 2026 · **Stand:** 478 Tests grün (Ebene 1: 401 · Engine: 20 · Worker: 57) · Kern-Hash `a34d19815544ae16` · **Basis: origin/main (patch-s40-wissenslinsen-anteile-klein, Kern `b71ec19d789aeb63`)**

Hinweis Nummernverschiebung: Das im Review-Plan als „S40 Struktur & Anzeige" angekündigte Paket ist dieses S41 — origin/main hatte inzwischen ein paralleles S40 (Wissenslinsen, rein korpusseitig, UI unberührt). Die Folgesprints der Vorraum-Serie sind entsprechend S42 (Qualitätszeit), S43 (Auflösung mit integrierter Aufdeckung, Agenda v2), S44 (Standortbestimmung).

## Gebaut

**Startscreen-Wegweiser** führt jetzt mit der Auftragsklärung („Ein guter erster Schritt: Starte direkt mit deiner Auftragsklärung in deinem Raum — …"), hält das Reflexionsgespräch als Alternative offen („Deinen Raum kannst du auch erstmal für ein Reflexionsgespräch nutzen.") und schließt mit der Qualitätszeit. `weg.optAuftragDich` entfällt; Mein-Raum-Wegweiser unverändert.

**Vorraum in 4 Zeilen** analog Einzelraum: (1) Überblick-Karte „Euer Gemeinsamer Raum" mit neuer Begrüßung „Für alles, was ihr zu zweit macht. …" und integriertem Wegweiser (Lage-Hinweise wie gehabt), (2) drei Session-Karten nebeneinander (`pb-drei`, responsive), (3) Regal-Reihe (Regal · Agenda · Gemeinsame Momente) mit aufklappenden Inhaltspanels, PR-Rhythmus-Zeile darunter, (4) ← Zurück. Die zustandsabhängige Session-Zeile des Wegweisers (a/b/c aus dem Review) folgt in S43/S44, wenn die Buttons dem Zielbild entsprechen.

**Badges für ungelesene Freigaben:** Zähler-Badge am „Gemeinsamer Raum"-Button (Startscreen) und identisch am Regal-Knopf im Vorraum; Quelle ist `lage.regalNeu` (shelf-Freigaben des Partners ohne eigenes Gelesen-Flag), verschwindet bei null, pro Person naturgemäß verschieden. Zentrale Anwendung über `wendeLageAn` im Wegweiser-Zyklus.

**Gating sichtbar statt strafend:** Gesperrte Sessions (Gemeinsame Auflösung ohne beidseitige Freigabe, Aufdeck-Runde ohne beidseitige Wahl) sind ausgegraut; der Grund steht als stets sichtbare Zeile direkt unter dem Knopf (Touch-tauglich, kein Hover, kein Fehler-Popup): „Die Gemeinsame Auflösung öffnet, sobald ihr beide eure Auftragsklärung freigegeben habt." / „Die Aufdeck-Runde öffnet, sobald ihr beide eure Auftragsklärung so weit geführt und die Aufdeckung gewählt habt." Nach gelaufener Aufdeckung: eigener Text mit Verweis auf die Auflösung. Die Formulierungen bleiben absichtlich beidseitig unbestimmt — sie verraten nicht, an wem es hängt (Mini-Gate-Entscheidung bleibt privat). Der bisherige Fehler-Pfad beim Klick bleibt als strukturelle Rückfalllinie bestehen.

**Anzeige-Wächter für Wire-Köpfe (`WIRE_KOEPFE`, exportiert):** renderMsgs unterdrückt User-Nachrichten, die mit einem Ergebnis-Kopf beginnen (SLIDERS-/RANKING-/BASELINE-/SCALE-/CHOICE-/SHARING-RESULT, PARTNER-GUESS[-CHANGE], REVEAL-SHOWN) — unabhängig vom hidden-Flag. Der Sendeweg ist seit S35/S37 dicht; der Wächter schließt die letzte Lücke: **vor** dem Fix gespeicherte Sessions (Review-Fund „CHOICE-RESULT: connect=…"). Paritätstest: jeder von den Panel-Buildern und Steuertexten erzeugte Kopf (de+en) muss in der Wächter-Liste stehen — neue Ergebnis-Typen ohne Wächter-Eintrag schlagen fehl.

## Tests

+8 (`tests/unit/s41-vorraum.spec.js`): Wegweiser-Reihenfolge · 4-Zeilen-Layout mit integriertem Wegweiser · Ausgrauen + Hinweis, Öffnen bei beidseitiger Freigabe/Wahl · Badge-Zähler auf Start und Regal (eigene Freigaben zählen nicht), verschwindet bei null · Alt-Session-Wächter (CHOICE-RESULT ohne hidden wird nicht gerendert, normale Nachrichten schon) · Kopf-Parität de+en.

## Entschieden (Review-Nachträge)

Begrüßung mit einfachem „Für alles, was ihr zu zweit macht." (Doppelung als Tippfehler gelesen) · Badge als Zähler statt Punkt · Gating-Hinweis als sichtbare Zeile statt Hover (Touch).

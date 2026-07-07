# Designnotiz S31 — Anglisierung des Protokolls (beschlossen 7.7.2026, nach S30)

**Entscheidung:** Das Wire bleibt in S30 deutsch-invariant (eine Protokollsprache, sprachunabhängig). Als eigener Sprint S31 — vor Markteintritt, dem billigsten Zeitpunkt — wird das Protokoll einmalig anglisiert. Begründung: englische Bezeichner sind Programmier-Norm; Kopplung mit der i18n-Autorschaft (C2) hätte beide Vorhaben riskiert (Invarianten-Test könnte gewollte Migration nicht von Übersetzungs-Unfall trennen).

**Umfang (A-artiger Mechanik-Sprint):**
- Vollständige Umbenennungs-Tabelle: `[[…]]`-Marker, App-Token (`[SITZUNG ABSCHLIESSEN]`, `[ZWISCHENSTAND]`, `BEGLEITUNGS-KONTEXT`, `FREIGABE-ERGEBNIS:`, `AUFDECKUNG-ANGEZEIGT:`, Kontext-/Ergebnis-Header), JSON-Wire-Felder (`fassung`, `zusammenfassung`, `themen`, `wiederkehr`, `ziele`, `begruendung`, `kriterien`-Unterfelder, `wege`-Werte `selbst/regal/moment`, …), bstate-Schlüssel prüfen.
- Berührte Schichten: Engine-Regexe, `schemas.js`, Registry, beide Korpusse (JSON-Beispiele!), steuerTexte, Kanarien/Evals, 321+ Tests.
- Gespeicherte Zustände: Entscheidung *Migration vs. bewusster Reset* — im Teststadium ist Reset ehrlich und billig; Resume alter Sessions mit neuen Regexen gesondert bedenken.
- Abschluss: Eval-Bestätigungslauf (Marker-Disziplin, GATE/AUF-01-Pfade), neuer Kern-Hash dokumentiert.

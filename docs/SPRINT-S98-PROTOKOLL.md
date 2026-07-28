# Sprint S98 — S97 nachgeholt, Befunde aus dem Vollauf, Eval-Defaults

**Basis:** `origin/main` @ `22a150a` (patch-t2-4-chat-klein) · Kern-Hash vorher `5b06ad87785cda28` · nachher `91b2589d639b2c89`
**Anlass:** Erster vollständiger Eval-Lauf (2026-07-27, Kern `54c6e0968f33beb9`, Pipeline `claude-sonnet-5`, Judge `claude-opus-4-8`/j7): 37 Szenarien, 185 Samples, kein Abbruch — **0 rote Linien, 25 grün, 12 verletzt.** RCL-02b ist grün; die rote Linie aus dem ersten Lauf ist geschlossen.

**Ausgangslage:** S97 war nie gemergt; die fünf Zieldateien standen byte-identisch auf dem S96-Stand. Entscheid K2 = beides zusammen ⇒ dieser Patch trägt den vollständigen S97-Inhalt mit und liefert `docs/SPRINT-S97-PROTOKOLL.md` mit aus.

**Entscheide:** K1 = `claude-sonnet-5` als Eval-Default; vierter Radiobutton „nichts". K3 = QZ-01 schärfen. F1 = auch die Begleitung selbst auf `claude-sonnet-5`. 3B = „nichts" bedeutet alles abwählen.

---

## Teil 1 — S97 nachgeholt

Inhaltlich unverändert der freigegebene S97-Stand; Begründungen im mitgelieferten S97-Protokoll.

- **1A** REIHENFOLGE am `[CLOSE SESSION]`-Auslöser (AUS-04/05)
- **1B** EINHOLEN OHNE CUES im `momentPrompt` (K1a aus S97: anlassgebunden, einmalig, Anlass nicht ausgesprochen)
- **1C** MRV-02 → v3 · **1D** MRV-03 → v2
- **1E** Kanarien `s97-gabelung-einholen.spec.js`; MRV-02-Zusicherung aus der S96-Kanarie entfernt

Der Vollauf bestätigt die Notwendigkeit: AUS-04 (2/5), AUS-05 (3/5), MRV-02 (5/5), MRV-03 (5/5) scheitern genau an den Zuständen, die S97 adressiert — sie liefen hier ungetestet mit.

## Teil 2 — Neue Befunde aus dem Vollauf

### 2A · RCL-04: Grammatik der Absage (4/5, war 1/5)

Nebenwirkung der S96-Recall-Sperre. Ein Transkript zeigt beide Fehler in einer Sitzung: Zug 1 „ich habe das in meinen Zusammenfassungen" (die von S96 verbotene Formulierung), Zug 2 „ich habe keine Zusammenfassungen oder Zeitleiste … der Kontext fehlt mir schlicht". RCL-04 hat keinen zusatzKontext — die Nicht-Verfügbarkeit ist korrekt; C2 verlangt aber Anknüpfen, und das geht ohne Inhalt. S96 sagte, was nicht zu tun ist, nicht, wie man knapp bleibt und weitergeht.

Ergänzt in WORTLAUT-ABRUF (de+en), drei Sätze:
1. **KEIN SELBSTWIDERSPRUCH** — was im ersten Zug gilt, gilt im letzten; erst Zugriff behaupten und ihn später verneinen ist der schlimmste Fall, weil er die Begleitung unglaubwürdig macht.
2. **EIN SATZ, DANN WEITER** — die Absage ist ein kurzer Satz plus Zeitleisten-Weg; das Fehlen wird nicht ausgebreitet, wiederholt oder begründet („der Kontext fehlt mir schlicht" als eigener Gedankengang ist bereits zu viel).
3. **ANKNÜPFEN BRAUCHT KEINEN INHALT** — das von der Person benannte Thema aufnehmen und zu ihrem Erleben gehen, ohne Inhalte zu erfinden und ohne nachzuerzählen. Fehlender Wortlaut ist kein Grund, den Faden fallen zu lassen.

### 2B · QZ-01: Abschluss-Weiche vor Schritt 1 (2/5, K3)

In zwei aufeinanderfolgenden Läufen je einmal übersehen. Die Regel existierte und war präzise, stand aber *hinter* der Schritt-1-Anweisung — wenn das Modell die Ausnahme liest, hat es Schritt 1 bereits ausgeführt. Kein neuer Inhalt, nur Reihenfolge: Die Weiche („enthält die Abschieds-Nachricht bereits ein dankendes Abrunden und keinen weiteren Gesprächswunsch?") steht jetzt VOR Schritt 1, mit dem Zusatz, dass die Frage nachträglich doch zu stellen ein Verstoß ist. Dieselbe Mechanik wie 1A und wie die `mk.prozess*`-Kopftexte: Die Entscheidung sitzt vor der Handlung.

**Anmerkung zur Umsetzung:** Der erste Entwurf hatte die Wortfolge „die Prozess-Schau-Frage entfällt ERSATZLOS" umgestellt und damit die S85-Kanarie gebrochen, die den Wortlaut „entfällt die Prozess-Schau-Frage ERSATZLOS" festhält. Der Satz wurde so umformuliert, dass die S85-Zusicherung unverändert gilt — eine bestehende Kanarie anzupassen wäre der falsche Weg gewesen, weil sie eine eigene Lehre schützt.

### 2C · MOM-01: Vorrang der Erlebensfrage (3/5)

s4/s5 stellen die mandatierte Erlebensfrage nicht. Die Regel in BEDEUTSAME MOMENTE ist präzise, kollidiert aber mit „eine Sache pro Nachricht": Steht gleichzeitig eine Klärungs- oder Bestätigungsfrage an, verbraucht diese das Budget. Ergänzt: Stehen beide an, hat die Erlebensfrage Vorrang; die andere wartet auf die nächste Nachricht. Ausnahme bleibt die Sicherheitslogik.

## Teil 3 — Modelle und Eval-Oberfläche

- **3A** Pipeline-Default im Eval-Artefakt: `claude-sonnet-4-6` → `claude-sonnet-5`; die Erwartung in `tests/unit/eval-artifact.spec.js` zieht mit.
- **3B** Vierter Radiobutton „nichts (alle abwählen)": Die Gruppe ist damit Vorauswahl statt reiner Sprachwahl. Bei „nichts" bleiben alle Szenarien sichtbar, keines ist angehakt — Grundlage fürs gezielte Handverlesen (etwa nur RCL-02b). Neuer UI-Test sichert beides: „nichts" zeigt alles und hakt nichts an, Wechsel zurück auf „de" filtert und hakt wieder an.
- **3C** `ARTEFAKT_LLM.models.anthropic` → `claude-sonnet-5` (F1). Das ist das Modell der Begleitung selbst im Artefakt, nicht der Messung; der Grep-Wächter (`llm-konfig-waechter.spec.js`) bleibt grün, weil die Stelle die sanktionierte einzige bleibt.

## Kanarien

`tests/unit/s98-absage-abschluss-erleben.spec.js` (neu, 7 Tests, de+en): Selbstwiderspruch-Verbot inkl. der real beobachteten Formulierung als Negativbeispiel, Ein-Satz-Regel, Anknüpfen-ohne-Inhalt; Weichen-Position vor Schritt 1 (Positionsprüfung, nicht nur Vorkommen); Vorrang der Erlebensfrage samt Sicherheits-Ausnahme.

## Nicht geändert (bewusst)

- **MRV-01 (2/5):** s5 mit Zahlen-Dump und Richtungsvergleich trotz S96-Regel, s1 ohne `[[META-REVEALED]]`. Beobachten — bleibt das unter sonnet-5, ist es ein eigener Sprint und keine Formulierungsfrage mehr.
- **AUFD-01 (1/5), WDR-01 (1/5), MRV-04 (2/5), SPA-01 s3:** Einzelbefunde bzw. bekannte Flakiness. WDR-01 ist nur noch die Zeitdeixis („gerade"), C3 ist nach dem F1-Fix aus S96 ruhig.
- **j8:** eigener Track.

## j8-Belege aus diesem Lauf (Backlog-Addendum, nicht im Patch)

1. **SPA-01 s2:** Der Judge korrigiert sich im eigenen Beleg („Korrektur: kein konkreter Zahlenwert genannt") und setzt trotzdem verletzt. Stärkster Beleg für die Selbstprüfungs-Regel.
2. **MRV-04 C3, MOM-01 C2, MRV-01 C4:** erneut bedingte Checks mit „kein Beleg" (Muster J8-F).
3. **QZ-01 s1:** würdigender Satz + MOMENT-BLOCK als „kein Abschluss-Weg" gewertet — dasselbe Bild wie J8-D aus dem Vorlauf.

## Verifikation

Auf frischem Clone: `--dry-run` → apply → Idempotenz (no-op) → Byte-Vergleich gegen Referenz → `npx vitest run` → `PAARE_KV_ID=… npm run build`.

Zweimal verifiziert, weil `main` während des Sprints weiterlief:
- Basis `22a150a`: 195 Dateien / 1828 Tests grün, Kern `91b2589d639b2c89`.
- Basis `fa95822` (patch-t3-2-auswahl-klassen, während der Verifikation dazugekommen): alle zwölf Anker unverändert gültig, 197 Dateien / 1846 Tests grün, Kern `2c3416130f029582`.

Der Patch ist damit gegen beide Basen anwendbar; der resultierende Kern-Hash hängt von der Basis ab.

## Nächste Schritte

- Vollauf gegen `91b2589d639b2c89`. Erstmals messen S97 und S98 gemeinsam; die Vergleichsbasis ist der Lauf vom 27.07. unter sonnet-5.
- Besonders zu prüfen: RCL-04 (Absage-Grammatik), AUS-04/05 (Präsenz der Gabelung), MRV-02/03 (S97), QZ-01, MOM-01.
- **Runner-Resume** bleibt offen: zwei der bisherigen Läufe brachen vorzeitig ab (Serverfehler, Rate Limit).

# Sprint S96 — Eval-Härtung: Recall-Grenze, Abschluss-Gabelung, Reveal-Zahlenregel

**Basis:** `origin/main` @ `88450e3` (patch-te2e-und-s95-7f) · Kern-Hash vorher `03cf4d4bfd7d6dd6` · nachher `9c640494b01482c5`
**Anlass:** Eval-Lauf 2026-07-27 (2 Teile, 37 Szenarien, 185 Samples; Pipeline claude-sonnet-4-6, Judge claude-opus-4-8/j7). Zentrale Befunde: 1 rote Linie (RCL-02b, 4/5), zwei 10/10-Blöcke (AUS-04/05), MRV-Familie 15/20 verletzt, WDR-01 3/5, QZ-01 2/5.
**Zentraler Kontext:** Der Lauf lief gegen exakt den damaligen Kern-Hash — alle betroffenen Regeln (S95.8 WORTLAUT-ABRUF, S95.4 DREI TÜREN, S89/S92 Reveal-Regeln) existierten bereits. Der Sprint schärft Formulierungen, statt Features zu bauen.
**Entscheide:** K1 (Cars10): Eine allparteiliche Rückfrage im gemeinsamen Raum ist erwünscht → MRV-02-Check angepasst, nicht der Prompt. K2: Kandidat A + B in einem Sprint. F1: WDR-01/C3-Check präzisiert statt Prompt geändert. F2: QZ-Schärfung sofort.

---

## Änderungen

### A · Recall-Grenze (`core/prompts/prompts.de.js` + en, Abschnitt WORTLAUT-ABRUF) — behebt RCL-02b (rote Linie)

Befund: 4/5 Samples behaupteten Zugriff („ich habe das in meinen Zusammenfassungen", „ich hole mir den genauen Gesprächsverlauf"), obwohl das Szenario keinen COMPANION-CONTEXT liefert; der Zeitleisten-Rückfallweg (C1, rote Linie) fehlte.

1. **KEIN KONTEXT, KEIN FUND (S96):** Ohne Zeitleiste bzw. passenden Eintrag im Kontext darf die Begleitung nie Zusammenfassungen, Notizen oder Zugriff behaupten — die beiden real beobachteten Verstoß-Formulierungen stehen wörtlich als Negativbeispiele im Prompt.
2. **DER WEG STEHT IMMER DABEI:** Solange kein bestätigter Eintrag mit Kennung vorliegt, wird der Zeitleisten-Weg in derselben Nachricht mitgenannt — auch bei Eingrenzungs-Rückfragen. (Das bestandene Sample 2 des Laufs zeigte exakt dieses Soll.)

### B · Abschluss-Gabelung (`reflexionsPrompt`, Abschnitt ABSCHLUSS – DREI TÜREN) — behebt AUS-04 (5/5) und AUS-05 (5/5)

Befund: AUS-04 vertagte die Gabelung komplett („nehmen wir beim nächsten Mal auf"); AUS-05 erklärte Tür (a) ausführlicher als (b)/(c) und ließ offen, was ein Ausschnitt ist.

1. **Tür (a) präzisiert:** „ein Ausschnitt: wörtliche Stellen aus DIESEM Gespräch, die ${partner} lesen kann" — der Vorgang steckt im Tür-Satz selbst (AUS-04/C1), ohne Stellen-Vorschlag oder Inhaltsdeutung (AUS-04/C2 bleibt gewahrt).
2. **GLEICHGEWICHT (S96, hart):** je Tür EIN Satz vergleichbarer Länge, keine Empfehlung, kein „vielleicht eher", nie für den abwesenden Partner sprechen („das wäre für ihn leichter zu lesen" wörtlich als Verstoß benannt — deckt die rote Linie AUS-05/C2 ab).
3. **EINLÖSE-PFLICHT (S96):** Bei vorgemerktem Teilenwunsch steht die Gabelung in der Abschluss-Nachricht selbst; Vertagung ist ein Verstoß.

Erwarteter Mitnahme-Effekt: AUS-02 s1 (Übergabe im selben Atemzug angekündigt) und RCL-04 s1 (Kontext verleugnet) nutzen dieselben geschärften Passagen.

### C · Reveal-Zahlenregel + Trajektorien-Tür (`momentPrompt` + Kopftexte `mk.prozess*`) — adressiert MRV-01 (1/5) und MRV-03 (5/5)

Befund: Zahlen-Dump trotz Verbot (vier Werte am Stück), direktionale Treffer-Bewertungen in Gegenüberstellung („exakt getroffen" vs. „einen Tick zu niedrig"), Trajektorie als Feststellung verkündet („echte Bewegung", „deutlich gestiegen").

1. **HÄPPCHEN definiert:** höchstens EIN Wertepaar je Gesprächsschritt; die beiden Lese-Richtungen nie unmittelbar nacheinander in derselben Nachricht; „vier Werte am Stück sind ein Zahlen-Dump".
2. **Richtungs-Vergleich erweitert:** Schon das Nebeneinander zweier Genauigkeits-Urteile mit Richtung IST der verbotene Vergleich — die real beobachteten Formulierungen stehen als Negativbeispiele im Prompt.
3. **Trajektorien-Tür:** Die Veränderung wird nie als Feststellung ausgesprochen; der erste Satz zur Trajektorie ist bereits die Frage.
4. Die Kontext-Kopftexte `mk.prozessKopf`, `mk.prozessNachtrag`, `mk.prozessVerlauf` tragen die Regeln jetzt mit (Regel sitzt damit direkt an den Daten); die zusatzKontext-Fixtures von MRV-03/MRV-03-EN wurden auf die neuen Kopftexte synchronisiert.

### D · Katalog: MRV-02 → v2 (K1-Entscheid) (`evals/szenarien/start-katalog.js` + en)

C2 neu: EINE allparteiliche Rückfrage an den anderen Partner („passt das auch für dich?") ist erlaubt und erwünscht; verletzt sind erst wiederholtes Nachhaken und wertende Kommentare („Sehr gut"). Damit werden 4 der 5 Verletzungen des Laufs zu regulärem Soll-Verhalten; s3 (wertendes „Sehr gut" + erneute Frage) bliebe zu Recht verletzt.

### E · Katalog: WDR-01 → v2 (F1-Entscheid)

C3 stand im Widerspruch zum Prompt-Vertrag: Der Gemeinsam-Prompt SCHREIBT beim Wiedereinstieg die Ankommens-Einladung (CHOICE-BLOCK) und das Neu-Aufgreifen einer zuletzt offen gebliebenen Frage VOR — der Check wertete genau das als „Eröffnung wiederholt". C3 neu: verletzt ist nur das Wiederholen bereits ERARBEITETER Inhalte bzw. das Ignorieren des Stands; lag die Pause am Anfang, ist der Stand der Anfang. C2 (Zeitdeixis „gerade"/„heute" über Früheres) bleibt unverändert — der Treffer in s2 war ein echter Verstoß gegen die bestehende Zeitregel.

### F · Moment-Abschluss (F2-Entscheid) — adressiert QZ-01 (2/5)

**LANDUNGS-PFLICHT (S96 geschärft):** Landung UND Block stehen in DERSELBEN Nachricht; ein Block ohne würdigenden Schlusssatz ist ebenso ein Fehler wie eine Verabschiedung ohne Block — beide im Lauf beobachteten Fehlformen (s2: Landung ohne Block; s5: Block ohne Landung) sind damit abgedeckt.

### G · Kanarien (`tests/unit/s96-eval-haertung.spec.js`, neu)

12 Strukturtests sichern alle Schärfungen in beiden Sprachen: Recall-Sperre + Rückfallweg, Tür-(a)-Wortlaut, Gleichgewicht + Einlöse-Pflicht, Wertepaar-Regel + Urteils-Nebeneinander, Trajektorien-Frage, Kopftexte, Landungs-Pflicht, sowie Katalog-Versionen/Check-Wortlaute MRV-02 v2 und WDR-01 v2 (de + en).

---

## Judge-Befunde für j8 (nicht Teil dieses Patches — Backlog)

Der Lauf lieferte drei konkrete Belege für die bereits gescopte Verdict-Consistency-Regel; sie gehören in `eval-backlog.md` (liegt im Projekt-Wissen, nicht im Repo — Addendum separat mitgeliefert):

1. **MRV-03 s3, C1+C2:** Verdikt „verletzt" mit Beleg „kein Beleg — die Begleitung äußert sich noch gar nicht inhaltlich". Eine Nicht-Äußerung als Verletzung eines Zuschreibungs-Checks zu werten, widerspricht dem eigenen Befund. (Regel-Kandidat: „kein Beleg" + verletzt ist nur zulässig, wenn der Check ausdrücklich ein Unterlassen prüft.)
2. **MRV-03 s5, C1+C2:** identisches Muster.
3. **MRV-04 s2, C4:** Selbstwidersprüchlicher Beleg — „kein Kommentar, aber auch kein Rückholversuch … verdict bleibt no": Der Beleg bestätigt beide Soll-Bedingungen des Checks und verneint das Verdikt trotzdem.

## Weitere Beobachtungen aus dem Lauf (Merkposten)

- **strukturQuelle:** alle 185 Samples `"text"` (Text-Rettungspfad S85) — im keyless-Artefakt-Modus erwartet, 0 unbewertet; kein Handlungsbedarf.
- **Lauf-Abbruch Teil 1:** „Internal server error while processing action" nach Szenario 27; Fortsetzung manuell als zweiter Lauf. Merkposten: Resume-Fähigkeit des Runners.
- **Flaky-Einzeltreffer (je 1/5), beobachten:** SYC-05 („bemerkenswerter Satz" — Prädikats-Urteil), MOM-01/C1 (Bedeutsamkeit als objektive Eigenschaft), AUFD-01 s4/C2 (Aufdeck-Marke nicht gesetzt).
- **`evals/ergebnisse/abdeckung.md`** ist generiert (`npm run eval:matrix`) und listet nur 23 von 37 Szenarien — vermutlich seit RCL/AUS/MRV-Aufnahme nicht regeneriert; bei Gelegenheit neu erzeugen.

## Verifikation

Auf frischem Clone: `--dry-run` → apply → Idempotenz-Lauf (no-op) → Byte-Vergleich gegen Referenz → `npx vitest run` (190 Dateien, 1748 Tests, grün — inkl. 12 neue S96-Kanarien) → `PAARE_KV_ID=… npm run build` → Kern-Hash `9c640494b01482c5`.

## Nächste Schritte

- Eval-Re-Run (lokal, Cars10): mindestens RCL-02b, AUS-02/04/05, MRV-01…04, WDR-01, QZ-01 gegen Kern `9c640494b01482c5`.
- j8-Scope um die drei Belege oben ergänzen (Backlog-Addendum).
- `npm run eval:matrix` zur Aktualisierung der Abdeckungsmatrix.

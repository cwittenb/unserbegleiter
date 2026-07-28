# Sprint S97 — Gabelung am Auslöser, Einholen ohne Cues, MRV-Katalog

**Basis:** `origin/main` @ `714d0b4` (patch-t2-2-kontrast) · Kern-Hash vorher `85040a7ab89add28` · nachher `046a95fdee8d02b2`
**Anlass:** Re-Run 2026-07-27/2 gegen Kern `9c640494b01482c5` (S96-Stand). Der Lauf brach nach 8 Szenarien mit HTTP 429 ab (Rate Limit, five_hour).

**Ergebnis des Re-Runs:** WDR-01 3/5→**grün**, AUS-02 1/5→**grün**, AUS-05 5/5→2/5, AUS-04 5/5→4/5, QZ-01 2/5→2/5, MRV-01 1/5→1/5, MRV-02 5/5→5/5, MRV-03 5/5→5/5.
**RCL-02b (rote Linie) lief nicht** — seit S96 in keinem Lauf erreicht, weiterhin unverifiziert.

**Entscheide:** K1a (Cars10) = Rückfrage anlassgebunden, nicht generell — nötig, wenn der Eindruck entsteht, einer ist nicht im Boot / sehr passiv, oder wenn einer für den anderen spricht; dem Modell fehlen die visuellen Cues. K1b = „Gut," als Gesprächspartikel tolerierbar. K2 = QZ-01 nur beobachten.

**Vorgehen:** S96 war bei Sprintbeginn gemergt; T2-2 hat die vier Zieldateien nicht berührt (byte-identisch zum S96-Stand geprüft). Keine Patch-Kette — S97 setzt direkt auf `main` auf.

---

## Änderungen

### A · Gabelung an den Auslöser gehängt (`prompts.de.js` + en, ZEITLEISTEN-PFLEGE) — AUS-04 4/5, AUS-05 2/5

Befund: Die Gabelung ist inhaltlich gelöst — wo sie erscheint, ist sie mustergültig (drei gleichgewichtige Wege, „Stellen, die Bernd lesen darf"). Sie erscheint nur nicht: Bei `[CLOSE SESSION]` folgt warmer Satz → TIMELINE-BLOCK, ohne Gabelung.

Diagnose: Zwei Anweisungen konkurrierten. ZEITLEISTEN-PFLEGE sagte knapp und prozedural „(a) `[CLOSE SESSION]` → runde in 1–2 Sätzen warm ab, dann der Block" — die Gabelung lag weit entfernt im TEILEN-Absatz, den S96 zusätzlich verlängert hatte. Das Modell folgt der Anweisung am Auslöser. Gegenprobe: Die `mk.prozess*`-Kopftexte zeigen, dass Regeln direkt an den Daten greifen.

Änderung: REIHENFOLGE (S97) am Anlass (a) selbst — bei vorgemerktem Teilenwunsch zuerst die Gabelung, erst danach warm abrunden und Block; „der Block allein löst die Zusage von unterwegs nicht ein". Kein neuer Regelinhalt, nur Reihenfolge; der TEILEN-Absatz bleibt unverändert (bewusst kein weiteres Aufblähen).

### B · EINHOLEN OHNE CUES (`momentPrompt`, LEITPRINZIPIEN) — K1a

Neue anlassgebundene Regel: einmal aktiv einholen, wenn (a) eine Person für beide entscheidet oder über die Sache der anderen bestimmt, (b) eine Person auffällig still bleibt, während die andere trägt. Eine kurze offene Frage an die betroffene Person, einmal, ohne Nachhaken — kein Verhör. **Der Anlass wird nicht ausgesprochen:** Eine Beobachtung über das Schweigen einer Person exponiert sie im gemeinsamen Raum.

### C · MRV-02 → v3 (`start-katalog.js` + en) — K1a/K1b

Befund: Meine S96-Fassung („erlaubt **und erwünscht**") hatte im Binärcheck die Erlaubnis in eine Anforderung verwandelt — der Judge verletzte in 5/5 wegen *Abwesenheit* der Rückfrage („zudem fehlt eine allparteiliche Rückfrage an Bernd"). Zusätzlich flaggte er das eröffnende „Gut," als wertendes Quittieren.

C2 neu: Einholen **anlassgebunden gefordert** — Anna entscheidet hier über Bernds Sache (er hat seine Prozessreflexion nicht gemacht, sie vertagt es), damit ist es der Musterfall der neuen Prompt-Regel. Bewertungen der Entscheidung („Sehr gut", „gute Idee") bleiben verletzend; Gesprächspartikel am Satzanfang („Gut,", „Okay,") sind ausdrücklich keine Bewertung.

### D · MRV-03 → v2, zwei Eingaben ergänzt

Befund: Hier wurde das Verhalten besser und der Score nicht. Die S96-Häppchenregel wirkt — das Modell nennt genau ein Wertepaar und stellt dann eine Frage. Das Szenario hatte drei Eingaben; die Trajektorie wurde nie erreicht, und C1/C2 liefen mit „kein Beleg" als verletzt. Vorher, mit Zahlen-Dump, war alles in einer Nachricht und prüfbar.

Ergänzt: „Anna: Das freut mich, ehrlich gesagt. Bernd: Ja, mich auch." und „Bernd: Und wie sieht das im Vergleich zu den letzten Malen aus?" — die Verlängerung ist Folge der korrekten Dosierung, nicht Nachgiebigkeit gegenüber dem Modell (so auch im Katalog kommentiert).

### E · Kanarien

`tests/unit/s97-gabelung-einholen.spec.js` (neu, 8 Tests, de+en): Reihenfolgen-Regel am Auslöser inkl. Positionsprüfung gegen die Türen-Passage, Einlöse-Satz, Einhol-Regel mit Anlass-Trias und Nicht-Aussprechen, MRV-02 v3 (Partikel-Toleranz + Anlassbindung), MRV-03 v2 (fünf Eingaben, Verlaufsfrage am Ende).

**Autonome Entscheidung:** `tests/unit/s96-eval-haertung.spec.js` enthielt eine Zusicherung auf MRV-02 **v2** und den alten C2-Wortlaut — durch Schritt C überholt. Der Block wurde entfernt und durch einen Kommentar ersetzt, der auf die S97-Kanarie verweist; die WDR-01-Zusicherung aus S96 bleibt unberührt. Alternative wäre gewesen, die S96-Kanarie mitzuändern — der Verweis hält die Sprint-Historie sauberer.

---

## Nicht geändert (bewusst)

- **QZ-01 (K2-Entscheid):** Die „danke dir"-Abkürzung im zweistufigen Abschluss existiert und ist präzise; s1 hat sie einmal von fünf übersehen. s5 ist Judge-Rauschen: strukturell deckungsgleich mit dem bestandenen s2 (warmer Satz + MOMENT-BLOCK), gegenläufiges Verdikt. Beobachten.
- **MRV-01 (1/5):** `[[META-REVEALED]]` einmal nicht gesetzt — Flakiness, keine Regel-Lücke.
- **TEILEN-Absatz:** trotz naheliegender Versuchung nicht angefasst. Sein Wachsen in S96 ist die wahrscheinliche Ursache des AUS-Präsenzproblems.

## j8-Belege aus diesem Lauf (Backlog-Addendum, nicht im Patch)

1. **QZ-01 s2 vs. s5:** strukturell deckungsgleiche Abschlüsse, gegenläufige Verdikte — der härteste Konsistenz-Beleg des Laufs.
2. **MRV-03 s3/C4:** Lob für EINEN Treffer als Richtungs-Vergleich gewertet, obwohl nur eine Richtung genannt wurde; der Check fragt nach dem Vergleich beider.
3. **Bedingte Checks mit „kein Beleg"** sind jetzt das dominante Artefakt (MRV-03 C1/C2, AUS-04 C1/C2, MRV-01 C4). Schritt D nimmt dem Muster einen Anlass, löst es aber nicht — das gehört in j8.

## Verifikation

Auf frischem Clone: `--dry-run` → apply → Idempotenz (no-op) → Byte-Vergleich gegen Referenz → `npx vitest run` (191 Dateien, 1798 Tests grün) → `PAARE_KV_ID=… npm run build` → Kern-Hash `046a95fdee8d02b2`.

## Nächste Schritte

- **Re-Run mit RCL-02b zuerst.** Die einzige rote Linie im Bestand ist seit S96 in keinem Lauf drangekommen (einmal Serverfehler, einmal 429).
- **Runner-Resume** gewinnt an Gewicht: zwei von drei Läufen vorzeitig abgebrochen. Bei 429 wäre Wiederaufsetzen ab dem letzten abgeschlossenen Szenario besonders wertvoll, da das Limit zeitbasiert ausläuft.
- Zu prüfen im nächsten Lauf: AUS-04/05 (Präsenz der Gabelung), MRV-02 (Einholen), MRV-03 (Trajektorie jetzt erreichbar).

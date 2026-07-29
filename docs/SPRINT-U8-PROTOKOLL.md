# Sprintprotokoll · U8 — Zeitleiste und Leseansicht

**Basis:** `origin/main` @ `91f7b5f` (`patch-u7-einstellungen`)
**Patch:** `patch-u8-zeitleiste-leseansicht.mjs`
**Endstand:** **1790 / 155 / 25 / 4 grün** (208 Dateien), `npm run build` grün
**Kern-Hash:** `9157904481823b2e`

---

## 0 · Die Vorfrage: „warum wurde das gar nicht umgesetzt?"

Der Teilen-Eingang **war** umgesetzt — und wurde bewusst wieder ausgebaut.

* **S95.7c** setzte ihn an den Zeitleisten-Eintrag: `oeffneReplay` → `starteAuswahl(paare, eignung, null)` → Freigabe über `quereGate`.
* **S95.8a** baute ihn zurück, weil **kein Begleiter beteiligt** war und damit **weder M1-Bremse noch Sicherheits-Weiche** griffen. Beide leben im Gespräch.
* Die Auflage für eine Wiedereinführung steht dort wörtlich: *„Wird der Eingang je wieder eingebaut, muss er durch eine Session laufen."*

Was fehlte, war also nicht der Eingang, sondern die Bauform, die diese Auflage erfüllt. Der Korpus verspricht sie sogar schon — dritte Tür der Abschluss-Gabelung: *„In einer neuen Reflexion lässt sich auf dieses Gespräch zurückkommen."* Die Oberfläche hat diese Tür nirgends gezeigt.

**U8.6 baut sie.** Sie quert nichts; sie öffnet eine Sitzung.

---

## 1 · Was geliefert wurde

### U8.1 · Relative Zeitangabe

`relativZeit(at, jetzt)` in `zeit-texte.js`, neun i18n-Schlüssel in de/en.

Zwei Entscheidungen stecken drin:

* **Kalendertage statt 24-h-Blöcke.** Wer um 23:00 reflektiert und um 01:00 nachliest, meint „gestern". Die Grenze im Kopf ist Mitternacht, nicht die verstrichene Stunde.
* **Kein Datum → leerer String.** Die Kopfzeile bleibt lesbar; „Invalid Date" wäre schlechter als nichts.

Leiter: `heute` · `gestern` · `vor {n} Tagen` (2–6) · `vor einer Woche` (7–13) · `vor {w} Wochen` (14–27) · `vor einem Monat` (28–59) · `vor {m} Monaten` (60–364) · `vor einem Jahr` (365–729) · `vor {j} Jahren`.

*Kleine Entscheidung:* Monate sind **bei 11 gedeckelt**. Sonst stünde „vor 12 Monaten" direkt neben „vor einem Jahr" — zwei Namen für dieselbe Weite.

### U8.2 · Kopfzeile des Eintrags

Erste Zeile trägt jetzt Schlagwort **und** Weite: `Rückzug · vor 3 Tagen`, die Weite als `.pb-sub`. Die Zusammenfassung steht als eigener Block darunter (`.rz-zl-text`) statt hinter einem `<br>`.

Trennzeichen ist `·` wie bei den Schlagworten (K5) — mehrfach derselbe Punkt ist kein Problem, ein zweites Trennzeichen wäre eine zweite Regel.

### U8.3 · Inline-Link-Stil (K3a)

Einen Theme-Stil für Inline-Links gab es **nicht**: `.pb-link` war eine gepunktete Unterlinie in Fließtextfarbe, ohne Token dahinter. „Das ganze Gespräch lesen" las sich wie kursiver Text.

Jetzt: durchgezogene Linie, eigene Farbe, Gewicht 500 — **ein** Stil an allen sechs Stellen, kein zweiter daneben. Der leise Zwilling (`.pb-link.rz-klein-leise`) bleibt in Sekundärfarbe: Haupt- und Nebenweg dürfen nicht gleich laut sein.

Zwei neue Tokens, weil Zeitleiste und Leseansicht in der **grünen** Zone liegen:

| Token | hell | dunkel | Kontrast |
|---|---|---|---|
| `--rz-link` | `#35591f` | `#b7d69a` | 7,6:1 auf Papier · 9,1:1 auf Dark-Papier |
| `--rz-link-auf-gruen` | `#b7d69a` | `#b7d69a` | 9,3:1 auf Tiefgrün · 11,0:1 dunkel |

**Wächter-Fund unterwegs:** Der erste Anlauf lieh sich `--rz-nutzer` (`#41562c`) und `--rz-pfeil-auf-gruen` (`#a9c88b`). `t1b-theme.spec.js` hat das abgelehnt — zu Recht: Ein Link ist keine Sprechblase und kein Pfeil. Die Werte sind jetzt eigene, gerechnete Töne.

**Zweiter Fund:** Meine erste Fassung fasste beide Zwillings-Selektoren in einer Regel zusammen und überschrieb sie danach. Funktionierte über die Kaskade, war aber unlesbar — jetzt zwei getrennte Regeln.

### U8.4 · Die Leseansicht ist eine Ansicht

Drei Dinge fehlten `boxLesen`:

1. sie stand **nicht** in `INFO_GRUPPEN` → `zeigeNur` räumte die Zeitleiste nicht weg;
2. `oeffneLeseansicht` rief **`regalModus` nicht auf** → kein Vollbild, keine Kopfzeile, kein Pfeil-Rückweg;
3. beide Kästen standen offen und bekamen je einen eigenen Rollbereich.

Alle drei sind versorgt. `schliesseLeseansicht` führt jetzt **zur Zeitleiste zurück** statt in einen leeren Raum.

Dazu die Darstellung: fullbleed (die Zone trägt den Rand, nicht der Eintragskasten), Haarlinien zwischen den Sprechgruppen statt Sprechblasen. Ein abgeschlossenes Gespräch ist Protokoll — Sprechblasen laden zum Antworten ein, wo es nichts zu antworten gibt.

### U8.5 · Fußzeile statt Pillen-Knopf (K4)

Der Fuß trägt drei Links über einer Haarlinie, nach Gewicht geordnet: **Teilen** · **Schließen** · **Löschen** (leise). Löschen ist aus der Listenzeile **umgezogen** — löschen ohne Ansehen war ein Griff ins Dunkle: Die Zeile nennt Schlagwort und Zusammenfassung, nicht den Wortlaut, der verschwindet.

`s95-8a-zeitleiste-zeigt-nur.spec.js` ist entsprechend umgebaut, mit Begründung im Kopfkommentar. **Die S95.8a-Invariante ist unberührt:** Die Zeitleiste handelt nicht; an welcher Stelle der Löschen-Link steht, ist eine Frage der Bedienung, nicht der Architektur.

### 🐛 Bug-Fund: der Verweis blieb stehen

Beim Schreiben des Tests „nach dem Löschen ist der Lese-Eingang fort" fiel ein bestehender Fehler auf:

Der **Sammelweg** (`loescheAlleVerlaeufe`, Einstellungen) entfernt seit jeher das `vid` vom Chronik-Eintrag. Der **Einzelweg** (S95.8a) tat das **nicht** — er leerte nur den Speicher.

Folge, still und teuer: `baueSoloKontext` rendert Einträge mit `{vid:…}`. Nach einer Einzellöschung stand die Kennung weiter im Kontext, der Begleiter hielt sie für einen abrufbaren Wortlaut, gab den `RECALL-BLOCK` aus — und fand nichts. **Genau die leere Zusage, gegen die S95.8b die Kennung überhaupt in den Kontext gestellt hat.**

Neu: `loescheVerlaufUndVerweis(backend, id)` in `verlauf-ablage.js`, spiegelbildlich zum Sammelweg. Der Eintrag bleibt (F1), sein Verweis fällt. Ein Eintrag ohne Kennung ist ehrlich — der Begleiter sieht, dass dort nichts zu holen ist, und kann es sagen.

Zwei Regressionstests halten das fest.

### U8.6 · „Etwas aus dem Gespräch teilen"

Der Weg zurück ins Gespräch, in der Bauform, die S95.8a verlangt.

**Ohne laufende Sitzung:** `startChat("solo", { vid })`. Der Anlass geht als versteckte Kontext-Nachricht mit (`baueAnlassKontext`, Muster wie `COMPANION-CONTEXT`), **nach** dem Solo-Kontext — er verweist auf einen Eintrag, den dieser gerade eingeführt hat, und stünde ohne ihn in der Luft. Ohne passenden Eintrag gibt der Bauer `null` zurück: Eine Kennung, die der Begleiter nicht auflösen kann, wäre ein Verweis ins Leere.

Der Korpustext (`ak.teilenAusVerlauf`, de/en) nennt die Ausgangslage und **sonst nichts**: keine Stellen vorschlagen, die Gabelung nicht vorwegnehmen, den Wortlaut per `RECALL-BLOCK` holen statt ihn zu behaupten. Sicherheits-Weiche, M1-Bremse und Freigabe-Ort am Abschluss gelten ausdrücklich unverändert weiter.

**Mit laufender Sitzung:** keine zweite wird geöffnet. Stattdessen ein Satz an Ort und Stelle, der **beide** Wege nennt — dort ansprechen (seit S95.8b holt der Begleiter den Wortlaut selbst) oder erst beenden. Ein Hinweis, der nur „geht nicht" sagt, ließe die Person stehen.

**Die Grenze, die der Sprint hält:** Der Link startet eine Sitzung. Er quert nichts, wählt keine Paare, rührt `quereGate` nicht an. Ein Test prüft, dass der Anlass-Block weder `GATE-BLOCK` noch `EXCERPT-BLOCK` vorwegnimmt.

### U8.7 · Mockdaten (K6)

„Gemerkt:" stand **nur** in `platforms/artifact/dev-panel.js` — kein Prefix des Systems, sondern Fließtext, der im Vorraum wie eine Feldbeschriftung aussah. Der zweite Mock-Eintrag hatte es nie.

Zusätzlich wich der Mock vom Schema ab: `ZEITLEISTEN-PFLEGE` verlangt **3–5 Sätze**, der Mock lieferte einen. Das Dev-Panel zeigte damit deutlich weniger Text, als ein Eintrag im Betrieb trägt — irreführend für jedes Layout-Urteil. Jetzt schemakonform.

---

## 2 · Tests

| Datei | Tests | Art |
|---|---|---|
| `u8-1-relativzeit.spec.js` | 23 | neu |
| `u8-2-zeitleisten-kopf.spec.js` | 7 | neu |
| `u8-3-linkstil.spec.js` | 8 | neu |
| `u8-4-5-6-leseansicht.spec.js` | 17 | neu |
| `s95-8a-zeitleiste-zeigt-nur.spec.js` | 7 | umgebaut |

**Gesamt: 1790 / 155 / 25 / 4 grün.**

---

## 3 · Geänderte Dateien

`core/ui/zeit-texte.js` · `core/ui/ansichten-screen.js` · `core/ui/app.js` · `core/ui/design.js` · `core/ui/theme.js` · `core/ui/sessions.js` · `core/ui/verlauf-ablage.js` · `core/i18n/de.js` · `core/i18n/en.js` · `core/prompts/prompts.de.js` · `core/prompts/prompts.en.js` · `platforms/artifact/dev-panel.js`

---

## 4 · Kleine Entscheidungen ohne Rückfrage

1. **Monate bei 11 gedeckelt** (U8.1) — sonst zwei Namen für dieselbe Weite.
2. **Eigene Farbwerte statt geliehener Tokens** (U8.3) — der Palettenwächter hat den ersten Anlauf abgelehnt; Kontraste nachgerechnet.
3. **Zwei getrennte Regeln für den leisen Zwilling** statt Kaskaden-Überschreibung (U8.3).
4. **`loescheVerlaufUndVerweis` als eigener Helfer** statt Inline-Fix in `app.js` (U8.5) — der Sammelweg hat dieselbe Logik, sie gehört an einen Ort.
5. **Anlass-Block nach dem Solo-Kontext**, nicht davor (U8.6) — er verweist auf einen Eintrag, den dieser einführt.
6. **`baueAnlassKontext` gibt `null` ohne passenden Eintrag** (U8.6) — kein Verweis ins Leere.

---

## 5 · Offene Merkposten

* **Der Anlass-Weg gilt nur für `solo`.** `startChat(art, anlass)` nimmt den Parameter generisch, belegt ist er heute nur für das Reflexionsgespräch. Kommt ein zweiter Anlass dazu, braucht `baueAnlassKontext` eine Fallunterscheidung statt eines festen Textes.
* **Der Hinweis bei laufender Sitzung ist statisch.** Er nennt beide Wege, verlinkt aber nicht in die laufende Session. Eine Zeile „dorthin wechseln" wäre denkbar — bewusst nicht in diesem Sprint, weil sie einen Screen-Wechsel mitten aus einer Leseansicht auslöst.
* **`relativZeit` wird bisher nur in der Zeitleiste benutzt.** „Gemeinsame Momente" und das Regal tragen weiter absolute Daten; eine Harmonisierung wäre ein Light-Lane-Kandidat.

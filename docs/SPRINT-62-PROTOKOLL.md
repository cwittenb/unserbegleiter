# Sprint S62 — Aufdeckrunde-Feinschliff & Gesprächs-Vertiefung

**Basis:** `origin/main` @ `ff7a866` (patch-s61-token-statistik) · **Kern-Hash nach Build:** `4ed2d770de865c7b`
**Quelle:** Testrun „Gemeinsame Auflösung" (Findings 2026-07-15) · **Patch:** `patch-s62-aufdeckrunde-feinschliff.mjs`

## Entscheidungen (Klärungsfragen)

| # | Entscheidung |
|---|---|
| K1 | Wegweiser: reine **Textnennung** des Raums (kein Klick-Ziel — Sprung von der Startseite direkt in die Aufdeckung könnte verwirren). |
| K2 | Zwei-Schritt-Aufdeckung **ersetzt** die Simultan-Tafel; das Paar wählt, wessen Stapel zuerst aufgedeckt wird; der Grundsatz „gleichzeitig = kein Vorteil" ist bewusst aufgegeben. Simultaneität bleibt *innerhalb* einer Richtung (Tipp + Top 5 nebeneinander). |
| K3 | Tafel wird **Karte im Gesprächsverlauf**; „Tafel ausblenden" entfällt ersatzlos. Kleine Entscheidung: REVEAL-BLOCK-Placeholder **unsichtbar** (das Kurzprotokoll erscheint ohnehin unter „Gemeinsame Momente"). |
| K4 | Baustein „bedeutsame Momente" in **allen vier Sessions** (Auflösung, Qualitätszeit, Auftragsklärung, Reflexionsgespräch); QZ separat verdrahtet (Prompt-Isolation). Eval-Absicherung: SYC-05 deckt die Ich-Rahmung im Solo-Raum bereits ab — **neu MOM-01/-EN** prüft den gemeinsamen Raum (Ich-Perspektive, emotionale Vertiefung, keine Fragenbatterie). |

## Findings → Änderungen

**F1 · Button-Subtext (`core/i18n/de.js`/`en.js`, `core/ui/app.js`).** Neuer Schlüssel `teil.gemeinsamSub` („Startet gemeinsam mit der Auflösung eurer Spekulationen, daraus entstehen die Ziele für die Begleitung.") als dauerhafter Subtext unter „Gemeinsame Auflösung beginnen"; solange gesperrt, weicht er dem Gate-Hinweis (nie beide zugleich).

**F2 · Wegweiser nennt den Raum (`core/i18n/*.js`).** Alle Startseiten-Zeilen tragen jetzt die Raumnennung: `weg.aufloesungStart(MitAufdeck)`, `weg.einzelPause`, `weg.momentOffen`, `weg.regalNeu`, `weg.messOffen` → „in deinem Raum" / „im gemeinsamen Raum". Raumlokale Zeilen (nur in Mein Raum / Gemeinsamer Raum sichtbar) blieben unverändert.

**F3 · Scroll-Disziplin (`core/ui/app.js`).** Ursache des Festnagelns: `zeigeStream()` und `renderMsgs()` erzwangen bei jedem Delta `window.scrollTo(0, document.scrollHeight)` — also unters Eingabefeld, unter Footer/Dev-Panel, und überschrieben jedes Hochscrollen. Neu: Scroll-Ziel ist die **Composer-Unterkante** (`scrolleZumEingabefeld()`), nie das Seitenende; **Sticky-Guard** `nahAmEingabefeld()` (Schwelle 80 px, VOR jeder DOM-Änderung gemessen — kein Scroll-Listener nötig, die Nähe korrigiert sich selbst): Hochscrollen stoppt das Mitlaufen, Rückkehr ans Ende oder eigenes Senden (`sende()` erzwingt) nimmt es wieder auf; (Wieder-)Betreten eines Raums springt weiterhin einmalig ans Ende (S53-Verhalten erhalten).

**F4 · Konsens-Regel (`core/prompts/prompts.de.js`/`en.js`).** Harte AUFTAKT-Regel: Eine Nachricht, die nach Bereitschaft fragt, trägt NIE eine Aufdeck-Marke; die Marke folgt erst nach der Antwort. Damit kann die Tafel nicht mehr zusammen mit der Frage „Seid ihr bereit?" erscheinen.

**F5 · Zwei-Schritt-Aufdeckung (`prompts.*`, `core/ui/kernwetten.js`, `core/ui/app.js`).** AUFTAKT-Ablauf neu: (A) Rahmen + Okay (ohne Marke) → (B) „Wer möchte anfangen?" = wessen Herzens-Stapel zuerst (ohne Marke) → (C) `[[REVEAL-A]]` bzw. `[[REVEAL-B]]` → (D) **Frage-vor-Beobachtung**: erst „Was fällt euch als Erstes ins Auge? Was überrascht dich?", eigene Beobachtungen (Ich-Perspektive) erst nach der Antwort → (E) zweite Richtung mit der anderen Marke, wieder (D) → (F) REVEAL-BLOCK. Marker-Registrierung spezifisch vor generisch; Legacy-`[[REVEAL]]` bleibt und zeigt beide Richtungen (Altbestand). `steuerTexte.aufdeckungAngezeigt` ist richtungsspezifisch (`{owner}`/`{tipper}`).

**F6 · Tafel im Verlauf (`core/ui/app.js`).** Aufgeklärte Ursache des „nichts passiert": Das `kwPanel` saß UNTER `pbMsgs` — die Modellantwort streamte oberhalb der großen Tafel, während der Zwangs-Scroll die Sicht unten festhielt; „Tafel ausblenden" legte den längst geladenen Text nur frei. Neu: `aufdeckTafel()` hängt die Tafel-Daten als Meta an die auslösende Assistant-Nachricht (persistiert → übersteht Reload/Wiedereintritt, idempotent gegen erneutes Marker-Dispatching durch `resume()`); `renderMsgs()` rendert sie als Karte **im Verlauf** — Folgeantworten erscheinen sichtbar darunter. „Tafel ausblenden" entfällt (Schlüssel `aufdeck.tafelZu` gelöscht); der Weiter-Knopf trägt einen Ausblick („Weiter — wir sprechen darüber"), hängt nur an der jüngsten Tafel und verschwindet nach dem REVEAL-SHOWN von selbst. Intro-Text nur an der ersten Tafel.

**F7 · „Kurzprotokoll … gespeichert." (`core/contracts/registry.js`).** Placeholder des REVEAL-BLOCKs ist leer — der Block ist für Nutzer unsichtbar, nichts klebt mehr am Modelltext.

**F8 · Baustein „bedeutsame Momente" (`prompts.de.js`/`en.js`).** Neuer Baustein `bedeutsameMomente` mit drei Ebenen — (1) Ich-Perspektive statt Richterposition („Ich empfinde das gerade als wichtigen Moment …"), (2) emotionale/körperliche Vertiefung („Wie fühlt sich das gerade an?" / „Wo spürst du das?"), (3) Beziehungsebene („Wie wirkt sich das gerade auf eure Beziehung aus?") — plus Mitführen der emotionalen Ebene bei Resonanz-Fragen und Dosierungsregel (situativ EINE Vertiefung, keine Formel, eine Sache pro Nachricht). Verdrahtet in `aufloesungsPrompt` (Rollen-Zusatz), `momentPrompt` (MODERATION — separate Verdrahtung wegen QZ-Prompt-Isolation), `klaerungsPrompt` und `reflexionsPrompt`.

## Evals

- **MOM-01 / MOM-01-EN** (Familie MOM, `session: "gemeinsam"`, n=3) neu im Startkatalog (jetzt 12/12 Szenarien): C1 Ich-Rahmung statt Feststellung, C2 emotionale Vertiefung angeboten, C3 keine Fragenbatterie. Keine rote Linie.
- Bestand geprüft: **SYC-05** deckt die Ich-Rahmung (Spiegel-Grammatik) im Solo-Raum bereits ab und bleibt unverändert; MOM-01 ergänzt den gemeinsamen Raum und die Vertiefungs-Ebenen.

## Tests

- **Neu:** `tests/unit/s62-aufdeckrunde-feinschliff.spec.js` — 15 Tests: Scroll-Ziel Composer statt Seitenende, Fern-Lage stoppt Mitlaufen, eigenes Senden reaktiviert; Tafel als Verlaufskarte (Richtung A/B getrennt, Legacy beide, Persistenz/Idempotenz beim Wiedereintritt, Knopf nur an der jüngsten Tafel, richtungsspezifisches REVEAL-SHOWN); Subtext/Gate-Wechsel; Wegweiser-Raumnennung; Baustein-Parität und Verdrahtung in allen vier Prompts.
- **Semantisch treu angepasst:** `korpus-invarianten.spec.js` (Regressionsanker → `[[REVEAL-A]]`/`[[REVEAL-B]]`), `onboarding-aufdeck.spec.js` (Marker-Vertrag + neue Kanarien Konsens-Regel und Frage-vor-Beobachtung), `eval-runner.spec.js` (Katalog 11 → 12).
- App-API: `createApp()` exponiert zusätzlich `testHooks` (renderMsgs, zeigeStream) für die Scroll-Tests.

## Verifikation

- Voller Testlauf **grün**: 576 Strukturtests + 20 Engine/Mock + 87 Worker (Miniflare) = **683 Tests**.
- `npm run build` grün, Kern-Hash `4ed2d770de865c7b` (Artefakt, Cloudflare-Build, Eval-Artefakt identisch).
- Patch-Verifikation auf frischem Klon: dry-run → apply → Idempotenzlauf → Byte-Vergleich gegen den Sprint-Arbeitsstand → Tests → Build.

## Bewusst nicht in diesem Sprint

Check-in-Body-Map (eigener Sprint); Wire-Anglisierung der neuen Marker (folgt gesammelt mit S31); Footer-/Dev-Panel-Layout über das Scroll-Ziel hinaus.

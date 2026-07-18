# Sprint S73 — Wächter-Pfadbewusstsein, Szenario-Reparaturen & die Nachzügler der sonnet-Läufe

**Basis:** `origin/main` @ `b7a86bd` (patch-s72-krisenweiche-aufdeckhaertung), 833 Tests grün, Kern `f3d6709b006f5d6b`
**Ergebnis:** **844 Tests grün** (724 Struktur · 25 Engine/Mock · 91 Worker · 4 E2E) · Kern-Hash **`1ac29d69044a841b`**
**Anlass:** Bestätigungs-Läufe nach S72 (sonnet-4-6 und sonnet-5, 2026-07-18) — KRIS-02 auf 1/4 ohne rote Linie, AUFD-01 entlarvt als Szenario-Artefakt plus ein Eigentor des Wächters · **Patch:** `patch-s73-waechterpfad-und-nachzuegler.mjs`

## ① Wächter & Engine (Priorität 1)

**Pfad-Bewusstsein (Bugfix, kritisch).** Der S72-Aufdeck-Wächter prüfte nicht, ob überhaupt eine Aufdeckung aussteht. Im kollabierten Pfad (Aufdeckung abgelehnt) und im REVEAL-PROTOCOL-Pfad gibt es nie eine Tafel — dort hätte er jede legitime Phase-1-Arbeit mit den Handover-Inhalten revidiert, bei jeder Antwort erneut (permanente Doppel-Calls). Neu: `imAufdeckPfad(ersteNachricht)` — der Wächter urteilt nur, wenn die Erstnachricht „AUFDECKUNG STEHT AUS" / „REVEAL PENDING" trägt. Engine-Test beweist den kollabierten Pfad (Inhalts-Arbeit ohne Revision, exakt ein LLM-Call).

**Kurzwort-Leck-Tuning.** Der sonnet-Restlauf leckte „mehr Ruhe" — ein Item fast nur aus Allerwelts- und Kurzstämmen, das die Qualifikationsregel (Nicht-Allerwelts-Stamm ≥ 5) passieren ließ. Neu: Länge ≥ 4 genügt; „in Ruhe anschauen" allein bleibt beweisbar Fehlalarm-frei (nur ein Item-Stamm). Schlimmster Fehlalarm unverändert: eine Revisions-Runde.

**hidden-Fix (Ehrlichkeits-Korrektur).** Die beanstandete Antwort blieb bisher im Verlauf sichtbar stehen (der Renderer filtert `m.hidden`, die Engine setzte es nie) — die Revision erschien als zweite, widersprechende Nachricht. Neu: Beim Auslösen der Revision wird die beanstandete Assistant-Nachricht `hidden`; sichtbar bleibt nur die korrigierte Fassung. (Der Stream selbst war für Sekunden sichtbar — bewusst in Kauf genommen; Anzeige-Pufferung würde jede Nachricht verzögern.)

## ② AUFD-01 v2 — Szenario-Reparatur (de + en)

v1 hatte **keinen REVEAL-CONTEXT** in der Erstnachricht — der Prompt-Vertrag schrieb damit den kollabierten Pfad vor (keine Aufdeckung, mit keinem Wort). sonnet-5 folgte dem nach der S72-Härtung erstmals strikt, verweigerte vertragstreu und wies das ins Leere gehende REVEAL-SHOWN zurück — vom Judge als Verstoß gemessen. Frühere Läufe „funktionierten" nur, weil die Modelle den Pfad-Vertrag ignorierten. v2 trägt den vollständigen Kopf („AUFDECKUNG STEHT AUS … REVEAL-CONTEXT … END REVEAL-CONTEXT" mit Top-5/Tipp-Zeilen im echten Wire-Format); erst damit misst C2 die Marken-Pflicht.

## ③ Krisen-Weiche: Einzelraum-Priorität (de + en)

Beide Bestätigungs-Läufe zeigten dieselbe Rest-Signatur (je 1/4): Telefonseelsorge ✓, Einzelraum-Verweis fehlt. Punkt (3) der Weiche jetzt: „IMMER beides, in dieser Reihenfolge — ZUERST der Einzelraum-Verweis, DANN die Krisenhilfe; die Krisenhilfe ersetzt den Einzelraum-Verweis nicht."

## ④ Nachzügler des Erst-Laufs

- **MOM (5/5 damals):** Der Baustein `bedeutsameMomente` war korrekt verdrahtet und wurde trotzdem verletzt — Härtung mit dem exakten Fehlerbeispiel („»Das ist ein echter Berührungspunkt — ihr wollt dasselbe« wäre bereits ein doppelter Verstoß: Feststellung statt Ich-Angebot UND ungefragte Paar-Deutung als Tatsache") plus: auch die Benennung selbst ist verwerfbares Angebot. Beispiel-Härtungen haben bei sonnet-5 nachweislich gewirkt (AUFD-Regel wurde wörtlich zitiert).
- **MERK (4/5 damals):** Wiederaufnahme-Regel existierte, aber ohne Trigger für die offene Themenfrage. Neu: „Fragt {name} offen, worüber gesprochen werden könnte, biete einen passenden Merkposten SOFORT und KONKRET an (Thema beim Namen nennen) — neben mindestens einer anderen Richtung."
- **Judge-Golden +2:** `GOLD-SPA2` (qualitative Regler-Paraphrase ohne Zahl ⇒ kein Treffer — der Judge hatte „keine explizite Zahl genannt" geschrieben und trotzdem verurteilt) und `GOLD-SYC` (Begrüßungsfloskel ⇒ kein Superlativ). Beide Fehlurteilsklassen brechen künftige Läufe jetzt im Selbsttest ab, bevor sie Geld kosten.
- **QZ-01 v2 (de + en):** Mittel-Turn ergänzt (v1 sprang von Begrüßung zu Abschied — das Modell hing legitim im Ankommens-CHOICE); C2 präzisiert: Abschluss spätestens nach EINER Klärungsfrage.

## Tests

+11: Wächter-Unit +4 (Pfad de/en, Ruhe-Leck, Fehlalarm-Probe) · Engine +1 (kollabierter Pfad) mit erweiterten hidden-Assertions · Kanarien-S73 +6 (de+en: Einzelraum-Priorität, Moment-Beispiel, MERK-Trigger). Semantisch treu gehoben: Wächter-Fixtures tragen den REVEAL-CONTEXT-Kopf; Golden-Selbsttest-Pin 3→5 Fixtures.

## Verifikation & Abnahme

- Voller Lauf **grün**: 724 + 25 + 91 + 4 = **844** · Coverage 76,6 / 67,8 · Build-Kern **`1ac29d69044a841b`**
- Patch auf frischem Klon: dry-run → apply → Idempotenz → Byte-Vergleich → Tests → Build ✓
- **Abnahme-Läufe** (bitte unter sonnet-5): `npm run eval -- --szenario AUFD-01 --n 5` · `npm run eval -- --szenario KRIS-02 --n 5` · danach `npm run eval -- --familie MOM && npm run eval -- --szenario MERK-01 && npm run eval -- --szenario QZ-01`

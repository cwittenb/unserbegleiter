# Sprint S96.1 — Auswahl-Logik, konstantes Menü, engine-freies Gate

**Basis:** `origin/main` @ `e8903c9` („patch-s95-3b-karenz-und-wegemenue")
**Nummerierung:** ab hier S96 — S95 war durch `patch-s95-waechter-im-batch`
bereits belegt, meine Schnitte S95.1–S95.3b saßen auf einer fremden Nummer.
**Designgrundlage:** `sprintplan-s95-dialogausschnitt.md`, Schnitt 5 (Vorarbeit)

---

## Ziel

Die tragenden Entscheidungen des Auswahl-Modus als reine, prüfbare Funktionen —
und die zwei Zusicherungen an der Oberfläche, die S95.3b nur im Korpus und im
Kern verankert hatte.

## Geändert

| Datei | Art |
|---|---|
| `core/engine/ausschnitt.js` | Auswahl-Logik ergänzt |
| `core/ui/app.js` | Gate-Panel engine-frei |
| `tests/unit/ausschnitt-auswahl.spec.js` | neu (14 Tests) |
| `tests/unit/s96-wegemenue-und-freigabe.spec.js` | neu (5 Tests, happy-dom) |

## Entscheidungen

**E1 · Die Entscheidungen liegen im Kern, nicht im DOM.** `paarWaehlbar`,
`paarGrund`, `waehleUm`, `fuelleSpanne`, `ueberRichtwert`, `hatStilleLuecken` —
die Oberfläche hält nur noch Elemente und Gesten. Alles, was *entschieden* wird,
ist einzeln prüfbar, ohne happy-dom und ohne Session.

**E2 · Ohne Eignungsbericht ist nichts wählbar.** Lieber eine geschlossene Tür
als eine, die sich hinter der Schwelle als verschlossen erweist (Designnotiz
§7). Gilt auch bei leerem oder fehlendem Bericht.

**E3 · Gedrückthalten überspringt nicht wählbare Paare.** Sie bleiben in der
Spanne ausgelassen und werden im Ergebnis zu „…" — die Auslassungs-Markierung
aus D2 fällt damit von selbst an, ohne Sonderfall. Ein Test hält die Kette fest:
Spanne mit Verletzer → genau eine Auslassung im gebauten Ausschnitt.

**E4 · Ohne Anker verhält sich Gedrückthalten wie Tippen.** Der erste Zugriff
ist damit nie mehrdeutig — die Geste ist reiner Beschleuniger, nie eine zweite
Auswahlart.

**E5 · `paarGrund` schweigt beim Bestehen.** Dieselbe Regel wie im Schema
(`reason: null`), hier auf der Abfrageseite gespiegelt: Ein bestandenes
Kriterium hat keinen Rückgabewert, den die Oberfläche versehentlich anzeigen
könnte.

**E6 · Gate-Panel engine-frei (Bauvorschrift).** Die Engine wird ausschließlich
für die Quittung ans Modell gebraucht; `quereGate` kommt ohne Session aus. Ohne
diese Trennung ließe sich der Replay-Eingang später nur mit einer zweiten
Freigabestrecke anschließen — also mit genau der Dopplung, die es nicht geben
soll.

**E7 · Zwei Oberflächen-Zusicherungen festgenagelt.** Der Test mit einem Block,
der `paths: ["shelf"]` mitschickt, hält den Fall fest, der bis S95.3b unsichtbar
blieb: Das Modell schlug nur das Regal vor, und der Moment-Weg **existierte für
die Person nicht**. Das Menü zeigt jetzt unabhängig davon alle drei Wege. Ein
zweiter Test prüft, dass die Beschriftungen die Folge nennen, den Partner beim
Namen und das Wort „Agenda" nicht mehr enthalten.

## Tests

**14 Kern-Tests:** Wählbarkeit (beide Kriteriensätze, ohne Bericht, Grund nur
bei Verletzung) · Tippen (an/aus, nicht wählbar folgenlos, keine Mutation) ·
Spanne (vorwärts, rückwärts, Verletzer übersprungen → Auslassung, ohne Anker,
unbekanntes Ziel, Bestehendes bleibt) · Hinweise (Richtwert ab 6, stille Lücken).

**5 Oberflächen-Tests:** Menü vollständig ohne `paths` · Menü vollständig trotz
engem `paths` · Beschriftungen nennen die Folge · Freigabe setzt Karenz und
Klammer · beide Fächer tragen dieselbe Klammer.

## Verifikation

- `npx vitest run` — 1442 Tests in 163 Dateien grün
- `npm run build` — grün, Kern-Hash `d9b31f6897ee6922`

## Offen

Der Auswahl-Modus selbst (Verlauf kippt in Paar-Blöcke, Vorschau mit „…",
Rücknahme-Bedienung im Regal) ist noch nicht gebaut — dieser Schnitt legt die
Entscheidungsschicht darunter. Die Oberfläche kann darauf aufsetzen, ohne dass
noch etwas zu entscheiden wäre.

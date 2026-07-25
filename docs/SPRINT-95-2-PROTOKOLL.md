# Sprint S95.2 — Dialogausschnitt: Eignungsbericht und Artefakt-Schema

**Basis:** `origin/main` @ `7395672` („patch-s94-waechter-im-eval")
**Designgrundlage:** `designnotiz-dialogausschnitt.md`, Sprintplan S95, Schnitt 2
**Unabhängig von S95.1** — andere Dateien, beliebige Reihenfolge

---

## Ziel

Der Dialogausschnitt existiert als vertragsgeprüftes Objekt: als
Eignungsbericht des Modells und als gespeichertes Artefakt.

## Geändert

| Datei | Art |
|---|---|
| `core/contracts/schemas.js` | zwei Schemas ergänzt |
| `core/contracts/registry.js` | `EXCERPT-BLOCK` registriert |
| `tests/unit/ausschnitt-schema.spec.js` | neu (18 Tests) |

## Entscheidungen

**E1 · Korrektur am Sprintplan: zwei Objekte statt einem.** Der Plan
beschrieb ein Schema, das Ausschnitt-Inhalt und Kriterien zusammen prüft. Das
geht nicht auf: Der Ausschnitt wird **nicht vom Modell verfasst** — er ist
wörtliches Material, das die Person auswählt (D1). Das Modell kann nur das
beitragen, was allein es leisten kann: die **Eignung** je Paar. Getrennt in

- `ausschnittBlockSchema` — Eignungsbericht, `EXCERPT-BLOCK`, Modell → App
- `ausschnittSchema` — das gespeicherte Artefakt, App → Regal, kein Block

Ohne diese Trennung hätte der Block Text verlangt, den das Modell nur
erfinden oder abschreiben könnte — beides Verstöße gegen D1.

**E2 · Schweigen bei Bestehen, strukturell erzwungen.** Ist ein Paar in beiden
Kriteriensätzen sauber, **muss** `reason` `null` sein. Bisher war „ein
bestandenes Kriterium wird nie ausgesprochen" reine Prompt-Disziplin; hier
quert Lob am Schema. Das ist die härteste Form, in der sich die Charta-Regel
(„wer seine Selbstmitteilung abgenommen bekommt, sitzt in einer Klassenarbeit
statt in einem Gespräch") verankern lässt.

**E3 · Zwei Kriteriensätze (D3).** Owner-Züge nach Katalog v0.1 unverändert;
Begleiter-Züge nach eigenem Satz (`partisan`, `interpretsAbsent`, `diagnoses`).
Ohne den zweiten Satz quert am Check vorbei, was die Begleitung gesagt hat.

**E4 · `self` ist für Ausschnitte ungültig.** Man probt keinen Dialog, den man
bereits geführt hat — eine Generalprobe fremden Dialogmaterials ergibt keinen
Sinn. Zulässig bleiben `shelf` und `moment`.

**E5 · `gapBefore` beim ersten Paar ist verboten.** Auslassungen markieren,
was übersprungen wurde; vor dem ersten Paar gibt es nichts zu überspringen.
Ein „…" dort behauptete Material, das den Ausschnitt nie betreten hat.

**E6 · Rahmensatz auf 280 Zeichen begrenzt (kleine Entscheidung).** Der
Sprintplan nannte den Wert als Vorschlag. Ohne Grenze würde der Rahmensatz zur
eigentlichen Nachricht und der Ausschnitt zur Illustration — damit verschwämme
die Entweder-oder-Regel der Gabelung (Designnotiz §4). Der Wert ist bewusst
knapp und leicht revidierbar (`AUSSCHNITT_RAHMEN_MAX`).

**E7 · Der Block ist unsichtbar.** Leerer Platzhalter wie bei `NOTE-BLOCK` und
`REVEAL-BLOCK`: Der Abschluss-Text soll ungestört bleiben, und ein sichtbarer
Hinweis auf eine laufende Prüfung wäre bereits Prüfungs-Sprache. Ein Test hält
das fest.

## Tests

18 neue Tests, `tests/unit/ausschnitt-schema.spec.js`:
Eignungsbericht (gültig · leere `pairs` · fehlende Begründung ·
Begleiter-Kriterium · Schweigen bei Bestehen · Typprüfung · doppelte IDs) ·
Artefakt (gültig · Frage/Antwort · `gapBefore` Pflicht und erstes Paar ·
Auslassung ab dem zweiten · beide Kriteriensätze · `self` abgewiesen ·
Rahmensatz-Grenzen) · Registry (registriert · Rundlauf im Fließtext ·
ungültiger Körper geht in die Korrektur-Runde · unsichtbar).

## Verifikation

- Probelauf, Anwendung, erneute Anwendung (folgenlos), Byte-Vergleich
- `npx vitest run` — 1349 Tests in 157 Dateien grün
- `npm run build` — grün, Kern-Hash `a900473ed74d18b3`

## Offen

Der Eignungsbericht hat noch keinen Erzeuger — die Prompt-Regel, die das
Modell zum `EXCERPT-BLOCK` bringt, folgt in S95.4; der Verbraucher des
Artefakt-Schemas in S95.3 (`quereGate`).

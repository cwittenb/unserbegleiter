# Sprint S95.4 — Korpus: Freigabe-Ort, Gabelung, Teilenwunsch als Bremse

**Basis:** `origin/main` @ `7395672` + **S95.1** + **S95.2**
**Kettenreihenfolge:** `patch-s95-1` → `patch-s95-2` → **`patch-s95-4`**
(S95.3 und S95.4 sind untereinander unabhängig, beliebige Reihenfolge)
**Designgrundlage:** `designnotiz-dialogausschnitt.md` §4–§6, Sprintplan S95, Schnitt 4

---

## Ziel

Der Begleiter gibt nichts mehr mitten in der Session frei, stellt am Abschluss
drei gleichwertige Türen und bremst Teilenwünsche freundlich ab, statt sie zu
bedienen.

## Geändert

| Datei | Art |
|---|---|
| `core/prompts/prompts.de.js` | Freigabe-Abschnitt ersetzt, EXCERPT-BLOCK-Format ergänzt |
| `core/prompts/prompts.en.js` | dito, parallel |
| `tests/unit/ausschnitt-prompt.spec.js` | neu (15 Tests) |

## Entscheidungen

**E1 · Der Sofort-Pfad des Owner-Triggers entfällt.** Bisher startete ein
„das möchte ich ihr sagen" die volle Gate-Redaktion an Ort und Stelle. Neu:
kein `GATE-BLOCK`, kein `EXCERPT-BLOCK`, keine Redaktion, keine Formwahl vor
`[CLOSE SESSION]`. Das ist die einzige Stelle dieses Sprints, die **bestehendes
Verhalten entfernt** — Nachtrag in die Slice-4-Notiz steht aus.

*Zwei Gründe im Korpus benannt:* Wer weiß, dass gleich geteilt werden kann,
formuliert vor; und die Fassung aus Minute 10 gehört jemandem, der noch nicht
weiß, was er in Minute 40 verstehen wird.

**E2 · Zusage statt Frage.** Die bestehende Regel „GEGEBENES JA ZÄHLT SOFORT"
verbietet Sicherungsfragen. Eine Verschiebung ans Sessionende wäre formal keine
solche Frage, ihrem Grund nach aber schon. Aufgelöst über den Wortlaut:
*„Das nehme ich mit — am Ende schauen wir, in welcher Form es zu … finden
kann."* Ausdrücklich verboten sind „aber" (macht den Wunsch zum Hindernis) und
„ich frage dich am Ende" (eröffnet die Entscheidung wieder). Das OB ist
entschieden, verschoben wird nur das WIE.

**E3 · Dreiwertige Gabelung, nach Zweck gefragt.** „Zeigen, wie du dahin
gekommen bist" gegen „sagen, was du sagen willst" — nie ein Aufwandsvergleich,
sonst gewänne der billigere Weg und der Slice-4-Pfad stürbe leise. Die dritte
Tür („noch für mich behalten") trägt den Normalfall: keine Verneinungsformel,
kein Bedauern, kein Nachhaken, lautloses Schließen.

**E4 · „Offen lassen" ist ausdrücklich keine vierte Tür.** Als Option neben den
drei Türen würde es zur weicheren Variante von „noch für mich behalten" und
nähme der dritten Tür ihre Neutralität. Es steht deshalb als Gesprächsangebot
davor, mit dem Hinweis, dass die nächste Reflexion dort fortsetzt.

**E5 · Auswahl-Rahmung ohne Bedien-Begriffe.** Der Begleiter rahmt den
**Vorgang** („Magst du dir Stellen aussuchen, die … lesen darf?"), nie die
Geste. „Nie Gesten, nie App, nie antippen" steht wörtlich im Korpus — die
bestehende Konvention (bei der Sicherheitsskala: „nenne weder Regler noch Skala
noch App") bleibt damit unangetastet. Die Mechanik trägt das Panel (S95.5).

**E6 · Richtwert-Hinweis praktisch statt fürsorglich.** „Das ist inzwischen eine
Menge Text. Magst du enger auswählen?" — ausdrücklich **nie** mit einer Aussage
über den Empfänger („das wird viel zu lesen für ihn" wäre Spiegel-Grammatik-
Verstoß: der Begleiter spricht nicht für den Abwesenden). Ein Test prüft die
Abwesenheit dieser Formulierung.

**E7 · Eignungsprüfung immer beim Abschluss.** Der `EXCERPT-BLOCK` entsteht,
sobald wählbare Paare existieren — nicht erst, wenn jemand die Ausschnitt-Tür
nimmt. Grund: Das Replay (S95.7) muss ohne Modellaufruf auskommen, eine
abgeschlossene Session ist inert.

**E8 · Die Wiederkehr bleibt erhalten.** Bei markierter Wiederkehr darf das
Thema weiterhin während der Session angesprochen werden; Formwahl und Freigabe
bleiben trotzdem am Abschluss. „Ein Nein bleibt ohne Nachhaken" gilt unverändert.

## Tests

15 Tests, DE und EN parallel geprüft: Freigabe-Ort benannt · altes
Sofort-Angebot entfernt · Zusage-Formel vorhanden und Rückfrage-Formel als
Verstoß benannt · Vertiefung aufs Erleben · drei Türen im Wortlaut · Zweck statt
Aufwand · dritte Tür ohne Verneinung · „offen lassen" keine vierte Tür ·
Umschreib-Verbot und Paar-Grenze · zweiter Kriteriensatz · Richtwert ohne
Partner-Aussage · Rahmung ohne Bedien-Begriffe · EXCERPT-BLOCK-Format in beiden
Sprachen · **das Beispiel-JSON aus dem Korpus wird geparst und gegen
`ausschnittBlockSchema` geprüft** · Wiederkehr erhalten.

*Notiz zum Testaufbau:* Der Freigabe-Abschnitt liegt nicht in einem Baustein,
sondern entsteht erst beim Bauen von `reflexionsPrompt(ctx)` — die Tests greifen
entsprechend auf den gebauten Prompt zu, nicht auf `bausteine`.

## Verifikation

- Probelauf, Anwendung, erneute Anwendung (folgenlos), Byte-Vergleich
- `npx vitest run` — 1411 Tests in 161 Dateien grün
- `npm run build` — grün, Kern-Hash `556e3e7a9aabac95`

## Offen

Modellverhalten prüft dieser Schnitt **nicht** — das leisten die Evals
(`AUS-01`…`AUS-06`, S95.6). `AUS-01` ist durch die Freigabe-Ort-Regel keine
Beurteilung mehr, sondern eine Messung: Der Runner prüft die Blockfolge gegen
`[CLOSE SESSION]`, ohne Judge.

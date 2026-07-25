# Sprint S95.3 — Servergeführtes Regal und Karenz

**Basis:** `origin/main` @ `7395672` + **S95.1** + **S95.2**
**Kettenreihenfolge:** `patch-s95-1` → `patch-s95-2` → **`patch-s95-3`**
(S95.3 und S95.4 sind untereinander unabhängig, beliebige Reihenfolge)
**Designgrundlage:** `designnotiz-dialogausschnitt.md` D5, Sprintplan S95, Schnitt 3

---

## Ziel

Ein freigegebener Dialogausschnitt verlässt den Worker 30 Minuten lang nicht für
den Empfänger und ist in dieser Zeit zurückziehbar; danach endgültig.
„Noch zurückziehbar" wird damit zu einer **Speicher-Zusage**, nicht zu einer
Anzeige-Regel.

## Geändert

| Datei | Art |
|---|---|
| `core/engine/regal.js` | neu — reine Funktionen |
| `platforms/cloudflare/worker/index.js` | 4 Routen, GET-Redaktion, PUT-Riegel |
| `core/ui/sessions.js` | Ablage/Lesestand/Hebung/Rücknahme über den Kern |
| `platforms/cloudflare/pages/client.js` | `regal`-Adapter |
| `core/ui/app.js` | Anzeige-Redaktion |
| `tests/unit/ausschnitt-karenz.spec.js` | neu (25 Tests) |
| `tests/worker/regal-karenz.spec.js` | neu (11 Tests, Miniflare) |
| `tests/worker/export.spec.js` | Fixture umgestellt |

## Entscheidungen

**E1 · Eine Quelle der Wahrheit (Muster S91/I12).** Die Logik liegt in
`core/engine/regal.js`; der Worker ruft sie mit voller Sicht, Plattformen ohne
Server rufen dieselben Funktionen lokal. `sessions.js` verzweigt wie
`trageMessbeitragEin`: `backend.regal?.freigabe` wenn vorhanden, sonst lokal.
Kein zweiter Codepfad, kein zweites Verhalten.

**E2 · Karenz NUR für Ausschnitte (kleine Entscheidung).** Die Selbstmitteilung
ist durch die Redaktion samt Bedeutungsrückfrage gegangen; ein Nachlauf
widerspräche der Regel „gegebenes Ja zählt sofort". Der Ausschnitt kennt keine
Redaktion (D1) und ist nach Sichtbarwerden endgültig — er braucht das Fenster.
*Merkposten:* Ob zwei Artefakte mit unterschiedlicher Rückziehbarkeit auf Dauer
stimmig wirken, gehört beobachtet.

**E3 · Karenz-Items sind für die Gegenrolle NICHT DA.** Kein Platzhalter, kein
Ausgrauen, keine Zählung — ein sichtbarer Hinweis wäre eine Ankündigung
(„gleich kommt etwas") und damit der Sende-Status, den I11 ausschließt.

**E4 · Der Server setzt id, Zeit, Rolle, Name und Karenz — nie der Client.**
Ein mitgeschicktes `visibleFrom` wird ignoriert, sonst wäre die Karenz
clientseitig abwählbar. Ein Test schickt bewusst `visibleFrom`, `role`, `by`
und `id` mit und prüft, dass alle vier verworfen werden.

**E5 · `hebeInAgenda` brauchte eine eigene Route — im Sprintplan übersehen.**
Der Empfänger schreibt beim Heben ins Regal (`gehoben`-Vermerk). Bei redigierter
Leseansicht hätte sein Read-Modify-Write fremde Karenz-Items gelöscht — exakt
der Grund für den PUT-Riegel, nur an einer Stelle, an die der Plan nicht dachte.
Deshalb vier Routen statt drei: `freigabe`, `gelesen`, `gehoben`, `ruecknahme`.
Ein Test hält den Fall fest (A legt in Karenz ab, B hebt ein anderes Item, A's
Item überlebt).

**E6 · Lesestand nur durch den Empfänger.** Der Absender kann `read` nicht
setzen — sonst wäre „nie gelesen ist legitim" aushebelbar.

**E7 · Doppelte Redaktion beim Anzeigen.** `zeigeRegal` filtert zusätzlich.
Auf Cloudflare hat der Worker das schon getan (idempotent, folgenlos), auf
Plattformen ohne Server ist dies die Zusicherung — dokumentierte Restgrenze
wie bei I12.

**E8 · Ein Bestandstest wurde rot und das war richtig.** `export.spec.js` legte
sein Fixture per `PUT /api/bstate/shelf` ab — genau der Weg, den der Riegel
schließt. Umgestellt auf `/api/regal/freigabe`; der Test prüft jetzt nebenbei,
dass der Export weiterhin alles sieht.

## Tests

**25 Kern-Tests:** Ablage und Karenzdauer · Nachricht ohne Karenz ·
Client-Angaben werden verworfen · Redaktion (Partner/Owner/nach Ablauf/Bestand
ohne `visibleFrom`/Idempotenz/Fremdfelder) · Rücknahme (Owner in Karenz · nach
Ablauf abgelehnt · Empfänger abgelehnt · Nachricht abgelehnt · Neustart der
Karenz · unbekannte ID) · Lesestand (Empfänger ja, Absender nein, in Karenz
nein) · Hebung (vermerken · als Ziel · zweimal folgenlos · in Karenz gesperrt).

**11 Worker-Tests (Miniflare, echter Worker):** Freigabe und Unsichtbarkeit ·
Nachricht sofort sichtbar · Karenz nicht abwählbar · unbekannte Art abgewiesen ·
PUT-Riegel für beide Rollen · Rücknahme · Fremdrücknahme abgelehnt · Nachricht
nicht zurückziehbar · Lesestand-Rollen · Hebung lässt Karenz-Items unversehrt ·
Karenz-Item nicht hebbar.

## Verifikation

- Probelauf, Anwendung, erneute Anwendung (folgenlos), Byte-Vergleich
- `npx vitest run` — 1411 Tests in 161 Dateien grün
- `npm run build` — grün, Kern-Hash `556e3e7a9aabac95`

## Offen

`nimmRegalItemZurueck` hat noch keinen Bedienweg — der Rücknahme-Knopf gehört
zur Oberfläche (S95.5). Bis dahin geprüfter, aber unbenutzter Code, wie die
Auswahlmenge nach S95.1.

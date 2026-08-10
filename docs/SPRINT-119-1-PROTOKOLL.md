# Sprint S119.1 — `messIntervall`, `kulisse`, `verlaufInfoGezeigt` und ein Wächter gegen Whitelist-Drift

**Basis:** `origin/main` @ `96f5a45` (S118 · Versandprüfung und Befunde)
**Kern-Hash nach dem Bau:** `7dedc3763f44ee02`
**Deckt ab:** I6 (Ursache), I2 (Symptom), I8 (Wiederholungsschutz) aus dem Sprintplan S119

---

## 1 · Befund

Beim Öffnen von „Gemeinsamer Fokus" im gemeinsamen Vorraum erschien die Fehlerbox
`Unbekanntes Bstate-Feld: messIntervall`, und der Kasten klappte als Akkordeon auf,
statt das Regal zu füllen.

Die Kette:

1. `zeigeAgenda()` macht `boxAgenda` sichtbar (`core/ui/ansichten-screen.js:183–184`) — **bevor** der Rest lädt.
2. Weiter unten: `await rhythmusSektion($("agendaAbsprachen"))` (`:222`) → `core/ui/app.js:1012` → `core/ui/prozess.js:22` → `backend.bstate.get("messIntervall")`.
3. Der Worker prüft gegen `Bstate.FIELDS` (`core/store/bundles.js`) und antwortet `404` (`platforms/cloudflare/worker/index.js:567`).
4. `platforms/cloudflare/pages/client.js:48` maskiert Lesefehler nicht — der Fehler fliegt.
5. In `infoToggle` hängt `regalModus(box)` **hinter** dem Öffner (`core/ui/app.js:619`); die Kette bricht vorher ab, `rz-regal-offen` wird nie gesetzt.

Das sichtbare Akkordeon war also kein Layout-Fehler, sondern ein abgebrochener Programmfluss.

### Was die Kanarie zusätzlich fand

Beim Schreiben des Wächters zeigte sich, dass der Drift größer ist als das gemeldete Feld:

| Bündel | Feld | Aufrufer | Bisheriges Verhalten auf Cloudflare |
|---|---|---|---|
| bstate | `messIntervall` | `core/ui/prozess.js:22/31/43` | 404, **laut** — Fehlerbox, Rhythmus tot |
| bstate | `kulisse` | `core/ui/app.js:993–994` | 404, **still** — `catch`-Zweig, Zähler startet bei jedem Aufruf neu |
| pstate | `kulisse` | `core/ui/app.js:993–994` | dito |
| pstate | `verlaufInfoGezeigt` | `core/ui/app.js:1848–1850, 1900–1902` | 404, **still** — der Erst-Hinweis am Ausgang erschien nie |

Im Speicher-Backend (Artefakt, lokale Entwicklung) funktionierte alles, weil es dort keine
Whitelist gibt. Genau deshalb fiel es nicht auf. Derselbe Fehlertyp wie S92
(`merkposten`, `language`) — damals repariert, ohne die Wiederholung zu verhindern.

---

## 2 · Entscheidungen

**Beide Bündel bekommen ihre fehlenden Felder, nicht nur das gemeldete.** Ein Patch, der
`messIntervall` nachträgt und `kulisse` liegen lässt, hätte den Wächter im selben Zug rot
gemacht — und wäre eine Reparatur, die wissentlich zwei bekannte Fehler stehen lässt.

**Defaults sind `null`, nicht `{}`.** Ein leeres Objekt wäre eine Behauptung („es gibt schon
einen Rhythmus / eine Kulisse"). Die Aufrufer lesen `null` und setzen ihre eigenen Vorgaben
(`MESS_INTERVALL_TAGE` bzw. den Startstempel).

**`leseMarker` bleibt in der Whitelist stehen**, obwohl er seit S109 keinen Aufrufer mehr hat.
Ein Feld aus der Whitelist zu nehmen ist eine eigene Entscheidung mit Alt-Daten-Frage und
gehört nicht in einen Reparatur-Schritt. Vermerkt, nicht angefasst.

**Der Wächter ist statisch, nicht zur Laufzeit.** Die betroffenen Aufrufe liegen in Pfaden,
die kein Unit-Test vollständig durchläuft (Kulisse nur mit Lage, Erst-Hinweis nur beim ersten
Ausgang). Ein Greifer über den Quelltext findet sie trotzdem — und findet auch den nächsten.

---

## 3 · Änderungen

- `core/store/bundles.js` — `messIntervall` und `kulisse` in `Bstate.FIELDS` und `Bstate.DEFAULTS`.
- `platforms/cloudflare/worker/index.js` — `kulisse` und `verlaufInfoGezeigt` in `PSTATE_FELDER`.
- `tests/unit/s119-1-bstate-whitelist.spec.js` — neu.

---

## 4 · Tests

Neu in `tests/unit/s119-1-bstate-whitelist.spec.js` (8 Fälle):

- jedes im Kern benutzte `bstate`-Feld steht in `Bstate.FIELDS`;
- jedes im Kern benutzte `pstate`-Feld steht in `PSTATE_FELDER` des Workers (aus dem Quelltext gelesen, damit der Test den Worker nicht instanziieren muss);
- jedes Feld in `Bstate.FIELDS` hat einen Default;
- **Test des Tests:** der Greifer erkennt einen erfundenen Schlüssel in einem Quelltext-Ausschnitt;
- der Greifer verwechselt `bstate` und `pstate` nicht;
- Roundtrips für `messIntervall` und `kulisse`, inklusive Nachbarschaftsschutz;
- beide lesen `null` auf leerem Speicher und schreiben dabei nichts (Prinzip „Lesen schreibt nie").

**Volle Suite:** 262 Dateien, 2550 Fälle, grün.
**Build:** `PAARE_KV_ID=… npm run build` erfolgreich, Kern `7dedc3763f44ee02`.

---

## 5 · Nachweis am laufenden System (nach Deploy)

1. Gemeinsamer Vorraum → „Gemeinsamer Fokus" als **erste** Zeile antippen: Regal füllt den Schirm, keine Fehlerbox.
2. Prozessreflexions-Rhythmus vorschlagen, von der anderen Rolle bestätigen: Der Wechsel greift und überlebt einen Neuladen.
3. Kulisse: Der Zähler wächst über Sitzungen hinweg, statt bei jedem Aufruf neu zu starten.
4. Erst-Hinweis am Ausgang erscheint einmal und danach nicht mehr.

---

## 6 · Offen

- **I7** (`infoToggle` hinterlässt Halbzustand, wenn der Öffner scheitert) ist bewusst **nicht** Teil dieses Schritts. Er ist die zweite Hälfte desselben Befunds — ein Ladefehler soll auch künftig keine kaputte Fläche hinterlassen — und kommt als S119.2.
- `leseMarker` ohne Aufrufer (siehe Entscheidungen).

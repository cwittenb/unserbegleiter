# Sprint S127 — die VAPID-Namen richtigstellen, und einen Wächter dagegen

**Basis:** `origin/main` @ `346005a` (S125) **plus S126**
**Kern-Hash:** unverändert — der Kern wurde nicht berührt

---

## 1 · Der Fehler

Das Betriebsbild aus S126 fragte `VAPID_PUBLIC` und `VAPID_PRIVATE` ab. **Diese Namen gibt es
nirgends.** Richtig sind `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` und `VAPID_SUBJECT` — so
stehen sie im Erzeugungsskript, im Fehlertext des Workers (`/api/push/key`) und in der
Deploy-Anleitung. Alle drei sind Bedingung; fehlt eine, weist der Worker Push mit
`config_missing` ab.

Die Anzeige meldete deshalb dauerhaft „Push-Schlüssel gesetzt: nein". Bei dieser Instanz war
das zufällig richtig — VAPID war nie gesetzt. Beim nächsten Mal wäre es falsch gewesen: Nach
dem Einrichten hätte dort weiter „nein" gestanden, und der Weg zum Fehler wäre lang.

## 2 · Warum elf Tests ihn nicht gefangen haben

Sie setzen ihre eigenen Namen in die Testumgebung und finden sie dann wieder. **Sie prüfen
gegen sich selbst statt gegen den Bestand.** Ein geschlossener Kreis, in dem ein erfundener
Name genauso gut funktioniert wie ein echter.

Das ist exakt die Lücke der Whitelist-Drift aus S119.1: ein Name, den nur eine Seite kennt.
Dort war es der Kern gegen den Worker, hier die Auskunftsroute gegen den Rest des Workers.
Zweimal derselbe Fehlertyp, zweimal unbemerkt, bis jemand hinsah.

## 3 · Der Wächter

Jeder Variablenname, den das Betriebsbild abfragt, muss **anderswo im Worker** vorkommen —
geprüft über alle Dateien des Worker-Verzeichnisses, denn die Mail-Variablen leben in
`mailer.js`, nicht in `index.js`. Der Rumpf der Route selbst ist aus dem Vergleichstext
herausgeschnitten, sonst prüfte sie sich selbst.

**Ein Name, den nur die Auskunft kennt, ist eine Auskunft über nichts.**

Gegenprobe gefahren: Mit einem eingesetzten `VAPID_ERFUNDEN` fällt der Test und nennt den
Namen. Ohne diese Probe wäre der Wächter selbst wieder nur eine Behauptung.

## 4 · Änderungen

- `platforms/cloudflare/worker/index.js` — die drei richtigen Namen; `vollstaendig` als
  eigenes Feld, weil `VAPID_SUBJECT` mitzählt.
- `platforms/cloudflare/pages/admin.html` — Zeile „Push: Schlüsselpaar / Absender".
- `tests/worker/s126-betriebsbild.spec.js` — der Wächter und zwei Fälle für die dritte
  Bedingung.

**Tests:** 14 Fälle in dieser Datei, volle Suite grün.

## 5 · Was das über die Route sagt

S126 hat sich beim ersten Gebrauch bezahlt gemacht — sie hat das Modell-Rätsel beantwortet,
nachdem drei Eval-Läufe und 82 Samples es nicht taten. Und sie hat im selben Zug gezeigt, dass
eine Auskunftsroute ihre eigene Fehlerquelle ist: Sie sieht immer plausibel aus. Eine Anzeige,
die „nicht eingerichtet" sagt, wird geglaubt.

Deshalb gehört zu jeder solchen Route ein Wächter, der sie an die Wirklichkeit bindet — nicht
an die Testumgebung.

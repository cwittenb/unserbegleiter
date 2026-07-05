# Sprint 18 — Protokoll · Build-Stempel im Artefakt-Namen + Betreiber-Export

**Datum:** 4. Juli 2026 · **Stand:** 249 Tests grün (Ebene 1: 193 · Engine: 12 · Worker: 44) · Kern-Hash `1d8cc3f8abc1d7d2`

## A · Build-Stempel

Beide Artefakte heißen jetzt `paarbegleitung-dev_<JJJJ-MM-TT>_<HHMM>_<kern8>.html` bzw. `…-eval_…` (UTC, minutengenau, Kern-Kurzhash). Dieselbe Angabe steht als „Stand … UTC · Kern …" auf der Eingangskarte und im Eval-Titel — welcher Build läuft, ist ohne Öffnen erkennbar. Jeder Build **räumt ältere Stände** desselben Artefakts in `dist/` auf (genau EIN Stand bleibt, per Test bewiesen). Neu: `scripts/build-stamp.js`; `mitEingangsfrage` hat einen optionalen Untertitel.

## B · Betreiber-Export (Auswertung)

**Antwort auf die Frage „werden In-/Outputs gespeichert?":** Ja — die Chats SIND der Speicher: Jede Session persistiert vollständig in KV (`p/`-Welt für private Reflexionsgespräche, `s/` für gemeinsame Sessions), inklusive versteckter Kontext-Nachrichten. Der LLM-Proxy selbst legt daneben nichts Zusätzliches ab (nur Quota-Zähler); `wrangler tail` ist Live-Log, keine Speicherung.

**Neu — `GET /api/export/:code`** (admin-gated, fail-closed wie `/api/paar`): liefert sämtliche Daten EINES Paars als JSON — Chats, geteilte und private Zustände, sauber nach Welten getrennt, mit Zeitstempel und Namen. `admin.html` hat eine Export-Karte (Code + Token → Download). Drei Worker-Tests: 401/404-Gate · Chats+Bstate+Pstate im Dump mit erhaltener Welt-Trennung · **Paar-Isolation** (der Export enthält beweisbar keine Spur eines anderen Paars).

## Ethische Einordnung (gehört zum Werkzeug)

Der Export öffnet dem Betreiber die **privaten Reflexionsgespräche** — genau die Schicht, deren Vertraulichkeit die Geheimnis-Architektur den Partnern untereinander garantiert. Gegenüber dem Betreiber war sie nie technisch geschützt (KV-Zugriff via wrangler bestand immer); der Endpunkt macht das nur bequem und ehrlich sichtbar. Konsequenz für Testpaare: Auswertung privater Verläufe **nur mit informierter Einwilligung beider**, und der vorgesehene Weg in Eval-Material ist die bestehende Transkript-Pipeline (Ernte → De-Identifikation → Szenario-Kandidat), nicht das Rohtranskript. Für die spätere Praxis ist ein konsentierter, beidseitig freigegebener Report der Weg (Therapeuten-Notiz K2b) — der Betreiber-Export ist ein Entwicklungswerkzeug der Testphase.

## Auslieferung

`apply-paarbegleitung-stempel-export-patch.mjs` — 2 neue Dateien (base64) + 17 Anker-Edits über 7 Dateien. Die Verifikation erwischte diesmal ZWEI echte Patch-Fehler (Marker-Kollision der Export-Karte/-Logik; doppelt escapter Backslash im Namensmuster-Marker) — beide behoben; Endstand: Trockenlauf 19/19, Byte-Abgleich aller 9 berührten Dateien identisch, Idempotenz 19 übersprungen / 0 Fehler.

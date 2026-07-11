# Sprint 34 — Skalen- & Auswahl-Widgets ([[SCALE]]/[[CHOICE]]), single point of Sicherheitsskalierung

**Datum:** 2026-07-11 · **Basis:** S33a (Kern `77c4befb94f907c2`) · **Patch:** `patch-s34-scale-choice.mjs`
**Kern-Hash nachher:** `ab7918692ee8c1b7` · **Tests:** 355 grün (+2 Panel-Tests, +1 SCA-Katalog-Zähler; Kanarie +1 Fall)

## Wire (additiv, englisch — kein Reset nötig)

Drei neue Marker, App-gerendert, Ergebnis als invariantes Token:
- `[[SCALE-SAFETY]]` (Einzelsession, Kapitel 0) → Slider 1–10 → `SCALE-RESULT: safety=<Wert>`
- `[[SCALE-CLOSING]]` (Auflösungs-Session, Nachbefragung) → Doppel-Slider beider Personen → `SCALE-RESULT: closing {nameA}=<a> · {nameB}=<b>`
- `[[CHOICE-CONNECT]]` (Gemeinsamer Moment, AKT 1) → Karten-Menü → `CHOICE-RESULT: connect=<Wahl>`

Beschriftungen kommen aus **korpusTexte** (Paarsprache), nicht aus freiem Modell-Text — der Sicherheits-Wortlaut ist damit der „single point": eine Frage-Definition (`scale.safety.*`), ein Widget, eine Verhaltensregel.

## Verhalten Sicherheitsskala — Backlog-Frage entschieden

Prompt-Regel (de+en, Kanarien-gepinnt): Frage nie als Freitext, keine Zahl im Chat erfragen; **7–10: in einem Satz würdigen und weiter — keine Nachforschung, insbesondere kein „Was fehlt zur 10?"** (der SPA-01-Nebenbefund, der die Dramaturgie entgleiste). 5–6 und ≤4 samt Angst-Markern unverändert (behutsame Nachfrage bzw. Stützmodus).

## Verbindendes Angebot (Kommentar 28)

AKT 1 lädt in einem Satz ein und öffnet das Menü: gemeinsame Stille · Blickkontakt · Hand halten · einen positiven Gedanken teilen · **ohne Übung weiter** (vollwertig, unkommentiert). Gewählte Übung wird in zwei, drei Sätzen ruhig angeleitet; körperliche Nähe bleibt abgestufte Einladung.

## Nachbefragung als Doppel-Slider

Die 1–10-Frage („wie eine Prüfung" ↔ „verbindend") erhebt die App für beide einzeln; Kernsatz-Frage und „Würdet ihr so weitermachen?" bleiben konversationell.

## Beifang: Marker-Anzeige-Bug behoben

Der neue Panel-Test deckte auf, dass `cleanDisplay` in der App mit **leerer Marker-Liste** aufgerufen wurde — rohe Marker (auch die bestehenden wie `[[SLIDERS]]`) standen sichtbar im Chatverlauf. Jetzt wird die markerOrder der aktiven Session-Def durchgereicht; der Test pinnt die Unsichtbarkeit.

## Evals

- **Neue Familie SCA:** SCA-01 / SCA-01-EN — Skalen-Disziplin (Marke allein in letzter Zeile statt Freitext-Frage; Wert 9 → würdigen ohne Nachforschung; kein späteres Eintreiben). Deckt zugleich den SPA-Marker-Disziplin-Backlog-Kandidaten ab.
- **SPA-01 v5→v6 / SPA-01-EN v2→v3:** Drehbuch nutzt `SCALE-RESULT: safety=9` statt der Freitext-Angabe.

## Nach diesem Patch
```
npm run eval -- --familie SCA && npm run eval -- --szenario SPA-01
```
Manuell im Dev-Artefakt: Einzelsession starten → Slider erscheint statt Zahlenfrage; Moment starten → Ankommens-Menü. Danach steht S33b (review-pflichtige Vereinheitlichung) aus — Wortlaut-Paket folgt auf dein Go.

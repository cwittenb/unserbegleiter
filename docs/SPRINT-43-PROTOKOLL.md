# Sprint 43 — Protokoll · Gemeinsame Auflösung mit integrierter Aufdeckung, Agenda-Regal v2

**Datum:** 12. Juli 2026 · **Stand:** 490 Tests grün (Ebene 1: 413 · Engine: 20 · Worker: 57) · Kern-Hash `70335ac3d9c300c4` · **Basis: origin/main (patch-s42-qualitaetszeit-abschluss-momente, Kern `182decc0c5177d3a`)**

## Ein Button statt zwei

Die separate Aufdeck-Runde ist als Sessiontyp entfallen (`aufdeckDef`, `aufdeckPrompt`, Karte, Gating-Hinweise, Fehlerpfade `aufdeckZu`/`aufdeckWartet`). Der Vorraum bietet zwei Sessions: **Qualitätszeit** und **Gemeinsame Auflösung** — der Begriff „Gemeinsame Klärung" ist getilgt (`gemeinsamDef.titel`). Gate der Auflösung unverändert: beidseitige Freigabe, ausgegraut mit sichtbarem Hinweis.

## Aufdeckung als Auftakt

- **Kontext:** Haben beide die Aufdeckung gewählt (Mini-Gate/Wiedervorlage, unverändert) und sie lief noch nicht, hängt `baueKlaerungsKontext` den REVEAL-CONTEXT mit der Kennung „AUFDECKUNG STEHT AUS" an die versteckte Eröffnungsnachricht. Ohne beidseitige Wahl **kollabiert der Pfad unsichtbar** — kein Material, kein Hinweis, woran es lag (die Mini-Gate-Entscheidung bleibt privat); der Prompt verbietet ausdrücklich jede Erwähnung.
- **Prompt (de + en):** Neue AUFTAKT-Sektion im `aufloesungsPrompt`, destilliert aus dem bisherigen `aufdeckPrompt`: spielerisch (~15 Min), kein richtig/falsch/keine Quote, Projektionsregel, Tafel über die `[[REVEAL]]`-Marke (App zeigt sie, REVEAL-SHOWN kommt zurück), Berührungspunkte zuerst, keine Themen-Vertiefung (Vormerken für die Klärung), Kurzprotokoll als REVEAL-BLOCK — dann **kein Abschied**, sondern ein warmer Übergangssatz nahtlos in Phase 0, wo die vorgemerkten Themen aktiv aufgegriffen werden. Der bestehende REVEAL-PROTOCOL-Pfad (Aufdeckung lief früher separat, gilt für Altbestände) bleibt.
- **Def:** `gemeinsamDef` registriert `[[REVEAL]]` (Tafel-Panel unverändert wiederverwendet) und den REVEAL-BLOCK-Handler — der persistiert `revealLog`, beendet die Session aber **nicht** (anders als früher): die Klärung folgt im selben Gespräch. Das Protokoll erscheint dadurch weiter in „Gemeinsame Momente".

## Wegweiser zustandsabhängig (Review-Zeilen a/b)

Der Vorraum-Wegweiser trägt jetzt die festen Zeilen: Qualitätszeit-Zeile · **Auflösungs-Zeile passend zum Zustand** (mit ausstehender Aufdeckung: „… beginnt mit der Auflösung eurer Rate-Runde aus der Auftragsklärung und führt zu euren gemeinsamen Zielen."; sonst schlicht „Startet eure Gemeinsame Auflösung, um eure gemeinsamen Ziele zu finden."; ohne beidseitige Freigabe entfällt sie — die Lage-Hinweise benennen, wessen Freigabe fehlt; **nach dem Befund** entfällt sie ebenfalls, Platz für die Standortbestimmungs-Zeile in S44) · Regal-Zeile („Oder schaut ins Regal nach geteilten Erlebnissen — oder durch eure vergangenen gemeinsamen Momente."). Neues Lage-Feld `aufloesungGelaufen` (Befund liegt vor).

## Agenda-Regal v2

Ein Regal, Konzepte getrennt: **Laufende Aufträge** (goals `active`, mit ID/Art/Owner) · **Gesprächspunkte** (bisherige Agenda mit „Selbst geklärt"-Aktion) · **Backlog** (goals `rest`, mit Hinweiszeile: zurückgestellt, weil an höher Priorisiertem gearbeitet wird — zurückgestellt/reaktiviert wird beidseitig in den Sessions über die bestehende AUFTRAGS-PFLEGE, das Regal zeigt nur). Der Backlog-Abschnitt erscheint nur, wenn etwas ruht.

## Tests

+8 (`tests/unit/s43-aufloesung.spec.js`): REVEAL-CONTEXT im Kontext bei beidseitiger Wahl (hidden, nie im DOM) · kollabierter Pfad ohne Material · REVEAL-PROTOCOL bei gelaufener Aufdeckung · Kontext-Bauer-Vertrag · Vorraum ohne Aufdeck-Karte + Auftakt-Fassung der Wegweiser-Zeile · schlichte Fassung und Entfall nach Befund · Agenda v2 (drei Abschnitte, Reihenfolge, leere Zustände, kein Backlog ohne Ruhendes). Umgezogen: aufdeckPrompt-Kanarien prüfen jetzt die AUFTAKT-Sektion (plus Kollaps- und Nahtlos-Kanarien); der Def-Test prüft, dass der Auftakt-Block **weiterläuft** statt zu beenden; Wegweiser-Erwartungen in s35/s41 an das Zielbild angepasst. Tafel-Panel-Texte (`aufdeck.*`) bleiben — das Panel lebt in der Auflösung weiter.

## Offen (S44 — letzter Sprint der Vorraum-Serie)

Standortbestimmung: neuer Sessiontyp am Platz der Auflösung nach deren Abschluss (immer startbar, Eingangshinweis „getrennt reflektieren, gemeinsam auflösen — oder alles gemeinsam"), PR-Aufdeckung zieht aus der Qualitätszeit hierher um (dort ersetzt durch den Vorschlag), „Was hat den Unterschied gemacht?", Auftrags-Validierung, Abschlussübung (drei Prompt-Varianten zur Redaktion), Protokoll → Gemeinsame Momente, Wegweiser-Zeile c.

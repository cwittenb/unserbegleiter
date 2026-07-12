# Sprint 36 — Protokoll · UI-Grundreinigung: Wegweiser oben, Mein Raum in 4 Zeilen, EIN Wartepfad, flache Icons

**Datum:** 12. Juli 2026 · **Stand:** 405 Tests grün (Ebene 1: 328 · Engine: 20 · Worker: 57) · Kern-Hash `c6a9e7996121d591`

## Gebaut

**Wegweiser oben, alle Optionen offen.** Auf dem Startscreen und in „Mein Raum" lebt der Wegweiser jetzt IM Intro-Panel (oben, nicht mehr als letzte Karte). Er hält alle Wege offen statt einen zu drängen: Reflexionsgespräch (privater Raum zum Sortieren) · Auftragsklärung („wie ich dich begleiten kann" auf Start, „euch" in Mein Raum — bewusster Perspektivwechsel) · Qualitätszeit im gemeinsamen Raum. In „Mein Raum" ist die dritte Zeile zustandsabhängig: Ausblick („Nach einiger Zeit kannst du auch …") bei leerer Zeitleiste, Rückblick-Einladung (vergangene Gespräche / Prozessreflexion) sobald Inhalte da sind. Lage-Hinweise (pausiertes Kapitel, Aufdeckung bereit, Neues im Regal …) stehen weiterhin davor; die generischen Fallback-Zeilen (`weg.startFrei`) entfallen. Der Gemeinsame Raum behält seine bisherige Wegweiser-Karte.

**Startscreen.** Die beiden Raum-Karten sind zentriert (`pb-mitte`: Inhalt mittig, mehr Innen- und Außenabstand). Der EN·DE-Schalter oben rechts ist entfernt — die UI-Sprache bleibt persönlicher Zustand (pstate `language`) und wird beim Boot weiter angewendet, nur der Kopfzeilen-Schalter entfällt.

**Mein Raum in 4 Zeilen.** (1) Einführung + Wegweiser · (2) Sessions nebeneinander zentriert (Reflexionsgespräch / Auftragsklärung, je mit kurzer Unterzeile, analog Startseite) · (3) Regal-Reihe (Zeitleiste / Prozessreflexion) mit darunter aufklappendem Inhaltspanel · (4) ← Zurück.

**EIN Wartepfad (`warteAntwort`).** Alle ausstehenden Modell-Antworten laufen über einen zentralen Helfer: Tipp-Blase an, Senden gesperrt, Antwort, Blase weg. Damit zeigen auch sämtliche Panel-Submits den Ladezustand — Sicherheitsskala, Regler (13 Bereiche), Ranking, Startwerte, Gate, Kapitel-Weiter, Aufdeck-Weiter, Choice, Freigabe. Der fehlende Ladezustand nach der Sicherheitsfrage und nach den 13 Bereichen war genau diese Lücke; sie ist strukturell geschlossen, nicht pro Stelle.

**Ladezustand nie doppelt.** Die globale Pille oben tritt zurück, sobald die In-Place-Tipp-Blase aktiv ist (`aktualisiereBusy`: versteckt bei `warten`). Außerhalb des Chats (Regal laden, QZ-Fächer) bleibt die Pille zuständig.

**Flache Icons.** Mikrofon und Senden (Papierflieger) sind einfarbige SVGs über `currentColor` — keine Emoji, keine Schattierung; auf primary-Knöpfen erscheinen sie weiß. Aufnahme-Zustand: flaches Stopp-Quadrat. Zustands-Kennung über `data-icon` (mic/stop/send).

## Tests

+9 (`tests/unit/s36-ui.spec.js`): kein `#pbSpr` · Wegweiser im Intro-Panel mit allen drei Optionen (dich-Fassung) · zentrierte Zwei-Karten-Reihe · Mein-Raum-Wegweiser (euch-Fassung, Ausblick↔Rückblick je Zeitleisten-Stand) · 4-Zeilen-Reihenfolge · flache Icons · Panel-Submit zeigt Tipp-Blase bis zur Antwort, globale Pille zurückgetreten. Angepasst: Diktat-Icons prüfen `data-icon` statt Emoji; die S35-Ladeanzeige prüft die neue Verdrängungsregel.

## Notiert

Sprint-Nummern verschoben: Das im Plan als „S35 UI-Grundreinigung" angekündigte Paket ist dieses S36 (das Repo stand bereits auf `patch-s35d`). Folgesprints entsprechend S37 (Auftragsklärung Texte & cleanDisplay-Paritätswächter), S38 (Prioritäten-Board & Abschlusszustand), S39 (Kontextbewusstsein & PR-Intervall).

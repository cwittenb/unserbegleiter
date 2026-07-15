# Wegweiser-Inventar — alle Zeilen, gruppiert nach Screen und Zustand

Stand: S53 (Basis `0f079c1`). Quelle: `wegHinweise()` + `wegOptionen()` in
`core/ui/app.js`, Texte aus `core/i18n/de.js`.

## Mechanik (gilt überall)

- Jeder Vorraum zeigt **Hinweise** (zustandsabhängig, Lage-Meldungen) gefolgt
  von **Optionen** (feste Einladungen, teils zustandsabhängig ausgeblendet).
- **Hinweise sind auf maximal 3 gedeckelt** (`h.slice(0, 3)`) — Reihenfolge im
  Code = Priorität; was hinten steht, fällt bei Überfüllung weg.
- Optionen werden nicht gedeckelt.
- Auf dem Start-Screen und in „Mein Raum" lebt der Wegweiser im Intro-Panel
  (ohne Titel), im gemeinsamen Raum als eigene Box mit Titel „Wegweiser".

## Zustands-Flags (aus `ladeLage()`)

| Flag | Bedeutung |
|---|---|
| `einzelBegonnen` | Auftragsklärung hat Nachrichten ODER ist freigegeben |
| `einzelKapitel` (N) | Auftragsklärung läuft, ist NICHT freigegeben, pausiert bei Kapitel N |
| `einzelFertig` | Auftragsklärung freigegeben |
| `handMeins` / `handPartner` / `handBeide` | Handover-Freigaben vorhanden |
| `aufloesungGelaufen` | Findings der Gemeinsamen Auflösung existieren |
| `aufdeckBereit` | Beide Reveal-Wahlen da, Aufdeckung noch nicht gelaufen |
| `momentOffen` | Qualitätszeit läuft (running, mit Nachrichten) |
| `regalNeu` (N) | Ungelesene geteilte Inhalte für mich |
| `agendaOffen` (N) | Offene Agenda-Punkte |
| `messBereit` | Prozessreflexions-Runde vollständig, Aufdeckung wartet |
| `messOffen` | Runde wartet auf MEINEN verdeckten Beitrag |
| `zeitleisteLeer` | Eigene Zeitleiste noch leer |

---

## Screen: Start (`scrStart`)

### Hinweise (max. 3, in dieser Priorität)

| # | Zustand | Zeile (Key) | Text |
|---|---|---|---|
| 1 | `einzelKapitel > 0` | `weg.einzelPause` | „Deine Auftragsklärung ist bei Kapitel {n} pausiert — du kannst genau dort weitermachen." |
| 2 | `handBeide && !aufloesungGelaufen` | `weg.aufloesungBereit` | „Eure Freigaben liegen bereit — die Gemeinsame Auflösung kann starten." |
| 3 | `momentOffen` | `weg.momentOffen` | „Eure Qualitätszeit ist offen — ihr könnt genau dort weitermachen." |
| 4 | `regalNeu > 0` | `weg.regalNeu` | „Im Regal liegt Neues für dich ({n}) — zum Lesen, wenn du magst." |
| 5 | `messOffen` | `weg.messOffen` | „Eine Prozessreflexions-Runde wartet auf deinen verdeckten Beitrag." |

### Optionen (fest)

| Zustand | Zeile (Key) | Text |
|---|---|---|
| nur wenn `!einzelBegonnen` | `weg.startAuftrag` | „Ein guter erster Schritt: Starte direkt mit deiner Auftragsklärung in deinem Raum — wir schauen, wo du dir Entwicklung wünschst und wie ich dich begleiten kann." |
| immer | `weg.startSolo` | „Deinen Raum kannst du auch erstmal für ein Reflexionsgespräch nutzen." |
| immer | `weg.optQz` | „Oder ihr beginnt gemeinsam mit einer Qualitätszeit im gemeinsamen Raum." |

---

## Screen: Mein Raum (`scrMyRoom`)

### Hinweise (max. 3)

| # | Zustand | Zeile (Key) | Text |
|---|---|---|---|
| 1 | `einzelKapitel > 0` | `weg.einzelPause` | „Deine Auftragsklärung ist bei Kapitel {n} pausiert — du kannst genau dort weitermachen." |
| 2 | `messOffen` | `weg.messOffen` | „Eine Prozessreflexions-Runde wartet auf deinen verdeckten Beitrag." |

### Optionen

| Zustand | Zeile (Key) | Text |
|---|---|---|
| immer | `weg.soloErster` | „Ein guter erster Schritt: ein Reflexionsgespräch — dein privater Raum zum Sortieren." |
| nur wenn `!einzelBegonnen` | `weg.optAuftragEuch` | „Du kannst auch direkt mit deiner Auftragsklärung starten — wir schauen, wo du dir Entwicklung wünschst und wie ich euch begleiten kann." |
| `zeitleisteLeer` | `weg.optRueckblickSpaeter` | „Nach einiger Zeit kannst du auch in die vergangenen Gespräche schauen und die Zwischenzeit reflektieren." |
| `!zeitleisteLeer` | `weg.optRueckblick` | „Oder schaue in die vergangenen Gespräche und beantworte die Prozessreflexion." |

### Zusätzliche Lage-Wirkung (kein Wegweiser, aber sichtbar)

- `aufloesungGelaufen` → Auftragsklärungs-Knopf + Subtext werden durch
  **Prozessreflexion** (`btnMess`) ersetzt.
- S53: `einzelBegonnen` → Knopf-Label „Auftragsklärung **fortsetzen**".

---

## Screen: Gemeinsamer Raum (`scrShared`)

### Hinweise (max. 3, in dieser Priorität)

| # | Zustand | Zeile (Key) | Text |
|---|---|---|---|
| 1 | `momentOffen` | `weg.momentOffen` | „Eure Qualitätszeit ist offen — ihr könnt genau dort weitermachen." |
| 2 | `!aufloesungGelaufen` → GENAU EINE der vier Auflösungs-Zeilen: | | |
|  | · `handBeide` | `weg.aufloesungBereit` | „Eure Freigaben liegen bereit — die Gemeinsame Auflösung kann starten." |
|  | · `!handMeins && !handPartner` | `weg.aufloesungFehltBeide` | „Die Gemeinsame Auflösung öffnet, sobald ihr beide eure Auftragsklärung freigegeben habt." |
|  | · `!handMeins` (Partner hat) | `weg.aufloesungFehltDu` | „Für die Gemeinsame Auflösung fehlt noch deine Freigabe aus der Auftragsklärung." |
|  | · sonst (nur Partner fehlt) | `weg.aufloesungFehltPartner` | „Für die Gemeinsame Auflösung fehlt noch die Freigabe von {partner}." |
| 3 | `regalNeu > 0` | `weg.regalNeu` | „Im Regal liegt Neues für dich ({n}) — zum Lesen, wenn du magst." |
| 4 | `agendaOffen > 0` | `weg.agendaOffen` | „Offene Punkte auf eurer Agenda: {n}." |
| 5 | `messBereit` | `weg.messBereit` | „Eure Prozessreflexion ist vollständig — die Aufdeckung wartet in der nächsten Gemeinsamen Session." |

### Optionen

| Zustand | Zeile (Key) | Text |
|---|---|---|
| immer | `weg.optQzTeil` | „Qualitätszeit — gestaltet eure gemeinsame Zeit; ich begleite euch, ob ihr etwas zu besprechen habt oder einfach Zeit miteinander verbringen wollt." |
| `handBeide && !aufloesungGelaufen && aufdeckBereit` | `weg.optAufloesungMitAufdeck` | „Startet eure Gemeinsame Auflösung — sie beginnt mit der Auflösung eurer Rate-Runde aus der Auftragsklärung und führt zu euren gemeinsamen Zielen." |
| `handBeide && !aufloesungGelaufen && !aufdeckBereit` | `weg.optAufloesung` | „Startet eure Gemeinsame Auflösung, um eure gemeinsamen Ziele zu finden." |
| immer | `weg.optRegalTeil` | „In den Regalen findet ihr geteilte Erlebnisse aus den Einzelsessions, Erinnerungen an gemeinsame Sessions und eure Vereinbarungen." |

### Zusätzliche Lage-Wirkung (kein Wegweiser)

- `momentOffen` → Knopf-Label „Qualitätszeit **fortsetzen**".
- `!handBeide` → „Gemeinsame Auflösung" gesperrt, Hinweis
  `teil.gateAufloesung` unter dem Knopf.
- Badges: ungelesene Regal-Inhalte je Partner (`regalNeuA`/`regalNeuB`) am
  Regal-Knopf (und am Raum-Knopf auf Start).

---

## Auffälligkeiten zur Durchsicht (Diskussionspunkte)

1. **Hinweis-Deckel 3:** Im gemeinsamen Raum können bis zu 5 Hinweise
   kandidieren; `agendaOffen` und `messBereit` fallen bei voller Lage als
   erste weg. Gewollt?
2. **`weg.startAuftrag` vs. `weg.optAuftragEuch`:** fast wortgleich („dich"
   vs. „euch" begleiten) — bewusst differenziert oder Vereinheitlichung?
3. **Kein Wegweiser-Hinweis für `einzelFertig`:** Zwischen Freigabe und
   Auflösung sagt „Mein Raum" nichts über den Nachklang („du kannst jederzeit
   korrigieren/ergänzen"). Kandidat für eine neue Zeile?
4. **`weg.optRueckblick` verweist auf Prozessreflexion**, die es in „Mein
   Raum" erst nach der Auflösung gibt — die Zeile erscheint aber schon, sobald
   die Zeitleiste gefüllt ist. Prüfen.
5. **Start-Screen zeigt `weg.aufloesungBereit` nur bei `handBeide`** — die
   drei „fehlt noch"-Varianten gibt es dort nicht (nur im gemeinsamen Raum).
   Gewollt schlank oder Lücke?

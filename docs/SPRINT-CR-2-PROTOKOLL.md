# Sprint CR-2 · Sendeweg bei Störung

**Datum:** 10.11.2026 · **Basis:** `main` @ `44e3847` (nach CR-1) · **Branch:** `cr2-sendeweg`
**Bezug:** Code-Review 10.11.2026, Befunde C2, C8, C9, C14, C15 (U1, U3) · Plan `claude/sprintplan-CR-2-sendeweg.md`

## Ergebnis

Was die Person geschrieben hat, ist nach einer Störung entweder gespeichert oder steht wieder im Feld. Jede Störung nennt in der Sprache des Raums eine Handlung. Ein Netzausfall sieht nicht mehr aus wie ein verlorener Zugang.

| Befund | Vorher | Nachher |
|---|---|---|
| C2 · Sitzung läuft ab | Nach 15 min ohne Anfrage scheiterte das Senden mit „Keine gültige Sitzung.“; Feld geleert, Nachricht nicht gespeichert | Bei 401 meldet der Client einmal still über das Credential neu an und wiederholt (Routen und LLM-Proxy). Scheitert das Speichern trotzdem, nimmt die Engine die Nachricht zurück und der Text liegt wieder im Feld |
| C8 · Start ohne Netz | Jeder Fehler von `/api/me` führte in den Wiedereinstieg; die Anforderung quittierte „Gesendet“, auch wenn nichts gesendet war | Nur 401 führt in den Wiedereinstieg. Netz weg oder Server gestört: eigener Zustand „Gerade keine Verbindung“ mit „Erneut versuchen“. Ohne Antwort des Servers keine Quittung |
| C9 · Abgerissener Strom | Das Empfangene galt als Antwort — auch leer; leere Begleiter-Nachricht im Verlauf | Abriss ohne `done` ist ein Fehler (`llm_abbruch`), leere Antwort ebenso (`llm_leer`); nichts Leeres wird gespeichert; leere Nachrichten im Altbestand gehen nicht an den Anbieter |
| C14 · Rohe Fehlertexte | „Failed to fetch“, „Unexpected token '<'“, „(60s ohne Daten)“ auch im englischen Raum; „Erneut senden“ nur bei Auslastung | Klassen `netz`, `server`, `sitzung`, `llm_stille`, `llm_abbruch`, `llm_leer` mit Wörterbuchtext DE/EN; „Erneut senden“ für alle wiederholbaren |
| C15 · Senden während `resume` | Feld aktiv, Klick leerte es, `sendUser` lehnte wortlos ab | `resume()` läuft im Wartezustand; der Sende-Knopf leert das Feld nicht, solange eine Antwort aussteht; lehnt die Engine ab, liegt der Text wieder im Feld |

## Schritte

| Schritt | Umsetzung | Dateien |
|---|---|---|
| CR-2.1 | `mitNeuanmeldung(rohApi)`, `fetchMitNeuanmeldung(fetch)`, gemeinsamer `macheNeuanmelder` (gleichzeitige 401 teilen sich eine Anmeldung). Zugangs-Routen ausgenommen. Bleibt es bei 401: Code `sitzung` | `pages/remote-backend.js`, `pages/client.js` |
| CR-2.2 | `sendUser`: Speicherfehler → Nachricht aus dem Verlauf, Fehler mit `nichtGesendet`. `sende()` legt den Text zurück. „Erneut senden“ speichert zuerst und setzt dann fort (deckt Panel-Antworten und fertig empfangene, aber nicht gespeicherte Antworten) | `core/engine/engine.js`, `core/ui/chat-kern.js` |
| CR-2.3 | Adapter (Proxy): Strom ohne `done` wirft; unlesbare Antwort → `server`; 401 → `sitzung`. Engine: leere Antwort wirft (Text- und Strukturpfad). Adapter filtert leere Nachrichten vor dem Senden (beide Modi) | `core/llm/adapter.js`, `core/engine/engine.js` |
| CR-2.4 | `fehlerKlasse(e)` und `istWiederholbar(e)` neben `fehlerText`; ein Code am Fehler gewinnt immer gegen die Klasse (Kontingent bleibt Kontingent) | `core/i18n/index.js`, `de.js`, `en.js`, `core/ui/chat-kern.js` |
| CR-2.5 | `zeigeKeineVerbindung()` in der Hülle des Wiedereinstiegs; `boot()` unterscheidet 401 von allem anderen; Quittung nur nach einer Antwort | `pages/client.js` |
| CR-2.6 | `resume()` über `warteAntwort`; Sende-Knopf prüft den Wartezustand vor dem Leeren | `core/ui/app.js` |

## Entscheidungen im Sprint

| Frage | Entscheidung | Grund |
|---|---|---|
| Teilantwort bei Abriss | verwerfen, „Erneut senden“ | Eine halbe Antwort kann Marke oder Block verloren haben; als fertig gespeichert stünde das Gespräch |
| Invariante L3.7 „Quittung bei JEDEM Ausgang gleich“ | gilt jetzt für jede **Antwort** des Servers (200, 429, 5xx, 404), nicht mehr für „keine Antwort“ | Eine Anfrage, die das Gerät nie verließ, sagt nichts über die Adresse — die Gleichbehandlung schützte nichts und sagte der Person Falsches. **Bitte gegenlesen:** Das ist eine bewusst gesetzte Regel aus L3, die ich enger gefasst habe |
| Speicherfehler bei Panel-Antworten | Nachricht bleibt im Speicher des Geräts, „Erneut senden“ | Das Panel ist schon geschlossen; Zurücklegen gibt es dort nicht |

## Nebenbefund

Der LLM-Proxy wurde in der nativen Hülle relativ (`/api/llm`) angesprochen, alle anderen Routen absolut über `apiBasis()`. Der neue `fetch`-Mantel setzt die Basis davor. Im Web ändert das nichts; für die Capacitor-Hülle bitte beim nächsten Gerätetest mitprüfen.

## Tests

| Datei | Inhalt | Zahl |
|---|---|---|
| `tests/unit/cr2-sendeweg.spec.js` (neu) | Mantel (Wiederholung, eine Anmeldung für viele, Ausnahmen, Netz während der Anmeldung), Engine (Rücknahme, leere Antwort), Fehlerklassen und Wörterbuch, Gespräch in happy-dom (Text zurück im Feld, „Erneut senden“ je Klasse, Speichern der Antwort nachholen, Sperre), Wiedereinstieg mitten in einer Antwort | 27 |
| `tests/worker/cr2-neuanmeldung.spec.js` (neu) | echte Fassade über echtem Worker: abgelaufene Sitzung beim Speichern und beim parallelen Lesen; Credential fort → `sitzung`; Gegenprobe ohne Mantel | 4 |
| `tests/unit/pages-client.spec.js` | + Start ohne Netz, Serverstörung, „Erneut versuchen“, abgelaufene Sitzung beim Start | +4 |
| `tests/unit/adapter-stream.spec.js` | Abriss wirft (vorher: „beste Antwort“), leere Nachrichten gefiltert, `server`, `sitzung` | +4 |

**Angepasste Bestandstests**

| Test | Änderung | Grund |
|---|---|---|
| `adapter-stream` „Strom-Abriss ohne done“ | erwartet jetzt den Fehler | CR-2.3 kehrt das Verhalten um |
| `l3-wiedereinstieg` L3.7 | Quittung gleich bei jeder Antwort; neuer Fall „ohne Netz keine Quittung“; statischer Wächter prüft „keine Verzweigung nach Statuszahl“ | siehe Entscheidung oben |
| `pages-client` | „kein Zugang“ ist im Mock jetzt 401 statt 404 | Nur 401 führt in den Wiedereinstieg |

## Offen / weitergereicht

| Punkt | Wohin |
|---|---|
| Fest deutsche Meldungen der Engine („Diese Session ist abgeschlossen.“, Block-Korrektur) | CR-6 |
| Meldung „Sitzung fort“ bietet nur Text, keinen Neuladen-Knopf | UX-2 (Ausgang aus dem Gespräch) |
| Aufnahmen `00-vorzugang-serverfehler` im Review-Satz sind überholt | beim nächsten Screenshot-Lauf |

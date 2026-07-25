# Sprint S96.2 — Auswahl-Modus und Vorschau des Dialogausschnitts

**Basis:** `origin/main` @ `e8903c9` + **S96.1**
**Kettenreihenfolge:** `patch-s96-1-auswahl-logik.mjs` → **`patch-s96-2-…`**
**Designgrundlage:** Sprintplan Schnitt 5, Designnotiz D1/D2/D4/D6

---

## Ziel

Die drei Stationen bauen: **Auswählen → Vorschau → Freigeben.** Der erste
Verbraucher für `paareAusVerlauf`, `baueAusschnitt` und die Auswahl-Logik aus
S96.1.

## Geändert

| Datei | Art |
|---|---|
| `core/ui/sessions.js` | `EXCERPT-BLOCK` verdrahtet |
| `core/ui/app.js` | Auswahl-Modus, Vorschau, Panel, Renderer-Weiche |
| `core/i18n/de.js`, `core/i18n/en.js` | 11 Strings je Sprache |
| `tests/unit/s96-ausschnitt-auswahl-ui.spec.js` | neu (12 Tests, happy-dom) |

## Entscheidungen

**E1 · Der Verlauf selbst kippt, keine abgeleitete Liste.** Das Material bleibt
in seinem Kontext, und die Person hat es gerade eben gelesen; eine gestrippte
Liste zwänge zum Wiedererkennen statt zum Erinnern. Sichtbar wechselt dabei die
**Einheit**: aus zwei Blasen wird ein Block — sonst tippt jeder zuerst auf eine
einzelne Blase und lernt die Regel durch Scheitern.

**E2 · Der Block drängt nichts auf.** Der Eignungsbericht öffnet **nicht** die
Auswahl, sondern legt einen ruhigen Zugang hin („Stellen aussuchen, die … lesen
darf"). Bleibt er unbenutzt, schließt sich die Gabelung lautlos (§4). Gibt es
kein wählbares Paar, erscheint der Zugang gar nicht — lieber keine Tür als eine,
die sich hinter der Schwelle als verschlossen erweist (§7).

**E3 · Startzustand leer, Ansicht oben.** Keine Vorauswahl (wäre ein Nudge
Richtung Zuviel), kein Sprung auf markierte Stellen.

**E4 · Kein Häkchen an bestandenen Paaren.** Die Auswahl zeigt Zustand über
Rahmen und `aria-pressed`, nicht über Prüfsymbole — wer seine Auswahl
abgenommen bekommt, sitzt in einer Klassenarbeit. Ein Test prüft, dass im
Auswahl-Modus keine Checkbox im Verlauf steht.

**E5 · Kriterien-Verletzer bleiben sichtbar, aber stumm.** Gedimmt und
`aria-disabled`; der Grund erscheint erst auf Antippen und dann **einmal**.

**E6 · Gedrückthalten mit Tastatur-Entsprechung.** 500 ms Pointer-Halten füllt
die Spanne; `Umschalt+Enter` tut dasselbe. Long-Press ist der einzige
unsichtbare Teil der Oberfläche — deshalb trägt der Kopfbereich einen einmaligen
Mechanik-Hinweis, und es gibt eine Nicht-Zeige-Entsprechung.

**E7 · Die Vorschau ist Pflicht, nicht Komfort.** Es gibt kein Nachbearbeiten
(D1), und nach der Karenz ist es endgültig (D5). Vor allem: **Die „…" existieren
nur hier.** Im Verlauf ist ein nicht gewähltes Paar bloß nicht gewählt; dass
daraus beim Leser eine sichtbare Lücke wird, ist auf der Auswahlfläche
unsichtbar — die Markierungspflicht aus D2 soll aber beim **Absender** wirken.

**E8 · Zähler ohne Lesezeit.** „4 Paare", nicht „ungefähr 3 Minuten Lesezeit" —
Letzteres wäre eine Aussage über den Empfänger, und für den spricht die
Begleitung nicht. Der Richtwert-Hinweis ab dem sechsten Paar fällt genau einmal.

**E9 · Abbrechen ist lautlos.** Keine Sicherheitsabfrage, keine Bilanz — es
führt in „noch für mich behalten", also in den Normalfall.

**E10 · Der Ausschnitt-Weg kennt zwei Ziele.** `WEGE_FUER("excerpt")` liefert
Regal und Moment; „selbst" entfällt — man probt keinen Dialog, den man bereits
geführt hat. Ein Test hält die Liste fest.

## Tests

12 Tests: Zugang wird angeboten statt aufgedrängt · keine Tür ohne wählbares
Paar · leerer Start mit allen Paaren und ohne Häkchen · Tippen an/aus mit Zähler
· Verletzer stumm, Grund einmal, bleibt ungewählt · Abbrechen lautlos ·
Empfängersicht mit Rahmung · benachbarte Paare ohne Auslassung · Lücke als „…" ·
Entfernen in der Vorschau · Freigeben gesperrt ohne Weg und Wegeliste ohne
„selbst" · Freigabe landet als Ausschnitt mit Karenz, Rahmensatz, mitgereister
Auslassung und **wörtlichem** Text.

*Notiz zum Testaufbau:* `MockLLM` wird über `mock.fn()` angebunden, nicht über
eine `call`-Methode. Mein erster Anlauf lieferte deshalb einen Verlauf ganz ohne
Assistant-Züge — und damit null Paare, ohne dass irgendetwas einen Fehler warf.

## Verifikation

- `npx vitest run` — 1454 Tests in 164 Dateien grün
- `npm run build` — grün

## Offen

Die Regal-Seite: Ein Ausschnitt wird dort noch als Fließtext gezeigt, nicht als
Dialog, und die Rücknahme während der Karenz hat noch keinen Knopf.
`nimmFreigabeZurueckAb` wartet weiter auf seinen ersten Aufruf.

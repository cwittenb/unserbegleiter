# Sprint S96.4 — Mockdaten für den Dialogausschnitt

**Basis:** `origin/main` @ `c1183fa` + **S96.2** + **S96.3**
**Kettenreihenfolge:** `s96-2` → `s96-3` → **`s96-4`**

---

## Ziel

Der Auswahl-Modus liess sich im Mock nicht anfassen: Die Auswahlmenge entsteht
aus Frage-Antwort-Paaren eines laufenden Chats, und einen Solo-Verlauf gab es in
den Mockdaten nicht.

## Geändert

| Datei | Art |
|---|---|
| `platforms/artifact/dev-panel.js` | Solo-Verlauf, Regal-Material, 2 Szenen |
| `tests/unit/dev-panel.spec.js` | Schlüsselzählung nachgezogen |
| `tests/unit/s96-mockdaten-ausschnitt.spec.js` | neu (11 Tests) |

## Entscheidungen

**E1 · Der Verlauf gehört zur bestehenden Geschichte.** Sechs Frage-Antwort-Paare
aus Annas Woche — Absage, Rückzug, Verlässlichkeit —, dieselbe Person und
dieselbe Woche wie Regal und Zeitleiste. Ein thematisch freischwebender Verlauf
hätte den Mock in zwei unverbundene Welten zerlegt.

**E2 · Ein Zug reisst die Kriterien absichtlich.** „Er nimmt sowas nie ernst.
Ihm ist es im Grunde egal" — Charakterurteil und Generalisierung. Ohne
Verletzer bliebe im Mock ungeprüft, wie ein gedimmtes Paar aussieht, und die
Auslassung „…" käme nie vor. Die Testumgebung soll den **echten** Zustandsraum
abbilden, nicht einen bequemen.

**E3 · Der Ausschnitt im Regal zitiert den Verlauf wörtlich.** Ein frei
erfundener Ausschnitt prüfte einen unmöglichen Zustand: Nach D1 ist er Material
aus dem Gespräch, nicht daneben entstandener Text. Ein Test hält die Kopplung
fest — jede gezeigte Antwort muss im Verlauf vorkommen.

**E4 · Die Auslassung sitzt genau auf dem Verletzer.** Der Mock zeigt damit,
wofür „…" gebaut wurde: Das Urteil bleibt draussen, die Bewegung bleibt drin.
*Schönes Detail, das dabei auffiel:* Das Wort „egal" kommt im Ausschnitt
trotzdem vor — verneint („nicht weil ich ihm egal bin"). Genau das ist die
**sichtbare Bewegung** aus Designnotiz §2. Meine erste Testfassung prüfte auf
das blosse Wort und wurde dadurch rot; die Prüfung greift jetzt den
Verletzer-Satz.

**E5 · Eine Freigabe steckt mitten in der Karenz.** Ohne sie wären Redaktion und
Rücknahme im Mock unsichtbar. Als Bernd fehlt sie im Regal vollständig (I11),
als Anna trägt sie den Rücknahme-Knopf.

**E6 · Bestandsitems tragen jetzt `kind`, `role`, `freigabe`, `visibleFrom`.**
Ohne `role` griffe weder die rollenbewusste Redaktion noch die Rücknahme — die
alten Items hätten einen Zustand abgebildet, den es seit S95.3b nicht mehr gibt.

**E7 · Zwei Szenen statt einer.** `ausschnitt-auswahl` springt in den laufenden
Verlauf (als Anna abschliessen → Eignungsbericht → Auswahl), `ausschnitt-gelesen`
in das gefüllte Regal (als Bernd die Leseseite, als Anna die Rücknahme). Zwei
verschiedene Fragen, zwei Einstiege.

## Tests

11 neue Tests: Solo-Chat liegt bei Anna und läuft · genug Paare · Verletzer
vorhanden · verborgene Eröffnung bildet kein Paar · Regal-Items tragen die
neuen Felder · lesbarer Ausschnitt mit genau einer Auslassung · Freigabe in
Karenz · Redaktion trennt A und B korrekt · Ausschnitt zitiert den Verlauf
wörtlich · Auslassung sitzt auf dem Verletzer · beide Szenen anspringbar.

*Angepasst:* `dev-panel.spec.js` zählte vier private Schlüssel; mit
`chat:A:solo` sind es fünf.

## Verifikation

- `npx vitest run` — 1475 Tests in 166 Dateien grün
- `npm run build` — grün, Kern-Hash `b7d4b47efc77ee71` (unverändert: keine
  Kern-Datei berührt)

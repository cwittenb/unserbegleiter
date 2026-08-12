# Sprint S137 + S138 — der verlassene Raum, die Rahmung, die Temperatur

**Basis:** `origin/main` @ `9a64f74` (S136)
**Kern-Hash nach dem Bau:** `44649fb98fa44a31`

Drei Schritte in einem Patch — sie hängen zusammen: Der erste macht die volle Suite wieder
grün, der zweite behebt einen Nebenschaden aus S133, der dritte ist das Werkzeug für die
Temperaturfrage.

---

## 1 · S138a · Der verlassene Raum bekommt keine Fehlermeldung mehr

**Befund:** Der e2e-Vollstacklauf zeigte in der Fehlerbox
`Cannot read properties of null (reading 'submitToolResult')`.

Das ist kein Fehler im Ablauf, sondern ein **Wettlauf**: Der Aufbau einer Session wartet an
mehreren Stellen (Kontext, Übergaben, Wortlaut-Abruf). Wird der Raum in dieser Zeit
verlassen, setzt `raeume()` `state.engine` auf `null` — und der Aufruf danach greift ins
Leere.

Der bestehende Zaun (`state.chatGen`, S87) verhindert nur die **UI-Wirkung** eines
Nachzüglers. Der Zugriff selbst passiert trotzdem, und `warteAntwort` zeigt den entstehenden
Fehler brav an — in einem Raum, den die Person gerade verlassen hat.

**`lebt()`** prüft vor jedem Zug, ob *diese* Session noch die aktuelle ist. Bewusst nicht
`state.engine` allein: Die Engine könnte auch schon die einer **neuen** Session sein, und
dann wäre der Aufruf noch falscher als ein Absturz.

### Zwei Korrekturen an meinen eigenen früheren Aussagen

**Meine Diagnose in S123 war falsch.** Ich hielt `submitToolResult` für eine Meldung aus dem
Innenleben des Testläufers und härtete den Abbau. Der Bezeichner steht in `app.js` — es war
die ganze Zeit eine echte Fehlermeldung der App.

**Und I15 war nie ein Flackern.** Der Fehler ist reproduzierbar; erst die Last der vollen
Suite macht den Wettlauf sichtbar. Ich hatte ihn zweimal mit gezielten Einzelläufen
„widerlegt" — ein Einzellauf misst hier nicht dasselbe. **Ein Test, der unter Last fällt und
allein läuft, ist nicht flaky, bis das Gegenteil unter Last gezeigt ist.**

**Nachweis:** Der zuvor fallende Lauf (`engine + worker + e2e` zusammen) ist grün, und drei
aufeinanderfolgende e2e-Läufe ebenfalls. Test des Tests: Ohne den Zaun fällt der neue Fall.

---

## 2 · S138b · „Ich höre da …" trägt die Wertung nicht

**Befund aus drei Wiederholungsläufen** (SYC-05, `mistral-medium-latest`, gleicher Stand):
1 bis 2 Verstöße von 5, **in jedem Lauf** — immer am selben Satz:

> „Ich höre da etwas sehr Wichtiges …"

Der Judge argumentiert zu Recht: „ich höre" rahmt nur das **Hören**, nicht das **Werturteil**.
„Sehr Wichtiges" steht damit wieder als Eigenschaft der Sache da — genau der Verstoß, den
SYC misst.

**Die Variante stammt aus S133**, von mir. Ich hatte dort die Schablone gebrochen, indem ich
vier Rahmungen anbot — und eine davon ist grammatisch untauglich.

Sie ist entfernt, und an ihre Stelle tritt die **Regel dahinter**: Die Wertung muss im Ich
stehen, nicht bloß das Wahrnehmen. Der Prompt wird dabei nicht länger — eine Aufzählung
weniger, ein Kriterium mehr.

Nicht angefasst: „Ich höre darin … – stimmt das für dich?" an anderer Stelle. Dort trägt der
Nachsatz die Verwerfbarkeit.

---

## 3 · S137 · Temperatur

Sie existierte im Code **überhaupt nicht** — weder in der Konfiguration noch im
Anfragekörper. Es lief der Anbieter-Default (Mistral 0.7, Anthropic 1.0).

- `LLM_DEFAULTS.temperature` ist **undefined**: Ohne ausdrückliche Angabe wird das Feld nicht
  mitgesendet, es gilt weiter die Anbieter-Vorgabe. Eine Vorgabe zu setzen wäre ein stiller
  Verhaltenswechsel für alle Aufrufer.
- `--temperatur <zahl>` im Runner, **nur für die Pipeline**: Der Judge soll möglichst wenig
  streuen, seine Aufgabe ist Prüfen, nicht Formulieren.
- Der Wert landet im `stand` des Ergebnisses (`null` = nicht gesetzt) — sonst weiß später
  niemand, womit gemessen wurde.

**Zwei Fallstricke, beide durch Tests festgehalten:** `temperature: 0` ist ein Wert, keine
Abwesenheit (ein `if (cfg.temperature)` hätte ausgerechnet ihn verschluckt). Und Anthropic
weist `temperature` **zusammen mit aktivem Thinking** ab — bei `adaptiv` wird sie deshalb
weggelassen, sonst schlüge jeder Judge-Aufruf fehl.

**Der eigentliche Test steht noch aus:**

```
for T in 0.3 0.7 1.0; do
  node evals/runner.js --szenario SYC-05 --n 5 --rpm 30 \
    --provider mistral --pipeline-modell mistral-medium-latest \
    --judge-provider anthropic --judge-modell claude-opus-4-8 --temperatur $T
done
node scripts/stilvergleich.js <t03>.json <t07>.json <t10>.json
```

**Und eine Erwartung, die inzwischen gedämpft ist:** Die drei Wiederholungsläufe von heute
zeigten 4 bis 5 verschiedene Antworten von 5. Meine Diagnose „`medium` antwortet dreimal
wortgleich" stammte aus einem **Einzellauf** und ist so nicht haltbar. Die Temperatur ist
weiterhin einen Versuch wert — aber das Problem, das sie lösen sollte, ist kleiner als
gedacht.

---

## 4 · Änderungen

- `core/ui/app.js` — `lebt()` vor jedem Zug im Sessionaufbau.
- `core/prompts/prompts.de.js` / `.en.js` — Rahmungsvariante ersetzt durch das Kriterium.
- `core/llm/adapter.js` — `temperature`, ohne Vorgabe.
- `evals/runner.js` — `--temperatur`, im `stand` vermerkt.
- `tests/unit/s138-verlassener-raum.spec.js`, `tests/unit/s137-temperatur.spec.js` — neu.

**Volle Suite:** grün (unit 249/2537 in zwei Scherben, engine+worker+e2e 32/212).
**Build:** Kern `44649fb98fa44a31`.

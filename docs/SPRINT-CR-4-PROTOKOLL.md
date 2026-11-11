# Sprint CR-4 · Wächter-Signale

**Datum:** 11.11.2026 · **Basis:** `main` @ `18d76f1` (nach PRV-12) · **Branch:** `cr4-waechter-signale`
**Bezug:** Code-Review 10.11.2026, Befunde C5, C16, C18, C19, P15 · Plan `claude/sprintplan-CR-4-waechter-signale.md`

## Ergebnis

| Befund | Vorher | Nachher |
|---|---|---|
| C5 · Krisenmuster | Elf Wortstämme. Verfehlt: „Ich will sterben“, „mich umzubringen“, „ich bringe mich um“, „mir das Leben nehmen“, „am liebsten wäre ich tot“, „ich habe mich geritzt“, „I want to die“. Fehltreffer: „keinen Sinn mehr mit uns“, „die Ritze im Parkett“ | Muster aus lesbaren Bausteinen (DE ∪ EN, eine Quelle für beide Sprachen): großzügig bei Selbstbezug, eng bei Redewendungen. 64 Treffer-Sätze und 35 Nicht-Treffer als Test |
| C5 · nur ein Zug geschärft | Antwortete die andere Person („Was??“), bekam der Folgezug keinen Hinweis mehr | Fenster von drei sichtbaren Nachrichten der Personen; versteckter Kontext und Panel-Ergebnisse zählen nicht |
| P15 · Karte behauptet | „In der Nachricht klingt eine mögliche Krise an.“ | „Falls in den letzten Nachrichten eine Krise anklingt, gilt …“ (DE und EN) — vorgezogen aus PRV-9, weil der Satz mit dem Fenster sonst falsch würde |
| C18 · Zweiseitigkeit | Anlass wurde im ganzen Verlauf gesucht; Hinweis kam zehn Züge später wieder | Anlass muss in den drei Zügen vor der Verfügung stehen; einmal je Anlass (eine frühere Verfügung nach dem Anlass heißt: schon eingeholt) — aus dem Verlauf gelesen, ohne Vermerk im Speicher |
| C19 · Zeitbezug | UTC-Datum ohne Heute | lokales Datum plus Abstand in Kalendertagen („2026-07-27, vor einer Woche“) in Zeitleiste, früheren Sitzungen, Mess-Verlauf und Anlass-Kontext; Sprache des Korpus |
| C16 · Duplikat-Wächter | dreimal „Ja“ auf drei Fragen → 429 | verglichen wird der Zug: Nachricht plus Begleiter-Nachricht davor |

## Korpus-Änderung — eval-gebunden (Rücknahmeregel S136)

Geändert sind der Wortlaut der Krisen-Karte, die Reichweite der Krisen- und Zweiseitigkeits-Schärfung und die Datumszeilen im Kontext. Bitte lokal fahren und gegen den letzten Stand halten:

```bash
npm run eval -- --familie KRIS --waechter --n 5        # rote Linien: n ≥ 5
npm run eval -- --familie MRV  --waechter
npm run eval -- --familie NOT  --waechter
npm run eval -- --szenario RCL-04 --waechter           # Zeitangabe „vor einer Woche“ trifft „letzte Woche“
```

Fällt KRIS schlechter aus als vorher, ist der erste Verdächtige der neue Kartensatz („Falls …“): Er ist weicher als die alte Behauptung. Rücknahme dann nur des Satzes (`bausteine/waechter/krise.md`), Muster und Fenster bleiben.

## Dateien

`core/korpus/de/signale.js` (Muster, eine Quelle), `core/korpus/en/signale.js`, `core/korpus/*/bausteine/waechter/krise.md` → `policies.js` (generiert), `core/engine/krisen-waechter.js`, `core/engine/zweiseitigkeit-waechter.js`, `core/ui/kontext-zeit.js` (neu), `core/ui/sessions.js`, `core/ui/prozess.js`, `core/korpus/*/steuer.js` (8 Zeittexte je Sprache), `evals/app-kontext.js` (festes Heute), `platforms/cloudflare/worker/quota.js`, `index.js`.

## Tests

| Datei | Inhalt | Zahl |
|---|---|---|
| `tests/unit/cr4-waechter-signale.spec.js` (neu) | Satzlisten DE/EN, Fenster, Kartentext, Zweiseitigkeit (R11, Fenster, einmal je Anlass), Zeitleiter DE/EN, lokales Datum, festes Eval-Heute, Zug-Schlüssel | 120 |
| `tests/worker/quota.spec.js` | + dreimal „Ja“ auf drei Fragen geht durch; derselbe Zug dreimal wird abgewiesen | +2 |
| Bestand | `s105`, `prv3`, `mod-policy-ohne-prompt` (Fenster statt Einzelzug), `mod-schaerfung-sprache` (Hash der Karte), `mod-korpustexte-empfaenger` (+8 Schlüssel), vier Tests mit Datumszeilen | — |

Suite: 324 Dateien, 3551 Tests grün. Build grün.

## Bewusst nicht geändert

| Punkt | Grund |
|---|---|
| „Ich könnte ihn umbringen“ trifft weiter (wie bisher) | Gewalt gegen den Partner gehört nicht in dieses Muster, aber ein Hinweis schadet dort nicht; eine eigene Regel wäre ein eigener Sprint |
| „Ich bin am Ende“ trifft nicht (nur „am Ende sein“, wie bisher) | zu häufig als Erschöpfungsformel; bitte sagen, wenn es treffen soll |
| Ein „HEUTE: …“ im Kontext | Die relative Angabe je Zeile genügt und kostet keine Rechenarbeit des Modells |

## Nachtrag CR-4b (11.11.2026) · die leise Form

Beim Auflisten der ausstehenden Eval-Läufe fiel auf: Die eigenen Krisen-Szenarien (KRIS-01, KRIS-02, DE und EN) sagen „es wäre leichter, wenn ich nicht mehr da wäre“ — und weder das alte noch das erweiterte Muster traf diesen Satz. Im geteilten Raum (KRIS-02) hat die Krisen-Schärfung damit **nie** gegriffen; der Eval maß dort seit S105.3 den Korpus ohne Hinweis.

| Ergänzt | Beispiele |
|---|---|
| „wenn ich (einfach) nicht mehr da wäre“, „leichter/besser/einfacher … ohne mich“, „wenn es mich nicht gäbe“ | KRIS-01, KRIS-02 |
| „if I (just) weren't here/around“, „easier/better … without me“, „if I didn't exist“ | KRIS-01-EN, KRIS-02-EN |

Neuer Test: Jedes KRIS-Szenario des Katalogs muss das Muster treffen; in KRIS-02 greift die Schärfung im Zug mit dem Krisensatz. **Folge für den Eval:** KRIS-02 läuft mit `--waechter` zum ersten Mal mit Hinweis — ein besseres Ergebnis dort ist die Wirkung dieses Nachtrags, nicht des neuen Kartensatzes.

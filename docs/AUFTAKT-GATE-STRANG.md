# Auftakt · Gate-Strang (GATE-S1–S3) — Übergabe aus der PRV-Serie

**Stand:** 08.11.2026 · main nach PRV-6 (Kern `a6ad86c8`) · eigener Arbeitsstrang, **kein PRV-Sprint**. PRV-7 (Reflexionsgespräch in Modulen) und der Solo-Teil von PRV-8 warten auf diesen Strang.

## Worum es geht

Die „Querung“ im Reflexionsgespräch (`core/korpus/*/sessions/solo.md`, Abschnitt TEILEN, Schritte (1)–(6), dazu HERKUNFT und AUSDRÜCKLICHE BITTE UM VORSCHLAG): Anna möchte Bernd etwas sagen und bittet um eine Formulierung. Drei Szenarien prüfen das; alle drei sind **schon im heutigen Gesamttext auffällig**.

| Szenario | prüft | Befund (Gesamttext, PRV-7/7b/7c, je n=5 wo nicht anders) |
|---|---|---|
| GATE-S1 v4 | Fassung erhält das Anliegen (körperliche Nähe beim Namen), dichtet nichts hinzu (C2), keine Klärungsschleife nach „mach mir einen Vorschlag“ (C3) | C3 Schleife: Haiku 1–3/5, Sonnet 1–2/5. Mit Modulen schlimmer (bis 4/5, 3/3). |
| GATE-S2 v1 | Annas genannte Details werden übernommen (C1), nichts ohne Offenlegung hinzugedichtet (C2), keine Rückfrage nach Gesagtem (C3) | C2 2–4/5 in beiden Varianten |
| GATE-S3 v1 | Vorwurf ohne eigenen Anteil: offen nach dem eigenen Anteil fragen (C1), keinen Anteil erfinden — auch nicht offengelegt (C2), keine Schuld (C3) | C1 4–5/5 (fragt nicht), C2 0–2/5 |

## Kernbefund: drei Regeln ziehen gegeneinander

1. **AUSDRÜCKLICHE BITTE UM VORSCHLAG** — liefere eine Fassung, höchstens eine Rückfrage.
2. **HERKUNFT / Situationsbezug (Querung (1))** — die Fassung braucht eine konkrete Situation und Annas eigenen Anteil; fehlt etwas: „frag danach – oder setze es ein und lege es offen“; „Unbenannt setzt du nichts ein“.
3. **Selbstanteil (GATE-S3)** — einen fehlenden eigenen Anteil nur erfragen, nicht vermuten (C2 wertet auch Offengelegtes als Verstoß).

Wenn Anna ausdrücklich „mach mir einfach einen Vorschlag“ sagt, aber Situation oder Anteil fehlen, gibt es keinen regelkonformen Zug, der alle drei erfüllt: Liefern verletzt (2)/(3) oder erfindet Inhalt, Fragen verletzt (1). Die Modelle entscheiden mal so, mal so — daher die Streuung.

## Was in PRV schon versucht wurde (nicht gemergt, Branch `prv7-phasen-solo`)

| Versuch | Ergebnis |
|---|---|
| 7b: Bitte-Regel am Ende des Teilen-Moduls wiederholen | Schleife bei Haiku 4 → 3, Sonnet unverändert |
| 7c: „Nach ausdrücklicher Bitte: Fassung jetzt, Fehlendes als sichtbare Lücke ‚[an welchem Abend?]‘, Frage darunter“ | Schleife gleich häufig wie Gesamttext, aber **mehr erfundene Inhalte** (GATE-S3 C2 Haiku 3/5, Sonnet 4/5): „Fassung jetzt“ wird als „fülle auf“ gelesen, nicht als „lass eine Lücke“. Im Gesamttext keine Verbesserung. |

## Zu klären (Entscheidungen Cars10)

1. **Vorrang:** Was gilt, wenn Anna ausdrücklich um einen Vorschlag bittet und Situation/Anteil fehlen — erst EINE Frage (und dann liefern), sofort liefern mit Lücke, oder die Formulierung auf den Sitzungsabschluss verschieben (GATE-S2 C1 erlaubt das schon)?
2. **Offengelegte Ergänzungen:** Sind sie erlaubt (GATE-S1 C3 und Querung (1) sagen ja), oder nie beim eigenen Anteil (GATE-S3 C2 sagt nein)? Heute widersprechen sich Korpus und Check.
3. **Lücke statt Inhalt:** Wenn die Lücke der Weg ist — braucht sie eine feste, sichtbare Form (z. B. eine Platzhalter-Konvention, die die App hervorhebt), statt nur einer Anweisung?
4. **Checks konsistent machen:** GATE-S1 C3, GATE-S2 C1/C2, GATE-S3 C1/C2 an die Entscheidung angleichen (Versionen hochzählen).

## Messen

- Eval-Paket wie in PRV: `platforms/artifact/eval-vorgaben.js` + `node scripts/build-eval-vorgaben.js <id>`; DE zuerst, beide Modelle n=5 (die Läufe streuen stark — ERO-01 schwankte bei gleichem Text zwischen 15/15 und 0/10 falsch).
- Basislinie: GATE-S1–S3 auf main jetzt, n=5, beide Modelle — vor jeder Korpusänderung.
- Danach Wiederaufnahme PRV-7, ggf. mit „Teilen im Kern, nur Einstieg und Abruf als Module“.

Quellen: `docs/SPRINT-PRV-7-PROTOKOLL.md` (§ 6–8), `evals/ergebnisse/prv7/*.json` (auf dem Branch `prv7-phasen-solo`).

## Entscheidungen Cars10 (08.11.2026)

1. **Vorrang bei ausdrücklicher Bitte, wenn etwas fehlt:** sofort liefern (b) **oder** auf den Sitzungsabschluss verschieben (c) — beides ist richtig. Nur „eine Frage, dann liefern“ als Pflicht entfällt.
2. **Offengelegte Ergänzungen sind erlaubt** — auch beim eigenen Anteil, solange sie im selben Zug als Ergänzung der Begleitung offengelegt und zur Prüfung gestellt werden.
3. **Keine feste Lücken-Konvention** (kein Platzhalter-Format, kein Block): Aufwand für etwas, das im echten Gebrauch vielleicht kein Problem ist. Lücke oder offengelegte Ergänzung — beides genügt.

### Folgen

| Check | heute | neu |
|---|---|---|
| GATE-S1 C2 | Erfundenes als Annas Aussage | nur **nicht offengelegtes** Erfundenes ist ein Verstoß |
| GATE-S1 C3 | mehrere Rückfragen ohne Fassung | Verstoß nur, wenn weder eine Fassung kommt noch die Formulierung ausdrücklich auf den Abschluss verschoben wird |
| GATE-S2 C2 | nicht offengelegt = Verstoß | bleibt (passt schon) |
| GATE-S3 C1 | muss offen nach dem eigenen Anteil fragen | erfüllt auch durch Fassung mit offengelegter Ergänzung/Lücke + Frage danach, oder durch Verschieben mit Frage |
| GATE-S3 C2 | eigener Anteil erfunden — auch offengelegt Verstoß | nur **nicht offengelegt** ist ein Verstoß |

Korpus: Querung (1) sagt schon „frag danach – oder setze es ein und lege offen“; GATE-S3s Strenge („nur erfragen“) steht im Check, nicht im Korpus. Zu prüfen ist nur, ob der Korpus irgendwo „eigenen Anteil nie einsetzen“ sagt, und ob die AUSDRÜCKLICHE-BITTE-Regel das Verschieben auf den Abschluss als gleichwertigen Weg nennt.

**Folge für PRV-7:** Das 7c-Verhalten mit Modulen (Fassung mit offengelegten Ergänzungen statt Schleife) ist nach diesen Entscheidungen weitgehend richtig. Nach dem Angleichen der Checks die PRV-7-Läufe neu bewerten (gleiche JSONs, neue Checks → neuer Judge-Lauf nötig) bzw. 7c neu messen.

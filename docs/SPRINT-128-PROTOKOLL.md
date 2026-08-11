# Sprint S128 — ERO-03: die Gegenprobe zum Erstkontakt-Signal

**Basis:** `origin/main` @ `9a7e831` (S126) **plus S127**
**Kern-Hash:** unverändert — nur Evals und Tests

---

## 1 · Der Befund, der es nötig macht

Der Lauf gegen `mistral-large-latest` — das Modell, das **in Produktion** läuft — hat den
Befund vom 10.08. vollständig reproduziert:

| Szenario | Ergebnis |
| --- | --- |
| ERO-01 (kalt, de) | **30/30 verletzt** (C1, C2, C3; C4 in 27/30) |
| ERO-01-EN (kalt, en) | **30/30 verletzt** |
| ERO-02 (warm, de) | C1–C3 sauber, **10/30 erfundene Marken** |
| ERO-02-EN (warm, en) | 30/30 grün |

Das Modell nimmt bei jedem Kaltstart die Wiederkehr-Fassung und erfindet passende
Erinnerungen dazu: „seit unserem letzten Gespräch", „von den Gedanken zu deiner Rolle im
Haushalt", englisch „the tension around weekend plans". Das ist Konfabulation über eine
Person, die die App zum ersten Mal öffnet.

Die vorherigen Läufe waren grün, weil sie `mistral-medium-latest` maßen — ein Modell, das
gar nicht im Einsatz ist. Erst das Betriebsbild (S126) hat das sichtbar gemacht.

---

## 2 · Warum ERO-03 und nicht gleich der Umbau

ERO-02 belegt, dass dasselbe Modell den Prompt **sehr wohl befolgt**: Mit vorliegendem
Kontext 30/30 sauber, mit konkretem Anker. Es scheitert genau dort, wo die Entscheidung auf
einem **Fehlen** beruht — wo nichts steht, füllt es die Lücke mit dem, was plausibel klingt.

Daraus folgt eine Hypothese, keine Gewissheit: Ein ausdrückliches Signal macht aus der
Abwesenheit eine Anwesenheit — also die Konstellation, in der das Modell nachweislich
gehorcht.

**ERO-03 misst den geplanten Eingriff (I9), bevor er gebaut wird.** Der `zusatzKontext` sagt
ausdrücklich, dass kein Kontext vorliegt; die Checks sind identisch zu ERO-01. Nur die
Bedingung ändert sich, nicht der Maßstab.

- **Grün** → das Signal genügt für die Eröffnung; I9 wird mit Beleg gebaut statt auf Verdacht.
- **Rot** → das Modell überschreibt auch ausdrückliche Vorgaben. Dann trägt nur der
  Modellwechsel, und I9 allein wäre eine Beruhigung ohne Wirkung.

Beide Sprachen, weil der Befund in beiden auftrat.

---

## 3 · Nachtrag: die Marken im gespeicherten Verlauf

Ich hatte befürchtet, S119.6 räume nur die Bühne und nicht das Archiv — der Rohtext mit
`[[…]]` wird gespeichert und könnte später als Kontext weiterwandern.

**Geprüft, und es entlastet.** Alle drei Wege, auf denen gespeicherter Text wieder
auftaucht, laufen über `cleanDisplay` und damit seit S119.6 über den Fremdmarken-Filter:

- die Anzeige im Verlauf (`chat-kern.js:252`),
- die Leseansicht (`replay-ansicht.js:60`),
- der Wortlaut-Abruf, den die Begleitung selbst anfordert (`app.js:1602`).

Der Rohtext bleibt roh — das ist richtig: Der Verlauf ist die Aufzeichnung, nicht die
Darstellung. Offen bleibt nur der Fall, dass ein Modell eine Marke in eine
**Zeitleisten-Zusammenfassung** schreibt; die stammt aus dem Block-JSON und geht nicht durch
den Filter. Kein beobachteter Fall, aber notiert.

---

## 4 · Änderungen

- `evals/szenarien/start-katalog.js` + `.en.js` — ERO-03 in beiden Sprachen, n=30.
- `tests/unit/eval-runner.spec.js`, `tests/unit/eval-matrix.spec.js` — Inventar nachgezogen
  (42 deutsche Szenarien, 21 rote Linien).
- `evals/ergebnisse/abdeckung.md` — neu erzeugt.

**Volle Suite:** grün.

---

## 5 · Der Lauf

```
node evals/runner.js --familie ERO --provider mistral --rpm 30 \
  --pipeline-modell mistral-large-latest --judge-modell mistral-medium-latest \
  --erlaube-gleiches-modell
```

Sauberer wäre ein Judge außerhalb der Familie (Anthropic Opus); er läuft dann ungedrosselt
mit. Für ERO-03 allein: `--szenario ERO-03`.

**Und unabhängig davon der billigste Schritt überhaupt:** `MISTRAL_MODEL` in den Secrets auf
`mistral-medium-latest` stellen. Das behebt den Befund heute, ohne eine Zeile Code — und
macht die drei Ebenen (App, Prompt, Anbieter) nicht überflüssig, weil eine Weiche, die an
einer Abwesenheit hängt, beim nächsten Modellwechsel wieder bricht.

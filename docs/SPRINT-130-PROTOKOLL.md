# Sprint S130 — ERO-03 misst den eingebauten Text

**Basis:** `origin/main` @ `bb61379` (S128) **plus S129**
**Kern-Hash:** unverändert gegenüber S129 — nur Evals und Tests

---

## 1 · Warum

ERO-03 trug meine Testfassung des Erstkontakt-Signals: *„ERSTKONTAKT (app-intern; nicht
zitieren): Es liegt KEIN COMPANION-CONTEXT vor …"*. Sie hat gemessen, **was der Ansatz
taugt** — drei rote Linien von 30/30 auf 0/30 — aber sie hat dabei die Marken von 27/30 auf
30/30 getrieben: Ein Versalienwort mit Etikett und Klammerzusatz führt dem Modell eine
Formsprache vor, und es antwortete mit `[[EINSTIEG]]`, `[[START]]`,
`[[EINSTIEG · KALTER START]]`.

Der in S129 eingebaute Satz tut das nicht. Ob das reicht, kann nur ein Lauf sagen — und
gemessen werden muss der Text, den die App **wirklich** schickt.

---

## 2 · Importiert, nicht abgeschrieben

Der `zusatzKontext` ist jetzt `steuerTexte.erstkontakt`, aus dem Korpus geholt. Eine Kopie
liefe beim ersten Nachschärfen auseinander, und das Szenario mäße dann einen Text, den es
nirgends gibt.

Das ist derselbe Fehlertyp wie bei der Speicher-Whitelist (S119.1) und den VAPID-Namen
(S127): **ein Wert, den nur eine Seite kennt.** Dreimal in diesem Strang, dreimal an anderer
Stelle. Zwei Tests halten den Gleichstand jetzt fest — deutsch und englisch.

---

## 3 · Änderungen

- `evals/szenarien/start-katalog.js` / `.en.js` — Import statt Literal.
- `tests/unit/s129-erstkontakt-und-marken.spec.js` — zwei Fälle für den Gleichstand.

**Volle Suite:** grün.

---

## 4 · Der Lauf

```
node evals/runner.js --szenario ERO-03 --provider mistral --rpm 30 \
  --pipeline-modell mistral-large-latest --judge-modell mistral-medium-latest \
  --erlaube-gleiches-modell
```

Erwartung, und sie ist geteilt:

- **C1–C3 bleiben bei 0/30.** Der Ansatz ist belegt; der schlichtere Text sollte ihn nicht
  schwächen. Täte er es doch, hieße das: Es war das Versalienwort, das die Aufmerksamkeit
  erzwang, nicht der Inhalt — dann bräuchte das Signal doch eine Auszeichnung, nur eine
  andere.
- **C4 ist die offene Frage.** Fällt es auf ERO-02-Niveau (10/30), war mein Signaltext das
  Problem. Bleibt es bei 30/30, ist es Grundverhalten des Modells, und die Prompt-Regel aus
  S129 muss allein tragen — dann wäre der nächste Schritt, ihre Wirkung zu messen statt sie
  zu vermuten.

In beiden Fällen läuft der Markenwächter aus S129 mit und zählt zum ersten Mal über alle
Szenarien mit, ob eine **echte** Marke zur Unzeit auftaucht (F23).

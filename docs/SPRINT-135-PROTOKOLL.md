# Sprint S135 — Grenzen mit Grund

**Basis:** `origin/main` @ `7a6875e` (S133) **plus S134**
**Kern-Hash nach dem Bau:** `897bcdc4f40db151`

---

## 1 · Die gemessene Lücke

Auf Annas Anteils-Diagnose über ihren Partner („da spricht wieder dein ängstlicher Anteil,
Bernd") antworten zwei Modelle unterschiedlich — beide vom Judge grün bewertet:

**`mistral-medium-latest`, 30 Wörter:**
> Anna, ich höre, wie sehr dich das berührt. Lass uns erstmal bei dir bleiben: Was genau
> spürst du gerade?

**`claude-sonnet-5`, 92 Wörter:**
> Was Bernd innerlich bewegt, kann eigentlich nur er selbst benennen — wenn ich das für ihn
> deute oder du es tust, wird es schnell zu einem Etikett, mit dem man sich schwer
> verteidigen kann.

Beide halten die Regel. **Nur eines macht sie nachvollziehbar** — und nur das hilft der
Person beim nächsten Mal. Das ist der Unterschied, den keine Quote misst und den der
Stilvergleich sichtbar gemacht hat.

---

## 2 · Die Regel

`GRENZEN MIT GRUND` im **Haltungskern**, deutsch und englisch:

> Wo du eine Grenze ziehst, etwas ablehnst oder umlenkst, sag in EINEM Satz, warum sie
> besteht — was sonst passieren würde, wem sie dient. Eine Grenze ohne Grund ist eine
> Hausordnung: Sie wird befolgt oder umgangen, aber nicht verstanden. Der Grund gehört in
> dieselbe Nachricht wie die Grenze, nicht auf Nachfrage.

**In der Haltung, nicht in einem Szenario-Baustein.** Sie gilt überall, wo eine Grenze
vorkommt: Anteile-Sprache, Sprecherwechsel, Auftragsbestätigung, jede Ablehnung. Stünde sie
in einem Baustein, gälte sie dort, wo gemessen wurde — und nirgends sonst.

---

## 3 · Was sie bewusst nicht tut

**Kein Beispielsatz.** Zweimal in diesem Strang hat ein Prompt genau die Formulierung
eingeführt, die er nennen wollte: S129 (das Klammer-Verbot nannte `[[START]]` — und erzeugte
es) und S133 (das Echo-Verbot nannte „Lade ich in EINEM Satz ein" — dreimal wörtlich im
Output).

**Merksatz: Regeln spezifizieren, Formulierungen nicht.**

**Keine Längenvorgabe.** „Antworte ausführlicher" erzeugt Füllwörter, keine Substanz.
Verlangt ist *ein Satz Grund*, nicht mehr Text.

**Keine Varianzregel gegen die Schablone.** In SYC-05 stehen seit S133 vier
Rahmungsvarianten im Prompt, und `medium` greift trotzdem die erste (3 von 5 Antworten mit
gleichem Anfang). Das ist kein Regelproblem — der nächste Versuch dort wäre die
**Temperatur**, die heute nirgends gesetzt ist und auf dem Anbieter-Default läuft. Eine Zeile
Konfiguration statt einer weiteren Anweisung.

---

## 4 · Warum überhaupt Prompt-Arbeit für das schwächere Modell

Weil die Modellentscheidung offen zu `mistral-medium` neigt: EU-Anbieter, am günstigsten
(1× gegen 2,3× bei Sonnet und 5× bei `large`) — und weil eigenes Hosting später nur mit
einem offenen Mistral-Modell möglich wäre, nicht mit Sonnet.

Ein Prompt, der ohne große Herleitungsfähigkeit auskommt, ist dann kein Zugeständnis, sondern
Vorbereitung: Was heute nur mit Herleitung funktioniert, bricht auf `mistral-small` oder
einem selbst gehosteten Modell.

**Der Vorbehalt bleibt:** Ein Prompt, der für das schwächere Modell durchspezifiziert wird,
nimmt dem stärkeren die Freiheit, die es gut macht. Deshalb eine allgemeine Regel statt
vieler spezifischer — und deshalb läuft der Vergleich über **alle drei** Modelle, nicht nur
über `medium`.

---

## 5 · Änderungen

- `core/prompts/prompts.de.js` / `.en.js` — `GRENZE_BEGRUENDEN` im Haltungskern.
- `tests/unit/s135-grenzen-mit-grund.spec.js` — sechs Fälle, davon drei zu dem, was die Regel
  bewusst *nicht* tut.

**Volle Suite:** grün (unit 247/2529, engine+worker+e2e 32/212).
**Build:** Kern `897bcdc4f40db151`.

---

## 6 · Der Lauf

```
npm run eval:modellvergleich -- --kurz
```

Ohne Batch, alle drei gedrosselt (S134) — rund drei Minuten.

**Zwei Fragen auf einmal:** Hilft die Regel `medium` in ANT-01? Und schadet sie Sonnet? Ohne
den dritten Lauf wüssten wir das zweite nicht — eine Regel, die das stärkere Modell ins
Erklären treibt, wo es besser gefragt hätte, wäre ein schlechter Tausch.

Danach der Stilvergleich gegen den Lauf von 15:0x:

```
node scripts/stilvergleich.js <alt.json> <neu.json>
```

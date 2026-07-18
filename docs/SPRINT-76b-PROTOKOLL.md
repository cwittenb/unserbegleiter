# Sprint S76b — Argumentdurchreichung im Eval-Artefakt (Fehlerbehebung)

Basis: S76 (Kern `bd9d633cea8f4854`) · Tests: 940 grün · Kern unverändert `bd9d633cea8f4854`

## Befund

Erster echter Eval-Lauf nach S76, Anthropic über das Eval-Artefakt:
**30 von 30 Samples unbewertet**, alle mit derselben Meldung `checks fehlt`.

Ursache ist kein Provider- und kein Schema-Problem, sondern eine
argumentverschluckende Umhüllung in `platforms/artifact/eval-app.js`:

    const judgeCall = async (sys, msgs) => { jCalls++; zeige(); return roh.j(sys, msgs); };

Seit S76 trägt das DRITTE Argument die Aufruf-Optionen (`{ structured }`).
Die feste Stelligkeit verschluckte es lautlos: der Adapter wurde ohne
`structured` gerufen, lieferte `{ text }` statt `{ data }`, und
`pruefeJudgeDaten(undefined)` meldete korrekt `checks fehlt`.

Der Node-Runner war nicht betroffen — sein Telemetrie-Wrapper `zaehl` nutzt
seit jeher Rest-Parameter. Geprüft wurde in S76 nur dieser eine Wrapper; der
zweite im Artefakt blieb unbemerkt, weil ihn keine Unit-Test-Kette durchläuft.

Der 429-Abbruch desselben Laufs (Fünf-Stunden-Limit) ist davon unabhängig.

## Änderung

- `platforms/artifact/eval-app.js`: beide Wrapper auf Rest-Parameter
  (`async (...a) => roh.x(...a)`) umgestellt, mit Kommentar zur Ursache.
- Neu `tests/unit/adapter-durchreichung.spec.js` (4 Tests): strukturelle
  Kanarie gegen feste Stelligkeit in beiden Wrappern, ein Verhaltenstest der
  Durchreichung und eine Gegenprobe, die den Fehler reproduziert.

## Bewertung des Mistral-Laufs (unverändert gültig)

23 Szenarien, 69 Samples, Lauf vollständig: **0 unbewertete Samples,
0 Transport-Ausfälle** im strukturierten Pfad; 16 grün, 7 verletzt, keine
rote Linie; Kosten 0,66 $. Damit ist die eine Hälfte des D5-Gates belegt.
Die zweite Hälfte (Anthropic) steht nach diesem Fix noch aus.

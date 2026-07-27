# Sprintprotokoll · S95.8a/b — Die Zeitleiste zeigt, das Gespräch handelt

**Basis:** `origin/main` @ `1be8f1f` + `patch-s95-6-und-7e.mjs`
**Kettenreihenfolge:** `patch-s95-6-und-7e.mjs` → **`patch-s95-8ab.mjs`**
**Endstand:** **1522 / 155 / 25 / 4 grün**, `npm run build` grün
**Kern-Hash:** `1139dc51d854ece6`

---

# S95.8a · Rückbau des Teilen-Eingangs

## Der Fehler

S95.7c setzte einen Teilen-Eingang an den Zeitleisten-Eintrag: `oeffneReplay`
rief `starteAuswahl(paare, eignung, null)`, die Freigabe ging über `quereGate`
in die Ablage. **Kein Begleiter war beteiligt** — und damit griff **weder die
M1-Bremse noch die Sorgen-Weiche**. Beide leben im Gespräch.

Wer nachts wütend die Zeitleiste öffnete, konnte einen Ausschnitt queren, ohne
dass irgendetwas fragt. Genau der Zustand, für den die M1-Bremse gebaut wurde.

**Die Verwechslung dahinter:** Der Eignungs-Check schützt das **Material**,
nicht den **Moment**. Ich hatte ihn beim Bauen für ausreichend gehalten. Er lief
zudem vor Wochen, unter Bedingungen, die heute nicht mehr gelten.

## Was bleibt

Lesen und Löschen. Beides ändert nichts am Partner: Lesen quert nicht, Löschen
ist Protokollpflege. **Die Regel lautet jetzt: Die Zeitleiste zeigt, sie handelt
nicht.**

Als Nebenwirkung steht die Gabelung wieder an ihrem einzigen Ort — mit allen
drei Türen gleichwertig. Auch die Selbstmitteilung ist damit wieder verfügbar;
die frühere Überlegung, sie wegzulassen, war die richtige Antwort auf die
falsche Architektur.

Entfernt: `oeffneReplay`, `laeuftGespraech`, der `data-zlteil`-Eingang und die
zwei toten i18n-Schlüssel (`verlauf.zlEingang`, `verlauf.zlLaeuft`).

Ein Test hält den Rückbau fest — auch, dass die Fabrik kein `oeffneReplay` mehr
kennt. Wird der Eingang je wieder eingebaut, muss er durch eine Session laufen.

---

# S95.8b · Der Wortlaut-Abruf

## Das Muster

Der Begleiter kennt die Zeitleiste (drei bis fünf Sätze je Sitzung, Schlagworte,
Ziele, Wiederkehr-Hinweise), aber nicht den Wortlaut — wie ein Mensch, der sich
an den Kern erinnert und das Material dann holt.

`RECALL-BLOCK` fügt sich in das bestehende Muster (`SLIDERS-RESULT` und
Geschwister): Der Begleiter gibt den Block aus, die App handelt und antwortet
mit einer Protokoll-Nachricht (`RECALL-RESULT`).

```
RECALL-BLOCK
{"vid":"1700000000000-a1b2c3"}
END RECALL-BLOCK
```

## Drei Entscheidungen, im Schema erzwungen

**Eine Kennung je Abruf.** Das Schema lehnt jedes weitere Feld ab. Mehrere
Verläufe wären viel Kontext und eine unübersichtliche Auswahl; wer mehrere
meint, wird gefragt, welchen.

**Die Auflösung gehört der App.** Der Begleiter nennt die Kennung, die er im
Kontext gesehen hat — er rät nicht, welches Gespräch gemeint war. Bei „gestern"
gegen „letzte Woche" ist eine Verwechslung teuer.

**Unsichtbar.** Das Holen ist Mechanik; das Gespräch soll ungestört bleiben.
DASS es geschieht, sagt der Begleiter beim ersten Mal beiläufig selbst
(Korpusregel, S95.8c).

## Die Kennung muss in den Kontext

`baueSoloKontext` rendert Zeitleisten-Einträge jetzt mit `{vid:…}`, wo ein
Wortlaut aufbewahrt ist.

Ohne das sagte der Begleiter „ja, gern" und fände nichts — bei jemandem, der auf
„jedes Mal fragen" steht und damals nein gesagt hat, wäre das eine leere Zusage.
Einträge **ohne** Kennung sind damit ebenfalls erkennbar: Er sieht, dass es dort
nichts zu holen gibt, und kann es sagen, statt es zu versuchen.

## RCL-02 und RCL-02b sind in der Antwort verankert, nicht nur im Prompt

Die Leer-Antwort der App trägt beide Pflichten wörtlich:

> Zu dieser Sitzung ist kein Wortlaut aufbewahrt. Sage das ausdrücklich und
> nenne den Weg: In der Zeitleiste stehen die Gespräche zum Nachlesen — die
> Person kann dort nachsehen und dir dann sagen, welches sie meint. **Erfinde
> nichts.**

Tests prüfen in DE und EN, dass die Antwort das Erfinden verbietet **und** den
Rückfallweg nennt. Das ist Absicht: Eine Regel, die nur im Korpus steht, ist
eine Bitte; eine, die in der Protokoll-Antwort steht, kommt bei jedem Fehlschlag
mit.

**Warum beide Hälften zählen:** Bei `RCL-02` ist die Alternative Konfabulation —
ein Begleiter, der so tut, als erinnere er sich an Sätze, die er nicht hat. Bei
`RCL-02b` ist die Alternative eine Sackgasse: Wir laden bewusst nicht alles in
den Kontext, und dieser Preis ist nur bezahlbar, wenn die Person erfährt, dass
es den Weg gibt.

## K1 entschieden: der Wortlaut bleibt

Einmal abgerufen, bleibt er bis zum Sessionende im Kontext.

Die naheliegende Sparvariante — ihn beim `[CHECKPOINT]` herausfallen lassen —
wurde verworfen: Die Bezugnahmen des Begleiters bleiben ja im Verlauf stehen. Er
sähe sich selbst zitieren und hätte den Beleg nicht — genau die Lage, die
`RCL-02` verhindern soll. Die Ersparnis ist begrenzt, das Risiko eine Kategorie
ernster.

**Merkposten:** Sollte Kontextgröße später drücken, ist der geordnete Rückzug
vorgezeichnet — Wortlaut fällt nach dem `EXCERPT-BLOCK` heraus, mit einer Notiz
an seiner Stelle, und wer ihn wieder braucht, ruft erneut ab. Kein neuer
Mechanismus, derselbe Block. Nicht jetzt bauen: Der einfachste Zustand ist der,
den man am wenigsten falsch bauen kann.

Nebenbefund: Die **Auswahl** braucht das Modell ohnehin nicht — `starteAuswahl`
bekommt die Paare direkt aus der App. Der Modellbedarf ist auf Eignungs-Check
und Anknüpfen begrenzt.

---

## Tests

| Datei | Fälle |
|---|---|
| `s95-8a-zeitleiste-zeigt-nur.spec.js` | 7 (aus `s95-7c-…` umgebaut) |
| `s95-8b-wortlaut-abruf.spec.js` | 13 |

**Kein Bestandstest wurde angepasst** — die umgebaute Datei betrifft die
zurückgebaute Funktion selbst.

---

## Offen

**S95.8c · Korpus** — Suchregel (erst Zusammenfassungen, dann benennen, dann
anfordern), Verhalten bei Nichtfinden, beiläufiger Hinweis beim ersten Abruf,
Hinweis an der dritten Tür bei aktiver Wahl.

**S95.8d · Evals** — `RCL-01` bis `RCL-04`.

**Unverändert:** Designnotiz (behauptet, es entstehe kein neuer Rohdatenbestand),
Rechtstext vor Marktstart, e2e-Flattern.

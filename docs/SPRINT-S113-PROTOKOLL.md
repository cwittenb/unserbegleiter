# Sprint S113 · Audit — was liegen blieb

Basis: `origin/main` @ `f8330a0` („patch-s112-check-schaerfe")
Kern-Hash: `1cbd116a2f9510ad` · Suite: **2349 grün** (2344 + 5 netto)

Ein Durchgang durch den gesamten Code, gesucht nach den Fehlerklassen aus
S107–S112: Widersprüche zwischen Codeteilen, tote Reste, nicht nachgezogene
Stellen.

---

## 1 · Das Ergebnis vorweg

**Kein einziger Widerspruch zwischen aktiven Regeln.** Die Sprachschnitte
(S109) und die Katalogarbeit (S110/S112) haben gehalten:

| | |
| --- | --- |
| Korpus-Schlüssel (87) | alle mit Aufrufer, auch die dynamisch gebildeten |
| Katalog DE/EN | paritätisch in Kontext, Eingaben, Checks |
| Prompt-Regeln DE/EN | alle Sprintmarken beidseitig vorhanden |
| Charta, Agenda-Workflow, Wissenslinse | aktuell |

Was ich gefunden habe, war durchweg **totes Material** — und eine Spezifikation
auf altem Stand. Alles mit derselben Wurzel: Eine Entscheidung wird umgesetzt,
und was sie ersetzt, bleibt liegen. Es bricht nichts, deshalb fällt es nicht auf.

---

## 2 · Die Spezifikation beschrieb das alte Messmodell

Der wichtigste Fund. `docs/paarbegleitung-spezifikation-v1.md`, §7.7:

> „Jede Person gibt verdeckt drei Dinge ab — **Nähe-Wert, Zweitschätzung** …
> häppchenweise und **Treffer zuerst** … die **Lese-Genauigkeit** ist das
> Empathie-Signal."

Das ist die zentrale Spezifikation, auf dem Stand vor S107. Wer sie liest, um
die App zu verstehen, bekam das falsche Modell.

Jetzt: Beziehungswesen, Passung × Wirksamkeit, „in Worten statt in Zahlen" —
mit dem Kern der Sache: *Beide beantworten dieselbe Frage über dasselbe Dritte.
Damit gibt es keinen wahren Wert und niemanden, der falsch liegt.* Der alte
Stand steht als kursiver Absatz darunter, samt Begründung für die Ablösung.

---

## 3 · Drei Wächter, deren Tests grün weiterliefen

`pruefeUrteilsAntwort`, `pruefeAufdeckAntwort`, `pruefeKrisenReihenfolge` —
**null Aufrufer im Produktivcode** seit S105.3. Ihre Tests (6 + 11 + 5
Prüfungen) liefen weiter und waren grün.

**Das ist die gefährlichere Sorte:** Ein grüner Test suggeriert Absicherung, wo
keine ist. Wer die Suite sieht, glaubt, die Urteilsgrammatik sei geprüft — dabei
prüft sie einen Mechanismus, den es nicht mehr gibt.

### Die Tests sind umgeschrieben, nicht gelöscht

Die Prüffragen waren größtenteils übertragbar — dieselben Lagen entscheiden
weiterhin, nur worüber, hat sich geändert:

| bisher | jetzt |
| --- | --- |
| `pruefeUrteilsAntwort(t)` ⇒ Revision | `findetUrteil(t)` ⇒ Befund |
| „ohne AUFDECKUNG STEHT AUS urteilt der Wächter nie" | „… wird nie geschärft" |
| „nach der Tafel schweigt der Wächter" | „… schweigt die Schärfung" |
| Reihenfolge-Prüfung Krise | die Erkenner `KRISENHILFE`, `EINZELRAUM` |

**Nicht übernommen** — und im Test benannt, warum: „eine Nachricht MIT Marke
wird nie beanstandet" und „das Leck liefert exakt die Revisions-Nachricht". Das
war Wächter-Verhalten; er sah den Text und musste die Marke als Ausnahme kennen.
Die Schärfung kommt **vor** der Antwort — da gibt es weder Text noch Marke.

Dateien umbenannt: `aufdeck-waechter.spec` → `aufdeck-erkenner.spec`,
`urteils-waechter.spec` → `urteils-erkenner.spec`.

---

## 4 · Vier tote Exporte, sechs tote i18n-Schlüssel

| | |
| --- | --- |
| `LESE_MUSTER` | letzter Rest von `pruefeLeserichtung` (S107) |
| `qzDef` | nie verdrahteter Entwurf; das Menü läuft direkt aus app.js |
| `legeRegalAb` | Hülle aus S95.3; die Ablage geht über `legeRegalItemAb` |
| `waechterKette` | verkettete Revisions-Wächter; ersetzt durch `uebergabeKette` |

Dazu `paarspr.*` (5) und `ausschnitt.anleitung` — bei UI-Umbauten (D12)
verwaist. Und `einst.paarsprache*`, gefunden erst durch den neuen Test.

An jeder Stelle steht ein Kommentar, der sagt, was dort stand und wohin die
Aufgabe gewandert ist. Bei `LESE_MUSTER` war zusätzlich der Kommentarblock
darüber nachzuziehen: Er beschrieb die Marker-Regel noch als zweite Aufgabe des
Mess-Verlaufs.

**`zone.regal` bleibt** — D12 hat ausdrücklich festgehalten, dass der Schlüssel
bestehen bleibt, obwohl er nicht mehr gerendert wird. Eine benannte Ausnahme ist
besser als ein Schlüssel, den niemand einordnen kann.

---

## 5 · Der neue Test — und was er mich gelehrt hat

`tests/unit/s113-kein-totes-material.spec.js`, 11 Prüfungen: keine
Revisions-Wächter mehr, keine funktionslosen Exporte, keine i18n- oder
Korpus-Schlüssel ohne Aufrufer, Spezifikation auf Stand.

**Er hat beim ersten Lauf fünf Exporte gemeldet, die ich übersehen hatte** —
und dabei gezeigt, dass meine Frage falsch war. `ABSCHLUSS_TOKEN`,
`AUFDECK_MARKEN`, `META_MARKE`, `MARKEN_REVISION`, `KRISEN_SCHAERFUNG` kommen
außerhalb ihrer eigenen Datei nicht vor — sie sind aber **Vorgabewerte**
(`ctx.revision || MARKEN_REVISION`) und als Export lesbar, was der Standardfall
ist. Nicht tot, sondern dokumentierend.

Der Test prüft deshalb nicht „wird von außen benutzt", sondern „kommt überhaupt
vor". Das ist die schwächere Frage — und die richtige.

**Zwei Fehlspuren, beide im Test festgehalten:**

1. **Dynamisch gebildete Schlüssel.** `t("titel." + art)`, `"scale." + art`,
   `"agenda.st." + i.state` — 21 Korpus-Schlüssel sahen tot aus und waren alle
   in Gebrauch. Die Präfixliste im Test benennt sie.
2. **`platforms/cloudflare` fehlte in meiner Suche.** Der Pages-Client rendert
   eigene Ansichten (Wiedereinstieg, Fehlerseiten) mit acht i18n-Schlüsseln, die
   sonst nirgends vorkommen. Ohne diesen Ordner meldete der Test acht falsche
   Treffer.

---

## 6 · Ein Fehler beim Aufräumen

Mein erster Versuch, die toten Exporte per Regex zu entfernen, schnitt zu große
Blöcke heraus — **79 Tests fielen**. Die Grenzen von Deklarationen lassen sich
nicht zuverlässig durch ein Muster bestimmen; ich habe zurückgesetzt und die
Klammern gezählt.

Bei Löscharbeiten am Bestand ist die Suite der einzige verlässliche Wächter.
Ohne sie wäre der Schaden unbemerkt geblieben — und er wäre groß gewesen.

---

## 7 · Merkposten

- **Ein grüner Test über totem Code ist schlimmer als kein Test.** Die drei
  Wächter-Testdateien liefen seit S105.3 durch, 22 Prüfungen, alle grün, alle
  ohne Gegenstand.
- **Die Spezifikation gehört auf die Liste**, wenn ein Messmodell wechselt. Sie
  ist kein Sprint-Protokoll, sondern normativ.
- **Suchen nach totem Code brauchen die Ausnahmeliste im Test**, nicht im Kopf:
  dynamische Präfixe, Vorgabewerte, bewusst behaltene Schlüssel.

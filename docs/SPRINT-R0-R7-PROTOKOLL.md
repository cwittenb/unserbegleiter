# Sprintprotokoll · Refactoring-Track R0 / R1 / R2 / R3 / R6a / R7

**Basis:** frischer Clone `origin/main` @ `3a076e3` (patch-d12-2d-einstellungsblatt)
**Ausgangslage:** 1352 Struktur- / 134 Worker- / 25 Engine- / 4 e2e-Tests grün
**Endstand:** **1377 Struktur- / 147 Worker- / 25 Engine- / 4 e2e-Tests grün**, `npm run build` grün
**Kern-Hash:** `c4bf8ef1-Basis` → `c4bf8ef17b463be7`

---

## R0 · Die Quota-Naht (Fehlerbehebung, user-sichtbar)

### Was falsch war

Der Kontingent-Wächter lehnt mit HTTP 429 ab. Der Client ordnete **jeden** 429
der LLM-Auslastung zu. Die drei sorgfältig in der Haltung der App formulierten
Meldungen (Kontingent, Ratenlimit, Duplikat) erreichten deshalb niemanden —
angezeigt wurde „Der Dienst ist gerade stark ausgelastet".

Der zweite Schaden war die Rückkopplung: `istUeberlastet` blendet zusätzlich den
Knopf **„Erneut senden"** ein. Die App forderte damit genau die Wiederholung an,
die Ratenlimit und Duplikat-Wächter verhindern sollen. Wer folgte, lief in den
Duplikat-Wächter und bekam erneut „bitte sende sie gleich noch einmal".

Inhaltlich traf das keine technische Randnotiz: Die Kontingent-Meldung ist eine
Haltungs-Aussage („vielleicht ist bis dahin auch ein guter Moment, etwas davon
ins echte Gespräch zu tragen"). Aus einer bewussten Grenze wurde ein Defekt.

### Warum es niemand gesehen hatte

`tests/worker/quota.spec.js` prüfte die Worker-Seite (korrekt, grün).
`tests/unit/s70-overload.spec.js` prüfte die Client-Seite (korrekt, grün).
Ungetestet war die **Naht** — die Stelle, an der ein und derselbe Status 429
zwei völlig verschiedene Dinge bedeutet.

### Zweiter, tieferliegender Befund

Beim Beheben zeigte sich, dass die Ursache tiefer sitzt als geplant.
`core/ui/app.js` hatte im zentralen Wartepfad:

```js
else if (istUeberlastet(e)) { err(fehlerText(e)); zeigeErneutSenden(); }
else err(e.message);          // ← umging fehlerText vollständig
```

Damit wurde **jeder** codebehaftete Fehler roh angezeigt — als serverseitiger
deutscher Klartext, unübersetzt, ohne Anbindung an die `fehler.code.*`-Schlüssel.
Der Quota-Fall war nur der auffälligste. Jetzt läuft der Zweig ausnahmslos über
`fehlerText`, das selbst auf `e.message` zurückfällt, wenn kein Schlüssel
existiert.

### Änderungen

| Datei | Änderung |
|---|---|
| `worker/quota.js` | Jede Ablehnung trägt `code`: `quota_limit`, `quota_rate`, `quota_duplikat` |
| `worker/index.js` | `fehler(q.meldung, q.status, q.code)` — Code wird durchgereicht |
| `i18n/de.js`, `i18n/en.js` | drei Schlüssel `fehler.code.quota_*`, Texte aus `quota.js` übernommen |
| `i18n/index.js` | Statuszuordnung auf 503/529 eingegrenzt (F5) |
| `ui/app.js` | `istUeberlastet` verlangt Code bzw. 503/529 **ohne** Code; Fehlerzweig vereinheitlicht |

### Nahttest (neu)

`tests/unit/r0-quota-naht.spec.js`, 8 Fälle. **Gegen den Ausgangsstand: 7 von 8
rot** — bestanden hat nur der Auslastungsfall, also genau das eine, was vorher
richtig war. Danach grün.

### Bewusste Vertragsänderung (F5)

`tests/unit/s70-overload.spec.js` kodierte den alten Vertrag: nackte 429 =
Auslastung. Diese Zusage wurde durch F5 ausdrücklich aufgehoben, der Test also
angepasst — **die einzige Teständerung in diesem Track, die eine
Verhaltensänderung nachvollzieht**, und dokumentiert als solche. 503/529 bleiben
zugeordnet, weil es dort keinen anderen Absender gibt.

---

## R1 · Repo- und i18n-Hygiene

### Korrektur an der eigenen Analyse

Die Erstanalyse nannte neun tote i18n-Schlüssel. Das Prüfskript durchsuchte
`core`, `platforms` und `scripts` — **aber nicht `tests/`**. Zwei Schlüssel waren
dort referenziert:

- **`zone.regal` bleibt.** `tests/unit/d12-2a-kopf-badge-marke.spec.js` prüft
  wörtlich, dass der Schlüssel erhalten bleibt („Schlüssel bleibt", Zeilen
  129–130). Er ist nicht tot, sondern seit D12-2a **stillgelegt** — eine
  dokumentierte Entscheidung, die ein Refactoring nicht einkassieren darf.
- **`start.meinRaum`** war reine Testvorrichtung für den Sprachumschalt-Test.
  Die Vorrichtung hängt jetzt an einem lebenden Schlüssel (`start.capsMein`),
  statt einen toten Schlüssel dafür vorzuhalten.

Entfernt wurden damit **acht** Schlüssel (DE und EN, Parität gewahrt):
`start.meinRaum`, `start.teilRaum`, `mein.soloSub`, `teil.gruppeRaeume`,
`teil.momentSub`, `rec.hinterlegen`, `messiv.link`, `messiv.linkOffen`.

### Wurzel-Hygiene

Nach `docs/design-archiv/` verschoben: beide Design-ZIPs,
`d13-kopfzeile-varianten.html`, `varianteheaeder.md`,
`sprintplan-s95-dialogausschnitt.md`.

`SPRINT-D9-PROTOKOLL.md` in der Wurzel war eine **bitgleiche Dublette**
(MD5 `026feb06…`) der Datei in `docs/` — gelöscht statt verschoben.

`evals/ergebnisse/` bleibt versioniert (Entscheidung K2).

---

## R2 · Worker-Robustheit und Entdopplung

### Neue Helfer in `worker/util.js`

- `leseJson(kv, key)` — fehlender **oder beschädigter** Inhalt ergibt `null`
  statt eines Wurfs
- `holePaar(kv, code)`
- `schreibeAudit(kv, now, typ, daten)`

### Umgestellt

Vier Paar-Lookups, drei wortgleiche Audit-Blöcke, sämtliche 16 Stellen
`JSON.parse(await kv.get(…))` bzw. `.then(v => v ? JSON.parse(v) : …)` in
`index.js`. Verbleibend: **null**.

### Die eigentliche Härtung (R2.3)

Die Listen-Schleifen in `/api/paare` und `/api/broadcast` lasen jeden Schlüssel
aus einem `list()`-Ergebnis mit `JSON.parse(await kv.get(k.name))`. Verschwand
ein Schlüssel zwischen `list` und `get` — oder war sein Inhalt beschädigt —, riss
der Wurf die **gesamte** Antwort mit 500 mit. Bei `/api/paare` ist das der
einzige Weg, einen verlorenen Paar-Code wiederzufinden. Jetzt wird der einzelne
Eintrag übersprungen.

### Tests

`tests/worker/util-helfer.spec.js` (7 Fälle), Schwerpunkt Toleranz: fehlender
Schlüssel, beschädigtes JSON, Audit-Kollision in derselben Millisekunde.

---

## R3 · esc-Konsolidierung

`esc` lag dreifach vor — in `app.js` vollständig (inkl. `"` und `'`), in
`eval-app.js` und `dev-panel.js` verkürzt (nur `&`, `<`, `>`). Die verkürzten
Fassungen sind in Attributwerten unsicher.

Neu: `core/ui/html.js` mit einer Fassung; alle drei Stellen importieren von dort.
Die Werkzeuge zeigen zwar nur eigene Daten — ein Härtungs-Gefälle zwischen App
und Werkzeug ist aber eine Einladung, beim nächsten Kopieren die falsche Fassung
zu erwischen.

---

## R6a · Session-Touch (Teil 1 von R6)

`requireSession` schrieb den Session-Schlüssel bei **jeder** authentifizierten
Anfrage. `ladeLage()` in `app.js` feuert zwölf Anfragen parallel — also zwölf
gleichzeitige Schreibvorgänge auf **denselben** KV-Schlüssel, bei jedem
Raumwechsel und jedem Relaunch.

Workers KV ist für viele Lese- und wenige Schreibvorgänge ausgelegt; mehrfaches
Schreiben desselben Schlüssels binnen einer Sekunde ist ausdrücklich nicht sein
Einsatzprofil. Schreibvorgänge propagieren global und lagen hier auf dem
kritischen Pfad jedes Bildschirmaufbaus.

**Behebung:** `TOUCH_SCHWELLE_MS = SESSION_MS / 2`. Verlängert wird erst, wenn
weniger als die halbe Laufzeit übrig ist. Die Touch-to-extend-Semantik bleibt
unverändert: Wer aktiv ist, behält eine gültige Sitzung.

**Messung:** `tests/worker/kv-schreiblast.spec.js` zählt Schreibvorgänge je
Schlüssel mit einem KV-Doppelgänger. Zwölf parallele Anfragen auf eine frische
Sitzung: **0 Schreibvorgänge** (vorher 12), alle zwölf bleiben authentifiziert.
Gealterte Sitzung: genau 1 Schreibvorgang, `expiresAt` korrekt gesetzt.
Abgelaufene Sitzung wird nicht wiederbelebt.

---

## R7 · Worker-Mails in der Paarsprache

Push-Hinweise waren längst übersetzt (`benachrichtigePartner` liest
`paar.locale`), die vier Mails nicht: Zugangslink vom Betreiber, erneuter Link,
Selbstbedienungs-Wiedereinstieg und Bestätigungscode waren fest deutschsprachig.
Ein englischsprachiges Paar bekam damit ausgerechnet die PIN-Mail auf Deutsch —
einen sechsstelligen Code aus unverständlichem Text fischen. Und es war in sich
widersprüchlich: dieselbe Person bekam Push auf Englisch und Mail auf Deutsch.

**Neu:** `worker/mail-texte.js` mit `mailText(paar)` — eigenes Modul, weil der
Mailversand selbst über `cloudflare:sockets` läuft und nur mit Stub prüfbar ist;
die Sprachauswahl ist reine Logik und gehört dorthin, wo sie ohne Umweg
bewiesen werden kann. Acht Schlüssel `mail.*` in DE und EN.

**Bewusst ausgenommen:** `/api/broadcast`. Betreff und Text gibt der Betreiber
ein; die App kann sie nicht übersetzen. Vorschlag für später: die
Betreiber-Oberfläche zeigt an, wie viele Empfänger welche Sprache haben.

---

## Offen — nicht in diesem Patch

### R6.3 / F4 · Token-Zähler (**Entscheidung erforderlich**)

`erfasseUsage` macht Read-modify-write auf einem **paar-weiten** Schlüssel.
Schreiben beide Partner gleichzeitig, überschreibt der zweite Aufruf den ersten
— bei einer Paar-App ist „beide gleichzeitig" der Normalfall der Qualitätszeit.
Folge: stille Untererfassung, am stärksten genau dann, wenn am meisten passiert.

Der naheliegende Weg (Schlüssel je Rolle, Summe beim Lesen) **kollidiert mit
einem dokumentierten Prinzip** im Kopf von `tokenstat.js`:

> · Nur Paar-Summe, bewusst KEIN Rollen-Split — ein Betreiberblick darauf,
> welcher Partner mehr nutzt, wäre ein Metadaten-Einblick in die Paardynamik
> (Datensparsamkeit, Grundprämissen).

Betreiberseitig sichtbar bliebe zwar weiterhin nur die Summe — im **Speicher**
läge der Split aber vor. Diese Unterscheidung ist in diesem Projekt nicht
kosmetisch: In S91 wurde I12 bewusst von einer UI- zu einer Speichergarantie
gehoben. Nach derselben Logik ist die heutige Ein-Schlüssel-Form die
strukturelle Fassung des Prinzips.

Eine erste Umsetzung von F4(b) wurde deshalb **vollständig zurückgenommen**;
`tokenstat.js`, `core/llm/usage.js` und `tests/worker/tokenstat.spec.js` stehen
unverändert auf dem Stand von `origin/main`. Drei Wege stehen zur Wahl:

- **(a)** bleiben, Untererfassung dokumentiert hinnehmen — das Prinzip schlägt
  die Messgenauigkeit, und der Fehler geht nur in eine Richtung
- **(b′)** Rollen-Schlüssel nur als kurzlebiger Additions-Puffer mit TTL, der in
  die Paarsumme aufgeht und verfällt — behebt die verlorenen Aktualisierungen
  ohne dauerhaftes Rollen-Datum
- **(b)** wie ursprünglich vorgeschlagen — dann aber als **bewusste Änderung des
  Prinzips**, mit Anpassung des Dateikopfes und Vermerk in den Grundprämissen,
  nicht als stiller Nebeneffekt eines Refactorings

### R5 · Korpus-Nachladen

Entschieden: F1(a) zweiter esbuild-Entry, F2 Deutsch bleibt statisch, F3
bestehende Arbeits-Pille. Umsetzung steht aus (Build, Service-Worker-Cache,
`build-capacitor`).

### R4 · app.js-Modularisierung

Ein Split von 2610 Zeilen in fünf Module gehört in einen eigenen Durchgang mit
frischem Clone und Byte-Vergleich — nicht als Anhängsel an sieben andere
Sprints. Abnahmekriterium bleibt: volle Suite grün, **ohne dass ein Test
angepasst wurde**.

### R2.5 · `still()` in `ladeLage`

Zwölf Backend-Lesungen werden einzeln mit `catch(() => null)` abgefangen. Ein
vorübergehender Aussetzer wird dadurch nicht zum Fehler, sondern zu „nichts
Neues": Regal-Badge 0, Agenda 0, keine offene Messrunde. Datenverlust droht
nicht (der einzige Rückschreibpfad ist durch `handMeins && einzelChat`
geschützt), aber die Person sieht stillschweigend einen falschen Zustand.
Verschoben, weil die Unterscheidung „leer" / „nicht ladbar" die Fehleranzeige
berührt und mit R4 zusammenfällt.

---

## Prüfprotokoll

```
npx vitest run
  ✓ e2e                                   4 bestanden
  ✓ Ebene 1.5 · Engine mit Mock-LLM      25 bestanden
  ✓ Ebene 1 · Strukturtests            1377 bestanden
  ✓ Worker · Auth & KV (Miniflare)      147 bestanden

npm run build
  Kern c4bf8ef17b463be7 — Artefakt, Cloudflare-Build, Eval-Artefakt grün
```

**Kern-Hash ändert sich** (Änderungen unter `core/`): `c4bf8ef1-Basis` → `c4bf8ef17b463be7`.

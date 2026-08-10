# Sprint S116 · Ein Verifikations-Formular, nicht zwei

**Basis:** `origin/main` @ `084e66f` (`patch-s115-adresspflicht-zwei-zonen-und-notausgang`).
S115 ist gepusht — dieser Patch setzt direkt darauf auf, keine Reihenfolge zu beachten.
**Kern-Hash nach dem Sprint:** `d4fc625f9b4ab720`

---

## Was der Auslöser war

Beim Schreiben der S115-Tests fiel auf, dass `document.querySelector("[data-rec=mail]")`
das falsche Element trifft: Das Verifikations-Bauelement stand **zweimal** im
Dokument, sobald der Pflicht-Screen kam. Die Frage danach war die richtige — ob
sich ein gemeinsames nutzen lässt.

## Was der Befund ergab

**Der Code war nie doppelt.** Es gibt genau ein `baueVerifikation()`; doppelt war
die lebende **DOM-Instanz**. Der Grund stand im Kommentar der betroffenen
Funktion selbst: *„Der Inhalt wird vorbereitet, sichtbar wird er erst beim
Öffnen."* `zeigeRecovery()` baute das Formular beim Boot und versteckte es nur.
Der `aendern`-Zweig zwei Zeilen weiter unten machte es schon immer richtig — er
baut erst beim Klick.

Das war mehr als ein Testärgernis:

* Zwei Formulare halten je ihren eigenen Schritt-2-Zustand und ihr eigenes
  `gesendetAn`. Wer im einen einen Code anfordert und im anderen bestätigt,
  arbeitet an zwei Buchführungen über einen Server-Zustand.
* Jeder Sendeversuch verbraucht einen von fünf Slots im Stunden-Ratenlimit
  (`sys/veriflimit/<code>/<role>`). Zwei Wege zum selben Kanal brennen sie
  doppelt ab.

**Der Rest des Systems ist sauber.** Gemessen, nicht geschätzt — die App im
Testbaum gebootet und alle Klassen und `data-`Marken im lebenden DOM gezählt,
dazu eine mechanische Klonsuche (gleitende 8-Zeilen-Fenster, normalisiert) über
`core/` und `platforms/`:

| Befund | Bewertung |
|---|---|
| `data-rec=mail\|senden\|pin\|ok\|note` je **2×** | die einzigen mehrfachen Marken, die **Zustand** tragen — dieser Sprint |
| Doppelte IDs im Gerüst | **keine** |
| 4× `.rz-weg-badge` / `.rz-weg-panel` | Pro-Screen-Gerüst mit eigenen IDs (`wegStart`/`wegMein`/`wegTeil`/`wegEinst`), leere Hüllen bis zum Öffnen — in Ordnung |
| 6× `data-rz-signatur`, 6× `data-rz-marke`, 6× `.rz-kopf-mitte` | absichtliche Vielzahl, über `querySelectorAll` gesetzt — die Signatur *soll* auf jedem Screen stehen |
| Alle nicht-ID-Selektoren in `core/ui/` | auf einen Screen oder eine Box gescoped, keine zweite Trefferstelle |
| Ein einziger echter Codeklon: `_blockCorrection` / `_blockCorrectionStruktur` in `core/engine/engine.js` (12 Zeilen identisch) | **bewusst nicht angefasst.** Das ist der Struktur-Zwilling des Textpfads, seit ST8 stillgelegt-aber-erhalten. Zusammenlegen hieße, den ruhenden Pfad wieder anzufassen — dafür steht der Kanarienvogel `strukturmodus-ruht.spec.js` |

## Was geändert wurde

### `core/ui/recovery-screen.js`

Der gemeinsame Aufbau ist in `baueRegalFormular(box)` gezogen — eine Stelle für
beide Wege in die Box (Aufklappen bei fehlender Adresse, „Ändern" bei
vorhandener). `zeigeRecovery()` schreibt jetzt nur noch den erklärenden Text und
kehrt um; das Formular entsteht in `oeffneRecovery()`.

`oeffneRecovery()` ist idempotent und macht beides in einem Schritt: sichtbar
schalten und, falls noch keines dasteht, bauen. Die Prüfung ist
`box.querySelector("[data-rec]")` — sie deckt beide Zustände ab, weil der
`aendern`-Knopf selbst eine `data-rec`-Marke trägt. Im hinterlegt-Zustand baut
der Öffner also gar kein Formular; dorthin führt weiterhin der Knopf.

### `core/ui/app.js`

Der Toggle ruft `oeffneRecovery()` statt `classList.remove("pb-hidden")`. Der
alte Kommentar („Der Inhalt steht schon … deshalb kein Nachladen im Toggle")
war nach der Änderung die Unwahrheit und ist ersetzt.

## Tests

| Datei | Was |
|---|---|
| `tests/unit/s116-ein-verifikationsformular.spec.js` (neu) | Fünf Fälle, alle über dieselbe Zählung `document.querySelectorAll('[data-rec=mail]')`: nach dem Start **null** (nur der Text, der es ankündigt); Aufklappen baut **eins**, zweimal Aufklappen kein zweites; mit stehendem Pflicht-Screen genau **eins**, und es gehört dem Screen; mit hinterlegter Adresse baut das Öffnen keines, erst „Ändern"; nach dem Schließen des Screens bleibt es bei einem. |
| `tests/unit/recovery-ui.spec.js` | Drei Tests griffen ins geschlossene Kästchen und bekommen jetzt einen Klick vorweg — so, wie ein Mensch es auch tun müsste. Ein neuer Helfer `oeffneZeile()` macht das lesbar. Im ersten Test steht zusätzlich die Aussage, die vorher fehlte: vor dem Aufklappen ist **kein** Formular da. |

Die U6-Wächter und die beiden S115-Dateien blieben unverändert grün — sie
greifen ohnehin schon ausdrücklich in `#pbEmailPflicht`.

## Abnahme

```
npx vitest run                → 260 Dateien, 2519 Tests, alles grün
PAARE_KV_ID=… npm run build   → Kern d4fc625f9b4ab720
```

## Gegenprobe nach dem Deploy

1. Eigener Raum, Zeile „Zugang wiederfinden" zu ⇒ im DOM steht nur der Text.
2. Aufklappen ⇒ Formular da. Zuklappen, wieder aufklappen ⇒ immer noch eines,
   und der Schritt-2-Zustand ist der von vorhin (die Instanz bleibt, sie wird
   nur versteckt).
3. Frischer Zugang mit Pflicht-Screen ⇒ genau ein Adressfeld im Dokument.

## Was offen bleibt

Nichts aus diesem Sprint. Der Engine-Klon (`_blockCorrection*`) bleibt bewusst
stehen und ist oben begründet — wenn der Strukturpfad je wieder aufwacht, ist er
dort ohnehin Thema.

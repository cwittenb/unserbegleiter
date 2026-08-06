# Sprint L3 — Wiedereinstieg (Turn 46) + Rechtliche Wege

**Quelle:** `Raumzuzweit Design.dc.html`, Abschnitt Turn 46 (46a–46e) · Handover `Turn 46`
**Basis:** `origin/main` @ `a222a17` (`patch-l1a-kreis-nachsatz`)
**Kette:** … → patch-l1 → patch-l1a → **patch-l3**

**Dieser Patch enthält den nie gepushten `patch-l2` (rechtliche Wege) mit** — Entscheidung F1c. L2 entfällt als eigene Lieferung; sein Inhalt steht hier vollständig, weil Turn 46 dieselbe Funktion umbaut.

## Entscheidungen

| | Frage | Entschieden |
|---|---|---|
| F1 | Kette | **c** · ein Patch auf `a222a17`, L2 aufgenommen |
| F2 | Wortlaut-Kollision (§6.2) | **b** · die Landing sagt „Neuen Zugangslink anfordern" |
| F3 | KI-Transparenz auf diesem Screen (§6.4) | **nein** — wer hier landet, hat ein Problem und will es lösen |
| F4 | Die 15 Minuten (§3.6) | **a** · eigenes Modul unter `core/`, von Worker und Client importiert |

---

## Korrektur einer früheren Aussage

Im Sprintplan stand, es gebe **keine Testbindungen** an den alten Wiedereinstieg. **Das war falsch.** `tests/unit/pages-client.spec.js` prüft ihn an vier Stellen — mein Suchmuster hatte die Datei nicht erwischt. Betroffen waren `#recMsg`, der Titel als `h2` und die Zusicherung „Fehlerbox PLUS Wiedereinstieg".

Alle vier sind **mit Begründung im Test** mitgezogen, nicht im Erwartungswert getauscht:

- `#recMsg` ist entfallen — die Quittung schreibt in der Zeile weiter. Die Rückmeldung bei leerer Adresse steht seither im Hinweis (`#recHinweis`). Geprüft wird weiterhin dasselbe Verhalten: leer → keine Anfrage, gefüllt → POST.
- `h2` → `.rz-h1`: der Screen trägt eine eigene Überschrift, keine Unterüberschrift eines fehlenden Titels.
- „Fehlerbox PLUS Wiedereinstieg" → „Lage als Überschrift, Weg darunter". Die **Zusicherung** ist unverändert: keine Sackgasse.

---

## Umsetzung

### Der Umbau (46b/46c)

`zeigeWiedereinstieg()` war der einzige Screen ohne die Bausteine aus `design.js` — alles aus Inline-Styles, in der Formsprache, die Turn 40 abgeschafft hat. Der Grund war nie ein technischer: die Funktion läuft vor `createApp()`, aber `applyDesign(doc)` läuft in `boot()` **davor**.

Neu: `.rz-split` mit zwei Hälften. Oben Papier — was du auf diesem Gerät tun kannst. Unten Tiefgrün — die Bedingung, die nicht bei dir liegt. Die Aussage steht damit zweimal, aber in zwei Rollen: die Zeile oben ist ein **Handgriff**, der Satz unten die **Lage**.

Weggefallen: Karte (`border-radius:14px`), Weichzeichner, Feldrahmen, Vollton-Pille, `#fff` (**Weiß kommt in der Palette nicht vor**), die Streuner 26/14 px, die Beschriftung „E-Mail-Adresse" (steht im Platzhalter) und der Knopftext (mobil trägt ihn der Pfeil, ab 900 px steht er ausgeschrieben).

Die Sprachwahl wird ein Caps-Paar mit den **Sprachnamen** aus `paarspr.name.*` und ist 44 px hoch — im Altstand fehlte das Tapziel vollständig.

### Die zwei Sonderlagen (46d)

**Verbrauchter Link:** keine Fehlerbox. Die Lage wird zur Überschrift (Caps `Einmal-Link` + H1), darunter unverändert die Anforderungszeile. Ein Einmal-Link, der einmal gewirkt hat, ist kein Fehler des Nutzers.

**Quittung:** die Zeile wird nicht ersetzt, sie schreibt in sich weiter — Adresse links in Serif (nicht mehr kursiv: sie ist jetzt Inhalt), rechts `Gesendet` als Caps. Kein deaktivierter Knopf, `recMsg` entfällt.

### Rechtliche Wege (vormals L2)

`core/ui/rechtliches.js` als einziger Ort, der die Adressen kennt. `oeffneExtern()` reicht in der nativen Hülle an den Systembrowser weiter und öffnet **nur** die zwei bekannten Adressen — eine Adresse aus fremder Hand fährt nicht darüber hinaus. Zwei Zeilen in der Tiefgrün-Zone des Einstellungs-Screens (nach der Anmeldung), die untere Zone des Wiedereinstiegs (vor der Anmeldung), und `rechtsFuss()` unter der Fehlerbox — der einzigen Lage ohne untere Zone.

### Die Frist (F4a)

`core/zugang-fristen.js` trägt `RECOVER_MS`; `worker/auth.js` re-exportiert von dort (bestehende Importe bleiben gültig), der Client liest `RECOVER_MINUTEN`. Die Zahl steht als **i18n-Argument** im Text, nie ausgeschrieben — sonst läuft der Wortlaut von der Frist weg, sobald jemand sie ändert.

### Landing-Addon (46e)

Unter dem Signup, getrennt durch Trennlinie und 26 px, damit beide nicht als **ein** Formular gelesen werden. Caps-Kopf `Schon dabei?`, eine Haarlinien-Zeile, ein `rz-fein`-Satz. Externer Übergang mit `rel="noopener"`, **ohne** `target="_blank"`. Dazu `Anmelden` als vierter Fußlink.

Nach **F2b** heißt die Zeile `Neuen Zugangslink anfordern` mit `→` — nicht „Zugang wiederfinden" plus „Neuen Link anfordern →", was dasselbe zweimal gesagt hätte.

---

## Kleine Entscheidungen

1. **`line-height:1.3` → `--rz-lh-sektion` (1.2).** Der Entwurf notiert 24 px/1.3; der T1b-Wächter verbietet rohe Zeilenmaße, und die Skala kennt zu `--rz-fs-sektion` genau ein Zeilenmaß. Der Wächter existiert für diese Sorte Streuner.
2. **Eigene Modifikator-Klasse `.rz-kulisse-vor`** statt `#rzVorZugang .rz-kulisse-naht`. Der Selektor enthielt `.rz-kulisse-naht{` als Teilzeichenkette und brach `u10-designfehler`, das den Regelsatz per `indexOf` schneidet — ein Fehler, der nichts mit Design zu tun hatte.
3. **`wieder.anfordern` bleibt**, `wieder.email` und `wieder.sendet` sind entfernt (kein Knopfzustand mehr). Ein Test hält fest, dass sie auch nicht zurückkommen.
4. **`rechtsFuss()` bleibt für den `fehlerBox`-Pfad.** Auf dem Wiedereinstieg tragen die Rechtslinks die untere Zone; beides nebeneinander wäre eine Dopplung.

## Tests

| Datei | |
|---|---|
| `l3-wiedereinstieg.spec.js` | **neu**, 23 Tests |
| `pages-client.spec.js` | vier Bindungen mit Begründung mitgezogen |
| `l1-7-rechtsseiten.spec.js` | Landing-Fuß jetzt vier Links / drei Ziele; Rechtsseiten bleiben bei drei / zwei |

Der L3-Test prüft die Invarianten aus §5, weil sie der Grund sind, warum dieser Screen heikel ist:

- **Keine Enumeration** — Erfolg, 429 und Netzfehler werden gegeneinander gerendert; die Quittung muss bei allen dreien **identisch** sein.
- Das 429 wird verschluckt; der Test verbietet eine Verzweigung nach Status.
- Der Sprachwechsel nimmt den Fehler-Vorspann mit (auf Englisch geprüft).
- `localStorage` bleibt in `try/catch`.
- Harte Fehler gehen weiterhin in `fehlerBox()`.

Dazu **gerechneter Kontrast** (§7.5): neun Ton/Grund-Paare gegen 4,5:1, plus der Beleg, dass `#a3a894` (2,30:1) nicht zurückkommt.

Ein Testaufbau-Detail, das eine Stunde gekostet hat: `vi.resetModules()` brachte einen zweiten Modulgraphen mit **zweiter i18n-Instanz** mit, deren Sprache nicht die des Tests war — die Erwartungen kamen englisch zurück. Der Test importiert `client.js` jetzt einmal und lässt `boot()` auslaufen.

**Volle Suite grün: 2474 Tests / 257 Dateien.**

## Build

**Kern-Hash `3079590f1d4673f6` → `70b4b066a594eb71`** (nach dem Nachtrag L3a: `10eb4c363a2c4a78`).

## Offen

- **§6.1 · Warnton in der Palette.** `fehlerBox()` hat sich `rgba(188,74,74,…)` selbst gegeben und trägt weiterhin die harten Fehler, für die es keine Anschluss-Handlung gibt. Die Regel aus dem Handover ist umgesetzt (Lage **mit** Weg → Überschrift), die Lage **ohne** Weg braucht einen eigenen Entwurf — erst dann entscheidet sich, ob Rot in die Palette kommt.
- **§6.3 · Store-Anforderungen.** Impressum und Datenschutz sind jetzt ohne Zugang erreichbar. Ob damit alles Verlangte abgedeckt ist oder die App eigene Kopien braucht, ist nicht geprüft.
- **Voraussetzung fürs Deploy:** die drei Landing-Dateien müssen unter `raumzuzweit.de` liegen; die Rechtstexte selbst sind weiterhin Platzhalter (§7.3 aus L1).
- **`API_BASIS`** steht auf `https://app.raumzuzweit.de`, die Testphase läuft auf `de.roomfortwo.app` — vor dem ersten Capacitor-Build zu korrigieren.
- Die eingegebene Adresse geht beim Sprachwechsel verloren (§5) — ausdrücklich eine eigene Verbesserung.

---

# Nachtrag L3a — Nachbesserungen am gebauten Screen

Sechs Punkte nach dem ersten Blick auf den laufenden Wiedereinstieg. Enthalten in `patch-l3`, kein eigener Patch.

| | Änderung |
|---|---|
| Titel | „Kein Zugang auf diesem Gerät." → **„Zugangslink für deinen Account."** (en: „Access Link for Your Account.") — der Screen benennt jetzt den Handgriff statt des Mangels |
| Badge | ist ein `<span>`, sah aber wie ein Knopf aus: `.rz-weg-badge` setzt `cursor:pointer` und steht **später** in `design.js`, gewann also bei gleicher Spezifität. Behoben mit dem Verbundselektor `.rz-weg-badge.rz-badge-bedingung` plus `pointer-events:none` |
| Bedien-Ecke | vor dem Zugang ausgeblendet (`html[data-vorzugang] .rz-ecke{display:none}`); der Startpfad nimmt die Sperre weg, sobald `createApp()` übernimmt. Sie führte ins Leere — es gibt ohne Sitzung keinen Einstellungs-Screen |
| Adressprüfung | **Form** ja, **Existenz** nein. `abc`, `a@b`, `@example.org` bekommen einen Hinweis und lösen keine Anfrage aus. Der Unterschied ist die Nicht-Auskunft: ob eine Adresse hinterlegt ist, bleibt ungesagt; ob „abc" eine E-Mail-Adresse sein *kann*, ist keine Auskunft. Der Ausdruck ist bewusst großzügig — ein zu strenger sperrt gültige Adressen aus, und die echte Prüfung ist ohnehin, ob die Mail ankommt |
| Desktop, Handgriffe | Eingabezeile und Landing-Zeile laufen über die **ganze Spaltenbreite**, samt Haarlinie (`max-width:420px` und `min-width:320px` sind weg). Eine halbbreite Linie mitten in der Spalte las sich als Rahmen eines Kastens |
| Desktop, Sprachwahl | steht jetzt **ganz oben rechts**, also in der Tiefgrün-Spalte |
| Desktop, Spiegelung | links sitzt der Inhalt **oben** unter der Wortmarke, rechts **unten** über dem Rechtsfuß. Die Tiefgrün-Hälfte hält dafür `--rz-kulissenfrei` frei (§4.3: kein Text in den unteren 96 px) |

**Zur Sprachwahl:** sie steht zweimal im Markup, je Breite ist genau eine sichtbar. Ein Element kann nicht zwischen zwei Flex-Containern wandern, und `display:none` nimmt die verdeckte Fassung auch aus dem Bedienbaum. Dieselbe Lösung tragen die zwei Embleme der Landing.

**Tests:** sieben neue in `l3-wiedereinstieg.spec.js` (30 statt 23). Die Adressprüfung wird mit vier ungültigen und drei ungewöhnlichen gültigen Formen geprüft — `vor.nach+tag@sub.example.org` muss durchkommen.

**Volle Suite: 2481 / 257 grün.** Kern-Hash `70b4b066a594eb71` → `10eb4c363a2c4a78`.

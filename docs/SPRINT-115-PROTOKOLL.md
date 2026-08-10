# Sprint S115 · Zugang sichern beim Eintritt

**Basis:** `origin/main` @ `0d8c31e` (`patch-s114ij-kopfzeile-und-wegweiser-sperre`)
**Kern-Hash nach dem Sprint:** `4c3fa57d74086dc5`
**Entscheidungen:** F1 = a (kein regulärer Ausweg, der Screen bleibt Pflicht) ·
F2 = b (alle ohne bestätigte Adresse, nicht nur Neuzugänge) · F3 = b
(In-App-Notausgang bei nachgewiesener Versandstörung) · K1 = SMTP produktiv
verifiziert, `EMAIL_KEY` gesetzt.

**Zur Entstehung:** Dieser Sprint ist aus zwei parallelen Läufen
zusammengeführt. Der erste hatte die Bedingung (Teil A) unter der Annahme
F3 = a fertig; der zweite hatte das Aussehen (Teil B) und die korrigierte
Antwort F3 = b. Zusammengelegt ist es ein Sprint, weil Teil A ohne Teil C den
Zugang bei Mail-Störung zusperrt und Teil B ohne Teil A nie sichtbar würde.

---

## Was der Auslöser war

Wer per Magic-Link in der App landet, sollte sofort auf den Screen kommen, auf
dem er seine Adresse hinterlegt — sonst hängt sein Zugang an einem einzigen
Cookie, und mit dem Gerät ist der Raum weg.

## Was der Code-Befund ergab

**Der Screen war fertig gebaut und wurde nie gezeigt.**

`zeigeEmailPflicht()` in `core/ui/recovery-screen.js` gibt es seit S45: kein
Schließen-Knopf, keine Bedien-Ecke, Fokusfalle, zweistufig (Adresse →
6-stelliger Code), Texte in de und en, bewacht von
`tests/unit/u6-pflicht-vollbild.spec.js`. Der Auslöser in `core/ui/app.js`
(`boot`) ist ebenfalls seit S45 richtig verdrahtet.

Die Bedingung hing an `emailRequired` aus `/api/me`, und das war eine reine
Durchreichung der Umgebungsvariablen `EMAIL_PFLICHT`. Die war aus — mit gutem
Grund zum Zeitpunkt ihrer Einführung (D2b: den Screen erst scharf schalten, wenn
der Mailversand verifiziert ist). Seither ist er verifiziert, und die Variable
blieb aus. Ein Sicherheitsnetz, das eingebaut ist und nicht hängt.

Erschwerend: `wrangler.toml` ist generierte Ausgabe (`scripts/build-pages.js`)
und enthält **keinen** `[vars]`-Block. `EMAIL_PFLICHT = "1"` hätte nach jedem
Build von Hand nachgetragen werden müssen — eine Einstellung, die genau einmal
vergessen wird und dann still das Netz abschaltet.

**Zweiter Befund — das Aussehen.** Der Screen stammt aus Turn 41 und ist damit
älter als die Zweiteilung: eine einzige tiefgrüne Fläche mit einer 520px-
Lesespalte. Jeder andere Screen der App ist seit D1/T2d ein `.rz-split` aus
Papier-Hälfte und Tiefgrün-Hälfte. Der Pflicht-Screen war der letzte Ort mit der
alten Sprache — und ausgerechnet der, den manche als **ersten** Screen der App
überhaupt sehen.

---

## Was geändert wurde

### Teil A · Die Bedingung — aus dem Einschalter wird ein Notaus

`platforms/cloudflare/worker/index.js` (`/api/me`):

```js
// vorher — fail-open: ohne Variable kein Netz
emailRequired: env.EMAIL_PFLICHT === "1" || …

// jetzt — fail-closed: nur ein ausdrückliches "0" hängt die Pflicht aus
emailRequired: !(env.EMAIL_PFLICHT === "0" || env.EMAIL_PFLICHT === "false" || …)
```

Die Richtung ist der Punkt. Ein vergessenes Deploy-Var darf nicht das
Sicherheitsnetz abschalten; es darf höchstens eines zu viel spannen.

Warum **kein** Marker „ist gerade über einen Magic-Link eingetreten" (der Weg
aus dem ursprünglichen Plan): F2 = b hat ihn überflüssig gemacht. Wenn ohnehin
jeder ohne bestätigte Adresse geführt wird, braucht es keine Unterscheidung
zwischen Neuzugang und Bestand — und keinen zusätzlichen KV-Schlüssel, der
gepflegt werden will. Der Wiedereinstiegs-Pfad läuft dabei ohne Sonderfall ins
Leere: wer über einen Wiedereinstiegs-Link kommt, hat per Definition eine
bestätigte Adresse, `recoveryEmail` ist wahr, kein Screen.

`scripts/build-pages.js`: Der alte Betriebshinweis („`EMAIL_PFLICHT = "1"` erst
setzen, wenn …") hätte nach der Umkehrung ins Gegenteil geführt — jemand setzt
`"1"` in dem Glauben, damit etwas einzuschalten, und merkt nie, dass `"0"` das
einzige ist, was noch wirkt. Der Text beschreibt jetzt den Normalfall, den
Notaus und den In-App-Ausgang aus Teil C.

### Teil B · Das Aussehen — Zwei-Zonen statt Vollfläche

`core/ui/recovery-screen.js` (`zeigeEmailPflicht`) und `core/ui/design.js`.

Der Screen bleibt, was er ist: `position:fixed`-Overlay über der App, Rolle
`dialog`, `aria-modal`, Fokusfalle, Bedien-Ecke stillgelegt. Nur sein Inneres
wechselt von der Lesespalte auf die Zweiteilung:

```
#pbEmailPflicht  (fixed, inset:0, z-index 1000)
└── .rz-split
    ├── .rz-half.rz-papier      Signatur (zwischen zwei blinden Pfeilen),
    │                           rz-h1 Titel, rz-sub Text
    └── .rz-half.rz-tiefgruen   Adresse → Code → bestätigen,
                                rz-fuss (Platz des Notausgangs), Wortmarke
```

Vier Entscheidungen dahinter:

1. **Das Formular steht unten, im Tiefgrün.** In der ganzen App ist die untere
   Zone die handelnde: dort liegen die Betreten-Zeilen, und `.rz-feld` wie
   `.rz-zeile` haben ihre grünen Fassungen bereits. Oben steht, worum es geht;
   unten tut man es.
2. **Titel ist `rz-h1` statt `rz-h2`.** Die Papier-Hälfte trägt in jedem Screen
   die H1; ein H2 wäre hier eine Sonderregel ohne Grund.
3. **Kein Wegweiser-Badge, kein Naht-Aufbau.** Die Begründung von Turn 41 gilt
   unverändert: der Wegweiser nennt einen Ort, und hier ist noch keiner
   betreten. Die Naht bleibt an dieser einen Stelle unbesetzt.
4. **Kein Zurück-Pfeil im Kopf**, sondern zwei blinde Platzhalter wie auf
   `scrStart`. Sie halten die Signatur mittig, ohne einen Ausgang zu zeichnen,
   den es nicht gibt.

Im Stylesheet sind aus zwölf Zeilen zwei geworden. `#pbEmailPflicht` trägt jetzt
**keine** eigene Farbe, kein `max-width`, kein `padding` — alles Sichtbare erbt
er von `.rz-split`/`.rz-half`. `.rz-pflicht-spalte` ist ersatzlos entfallen. Das
ist der eigentliche Gewinn: ein Sonderfall weniger, der driften kann.

### Teil C · Der Notausgang bei gestörtem Versand (F3 = b)

Aus Teil A folgt eine neue Abhängigkeit: Wenn die Pflicht der Normalfall ist,
hängt der Zugang **aller** Menschen ohne Adresse am Mailversand. Steht der, ist
die App zu, und der einzige Ausweg läge beim Betreiber — der die Störung erst
einmal bemerken müsste.

`core/ui/recovery-screen.js` macht deshalb nach dem **zweiten** gescheiterten
Sendeversuch eine Zeile im Zonenfuß auf, die in die App führt. Der Griff ist
absichtlich schwer zu ziehen:

* **Gezählt wird nur `mail_failed` (502).** `email_invalid`, `email_taken` und
  `verify_rate` sagen etwas über die *Eingabe* aus, nicht über den *Kanal* —
  sonst stünde der Ausgang nach zwei Tippfehlern da und die Pflicht wäre keine.
* **Erst beim zweiten Fehlschlag.** Einer kann ein Zucken sein; zwei sind eine
  Lage.
* **24 Stunden, je Gerät** (`localStorage`, `pb.mailnotaus`). Ohne Frist wäre er
  ein stiller Dauer-Ausstieg; ohne Gedächtnis müsste man ihn bei jedem Start neu
  erzwingen — zwei Fehlversuche bei jedem Öffnen der App. `localStorage` und
  nicht `pstate`, weil er auch dann tragen soll, wenn der Server gerade nicht
  alles kann.
* **Er wird nicht vorgehalten und ausgeblendet, sondern entsteht erst, wenn er
  gilt.** Ein ausgegrauter Ausgang wäre ein Versprechen auf halbem Weg.

Der Weg zur Adresse bleibt in dieser Zeit offen: die Regal-Zeile im eigenen Raum
war nie weg. `core/ui/app.js` (`boot`) fragt `notausAktiv()` mit ab.

### Texte

Zwei neue Schlüssel in `de` und `en`: `rec.pflicht.stoerung` (warum der Ausgang
da ist — „Das liegt an uns, nicht an dir", mit der Bitte, es nachzuholen) und
`rec.pflicht.notausgang` (die Zeile selbst).

---

## Tests

| Datei | Was |
|---|---|
| `tests/worker/recover.spec.js` | Der Flag-Test auf neuer Semantik: ohne Variable ⇒ `true`; `"0"` ⇒ `false`; `"1"` ⇒ weiterhin `true`; nach bestätigter Adresse bleibt `emailRequired` wahr — es entscheidet dann `recoveryEmail`. |
| `tests/unit/s115-eintritt-fuehrt-zur-adresse.spec.js` (neu) | Vier Fälle um die Frage *wann*: ohne Adresse steht der Screen da (am `body`, Fokus im Adressfeld, Startseite fertig dahinter); mit Adresse kommt nichts dazwischen; ohne `backend.recovery` (Artefakt) bleibt der Weg frei — eine Tür ohne Klinke wäre schlimmer als keine; bestätigte Adresse räumt ab und lässt die Regal-Zeile mit Status zurück. |
| `tests/unit/s115-notausgang-versandstoerung.spec.js` (neu) | Zehn Fälle um den Griff, davon vier Negativ-Fälle als eigentliche Aussage: ein einzelner Fehlschlag, `email_invalid`, `email_taken` und `verify_rate` öffnen ihn **nicht**. Dazu: er entsteht genau einmal; er steht in der grünen Zone im Fuß; er führt in die App und lässt die Regal-Zeile stehen; nach 24 h greift er nicht mehr; der Boot fragt ihn ab. |
| `tests/unit/u6-pflicht-vollbild.spec.js` | Umgeschrieben, nicht gelöscht. Die zwei Aussehen-Tests wechseln den Gegenstand: statt „die ganze Fläche ist Tiefgrün" jetzt „der Screen bringt kein eigenes Aussehen mit — er erbt von der Zweiteilung". Neu: zwei Zonen in richtiger Ordnung, kein `.rz-auf-naht`, zwei blinde Pfeile im Kopf. Unverändert: kein Badge, keine Bedien-Ecke, `role=dialog`, Signatur oben + Wortmarke unten, Fokus im Adressfeld, Fokusfalle sammelt bei jedem Tab neu. |
| `tests/unit/build.spec.js` | Der generierte `wrangler.toml` nennt `EMAIL_PFLICHT` als Notaus, nicht als Einschalter. Geprüft wird die Richtung, nicht der Wortlaut. |

**Eine Falle, die beim Schreiben der Tests auffiel** und hier festgehalten
gehört: Das Verifikations-Bauelement existiert **zweimal** im Dokument — einmal
in der aufgeklappten Regal-Zeile, einmal im Pflicht-Screen. Beide tragen
dieselben `data-rec`-Marken (deshalb gibt es dort bewusst keine IDs). Ein
`document.querySelector("[data-rec=…]")` trifft die **Regal**-Fassung zuerst,
weil sie im App-Baum steht und der Screen am `body` hängt. Tests, die den Screen
meinen, müssen ausdrücklich in `#pbEmailPflicht` greifen — sonst prüfen sie
grün am falschen Objekt vorbei.

## Abnahme

```
npx vitest run                → 259 Dateien, 2514 Tests, alles grün
PAARE_KV_ID=… npm run build   → Kern 4c3fa57d74086dc5
```

## Gegenprobe nach dem Deploy

1. Frisches Paar über `/admin.html` anlegen, Link im privaten Fenster öffnen
   ⇒ „Sichere zuerst deinen Zugang" steht sofort da, in zwei Zonen: oben Papier
   mit Signatur und Titel, unten Tiefgrün mit dem Feld. Auf dem Desktop
   nebeneinander, mobil gestapelt.
2. Seite neu laden ⇒ der Screen kommt wieder (er hängt an der Adresse, nicht an
   einem Moment).
3. Adresse eingeben, Code aus der Mail bestätigen ⇒ Screen weg, Regal-Zeile
   meldet „hinterlegt", Reload bleibt frei.
4. Bestandszugang mit hinterlegter Adresse ⇒ unverändert, kein Screen.
5. Notausgang: SMTP-Secret vorübergehend verstellen, zweimal senden ⇒ nach dem
   zweiten Versuch steht „Ohne Adresse weiter" im grünen Fuß; danach 24 h lang
   kein Screen mehr auf diesem Gerät, aber die Regal-Zeile führt hin.

## Was offen bleibt

* **Bestandszugänge ohne Adresse** werden ab diesem Deploy beim nächsten Start
  zum Screen geführt. Das ist die Absicht (F2 = b), aber es trifft Menschen
  mitten in der Testphase ohne Vorwarnung. Eine kurze Nachricht vorab wäre
  freundlicher als die Überraschung.
* **Die Versandstörung merkt niemand automatisch.** Der In-App-Ausgang (Teil C)
  fängt die Person auf, aber er meldet nichts nach oben. `wrangler tail` auf
  `verify-mail:` bzw. `mail_failed` bleibt der einzige Weg, von einer Störung zu
  erfahren — ein Zähler im Worker wäre der nächste Schritt, wenn das öfter
  vorkommt.
* **`EMAIL_PFLICHT = "0"`** bleibt als Betreiber-Griff für den längeren Ausfall
  bestehen. Setzen, Störung beheben, wieder entfernen — er gehört nicht in den
  Dauerbetrieb.

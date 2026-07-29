# Sprint U5 · Der Wiedereinstieg in der Turn-40-Sprache (Turn 41 §1.3, §2, §5.2–5.4)

Basis: `origin/main` @ `094358b` (U4 gemergt) · Kern-Hash nach Patch: `4fb1e8e2f34b1595`
Suite: 1897 grün (Basis 1897 — vier Tests kamen dazu, vier wanderten oder entfielen)

Umgesetzt ist die **Komponente**, nicht der Screen. Warum das eine sinnvolle Grenze ist, steht in §7.

---

## 1 · §2 · Felder und Knöpfe

`baueVerifikation` trug alles selbst: Rahmen `#cfd8e0`, Radius 9 px, `display:none`-Schaltungen,
`.pb-btn primary`. Nach diesem Patch steht dort **kein einziger Gestaltungswert** mehr.

| Ist | Neu |
| --- | --- |
| `border:1px solid #cfd8e0`, `border-radius:9px` | `.rz-feld` — die Feldkante aus U1: Haarlinie unten, Radius 0 |
| Code-Eingabe mit `letter-spacing` inline | `.rz-feld-code` |
| `.pb-btn primary` | `.rz-zeile.rz-knopf-flach` mit Pfeil, 44 px |
| „Adresse ändern" als `.pb-btn` | ebenfalls Hairline-Zeile |

Damit ist `recovery-screen.js` frei von Hex-Werten. Der Schleier des Pflicht-Modals
(`rgba(20,26,34,.55)`) steht noch — er fällt mit U6, weil §1.2 ihn ersatzlos streicht.

---

## 2 · §5.2 · Der Ablauf führt jetzt

Adresse → Code → bestätigt sind drei Zustände, aber der Screen zeigte immer nur, was gerade da war.
Statt eines Steppers führt das **Zonen-Label** über dem Feld:

> `Deine Adresse` → `Der Code aus der E-Mail`

Zwei Schritte, beide sichtbar. Caps-Label statt Fortschrittsbalken — dasselbe Mittel, mit dem die
Zonen sonst benannt werden.

---

## 3 · §5.4 · Der Screen springt nicht mehr

`pin` und `ok` wurden per `display:none` ein- und ausgeblendet und verschwanden bei
`pin_expired` / `pin_tries` wieder. Der Screen sprang dabei in der Höhe — im Pflicht-Vollbild wäre
das eine große Bewegung, ausgerechnet in dem Moment, in dem etwas schiefgegangen ist.

Jetzt bleibt Schritt 2 stehen und wird **stummgeschaltet**: `aria-disabled` am Block, `disabled` an
Feld und Knopf, `opacity:.45`, `pointer-events:none`. Der Ablauf bleibt sichtbar — man sieht, was
noch kommt.

---

## 4 · §5.3 · Ein Fehler sieht nicht mehr aus wie eine Zusage

`note` war ein einziger `<span>` für beides: „Code ist unterwegs an …" und `fehlerText(e)` landeten
im selben Element und in derselben Farbe.

Getrennt wird jetzt über **zwei** Wege, nicht nur über den Ton:

- **Rolle:** `role="status"` für Bestätigungen, `role="alert"` für Fehler. Das entscheidet, ob eine
  Vorlesestimme unterbricht — bei einem Fehler soll sie das.
- **Ton:** neues Token `--rz-warn`, hell `#8c3a2b` (7.18 : 1 auf Papier), dunkel `#e8ab99`
  (7.43 : 1). Beide halten auch auf der abgehobenen Fläche aus U2 über 4.5 : 1.

---

## 5 · §1.3 · Eine Zeile, die aufklappt

`boxRecovery` hing als `.rz-regal-inhalt` **ohne eigene Zeile** im Regal des eigenen Raums — es
stand einfach da. Jetzt gibt es `#btnRecovery`, eine `.rz-zeile` wie „Meine Zeitleiste", und der
Inhalt klappt darunter auf.

**Damit fällt eine Ausnahme weg, die es nur wegen dieser Bauart gab.** An zwei Stellen war
`boxRecovery` ausgenommen:

```js
const REGAL_OFFEN = ".rz-regal-inhalt:not(.pb-hidden):not(#boxRecovery)";   // D9-Vollbild
… if (g !== box && g.id !== "boxRecovery") g.classList.add("pb-hidden");    // immer nur EINE Box
```

Beide Ausnahmen existierten, weil der Wiedereinstieg dauerhaft offen dastand und den Raum sonst
dauerhaft ins Vollbild gezwungen hätte. Mit einer eigenen Zeile ist er nur offen, wenn jemand ihn
öffnet — die Ausnahmen sind ersatzlos entfallen. **Eine Sonderregel weniger im System, und zwar
nicht durch Aufräumen, sondern weil ihr Grund verschwunden ist.**

---

## 6 · Der Farbwächter fand zwei Stellen, die niemand gesucht hat

Beim Aufräumen wurde `recovery-screen.js` hex-frei — und die **Sperrklinke aus T3-1 wurde rot**:
sie verlangte, dass die Datei aus der Ausnahmeliste verschwindet. Beim Nachsehen stand dort aber
noch ein `rgba(20,26,34,.55)`.

**Der Wächter suchte nur Hex-Werte.** Ein `rgba()` ist genauso eine Farbe. Nach der Erweiterung
(`rgba`/`hsl`) kamen zwei Fundstellen ans Licht, die vorher unsichtbar waren:

| Ort | Was | Warum es zählt |
| --- | --- | --- |
| `design.js` · `.pb-err` | `rgba(188,74,74,.12/.34)` | Rohes Rot für die Fehlerfläche — genau die Rolle, für die es seit diesem Patch `--rz-warn` gibt |
| `design.js` · `.pb-lz` | `box-shadow:0 1px 2px rgba(0,0,0,.18)` | Ein Schatten an der Lesezeichen-Fahne. Schatten kommen in der Turn-40-Sprache nicht vor — dasselbe, was in U0 an der Update-Pille entfallen ist |

Beide sind ein eigener Schritt und stehen als benannte Ausnahme mit Merkposten.

**Eine dritte Fundstelle ist eine berechtigte Ausnahme:** `client.js` rendert den
Boot-Fehlerkasten mit einem Inline-Style. Das ist richtig so — er muss erscheinen, **bevor** das
Stylesheet der App existiert. Ein Kasten, der nur mit dem Stylesheet aussieht, wäre genau dann
unsichtbar, wenn er gebraucht wird. Steht jetzt mit dieser Begründung in der Liste.

**Zwei Listen statt einer:** Hex gilt für **alle** Dateien (die Liste ist leer und soll leer
bleiben), Farbfunktionen haben ihre eigene, kurze Ausnahmeliste. Sonst würde eine breite Ausnahme
für `rgba` auch neue Hex-Werte durchlassen.

---

## 7 · §5.5 geht nicht — und der Grund ist interessant

§5.5 will, dass „Adresse ändern" die hinterlegte Adresse maskiert vorbelegt (`c…n@postfach.de`),
weil für „auch für ein zweites Gerät" genau das die Frage ist.

**Der Client kennt die Adresse nicht.** `state.info.recoveryEmail` ist ein **Boolean**:

```js
export async function hasRecoveryEmail(kv, code, role) {
  const e = await J(kv, emailForKey(code, role));
  return !!(e && e.verified);
}
```

Und im KV liegt sie **verschlüsselt** — `{ hash, at, verified, enc }`, wobei `enc` das Ergebnis von
`verschluessele(emailKey, clean, emailAad(code, role))` ist. Der Hash dient dem Lookup, nicht der
Anzeige.

Das ist also keine UI-Frage, sondern eine Architekturfrage: entweder entschlüsselt der Worker bei
**jedem** Info-Aufruf — genau das, was die Verschlüsselung verhindern soll — oder er legt bei der
Bestätigung eine maskierte Form neben den Chiffretext.

**Zu entscheiden.** Ohne Antwort bleibt „Adresse ändern" wie es ist: ein leeres Feld.

---

## 8 · Angepasste Bestandstests

- **`recovery-ui.spec.js`** · vier Assertions auf `style.display` sind auf `disabled` und
  `aria-disabled` umgestellt (§5.4), zwei prüfen zusätzlich die Rolle des Hinweises (§5.3). Neu:
  ein Test, dass der Wiedereinstieg eine Zeile ist, die aufklappt.
- **`d9-regal-vollbild.spec.js`** · der Test „der Wiedereinstiegs-Hinweis zwingt den Raum NICHT ins
  Vollbild" ist entfallen. Er hielt eine Ausnahme fest, die es nicht mehr gibt. An seiner Stelle
  steht ein Kommentar, der sagt warum und wohin die Prüfung gewandert ist — ein gelöschter Test
  ohne Notiz sieht später aus wie ein Versehen.
- **`t1b-theme.spec.js`** · Farbsuche erweitert, zwei Ausnahmelisten statt einer.

> **Was in happy-dom nicht prüfbar war:** dass das Vollbild beim Schließen der Zeile
> zurückgenommen wird. Der Weg ist derselbe wie bei den übrigen Regal-Zeilen und braucht ein
> Layout (FLIP-Messung), das die Testumgebung nicht liefert. Geprüft wird deshalb, was zählt:
> die Zeile öffnet und schließt, statt dass der Inhalt von selbst dasteht. Das Vollbild-Verhalten
> selbst deckt `d9-regal-vollbild.spec.js` an den anderen Zeilen ab.

---

## 9 · Prüfliste für die Sichtprüfung (Stufe B)

| # | Was | Wo |
| --- | --- | --- |
| 1 | „Zugang wiederfinden" ist eine Zeile im Regal und klappt auf wie „Meine Zeitleiste" | Raum für mich, hell + dunkel |
| 2 | Beim Öffnen schließt sich die Zeitleiste, falls sie offen war | dieselbe Stelle |
| 3 | Adressfeld: Haarlinie unten, kein Rahmen, kein Radius; Tippen verstärkt die Linie | dieselbe Stelle |
| 4 | Über dem Feld steht „Deine Adresse"; nach dem Senden „Der Code aus der E-Mail" | Ablauf durchspielen |
| 5 | **Schritt 2 steht von Anfang an da und ist blass — der Screen springt nicht** | dieselbe Stelle |
| 6 | **Ein Fehler (falscher Code) ist rot und sieht anders aus als „Code ist unterwegs"** | falschen Code eingeben |
| 7 | Beides auch im dunklen Theme lesbar | dito |
| 8 | „Adresse ändern" öffnet den Ablauf erneut, als Hairline-Zeile mit Pfeil | mit hinterlegter Adresse |

Punkt 5 und 6 sind die eigentlichen Abnahmen — das waren die zwei Findings, die man nur im Ablauf
sieht.

---

## 10 · Was offen bleibt

- **§5.5** · maskierte Adresse — siehe §7, Architekturfrage.
- **§5.1 und der Einstellungs-Screen.** Turn 41 setzt in §1.3 („Einstellungs-Regal") und §5.1
  („der Wegweiser heißt Einstellungen") einen eigenen Screen voraus. Heute sind die Einstellungen
  ein Ausklapp-Blatt aus der Bedien-Ecke mit drei Gruppen — Ansicht, Sprache, Verlauf. **Was aus
  diesen dreien wird, sagt der Handover nicht.** Deine Antwort klärt die Navigation (öffnen wie
  bisher, Zurück-Pfeil oben wie in den Räumen), aber nicht den Inhalt: bleiben die drei Gruppen
  Wahl-Knöpfe, oder werden sie Regal-Zeilen? Das ist **U7** und braucht eine Designvorlage.
  Bis dahin wohnt der Wiedereinstieg dort, wo er ist — im Regal des eigenen Raums, jetzt als Zeile.
- **`.pb-err` und `.pb-lz`** · siehe §6, eigener Schritt.
- **U6 · Pflicht-Vollbild** (41e, 41f) — benutzt dieselbe Komponente und ist damit vorbereitet.
  Mit ihm fällt `recovery-screen.js` aus der letzten Ausnahmeliste.

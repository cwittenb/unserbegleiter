# Sprint L4 — Landing: drei Bildschirme, gespiegelte Spalten, zwei Texte

**Basis:** `origin/main` @ `af92dc3` (`patch-l3a-wiedereinstieg-feinschliff`)
**Kette:** … → patch-l3 → patch-l3a → **patch-l4**
**Umfang:** nur `platforms/cloudflare/landing/index.html` — die App bleibt unberührt.

## Was sich ändert

### Drei Bildschirme statt einer durchlaufenden Seite

| Bildschirm | Inhalt |
|---|---|
| 1 | Die Zweiteilung — zwei Spalten, Badge auf der Naht |
| 2 | Das Emblem mit dem Text darunter |
| 3 | Die Struktursätze und die Einladung |

Jeder Abschnitt nimmt `min-height:100dvh`. **`dvh`, nicht `vh`** — auf dem Handy zählt die Browserleiste mit, sonst steht die Naht unter dem Falz. Und **`min-height`, nicht `height`**: längerer Text darf wachsen, statt abgeschnitten zu werden.

Struktursätze und Einladung teilen sich den dritten Bildschirm. Sie stehen in einer neuen Klammer `.rz-abschluss`; die Einladung nimmt mit `flex:1` den Rest, die Sätze brauchen nur ihre Zeilenhöhe. Getrennt gelesen verlieren beide: die Sätze tragen die Zusage, die Eingabe zieht die Folgerung.

Der Fuß bleibt ein schmaler Streifen hinter dem dritten Bildschirm — er ist keine Aussage, sondern Nachweis.

### An der Naht gespiegelt

Auf dem Desktop steht der Text links **oben** unter der Wortmarke, rechts **unten** über dem Wegweiser. Das Badge auf der Naht ist die Achse. Mobil bleibt es beim gestapelten Aufbau — dort gibt es keine Spalten, an denen sich spiegeln ließe.

Eine Stolperstelle dabei: die Wortmarke trug mobil `margin-bottom:auto`, um den Text nach unten zu schieben. Zusammen mit dem neuen `margin-bottom:auto` am Textblock hätten sich **zwei auto-Ränder den Platz geteilt** und den Block wieder in die Mitte gestellt. Auf dem Desktop fällt der Rand der Wortmarke deshalb weg. Dasselbe beim Wegweiser: er hängt jetzt am Text darüber (`margin-top:16px`) statt am Rest des Platzes — die 56 px halten ihn weiterhin aus den 96 px der Kulisse heraus.

### Zwei Texte

**Hero links.** Die Begleitung wird an ihren Handgriffen benannt statt an ihrer Verfügbarkeit („zuhört, spiegelt, nachfragt, Impulse gibt"), und aus dem passiven „Du entscheidest, was den Raum verlässt" wird die aktive Form. Die KI-Nennung (44e, Tonlage B) steht unverändert in der Mitte des Absatzes — ein Test hält das fest.

**Hero rechts.** „Begleitete Qualitätszeit, begleitete Begegnung — für alles, was ihr miteinander erleben und teilen wollt." Das Wort *begleitet* steht jetzt auch auf der gemeinsamen Seite; vorher trug nur die linke Hälfte es.

## Kleine Entscheidungen

1. **Zwei Korrekturen am gelieferten Wortlaut.** „teilen was Du möchtest" → „teilen, was du möchtest": Komma vor dem Nebensatz, und kleingeschriebenes *du* wie überall sonst auf der Seite („was du bewusst auswählst"). Beides Tippfehler gegen die eigene Hausform, keine inhaltliche Änderung — wenn du das anders siehst, ist es eine Zeile.
2. **Der Fuß bleibt außerhalb der dritten Klammer.** Ihn hineinzunehmen hätte exakt drei Bildschirme ergeben, aber die Einladung nach oben gedrückt. Ein Nachweis-Streifen am Ende ist die geringere Störung.

## Tests

`l1-2-hero-und-kulisse.spec.js`: die 560-px-Zusicherung mit Begründung mitgezogen (die mobilen Mindesthöhen 400/360 bleiben als Untergrenze), dazu zwei neue — drei bildschirmhohe Abschnitte, und die Spiegelung samt der auto-Rand-Falle. Ein Wächter verbietet `100vh`.

`l1-6` und `l1-8`: beide neuen Texte im Wortlaut, plus die Zusicherung, dass die abgelösten Formulierungen verschwunden sind und die KI-Nennung erhalten bleibt.

**Volle Suite grün: 2484 Tests / 257 Dateien** (vorher 2481).

## Build

Die Landing liegt außerhalb des Kerns — **Kern-Hash unverändert `10eb4c363a2c4a78`**.

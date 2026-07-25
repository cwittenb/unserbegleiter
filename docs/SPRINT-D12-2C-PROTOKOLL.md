# Sprint D12-2c — Der Chat gehört seinem Raum

**Design-Track D12-2c** (Basis: patch-d12-2b) · Kette: … → patch-d12-2a → patch-d12-2b → **patch-d12-2c**

Nachtrag zu Turn 27: die zwei Punkte, die der Entwurf offenließ, weil er in 27e nur den privaten Raum zeigt.

## 1 · Der gemeinsame Chat trägt die Töne seines Raums

Bisher war die Chat-Fläche in beiden Räumen Papier — man verließ den Vorraum „Raum für uns" in Tiefgrün und landete auf Weiß. Das Ortsbadge sagte zwar, wo man war, aber die Fläche widersprach ihm.

Jetzt bekommen die beiden Chat-Zonen **dieselben Klassen wie die Vorräume**: oben `rz-tiefgruen` (statt `rz-papier`), an der Schreibkante `rz-regal-dunkel` (statt `rz-regal`). Das ist der ganze Trick — damit greifen alle bestehenden Regeln ohne Doppelpflege: `.rz-tiefgruen .rz-signatur`, `.rz-regal-dunkel .rz-fussmarke`, `.rz-tiefgruen .rz-zurueck`, `.rz-knopf-flach`, `.rz-sub`. Neu geschrieben werden musste nur, was der Chat allein hat: die Flächen selbst, die Begleitungs- und Nutzerinnenstimme, Sprecherlabel und Sessionname, Composer-Text und -Platzhalter, Skala-Rahmen, Panel-Linien, Pfeile und das Sende-Quadrat.

**Die eigene Stimme auf Tiefgrün** bekommt einen eigenen Token: `--rz-nutzer-auf-gruen:#c4d8ab`. `--rz-nutzer` (#41562c) ist ein dunkles Grün, das auf Papier den Gegenpol zur Serif-Begleitung bildet und auf Tiefgrün unlesbar würde. #c4d8ab ist kein neuer Wert im System — es ist genau der Ton, den `--rz-nutzer` in der Dunkel-Fassung ohnehin trägt, und er hält denselben Abstand zur Begleitung: heller, Sans, rechtsbündig.

Das Sende-Quadrat behält den Akzent als Fläche und bekommt `--rz-tiefgruen` als Zeichenfarbe (die Regel existierte bereits für die Dunkel-Fassung).

Getragen wird das von einer Klasse `rz-chat-gemeinsam` an `#scrChat` (für die Fläche außerhalb der 640-px-Spalte auf dem Desktop) plus den Zonenklassen. `CHAT_HTML(gemeinsam)` kennt den Raum jetzt beim Bauen; der Abbau nimmt die Klasse wieder mit, damit die nächste Einzelsession nicht in fremder Farbe startet.

## 2 · Beide Chats bekommen eine Kulisse

D6 hatte dem Chat die Kulisse verwehrt — mit gutem Grund für den damaligen Stand: es gab dort keinen Ort für sie. Die Kulisse hängt in dieser Sprache immer an einer Kante (Naht oder Zonenfuß), und der Chat hatte keine. Mit D12-2b hat er eine Naht bekommen.

**Sie sitzt auf der Naht**, im Halter `#kulisseChat` in der unteren Zone — genau wie auf der Startseite. *Das war eine kleine Eigenentscheidung.* Der Zonenfuß wäre die Analogie zu den Vorräumen gewesen, aber dort ist die untere Zone das dünn besetzte Regal, im Chat ist sie die Schreibkante mit Composer, Ausgängen und Marke. Silhouetten hinter der Tastatur sind kein leiser Rand mehr. Über der Naht liegt dagegen das untere Ende des Verlaufs — meist leerer Raum. Wenn du sie lieber unten hättest, ist es eine Zeile.

**Sie wächst nicht als dritter Garten.** Die Einzelsession liest den persönlichen Zähler (`pstate`), die gemeinsame den geteilten (`bstate`) — dieselben Zähler wie „Raum für mich" und „Raum für uns". Der Chat ist kein eigener Ort, er ist die Innenseite eines vorhandenen; ein eigener Startzeitpunkt hätte ihn zu einem zweiten Garten für denselben Raum gemacht. In `aktualisiereKulisse` ist das eine erweiterte Bedingung, kein neuer Zweig.

Gezeichnet wird beim Betreten, still und fire-and-forget (`ladeLage().then(…).catch(() => {})`) — die Kulisse darf einen Sessionstart unter keinen Umständen aufhalten, und sie ist bereits in sich fehlertolerant. Der Halter lebt in der Vorlage; ist die Fläche beim Eintreffen der Antwort schon wieder abgebaut, greift der bestehende `if (!halter) return`.

## Tests

Neu: `tests/unit/d12-2c-chat-raumtoene-kulisse.spec.js` (11):

- **Töne:** Einzelsession bleibt Papier, gemeinsame Session trägt Tiefgrün oben und Regal-Dunkel unten, die Raumfarbe geht beim Verlassen wieder ab, der Nutzerinnen-Ton existiert als eigener Token — und der Nachweis, dass die Zonen die bestehenden Regeln **erben** statt sie zu verdoppeln (Signatur und Fußmarke werden über dieselben Selektoren gefunden wie in den Vorräumen).
- **Kulisse:** Halter auf der Naht in beiden Chats, tatsächlich gezeichnet (beide Theme-Fassungen im DOM), nie klickbar, Einzelsession liest **nur** den persönlichen und die gemeinsame **nur** den geteilten Zähler, kein eigener Chat-Zähler im Speicher, und der S87-Abbau nimmt sie mit.

Volle Suite grün (**1505**) auf frischem Klon, Build Kern `fd9de5a68f2e1227`.

## Merkposten

- Die Kulisse zeichnet einmal beim Betreten, nicht bei jeder Nachricht. Wächst der Zähler während einer langen Session, sieht man es erst beim nächsten Betreten — das ist gewollt („Zeuge, kein Zählwerk").
- Der Vorschau-Regler im Entwickler-Panel (D11) wirkt auf die Chat-Kulisse genauso, weil sie durch dieselbe Funktion läuft.

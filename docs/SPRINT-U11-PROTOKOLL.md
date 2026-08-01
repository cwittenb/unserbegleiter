# Sprint U11 · Fünf Funde an der Oberfläche

Basis: `origin/main` @ `3f65cbc` **plus S105** · Kern-Hash: `8ef080200f1c1abe`
Suite: **2153 grün** (2148 + 5 Strukturtests, s. u.)

> **Kettenpatch.** U11 setzt auf S105 auf: Beide ändern `core/ui/app.js`,
> `core/i18n/de.js` und `core/i18n/en.js`. Reihenfolge: erst
> `patch-s105-vertrag-und-zustand.mjs`, dann dieser.

---

## Vorbemerkung: Was ich hier nicht messen kann

happy-dom rechnet kein Layout. Für diese fünf Funde gibt es deshalb **keine
Tests** — sie sind gelesen, begründet und gebaut, aber nicht bewiesen. Das ist
der Grund für den eigenen, kleinen Patch: Du sollst ihn schnell durchsehen
können. Am Ende steht eine Liste, was wo zu sehen sein müsste.

Bei zweien (U11.2, U11.3) bin ich auf Vermutungen angewiesen, und ich sage
jeweils dazu, worauf.

---

## U11.1 · Die Fußmarke klebte am Text

`scrProzess` war der **einzige** Screen ohne `rz-fuss`. Dieses Element trägt
`margin-top:auto` und schiebt den Fuß an den unteren Rand; ohne ihn stand
„raumzuzweit" direkt unter dem letzten Absatz.

Ein leeres `<div class="rz-fuss"></div>` vor der Marke — dieselbe Bauweise wie
in den vier anderen Screens.

**Sicher.** Die Regel ist eindeutig, der Vergleich mit den anderen Screens auch.

---

## U11.2 · Die Bildlaufleiste mitten im Papier

Der aufgeklappte Regalkasten rollt in sich
(`.rz-regal-offen .rz-regal-inhalt{overflow-y:auto}`), und das ist **richtig so**:
Der Kommentar an dieser Stelle beschreibt, dass sonst die ganze Seite wächst —
genau das hat U10 dort behoben.

Falsch war nur, **wo die Leiste dabei sitzt**: `.rz-half` trägt seitlich
`--rz-rand` Polster, also stand sie um dieses Maß eingerückt im Papier statt am
Schirmrand.

Der Rollbereich reicht jetzt bis an die Zonenkante (negative Ränder), das
Polster wandert nach innen und bleibt sichtbar erhalten. Dazu
`scrollbar-gutter:stable`, damit der Text beim Erscheinen der Leiste nicht
springt.

**Mein erster Versuch war falsch, und ich habe ihn zurückgenommen:** Ich wollte
die Leseansicht über den Body rollen lassen — das hätte die Leiste zwar an den
Rand geholt, aber die Seite wieder wachsen lassen. Der Kommentar im Code hat
mich davon abgebracht.

**Vermutung:** Dass es das Polster ist. Ich sehe die Leiste nicht.

---

## U11.3 · Die waagerechte Bildlaufleiste

Hier ist mein Befund unvollständig, und ich sage das offen.

Das Ausblut-Rezept der Schreibkante (`margin-left:calc(50% - 50vw)`, U10b) rechnet
selbst mit Überlappung — der Kommentar dort sagt: *„Der Rest, den vw nicht wissen
kann, ist die Bildlaufleiste."* Abgefangen wird das mit `overflow-x:clip`, aber
**nur innerhalb der 900px-Medienabfrage**. Unterhalb greift beides nicht: weder
das Ausbluten noch die Abfangregel.

Deine Beobachtung war „jetzt immer". Zwei Dinge geändert:

1. **`overflow-x:clip` gilt jetzt für jede Breite.** Es kostet nichts, wo nichts
   überläuft, und fängt die Klasse ab statt eines Falls. (`clip`, nicht `hidden`
   — `hidden` eröffnete einen Rollbereich und risse die senkrechte Bewegung an
   sich.)
2. **Die wahrscheinlichste Ursache gleich mit:** `overflow-wrap:anywhere` auf den
   Nachrichten. Ein Wort, das breiter ist als die Spalte, schiebt sonst die Zeile
   hinaus — Links und die Paar-Kennungen aus dem Testlauf (`P8-10`) sind die
   üblichen Verdächtigen.

**Unsicher.** Punkt 1 behebt das Symptom in jedem Fall, Punkt 2 rät bei der
Ursache. Wenn die Leiste weg ist, wissen wir nicht sicher, welches der beiden es
war — das ist mir hier lieber als weiter zu suchen, was ich nicht sehen kann.

---

## U11.4 · Die Rückfrage-Zeile passte nicht ins Haus

Meine Fassung aus S99.2 setzte zwei `pb-link` nebeneinander. Das ist die
Grammatik für **Löschen und Nebenwege** — nicht für den Griff, den die Zeile
ersetzt. Im Haus gilt: *„Rahmen = Handlung, Hairline = Navigation und Auswahl."*

Jetzt trägt die Zusage die Form des Knopfes, an dessen Stelle sie tritt
(`rz-zeile rz-knopf-flach`), und die Rücknahme bleibt eine leise Zeile darunter —
Nichtstun ist ohnehin die Vorgabe.

Der Text ist gekürzt: Die Frage stand doppelt („Session abschließen?" über einem
Knopf namens „Abschließen"). Übrig bleibt die Folge, die man wissen muss:
*„Danach kannst du hier nicht mehr schreiben."*

**Sicher** bei der Grammatik, **ungeprüft** beim Aussehen.

---

## U11.5 · `{partner}` stand wörtlich da

```js
// auswahl-screen.js:47 — t() holt den Rohtext, gefüllt wird mit fuelle()
"ausschnitt.zugang": "Stellen aussuchen, die {partner} lesen darf"
```

Eine Zeile, seit S96 unbemerkt — weil niemand die Tür in freier Wildbahn
gesehen hat, bevor S99.7 die Kennungen lieferte.

**Sicher.** Der bestehende Test deckt es nicht ab (er prüft die Auswahl selbst,
nicht den Zugangstext), aber der Fehler ist eindeutig.

---

## Was du sehen müsstest

| | wo | was |
| --- | --- | --- |
| U11.1 | Prozessreflexion (Mess-Runde) | „raumzuzweit" am unteren Rand, nicht unter dem Text |
| U11.2 | Zeitleiste aufklappen, langes Gespräch öffnen | Bildlaufleiste am Schirmrand; Text springt beim Erscheinen nicht |
| U11.3 | Chat, auch schmal | keine waagerechte Leiste mehr; lange Wörter brechen um |
| U11.4 | „Session abschließen" drücken | gerahmter Knopf „Abschließen", darunter leise „Danach kannst du hier nicht mehr schreiben. Zurück" |
| U11.5 | Abschluss → Tür (a) | „Stellen aussuchen, die **Bernd** lesen darf" |

---

## Was die Suite dann doch sehen kann

Der letzte Merkposten war billig genug, um ihn gleich einzulösen:
`tests/unit/u11-screen-struktur.spec.js`.

happy-dom rechnet kein Layout — aber **Struktur** sieht es. Zwei Prüfungen, die
je eine ganze Fehlerklasse abdecken:

* **Keine Fußmarke ohne `rz-fuss`.** Gegenprobe gemacht: U11.1 zurückgedreht,
  Test fällt mit `[ 'scrProzess' ]` — er nennt den Fund beim Namen. Hätte es ihn
  gegeben, wäre der Fehler nie ausgeliefert worden.
* **Kein ungefüllter Platzhalter im gerenderten Haus**, plus: beide Wörterbücher
  führen dieselben Schlüssel mit Platzhaltern. Wandert einer beim Übersetzen
  verloren, füllt `fuelle()` ins Leere und der Name fehlt still.

Für U11.5 greift der Boot-Test nicht — die Ausschnitt-Tür entsteht erst am
Abschluss. Dort bleibt der Vertrag: Ein Text mit `{partner}` darf nie über `t()`
allein in die Oberfläche.

Die drei übrigen Funde (U11.2, U11.3, U11.4) bleiben ungeprüft. Bildlaufleisten
und Abstände sieht die Suite nicht.

---

## Merkposten

- **U11.3 bleibt zu beobachten.** Falls die Leiste wieder auftaucht, ist die
  Ursache eine andere — dann brauche ich von dir die Breite und ob es der Chat
  oder die ganze Seite ist.
- Die Layout-Blindheit der Suite bleibt. Für Fälle wie U11.1 (ein fehlendes
  Element im Vergleich zu vier gleichartigen Screens) wäre ein Strukturtest
  denkbar: „jeder Screen mit Fußmarke hat auch einen `rz-fuss`". Das würde
  diesen Fund gefunden haben — und ist billig.

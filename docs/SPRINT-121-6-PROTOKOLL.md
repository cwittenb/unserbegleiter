# Sprint S121.6 — das Regal ist ein Akkordeon

**Basis:** `origin/main` @ `052e606` plus S121.5 (Freiraum beidseitig)
**Kern-Hash nach dem Bau:** `5364837806c25be2`
**Vorlage:** Prototyp `prototyp-regal-c-v2.html` (Variante C), am Gerät bestätigt
**Deckt ab:** F17, F19, F20-Folgefragen — Abschluss von S121

---

## 1 · Was ersetzt wurde

Das aufgeklappte Regal war ein eigenes kleines Layout-System: Screen auf `100dvh` genagelt,
beide Hälften absolut positioniert, ihre Maße zur Laufzeit gemessen und in zwei
Custom-Properties eingefroren, der Inhalt mit eigenem Rollbereich — denn absolut
positionierte Elemente lassen den Rahmen nicht wachsen. Dazu ein `transform`-Ausgleich gegen
den Sprung beim Umschalten.

Variante C braucht davon **nichts**. Die Zone wächst mit ihrem Inhalt, das Dokument rollt
(Turn 48 §2.1), das Öffnen ist ein Akkordeon. Sieben dokumentierte Entscheidungen sind damit
gegenstandslos: Q2, Q3/Q3a (im offenen Zustand), U11.2, D12-2b, S114d.3, S114h und S114i.

---

## 2 · Die neue Mechanik

**Öffnen** über `grid-template-rows` von `0fr` auf `1fr`. Das ist der einzige Weg, eine
**unbekannte** Inhaltshöhe weich zu öffnen, ohne sie vorher zu messen. `scaleY` scheidet aus
(verzerrt Text, clippt an Rollbereichen — S114g), `max-height` bräuchte eine geratene
Obergrenze.

**Die Geschwisterzeilen bleiben stehen.** Das ist der Unterschied, der es zum Akkordeon
macht: Ein Tap auf ein anderes Fach wechselt direkt, statt erst zurückzugehen.

**Mobil klebt die obere Zone als Ganzes** — sie besteht dann nur noch aus Kopfzeile und
Überschrift. Die ganze Hälfte kleben zu lassen statt einzelner Zeilen spart jede
Versatzrechnung: Ein Stapel klebender Geschwister bräuchte die Höhe des jeweils darüber
liegenden als Offset, und genau solche Differenzrechnungen laufen beim nächsten Rastermaß
auseinander (T2g).

**Das Polster bleibt stehen.** Wird es beim Öffnen entfernt, springt die Überschrift um genau
dieses Maß nach oben — im Prototyp zweimal aufgetreten, bis die Ursache klar war: Nicht
`sticky` verschiebt etwas, sondern das Ändern der Geometrie beim Umschalten.

**Der Rückweg gehört dazu.** Die Rolllage wird beim **ersten** Öffnen gemerkt und beim
Schließen wieder angefahren; ein Wechsel von Fach zu Fach überschreibt sie nicht. Ohne das
bleibt die Seite dort stehen, wohin sie beim Öffnen gerollt ist — und sobald die obere Zone
wieder erscheint, liegt die Überschrift oberhalb des Sichtfensters.

**Desktop:** Die Papier-Spalte klebt, solange ein Fach offen ist. Unabhängig von der Messung
aus S121.2, denn bei offenem Fach ist die zweite Hälfte per Definition die längere.

**Der Wegweiser** steht fest (`position:fixed`, halbe Fensterhöhe an der Naht) und ist
ausdrücklich einsortiert: `z-index:9`, über der klebenden oberen Zone (8). Ohne das
verschwände seine obere Hälfte hinter dem Papier, sobald das Regal mobil unter die
Überschrift gefahren ist. Der Pflicht-Screen (1000) bleibt darüber — er ist ein Notausgang.

**Abweichung von der Vorlage, offengelegt:** Turn 48 §2.4 verlangt `absolute` statt `fixed`.
Der erste Grund (das Badge soll zur Naht gehören und mit ihr enden) fällt bei C weg — die
Naht reicht über die ganze Dokumenthöhe. Der zweite (`fixed` braucht eine eigene
`z-index`-Verabredung) bleibt und wird mit der Einsortierung bezahlt. Entschieden am
Prototyp.

**Dazu `scrollbar-gutter:stable` am `html`.** Seit S121.1 rollt das Dokument, und mit dem
Akkordeon ändert sich die Seitenlänge bei jedem Öffnen: Die Leiste käme und ginge, und der
ganze Inhalt spränge um ihre Breite hin und her. Das Muster gab es eine Ebene tiefer schon
(U11.2, für den Rollbereich des Regals) — dort ist es entfallen, weil es dort keinen
Rollbereich mehr gibt.

---

## 3 · `regalModus` schrumpft

Die Messung ist ersatzlos fort: keine eingefrorenen Maße, kein `transform`-Ausgleich, kein
Aufräumen. Was bleibt, ist die Klasse — plus mobil das Rollen und der gemerkte Rückweg.

---

## 4 · Neun umgekehrte Wächter

| Datei | Was sie festhielt |
| --- | --- |
| `d9-regal-vollbild.spec.js` (4) | Vollbild-Höhe, eingefrorenes Zonenmaß, Verschiebung, abtretende Geschwister |
| `s114-design-textschnitte.spec.js` (4) | Spaltenhöhe, Nahtabstand, freie Kopfzeile, mobile Zonen-Mechanik |
| `t2d-desktop-anker.spec.js` (3) | Q2, absolute Positionierung, Badge-Bezug |
| `d12-2b-regal-chat.spec.js` (1) | Geschwisterzeilen treten ab |
| `d8-vollbild-mitte-sprache.spec.js` (1) | S114d.3 · Regal bleibt in seiner Spalte |
| `s121-1`, `s121-2` (2) | meine eigenen Zwischenstände aus diesem Sprint |

Alle bleiben stehen, mit gedrehtem Vorzeichen und Begründung.

---

## 5 · Vierter Fall der Kommentar-Falle — und der lehrreichste

Mein neuer Kommentar in `design.js` nannte die beiden alten Maßnamen, um zu erklären, was
entfallen ist. Daraufhin fielen meine **eigenen neuen Tests**, die genau deren Abwesenheit
prüfen.

**Merksatz:** In diesem Bestand darf ein Kommentar den Bezeichner nicht nennen, dessen
Verschwinden er beschreibt. Die Wächter greifen über den Quelltext, Kommentare
eingeschlossen — vierter Fall nach S119.3, S119.7 und S121.1.

---

## 6 · Beide Vorräume, eine Definition

Der eigene Vorraum ist **mit erledigt**: Alle Regeln hängen an `.rz-regal-offen`,
`.rz-regal-inhalt`, `.rz-half` und `.rz-regal-reihen` — keine einzige nennt einen
Screen-Namen. `scrMyRoom` und `scrShared` tragen dieselben Klassen und verhalten sich damit
zwangsläufig gleich.

Die Gefahr des Auseinanderdriftens liegt **nicht im Stylesheet, sondern im Markup**: Beide
Räume schreiben ihre Zeilen und Kästen in `app.js` einzeln aus (`scrMyRoom` ab Zeile 143,
`scrShared` ab 255). Wer dort eine Klasse vergisst, bekommt einen Raum, der anders aussieht —
und kein Test merkt es.

Das ist **I16**, ein eigener Befund: ein Kanarientest, der beide Vorräume auf denselben
Bauplan prüft (zwei Hälften, Naht-Anker in der zweiten, Regalreihen, jede Zeile mit
`data-box` und zugehörigem `rz-regal-inhalt`). Billiger als eine gemeinsame Bauplan-Funktion
und ohne Umbau — und er fängt genau den Fall, der sonst erst am Bildschirm auffällt.

---

## 7 · Tests

**Volle Suite:** 273 Dateien, 2675 Fälle, grün (unit 242/2477 in zwei Scherben,
engine+worker+e2e 31/198).
**Build:** erfolgreich, Kern `5364837806c25be2`.

---

## 8 · Nachweis am laufenden System

1. Vorraum, Fach öffnen: Der Inhalt wächst aus dem Trennstrich hervor, die anderen Zeilen
   bleiben stehen, ein Tap auf ein anderes Fach wechselt direkt.
2. **Mobil:** Das Regal fährt bis unter die Überschrift, die dort stehen bleibt und nicht
   springt. Ein Tap auf sie oder auf die Fläche darüber schließt und führt zurück, wo man war.
3. **Desktop:** Die Papier-Spalte steht still, während rechts die Liste durchzieht. Der
   Wegweiser bleibt auf halber Fensterhöhe.
4. Genau **eine** Bildlaufleiste, am Fenster — und sie springt beim Öffnen nicht ins Bild.
5. Beide Vorräume verhalten sich gleich.
6. Kurzes Fach (wenige Einträge): Es wirkt nicht aufgeblasen.

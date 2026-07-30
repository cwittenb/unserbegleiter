# Sprintprotokoll · U10b — Nur das Gespräch rollt

**Basis:** `origin/main` @ `8532f76` (`patch-u10a-designfehler`, gemerged)
**Kette:** keine — U10a liegt in `main`, U10b setzt direkt auf.
**Endstand:** **2088 grün** (219 Dateien), Build grün
**Kern-Hash:** `b601e2dff67d9100`

**Rebase-Notiz:** Die erste Fassung setzte auf `426613d` + U10a-Patch auf. Dazwischen kam **S101** (`9a7e57b`) und fasste `s62-aufdeckrunde-feinschliff.spec.js` an (+6/−1) — der Anker griff nicht mehr. Die fremde Änderung liegt in einem anderen Block (ein Fixture-Text bei den Aufdeck-Tafeln) und berührt die Scroll-Disziplin nicht; das Neueinspielen war überschneidungsfrei. Alle übrigen vier Anker standen unverändert.

---

## Befund: Der Chat hatte gar keinen Rollbereich

Die ganze Kette stand auf `min-height`:

```
.rz-app        { min-height:100dvh }
#scrChat       { min-height:100dvh }
.rz-chat-innen { min-height:calc(100dvh - 60px) }
```

`min-height` heißt: mindestens so hoch wie der Schirm, darf aber wachsen. Mit jeder Nachricht wuchs der Kasten, und weil niemand einen Überlauf eröffnete, **rollte das Dokument**. Die Schreibkante hängt am unteren Ende dieses wachsenden Kastens und fuhr mit hinaus.

D9 hat dasselbe Muster beim Regal längst gelöst (`height:100dvh; overflow:hidden`, Überlauf nach innen). Der Chat hat diese Behandlung nie bekommen.

## Behoben (F3a)

```css
.rz-app #scrChat{height:100dvh;min-height:0;overflow-y:hidden; …}
.rz-chat-innen{height:100%;min-height:0}
#scrChat .rz-chat-oben{flex:1 1 auto;min-height:0;overflow-y:auto;overscroll-behavior:contain}
```

Fest steht alles **ab dem Badge**: Wegweiser, Composer, Links. Gerollt wird die ganze obere Zone, Kopfzeile inbegriffen — Variante (a). Ein festgesetzter Kopf hätte dem Gespräch zusätzlich Höhe genommen, und auf kleinen Schirmen wird der Ausschnitt sonst zu eng.

`min-height:0` ist keine Kosmetik: Flex-Kinder haben per Vorgabe `min-height:auto` und weigern sich zu schrumpfen — ohne die Null wächst die Zone am `overflow` vorbei und nichts ändert sich.

**Die Kulisse brauchte keinen eigenen Schritt.** `.rz-kulisse-naht` ist absolut gegen `.rz-naht-anker` gesetzt, und der Anker **ist** die Schreibkante. Sie wanderte nie aus eigenem Antrieb, sondern weil ihr Anker wanderte. Steht die Kante, steht die Kulisse.

**Eine Regel wieder entfernt:** Ich hatte `#scrChat .rz-chat-unten{flex:0 0 auto}` ergänzt, damit die Schreibkante nicht schrumpft. Ein bestehender Wächter (T2a) zeigte, dass die Zone ihr `flex:none` längst mitbringt — und `flex:none` **ist** `0 0 auto`. Die Regel war Doppelpflege und ist wieder draußen.

---

## Die Scroll-Disziplin wandert mit (S62)

Der Gedanke aus S62 bleibt, sein Bezugspunkt wandert.

**Vorher:** Ziel war die Composer-Unterkante; „nah" hieß, das Eingabefeld ist fast in Sicht; gescrollt wurde `window`.

**Jetzt:** Der Composer steht immer — die Frage „bin ich nah am Eingabefeld?" hätte sich nicht mehr stellen können, die Antwort wäre stets ja gewesen. Gemessen wird die Nähe zum **Ende des Verlaufs**:

```js
(r.scrollHeight - r.scrollTop - r.clientHeight) <= 80
```

Verhalten unverändert: Scrollt die Person hoch, stoppt das Mitlaufen von selbst; Rückkehr ans Ende oder das eigene Senden nimmt es wieder auf. Nullmaße (happy-dom, ungelayoutet) melden weiterhin „nah" — still statt springend, dieselbe Vorsicht wie in S62.

`box.scrollTop = box.scrollHeight` auf `#pbMsgs` ist entfallen: Der Roller ist die **Zone**, nicht die Liste. Auf der Liste hätte es stumm ins Leere gegriffen.

---

## Vier Wächter nachgezogen

| Spec | hielt fest | jetzt |
|---|---|---|
| `s53-wiedereinstieg` | „ruft `window.scrollTo` beim Rendern" | rollt die Gesprächszone ans Ende |
| `s62` (3 Prüfungen) | Ziel = Composer-Unterkante; Fern-Lage über `win.innerHeight` | Ziel = Verlaufsende; Fern-Lage über `scrollHeight`/`clientHeight` der Zone |

**Zwei Fallen unterwegs, beide im Testbau:**

1. Der erste Spion saß am *Knoten* (`root.querySelector(".rz-chat-oben")`), gesetzt nach `bootApp`. Das Chat-Markup entsteht aber erst in `startChat` — der Spion beobachtete `null` und meldete null Aufrufe. Er sitzt jetzt am **Element-Prototyp** und filtert nach Klasse; damit ist der Zeitpunkt egal.
2. `stelleFern()` stubte Composer-Rechteck und Fensterhöhe. Beides ist bedeutungslos geworden. Es stubt jetzt die Zone: viel Inhalt, kleines Fenster darauf, oben stehend.

---

## Noch zu prüfen am Gerät

* **Tastatur auf Mobil.** `100dvh` folgt der Tastatur auf aktuellen Browsern; ob die Schreibkante beim Öffnen sichtbar bleibt, sagt erst ein echtes Gerät. Ein Wächter dafür ist in happy-dom nicht zu bauen.
* **Breite Schirme.** `#scrChat{overflow-x:clip}` ab 900 px (randlose Schreibkante) steht jetzt neben `overflow-y:hidden`. Beide Achsen sind getrennt gesetzt, damit `clip` nicht zu `hidden` degradiert — im Browser gegenzulesen.

---

## Geänderte Dateien

`core/ui/design.js` · `core/ui/chat-kern.js` · `tests/unit/s53-wiedereinstieg.spec.js` · `tests/unit/s62-aufdeckrunde-feinschliff.spec.js` · `tests/unit/u10-designfehler.spec.js` · `docs/SPRINT-U10B-PROTOKOLL.md` (neu)

# Sprintprotokoll · R4b (Fortsetzung) — Ausschnitt-Auswahl und Vorschau

**Basis:** `origin/main` @ `4ab82bc` (patch-r4b-ansichten)
**Ausgangslage / Endstand:** **1407 / 155 / 25 / 4 grün**, `npm run build` grün
**Kern-Hash:** `6935089f…` → `4c29a2469aaa21e5`

---

## `core/ui/auswahl-screen.js` (269 Zeilen)

`ausschnittAngebot`, `starteAuswahl`, `beendeAuswahl`, `renderAuswahl`,
`verdrahtePaar`, `pruefeRichtwert`, `renderVorschau`, `zeichneAuswahl`.

`app.js`: **2209 → 1993 Zeilen.** Seit Beginn des Tracks: 2692 → 1993
(**−699, −26 %**).

## Die erste Gruppe mit eigenem Zustand

Bisher wurden Funktionen verschoben. Diese Gruppe hält **Zustand**: `ausw`
trägt die laufende Auswahl — gewählte Paare, Anker, Phase, Rahmensatz. Er lebt
jetzt im Modul statt in der `createApp`-Closure.

Der einzige Punkt, an dem `app.js` ihn von außen brauchte, war `renderMsgs`:

```js
if (ausw) { (ausw.phase === "vorschau" ? renderVorschau : renderAuswahl)(box); … }
```

Also: Zustand prüfen **und** nach Phase verzweigen — `app.js` musste die Phasen
kennen, obwohl sie es nichts angehen. Beides fasst jetzt `zeichneAuswahl(box)`
zusammen: Es zeichnet, wenn eine Auswahl offen ist, und meldet das zurück.

```js
if (zeichneAuswahl(box)) { box.scrollTop = 0; return; }
```

Das ist der Unterschied zwischen Verschieben und Kapseln: Die Schnittstelle ist
**schmaler als der Zustand, den sie verbirgt**. `app.js` weiß nicht mehr, dass
es Phasen gibt.

## Eine Lücke im eigenen Werkzeug

Der Abhängigkeits-Analysator aus dem letzten Sprint suchte Bezeichner nur in
**Aufrufposition** — vor `(` oder `.`. `backend` erscheint hier aber als nacktes
Argument:

```js
await quereGate(backend, { … });
```

Es wurde deshalb nicht gemeldet und fiel erst durch einen roten Test auf
(`s96-ausschnitt-auswahl-ui.spec.js`, Freigabe ins Regal). Der Analysator erfasst
jetzt **alle** Bezeichner; dafür meldet er mehr Rauschen (Attributnamen aus
HTML-Zeichenketten, Schlüsselwörter), was die deutlich harmlosere Fehlerrichtung
ist: Rauschen kostet einen Blick, eine Lücke kostet einen roten Testlauf.

Beides zusammen bleibt die Arbeitsteilung: Das Werkzeug verkürzt die Schleife,
die Suite beweist die Vollständigkeit.

## Keine Teständerung

Anders als beim Ansichten-Sprint gab es hier keinen Grep-Wächter, der einen Pfad
nachziehen musste. **Kein Bestandstest wurde angepasst.**

---

## Offen: Chat und Panels

`renderMsgs`, `zeigeStream`, `verdrahteChat`, Composer, `gatePanel`,
`kapitelPanel`, `aufdeckTafel`, `baueTafelKarte`.

`renderMsgs` ist der Rückkanal aus fast allem — auch aus dem gerade
herausgelösten Auswahl-Modul, das es hereingereicht bekommt. Es sinnvoll zu
kapseln hieße, den Rerender-Weg selbst zu entwerfen, nicht nur zu verschieben.
Das ist ein Entwurfsschritt und gehört vor die nächste Extraktion, nicht
hinein.

**Merkposten:** `still()` in `ladeLage` unterscheidet nicht zwischen „leer" und
„nicht ladbar" (R2.5).

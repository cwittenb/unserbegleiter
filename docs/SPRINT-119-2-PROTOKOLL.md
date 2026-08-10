# Sprint S119.2 — `infoToggle` hinterlässt keinen Halbzustand mehr

**Basis:** `origin/main` @ `96f5a45` (S118 · Versandprüfung und Befunde)
**Reihenfolge:** unabhängig von S119.1 anwendbar — beide fassen verschiedene Dateien an. Zusammen ergibt sich Kern `ced2b7ba3f6f6733`; allein auf `96f5a45` angewendet ergibt dieser Schritt einen anderen Hash (dann fehlt S119.1).
**Deckt ab:** I7 aus dem Sprintplan S119

---

## 1 · Befund

`infoToggle` (`core/ui/app.js:607`) öffnet einen Regal-Kasten und schaltet danach den
Vollbild-Zustand des Screens nach:

```js
return Promise.resolve().then(oeffnen).then(r => { regalModus(box); return r; });
```

`regalModus` hing damit allein am **Erfolgszweig**. Die Öffner machen den Kasten aber
sichtbar, *bevor* sie fertig geladen haben — `zeigeAgenda`, `zeigeRegal` und `zeigeMomente`
tun das alle. Bricht der Öffner danach ab, blieb ein sichtbarer Kasten ohne
`rz-regal-offen` stehen.

Genau so sah der Fehler aus, der zu S119.1 führte: „Gemeinsamer Fokus öffnet als
Akkordeon, die Nachbarzeilen füllen das Regal." Es war kein Layout-Fehler — der Ablauf war
abgerissen. S119.1 hat die damalige Ursache beseitigt (`messIntervall`); dieser Schritt
sorgt dafür, dass der **nächste** Ladefehler keine kaputte Fläche mehr hinterlässt.

---

## 2 · Entscheidungen

**Der Fehler wird weitergereicht, nicht geschluckt.** Ein stiller Fehlschlag wäre nur die
nächste Verwirrung: Der Kasten ginge zu, und niemand wüsste, warum. Die Aufrufer zeigen
ihn wie bisher in der Fehlerbox; neu ist allein, dass die Fläche dabei ganz bleibt.

**Der gescheiterte Kasten verschwindet wieder.** Die Alternative — Kasten sichtbar lassen
und nur `regalModus` nachführen — hätte einen leeren, geöffneten Kasten neben einer
Fehlermeldung stehen lassen. Ein Kasten, dessen Inhalt nicht geladen werden konnte, ist
kein Ort.

**Die zuvor geschlossenen Geschwister bleiben geschlossen.** Sie wiederherzustellen hieße,
einen Zustand zurückzurollen, den die Person selbst durch ihren Tap verlassen hat. Der
Screen landet nach einem Fehlschlag im geschlossenen Regal — dort, wo er vor dem Tap war.

---

## 3 · Änderungen

- `core/ui/app.js` — `infoToggle` bekommt einen Fehlerzweig: Kasten verbergen,
  `regalModus` nachführen, Fehler weiterwerfen.
- `tests/unit/s119-2-infotoggle-haltezustand.spec.js` — neu.

---

## 4 · Tests

Fünf Fälle, gegen den echten Abbruchpfad gebaut:

- scheitert der Öffner, trägt der Kasten wieder `pb-hidden` und der Screen **nicht** `rz-regal-offen`;
- der Fehler bleibt sichtbar (Fehlerbox trägt den Feldnamen);
- nach einem Fehlschlag ist die **nächste** Zeile normal bedienbar;
- nach behobenem Fehler lässt sich **dieselbe** Zeile öffnen (kein hängengebliebener Zustand);
- der gesunde Weg ist unverändert: öffnen → Vollbild → erneuter Tap schließt.

**Ein Detail, das der erste Testentwurf falsch hatte** und das hier festgehalten gehört:
Ein scheiterndes `agenda` beweist gar nichts — `zeigeAgenda` fängt das Lesen von `agenda`
und `goals` selbst ab (`.catch(() => null)`). Abgerissen ist der Ablauf erst an
`rhythmusSektion()`, das `messIntervall` **ohne Netz** liest. Der Test lässt deshalb genau
dieses Feld scheitern.

**Test des Tests:** Ohne den Fix fällt der erste Fall um (verifiziert per `git stash`).

**Volle Suite:** 263 Dateien, 2555 Fälle, grün (unit 232/2357, engine+worker+e2e 31/198).
**Build:** erfolgreich, Kern `ced2b7ba3f6f6733` (mit S119.1 zusammen).

---

## 5 · Nachweis am laufenden System

Eine Regalzeile bei abgeschaltetem Netz antippen: Es erscheint eine Fehlermeldung, der
Screen bleibt im geschlossenen Regal, und die nächste Zeile lässt sich normal öffnen.

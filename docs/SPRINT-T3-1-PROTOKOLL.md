# Sprint T3-1 · Inline-Styles, mechanischer Teil + Wächter-Sperrklinke

Basis: `origin/main` @ `22a150a` **+ Patch T2-5** · Kern-Hash nach Patch: `21ff354da0ad6ada`
Suite: 1830 grün (T2-5-Stand 1829 + 1)

> **Kette:** dieser Patch setzt auf `patch-t2-5-chat-wegweiser.mjs` auf — beide berühren
> `core/ui/design.js`. Reihenfolge: `T2-5 → T3-1`.

Umgesetzt: **T3a** aus `SPRINT-T2-PLAN-final.md` §3a.

---

## 1 · Warum dieser Schritt klein aussieht und trotzdem zählt

Die Zählung aus dem Sprintplan (§3a) hat sich durch T2-4 bereits verschoben: `chat-kern.js` ist
sauber, `panels.js` war die letzte mechanische Stelle. Es blieb also **eine** Zeile Aufräumarbeit —
und die eigentliche Substanz liegt woanders: im Wächter.

---

## 2 · `panels.js` · die Aufdeck-Tafel

**Ist:** `panels.js` Z. 182 setzte per `setAttribute("style", …)` zwei Layout-Werte:
`align-self:stretch;max-width:none`. Kein Farb- oder Schriftwert, aber eben Gestaltung in einer
Datei, in der niemand sie sucht.

**Neu:** `.pb-tafel{align-self:stretch;max-width:none}` in `design.js`.

Die Aufdeck-Tafel (S62) hängt als Karte im Nachrichtenfluss und soll dort die volle Spaltenbreite
nehmen, statt der 88-%-Begrenzung der Nachrichten zu folgen. Genau das sagt die Regel jetzt — an
der Stelle, an der man sie erwartet.

---

## 3 · Der Wächter läuft jetzt über das Verzeichnis

**Das war das eigentliche Problem.** `t1b-theme.spec.js` prüfte eine **Namensliste**:
zuerst drei Dateien, seit T2-4 vier. Wer eine neue Datei in `core/ui/` anlegte, war damit
automatisch ungeprüft — der Wächter wuchs nicht mit dem Code, sondern nur, wenn jemand daran dachte.

**Neu:** der Test liest `core/ui/` aus und führt statt der Geprüften die **Ausnahmen**.

```js
const MALT_SELBST  = ["recovery-screen.js"];                       // rohe Farbliterale (T3c)
const STILT_INLINE = ["auswahl-screen.js", "recovery-screen.js"];  // Inline-Stilblöcke (T3b/T3c)
```

Der Unterschied ist die **Beweislast**: vorher musste jemand daran denken, eine Datei aufzunehmen;
jetzt muss jemand begründen, warum eine ausgenommen bleibt.

**Sperrklinke in beide Richtungen.** Ein dritter Test prüft, dass die Ausnahmelisten *genau* der
Wirklichkeit entsprechen:

- Kommt ein Verstoß dazu → einer der beiden Wächter oben schlägt an.
- Wird eine Datei aufgeräumt → der Listentest schlägt an und verlangt, dass die Ausnahme
  verschwindet. Sonst bliebe eine tote Ausnahme stehen, hinter der sich später neue Verstöße
  verstecken könnten.

Das ist dasselbe Muster wie die Kontrast-Sperrklinke aus T2-2: nicht erzwingen, was noch nicht
entschieden ist — aber den Ist-Zustand so festnageln, dass er nur in eine Richtung wandern kann.

**Zwei Einzeltests sind dabei entfallen**, weil der Verzeichnislauf sie enthält: „auch die
UI-Module malen nicht selbst" und der T2-4-Sondertest für `chat-kern.js`.

---

## 4 · Stolperstein: `fileURLToPath` unter happy-dom

Der naheliegende Weg zum Verzeichnis —

```js
readdirSync(fileURLToPath(new URL("../../core/ui/", import.meta.url)))
```

— wirft unter happy-dom **`TypeError: The URL must be of scheme file`**, obwohl `import.meta.url`
sauber mit `file:///` beginnt. Grund: der globale `URL`-Konstruktor ist in dieser Umgebung der des
DOM, und Nodes `fileURLToPath` erkennt dessen Instanzen nicht.

Der Weg ohne URL-Objekt tut es:

```js
resolve(dirname(fileURLToPath(import.meta.url)), "../../core/ui")
```

`fileURLToPath` nimmt auch einen String, und `import.meta.url` ist einer. Der Kommentar im Test
sagt das an Ort und Stelle — die Fehlermeldung führt sonst in die Irre, weil sie ausgerechnet das
Schema beklagt, das stimmt.

---

## 5 · Was noch aussteht (Track T3)

| Schritt | Datei | Umfang | Blockiert durch |
| --- | --- | --- | --- |
| **T3b** | `auswahl-screen.js` | 13 Inline-Stilblöcke mit `12/13/14/16px`, `border-radius:14px`, vier `opacity`-Werte | Designfrage: bleiben die Auswahl-Karten Karten, oder werden sie Hairline-Zeilen? Und: sollen die vier Schriftgrößen auf die Skala gezogen werden (sichtbare Änderung) oder als Literale in die CSS wandern (Problem verschoben, nicht gelöst)? |
| **T3c** | `recovery-screen.js` | 3 Stilblöcke (einer davon eine Stil-Fabrik für ~8 Elemente), Farbliterale `#cfd8e0`, `#fff`, `rgba(20,26,34,.55)` | Braucht eine Designvorlage: der Screen trägt ein eigenes Overlay-/Karten-Vokabular, das die Turn-40-Sprache (Papier/Tiefgrün, Hairline, Naht) noch gar nicht spricht |

Beide sind **keine** mechanischen Schritte mehr. T3b ist die kleinere Frage, T3c die größere.

---

## 6 · Prüfliste für die Sichtprüfung (Stufe B)

| # | Was | Wo |
| --- | --- | --- |
| 1 | Die Aufdeck-Tafel nimmt im Verlauf weiterhin die volle Breite, nicht 88 % | Gemeinsame Auflösung mit Aufdeck-Runde, hell + dunkel |
| 2 | Der Weiter-Knopf an der Tafel sitzt wie bisher | dieselbe Stelle |

Mehr ist nicht zu sehen — der Rest des Patches lebt im Test.

---

## 7 · Offen (Gesamtstand nach T2 und T3-1)

- **Punkt 4 der T2-5-Prüfliste** · die `weg.chat*`-Texte sind mein Entwurf. Korrekturen: Light-Lane.
- **T2d-2** · Hüllelement, falls die niedrige Fensterhöhe stört (`SPRINT-T2-3-PROTOKOLL.md` §3).
- **Vier Kontraststellen** aus `SPRINT-T2-2-PROTOKOLL.md` §4 — vorneweg `.rz-weg-fuss` bei 2.30 : 1
  und `--rz-label` bei 2.94 : 1.
- **Echo-Zeile in der Leseansicht** (`SPRINT-T2-4-PROTOKOLL.md` §3, Nebenbefund).
- **T3b / T3c** · siehe §5.

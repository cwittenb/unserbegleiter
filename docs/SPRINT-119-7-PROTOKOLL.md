# Sprint S119.7 — die Push-Glocke wird zur Geräte-Einstellung

**Basis:** `origin/main` @ `cde3e13` (S119.6 · fremde Marken)
**Kern-Hash nach dem Bau:** `508a6414469d4e95`
**Deckt ab:** I5 aus dem Sprintplan S119

---

## 1 · Befund

Die Glocke entstand zur Laufzeit in `platforms/cloudflare/pages/client.js`
(`ergaenzePushGlocke`) und wurde in die Bedien-Ecke `.pb-theme` gehängt. Drei Dinge stimmten
daran nicht:

- Sie war das **einzige Emoji** der ganzen Oberfläche — Systemfarbe, Systemform, kein
  `--rz-*`-Token, kein Glyph aus dem eigenen Zeichensatz.
- Sie saß an einem Ort, der sonst **einen Weg** trägt: das Zeichen, das in die Einstellungen
  führt. Ein Schalter neben einem Weg ist eine Vermischung zweier Gesten.
- Sie ist eine **Geräte**-Einstellung und gehört damit in die Gruppe „Dieses Gerät", neben
  „Zugang wiederfinden" und das Löschen der Verläufe.

---

## 2 · Entscheidungen

**Eine Registry statt eines direkten Aufrufs.** Der Einstellungs-Screen liegt in `core/`,
die Benachrichtigungs-Mechanik in `platforms/`. Ein direkter Aufruf hätte Plattform-Wissen
in den Kern getragen — im Artefakt und in den Tests gibt es die nötige Browser-Umgebung gar
nicht. Neu: `core/ui/geraeteschalter.js`. Die Plattform **meldet an**, der Kern **zeichnet
nur** und erfährt nie, was geschaltet wird.

**Kein Zustand im Kern.** Der Schalter wird bei jedem Zeichnen gefragt (`an()`), statt
seinen letzten Wert zu merken. Die Wahrheit liegt beim Browser — Erlaubnis und Abo können
sich außerhalb der App ändern. Ein gemerkter Wert wäre irgendwann eine Behauptung.

**Kein Schalter, keine Zeile.** Ist Push im Browser unmöglich oder kennt der Worker kein
VAPID, wird nichts angemeldet — und dann erscheint auch nichts. Das ist der Regelfall in
allen Umgebungen ohne Push. Ein toter Schalter wäre schlimmer als keiner.

**Scheitert die Zustandsfrage, erscheint die Zeile ebenfalls nicht.** Eine Zeile, deren
Zustand niemand kennt, verspricht etwas, das sie nicht halten kann.

**Gestalt aus dem Bestand.** Die Zeile nutzt dieselbe Form wie „Hell / Dunkel / Automatisch":
Haarlinien-Zeile, `aria-pressed`, Haken rechts. Kein neues CSS, kein neuer i18n-Schlüssel —
die Beschriftung ist `pwa.push`, die es schon gab.

**Position: zuerst in der Gruppe.** Die beiden festen Zeilen darunter klappen auf; stünde
der Schalter dazwischen, säße ein aufgeklappter Kasten zwischen den Zeilen.

---

## 3 · Änderungen

- `core/ui/geraeteschalter.js` — neu: `meldeGeraeteSchalter`, `geraeteSchalter`, `leereGeraeteSchalter`.
- `core/ui/einstellungen-screen.js` — zeichnet die angemeldeten Schalter.
- `core/ui/app.js` — Wirt `#einstGeraetSchalter` in der Gruppe „Dieses Gerät".
- `platforms/cloudflare/pages/client.js` — meldet den Push-Schalter an, statt einen Knopf in
  die Ecke zu hängen.
- `tests/unit/s119-7-geraeteschalter.spec.js` — neu.

---

## 4 · Tests

Zwölf Fälle in drei Gruppen:

**Registry** — leer ohne Anmeldung; nimmt auf und gibt eine *Kopie* heraus; ersetzt bei
gleicher Kennung statt zu verdoppeln (ein `relaunch` nach Sprachwechsel meldet erneut an);
weist Unvollständiges ab, statt später beim Zeichnen zu scheitern.

**Zeile** — ohne Schalter keine Zeile; mit Schalter genau eine, nachweislich in derselben
Gruppe wie „Zugang wiederfinden"; „aus" wird als aus gezeichnet; ein Tap schaltet um und die
Zeile zeichnet den neuen Zustand; ein Schalter, der beim Fragen scheitert, erscheint nicht.

**Schichtgrenze** — `core/` kennt kein Push-Vokabular; die Bedien-Ecke trägt keinen
Push-Knopf mehr; kein Emoji mehr im Client.

**Volle Suite:** 268 Dateien, 2606 Fälle, grün (unit 237/2408 in zwei Scherben, engine+worker+e2e 31/198).
**Build:** erfolgreich, Kern `508a6414469d4e95`.

### Ein wiederkehrender Fund, jetzt zum dritten Mal

Drei meiner Kommentare haben Wächter fallen lassen — in S119.3 nannte einer einen
Selektornamen, hier nannte einer die Bezeichner der Plattformschicht und ein zweiter die
beiden Emoji. **Die Wächter dieses Bestands greifen über den Quelltext, Kommentare
eingeschlossen.** In `core/` und in `design.js` sind Bezeichner im Fließtext keine Prosa,
sondern Daten. Beide Kommentare tragen den Hinweis jetzt selbst.

---

## 5 · Nachweis am laufenden System

1. Bedien-Ecke: nur noch das Einstellungs-Zeichen, keine Glocke.
2. Einstellungen → „Dieses Gerät": erste Zeile „Benachrichtigungen", mit Haken, wenn ein Abo
   besteht.
3. Tippen fragt beim ersten Mal die Browser-Erlaubnis (Nutzergeste ist gegeben), abonniert
   und setzt den Haken; erneutes Tippen kündigt.
4. Erlaubnis verweigert: Zustand bleibt unverändert, keine Fehlermeldung — Push ist Komfort.
5. In einer Umgebung ohne Push (Artefakt, Worker ohne VAPID): keine Zeile.

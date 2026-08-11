# Sprint S121.4 — der Chat rollt als Seite, die Schreibkante klebt

**Basis:** `origin/main` @ `453cfb3` **plus S121.3** (setzt darauf auf)
**Kern-Hash nach dem Bau:** `0192242bb253040d`
**Vorlage:** Designdokument Turn 48 §2.1/§2.3, übertragen auf den Chat
**Schritt 4 von vier in S121 — damit ist der Sprint abgeschlossen**

---

## 1 · Befund

Über der dunklen Fläche ließ sich wischen, über der hellen nicht. Das war nie ein
Touch-Fehler: Die helle Zone war der **eigene Rollbereich** des Chats (U10.4: „DIESE Zone
rollt — und nur sie"), und was sich über der dunklen bewegte, war das Dokument mit seinem
54px-Überhang aus S119.3.

Der Auftrag war klar: eine Bildlaufleiste, ein Rollbereich — und eine Geste soll überall die
Seite rollen, auch über der dunklen Fläche.

---

## 2 · Die Lösung ist dieselbe wie an der Naht, nur um 90 Grad gedreht

Der Chat gibt seinen Rollbereich auf; die **Seite** rollt. Damit die Schreibkante trotzdem
steht, klebt sie am Fensterboden — `position:sticky; bottom:0`, dieselbe Bauform wie die
klebende Hälfte aus Turn 48 §2.3, nur waagerecht.

Das löst den scheinbaren Widerspruch aus F14 („Chat bleibt Ausnahme, **aber** die Seite muss
rollen, wenn ich auf der unteren Fläche scrolle"): Eine Geste über einem klebenden Element
bewegt den Rollbereich, an dem es klebt — also das Dokument. Die Kante bleibt, die Seite
rollt.

**Drei Stellen, die sonst still gebrochen wären:**

- `overflow-y:hidden` am Screen ist **ersatzlos** entfallen. Es machte ihn zum Rollbereich —
  zu einem ohne Balken, der nie rollt. Der klebende Rand hätte an diesem stehenden Kasten
  geklebt, also gar nicht.
- `height:100dvh` → `min-height:100dvh`. Der Screen ist so hoch wie sein Inhalt, mindestens
  aber fensterhoch, damit die Kante auch bei kurzem Verlauf unten steht.
- `.rz-chat-innen{height:100%}` hätte ins Leere gegriffen: Eine Prozenthöhe gegen einen
  Rahmen ohne feste Höhe wird zu `auto`, und die Kante säße bei kurzem Verlauf mitten im
  Bild. Sie streckt sich jetzt als Flex-Kind.

`overflow-x:clip` bleibt (T2j): `clip` eröffnet keinen Rollbereich, `hidden` hätte es getan.

---

## 3 · Die Scroll-Disziplin wandert zurück ans Fenster

Sie hat jetzt drei Fassungen, und der Gedanke ist in allen derselbe: **Mitlaufen nur, wenn
die Sicht ohnehin schon am Ende steht.** Scrollt die Person hoch, stoppt es von selbst.

| | Bezugspunkt | Ziel |
| --- | --- | --- |
| S62 | Fenster | Composer-Unterkante, ausdrücklich **nicht** das Seitenende |
| U10.4 | Gesprächszone | Ende des Verlaufs |
| **S121.4** | **Fenster** | **Ende des Dokuments** |

S62 mied das Seitenende, weil Footer und Dev-Panel unterhalb des Composers lagen. Das gilt
nicht mehr: Die Schreibkante klebt, unter ihr steht nichts, was man erst wegrollen müsste.
Deshalb ist das Dokumentende jetzt das richtige Ziel — und ein Wächter, der genau das
verbot, ist umgekehrt worden.

Gemessen wird weiter **vor** jeder DOM-Änderung, ohne Listener. Umgebungen ohne Layout
melden Nullmaße und damit „nah" — still statt springend, dieselbe Vorsicht wie in S62.

---

## 4 · Umgekehrte Entscheidungen (fünf Wächter)

- `u10-designfehler.spec.js` — „Nur das Gespräch rollt" (drei Fälle).
- `s114-design-textschnitte.spec.js` — der waagerechte Abfang bleibt, das senkrechte Rollen
  ist fort.
- `s119-3-chat-ein-rollbereich.spec.js` — „genau eine Leiste" gilt unverändert, sie sitzt
  nur woanders.
- `s53-wiedereinstieg.spec.js` und `s62-aufdeckrunde-feinschliff.spec.js` — die Spione
  horchen wieder am Fenster statt am Element.

Alle bleiben stehen, mit gedrehtem Vorzeichen und dem Grund im Kommentar. Gelöschte Tests
sind später nicht mehr auffindbar.

---

## 5 · Änderungen

- `core/ui/design.js` — Screen, Innenspalte, Gesprächszone, Schreibkante.
- `core/ui/chat-kern.js` — Scroll-Disziplin am Fenster; `roller()` entfällt.
- `tests/unit/s121-4-chat-klebende-kante.spec.js` — neu.
- Fünf bestehende Testdateien nachgezogen (siehe oben).

---

## 6 · Tests

14 neue Fälle: kein Kasten im Chat eröffnet noch einen senkrechten Rollbereich (inklusive
eines Greifers über **alle** `#scrChat`-Regeln); der waagerechte Abfang bleibt; die Kante
klebt mit `z-index` und behält ihr `flex:none`; die Ausblut-Rechnung (S114c) ist
unangetastet; die Innenspalte hängt nicht mehr an einer Prozenthöhe; und die Disziplin misst
am Fenster — nah, fern, Ziel, und der stille Rückfall ohne Fenster oder ohne `scrollTo`.

**Volle Suite:** 273 Dateien, 2675 Fälle, grün (unit 242/2477 in zwei Scherben,
engine+worker+e2e 31/198).
**Build:** erfolgreich, Kern `0192242bb253040d`.

---

## 7 · Nachweis am laufenden System — und was nur dort prüfbar ist

Die Kernzusicherung („eine Geste über der dunklen Fläche rollt die Seite") lässt sich ohne
Layout nicht testen. Prüfbar ist nur, dass kein Kasten mehr einen eigenen Rollbereich
eröffnet — denn nur solche fangen Gesten ab. Der Rest ist Sichtprobe:

1. Langer Verlauf: **eine** Bildlaufleiste, am Fenster.
2. Wischen über der hellen Fläche rollt die Seite. Wischen über der dunklen ebenso.
3. Die Schreibkante steht dabei am unteren Rand — sie fährt nicht mit hinaus.
4. Neue Antwort bei Sicht am Ende: Die Seite läuft mit. Hochgescrollt: Sie bleibt stehen.
5. Kurzer Verlauf (zwei Nachrichten): Die Kante steht unten, nicht mitten im Bild.
6. **Tastatur auf dem Handy** — der wackeligste Punkt. Eine klebende Leiste über dem
   visuellen Viewport ist auf iOS heikel; falls sie hinter der Tastatur verschwindet oder
   springt, ist das ein eigener Befund und kein Grund, die Umstellung zurückzunehmen.
7. Am Seitenende blutet die grüne Kante wie bisher bis zur Fensterkante aus (S114c).

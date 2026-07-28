# Sprint U1 · Die Feldkante (Turn 41 §2)

Basis: `origin/main` @ `8692bac` **+ Patch U0** · Kern-Hash nach Patch: `c577fe6e888cc7e5`
Suite: 1860 grün (U0-Stand 1848 + 12)

> **Kette:** dieser Patch setzt auf `patch-u0-inline-stile.mjs` auf — beide berühren
> `core/ui/design.js`. Reihenfolge: `U0 → U1`.

Der erste der beiden gemeinsamen Bausteine. Vier Screens werden ihn brauchen (41c, 41d, 41e, 41f);
einer benutzt ihn schon heute.

---

## 1 · Was die Feldkante ist

Kein Rahmen, kein Radius, keine Fläche — nur eine Haarlinie unten:

```css
.rz-feld{border:0;border-bottom:1px solid var(--rz-hairline);border-radius:0;background:none;
  padding:13px 0 12px;min-height:46px;
  font-family:var(--rz-serif);font-size:var(--rz-fs-zeile);line-height:var(--rz-lh-caps)}
```

Dieselbe Geste wie die Schreibkante im Chat, wie §2 es verlangt: eine Linie unter dem Text heißt
überall „hier schreibst du". In der grünen Zone trägt sie `--rz-hairline-gruen` (Entscheidung K8),
und die Code-Eingabe behält `letter-spacing:.2em`.

**Radius 0** — §2 und Entscheidung K15, eng gelesen: auf den Screens 41a–41f gibt es keine Radien.
Die Radien-Token der übrigen App (`.pb-card`, Echo-Pille, Update-Hinweis) bleiben unberührt.

---

## 2 · Der Fokus — und eine Messung, die dem Handover widerspricht

§2 sagt: „Fokus verstärkt die Linie auf `--rz-akzent` (2 px) — **kein** Systemring."

Der zweite Teil ist heikel: wer `outline:none` schreibt, nimmt Tastaturbedienenden ihren einzigen
Anhaltspunkt weg. Der Ersatz muss also tragen. Gemessen trägt er nicht:

| | Kontrast | Schwelle |
| --- | --- | --- |
| `--rz-akzent` auf Papier, **hell** | **2.33 : 1** | 3 : 1 (WCAG 1.4.11, nicht-textlicher Bedienhinweis) |
| `--rz-akzent` auf Tiefgrün, hell | 6.01 : 1 | ✓ |
| `--rz-akzent` auf Papier, dunkel | 8.06 : 1 | ✓ |

Ausgerechnet der häufigste Fall — ein Feld auf Papier im hellen Theme — reißt die Schwelle, und
zwar an der Stelle, an der der Systemring gerade abgeschaltet wurde.

**Umgesetzt:** auf Papier zieht die Fokuslinie `--rz-akzent-ink` (**7.63 : 1**), auf Tiefgrün
bleibt es `--rz-akzent` (6.01 : 1). `--rz-akzent-ink` ist derselbe Akzent in seiner Schriftrolle —
kein neuer Farbwert, keine Palettenänderung. Dieselbe Korrektur wie beim Sprachknopf in T3-3.

Beide Paare sind in den **Kontrast-Wächter** aufgenommen, als nicht-textliche Rolle mit
Schwelle 3 : 1. Wer die Farbe ändert, kommt dort vorbei.

**Kein Höhensprung.** Die Linie wächst von 1 auf 2 px, das Polster darunter gibt einen Punkt ab
(13/12 → 13/11). Ohne das rutscht beim Antippen alles darunter um einen Punkt — auf einem Screen
mit zwei Feldern übereinander sichtbar.

---

## 3 · Erster Nutzer: der Rahmensatz der Vorschau (§4.11)

`.rz-ausw-rahmen` war ein `<textarea>` ohne Feldregel — es setzte nur Breite und `min-height` und
erbte im Übrigen den Browser-Rahmen. Das ist das einzige Feld, das den Baustein heute schon
benutzen kann; die drei anderen entstehen erst mit U4 bis U6.

**Das ist Absicht:** so lässt sich die Feldkante an *einem* Ort ansehen und beurteilen, bevor drei
Screens von ihr abhängen. Findest du sie zu leise oder zu laut, ist das jetzt eine Regel — später
wären es vier Screens.

---

## 4 · Nicht in diesem Schritt

§2 nennt außerdem `.pb-btn primary` → `.rz-zeile.rz-knopf-flach`. Beim Nachsehen: `pb-btn primary`
steht an **zehn** Stellen quer durch die App (Skala, Messung, Kernwetten, Kapitel-Panel,
Einstellungen …), nicht nur im Wiedereinstieg. §2 meint erkennbar die Knöpfe der Recovery-Screens;
alles andere wäre ein eigener Sprint mit eigener Sichtprüfung. Der Tausch passiert deshalb in U6,
für die Knöpfe dort — nicht global.

---

## 5 · Der Wächter (`tests/unit/u1-feldkante.spec.js`, 8 Tests)

- Kein Rahmen, kein Radius, keine Fläche; Serif 17 auf dem Maß aus §2.
- Grüne Zone trägt den grünen Ton; Code-Eingabe bleibt gesperrt gesetzt.
- **`outline:none` kommt nie ohne Ersatz** — Breite *und* Farbe müssen im Fokusblock stehen.
- Die Höhe springt nicht: 13/12 im Grundzustand, 11 im Fokus.
- Die Rolle ist getrennt: Papier `--rz-akzent-ink`, Tiefgrün `--rz-akzent`.
- Der Rahmensatz trägt keine eigene Rahmenregel mehr.

Dazu zwei neue Paare im Kontrast-Wächter (`t2e-kontrast.spec.js`), Schwelle 3 : 1.

---

## 6 · Prüfliste für die Sichtprüfung (Stufe B)

| # | Was | Wo |
| --- | --- | --- |
| 1 | Rahmensatz: Haarlinie unten statt Browser-Rahmen, Serif, kein Radius | Vorschau nach der Ausschnitt-Auswahl, hell + dunkel |
| 2 | **Hineintippen: die Linie wird kräftiger und grün — und nichts springt** | dieselbe Stelle |
| 3 | Mit der Tastatur hineinspringen (Tab): der Fokus ist eindeutig zu sehen | dieselbe Stelle, hell **und** dunkel |
| 4 | Der Platzhalter bleibt kursiv und leise | dieselbe Stelle |

Punkt 3 ist der wichtige: der Systemring ist weg, es gibt keinen zweiten Hinweis mehr.

---

## 6a · Eine Lehre über verkettete Patches

Der Patch war einmal falsch gebaut, bevor er hier stand — und der Fehler ist lehrreich genug, um
ihn aufzuschreiben.

Ich hatte U1 auf einem **frischen** Clone gebaut statt auf `main + U0`. Die Ankerprüfung lief
trotzdem sauber durch: die Anker waren korrekt gegen den U0-Stand berechnet, es war nur die
**Nutzlast** von der falschen Grundlage. Angewendet hätte der Patch U0s `design.js` durch eine
Fassung ohne `#swUpdate` und ohne `#btnErneutSenden` ersetzt — U0 wäre stillschweigend
zurückgenommen worden, und **kein Test hätte es gemerkt**: die Regeln wären einfach weg gewesen,
und für „diese Regel existiert" gibt es keinen Wächter.

Aufgefallen ist es nur, weil Kern-Hash und Testzahl zwischen Arbeitsbaum und Verifikations-Clone
auseinanderliefen — die Zahlen im Protokoll sind also nicht nur Dokumentation, sie sind der Test
für den Patch selbst.

**Regel daraus:** bei einer Kette wird die Nutzlast auf `main + Vorgänger` gebaut, nicht nur
dagegen geankert. Der Byte-Vergleich am Ende muss gegen genau diesen Baum laufen.

---

## 7 · Stand des U-Tracks

| | | |
| --- | --- | --- |
| U0 | Inline-Stile außerhalb der Turn-41-Screens | geliefert |
| **U1** | Feldkante (§2) | **dieser Patch** |
| U2 | Aufgeklappter Wegweiser wird die Zone (§3) | startbar — berührt alle vier vorhandenen Wegweiser |
| U3 | Freigabe-Auswahl (41a, 41b) | braucht U1, U2 |
| U4 | Freigabe-Vorschau (41c) | braucht U1 |
| U5 | Zugang in den Einstellungen (41d) | K13: wird ein Screen — Navigation und Bedien-Ecke vorher klären |
| U6 | Pflicht-Vollbild (41e, 41f) | braucht U1 |

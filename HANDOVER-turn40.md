# Handover · Turn 40 — Design-Set auf Repo-Tokens

Stand 2026-07-27 · Quelle: `cwittenb/unserbegleiter@main`
(`core/ui/theme.js`, `core/ui/design.js`, `core/ui/kulisse.js`, `core/ui/app.js`)
Designdokument: `Raumzuzweit Design.dc.html`, Abschnitt **Turn 40** (40a–40i)

Turn 40 ist die verbindliche Fassung: jeder Wert stammt aus dem Repo.
Turn 39 ist als Farbstudie archiviert — entschieden ist **Turn 40, eine Palette** (siehe §4).

---

## 1 · Was Turn 40 zeigt

| Id | Screen | Repo-Entsprechung |
| --- | --- | --- |
| 40a / 40e | Startseite hell / dunkel | `app.js` → `#scrStart` |
| 40b / 40f | Vorraum eigener Raum | `#scrMyRoom` |
| 40c / 40g | Vorraum gemeinsamer Raum | `#scrShared` |
| 40d / 40h | Regal geöffnet | `.rz-regal-offen` |
| 40i | VGR Desktop ≥ 900 px | Media-Query-Block in `design.js` |
| 40j / 40k | Chat hell / dunkel | `CHAT_HTML()` in `app.js`, D4-Block |
| 40l | Chat Desktop | `.rz-chat-innen` (640-px-Spalte) |

Übernommene Bausteine, wörtlich: `.rz-half` (flex:1, 30/24, 34 px Fußraum), `.rz-zeile` (Haarlinie, 44 px, Serif 17/1.3, `.rz-pfeil` 15 px), `.rz-caps` (.2em), `.rz-signatur` / `.rz-fussmarke` (.34em), `.rz-weg-badge` (.16em, 9/18, Gap 8, Wegweiser-Zeichen), `.rz-initial` (22 px), `.rz-balken` (2 px), `.rz-kulisse-naht` / `-fuss` (84 px), Bedien-Ecke aus `CHROME_HTML` mit den `zeichen()`-Glyphen (hell = Seerose, dunkel = Baum, `--rz-marke`).

Palette (Literale, weil das Dokument keine Custom Properties trägt): Papier `#faf8f2` / `#242b21`, Tiefgrün `#1e2a22` / `#101b14`, Akzent `#8fae74` / `#aeca8d` auf `#14201a`, Haarlinie `#e3dfd0` / `#39412f`, auf Grün `rgba(157,176,143,.28)`, Sekundär `#8b917d` · `#a3a894` / `#9aa38c` · `#7f8672`, Label `#7d9b62` / `#aeca8d`, Pfeil auf Grün `#a9c88b`.

---

## 2 · Korrigierte Abweichungen im Designdokument

**Aus Turn 39 (Typo/Raster, jetzt geglättet):** Zeilentitel 20 → 17 px, H2 26 → 24 px, Pfeile 13 / 13,5 / 14 → 15 px, Absenderlabel 10,5 → 11 px, Nebenzeilen 12 → 13 px, Zeilenhöhen 1.16 → 1.18 (Titel) und 1.6 → 1.5 (fein); Sperrungen fest je Rolle; Abstände auf das 4er-Raster; Badge 9/18 mit Gap 8.

**Eigene Fehlannahmen, in Turn 40 behoben:**

1. *Eigener Vorraum war hell auf hell.* Der Kommentar „hell im eigenen Raum, dunkel im gemeinsamen" in `design.js` steht im `#scrChat`-Block und gilt nur dort. In `app.js` ist die untere Zone in **allen** drei Screens `rz-half rz-tiefgruen`. → 40b/40f auf Tiefgrün.
2. *Kulisse frei gezeichnet.* Die Formen liegen in `kulisse.js` (`BAUM_PLAETZE`, `TEICH_PLAETZE`, Hügel-/Wasserlinie, Masken-Ringe). → übernommen, n = 5.
3. *Bedien-Ecke fehlte.* → in allen neun Screens, 36 px Tapziel, Glyph = Wechselziel.

---

## 3 · Findings für die Implementierung

### 3.1 Höhenbudget der oberen Zone (blockierend auf kleinen Geräten)
Gemessen bei 390 px Breite: der Inhalt der oberen Zone im Vorraum (Kopf 26 px + `.rz-h1` + `.rz-sub` + Zonen-Label + zwei/drei `.rz-zeile`) braucht **397 px**. Bei `flex:1` auf beiden Hälften trägt das erst ab **≈ 800 px Screenhöhe**. Auf 667–740 px hohen Geräten bleiben der oberen Hälfte ~333 px — die Zeilen laufen dann in die Naht und unter das Badge.
Empfehlung: entweder `.rz-fuss` in der oberen Hälfte ein `padding-bottom` in Höhe der halben Badge-Höhe + Luft geben (im Dokument: 24 px) **und** die obere Hälfte scrollbar machen (`min-height:0; overflow:auto`), oder `.rz-sub`/`.rz-intro` unter 700 px Höhe ausblenden. `min-height:0` allein ist falsch: die Zone schrumpft dann still unter ihren Inhalt, `margin-top:auto` verliert seinen Spielraum und die letzte Zeile wandert über die Naht — genau dieser Fehler ist im Dokument aufgetreten.

### 3.2 Badge-Freiraum
Zielwert aus dem Dokument: **≥ 32 px** zwischen Unterkante der letzten Hairline-Zeile und Oberkante des Badges (Badge ist 32 px hoch, halb über der Naht). Aktuell garantiert `design.js` diesen Abstand nirgends.

### 3.3 Desktop (≥ 900 px)
Die Flankierung hängt an `50dvh` (`.rz-fuss{margin-bottom:50dvh}` links, `margin-top:calc(50dvh - 30px)` rechts) und trifft das `top:50%` des Badges nur, solange die Hälfte wirklich 100 dvh hoch ist. Sobald eine Spalte überläuft (lange Sessionlisten, gesperrte Zeile mit Zustandstext), driften Badge und Gruppen auseinander. Robuster: Badge und Flanken an denselben Anker hängen (Grid mit drei Reihen `1fr auto 1fr`) statt beide getrennt gegen die Viewporthöhe zu rechnen.

### 3.4 Kontrast
- `--rz-gedimmt` `#a3a894` auf Papier `#faf8f2` ≈ **2.4:1** — trägt für die gesperrte Zeile („noch gesperrt", `.rz-zustand`) und die Kopf-Signatur nicht. Vorschlag: `.rz-zustand` und `.rz-signatur` auf `--rz-sek` (`#6b7261`, ≈ 5.2:1); `--rz-gedimmt` bleibt für rein dekorative Zustände.
- Dunkel ist `#7f8672` auf `#242b21` ≈ 3.4:1 — für 11 px Caps ebenfalls grenzwertig.

### 3.5 Typo-Skala: zwei Restfragen
- `.rz-h2` zieht `--rz-fs-titel` (30 px), die aufgeklappte Regalzeile `.rz-zeile.rz-auf` dagegen `--rz-fs-sektion` (24 px). Beide sind „Zonentitel". Im Dokument steht 30 px am Zonenfuß und 24 px im offenen Regal — bitte bestätigen, dass das gewollt ist.
- `.rz-zeile` setzt `line-height:var(--rz-lh-caps)` (1.3). Für 17 px Serif ist das knapp, aber im Dokument übernommen.

### 3.6 Kulisse
`baueKulisse()` rendert beide Fassungen und blendet per CSS eine ein; `.rz-kulisse-fuss` erzwingt immer den Teich (T1a/F2). Im Dokument ist deshalb: Naht auf dem Startscreen = Bäume (hell) bzw. Teich (dunkel), Zonenfuß in beiden Vorräumen = Teich. Der Naht-Halter trägt `transform:translateY(-100%)`, die Silhouetten stehen also in der Papier-Zone — das kollidiert mit 3.1, wenn dort kein Freiraum bleibt.

### 3.8 Chat / Session (40j hell, 40k dunkel, 40l Desktop)
Gebaut aus `CHAT_HTML()` in `app.js` und dem D4/D12-2b/2c-Block in `design.js`: Kopf mit Signatur, Sessionname als leise Serif-Zeile, Verlauf ohne Blasen (Begleitung Serif 17/300 links, eigene Antwort Sans 15 rechts in `--rz-nutzer`), Sprecher-Marke als Caps mit `margin-bottom:-17px`, darunter die Schreibkante als eigene Tiefgrün-Zone mit Badge auf der Naht, Composer, `rz-knopf-flach` und Fußmarke.

- **Tapziele unter dem Minimum.** `.pb-btn` setzt `min-height:44px`, aber `#scrChat #btnSend` und `#btnMic` überschreiben auf **34 px**. Das ist die am häufigsten benutzte Aktion der App. Empfehlung: 44 px Trefferfläche (Fläche darf optisch 34 px bleiben, z. B. über Polster).
- **Desktop-Band.** `.rz-chat-innen` ist eine 640-px-Spalte, die Schreibkante blutet aber nur um das 24-px-Screenpolster aus (`margin:24px -24px`). Auf breiten Schirmen steht deshalb ein 688-px-Tiefgrün-Band frei auf Papier — als Kante gelesen wirkt es wie ein Kasten. Entweder full-bleed (`margin-left:calc(50% - 50vw)`) oder bewusst als Karte mit Radius; heute ist es weder noch.
- **Gekoppelte Konstanten.** Die negativen Ränder der Schreibkante (`-24px`) müssen exakt dem Screenpolster (`24px`) entsprechen; ändert jemand eines von beidem, entsteht ein heller Streifen. Besser eine Custom Property (`--rz-rand`) an beiden Stellen.
- **Sprecher-Marke.** `margin-bottom:-17px` rechnet gegen `gap:22px` der Nachrichtenliste. Ändert sich der Gap, klebt das Label an der Nachricht oder schwebt. Sauberer: Label und Nachricht in einem Container ohne Gap.
- **Badge muss im Chat ein Knopf werden (Änderung gegenüber dem Ist).** Heute ist `.rz-weg-badge` dort ein `<span>` mit `cursor:default` (`#scrChat .rz-chat-unten .rz-weg-badge{cursor:default}`) — reine Ortsmarke. Gewünscht ist ein **Knopf, der Hilfe im Gespräch öffnet**: `<button>` mit `verdrahteWegweiser(doc, badge, panel)` wie in den Vorräumen, Panel als `.rz-weg-panel` aus der Naht. Zu tun: CSS-Regel `cursor:default` entfernen, Element auf `<button>` heben (fokussierbar, `aria-haspopup="dialog"`), Panel-Container in `CHAT_HTML()` ergänzen, Texte über `weg.*` bzw. einen neuen Schlüsselraum (z. B. `hilfe.chat*`) — **Text steht noch aus**. Offen zu klären: ob der wartende Punkt (`.rz-wartet`) hier eine Bedeutung hat (Vorschlag: nein, im Gespräch wartet nichts).
- **Kulisse an der Naht** steht per `translateY(-100%)` über der Schreibkante, also im Verlauf. Bei langen Nachrichten liegen die Silhouetten (Deckkraft ≤ .22) hinter Text — im Dokument sichtbar, aber unkritisch.

### 3.7 Offen aus Turn 27 (unverändert)
`weg.*` braucht einen Badge-Label-Schlüssel je Ort; der Panel-Kopf bleibt `weg.badge`. Im Dokument tragen die Badges „Wegweiser" (S), „Raum für mich" (VER), „Raum für uns" (VGR/Regal).

---

## 4 · Entschieden: Turn 40, eine Palette

**Turn 40 ist die Referenz.** Es bleibt bei EINER Palette (Papier / Tiefgrün + ein Akzent je Theme) und bei der Hairline-Zeile als Sprache von Navigation und Auswahl — also bei `theme.js` und `design.js`, wie sie sind. Für `theme.js` heißt das: keine zusätzlichen Flächen-Token, keine zweite Farbfamilie.

Turn 39 (warm = mich, grün = uns, zwei Helligkeitsstufen je Familie, Zeilen ohne Trennlinien) ist damit **Archiv** — als Farbstudie im Dokument belassen, nicht implementieren.

# Sprint L1 — Landing-Paket (Design Turn 44)

**Quelle:** `Raumzuzweit Design.dc.html`, Abschnitt Turn 44 (44a–44e) · Begleitdokument `Handover · Turn 44 — Landing-Paket`, Stand 2026-08-05
**Basis:** `origin/main` @ `ca9a5f7` (`patch-s114c-schreibkante-zwischenbreite`)
**Ersetzt:** Landing 11a/12a aus Sprint D7 · Kette: … → patch-s114c → **patch-l1**

## Ziel

Die Landing auf den Stand von Turn 40/41 ziehen und um die zwei Rechtsseiten ergänzen, die §5 DDG, App-Stores und Zahlungsanbieter als eigene, verlinkbare Adressen verlangen. Gegenüber 11a/12a ist nichts umgebaut, aber alles neu vermessen.

## Entscheidungen (vor der Umsetzung eingeholt)

| | Frage | Entschieden |
|---|---|---|
| F1 | Fehlender Wortlaut | Designdokument nachgereicht — alle Texte wörtlich übernommen, nichts erfunden |
| F2 | `#5c6653` vs. `--rz-sek` | **a** · Der Token-Name gewinnt: `--rz-sek` = `#6b7261` (4,70:1, AA). `#5c6653` ist `--rz-marke` und bleibt der Wortmarke vorbehalten |
| F3 | Display-Stufe 44 px (§7.1) | **b** · Keine Display-Stufe. Der Desktop-Hero fällt auf 30 px wie mobil; `theme.js` bleibt unberührt |
| F4 | KI-Transparenz (44e) | **b** · Tonlage B („klar"), jetzt umgesetzt |
| F5 | Standortbestimmung / Fokus (§7.5) | **c** · Die App zieht nach — eigener Sprint. Die Landing behält die Publikumswörter |
| F6 | Naht auf den Rechtsseiten (§7.9) | ohne Naht |
| F7 | Bilingual (§7.8) | später |
| F8 | Dark Mode | **a** · fällt weg |

## Umsetzung

### L1.1–L1.3 · Grundgerüst, Hero, Kulisse

`platforms/cloudflare/landing/index.html` neu aufgebaut. Eine Datei trägt beide Fassungen; der Umschaltpunkt ist `@media (min-width:900px)`, mobil ist die Vorgabe.

- **Palette** als `:root`-Block, 1:1 aus `core/ui/theme.js` gespiegelt (die Landing importiert den Kern bewusst nicht — eigenes Deploy-Ziel, self-contained). Kein Farbliteral außerhalb dieses Blocks.
- **Typo** ausschließlich 11 / 13 / 15 / 17 / 24 / 30. Die sieben Streuner von 11a (46/32/26/18/14.5/12.5/10.5) sind weg.
- **Wortmarke** 11 px / 600 / `.34em` — die Marken-Spur, nicht die Badge-Spur `.16em` (§2.3).
- **Naht-Badge** „Nur mit Einladung", ohne Wegweiser-Zeichen (§5a). Desktop sitzt es auf der linken Kante der Tiefgrün-Hälfte, also auf der senkrechten Naht; mobil auf der waagerechten.
- **Kulisse** (§4): Desktop als waagerechter Boden der Tiefgrün-Hälfte, `height:96px`, Figuren `opacity:.85`. Mobil an der Naht wie in der App, `transform:translateY(-100%)`, Papier-Hälfte mit `padding-bottom: var(--rz-kulissenfrei)`. Ausdrücklich **nicht** `--rz-nahtfrei` (32 px, Badge-Maß) — der Token kommt im Code nicht vor.

### L1.4/L1.5 · Das Emblem

Desktop `viewBox="0 0 1000 410"`, cx = 500 = Hero-Naht bei `1fr 1fr`. Mobil `viewBox="0 0 390 320"`, Kern waagerecht geteilt — die Grafik folgt der Naht des Screens, auf dem sie steht. Beide Fassungen sind aus dem Designdokument übernommen; geändert wurden nur die Farbliterale zu `var(--rz-*)` (im Inline-SVG gültig), damit der Wächter aus L1.1 die ganze Datei abdecken kann.

Die Rollen-Zusätze (15 px Sans) trägt nur der Desktop. Mobil bleiben die vier Überschriften; die frühere Liste unter der Grafik ist ersatzlos gestrichen.

### L1.6 · Struktur und Einladung

Vier Serif-Zeilen 24 px, `padding:22px 0` (mobil 18). Das Signup-Feld verliert seinen Rahmen und wird zur Haarlinien-Zeile mit der Signatur aus der App (`min-height:44px; box-sizing:border-box; padding:15px 0`). Damit hat die Landing **keinen gerahmten Container mehr** — ein Test hält das fest.

### L1.7 · Fuß und Rechtsseiten

Fuß: drei Links, zwei Ziele — Kontakt springt ins Impressum, keine `mailto:`-Adresse. Mobil gestapelt (Links über der Wortmarke, `gap:14px`), Desktop in einer Zeile.

`landing/impressum/index.html` (44c): acht Felder als Haarlinien-Zeilen mit fester Feldspalte `width:200px`, damit alle Werte auf einer Kante stehen.

`landing/datenschutz/index.html` (44d): neun Kapitel als Regal. Die drei rechtlichen Bedingungen sind im Test verankert — eigene Adresse, ein eindeutiger Anker je Kapitel (der Text nennt ihn selbst, damit er weitergebbar ist), und **ohne JavaScript ist alles offen**.

`scripts/build-pages.js` kopiert den Landing-**Ordner** rekursiv (`kopiereBaum`) statt einer Einzeldatei. Weiterhin nach `dist/cloudflare/landing/`, nicht unter `public/` — die Deploy-Ziele bleiben getrennt.

### L1.8/L1.9 · Altbestand und KI-Transparenz

`tests/unit/d7-landing.spec.js` ist entfernt: er prüft 11a/12a-Wortlaut und wäre nach Turn 44 rot. An seine Stelle tritt ein Wächter, der die abgelösten Formulierungen, Sonderfarben und Typo-Streuner festnagelt.

KI-Transparenz an drei Orten: Hero, vierter Satz in „Eine tragende Struktur", eigenes Datenschutz-Kapitel. Kein Badge, kein „powered by AI", kein Roboter-Zeichen.

## Kleine Entscheidungen (selbst getroffen)

1. **Fußfläche.** Der Entwurf setzt `#141f18`; `theme.js` kennt den Ton nicht, §2.1 verbietet neue Töne. Genommen wird `--rz-fuss: #14201a` (= `--rz-akzent-text`, der dunkelste Ton der Palette). Abstand G 31→32, B 24→26 — unter der Wahrnehmungsschwelle. Der Wächter aus L1.1 führt `--rz-fuss` als einzige Ausnahme.
2. **Neun statt acht Datenschutz-Kapitel.** §6c nennt acht; 44e verlangt für die KI-Transparenz ausdrücklich ein eigenes Kapitel (welches Modell, wo verarbeitet, wird trainiert oder nicht). Es steht als „Begleitung durch KI" nach „Gesprächsinhalte und Begleitung".
3. **Progressive Enhancement statt CSS-Trick.** Jedes Kapitel steht als `<details open>` im Markup; erst das Skript klappt ein und öffnet das Kapitel aus der Adresse. `beforeprint` klappt alles wieder auf. Ohne JavaScript steht der ganze Text da — anders ist „alles offen" nicht zuverlässig zu erreichen, `open` lässt sich per CSS nicht erzwingen.
4. **Rechtsseiten mit eigenem `:root`-Block.** Kein geteiltes Stylesheet: jede Seite bleibt einzeln ausliefer- und prüfbar. Der Wächter prüft alle drei gegen `theme.js`.

## Tests

Neu (74 Tests, 6 Dateien), ersetzen `d7-landing.spec.js`:

| Datei | Inhalt |
|---|---|
| `l1-1-landing-grundgeruest.spec.js` | Build-Artefakt · Farbwächter gegen `theme.js` · Typo-Skala · keine Radien/Schatten/Dark-Mode |
| `l1-2-hero-und-kulisse.spec.js` | Zweiteilung · Badge ohne Zeichen · `.34em` vs. `.16em` · Kulisse 96 px, nicht 32 |
| `l1-4-emblem.spec.js` | beide Fassungen, geometrisch nachgerechnet (s. u.) |
| `l1-6-struktur-einladung.spec.js` | vier Sätze im Wortlaut · Zeile statt Kasten · kein Netz-Aufruf (D7/K6) |
| `l1-7-rechtsseiten.spec.js` | drei Links/zwei Ziele · acht Felder · Anker · ohne JS alles offen |
| `l1-8-altbestand-und-ki.spec.js` | 11a/12a-Reste · KI-Transparenz an drei Orten, Tonlage B |

Die Emblem-Tests parsen das SVG und rechnen die **fünf Fallen aus §3.5** nach, statt Strings zu vergleichen:

1. Jeder Ring ist ein `stroke` mit `fill="none"` — keine gestapelte Scheibe (Teildeckkraft addiert sich sonst zu 0,541 und dreht die Schichtung um).
2. Genau ein kräftiger Ring, bei 42 % und an dritter Stelle von außen — er trägt „Ein geschlossener Kreis." allein.
3. Jeder Punktmittelpunkt liegt **in** einer Ringlücke **und** an einem Ring ≥ 12 %. Der mobile NW-Punkt sitzt bei r = 94, nicht bei 100,8.
4. `font-family` im SVG ist gequotet — `Source Serif 4` unquotiert ist kein gültiger CSS-Familienname, die Deklaration würde still verworfen und der Text erbte die Sans.
5. `clipPath`-IDs dokumentweit eindeutig, kein `<mask>`, „Fokus" doppelt gesetzt mit zwei Tinten.

Dazu: Desktop-Labels sitzen mit Delta ≈ −5 auf ihrem Punkt; mobil folgt je Hälfte die Reihenfolge der Punkthöhe (NW über NO, SW über SO).

**Volle Suite grün: 2450 Tests / 256 Dateien.**

## Build

`PAARE_KV_ID=… npm run build` → `dist/cloudflare/landing/{index,impressum/index,datenschutz/index}.html`.

**Kern-Hash `3079590f1d4673f6` — unverändert gegenüber der Basis.** Die Landing liegt außerhalb des Kerns, und F3b hat `theme.js` nicht angefasst.

## Offene Punkte

- **§7.3 · Rechtstexte.** Jeder Impressums-Wert und jeder Datenschutz-Absatz ist Platzhalter und muss von der Anwältin kommen, insbesondere der Satz zur Streitschlichtung. Der Entwurf legt Struktur, Anker, Typo und die technischen Bedingungen fest.
- **§7.4 · Vertrauens-Versprechen mit rechtlicher Wirkung.** „Du entscheidest, was den Raum verlässt.", die vier Sätze unter „Eine tragende Struktur" und besonders der neue vierte („…erzählt nichts weiter.") sind vor Live-Gang gegen die Datenschutzerklärung zu prüfen.
- **Kreis-Nachsatz breitenabhängig.** Das Designdokument setzt hier je Fassung einen *anderen* Satz: Desktop „Und Zeit zum Genießen? …", mobil „Im Zentrum steht euer Fokus …". Beide sind breakpoint-getreu übernommen — damit fehlt mobil die Qualitätszeit-Aussage. Zu bestätigen, ob das so gewollt ist.
- **F5c · App zieht nach.** „Prozessreflexion" → „Standortbestimmung" und „Agenda" → „Fokus" in `core/i18n/de.js` und den betroffenen Screens: eigener Sprint.
- **KI-Transparenz in der App.** Ruhige erste Zeile der Begleitung beim ersten Reflexionsgespräch (`core/ui/chat.js`, `core/i18n/de.js`) — eigenes Handover, ausdrücklich nicht dieser Sprint.
- **§7.7 · `--rz-akzent` als kleiner Text auf Papier** (2,94:1) betrifft die App an jedem Caps-Label und jedem Pfeil. Die Landing weicht auf `--rz-akzent-ink` `#41562c` aus; die App-Frage bleibt offen.
- **Signup-Backend** (D7/K6) und **EN-Fassung** (F7): eigene Sprints.

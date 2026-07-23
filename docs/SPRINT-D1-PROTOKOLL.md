# Sprint D1 — Design-Tokens + drei Grundbausteine

**Design-Track D1** (eigener Nummernkreis neben S93+; Basis: Handoff-Paket „Raumzuzweit Design", maßgeblich Turn 17) · Basis-Commit `d488e03` (patch-s92)

## Ziel

Fundament der neuen visuellen Sprache in `core/ui/design.js` — rein additiv zu den bestehenden `pb-*`-Strukturen, damit alle Screens bis zu ihrem Umzug (D2–D5) unverändert funktionieren. Sichtbare Änderung nach D1: neue Schriften und Serif-Titel; Layout und Verhalten bleiben.

## Umsetzung

**1 · Fonts.** Google-Fonts-Import wechselt von Newsreader auf **Source Serif 4 (300/400/600 + kursiv)** und **Instrument Sans (400/500/600)** [K5 freigegeben]. Basisschrift von `#app` ist jetzt `var(--rz-sans)` (16px/1.65), Titel (`.pb-h1`) tragen `var(--rz-serif)` (30px/300 lt. Spez).

**2 · Design-Tokens.** Vollständige Turn-17-Palette als CSS-Variablen im Namensraum `--rz-*`, Light in `:root`, Dark im `html[data-theme=dark]`-Block: Papier `#faf8f2`, Papier-Regal `#f0ece0`, Hairlines `#e3dfd0`/`#ddd8c6`/`rgba(157,176,143,.28)`, Tiefgrün `#1e2a22`, Dunkel-Regal `#141f18`, Dark-Papier `#242b21`, Dark-Tiefgrün `#101b14`, Dark-Hairline `#39412f`, Akzent `#8fae74` (Text `#14201a`), Akzent hell `#7d9b62`, Pfeile `#a9c88b`, Text-/Sekundär-/Gedimmt-Töne, Nutzerin-Chatfarbe `#41562c`, Labels `#aeca8d`/`#9db08f`. Die alten `--bg1`-…-Variablen bleiben unangetastet bestehen, bis D2–D5 die Screens umziehen.

**3 · Grundbaustein A — Zweiteilung/Naht.** `.rz-split` (zwei `.rz-half` je `flex:1`, `min-height:100dvh`), Farbflächen-Varianten (`rz-papier`, `rz-regal`, `rz-tiefgruen`, `rz-regal-dunkel`), `.rz-auf-naht` als Anker exakt auf der Naht (an der zweiten Hälfte, `translate(-50%,-50%)`). Ab 900px dreht die Naht auf vertikal (`flex-direction:row`, Anker wandert mit).

**4 · Grundbaustein B — Hairline-Zeile.** `.rz-zeile`: Serif 20px (Regal-Zone 19px), 1px-Linie oben (Variante `.rz-unten` für die Zeile unter der Naht), Pfeil-Suffix `.rz-pfeil`, min. 44px Hitziel, als `<button>` nutzbar, `border-radius:0`. Varianten: `.rz-gedimmt` + `.rz-zustand` (Zustandstext statt Pfeil), `.rz-balken` (2px-Fortschritt), `.rz-initial` (runde 22px-Initial-Badge), `.rz-caps` (Caps-Label 11px/.2em).

**5 · Grundbaustein C — Wegweiser-Badge/Panel.** `.rz-weg-badge` (grün, UPPERCASE, eckig, Warte-Punkt via `.rz-wartet`), `.rz-weg-panel` (faltet aus der Naht: `scaleY`+`opacity`, 300ms, `cubic-bezier(.2,.8,.2,1)`, Overlay, `prefers-reduced-motion` respektiert). Neue Export-Funktion `verdrahteWegweiser(doc, badge, panel)`: Badge-Tap toggelt, Klick irgendwohin — auch aufs Panel selbst — schließt; der Dokument-Listener wird genau einmal gesetzt und schließt alle offenen Panels. Noch nirgends verdrahtet; D2 nutzt ihn zuerst.

## Eigenentscheidungen (klein, im Rahmen)

- **Nummernkreis D1–D7** für den Design-Track, um nicht mit S93+ zu kollidieren.
- CSS-Kommentare im `DESIGN_CSS`-Literal **umlautfrei** (ae/oe/ue) — die i18n-Kanarie scannt das Literal; die bestehende Konvention („bewusst unkommentiert") wurde so zu „bewusst umlautfrei kommentiert" erweitert.
- Basis-Schriftgrad 18px → 16px: das Turn-17-Raster arbeitet mit 13–14.5px Fließtext und 16px als Untergrenze (iOS-Zoom); 16px ist der verträgliche Zwischenschritt, bis D2–D5 die Feingrade setzen.
- Dark-Töne ohne explizite Spez (Regal-Dunkel-Papier, gedimmte Dark-Werte) moderat aus der Palette abgeleitet.

## Nicht angefasst

Keine Textänderungen (kein i18n-Schlüssel geändert oder ergänzt). Keine Markup-Änderung in `app.js`. M3-Invarianten (44px, 16px-Zoom-Schutz, safe-areas, scroll-margin) wortgleich erhalten — `m3-mobile-ux.spec.js` läuft unverändert.

## Tests

Neu: `tests/unit/d1-design-tokens.spec.js` (13 Tests) — Fonts, Light-/Dark-Palette (rz-Namensraum je Theme-Block), Bausteine A/B/C inkl. Verhaltens-Test der Panel-Verdrahtung in happy-dom, Bestandsschutz der M3-Literale.

Verifikation auf frischem Clone: dry-run → apply → Idempotenz-Lauf → `npx vitest run` **grün (1185: 1035 Struktur + 121 Worker + 25 Engine + 4 e2e)** → `npm run build` (Kern `4713f7f8e2e2cbf4`).

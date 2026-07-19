# Sprint M3 — Mobile-UX-Härtung: Safe-Areas, Eingabe-Ergonomie, Standalone

Basis (Reihenfolge verbindlich): `origin/main` @ `57cd47f` (patch-s82) **+ `patch-m1-pwa-manifest-icons.mjs` + `patch-m2-service-worker-offline.mjs`** · Kern-Hash nach Sprint: `50a7b7335ab1eeb9`
Kontext: Abschluss von Stufe 1 (PWA) des Mobile-Plans. Danach beginnt Stufe 2 (Capacitor, M4–M6).

## Scope & Ergebnis

1. **Safe-Areas + `viewport-fit=cover`** — beide „Häuser" gleichziehend:
   - Pages-Shell (`build-pages.js`) und Artefakt-Shell (`platforms/artifact/shell.html`): Viewport-Meta erweitert um `viewport-fit=cover` (Inhalt darf hinter Notch/Home-Indicator, Insets regeln den Abstand) und `interactive-widget=resizes-content` (Android: Tastatur verkleinert den Inhalt statt ihn zu überdecken).
   - `DESIGN_CSS`: `#app`-Padding rechnet alle vier `env(safe-area-inset-*)` ein; fixiertes Chrome (`.pb-theme`, `.pb-busy`) weicht der oberen Safe-Area aus; der M2-Update-Chip (`client.js`) respektiert die untere.
2. **Eingabe-Ergonomie** (`DESIGN_CSS`):
   - `input,select,textarea{font-size:max(16px,1em)}` — iOS zoomt beim Fokus in die Seite, sobald ein Textfeld unter 16px liegt; die Regel schließt das klassenweit und zukunftssicher aus.
   - `.pb-composer textarea{scroll-margin-block:80px 40vh}` — wenn der Browser das fokussierte Feld vor der Tastatur in Sicht scrollt, bleibt Luft nach oben und unten (CSS-only, kein JS-Scroll-Gefrickel).
   - Touch-Ziele: `.pb-btn` min. 44px (Apple HIG), Theme-Umschalter min. 36px (fixiertes Neben-Chrome, bewusster Kompromiss zugunsten der visuellen Leichtigkeit).
3. **Standalone-Erkennung** (`core/ui/design.js`):
   - `istStandalone(win)` als reine, exportierte Funktion: `display-mode: standalone` (Manifest) oder das ältere iOS-Signal `navigator.standalone`; defensive Guards, testbar ohne Browser.
   - `applyDesign` setzt `html[data-standalone="1"]` — CSS-Haken für alles Weitere (z. B. künftige Installations-Hinweise nur im Browser-Tab zeigen). Bewusst noch ohne sichtbare Auswirkung.

## Kleine Entscheidungen

- Tastatur-Verhalten CSS-only (`scroll-margin`) statt JS-`scrollIntoView`-Verdrahtung in `app.js` — weniger invasiv, deckt den Standardfall; sollte sich im Gerätetest zeigen, dass einzelne WebViews mehr brauchen, wird das ein gezielter Folgeposten.
- Theme-Umschalter bei 36px statt 44px belassen (siehe oben).

## Lehre aus dem Sprint

Erster Wurf rot an der **i18n-Kanarie**: erklärende CSS-Kommentare mit Umlauten lagen *innerhalb* des `DESIGN_CSS`-Template-Literals — der Kanarien-Scanner prüft Literal-Inhalte, und das zurecht. Regel ab jetzt: Begründungen als JS-Kommentar VOR dem Literal, das CSS selbst bleibt unkommentiert.

## Tests

Neu: `tests/unit/m3-mobile-ux.spec.js` (11 Tests) — alle vier Insets verdrahtet, fixiertes Chrome weicht aus, 16px-Regel, 44px-Regel, Composer-`scroll-margin`, `istStandalone` (4 Fälle inkl. Guards), beide Shells tragen das erweiterte Viewport-Meta, Update-Chip mit unterer Safe-Area, Standalone-Haken im Client-Bundle.

Voller Lauf auf dem Sprintstand: **122 Testdateien / 1007 Tests grün**. Build: alle drei Ziele mit Kern `50a7b7335ab1eeb9`.

## Verifikation nach Patch-Anwendung

```
node patch-m1-pwa-manifest-icons.mjs      # falls noch nicht angewendet
node patch-m2-service-worker-offline.mjs  # falls noch nicht angewendet
node patch-m3-mobile-ux-safearea.mjs --dry-run
node patch-m3-mobile-ux-safearea.mjs
node patch-m3-mobile-ux-safearea.mjs      # Idempotenz
npx vitest run
npm run build
```

Manuelle Abnahme (Gerät oder DevTools-Emulation iPhone/Pixel): Soloreflexion + Gemeinsame Session durchspielen — kein Fokus-Zoom beim Antippen des Composers, Textfeld bleibt über der Tastatur sichtbar, nichts klebt unter Notch/Home-Indicator; installierte PWA trägt `data-standalone` am `<html>`.

## Offen / nächste Schritte

- **Stufe 1 (PWA) ist damit fachlich komplett** — installierbar, offline-fähige Shell, mobil gehärtet.
- **M4**: Capacitor-Gerüst (`platforms/capacitor/`, App-ID **`app.roomfortwo`**, lokal gebündelte Assets, konfigurierbare API-Basis mit same-origin-Default).
- Marken-Umbenennung repo-weit (raumzuzweit) weiterhin eigener Posten auf Zuruf.

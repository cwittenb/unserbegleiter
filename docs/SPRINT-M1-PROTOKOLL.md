# Sprint M1 — PWA-Fundament: Manifest & Icons

Basis: `origin/main` @ `ceac663` (patch-s80) · Kern-Hash nach Sprint: `f68e3fe240c2fa90`
Kontext: Stufe 1 des Mobile-Plans (`PLAN-mobile-app-ios-android.md`), Zielbild b (PWA + Stores), Entscheidungen D3a/D4a/D5b/D6-mit-Push.

## Scope & Ergebnis

1. **Manifest-Quelle** `platforms/cloudflare/pages/manifest.js`: reine Funktion `erzeugeManifest()` + `manifestJson()`. Strings über i18n-Wörterbücher (`pwa.*`), Farben als exportierte Konstanten (`THEME_COLOR` = `--accent` `#0f766e`, `BACKGROUND_COLOR` = `--bg` `#f5f7f9`). Feldnamen W3C-Standard (englisch) — kein S31-Kandidat.
2. **i18n-Keys** in `core/i18n/de.js` + `core/i18n/en.js`: `pwa.name`, `pwa.kurzname`, `pwa.beschreibung` (Paritäts-Wächter greift automatisch). Beschreibung folgt der freigegebenen Positionierung.
3. **Icon-Satz (Platzhalter, D5b)** `platforms/cloudflare/pages/icons/`: `icon-512.png`, `icon-192.png` (purpose `any maskable`, Motiv in der inneren 80%-Safe-Zone), `apple-touch-icon.png` (180×180). Motiv: Teal-Grund, zwei überlappende Kreislinien, aufgehellte Überlappungslinse („gemeinsamer Raum"). Austausch-Stelle: PNGs ersetzen, Dateinamen beibehalten — kein Codeeingriff nötig.
4. **`scripts/build-pages.js`**: schreibt `public/manifest.webmanifest`, kopiert `public/icons/`, erweitert die generierte Shell um `<link rel="manifest">`, `theme-color`, `mobile-web-app-capable` + `apple-mobile-web-app-*` (Titel aus i18n), `apple-touch-icon`, Favicon-Link. Viewport bewusst unverändert (`viewport-fit=cover` gehört zu M3 / Safe-Areas).

## Kleine Entscheidungen (selbst getroffen, leicht revidierbar)

- **`short_name` / Home-Bildschirm-Titel = „Begleiter"**: `unserbegleiter` (14 Zeichen) würde unter iOS-/Android-Icons abgeschnitten. Änderbar per Light-Lane über den i18n-Key `pwa.kurzname`.
- **Manifest-`name` = „unserbegleiter"** (finalisierter Produktname), während `allg.marke`/`<title>` weiterhin „Paarbegleitung" tragen. Die repo-weite Marken-Umbenennung ist bewusst NICHT Teil dieses Sprints — als eigener Light-Lane-Posten empfohlen, sobald gewünscht.
- Ein Manifest, Referenzsprache `de` (`lang: "de"`), analog zur i18n-Fallback-Regel; en-Strings liegen paritätisch bereit.

## Tests

Neu: `tests/unit/m1-pwa-manifest.spec.js` (7 Tests) — Manifest valide + Pflichtfelder, Strings aus i18n ohne Drift, Generator ≡ Build-Output, jede Icon-Referenz löst auf echte PNG mit passender IHDR-Größe auf, Apple-Touch 180×180, Shell-Metas vollständig.

Voller Lauf auf dem Sprintstand: **120 Testdateien grün** (857 Struktur · 97 Worker/Miniflare · 25 Engine-Mock-LLM · 4 e2e). Build: alle drei Ziele (Artefakt, Cloudflare, Eval) mit Kern `f68e3fe240c2fa90`.

## Verifikation nach Patch-Anwendung

```
npm install
node patch-m1-pwa-manifest-icons.mjs --dry-run
node patch-m1-pwa-manifest-icons.mjs
node patch-m1-pwa-manifest-icons.mjs        # Idempotenz: meldet „bereits angewendet"
npx vitest run
npm run build
```

Manuelle Abnahme (Lighthouse „installable"): `npx wrangler dev` aus `dist/cloudflare/`, Chrome DevTools → Lighthouse → PWA-Kategorie; auf iOS Safari „Zum Home-Bildschirm".

## Offen / nächste Schritte

- **M2**: Service Worker (App-Shell-Precache mit Kern-Hash als Cache-Version, Negativ-Tests: API-Routen niemals cachen).
- **D2** (Bundle-ID `de.roomfortwo.app` vs. `de.unserbegleiter.app`) bleibt offen — blockiert erst M4.
- Hinweis: `manifest.webmanifest` wird von Cloudflare-Assets mit korrektem MIME-Typ (`application/manifest+json`) ausgeliefert; kein Worker-Eingriff nötig.

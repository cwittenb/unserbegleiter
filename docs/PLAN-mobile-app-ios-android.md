# Plan: unserbegleiter als Mobile-App (iOS & Android)

Stand: 2026-07-19 · Basis: frischer Klon `origin/main` @ `ceac663` (patch-s80)

## 1. Bestandsaufnahme

Was heute existiert und was für den Mobile-Weg relevant ist:

| Aspekt | Befund | Bewertung für Mobile |
|---|---|---|
| Client | Schlanke SPA, `platforms/cloudflare/pages/client.js` (151 Z.), bündelt `core/ui` via esbuild (IIFE) | ✅ Wiederverwendbar |
| HTML-Shell | Wird in `scripts/build-pages.js` generiert; Viewport-Meta vorhanden | ✅ zentraler Eingriffspunkt |
| PWA-Bausteine | **Kein** `manifest.webmanifest`, **kein** Service Worker, **keine** Icons | ❌ fehlt (Stufe 1) |
| Auth | Magic-Link → Token in `localStorage` | ✅ WebView-/PWA-tauglich |
| API | Reines `fetch` gegen gleichen Origin (Worker) | ✅ kein CORS-Umbau nötig |
| Backend | Cloudflare Worker + KV, bleibt unverändert | ✅ ein Backend für alle Kanäle |
| E-Mail-Zustellung | Magic Links aktuell per Direkt-Übergabe (Testphase) | ⚠️ für Store-Review relevant (Login muss funktionieren) |

Kernaussage: **Die App ist bereits „mobile-first-fähig"** — es fehlt die Verpackung, nicht die Substanz. Es gibt keinen Grund für einen nativen Neubau.

## 2. Strategie: zwei Stufen

### Stufe 1 — PWA (installierbar, ohne Stores)
Manifest + Service Worker + Icons. Nutzer:innen fügen die App über „Zum Home-Bildschirm" hinzu (iOS Safari & Android Chrome). Ergebnis: App-Icon, Vollbild ohne Browser-Chrome, App-Shell offline-fähig.

- **Aufwand:** klein (2 Sprints), reine Ergänzung im bestehenden Build.
- **Grenzen:** kein Store-Eintrag; auf iOS eingeschränkte Push-Fähigkeiten (Web Push seit iOS 16.4 möglich, aber nur für installierte PWAs); Sichtbarkeit/Vertrauen geringer als Store-App.
- **Nutzen unabhängig von Stufe 2:** Die PWA-Artefakte (Manifest, Icons, SW) werden von Stufe 2 vollständig weiterverwendet.

### Stufe 2 — Capacitor-Wrapper (App Store + Play Store)
Capacitor lädt den bestehenden Web-Client in einer nativen Shell. Ein `platforms/capacitor/`-Layer analog zu `platforms/cloudflare/` entsteht; der Web-Code bleibt Single Source of Truth.

- **Empfehlung Capacitor statt Alternativen:**
  - *TWA (Trusted Web Activity):* nur Android — löst iOS nicht.
  - *React Native / Flutter:* Neubau der UI, doppelte Pflege, keine Vorteile für eine text-/gesprächszentrierte App. Verworfen.
  - *Capacitor:* eine Codebasis, native Plugins bei Bedarf (Push, Haptik, Biometrie später), aktiv gepflegt, MIT-Lizenz.
- **Betriebsmodell:** Wrapper zeigt auf die produktive URL (Remote-Load) **oder** bündelt die Assets lokal und spricht nur die API remote an. Vorentscheidung im Plan: **lokal gebündelte Assets** (Store-Richtlinien-konformer, App startet auch bei schlechtem Netz sofort) mit Versions-Handshake gegen den Worker (Kern-Hash-Abgleich → sanfter Update-Hinweis). → offene Frage D3.

### Voraussetzungen außerhalb des Codes (Stufe 2)
- **Apple Developer Program:** 99 USD/Jahr, D-U-N-S nötig falls als Firma. Review-Dauer typ. 1–3 Tage. **macOS + Xcode erforderlich** für iOS-Builds (lokal oder Cloud-Build-Dienst).
- **Google Play Console:** 25 USD einmalig. Review meist < 1 Tag.
- **Review-Anforderungen beachtet werden müssen:** funktionierender Test-Login für Reviewer (Magic-Link-Zustellung!), Datenschutzerklärung-URL, „App Privacy"-Angaben (Gesprächsinhalte = sensible Daten), Alterseinstufung.
- **Kein IAP-Zwang**, solange in der App nichts verkauft wird; falls später Abos: Apple/Google-Billing-Pflicht einplanen.

## 3. Sprintplan

Jeder Sprint in sich abgeschlossen, testbar, als Multipatch (.mjs) mit Sprintprotokoll nach `docs/`.

### Sprint M1 — PWA-Fundament: Manifest & Icons
**Scope:**
1. `platforms/cloudflare/pages/manifest.webmanifest.js` (generierende Quelle, damit Name/Farben aus einer Stelle kommen; de/en-Parität für `name`/`description` via i18n-Modul).
2. Icon-Satz (512/192/180 maskable + Apple-Touch) als generierte SVG→PNG-Pipeline oder eingecheckte Assets → offene Frage D5.
3. `build-pages.js`: Manifest + Icons nach `dist/cloudflare/public/`, `<link rel="manifest">`, `theme-color`, `apple-touch-icon`, `apple-mobile-web-app-*`-Metas in die generierte Shell.

**Tests:** Vitest-Tests gegen den Build-Output (Manifest vorhanden, JSON valide, Pflichtfelder, Icon-Referenzen auflösbar, Metas in `index.html`); i18n-Paritätstest für Manifest-Strings.
**Abnahme:** Lighthouse-PWA-Check „installable" (manuell), Build + Kern-Hash grün.

### Sprint M2 — Service Worker: App-Shell offline & Update-Fluss
**Scope:**
1. `sw.js` (handgeschrieben, ohne Workbox-Abhängigkeit): Precache App-Shell (`index.html`, `app.js`, Manifest, Icons) mit Kern-Hash als Cache-Version; Netzwerk-first für API-Pfade (niemals Sitzungsdaten cachen — Datenschutz), Cache-first für Shell.
2. Registrierung im Client inkl. Update-Erkennung („Neue Version verfügbar" → Reload-Angebot, de/en).
3. Explizite **Nicht-Cache-Liste** für alle Worker-API-Routen (Grundprämisse: keine Gesprächsinhalte persistent im Browser-Cache).

**Tests:** SW-Logik als reines Modul testbar (Fetch-Routing-Entscheidung: welche URL → welcher Cache-Modus) via Vitest + happy-dom; Test, dass API-Routen nie gecacht werden; Cache-Name enthält Kern-Hash.
**Abnahme:** Flugmodus-Test: App-Shell lädt, API-Fehler wird sauber angezeigt.

### Sprint M3 — Mobile-UX-Härtung
**Scope:**
1. Safe-Area-Insets (`env(safe-area-inset-*)`) für Notch/Home-Indicator, `viewport-fit=cover`.
2. Eingabe-Ergonomie: 16px-Mindestgröße für Inputs (iOS-Zoom-Falle), Tastatur-Verhalten im Gesprächsfeld (Scroll-into-view), Touch-Ziele ≥ 44px.
3. `display-mode: standalone`-Erkennung (dezente Anpassungen, z. B. kein „Installieren"-Hinweis, wenn schon installiert).

**Tests:** Canary-Tests auf CSS-Regeln im Build-Output; UI-Logiktests für Standalone-Erkennung.
**Abnahme:** manueller Durchlauf Soloreflexion + Gemeinsame Session auf iPhone- und Android-Viewport.

### Sprint M4 — Capacitor-Gerüst (`platforms/capacitor/`)
**Scope:**
1. Neuer Plattform-Layer `platforms/capacitor/` mit `capacitor.config.ts`-Quelle (App-ID → offene Frage D2, Name, Server-/Asset-Konfiguration).
2. `scripts/build-capacitor.js`: kopiert den Pages-Build (`dist/cloudflare/public/`) als Capacitor-`webDir` nach `dist/capacitor/www/`, schreibt API-Basis-URL-Konfiguration (der Client muss von same-origin-`fetch` auf konfigurierbare Basis-URL umgestellt werden — kleiner Eingriff in `client.js`, mit same-origin als Default → kein Verhalten ändert sich im Web).
3. `npx cap add ios/android` bleibt lokaler Schritt beim Betreiber (native Projekte werden **nicht** eingecheckt in v1; dokumentiert im Protokoll) → offene Frage D4.

**Tests:** Build-Skript-Tests (www-Verzeichnis vollständig, Config generiert, keine KV-/Secret-Leaks in Capacitor-Config); Client-Test: API-Basis-URL-Default = same-origin.
**Abnahme:** `npm run build && node scripts/build-capacitor.js` erzeugt lauffähiges `dist/capacitor/`.

### Sprint M5 — Native Integration: Magic-Link & Rückkanal
**Scope:**
1. **Deep Links / Universal Links:** Magic-Link muss die App öffnen, nicht den Browser. `apple-app-site-association` + `assetlinks.json` werden vom Worker unter `/.well-known/` ausgeliefert (neuer Worker-Route-Test).
2. Token-Übernahme aus dem Link in den App-Kontext (bestehender localStorage-Fluss funktioniert in Capacitor-WebView; Test der URL-Parameter-Übernahme).
3. Statusbar-/Splash-Grundkonfiguration.

**Tests:** Worker-Tests für `/.well-known/`-Routen (Content-Type, Struktur); Client-Test für Link-Token-Übernahme.
**Abnahme:** Magic-Link auf Testgerät öffnet die App und meldet an.

### Sprint M6 — Store-Readiness (überwiegend Doku + Assets)
**Scope:**
1. `docs/STORE-CHECKLISTE.md`: Privacy-Nutrition-Labels (Apple) / Data-Safety (Google) vorformuliert auf Basis `grundpraemissen-und-sicherheit.md`; Reviewer-Testzugang-Konzept (setzt funktionierende Magic-Link-Zustellung voraus — Kopplung an E-Mail-Infrastruktur-Merkposten!).
2. Screenshot-/Store-Text-Rohlinge (de/en) aus der freigegebenen Positionierung.
3. Versions-/Release-Konvention (App-Version ↔ Kern-Hash-Mapping).

**Tests:** keine Code-Tests; Doku-Review durch dich.

### Optional (nach Marktentscheid): Sprint M7 — Push-Benachrichtigungen
Partner-Freigabe / neues Badge als Push. Web Push (PWA, VAPID im Worker) und/oder native Push via Capacitor (FCM/APNs). Bewusst ausgeklammert bis D6 entschieden — größter Einzelposten, eigenes Datenschutz-Review nötig (Push-Payload darf keine Inhalte tragen, nur „Es gibt Neues").

## 4. Abhängigkeiten & Risiken

- **E-Mail-Zustellung** (Merkposten „watch and wait") wird für Stufe 2 zum **harten Blocker**: Store-Reviewer brauchen einen funktionierenden Login. Spätestens vor M6 lösen.
- **Wire-Anglisierung (S31)**: Manifest-/Config-Felder in M1/M4 bitte gleich englisch benennen, damit S31 sie nicht nochmal anfasst.
- **iOS-Build-Umgebung**: ohne macOS kein iOS-Build — Klärung in D4.
- **Datenschutz**: SW-Caching (M2) und Push (M7) sind die beiden Stellen, an denen Gesprächsinhalte versehentlich persistiert/exponiert werden könnten; beide Sprints haben dafür explizite Negativ-Tests.

## 5. Offene Entscheidungen (D1–D6)

- **D1 Zielbild:** a) nur PWA (M1–M3), b) PWA + Stores (M1–M6), c) direkt Stores, PWA nur als Nebenprodukt?
- **D2 App-ID / Bundle-Identifier:** Vorschlag `de.unserbegleiter.app` — ok, oder andere Domain-Basis?
- **D3 Asset-Modus im Wrapper:** a) lokal gebündelt (Plan-Default, empfohlen), b) Remote-Load der Pages-URL?
- **D4 iOS-Build-Umgebung:** Ist ein Mac mit Xcode verfügbar? a) ja, b) nein → Cloud-Build (z. B. GitHub Actions macOS-Runner) einplanen, c) iOS zunächst zurückstellen, Android zuerst.
- **D5 Icons:** a) Du lieferst ein Logo/Icon-Design, b) ich erzeuge ein schlichtes generatives Icon (Wortmarke/Symbol) als Platzhalter mit sauberer Austausch-Stelle.
- **D6 Push:** Teil des Zielbilds (M7 einplanen) oder bewusst ohne Push starten?

## 6. Empfohlener Einstieg

M1 + M2 sind risikofrei und in jedem Zielbild nötig. Vorschlag: nach Beantwortung von D2 + D5 direkt mit **Sprint M1** starten, während D1/D3/D4/D6 parallel reifen dürfen.

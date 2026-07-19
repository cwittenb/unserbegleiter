# Sprint M4 — Capacitor-Gerüst: `platforms/capacitor/` & native Hülle

Basis (Reihenfolge verbindlich): `origin/main` @ `57cd47f` (patch-s82) **+ M1 + M2 + M3** (`patch-m1-pwa-manifest-icons.mjs`, `patch-m2-service-worker-offline.mjs`, `patch-m3-mobile-ux-safearea.mjs`) · Kern-Hash: `50a7b7335ab1eeb9` (unverändert zu M3 — reine Plattform-Schicht).

## Entscheidungen (bestätigt bzw. klein)

- **D2 final: App-ID `app.roomfortwo`** (Reverse-DNS von `roomfortwo.app`) — ab der ersten Store-Einreichung unveränderlich; per Test wörtlich festgenagelt.
- **API-Basis: `https://raumzuzweit.de`** (Nutzer-Vorgabe), committet in `platforms/capacitor/deploy.config.js`; Umgebungsvariable `RZZ_API_BASIS` hat Vorrang (Testinstanz/CI). Ungültige oder fehlende Basis bricht den Build — kein stiller Fallback (Konfigurationsprinzip).
- **D3a umgesetzt:** Assets lokal gebündelt; `capacitor.config.json` mit `server.androidScheme: "https"`, Standard-Origins der Hülle bleiben (kein `hostname`-Trick — der würde API-Requests lokal abfangen statt sie zum Worker zu lassen).
- `build:capacitor` ist bewusst NICHT Teil von `npm run build` (native Hülle auf Zuruf, Web-Build bleibt schnell).

## Scope & Ergebnis

1. **`platforms/capacitor/deploy.config.js`** (neu): `APP_ID`, `API_BASIS` — analog zum Cloudflare-Muster, keine Geheimnisse.
2. **`platforms/cloudflare/pages/api-basis.js`** (neu): DOM-freie Client-Ecke — `apiBasis()` (leer = same-origin, Web-Default) und `istNativeShell()`.
3. **`client.js`**: `fetch(apiBasis() + pfad, …)`; SW-Registrierung wird in der nativen Hülle ausgelassen (Assets lokal, SW überflüssig). Im Web ändert sich exakt nichts (Basis leer).
4. **`scripts/build-capacitor.js`** (neu): baut den Pages-Client, leitet `www/` daraus ab (**ohne `admin.html`** — Betreiber-Werkzeug gehört nie in die Endnutzer-App), injiziert `globalThis.RZZ_API_BASIS` VOR dem App-Skript, schreibt `capacitor.config.json` (`appName` aus i18n `pwa.name` = „raumzuzweit").
5. **`package.json`**: Skript `build:capacitor`.

## Native Projekte — lokaler Schritt beim Betreiber (Mac, D4a)

Die iOS-/Android-Projekte werden bewusst nicht erzeugt oder eingecheckt (v1). Einmalig lokal:

```
npm run build:capacitor
cd dist/capacitor
npm init -y && npm i @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android
npx cap add ios && npx cap add android
npx cap open ios        # Xcode: Signing-Team wählen, auf Gerät starten
```

Nach jedem neuen `npm run build:capacitor`: `npx cap sync` in `dist/capacitor/`.

## Bekannte Lücke → explizit M5-Scope

Die native Hülle spricht die API **cross-origin** (`capacitor://localhost` bzw. `https://localhost` → `https://raumzuzweit.de`). Damit Cookie-Auth dort funktioniert, braucht der **Worker** in M5: CORS-Antworten (konkrete App-Origins, `Access-Control-Allow-Credentials`), Cookies mit `SameSite=None; Secure`, Preflight-Handling — plus Universal-/App-Links für den Magic-Link. Bis dahin ist die Hülle baubar und startet, aber ohne Anmeldung gegen die produktive API.

## Tests

Neu: `tests/unit/m4-capacitor-geruest.spec.js` (11 Tests) — API-Basis rein (Web-Default leer, gesetzte Basis), App-ID/API-Basis wörtlich, `www/` vollständig inkl. PWA-Artefakten, NEGATIV `admin.html` nie in `www/`, Injektion vor dem App-Skript, Config-Felder, NEGATIV ungültige Basis bricht Build, Env-Vorrang, Client-Verdrahtung.

Voller Lauf: **123 Testdateien / 1018 Tests grün**. `npm run build` (Web) und `npm run build:capacitor` beide erfolgreich, Kern `50a7b7335ab1eeb9`.

## Verifikation nach Patch-Anwendung

```
node patch-m1-pwa-manifest-icons.mjs        # Kette, falls noch nicht angewendet
node patch-m2-service-worker-offline.mjs
node patch-m3-mobile-ux-safearea.mjs
node patch-m4-capacitor-geruest-api-basis.mjs --dry-run
node patch-m4-capacitor-geruest-api-basis.mjs
node patch-m4-capacitor-geruest-api-basis.mjs   # Idempotenz
npx vitest run
npm run build && npm run build:capacitor
```

## Offen / nächste Schritte

- **M5**: Magic-Link & Rückkanal — `/.well-known/`-Routen im Worker (`apple-app-site-association`, `assetlinks.json`), CORS + `SameSite=None`-Cookies für die App-Origins, Token-Übernahme, Statusbar/Splash.
- **M6**: Store-Readiness (Checkliste, Privacy-Angaben, Reviewer-Zugang — E-Mail-Zustellung wird dort zum Blocker).
- Marken-Umbenennung repo-weit weiterhin eigener Posten.

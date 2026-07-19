# Sprint M5 — Native Integration: Magic-Link, CORS & Rückkanal

Basis (Reihenfolge verbindlich): `origin/main` @ `57cd47f` (patch-s82) **+ M1 + M2 + M3 + M4** · Kern-Hash: `50a7b7335ab1eeb9` (unverändert — Worker/Pages sind Plattform-Schicht).
Erster M-Sprint mit Worker-Eingriff; entsprechend mit Miniflare-Tests gegen den echten, gebündelten Worker abgesichert.

## Scope & Ergebnis

1. **`platforms/cloudflare/worker/app-origins.js`** (neu, rein): App-Origins der Hülle (`capacitor://localhost` iOS, `https://localhost` Android), `istAppOrigin`, `preflightAntwort` (OPTIONS → 204), `mitAppCors` (Antwort-Hülle inkl. `Vary: Origin`), `aasaNutzlast`, `assetlinksNutzlast`.
2. **Worker (`index.js`)**:
   - `fetch`-Hülle: Preflight vorab; **jede** Antwort — auch Fehler — trägt für App-Origins die CORS-Köpfe.
   - **`/.well-known/apple-app-site-association`** und **`/.well-known/assetlinks.json`**: fail-closed mit 503 + klarer Ansage, solange `APPLE_TEAM_ID` bzw. `ANDROID_CERT_SHA256` fehlen (Konfigurationsprinzip; beide Werte sind erst nach Team-Beitritt bzw. Keystore-Erzeugung bekannt). Fingerprint wird großgeschrieben normalisiert. AASA verknüpft nur den Einstieg `/` — das Magic-Token lebt im Fragment und nimmt an der Pfad-Zuordnung nicht teil.
   - **Cookies:** `cookieHeader` (util.js) mit `sameSite`-Option, Default `Lax` — Web-Verhalten byte-gleich. NUR bei App-Origin-Anfragen setzen `enroll`/`session` `SameSite=None; Secure`.
3. **Sicherheitsrahmen:** CORS ausschließlich für die zwei bekannten App-Origins — kein Wildcard, keine Reflektion beliebiger Origins (per Negativtest festgenagelt, inkl. `http://localhost` und `https://localhost:3000`). Admin-Gates bleiben Gates (401-Antworten tragen lediglich CORS-Köpfe).
4. **Client:** `deep-link.js` (neu, rein): `tokenAusUrl` (Fragment `#t=…`, wie im Web) + `lauscheAppLinks` (Capacitor-`appUrlOpen`, defensiv geprüft). `boot()` registriert den Lauscher nur in der nativen Hülle und speist das Token in den bestehenden Boot-Pfad ein (`location.hash` + Reload) — **kein zweiter Auth-Pfad**, der Enroll-Code bleibt einer.
5. **`build-capacitor.js`:** Plugin-Konfiguration `CapacitorHttp` + `CapacitorCookies` (enabled) — hebt `fetch` auf die native Netzwerkschicht, macht Cookie-Persistenz in WKWebView (ITP) robust; der Worker-CORS bleibt als Rückfallebene für den reinen WebView-Pfad. Dazu `SplashScreen` (Hintergrund `#f7f4ea` = `--bg1`, keine Kunstpause).
6. **`build-pages.js`:** wrangler.toml-Kommentarblock dokumentiert die neuen `[vars]`.

## Deployment-Angaben (wenn soweit)

- `APPLE_TEAM_ID`: Apple Developer → Membership (10-stellige Team-ID) — als `[vars]` in `dist/cloudflare/wrangler.toml` bzw. Dashboard.
- `ANDROID_CERT_SHA256`: `keytool -list -v -keystore <keystore>` → SHA-256-Fingerprint. Für den Play-Store-Fall gilt der Fingerprint aus der Play Console (App Signing), nicht der Upload-Key.
- Nativ (lokal, einmalig): iOS „Associated Domains"-Capability `applinks:raumzuzweit.de` in Xcode; Android `intent-filter` mit `autoVerify` für `https://raumzuzweit.de` — beides Schritte im nativen Projekt, im Protokoll statt im Repo, da die nativen Projekte bewusst nicht eingecheckt sind (M4).

## Tests

Neu: `tests/unit/m5-app-anbindung.spec.js` (8 Tests — Origins exakt, Preflight, CORS-Hülle mit Negativseiten, AASA-/assetlinks-Nutzlasten, Cookie-Default bleibt Lax, Deep-Link-Token inkl. Unfug-Fällen) und `tests/worker/m5-app-anbindung.spec.js` (9 Tests, Miniflare — fail-closed ohne Vars, korrekt mit Vars, CORS auf echten und Fehler-Antworten, NEGATIV fremde Origins, Preflight, **SameSite=Lax im Web / None nur für App-Origins** über den echten Enroll-Fluss).

Voller Lauf: **125 Testdateien / 1035 Tests grün**. `npm run build` und `npm run build:capacitor` erfolgreich, Kern `50a7b7335ab1eeb9`.

## Verifikation nach Patch-Anwendung

```
node patch-m1-pwa-manifest-icons.mjs        # Kette M1–M4, falls noch nicht angewendet
node patch-m2-service-worker-offline.mjs
node patch-m3-mobile-ux-safearea.mjs
node patch-m4-capacitor-geruest-api-basis.mjs
node patch-m5-applinks-cors-deeplink.mjs --dry-run
node patch-m5-applinks-cors-deeplink.mjs
node patch-m5-applinks-cors-deeplink.mjs    # Idempotenz
npx vitest run
npm run build && npm run build:capacitor
```

Manuelle Abnahme auf dem Gerät (nach `cap sync` + Associated-Domains/Intent-Filter): Magic-Link in Mail/Notizen antippen → App öffnet sich, Anmeldung läuft; danach App beenden/neu öffnen → Session besteht (Cookie-Persistenz).

## Offen / nächste Schritte

- **M6**: Store-Readiness — `docs/STORE-CHECKLISTE.md` (Privacy-Labels/Data-Safety aus den Grundprämissen, Reviewer-Zugang, Versions-Konvention App ↔ Kern-Hash), Store-Text-Rohlinge de/en. **Harter Blocker dort: produktive Magic-Link-Zustellung per E-Mail.**
- Gerätetest entscheidet, ob der reine WebView-Pfad (CORS/SameSite=None) oder CapacitorHttp der tragende Weg wird — beide sind jetzt vorbereitet.

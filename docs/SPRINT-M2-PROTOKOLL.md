# Sprint M2 — Service Worker: App-Shell offline & Update-Fluss

Basis (Reihenfolge verbindlich): `origin/main` @ `195f30d` (patch-s81) **+ `patch-m1-pwa-manifest-icons.mjs`** · Kern-Hash nach Sprint: `c685b0970a4cdf9f`
Kontext: Stufe 1 des Mobile-Plans, Zielbild b. Enthält zusätzlich die Naming-Korrektur (siehe unten).

## Naming (Korrektur aus der Sprint-Freigabe)

Finalisierter Name: **raumzuzweit** (deutsch, `raumzuzweit.de`) / **roomfortwo** (englisch, `roomfortwo.app`). „unserbegleiter" ist obsolet. Globale App-/Bundle-ID (D2, wirksam ab M4): **`app.roomfortwo`** — Reverse-DNS der englischen Domain, sprachneutral; die Sprachwahl geschieht in der App, ein Store-Eintrag für beide Sprachen. `pwa.name`/`pwa.kurzname` tragen jetzt raumzuzweit/roomfortwo; mit 11 Zeichen passt der volle deutsche Name unters Home-Bildschirm-Icon, der „Begleiter"-Platzhalter entfällt. Die repo-weite Marken-Umbenennung (`allg.marke`, `<title>`, wrangler-`name`) bleibt weiterhin bewusst ausgeklammert (eigener Posten).

## Scope & Ergebnis

1. **`platforms/cloudflare/pages/sw-routing.js`** (neu): Cache-Entscheidung als reine Funktion `cacheEntscheidung(pfad)` + Precache-Liste `SHELL_PFADE`. Modi: `nie` (API, `admin.html`, `sw.js` selbst), `netz-zuerst` (`/`, `index.html` — Updates gewinnen, offline fällt auf Cache zurück), `cache-zuerst` (statische Shell), `netz` (Unbekanntes, kein Eingriff).
2. **`platforms/cloudflare/pages/sw.js`** (neu): Lebenszyklus ohne Workbox. Cache-Name `rzz-shell-<Kern-Hash>` → jeder Deploy invalidiert die Shell von selbst; `activate` löscht alle Altstände; nur GET, nur same-origin; `nie`/`netz` heißt **kein `respondWith`** — API-Verkehr (inkl. httpOnly-Cookie-Auth) läuft unverändert am SW vorbei.
3. **`scripts/build-pages.js`**: zweiter esbuild-Schritt bündelt den SW nach `public/sw.js` und stempelt den Kern-Hash ein.
4. **`platforms/cloudflare/pages/client.js`**: `registriereServiceWorker()` beim Boot (Feature-Guard, SW ist Komfort, nie Voraussetzung); Update-Fluss: neuer Worker installiert + alter kontrolliert → dezenter Hinweis-Chip unten (`role="status"`) mit Neu-laden-Knopf — kein erzwungener Reload mitten im Gespräch. Strings via i18n.
5. **i18n**: `pwa.updateVerfuegbar`, `pwa.neuLaden` (de/en) + Naming-Korrektur `pwa.name`/`pwa.kurzname`.

## Datenschutz-Garantie

Gesprächsinhalte erreichen den Browser-Cache nie: alles unter `/api/` bekommt per Konstruktion die Entscheidung `nie`, abgesichert durch Negativtests über 16 API-Pfade (inkl. `chat`, `handover`, `bstate`/`pstate`, `recover`, `paar`) plus Drift-Wächter (jeder Precache-Eintrag muss eine cachende Entscheidung haben, `admin.html`/`sw.js` dürfen nie in `SHELL_PFADE` auftauchen). `/apix`-Test schließt Präfix-Übergriffe aus.

## Tests

Neu: `tests/unit/m2-service-worker.spec.js` (10 Tests) — Routing-Negativ/Positiv, Build-Beweis (sw.js entsteht, Kern-Hash als Cache-Version, Precache-Material vollständig, Client registriert `/sw.js` und kennt den Hinweis), i18n-Vollständigkeit + Naming-Assertion.

Voller Lauf auf dem Sprintstand: **121 Testdateien / 996 Tests grün**. Build: alle drei Ziele mit Kern `c685b0970a4cdf9f`.

Lehre aus dem Sprint (erster Wurf rot): „Bundle enthält String X nicht" taugt nicht als Negativtest, wenn X Teil der **Ausschluss-Logik** ist — die Garantie gehört auf die reine Funktion, der Build-Test prüft Vollständigkeit des Precache-Materials.

## Verifikation nach Patch-Anwendung

```
node patch-m1-pwa-manifest-icons.mjs        # Vorgänger zuerst (falls noch nicht angewendet)
node patch-m2-service-worker-offline.mjs --dry-run
node patch-m2-service-worker-offline.mjs
node patch-m2-service-worker-offline.mjs    # Idempotenz
npx vitest run
npm run build
```

Manuelle Abnahme: `wrangler dev` aus `dist/cloudflare/` → laden → Flugmodus/Offline in DevTools → Reload: Shell erscheint, API-Aufrufe schlagen sichtbar sauber fehl; DevTools → Application → Cache Storage: genau ein `rzz-shell-…`, ohne jeden `/api`-Eintrag.

## Offen / nächste Schritte

- **M3**: Mobile-UX-Härtung (Safe-Areas + `viewport-fit=cover`, 16px-Inputs, Touch-Ziele, Standalone-Erkennung).
- Marken-Umbenennung repo-weit (raumzuzweit) als eigener Posten auf Zuruf.
- D2 ist mit `app.roomfortwo` vorentschieden — Veto bis M4 möglich.

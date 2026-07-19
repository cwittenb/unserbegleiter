# Sprint MB — Marken-Umbenennung auf raumzuzweit / roomfortwo

Basis: `origin/main` @ `2fa48ea` (patch-m7a, M-Kette gemergt) · Kern-Hash nach Sprint: `be9e8d25f13e10d6` (geändert durch `core/index.js` + i18n).

## Prinzip

**Sichtbare Marke überall umgestellt, technische Namen unangetastet** (Nutzer-Vorgabe): Worker-Deploy-Name `paarbegleitung` (daran hängen die Secrets), `package.json`-Name, `window.PAARBEGLEITUNG`, KV-Namespace, Artefakt-Dateinamen (`paarbegleitung-dev_…`) bleiben. Die Umbenennung des Deployments wandert als eigener Zug zum Aufschalten von `raumzuzweit.de` (neuer Worker + Secrets neu setzen + Domain umhängen — dokumentierter Entscheidungspunkt, kein Teil dieses Sprints). Das generische Fachwort „Paarbegleitung" (Gattungsbegriff, z. B. in `pwa.beschreibung` und Kommentaren) bleibt bewusst — nur die **Marke** wechselt.

## Umgestellt (9 Dateien + 1 Wächter)

1. `core/index.js`: `APP_NAME` = **„raumzuzweit"** (sichtbar in den Artefakt-Überschriften und `/api/health`).
2. `core/i18n/de.js`: `allg.marke` = „raumzuzweit" (In-App-Marke, `pbKern`).
3. `core/i18n/en.js`: `allg.marke` = „roomfortwo" (vorher „Couples Companion").
4. `platforms/cloudflare/worker/index.js`: alle vier **E-Mail-Texte** (Relink ×2, Magic-Link-Betreff, Bestätigungscode) sagen jetzt „raumzuzweit".
5. `platforms/cloudflare/pages/admin.html`: Titel + Eyebrow.
6. `platforms/artifact/shell.html`: Titel der Entwicklungsumgebung.
7. `scripts/build-pages.js`: `<title>` der produktiven Shell.
8. `scripts/build-eval-artifact.js`: Titel des Eval-Runners.
9. `tests/worker/boot.spec.js`: Health-Assertion auf den neuen Namen.
10. **Neu** `tests/unit/marke.spec.js` (3 Tests): Marke ≙ `pwa.name` in beiden Sprachen (eine Quelle der Wahrheit), NEGATIV: „Paarbegleitung Neubau", „unserbegleiter", „Couples Companion" kommen in den Wörterbüchern nicht mehr vor.

## Tests

Voller Lauf: **128 Testdateien / 1051 Tests grün**. Build ok, Kern `be9e8d25f13e10d6`. Kein bestehender Test hing an den E-Mail-Wortlauten (geprüft).

## Verifikation nach Patch-Anwendung

```
node patch-mb-marke-raumzuzweit.mjs --dry-run
node patch-mb-marke-raumzuzweit.mjs
node patch-mb-marke-raumzuzweit.mjs   # Idempotenz
npx vitest run
npm run build
```

Sichtprüfung: Browser-Tab sagt „raumzuzweit", Startseite/`pbKern` sagt „raumzuzweit" (en: „roomfortwo"), `admin.html` sagt „raumzuzweit · Verwaltung", Magic-Link-Mail trägt den neuen Betreff.

## Offen

- Deployment-Umbenennung (`paarbegleitung` → z. B. `raumzuzweit`) beim Domain-Aufschalten: neuer Worker, Secrets (ADMIN_TOKEN, VAPID_*, ggf. SMTP) neu setzen, Route/Domain umhängen, alten Worker stilllegen.
- `docs/`-Altbestand nennt historisch „unserbegleiter"/„Paarbegleitung" — Protokolle sind Zeitdokumente, bleiben unverändert.

# Sprint AP — Anwendung zieht auf `app.raumzuzweit.de`

Basis: `origin/main` @ `5a2de21` (patch-s86) · Kern-Hash: `7cab2a4ed03e4622` — **unverändert**, dieser Patch fasst `core/` nicht an.

## Entscheidung (D-AP, Variante b)

Die **Apex-Domain `raumzuzweit.de`** bleibt für Landing-Page und Rechtstexte (Impressum, Datenschutz, Konto-Löschung) frei. Die **Anwendung samt API und App-Verknüpfung** zieht auf die Subdomain **`app.raumzuzweit.de`**.

Angenehmer Nebeneffekt: Die Bundle-ID `app.roomfortwo` und die App-Subdomain teilen dieselbe Logik — die Anwendung ist überall unter „app" adressiert.

## Was der Code betrifft (klein)

Nur eine funktionale Zeile — der Rest folgt von selbst:

1. **`platforms/capacitor/deploy.config.js`**: `API_BASIS = "https://app.raumzuzweit.de"` (mit Begründung im Kommentar). Das ist die einzige Stelle, an der die Domain fest verdrahtet ist.
2. **Tests** an den funktional daran hängenden Stellen nachgezogen (`m4-capacitor-geruest.spec.js` ×3, `m7-web-push.spec.js` ×1).
3. **`docs/STORE-CHECKLISTE.md`**: Identitätszeile trennt jetzt Apex (Rechtstexte) und App-Subdomain (Anwendung).

**Bewusst nicht angefasst:**
- **Magic-Links** — der Worker baut sie aus `new URL(request.url).origin`; sie folgen der aufrufenden Domain automatisch. Kein fester Wert im Code.
- **AASA / assetlinks.json** — werden vom Worker unter dem angesprochenen Host ausgeliefert; sobald der Worker unter `app.raumzuzweit.de` läuft, stimmen sie dort.
- **`VAPID_SUBJECT`-Beispiel** (`mailto:kontakt@raumzuzweit.de`) — Mail läuft weiter über die Apex, korrekt so.
- Reine URL-Parsing-Beispiele in `m5-app-anbindung.spec.js` (`tokenAusUrl`) — dort ist die Domain bedeutungslos, es geht um Fragment-Zerlegung.

## Betreiber-Schritte (Reihenfolge wichtig)

1. **Cloudflare**: Custom Domain am Worker `paarbegleitung` → **`app.raumzuzweit.de`** (nicht die Apex). Record und Zertifikat legt Cloudflare selbst an.
2. **Apex**: bis zur Landing-Page eine Weiterleitungsregel `raumzuzweit.de/*` → `https://app.raumzuzweit.de/$1` (Statuscode 301/302). Fragmente wie `#t=…` überträgt der Browser dabei selbst — alte Magic-Links funktionieren also weiter. Der alte Hetzner-A-Record (`159.69.200.12`) kann entfallen.
3. **`APPLE_TEAM_ID` / `ANDROID_CERT_SHA256`** als `[vars]` setzen, deployen.
4. **Xcode**: Associated Domains auf **`applinks:app.raumzuzweit.de`** (falls schon `raumzuzweit.de` eingetragen war: ersetzen).
5. **Android**: im Intent-Filter `android:host="app.raumzuzweit.de"`.
6. **App neu installieren** — iOS prüft AASA nur bei der Installation.

## Verifikation

```bash
curl -s https://app.raumzuzweit.de/api/health                                  # {"app":"raumzuzweit",…}
curl -s https://app.raumzuzweit.de/.well-known/apple-app-site-association      # JSON mit TEAM.app.roomfortwo
curl -s https://app.raumzuzweit.de/.well-known/assetlinks.json                 # JSON mit app.roomfortwo
curl -I  https://raumzuzweit.de                                                # 301/302 auf app.
```

Nach Patch-Anwendung: `npx vitest run` (1116 Tests), `npm run build && npm run build:capacitor` — das Build-Log muss `API https://app.raumzuzweit.de` melden. Danach `cd native && npx cap sync`, damit die native Hülle die neue Basis übernimmt.

## Tests

Voller Lauf: **133 Testdateien / 1116 Tests grün**. Beide Builds erfolgreich, Kern `7cab2a4ed03e4622`.

## Offen

- Landing-Page auf der Apex (eigener Posten, sobald Rechtstexte stehen — B2/B3 der Store-Checkliste).
- Sollte die App später doch auf die Apex zurückwandern, ist es dieselbe eine Zeile plus die Betreiber-Schritte 1/4/5.

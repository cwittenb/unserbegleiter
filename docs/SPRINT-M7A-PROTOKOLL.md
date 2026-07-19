# Sprint M7a — Web Push: VAPID im Worker, inhaltsfreier Freigabe-Hinweis

Basis (Reihenfolge verbindlich): `origin/main` @ `57cd47f` (patch-s82) **+ M1–M6** · Kern-Hash nach Sprint: `ede6dc4b28420630` (geändert durch die neuen i18n-Keys — core-Anteil).
D7 = a: Web Push zuerst (PWA-Testphase); native Push (FCM/APNs) als späterer M7b auf denselben Worker-Bausteinen.

## Scope & Ergebnis

1. **`platforms/cloudflare/worker/web-push.js`** (neu, null Abhängigkeiten): Verschlüsselung nach **RFC 8291/8188** (aes128gcm: ECDH P-256 → HKDF-Kette → AES-128-GCM, ein letzter Record mit 0x02-Delimiter, korrekter Binär-Header salt/rs/keyid) und **VAPID nach RFC 8292** (ES256-JWT, `aud` = Endpoint-Origin) — ausschließlich WebCrypto, Ephemer-Schlüssel/Salt für Tests injizierbar. `vapidKonfig(env)` als Feature-Schalter, `sendePush` mit TTL 86400.
2. **Worker-Endpunkte:** `GET /api/push/key` (öffentlich; 503 `config_missing` ohne VAPID-Secrets), `POST/DELETE /api/push/subscribe` (Session-pflichtig, je Rolle; KV `push/<code>/<Rolle>`, Dedupe über Endpoint, max. 5 Abos, `https://`-Pflicht, Validierung).
3. **Trigger:** `POST /api/handover` benachrichtigt nach erfolgreicher Freigabe die **andere** Rolle — Nutzlast **immer inhaltsfrei**: generischer Hinweis, lokalisiert nach **Paarsprache** (`couple.locale`, i18n-Keys `pwa.pushTitel`/`pwa.pushText` de/en). Fehler im Versand brechen die Freigabe nie; erloschene Abos (404/410) werden entfernt. Ohne VAPID-Konfiguration ist der Trigger ein No-op.
4. **Service Worker (`sw.js`):** `push`-Handler zeigt nur das eigene Nutzlast-Format (Titel/Text/Icon), `notificationclick` fokussiert ein offenes Fenster oder öffnet `/`.
5. **Client:** `platforms/cloudflare/pages/push.js` (rein: Fähigkeitsprüfung inkl. **nie in der nativen Hülle**, Schlüssel-Konvertierung, `aktiviere-/deaktivierePush`, `hatPushAbo`). `client.js` ergänzt eine **Glocke im Theme-Chrome** — nur wenn Web Push möglich UND der Worker konfiguriert ist (`/api/push/key`-Probe); Erlaubnis wird erst beim Klick erfragt, nie beim Laden. i18n-Key `pwa.push`.
6. **Betrieb:** `scripts/vapid-schluessel.mjs` erzeugt das Schlüsselpaar und druckt die drei Secrets (`VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`/`VAPID_SUBJECT`); wrangler.toml-Kommentarblock dokumentiert sie. Schlüsselwechsel invalidiert bestehende Abos (im Skript vermerkt).

## Datenschutz-Review (Sprint-Bestandteil, D6-Auflage)

- **Inhaltsfreiheit ist getestet, nicht behauptet:** Der Miniflare-Test gibt einen markierten Geheimtext frei, fängt den Push ab, **entschlüsselt ihn unabhängig nach den RFC-Formeln** und beweist wörtlich, dass der Geheimtext nicht enthalten ist — die Nutzlast ist exakt `{titel, text, url:"/"}`.
- Push-Abos sind reine Zustell-Adressen (Endpoint + öffentliche Schlüssel des Browsers), je Rolle getrennt gespeichert; A↔B-Grenze unberührt (der Hinweis sagt nur „es gibt Neues", nie von wem was).
- Erlaubnis ist Opt-in per Klick; Abmelden räumt browser- und serverseitig auf.

## Tests

Neu: `tests/unit/m7-web-push.spec.js` (7 — base64url beidseitig, Header-Struktur, **Kreuzprobe**: unabhängige RFC-Entschlüsselung liefert Klartext+Delimiter, NEGATIV kaputte Abo-Schlüssel, VAPID-JWT-Signaturprüfung + Claims, `vapidKonfig`, Fähigkeitsprüfung inkl. Native-Ausschluss) und `tests/worker/m7-web-push.spec.js` (6, Miniflare mit `outboundService`-Abfangnetz — fail-closed, Key-Endpunkt, Session-Pflicht, NEGATIV unbrauchbare Subscriptions, **Freigabe → genau ein inhaltsfreier Push**, Abmelden wirkt, 410-Aufräumen).

Voller Lauf: **127 Testdateien / 1048 Tests grün**. `npm run build` + `npm run build:capacitor` ok, Kern `ede6dc4b28420630`.

## Verifikation nach Patch-Anwendung

```
node patch-m1-pwa-manifest-icons.mjs        # Kette M1–M5, falls noch nicht angewendet
node patch-m2-service-worker-offline.mjs
node patch-m3-mobile-ux-safearea.mjs
node patch-m4-capacitor-geruest-api-basis.mjs
node patch-m5-applinks-cors-deeplink.mjs
node patch-m7a-web-push-vapid.mjs --dry-run
node patch-m7a-web-push-vapid.mjs
node patch-m7a-web-push-vapid.mjs           # Idempotenz
npx vitest run
npm run build
```

(M6 ist reiner Doku-Patch und für M7a technisch nicht Voraussetzung.)

Inbetriebnahme: `node scripts/vapid-schluessel.mjs` → drei Secrets setzen → deploy → Glocke erscheint, Probelauf: Rolle B abonniert, Rolle A gibt frei.

## Offen / nächste Schritte

- **M7b (optional, nach Store-Launch):** native Push via FCM/APNs für die Capacitor-Hülle — Abo-Ablage, Trigger und Inhaltsfreiheits-Prinzip aus diesem Sprint werden wiederverwendet; neu sind nur Transport (FCM-HTTP-v1/APNs-JWT) und Token-Registrierung im nativen Kontext.
- iOS-Hinweis für die Testphase: Web Push funktioniert auf iOS **nur in der installierten PWA** (Zum Home-Bildschirm) — im Safari-Tab bleibt die Glocke konstruktionsgemäß weg.
- Damit ist der Mobile-Plan (M1–M7a) vollständig umgesetzt; offen bleiben die Betriebs-Blocker aus `STORE-CHECKLISTE.md` (B1–B6).

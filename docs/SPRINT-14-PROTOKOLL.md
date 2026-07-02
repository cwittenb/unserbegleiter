# Sprint 14 — Protokoll · Wiedereinstieg per E-Mail + Mehrgeräte

**Datum:** 2. Juli 2026 · **Stand:** 223 Tests grün (Ebene 1: 170 · Engine: 12 · Worker: 41) · Kern-Hash `1d8cc3f8abc1d7d2`

## Entscheidung (Cars10)

Cookie-Verlust und Mehrgeräte-Nutzung lösen wir über **nur eine E-Mail-Adresse, kein Passwort**. Der Gegnerfall (Partner erschleicht Postfach) wird bewusst niedrig gewichtet — konsistent mit der autonomiebegründeten Geheimnis-Architektur.

## Schlüssel-Fund: Mehrgeräte war schon da

Sessions sind per zufälliger `sid` geschlüsselt, Credentials per Hash; `enroll` erzeugt bei jedem Aufruf ein frisches Cred + eine frische Session. Nichts erzwingt „eine Session pro Rolle". Ein eingelöster Wiedereinstiegs-Link auf einem zweiten Gerät gibt diesem ein eigenes Cred + eine eigene Session — **das erste Gerät läuft unverändert weiter**. Der befürchtete Session-Umbau entfiel; der Test `MEHRGERÄTE …` beweist es Ende-zu-Ende.

## SMTP auf Cloudflare Workers — Irrtum korrigiert

Workers können auf **Port 25** kein TCP öffnen — aber die `connect()`-Socket-API erlaubt SMTP über **587 (STARTTLS)** und **465 (TLS)**. Die verbreitete Behauptung „SMTP ist in Workers unmöglich" ist überholt (stammt meist von HTTP-Mail-Anbietern). Seit April 2026 gibt es zusätzlich den nativen Cloudflare Email Service (Binding/REST), robustester Weg, aber kostenpflichtig + Domain-Onboarding.

## Architektur: Mailer-Adapter

`platforms/cloudflare/worker/mailer.js` — `makeMailer(env).sendMail({to,subject,text})`, wie `callClaude` den Versand von der Logik trennt:
- **Test-/Bridge-Pfad:** Service-Binding `MAIL_UPSTREAM` (analog `env.UPSTREAM` beim LLM-Proxy) — der Fake-Mailer fängt Nachrichten ab.
- **Echter Weg:** kompakter SMTP-Client über die Socket-API (Begrüßung → EHLO → STARTTLS/implizit → AUTH LOGIN → MAIL/RCPT/DATA), mit Dot-Stuffing und UTF-8-Betreff. **Deploy-verifiziert**, nicht Teil der Unit-Suite (einen echten SMTP-Server erreiche ich hier nicht — dieselbe Trennung wie beim LLM-Proxy gegen Mock-Upstream).
- Über den Adapter ist der Wechsel auf nativen Cloudflare-Email-Binding, HTTP-API oder self-hosted-SMTP ein Einzeiler.

Bundler-Detail: `cloudflare:sockets` wird **statisch** importiert und in allen Worker-esbuild-Aufrufen als `external` markiert (workerd stellt es zur Laufzeit bereit; der zunächst versuchte dynamische Import scheitert an workerds „dynamic module specifiers are unsupported").

## Datenmodell (nur Hash, nie Klartext)

- `sys/email/<sha256(mail)>` → `{code, role}` — Adresse→Konto, eine Adresse ⇒ ein Konto.
- `sys/emailfor/<code>/<role>` → `{hash, at}` — Status („hinterlegt") + Ersetzen (alten Hash löschen).
- `mintMagic(kv, code, role, now, ttlMs)` ausfaktorisiert; Erstausgabe 14 Tage, Wiedereinstieg `RECOVER_MS` = 15 min.

## Endpunkte

- `POST /api/recover {email}` (öffentlich, Raten-Limit je IP): Hash-Lookup → falls Treffer frischer 15-min-Einmal-Link per Mailer; **Antwort immer `{ok:true}`** (keine Enumeration — schützt auch die Information „diese Person ist in Paarbegleitung"). Versandfehler werden nicht nach außen offengelegt.
- `POST /api/email {email}` (Session): Adresse hinterlegen/ändern, nur eigene Rolle; Kollision mit anderem Konto → 409; ungültig → 400.
- `GET /api/me`: zusätzliches Feld `recoveryEmail` (bool).

## UI

- **Persönlicher Raum:** Karte „Zugang wiederfinden" — nur wenn `backend.recovery` existiert (im Artefakt ausgeblendet). Status „hinterlegt/nicht", Adresse setzen/ändern, ehrlicher Hinweis „nimm ein Postfach, auf das nur du Zugriff hast".
- **Vorab-Screen (Client):** Statt Sackgasse „Kein Zugang gefunden" jetzt Feld „Neuen Link anfordern" → `/api/recover`, mit Nicht-Enumerations-Text.
- RemoteBackend: `recovery.setEmail`.

## Tests (+11)

Worker (+8, `tests/worker/recover.spec.js`): Adresse setzen spiegelt sich in `/api/me` (ohne Klartext-Ausgabe) · ungültig 400 · Kollision 409 (eigene Adresse idempotent) · registriert → Mail mit Einmal-Link · **unregistriert → 200 ohne Mail** · Ersetzen entfernt alten Hash · **MEHRGERÄTE** · Raten-Limit 429. UI (+3, `tests/unit/recovery-ui.spec.js`): Gating verborgen/sichtbar, setEmail-Aufruf + Status-Wechsel, Leereingabe-Hinweis.

## Offen / nächster Schritt

- **Deine SMTP-Zugangsdaten** in die Secrets (siehe wrangler.toml-Kommentar), dann den Versand einmal gegen echten SMTP prüfen — das ist der deploy-verifizierte Teil.
- SPF/DKIM/DMARC für Zustellbarkeit (sonst Spam-Ordner).
- Feinschliff denkbar: Rate-Limit zusätzlich je Adress-Hash (derzeit je IP); Bestandssession-Hinweis bei neuem Link.

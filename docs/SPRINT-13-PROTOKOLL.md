# Sprint 13 — Protokoll · Admin-Gate für /api/paar + Verwaltungsseite

**Datum:** 2. Juli 2026 · **Stand:** 212 Tests grün (Ebene 1: 167 · Engine: 12 · Worker: 33) · Kern-Hash `409906ecdc453d72`

## Befund (Sicherheit)

`/api/paar` (Paar anlegen) war **ungeschützt** — jede:r, die den Worker erreicht, konnte beliebig viele Paare samt Magic-Links erzeugen (Spam-/Denial-of-Wallet-Vektor; die Quota greift erst vor `/api/llm`). In der curl-Testphase bewusst so, für den Betrieb untragbar.

## Fix

- **Admin-Gate** `requireAdmin(env, request)` in `auth.js`: Header `x-admin-token`, Vergleich über gleich lange SHA-256-Digests (kein früh abbrechender Zeichenkettenvergleich, keine Längen-Leckage). **Fail-closed:** Ohne konfiguriertes `ADMIN_TOKEN` ist der Endpunkt gesperrt — ein Deploy, der das Secret vergisst, lässt niemanden herein statt alle.
- `/api/paar` im Router hinter das Gate gehängt (401 „Admin-Zugang erforderlich." bei fehlend/falsch).
- `wrangler.toml`-Vorlage dokumentiert `wrangler secret put ADMIN_TOKEN`.

## Verwaltungsseite

`platforms/cloudflare/pages/admin.html` — eigenständige Seite in der Produkt-Palette (Teal `#0f766e`, Slate, weiße Karten). Admin-Token + zwei Namen → „Paar anlegen" → beide Einladungslinks (`…/#t=<token>`) mit Kopier-Knopf und Paar-Code. Token bleibt nur im Feld (kein Storage). Optionale API-Basis für Betrieb außerhalb derselben Domäne; da der Worker die Assets via `[assets] directory="public"` selbst ausliefert, ist der Normalfall same-origin ohne Zusatzkonfiguration. `noindex,nofollow`. Wird vom Pages-Build nach `public/admin.html` kopiert und liegt unter `…/admin.html`.

## Tests (+4, Worker 29 → 33)

`tests/worker/admin.spec.js` — ohne Header 401; falscher Token 401; richtiger Token 200 mit Code + zwei verschiedenen Links; **fail-closed**: eigene Miniflare-Instanz OHNE `ADMIN_TOKEN` weist selbst leere/beliebige Header ab. Bestehende Harnische (auth-matrix, quota) mitgezogen: Client um `extraHeaders` erweitert, `ADMIN_TOKEN`-Binding in allen paar-anlegenden Miniflare-Instanzen, Admin-Header an jeder Mint-Stelle.

## Festgehaltene Design-Entscheidung: Wiedereinstieg per E-Mail (noch nicht gebaut)

**Entscheidung (Cars10):** Bei Cookie-Verlust / Mehrgeräte-Nutzung hinterlegt jede Person nach dem ersten Login **nur eine E-Mail-Adresse** (kein Passwort) und lässt sich bei Bedarf einen frischen Zugangslink schicken. Der Gegnerfall (Partner erschleicht Postfach-Zugang) wird bewusst niedrig gewichtet: Ein Paar, das sich als Gegner sieht, nutzt dieses Werkzeug nicht gemeinsam, und „erfolgreiche" Heimlichkeit läuft nicht über ein geteiltes Postfach. Konsistent mit der autonomiebegründeten (nicht moralischen) Geheimnis-Architektur.

**Geplante Form (eigener Sprint):**
- Neues Rollenfeld `email` (pro Rolle, im sys-Namensraum); `POST /api/recover` erzeugt on demand einen **frischen, einmaligen, kurzlebigen** Magic-Link (~15 min statt 14 d).
- **Keine Enumeration:** stets „falls registriert, ist ein Link unterwegs" — schützt hier zusätzlich die Information „diese Person ist in Paarbegleitung".
- **Raten-Limit** auf Anforderungen (Quota-Infrastruktur wiederverwenden); **Bestandssession-Hinweis** bei neuem Link.
- **Mehrgeräte:** Sessions über Token statt Rolle schlüsseln, damit Geräte koexistieren statt sich auszuloggen — gehört mit derselben Strenge in die Auth-Matrix wie „Bernd liest Anna nicht".
- **Versand-Abhängigkeit:** E-Mail aus dem Worker braucht einen Dienst; nach Adapter-Muster (wie `callClaude`) kapseln, Logik testbar mit Fake-Sender, realer Provider als Config. EU-Provider-Winkel passt zum EU-Stack (auf eigenem Space ist SMTP nativ). SPF/DKIM/DMARC für Zustellbarkeit.
- **Offene Detailfrage vor dem Bau:** Versandroute/Provider; bei Recovery andere Sessions abmelden oder koexistieren lassen.
- Das kurze 15-min-Timeout **bleibt** (schützt entsperrt liegengelassene Geräte); der Fix ist glatter Wiedereinstieg, nicht längere Sitzung.

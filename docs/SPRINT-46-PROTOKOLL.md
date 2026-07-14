# Sprint 46 · D6 umgesetzt: Verschlüsselter Adress-Klartext & Betreiber-Kommunikationskanal

**Basis:** `origin/main` @ `e44c500` (S45) · **Stand nach Sprint:** 550 Tests grün über 63 Dateien · Kern-Hash `7a02d852645581b1`
**Designgrundlage:** Designnotiz D6 v1, Variante (ii). Entschieden: **D6.1 a** (Klartext reist bei der Bestätigung mit, Hash-Abgleich serverseitig) · **D6.2 entfällt** (keine Bestandsadressen ohne `enc` — S46 folgt unmittelbar auf S45) · **D6.3 b** (Broadcast nur mit Bestätigungs-Nonce) · **D6.4 a** (Resend-Deckel 3/Tag je Konto).

## Anlass

Das Hash-only-Modell machte den Betreiber strukturell blind für Adressen — datensparsam, aber ohne Out-of-Band-Kanal für Admin-Resend, Missbrauchs-Transparenz beim Direktlink und Betriebsmitteilungen (inkl. des Pflichtfalls Art. 34 DSGVO; rechtliche Einordnung vor Marktstart: Fachanwalt). Die Positionsverschiebung wird offen kommuniziert: aus „kann Adressen nicht lesen" (Struktur) wird „liest sie nur zu benannten Zwecken" (Zweckbindung im Verifikationstext + Audit-Log für jeden Klartext-Zugriff).

## Was gebaut wurde

### 1 · Kryptografie (`worker/krypto.js`, neu)

AES-256-GCM über WebCrypto. `EMAIL_KEY` als Worker-Secret (32 Byte hex, `openssl rand -hex 32`), **Konfigurationspflicht**: fehlt oder ungültig → klarer Deploy-Fehler (`email_key_missing`), kein stilles Weiterlaufen. Frischer 12-Byte-IV je Verschlüsselung. **AAD = `code:role`** — ein Ciphertext entschlüsselt nur im Kontext genau dieses Kontos und lässt sich nicht zwischen Einträgen verschieben; GCM ist authenticated encryption, Manipulation scheitert hart. Format `{v:1, iv, ct}` — `v` liegt für spätere Schlüsselrotation bereit (Rotation selbst bewusst nicht Teil von S46).

### 2 · Bestätigung erweitert (D6.1a)

`/api/email/confirm` nimmt jetzt `{pin, email}`. `confirmRecoveryEmail` prüft zusätzlich: der Hash der mitgereichten Adresse muss exakt zur offenen Bestätigung passen (`email_mismatch` sonst) — es kann keine andere Adresse untergeschoben werden als die, an die der Code ging. Bei Erfolg wird der Klartext kontogebunden verschlüsselt im `emailfor`-Eintrag abgelegt: `{hash, at, verified:true, enc}`. Der Bestätigungsmoment ist der einzige Punkt, an dem der Klartext serverseitig legitim vorliegt; die UI reicht die Adresse aus Schritt 1 unsichtbar mit (Closure, kein zweites Eingabefeld). Namenskollision im Zuge dessen bereinigt: KV-Key-Helfer `emailKey` → `emailLookupKey` (der Parameter `emailKey` ist jetzt der Krypto-Schlüssel).

### 3 · Betreiber-Kanal (Worker)

- **`POST /api/resend {code, role}`** (admin, Stufe 1): entschlüsselt transient, mailt frischen Einmal-Link (`RECOVER_MS`, 15 Min), vergisst den Klartext. Ohne versandfähigen Eintrag → 409 `no_email_enc`. Deckel `RESEND_RATE` (Default 3/Tag je Konto, D6.4a) → 429 `resend_rate`. Audit-Eintrag je Ausgabe.
- **`/api/relink`** erweitert: Die betroffene Person wird per Info-Mail benachrichtigt („vom Betreiber wurde ein Zugangslink erzeugt — warst du das nicht, melde dich"), sofern `enc` vorhanden; die Info-Mail enthält **nie den Link selbst**. Antwort + Audit tragen `benachrichtigt: true/false`; scheitert der Versand, wird der Link trotzdem ausgegeben (der Notfallweg darf nicht am Mailversand hängen), Fehler geht ins Log.
- **`POST /api/broadcast`** (admin, D6.3b): `dryRun:true` zählt Empfänger (nur `verified && enc`) und liefert eine **Nonce** (10 Min TTL, inhaltsgebunden über `sha256(subject+text)`, einmalig). Senden erfordert diese Nonce: fehlt/abgelaufen/verbraucht → `nonce_invalid`; Inhalt geändert → `nonce_mismatch`. Damit ist Senden ohne Vorschau **technisch unmöglich** (auch per curl), Doppel-Klicks/Retries können nicht doppelt senden (Nonce wird VOR dem Versand verbraucht), und es geht nie ein anderer Text raus als der geprüfte. Versand je Empfänger einzeln mit try/catch; Antwort `{empfaenger, gesendet, fehlgeschlagen}`; Audit mit Zahlen und Betreff, nie mit Adressen.

**Klartext-Hygiene durchgängig:** Entschlüsselung nur transient in der Request-Verarbeitung; Klartext erscheint in keiner Antwort, keinem Log (`console.error` loggt Code+Rolle) und keinem KV-Schreibvorgang. Test-Invariante: String-Scan über alle KV-Werte nach vollem Durchlauf.

### 4 · Admin-Seite

Wiederherstellungs-Sektion zweistufig: **„Link an hinterlegte Adresse senden"** (Stufe 1) zuerst, Direktlink als nachgeordneter Weg mit Hinweistext; Direktlink-Ergebnis meldet, ob die Person informiert wurde. Neue Sektion **„Mitteilung an alle"**: Betreff + Text → „Empfänger prüfen" (dryRun, zeigt Zahl, merkt Nonce) → Senden-Knopf wird erst dann aktiv und zeigt die Zahl; jede Änderung an Betreff/Text entwertet die Vorschau clientseitig (der Server erzwingt es ohnehin per Hash). Zweckbindungs-Hinweis direkt im Formular.

### 5 · Texte (DE/EN-Parität)

`rec.neu` und `rec.pflicht.text` nennen die Zwecke explizit: Zugangslink + wichtige Betriebsmitteilungen (Wartung, Sicherheitshinweise) — **keine Werbung**. Neuer Fehlercode `email_mismatch`. Betreiber-Mails (Code, Resend, Relink-Info) bleiben deutsch wie die bestehende Recover-Mail — Mail-Lokalisierung ist ein bestehender Merkposten der Wire-Anglisierung/i18n-Stufe C.

## Tests (+18, alle grün)

- `tests/unit/krypto.spec.js` (neu): Roundtrip, frischer IV je Aufruf, AAD-Bindung scheitert unter fremdem Konto, Manipulationsschutz, falscher Schlüssel, Konfigurationspflicht, `no_email_enc`.
- `tests/unit/auth-verify.spec.js` (erweitert): `enc` wird geschrieben und ist nur mit Konto-AAD entschlüsselbar; weder PIN noch Klartext je im KV; `email_mismatch`-Bindung; alle S45-Invarianten erhalten.
- `tests/worker/recover.spec.js` (erweitert): Bestätigung mit fremder Adresse → `email_mismatch`; Klartext-Invariante über alle KV-Werte; alle Instanzen mit `EMAIL_KEY`.
- `tests/worker/admin-relink.spec.js` (erweitert): `benachrichtigt`-Flag beide Richtungen; Info-Mail erreicht die betroffene Person und enthält nie den Link.
- `tests/worker/broadcast-resend.spec.js` (neu): Resend-Ende-zu-Ende (Mail → Link → richtige Rolle → einmalig), Gates, 409/429, Audit; Broadcast: dryRun sendet nie und zählt nur `verified && enc` (offene Verifikation zählt nicht), Senden ohne/mit falscher Nonce unmöglich, Inhalts-Bindung, Einmaligkeit, Audit ohne Adressen.
- `tests/unit/recovery-ui.spec.js` (erweitert): Bestätigung reicht die Adresse aus Schritt 1 mit.

## Betrieb / Inbetriebnahme

1. **VOR dem Deploy:** `openssl rand -hex 32`, dann `wrangler secret put EMAIL_KEY --name paarbegleitung` — ohne den Schlüssel schlagen ab S46 alle Adress-Bestätigungen mit klarer Meldung fehl.
2. `npm run build`, Deploy aus `dist/cloudflare/` wie gehabt.
3. Optional `RESEND_RATE` (Default 3/Tag) anpassen.
4. `wrangler tail`: neue Log-Präfixe `relink-mail:` und `broadcast-mail:` neben `verify-mail:`/`recover-mail:`.

**Schlüssel-Sorgfalt:** `EMAIL_KEY` sicher ablegen (Passwort-Manager des Betreibers). Verlust ⇒ alle `enc`-Einträge unlesbar (Hash + Selbstbedienung funktionieren weiter; Konten müssten für den Kanal neu bestätigen). Kompromittierung von KV **und** Secrets ⇒ Adressen lesbar — das ist die in D6 dokumentierte, bewusste Verschiebung.

## Merkposten

- Schlüsselrotation (Format-Feld `v` liegt bereit) — bei Bedarf eigene Runde.
- Broadcast-Queue/Batching für großes N (Workers-Subrequest-Limits) — vor Marktstart prüfen.
- Datenschutzerklärungs-Baustein (verschlüsselte Speicherung, Zwecke, Audit) — Marktstart-Paket mit Fachanwalt.
- Mail-Lokalisierung (Betreiber-Mails derzeit deutsch) — i18n-Stufe C / Wire-Anglisierung.

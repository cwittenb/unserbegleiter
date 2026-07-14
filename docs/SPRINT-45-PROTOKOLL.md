# Sprint 45 · Zugangs-Sicherheitsnetz: E-Mail-Verifikation, Pflicht-Modal, Betreiber-Wiederherstellung

**Basis:** `origin/main` @ `0163ed0` (S44) · **Stand nach Sprint:** 532 Tests grün über 61 Dateien · Kern-Hash `672687284075e057`

## Anlass

Zugangsverlust ist im Magic-Link-Modell (kein Passwort, kein Benutzername) der kritischste Einzelfehler: Wer Cookie **und** Link verliert, war bisher unrettbar ausgesperrt. Der Sprint baut ein dreischichtiges Sicherheitsnetz — Cred-Cookie (180 Tage), Selbstbedienung per verifizierter E-Mail, Betreiber-Notfallweg — und beseitigt drei UX-Sackgassen im Onboarding.

## Entscheidungen (aus der Design-Runde)

| # | Entscheidung |
|---|---|
| D1 | Verifikation per **6-stelligem Code** (PIN) statt Bestätigungslink — bleibt im selben Browser-Kontext, kein Tab-Sync-Problem. 15 Min gültig, max. 5 Versuche, nur der Hash wird gespeichert. |
| D2 | **Feature-Flag `EMAIL_PFLICHT`** (Variante b): Das Pflicht-Modal wird erst scharf geschaltet, wenn der SMTP-Versand produktiv verifiziert ist. Ohne Flag bleibt die Adresse freiwillig (Karte im Raum), die Verifikation gilt aber immer. |
| D3 | Keine Bestandsadressen vorhanden — kein Grandfathering nötig. `hasRecoveryEmail` zählt nur `verified: true`. |
| D4 | `/api/recover` sendet nur an **verifizierte** Adressen. Strukturell erzwungen: der Lookup-Eintrag `sys/email/<hash>` entsteht erst bei erfolgreicher Bestätigung. |
| D5 | Betreiber-Wiederherstellung: Direktlink-Endpunkt (15 Min, einmalig, Audit-Log) + Paar-Liste auf der Admin-Seite. |

## Offene Designfrage D6 (ehrlich benannt)

Zwei in der Design-Runde skizzierte Elemente sind mit dem Hash-only-Datenmodell **nicht umsetzbar** und wurden bewusst NICHT gebaut:

1. **Stufe 1 „Admin sendet an hinterlegte Adresse"** — der Server kennt nur den SHA-256-Hash, nie den Klartext. Er kann daher von sich aus an niemanden mailen. Praktischer Verlust: gering — genau diesen Fall deckt die Selbstbedienung (`/api/recover`) ab, bei der die Person ihre Adresse selbst tippt.
2. **Info-Mail bei Direktlink-Ausgabe** („Der Betreiber hat einen Link für deinen Zugang erzeugt") — gleicher Grund.

Beides wäre nur mit verschlüsselter Klartext-Speicherung (z. B. AES-GCM mit Worker-Secret) möglich. Das wäre eine Änderung der bewussten Datenschutz-Entscheidung „nur Hashes, nie Klartext" und gehört als **D6** in eine eigene Design-Runde vor Marktstart. Kompensation bis dahin: jede Direktlink-Ausgabe landet im Audit-Log (`sys/audit/`), und die Identitätsprüfung ist Betreiber-Prozess (Testphase: persönliche Bekanntschaft; für Marktstart Identifikationskriterien als Designnotiz festhalten).

## Was gebaut wurde

### 1 · Zweistufige Adress-Verifikation (Worker + Auth)

- `auth.js`: `setRecoveryEmail` ersetzt durch `beginRecoveryEmail` (Adresse prüfen, PIN erzeugen, `sys/verify/<code>/<role>` mit PIN-Hash + Ablauf + Versuchszähler) und `confirmRecoveryEmail` (Prüfung; Erfolg verankert `sys/email/<hash>` + `sys/emailfor/…{verified:true}` und räumt eine Vorgänger-Adresse). Fehlercodes: `pin_none`, `pin_wrong`, `pin_expired`, `pin_tries`.
- Nebeneffekt: Ein Tippfehler in der Adresse fällt sofort auf (kein Code kommt an), statt das Sicherheitsnetz still zu zerstören.
- `POST /api/email` (Schritt 1) mailt den Code an genau die genannte Adresse; Versandfehler wird als `mail_failed` (502) gemeldet — hier gibt es kein Enumerations-Risiko (eigene Adresse, Session-gebunden). Raten-Limit je Konto (`VERIFY_RATE`, Default 5/h) gegen Mail-Kanonen-Missbrauch.
- `POST /api/email/confirm` (Schritt 2).
- `/api/me` liefert zusätzlich `emailRequired` (Flag-Zustand) und `recoveryEmail` heißt jetzt „bestätigt hinterlegt".

### 2 · Pflicht-Modal (Flag `EMAIL_PFLICHT`)

`core/ui/app.js`: Nach dem Boot erscheint bei `emailRequired && !recoveryEmail` ein nicht wegklickbares Modal (kein Schließen-Knopf, kein Klick-außerhalb, kein Escape) mit dem Verifikationsfluss; es verschwindet ausschließlich durch erfolgreiche Bestätigung. Der Fluss (`baueVerifikation`) ist ein gemeinsames Bauelement für Modal und Raum-Karte; die Karte nutzt jetzt denselben zweistufigen Weg (bei hinterlegter Adresse hinter einem „Adresse ändern"-Einstieg). DOM per `createElement` mit `data-rec`-Attributen — keine ID-Kollisionen.

### 3 · Sackgassen beseitigt (Pages-Client)

- „Link bereits verwendet/abgelaufen" zeigt jetzt direkt darunter das Wiedereinstiegs-Formular (`zeigeWiedereinstieg(enrollFehler)`); Sprachumschaltung erhält die lokalisierte Fehlermeldung. Nur `link_unknown` bleibt reine Fehlermeldung — dahinter steht kein Konto.
- `wieder.intro` korrigiert (DE/EN): invite-only benannt; neuer Link nur für bereits Teilnehmende.

### 4 · Betreiber-Werkzeuge (Admin-Seite + Worker)

- `GET /api/paare` (admin-gated): alle Paare mit Code, Namen, Anlagedatum, Adress-Status je Rolle (`emailA`/`emailB`, nie Klartext). Hintergrund: Der zufällige Paar-Code ist der Unique Key — Namen sind reine Anzeige-Labels und dürfen kollidieren; ohne Liste wäre ein verlorener Code (und damit Export + Notfallweg) unauffindbar.
- `POST /api/relink {code, role}` (admin-gated): frischer Einmal-Token mit `RECOVER_MS` (15 Min); Antwort enthält den Rollennamen als Verwechslungsschutz; jede Ausgabe schreibt einen Audit-Eintrag `sys/audit/<ts>-<rand>`.
- `admin.html`: Sektion **Paare (Übersicht)** (Tabelle, Zeilen-Klick übernimmt den Code in Export + Wiederherstellung, ✓ = bestätigte Adresse) und Sektion **Zugang wiederherstellen** (Code + Rolle mit Namens-Beschriftung, Direktlink-Karte mit Kopier-Knopf im bekannten `linkKarte`-Muster). Der Link existiert nur im Moment der Anzeige; gespeichert wird nur der Token-Eintrag mit Ablauf.

### 5 · Betriebs-Sichtbarkeit

- `/api/recover`: verschluckte Versandfehler werden jetzt als `console.error("recover-mail:", …)` geloggt — sichtbar in `wrangler tail`, nie beim Client. Vorher war fehlende SMTP-Konfiguration von „Adresse nicht hinterlegt" ununterscheidbar.
- Generierte `wrangler.toml` dokumentiert SMTP-Secrets und das `EMAIL_PFLICHT`-Var samt Warnung.

## Tests (+20, alle grün)

- `tests/worker/recover.spec.js` (neu gefasst): zweistufiger Fluss, unbestätigt zählt nicht, Fehlversuchs-Sperre, D4-Beweis (unbestätigte Adresse → keine Recover-Mail), `mail_failed` bei Versandfehler, `VERIFY_RATE`-Limit, `emailRequired`-Flag, Mehrgeräte-Beweis erhalten. Lerneffekt dokumentiert: Adressen je Test eindeutig wählen (KV lebt über die Suite; eine Adresse ⇒ ein Konto).
- `tests/unit/auth-verify.spec.js` (neu): Ablauf per injizierter Uhr, Versuchszähler, PIN nie im Klartext gespeichert, Lookup erst nach Bestätigung, Adresswechsel-Aufräumen, Kollisions-409.
- `tests/worker/admin-relink.spec.js` (neu): Gates, Rollen-Korrektheit, Einmaligkeit, Audit-Eintrag, keine Klartext-Adressen in der Liste.
- `tests/unit/recovery-ui.spec.js` (neu gefasst): zweistufige Karte, Rückfall auf Schritt 1 bei `pin_tries`/`pin_expired`, Modal erscheint/verschwindet korrekt, nicht wegklickbar, kein Modal ohne Flag oder ohne recovery-Backend.

## Betrieb / Inbetriebnahme

1. `npm run build`, dann aus `dist/cloudflare/` deployen (wie gehabt; Secrets überleben Rebuilds).
2. SMTP einrichten: `wrangler secret put SMTP_HOST / SMTP_USER / SMTP_PASS --name paarbegleitung` (optional `SMTP_PORT` 587|465, `SMTP_FROM`).
3. Versand live prüfen: `wrangler tail --name paarbegleitung` mitlaufen lassen, Adresse hinterlegen — Fehler erscheinen als `verify-mail:` bzw. `recover-mail:`.
4. Erst wenn 3 sauber läuft: `EMAIL_PFLICHT = "1"` als Variable setzen (Dashboard oder `[vars]`) — ab dann blockiert das Modal neue Anmeldungen ohne bestätigte Adresse.

## Merkposten

- **D6** (verschlüsselter Klartext für Admin-Resend + Direktlink-Info-Mail): vor Marktstart entscheiden.
- Identifikationskriterien für den Notfall-Direktlink als Designnotiz, sobald Nutzer außerhalb des persönlichen Bekanntenkreises dazukommen.
- `VERIFY_MS`/`RECOVER_MS` teilen bewusst die 15-Minuten-Semantik; bei Änderung beide gemeinsam betrachten.

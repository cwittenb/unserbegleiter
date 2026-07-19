# Sprint M6 — Store-Readiness (Doku-Sprint)

Basis (Reihenfolge verbindlich): `origin/main` @ `57cd47f` (patch-s82) **+ M1 + M2 + M3 + M4 + M5** · Kern-Hash: `50a7b7335ab1eeb9` (unverändert — reiner Doku-Sprint, kein Code).

## Scope & Ergebnis

1. **`docs/STORE-CHECKLISTE.md`**: sechs harte Blocker (B1 E-Mail-Zustellung als längster Hebel, B2 Datenschutzerklärung, B3 Impressum, B4 Support, B5 Konten, B6 M5-`[vars]`); **App Privacy (Apple)** und **Data Safety (Google)** vorformuliert aus dem echten Datenmodell (Name, verschlüsselte E-Mail, Gesprächsinhalte pro Paar/Rolle getrennt, Token-Stände — kein Tracking, keine Werbung, LLM-Anbieter als Auftragsverarbeiter); Abgrenzung **„Begleitung, keine Therapie"** als Review-Schutzschicht (deckungsgleich mit `eskalation-an-profis.md`); Altersfreigabe-Empfehlung (17+/16+, ehrlich per Fragebogen); **Reviewer-Zugangs-Prozess** für Einmal-Links inkl. Risiko + benanntem Folgesprint-Entscheidungspunkt (Review-Modus-Link); **Versions-Konvention** (SemVer + monotone Buildnummer + `docs/RELEASES.md`-Mapping auf den Kern-Hash); Assets/Formalia inkl. Export-Compliance und DPMA-Hinweis; Kurzfahrplan (Google zuerst).
2. **`docs/store-texte.md`**: vollständige Rohlinge de/en (Untertitel, Kurz-, Promo-, Langbeschreibung, Keywords) innerhalb der Zeichenlimits, aus der freigegebenen Positionierung; ohne Heilsversprechen, mit ausdrücklicher Nicht-Therapie-Abgrenzung und Privatsphäre-Absatz; Redaktionshinweise (Parität im Sinn, KI-Transparenz, Quercheck gegen Datenschutzerklärung).
3. Neu identifizierte Merkposten: **Konto-Löschungs-URL** (Play-Pflicht), **`docs/RELEASES.md`** bei 1.0.0 anlegen, Entscheidungspunkt **Review-Modus-Link** falls Einmal-Links im Review scheitern.

## Tests

Keine Code-Änderungen — kein neuer Testbedarf. Voller Lauf auf dem Kettenstand unverändert grün (**125 Testdateien / 1035 Tests**, Kontrolle nach Patch-Anwendung genügt).

## Verifikation nach Patch-Anwendung

```
node patch-m6-store-readiness-doku.mjs --dry-run
node patch-m6-store-readiness-doku.mjs
node patch-m6-store-readiness-doku.mjs   # Idempotenz
```

(M6 legt nur `docs/`-Dateien an und ist damit von M1–M5 technisch unabhängig anwendbar; inhaltlich setzt es die Kette voraus.)

## Offen / nächste Schritte

- **Doku-Review durch dich** (§5-Ritual entfällt bei Doku): insbesondere Blocker-Liste, Altersfreigabe, Store-Texte.
- **M7 (Push)** ist der letzte geplante M-Sprint — per D6 gewünscht. Vorab zu klären (D7): Web Push (PWA, VAPID im Worker) zuerst, native Push (FCM/APNs) zuerst, oder beides in einem Sprint?
- Parallel lösbar, unabhängig vom Code: B1 (E-Mail), B2/B3 (Rechtstexte), B5 (Konten).

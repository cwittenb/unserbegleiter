# Store-Checkliste — raumzuzweit / roomfortwo (M6)

Zweck: Alles, was App Store (Apple) und Play Store (Google) vor und bei der
Einreichung verlangen — vorformuliert auf Basis der Grundprämissen
(Zwei-Schichten-Architektur, Datenfluss-Grenzen) und des tatsächlichen
Datenmodells (Worker/KV). Kein Marketing-Dokument; Store-Texte separat in
`docs/store-texte.md`.

Identität: App-Name **raumzuzweit** (de) / **roomfortwo** (en) ·
Bundle-/Application-ID **`app.roomfortwo`** · Anwendung + API + Universal/App
Links auf **`app.raumzuzweit.de`**; die Apex `raumzuzweit.de` trägt
Landing-Page und Rechtstexte · englische Domain `roomfortwo.app`.

---

## 1. Harte Blocker vor der ersten Einreichung

| # | Blocker | Warum | Stand |
|---|---|---|---|
| B1 | **Produktive Magic-Link-Zustellung per E-Mail** | Reviewer müssen sich anmelden können; der gesamte Zugang läuft über Magic-Links. Merkposten „Cloudflare Email Sending: watch and wait" muss hier aufgelöst sein (SMTP-Secrets produktiv verifiziert, `EMAIL_PFLICHT` erst danach). | offen |
| B2 | **Datenschutzerklärung öffentlich unter stabiler URL** | Pflichtfeld in beiden Stores (`https://raumzuzweit.de/datenschutz` vorgesehen — Rechtstexte auf der Apex). Muss LLM-Auftragsverarbeiter (Anthropic/Mistral/OpenAI-kompatibel, je nach Schalter), Cloudflare (Hosting/KV), Zweck, Speicherdauer, Löschweg nennen. | offen |
| B3 | **Impressum** (DE-Pflicht, § 5 DDG) auf `raumzuzweit.de` und aus der App erreichbar | Deutsche Anbieterkennzeichnung; Play zeigt zusätzlich Entwickler-Adresse an. | offen |
| B4 | **Support-Kontakt** (URL oder Mail) | Pflichtfeld beide Stores. | offen |
| B5 | **Apple Developer Program** (99 USD/Jahr) + **Play Console** (25 USD einmalig) | Konten inkl. Identitätsprüfung; D-U-N-S nur bei Firmen-Konto. | offen |
| B6 | **`APPLE_TEAM_ID` + `ANDROID_CERT_SHA256` als `[vars]`** | Sonst antworten die `/.well-known/`-Routen 503 und Universal/App Links verifizieren nicht (M5). | offen |

## 2. App Privacy (Apple) — vorformulierte Angaben

Grundwahrheit aus dem Datenmodell: erhoben werden **Name (Anzeige-Label)**,
**E-Mail (verschlüsselt, nur Wiedereinstieg)**, **Gesprächsinhalte** (KV, pro
Paar/Rolle strikt getrennt; A↔B nie), **Nutzungs-/Token-Stände** (pro Paar,
Monat). Keine Werbung, kein Tracking, keine Analytics-SDKs, kein Standort,
keine Kontakte, keine Fotos.

| Apple-Kategorie | Angabe | Verknüpft mit Identität? | Tracking? |
|---|---|---|---|
| Contact Info → Name | Ja (Anzeigename) | Ja (Paar-Konto) | Nein |
| Contact Info → Email Address | Ja (nur Wiedereinstieg; AES-verschlüsselt gespeichert) | Ja | Nein |
| User Content → Other User Content | Ja (Reflexions-/Paargespräche) | Ja | Nein |
| Identifiers → User ID | Ja (Paar-Code/Session; keine Werbe-IDs) | Ja | Nein |
| Usage Data → Product Interaction | Ja (Token-/Nutzungsstände je Paar, Betriebszweck) | Ja | Nein |
| Alle übrigen Kategorien | **Nicht erhoben** | — | — |

„Data Used to Track You": **keine**. Begründungssatz für das Review-Feld:
*Gesprächsinhalte werden ausschließlich zur Erbringung der Funktion verarbeitet
(Weitergabe an das konfigurierte LLM als Auftragsverarbeiter) und weder zu
Werbe- noch zu Trackingzwecken genutzt; die Einzelräume beider Partner sind
technisch strikt getrennt.*

## 3. Data Safety (Google) — vorformulierte Angaben

- **Erhoben:** Name; E-Mail-Adresse; „Nachrichten (sonstige In-App-Nachrichten)"
  = Gesprächsinhalte; App-Interaktionen (Token-Stände).
- **Geteilt mit Dritten:** LLM-Anbieter als Auftragsverarbeiter (Zweck:
  App-Funktion). Kein Verkauf, keine Werbung.
- **Sicherheit:** Verschlüsselung bei Übertragung (TLS); E-Mail-Adressen
  zusätzlich verschlüsselt gespeichert; Zugriff cookie-basiert (httpOnly).
- **Löschung:** Nutzer können Löschung verlangen (Betreiber-Prozess über den
  Paar-Code; Export vorhanden). Play verlangt seit 2024 eine
  **Konto-Löschungs-URL** → Seite auf `raumzuzweit.de` vorsehen (kann auf den
  Support-Kontakt + Prozess verweisen). **→ eigener Merkposten.**

## 4. Einordnung „keine Medizin-App" (Review-Fallstrick)

Positionierung gegenüber Review ausdrücklich: **Begleitung, keine Therapie und
keine Krisenintervention** (deckungsgleich mit `eskalation-an-profis.md`). Die
App diagnostiziert nicht, behandelt nicht, verweist bei Sicherheitslagen an
Menschen/Fachstellen. Diese Selbstbeschreibung gehört in Store-Beschreibung
UND Review-Notizen — sie verhindert die Einstufung unter Medizin-/
Gesundheitsauflagen (Apple 5.1.3) und ist zugleich inhaltlich wahr.

## 5. Altersfreigabe (Empfehlung)

Fragebogen ehrlich beantworten: keine expliziten Inhalte der App selbst, aber
freie Texteingabe + Themen wie Konflikt, ggf. Gewalt/Sucht in Nutzereingaben.
Empfehlung: **Apple 17+** („Unrestricted"-Kategorien nein, aber „Mature/
Suggestive Themes: selten/mild" ehrlich je nach Fragebogen; Zielgruppe
Erwachsene), **IARC/Google 16+**-Ergebnis erwartbar. Entscheidend: konsistent
mit der Beschreibung „für erwachsene Paare". *(Finale Einstufung ergibt der
Fragebogen — Empfehlung, keine Zusicherung.)*

## 6. Reviewer-Zugang (Konzept)

Problem: Magic-Links sind **einmalig und kurzlebig** — ein statischer
Demo-Zugang im Review-Formular funktioniert nicht.

Prozess je Einreichung:
1. Betreiber legt Review-Paar an (`admin.html`, z. B. „Alex/Robin Review").
2. Unmittelbar vor dem Absenden: für Rolle A **frischen Link** erzeugen
   (Relink) und in die Review-Notizen eintragen; zweiten Link für Rolle B
   beilegen, damit der gemeinsame Raum prüfbar ist.
3. Review-Notiz-Textbaustein: *„Login erfolgt per Einmal-Link (kein Passwort).
   Bitte Link X für Partner:in A, Link Y für Partner:in B verwenden. Falls ein
   Link abgelaufen ist: Support-Kontakt, wir liefern binnen Stunden frische
   Links."*
4. Nach bestandenem Review: Review-Paar löschen.

Risiko: Reviewer verbraucht Link doppelt → Ablehnung wegen „cannot log in".
Falls das passiert, Entscheidungspunkt: dedizierter langlebiger
**Review-Modus-Link** (nur für ein markiertes Review-Paar) als kleiner
Folgesprint.

## 7. Versions- & Release-Konvention

- **Sichtbare Version** (`CFBundleShortVersionString` / `versionName`):
  `MAJOR.MINOR.PATCH`, Start **1.0.0** bei der ersten Einreichung.
- **Build-Nummer** (`CFBundleVersion` / `versionCode`): streng monoton,
  Empfehlung Datumsform `YYYYMMDDNN`.
- **Kern-Kopplung:** Jede eingereichte Version wird in einem Release-Eintrag
  (`docs/RELEASES.md`, mit 1.0.0 beginnen) auf ihren **Kern-Hash** gemappt —
  dieselbe Wahrheit wie im Web (`data-core-hash`). Der Capacitor-Build druckt
  den Hash bereits im Build-Log.
- Versionspflege geschieht im nativen Projekt (Xcode/Gradle) — Repo-seitig
  zählt der Release-Eintrag.

## 8. Assets & Formalia (Sammelliste)

- Screenshots: iPhone 6,9" + 6,5" (Pflicht), iPad optional (nur wenn
  iPad-Unterstützung aktiviert — Empfehlung: zunächst iPhone-only einreichen);
  Android: Phone-Screenshots + Feature-Graphic 1024×500.
- App-Icon: aktuell M1-Platzhalter (zwei Kreise) — vor Einreichung bewusst
  entscheiden: Platzhalter veredeln oder finales Icon (Austausch = PNGs
  ersetzen, kein Codeeingriff). **DPMA-Markencheck** (Merkposten) sinnvoll VOR
  der Einreichung, da Store-Name = Markenauftritt.
- Lokalisierung der Store-Einträge: de-DE primär, en-US sekundär
  (`docs/store-texte.md`).
- Export-Compliance (Apple): Standard-TLS → „exempt" (Standardverschlüsselung),
  keine eigene Kryptografie-Deklaration nötig trotz E-Mail-Feldverschlüsselung
  (Standard-WebCrypto/AES) — Frage im Formular entsprechend beantworten.

## 9. Reihenfolge zum Launch (Kurzfahrplan)

1. B1–B6 auflösen (E-Mail zuerst — längster Hebel).
2. Native Projekte lokal erzeugen (M4-Protokoll), Associated Domains /
   Intent-Filter setzen (M5-Protokoll), Gerätetest inkl. Magic-Link.
3. `docs/RELEASES.md` anlegen, Version 1.0.0 + Kern-Hash eintragen.
4. Store-Einträge mit `docs/store-texte.md` füllen, Privacy-Angaben aus §2/§3
   übertragen.
5. Review-Paar + frische Links (§6), einreichen — Google zuerst (schnellerer
   Zyklus, Lerneffekte), Apple danach.

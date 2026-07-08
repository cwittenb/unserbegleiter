# Sprint 31b — Wire-Anglisierung: Speicherschicht & C3-API

**Datum:** 2026-07-08 · **Basis:** S31a (Kern `90fe56b282b384f9`) · **Patch:** `patch-s31b-storage-en.mjs`
**Kern-Hash nachher:** `a86f63e17e61b1cb` · **Tests:** 347 grün
**Reset statt Migration** gilt weiter: vor-S31 gespeicherte Bestände (Bündel, Chats, Couple-Records mit `sprachwunsch`) sind nach diesem Patch nicht mehr lesbar — kein Migrationscode.

## Umbenannt

**Bstate-Schlüssel** (FIELDS + DEFAULTS + alle get/set-Stellen + Worker-Whitelist folgt aus FIELDS + Test-/Dev-Panel-Fixtures + Test-Routen `/api/bstate/…`):
`auftraege`→`goals` · `regal`→`shelf` · `messrunden`→`measurements` · `momentprotokoll`→`momentLog` · `qz`→`qualitytime` · `befund`→`findings` · `aufdeckung`→`reveal` · `aufdeckprotokoll`→`revealLog` · `agenda` bleibt

**Pstate:** `zeitleiste`→`timeline` · `selbstoffenbarungen`→`selfDisclosures` · UI-Sprachfeld `sprache`→`language` (Worker-Whitelist angepasst)

**Übergabe:** Speicherschlüssel `uebergabe:<A|B>`→`handover:<A|B>` · Fassade `backend.uebergabe`→`backend.handover` · Route `/api/uebergabe`→`/api/handover`

**Item-/Objekt-Felder (persistiert):**
- Zeitleiste/MomentLog: `eintraege`→`entries`
- Messrunden: `werte`→`values`, `naehe`→`closeness`, `zweit`→`guess`, `passung`→`fit`, `aufgedecktAt`→`revealedAt`; Status `offen/bereit/aufgedeckt`→`open/ready/revealed`
- Regal/Agenda-Items: `gelesen`→`read`, `von`→`by`, `zustand`→`state` mit Werten `offen/besprochen`→`open/discussed` (`selfResolved` seit S31a)
- Goal-Items: `angelegt`→`createdAt`
- Qualitytime: `ruht`→`resting`, `wahl`→`choices`, `nichtAufgegriffen`→`notPickedUp`, `leiter`→`ladder` (`stufe2At/3At/4At`→`stage2At/…`, `pausiertBis`→`pausedUntil`), Einladungs-`domaene`→`domain`
- Aufdeck-Freigabe: `tipp3`→`guess3` (Test „nur name/top5/guess3/releasedAt queren" angepasst)
- Chat-Objekt: `sprache`→`language` (Sprach-Schnappschuss C1)

**C3-Sprachwechsel-API (Wire):** Route `/api/sprache`→`/api/language` · `sprachwunsch`→`languageRequest` (`ziel`→`target`, `von`→`by`) · Status `wartet/bestaetigt/verworfen/aktiv`→`waiting/confirmed/discarded/active` · Fehlercode `language_invalid` · Fassade `backend.language = { request(target), withdraw() }` — Worker, Pages-Client, Artifact-Backend, App, alle 13 C3-Tests.

**Ranking-Modus:** `punzufrieden`→`pchange` (RANK_MODES-Schlüssel, Marker-Hook, `engine.chat.ranks`, korpusTexte `rank.pchange.*` in beiden Korpora — Invarianten-Test deckt Parität).

**UI-Folgekorrekturen:** i18n-Schlüssel an umbenannte Aufrufe angeglichen (`mess.closeness/guess/fit`, `gate.wish`); Agenda-Zustand wird nicht mehr als Rohwert gerendert, sondern lokalisiert über neue Schlüssel `agenda.st.open/discussed/selfResolved` (de+en) — vorher leckte der (jetzt englische) Speicherwert in die deutsche UI.

## Bewusste Abweichung vom S31a-Protokollausblick

**Nicht umbenannt, mit Absicht:** Funktionsnamen (`baueMomentKontext`, `reglerErgebnis`, …), korpusTexte-/steuerTexte-**Schlüssel**namen (`mk.*`, `qm.*`, `startwerte.kopf`, `freigabeGequert`, …), Session-Arten (`solo/einzel/gemeinsam/aufdeck/moment/qz`), Registry-/dataset-Schlüssel, Klassennamen (Bstate/Pstate). Begründung: Das sind Code-interne Bezeichner, die weder persistiert werden noch das Modell erreichen — die Designnotiz S31 verlangt die Anglisierung des **Protokolls**; die Arbeitssprache des Repos ist Deutsch, und diese Namen tragen Domänenbedeutung. Ebenso bleibt das Eval-Katalog-Feld `sprache` (Stufe-D-Konfiguration, kein Nutzdaten-Wire).

Zwei Reparaturen, die die Testsuite im Prozess fing: Regex-Fehlgriffe in `qzStufe`/`keineEinladung` (Parameter vs. Schlüsselname) und ein `passung`-Shorthand im Prozess-Widget.

## Verifikation
Kette frischer Klon → C3 → D → S31a → S31b: dry-run → apply → Idempotenz → Byte-Abgleich → 347 grün → Kern `a86f63e17e61b1cb`.

## Eval-Bestätigungslauf (jetzt fällig, dein Key)
```
npm run eval -- --familie GATE
npm run eval -- --szenario AUF-01 && npm run eval -- --szenario AUF-01-EN
npm run eval -- --szenario SPA-01 && npm run eval -- --familie SPRA
```
Prüfblick laut Designnotiz: Marker-Disziplin ([[SLIDERS]]/[[CHAPTER-…]]/[[BASELINE]] allein in letzter Zeile), GATE-Pfad (paths self/shelf/moment), AUF-01 rote Linie, SLIDERS-/RANKING-RESULT-Verarbeitung. Befunde → ggf. Versions-Bumps im Katalog (Muster SPA-01 v1→v4).

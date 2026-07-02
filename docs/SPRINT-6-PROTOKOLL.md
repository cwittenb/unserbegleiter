# Sprint 6 — Protokoll · Frontend, beide Builds, Paritäts-Wächter

**Datum:** 2. Juli 2026 · **Stand:** 160 Tests grün (10 neue: 6 UI-Drehbücher, 4 Paritäts-Wächter)

## Gebaut

- `core/ui/sessions.js` — Session-Definitionen über der Backend-Fassade (info/bstate/pstate/chat/uebergabe/llm — ein Vertrag, zwei Implementierungen): soloDef (ZEITLEISTE→Pstate+finished; GATE→Panel-Hook), momentDef (MOMENT→Protokoll+finished; AUFTRAG→AG/AI-IDs, Status-Ops), quereGate (regal mit gelesen:false „merken statt melden" · agenda zustand:offen · selbst→Generalproben)
- `core/ui/app.js` — DOM-Schicht mit injiziertem document (happy-dom-testbar): Start/Mein Raum/Gemeinsamer Raum/Chat, Gate-Panel mit Wege-Wahl und FREIGABE-ERGEBNIS über submitToolResult, cleanDisplay im Rendering (Rohformen NIE sichtbar), „Hallo Anna"
- `platforms/artifact/main.js` + `selftest.js` — Dev-Umgebung: LocalBackend (window.storage, keyless), Namens-Onboarding, Rollen-Umschalter, eingebauter 11-Punkte-Selbsttest
- `platforms/cloudflare/pages/client.js` — RemoteBackend über Entitäts-Endpunkte; Enrollment per #t=…-Fragment (Token nach Konsum aus der Adresszeile), Cred-Fallback-Login
- Builds: `dist/paarbegleitung-dev.html` (73,6 kB, eine Datei) und `dist/cloudflare/` (worker.js + public/ + wrangler.toml mit KV/Secret-Anleitungen)

## Paritäts-Wächter („ein Kern, zwei Häuser" als Testfall)

`scripts/core-hash.js` hasht alle core/-Quellen deterministisch; beide Builds tragen den Stempel (Artefakt: data-core-hash, Worker: __CORE_HASH__, Pages: beide). Tests: Hash-Gleichheit über alle vier Artefakte · Artefakt ist wirklich EINE Datei ohne externe Skripte · beide Bundles enthalten die Charta-Kanarien (Prompts sind real drin, nicht nur importiert) · saubere Schnittkante: Worker-Bundle ohne UI, Client-Bundle ohne Auth-Interna.

## UI-Drehbücher (happy-dom, echte App + echte Engine + Mock-LLM)

Reflexionsgespräch komplett: Start→Antwort→ZEITLEISTE-BLOCK→Zeitleiste gefüllt, Rohform nie sichtbar. Gate: Panel öffnet, Regal-Querung setzt gelesen:false, Rückkanal = genau EINE User-Nachricht; „Noch nicht" quert nichts. Gemeinsame Session: AUFTRAG-BLOCK legt AG1/AI2 an, MOMENT-BLOCK schließt ab. Regal-Pull-Ansicht.

## Bemerkenswerter Fund

Die **AUF-01-rote-Linie hat den Testautor erwischt**: Das erste Auftrags-Fixture ohne vonBeidenBestaetigt/ownerBestaetigt wurde vom portierten Schema korrekt abgewiesen (Engine ging in die Korrektur-Runde und verbrauchte das Drehbuch). Genau dieses Verhalten schützt produktiv vor unbestätigten Auftrags-Änderungen — der Konsens-Zwang funktioniert Ende-zu-Ende.

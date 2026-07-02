# Sprint 2 — Protokoll · Store, Repo, Bstate/Pstate

**Datum:** 2. Juli 2026 · **Stand:** 97 Tests grün (33 neu) · Laufzeit 13,1 s

## Gebaut

| Datei | Inhalt |
|---|---|
| `core/store/store.js` | Store-Vertrag (get/set/del/list, shared-Trennung), `MemoryStore` mit Op-Zählern, `StoernisStore` für Fehlerpfade |
| `core/store/repo.js` | Repo: einzige Key-Instanz (`p:<NS>:<code>:<modul>:<teil>`), Cache TTL 12 s mit injizierbarer Uhr, write-through, del-Invalidierung, `setCode()` leert bei Paar-Wechsel, `_schema`-Stempel |
| `core/store/bundles.js` | `Bstate` (Single-Flight, Lesen-schreibt-nie, Nachbarfeld-Erhalt, vorwärtskompatible Fremdfelder) und `Pstate` (Single-Writer je Rolle, privater Namensraum) |
| `platforms/artifact/artifact-store.js` | window.storage-Wrapper, Träger injizierbar, fehlertolerant (Sandbox wirft bei fehlendem Key) |
| `platforms/cloudflare/worker/kv-store.js` | KV-Wrapper — läuft SERVERSEITIG im Worker; shared als Key-Präfix, Zugriffskontrolle bewusst NICHT hier, sondern in der Worker-API (S5) |

## Architektur-Präzisierung („ein Kern, zwei Häuser", Schicht Speicher)

In der Cloudflare-Form lebt die gesamte Repo/Bstate/Pstate-Schicht **im Worker** gegen KV; der Browser-Client dort spricht ausschließlich Entitäts-Endpunkte hinter der Session (S5) und sieht nie rohe Keys. Im Artefakt lebt dieselbe Schicht clientseitig gegen window.storage. Beweis im Test: Bstate/Pstate laufen unverändert über echtem Miniflare-KV (`tests/worker/kv-store.spec.js`).

## Entscheidungen mit Testfall-Dokumentation

1. **Ballast §1.1 vollzogen:** Kein Legacy-Key-Fallback — Testfall „Alt-Key ohne Modul wird NICHT gelesen". `_schema`-Stempel bleibt als Tür für künftige Migrationen.
2. **„Lesen schreibt nie" als Prinzip erhalten, Alt-Key-Zusammensetzen gestrichen:** `load()` auf leerem Speicher liefert Defaults ohne Persistenz (Testfälle mit `ops.set === 0`); die v0.29-Migration aus Einzelfeld-Keys entfällt, der Neubau startet leer.
3. **Store-Vertrag als wiederverwendbare Suite:** dieselben vier Vertrags-Tests laufen gegen MemoryStore, ArtifactStore (werkgetreuer Sandbox-Fake inkl. Wurf-Verhalten) und KVStore (echtes Miniflare-KV) — jede künftige Implementierung (z. B. D1) erbt die Suite.
4. **Grep-Wächter aktiv:** Key-Literale (`p:…`) außerhalb von `repo.js` in `core/` lassen den Lauf rot werden.
5. **Testbarkeit als Konstruktions-Kriterium:** Uhr (`now`) und Sandbox-Träger sind injizierbar — der TTL-Test läuft deterministisch ohne echte Wartezeit.

## Portierte v0.29-Selbsttest-Fälle

Repo set/get/del-Roundtrip + Cache · Bstate Feld-Roundtrip ohne Nachbarfeld-Verlust · Bstate parallele Loads = ein Flug, keine Schreib-Stürme · Pstate Single-Writer-Roundtrip.

## Testinventar neu

`repo.spec.js` (12) · `bundles.spec.js` (10) · `stores.spec.js` (9) · `worker/kv-store.spec.js` (3, gegen echtes KV)

## Nächster Schritt

Sprint 3 — Engine mit Mock-LLM (Ebene 1.5): Nachrichtenfluss, Marker → Panel-Hook, Block → Schema → genau eine SYSTEM-KORREKTUR-Runde, cleanDisplay-Anbindung, submitToolResult als einziger Panel-Rückkanal; komplette Sitzungs-Drehbücher headless.

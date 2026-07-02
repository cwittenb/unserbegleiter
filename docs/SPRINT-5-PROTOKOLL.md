# Sprint 5 — Protokoll · Worker: Auth, Entitäts-API, LLM-Proxy

**Datum:** 2. Juli 2026 · **Stand:** 150 Tests grün (21 Worker-Tests gegen echtes workerd)

## Gebaut

- `worker/util.js` — randomToken (WebCrypto), sha256Hex, Cookie-Helfer (HttpOnly, SameSite=Lax, Secure)
- `worker/auth.js` — Entitäten `sys/couple|magic|cred|session`; createCouple (liefert Code + BEIDE Magic-Links, Übergabe-Variante), enroll (Einmal-Konsum VOR Ausgabe), loginWithCred (nur Hashes im Speicher), requireSession (15 min, touch-to-extend, Banking-Muster)
- `worker/index.js` — Router: öffentlich /api/paar·enroll·session; dahinter Session-Pflicht: /api/me, /api/bstate/:feld (Whitelist), /api/pstate/:feld (**Rolle NUR aus Session — Query und Body werden bewusst nicht konsultiert**), /api/chat/(shared|mine)/:id, /api/uebergabe (POST eigene Rolle / GET geteilt), /api/llm (Proxy: Key serverseitig, env.UPSTREAM-Service-Binding für Tests)

## Die Auth-Matrix ist jetzt ausführbar

Namensgebender Test **„Bernd liest Anna nicht"** in vier Angriffsformen gegen den deploy-gleich gebündelten Worker: regulär (nur eigene Daten), Query-Manipulation `?role=A` (ignoriert), Body-Manipulation `{role:"A"}` (landet in Bernds eigenem Pstate), Pfad-Trickserei (≥400, kein Leck). Dazu: private Solo-Chats je Rolle isoliert, geteilte Chats gemeinsam; vollständige Paar-Isolation; 401-Matrix über alle Endpunkte ohne Session; Einmal-Token (2. Konsum → 410), Ablauf (410), Cred-Re-Login, touch-to-extend nachgewiesen (expiresAt wandert); Übergabe-Schema-Zwang und Fremdfeld-Filter wirken bis zur API („GEHEIM" quert nicht); LLM-Proxy mit Mock-Upstream in Fassadenform, Denial-of-Wallet-401, 400-vor-Upstream bei kaputtem Body.

**Damit ist die Geheimnis-Architektur auf der Speicherschicht keine Konvention mehr, sondern serverseitig erzwungene Eigenschaft.**

Ein Testfix nötig (kein Worker-Fehler): GET-Anfragen dürfen keinen Body tragen — der Mini-Client sendet Bodies jetzt nur bei Nicht-GET.

# Sprint 29 — Design dokumentweit · Abschluss (Produktiv-Client)

**Stand deines Repos:** `origin/main` = `52703ba "s29 now complete themable"` — die Dokument-weit-Umstellung (design.js, app.js, main.js, dev-panel.js) ist bereits committet. **310 Tests grün · Kern-Hash `823f20bee7166f4f`.**

## Was noch fehlte: der Produktiv-Client

Die eigentliche App ist in Produktion (Cloudflare/Pages) gestylt, weil `client.js` `createApp(...).boot()` ruft und `applyDesign` in `boot()` sitzt. Aber `client.js` zeigt **vor** dem Boot zwei Screens, die noch fest verdrahtete Farben hatten:

- den **Wiedereinstiegs-Screen** ("Kein Zugang auf diesem Gerät"),
- die **Enroll-Fehlermeldung** (ungültiger/abgelaufener Link).

`patch-s29c-client.mjs` behebt das: `applyDesign(doc)` läuft jetzt ganz am Anfang von `client.js`-`boot()`, und beide Screens nutzen die Design-Tokens. Damit ist das Design ab Start **auch in Produktion** durchgängig.

Verifiziert gegen einen frischen Klon von `origin/main` (52703ba): client.js byte-identisch mit dem geprüften Stand, idempotent, 310 Tests grün, voller Build (inkl. Cloudflare/Pages) → `823f20bee7166f4f` (unverändert — client.js ist Plattform-Code, nicht im Kern-Hash).

## Anwenden

Auf deinem aktuellen Stand `node patch-s29c-client.mjs` (Trockenlauf zuerst), dann `npm test` (310). Der Kern-Hash ändert sich nicht.

## Auth-Modell (zur Einordnung)

Produktion: `createCouple` erzeugt **zwei Magic-Links** — einen mit Rolle A, einen mit Rolle B. Der Token trägt die Rolle (`sys/magic/<token> → {code, role}`); `/api/enroll` meldet serverseitig als diese Rolle an, `/api/me` leitet Name/Partner aus der **Session** ab. Regel: Rolle und Paar-Code kommen immer aus der Session, nie aus dem Request. Kein "Wer bin ich?" in Produktion — der Link bestimmt es. Die Rollenwahl im Artefakt ist reine Dev-Bequemlichkeit (kein Server/keine Links).

# Sprint 9 — Protokoll · Direkte Diktatfunktion

**Datum:** 2. Juli 2026 · **Stand:** 186 Tests grün (6 neue) · Kern-Hash `d123277c3fb3b92f`

## Gebaut

🎤-Knopf im Chat-Composer (`core/ui/app.js`), zweistufig:

1. **Direkte Erkennung** (Cloudflare-Form, Chrome/Edge/Safari): Browser-Spracherkennung `de-DE`, kontinuierlich mit Zwischenergebnissen; nur **finale** Ergebnisse landen kumulativ im Eingabefeld (Zwischenergebnisse flackern nicht ins Feld). ⏹ stoppt; stiller Browser-Timeout setzt den Knopf sauber zurück.
2. **OS-Tipp-Fallback** — greift automatisch, wenn keine Erkennung existiert (z. B. Firefox) ODER das Mikrofon blockiert ist (`not-allowed`, der Artefakt-Sandbox-Fall): plattformbewusster Hinweis in der sanften Hinweis-Box (mobil: Tastatur-Mikro · Windows: Win+H · macOS: Fn Fn · sonst generisch). Damit ist das v0.29-Tipp-Verhalten der Fallback-Pfad derselben Funktion, keine Parallel-Lösung.

Beides injizierbar (`createApp({…, diktat:{SR, ua}})`) — deshalb headless beweisbar.

## Tests (6 neue, happy-dom, Fake-Erkennung)

Start setzt de-DE + ⏹-Zustand · finale Ergebnisse kumulieren korrekt (resultIndex-Fenster), Zwischenergebnisse verändern nichts · not-allowed → OS-Tipp + sauberer Reset · vier Plattform-Tipps (iPhone/Windows/Mac/Linux) bei fehlender Erkennung.

## Spezifikation nachgezogen

§7.2 (Diktat im Workflow erwähnt), §9.1 (Sandbox-Grenze beschreibt jetzt den automatischen Rückfall), §10 (offener Punkt als erledigt markiert, mit ehrlichem Browser-Hinweis: Web-Spracherkennung existiert nicht in Firefox — der Fallback deckt die Lücke).

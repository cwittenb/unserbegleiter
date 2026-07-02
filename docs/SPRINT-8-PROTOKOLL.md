# Sprint 8 — Protokoll · Missbrauchsschutz (Dosierung) + Themen-Rahmen

**Datum:** 2. Juli 2026 · **Stand:** 180 Tests grün (Ebene 1: 139 · Ebene 1.5: 12 · Worker: 29) · Kern-Hash neu

## Gebaut

- `platforms/cloudflare/worker/quota.js` — drei deterministische Schichten VOR jedem Upstream-Kontakt, Prüfreihenfolge Duplikat → Rate → Kontingent (die billigste zuerst):
  1. **Kontingent:** gleitendes Fenster, Default 90 Nachrichten je Person / 72 h (Summe der Tageszähler `sys/quota/<code>/<rolle>/<datum>`, selbstverfallend per TTL). Weicher Rand: Hinweis ab 90 %, Karenz 10 zum würdigen Session-Abschluss, erst danach 429 — mit warmer Meldung, die auf das echte Gespräch verweist.
  2. **Raten-Limit:** Default 8/min je Person (`sys/rate/…`, TTL 120 s) — „kurz durchatmen".
  3. **Duplikat-Wächter:** dieselbe normalisierte Nachricht (lowercase, Leerraum egalisiert) 3× in Folge ⇒ 429 ohne LLM-Aufruf; andere Nachricht setzt zurück.
- Verdrahtung in `/api/llm`; Kontingent-Hinweise reisen als `kontingent`-Feld in der Antwort; der Proxy-Adapter reicht sie an die UI weiter, die sie als **sanfte Hinweis-Box** zeigt (gelb, kein Fehler). Fehleranzeige der App zeigt jetzt die Meldung selbst statt eines Technik-Präfixes.
- **Themen-Rahmen** als eigener Prompt-Baustein (`THEMEN_RAHMEN` in prompts.js), an solo- und moment-Session angehängt: Beziehungsarbeit ja, Zweckentfremdung freundlich zurückgelenkt, bei unklarem Bezug **fragen statt abweisen** (Konsequenz aus dem GATE-B-Learning zu konsequenzblinden Klärungsfragen: keine falschen Abweisungen bei mehrdeutigen persönlichen Themen). Kanarien-bewacht.

## Entscheidungen (mit Cars10 abgestimmt)

- **Zeitliche Dosierung statt Dollar oder hartem Tageslimit** — gleitendes 3-Tage-Fenster erlaubt den Krisenabend (~50 Nachrichten) und dämpft nur anhaltende Übernutzung; therapeutische Doppelbegründung (Gegengewicht zur Ko-Regulations-Verdrängung). Realistische Zeitschätzung: 2–4 min je Wechsel ⇒ 90/72 h ≈ 1–2 h Nutzung/Tag im Dauerschnitt.
- **Deterministische Bot-Abwehr statt semantischem Klassifikator** — Kontingent macht Missbrauch zum begrenzten Kostenproblem; Rate stoppt Skripte; Duplikat-Wächter fängt das konkrete Muster „immer gleiche Anfrage" kostenlos. Klassifikatoren bewusst verworfen (Latenz, Kosten, Fehlalarme bei mehrdeutigen Themen).
- Alle Werte per Environment kalibrierbar für die Testpaar-Phase.

## Tests (9 neue, gegen echtes workerd)

Kontingent-Treppe 1→8 (frei/Hinweis/Karenz/429, letzteres OHNE Upstream-Zähler-Anstieg) · gleitendes Fenster (vorgestern zählt, vor 4 Tagen nicht — via KV-Manipulation) · Kontingente je Person getrennt · Duplikat 3× (auch bei anderer Groß-/Leerraum-Schreibung) ⇒ 429 ohne Upstream, Umformulierung löst · Raten-Limit (eigener Worker mit Rate 2) · Daten-Endpunkte bleiben unberührt (nur der LLM-Proxy dosiert) · quotaCfg-Environment-Parsing inkl. Unsinn-Fallback · Normalisierung. Dazu Scope-Kanarie: beide Betriebs-Prompts tragen THEMEN-RAHMEN samt „frag nach dem Bezug, statt abzuweisen".

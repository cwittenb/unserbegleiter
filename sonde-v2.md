# Mistral-Sonde v2 — Konversations-Turn als structured output

Modell: `mistral-large-latest` · 3 Läufe je Szenario · 2026-07-18T19:31:08.636Z

## 1 · Transport & Schema (nullable Union, Marker-Enum)

| Szenario | Modus | HTTP 200 | Parse | Schema gültig | ø ms |
|---|---|---|---|---|---|
| S1 | normal | 100 % | 100 % | 100 % | 8935 |
| S2 | normal | 100 % | 100 % | 100 % | 3414 |
| S3 | normal | 100 % | 100 % | 100 % | 5238 |
| S1 | stream | 100 % | 100 % | 100 % | 2666 |

Streaming-Befund: 3/3 Läufe lieferten echte Delta-Häppchen (ø 61 Deltas/Lauf).

## 2 · Inhalt: trifft Marker/Block die Erwartung? (Prompt-Befund, kein Transport-Fehler)

| Szenario | Marker erwartet | Marker getroffen | Block erwartet | Block getroffen |
|---|---|---|---|---|
| S1 | null | 100 % | null | 100 % |
| S2 | SCALE-SAFETY | 100 % | null | 100 % |
| S3 | null | 100 % | ZEITLEISTE | 100 % |

## 3 · Textqualität im JSON-Feld (Proxy-Maße)

ø Länge 457 Zeichen · Absätze (\n\n) 100 % · Frage enthalten 100 % · Deutsch 100 % · keine Marker-/Block-Lecks im Text 100 %

Keine auffälligen Läufe.

## Entscheidungsgate Voll-Umstellung

- Abschnitt 1 durchgehend ≥ 95 % Schema-gültig (inkl. S3-Union und Stream-Zeile) → Transportfrage geklärt, Engine-Umbau kann geplant werden.
- 4xx mit anyOf/null-Diagnose im Roh-Fehler → strict kann die Union nicht; Alternativen: flaches Schema (blockTyp + optionale Felder) erneut sondieren.
- Abschnitt 3 mit Absätzen < 80 % oder Marker-Lecks > 0 → Textqualität braucht Prompt-Arbeit VOR der Umstellung.
- Abschnitt 2 ist Prompt-Kalibrierung (wie heute auch) — kein Umstellungs-Blocker, aber Eval-Backlog-Stoff.
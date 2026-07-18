# Mistral-Structured-Outputs-Sonde

Modell: `mistral-large-latest` · Läufe je Variante: 5 · 2026-07-18T18:47:05.288Z

| Variante | HTTP 200 | Parse (1. Versuch) | Schema gültig | gerade " | deutsche „ | ø ms |
|---|---|---|---|---|---|---|
| A · json_schema strict | 100 % | 100 % | 100 % | 0 % | 100 % | 5997 |
| B · json_schema default | 100 % | 100 % | 100 % | 0 % | 100 % | 6493 |
| C · json_object | 100 % | 100 % | 80 % | 0 % | 100 % | 4471 |

## Auffällige Läufe

**1. Variante C · HTTP 200 · finish stop**
- Mängel: checks[1].beleg fehlt/kein String


## Einordnung fürs Entscheidungsgate (S35c-Analogie)

- Variante A/B ≥ 95 % Schema-gültig im Erstversuch → structured outputs tragen den Judge-/Pipeline-Pfad auf Mistral.
- Variante C deutlich schwächer als A/B → bestätigt, dass die heutige Text-Konvention auf Mistral das Risiko ist, nicht das Modell.
- 4xx bei A mit strict → strict-Feld im Wire-Format prüfen (Roh-Fehler oben); ggf. Variante B als Produktionsform.
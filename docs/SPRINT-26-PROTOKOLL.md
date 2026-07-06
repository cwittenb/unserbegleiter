# Sprint 26 — Protokoll · Nutzerführung im Ton des Prototyps v0.25

**Datum:** 6. Juli 2026 · **Stand:** 272 Tests grün (216 · 12 · 44) · **Kern-Hash NEU: `5582167e5cfbefad`** (vorher 17332652)

## Anlass & Stil-Referenz

Der Neubau war funktional, aber wortkarg — der alte Prototyp v0.25 führte deutlich wärmer. Dessen Tonlage wurde destilliert und übernommen: duzend, kurze Sätze, entlastende Nachsätze („nichts wird gemessen oder nachgehalten"), Vertraulichkeit immer explizit benannt, Gedankenstriche statt Bürokratie.

## Gebaut

1. **Hauptübersicht:** persönliche Begrüßung („Schön, dass du da bist, {Name}.") + Ein-Satz-Regel („Was bei dir bleibt, bleibt bei dir — geteilt wird nur, was du ausdrücklich freigibst.") + je Raum eine Erklärzeile unter dem Knopf; „Mein Raum" nennt den Partner namentlich („Nichts von hier erreicht {Partner}, außer du gibst es frei.").
2. **In den Räumen:** Titel + Intro. Mein Raum: Vertraulichkeits-Satz aus v0.25 + „Nimm dir die Zeit, die du brauchst." Gemeinsamer Raum: „Hier liegt nur, was freigegeben wurde — und alles, was ihr zu zweit macht."
3. **Session-Start ohne fingierte User-Nachricht:** „Ich bin da und möchte mit der Auftragsklärung beginnen." war nie eine Äußerung der Person. Die Eröffnungs-Nachricht ist jetzt als Modell-Steuerung markiert (`hidden`, via `submitToolResult`) und um „Eröffne die Session von dir aus." ergänzt — **die Begleitung beginnt sichtbar von sich aus**, mit Warte-Indikator ab dem ersten Moment.
4. **Weitere Stellen** (aus v0.25 übernommen/angepasst): Regal-Intro („Kein Posteingang: … als ihre Erfahrung, nicht als Nachricht oder Anforderung. Reagieren ist frei; der beste Ort dafür ist das Gespräch."), Gemeinsame-Momente-Intro („kein Programm, kein Takt … nichts auswählen ist völlig in Ordnung."), Zeitleisten-Leerzustand („… sie entstehen aus deinen Reflexionsgesprächen, mit Datum und Kurzfassung."). Die Prozessreflexion führte bereits gut (verdeckt-Hinweis) und blieb unangetastet.

Tests +2: Begrüßung/Raum-Texte mit Namen · Session-Start zeigt keine me-Bubble, die Eröffnung kommt von der Begleitung, der Steuerungs-Text liegt hidden im Verlauf.

## Auslieferung

`patch-s26-nutzerfuehrung.mjs` — 9 Anker-Edits, 2 Dateien; setzt S25 (`17332652`) voraus → ergibt `5582167e`. Verifiziert: Vor-Stand rekonstruiert, Trockenlauf 9/9, Byte-Abgleich identisch, Idempotenz 0 Fehler.

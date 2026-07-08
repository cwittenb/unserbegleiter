# Sprint 30 · Stufe D — Englische Evals & Vor-Session-Sprache

**Datum:** 2026-07-08 · **Basis:** S30·C3 (Kern `8badcf9ed27490ff`) · **Patch:** `patch-s30d-evals-en.mjs`
**Kern-Hash nachher:** `54e384216783f38b`
**Tests:** 347 grün (vorher 339; +8 `tests/unit/stufe-d.spec.js`; Katalog-Zähl-Test 9→10 angepasst)

## D1 — Evals englisch

### Runner sprachfähig
`sysPromptFuer` wählt den Korpus über `getPrompts(szenarioSprache(szenario))` —
EN-Szenarien tragen `sprache:"en"`, alles andere bleibt de (Default,
rückwärtskompatibel). Der Ergebnis-Datensatz je Szenario trägt `sprache` mit
(append-only-Berichte bleiben nachvollziehbar). CLI: `--sprache de|en`
komponiert mit den bestehenden Filtern `--familie`/`--szenario`.

### EN-Katalog (`evals/szenarien/start-katalog.en.js`)
EN-Gegenstücke aller Start-Szenarien, IDs mit `-EN`-Suffix, Familien geteilt
(Familien-Quoten aggregieren über Sprachen; `sprache` unterscheidet im
Bericht). Test-Semantik erhalten statt wörtlich übersetzt — die
„angegriffen"/„attacked"-Ambiguität (ESK-07) trägt; Bernds Nicht-Zusage in
AUF-01 ist „I could see that in principle". Protokoll-Token
(`REGLER-ERGEBNIS`, `RANKING-ERGEBNIS`) bleiben auch in EN-Eingaben invariant
(SPA-01-EN, per Test gesichert); Domänen-Namen darin folgen dem EN-Korpus.
Strukturelle Parität (gleiche Check-IDs, gleiche rote Linien, gleiche
verletztWenn-Richtungen) ist testgesichert.

### Neue Familie SPRA — Sprachdisziplin als Eval
Die C2-Invariante wird verhaltensgeprüft, in beiden Richtungen:
- **SPRA-01** (de-Session): englische Eingabe → Antwort bleibt deutsch, der
  Inhalt (Rückzug, Ausgesperrt-Fühlen) wird normal aufgenommen.
- **SPRA-01-EN** (en-Session): deutsche Eingabe → Antwort bleibt englisch,
  Inhalt aufgenommen.
Keine rote Linie (nicht sicherheitskritisch), aber Verletzung = rot im
Familienbericht.

### Judge sprachfähig, EIN Kontrakt (`JUDGE_PROMPT_VERSION = "j3"`)
`baueJudgePrompt(sprache)` liefert eine englische Prüfer-Variante;
Transkript-Kopf und Labels (`TRANSCRIPT`/`AUDIT QUESTIONS`/`SYSTEM(Companion)`)
folgen der Szenario-Sprache; die Korrektur-Runde ebenso. **Der JSON-Kontrakt
bleibt sprachinvariant:** Antworten sind immer `"ja"/"nein"` — auch im
englischen Judge (explizit im Prompt erklärt) — damit Parser, Rettungsstufe
und Härteregeln eine einzige Wahrheit haben. Parser unverändert.

## D2 — Vor-Session-Sprache (Wiedereinstiegs-Screen)

Vor der Anmeldung existiert kein pstate. Neue reine Funktion
`vorSessionSprache(gespeichert, navLang)` in `core/i18n/index.js`:
gespeicherte Wahl → Browser-Sprache (Präfix-Match gegen registrierte
Wörterbücher) → `de`. Der Pages-Client setzt sie in `boot()` VOR dem ersten
`t()` — damit sind Wiedereinstiegs-Screen, Enroll-Fehler und Start-Fehler
lokalisiert. Auf dem Wiedereinstiegs-Screen gibt es einen DE/EN-Umschalter
(persistiert in `localStorage["pb.sprache"]`, baut den Screen neu). Nach der
Anmeldung bleibt pstate maßgeblich (app.js unverändert); die pstate-Wahl
spiegelt sich in die Vorab-Wahl zurück, sodass der nächste Wiedereinstieg
in der eigenen Sprache erscheint. Privat-Modus ohne localStorage fällt
lautlos auf die Browser-Sprache zurück.

## Empfohlener erster EN-Lauf

```
ANTHROPIC_API_KEY=… npm run eval -- --sprache en
ANTHROPIC_API_KEY=… npm run eval -- --szenario SPRA-01     # de-Richtung
```

## Offen
- EN-Szenario-Wortlaute: nachgelagertes Review durch Cars10 möglich (Evals
  sind billig neu zu laufen, nicht nutzerseitig); Befunde des ersten echten
  EN-Laufs können Versions-Bumps auslösen (Muster SPA-01 v1→v4).
- `kw.poleZ`-Abgleich mit „Inner Alignment" (aus C2, weiter offen).
- S31: Wire-Anglisierung (Designnotiz liegt vor).

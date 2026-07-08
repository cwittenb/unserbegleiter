# Sprint 30 · C3 — Beidseitig bestätigter Paarsprachen-Wechsel

**Datum:** 2026-07-08 · **Basis:** S30·C2 (Kern `5e43aa3691ae44e7`) · **Patch:** `patch-s30c3-sprachwechsel.mjs`
**Kern-Hash nachher:** `8badcf9ed27490ff`
**Tests:** 339 grün (vorher 326; +7 `tests/worker/sprache.spec.js`, +6 `tests/unit/paarsprache.spec.js`)

## Was dieser Sprint liefert

Die Paarsprache (Begleitungssprache) ist ein geteilter Vertrag — sie kann jetzt
gewechselt werden, aber ausschließlich beidseitig bestätigt. Das
Mandats-Bestätigungs-Muster („von beiden bestätigt") auf Einstellungs-Ebene.

### 1. Worker: `/api/sprache` (Zustandsmaschine in `sys/couple`)

```
kein Wunsch ──POST{ziel} (Rolle X)──▶ sprachwunsch{ziel, von:X, at}      → wartet
Wunsch{von:X} ──POST{gleicher ziel} (Rolle Y)──▶ locale=ziel, Wunsch weg → bestaetigt
Wunsch ──DELETE (beide Rollen)──▶ Wunsch weg, locale unverändert         → verworfen
Wunsch{von:X} ──POST (Rolle X, erneut)──▶ idempotent erneuert            → wartet
POST{ziel == aktuelle Sprache} ──▶ stiller No-op, Wunsch unberührt       → aktiv
```

Die Invariante erzwingt der Worker, nicht die UI: `locale` ändert sich
ausschließlich durch zwei gleichlautende Anträge **verschiedener** Rollen; die
Rolle kommt aus der Session, nie aus dem Request (Spez §5.5). Ungültige
Zielsprache → 400 `sprache_invalid`. `/api/me` liefert `sprachwunsch` mit.

### 2. Fassade: `backend.sprache = { antrag(ziel), zurueckziehen() }`
- Cloudflare-Client: gegen `POST/DELETE /api/sprache`.
- Artifact-Backend (dev): identische Zustandsmaschine gegen den geteilten
  `PBDEV:meta`-Datensatz — über den Rollenwechsel des Dev-Panels bilateral
  testbar.

### 3. UI: Karte „Begleitungssprache (Paar)" auf dem Startbildschirm
Drei Zustände: Vorschlagen-Knopf / „wartet auf {partner}" + Zurückziehen /
„{partner} schlägt … vor" + Bestätigen/Ablehnen. Nach Bestätigung Meldung
„Von euch beiden bestätigt …" plus dauerhafter Hinweis: laufende Gespräche
behalten ihre Sprache (Sprach-Schnappschuss C1/C2), neue starten in der neuen.
Backends ohne `sprache`-Fassade: Karte bleibt verborgen (rückwärtskompatibel).

### 4. i18n
13 neue Schlüssel `paarspr.*` in de und en (Paritätstest deckt ab).

### 5. Tests
- **Worker (Miniflare, deploy-gleich gebündelt):** Vorschlag→Bestätigung,
  Einseitigkeit unmöglich (idempotenter Doppel-Antrag derselben Rolle),
  Ablehnen, Zurückziehen + erneuter Zyklus, No-op auf aktive Sprache mit
  unberührtem Wunsch, Rückweg en→de, 400 bei ungültiger Sprache, 401 ohne
  Session.
- **UI (happy-dom, echte App):** drei Karten-Zustände, Ablehnen-Pfad, Karte
  verborgen ohne Fassade, und der Brückenschlag zu C1/C2: nach beidseitiger
  Bestätigung startet eine NEUE Einzelsession englisch (Systemprompt + Titel).

## Wire-Notiz
Feldnamen bleiben deutsch (`sprachwunsch`, `ziel`, `von`) — konsistent mit der
auf S31 verschobenen Wire-Anglisierung.

## Offen (unverändert aus C2)
- `kw.poleZ`-Abgleich mit „Inner Alignment" (Frage an Cars10)
- Stufe D: Evals englisch; Wiedereinstiegs-Screen-Sprache
- S31: Wire-Anglisierung

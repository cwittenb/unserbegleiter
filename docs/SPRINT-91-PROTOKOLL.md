# Sprint S91 — I12 serverseitig (Verdeckte Runde) & Slice-3-Lesart der Zahlenregel

**Basis:** `origin/main` @ `58aedf3` (patch-s89 gemergt) · **Kern-Hash nach Build:** `3190cd2f68362892`
**Quelle/Anlass:** Designnotiz-Rückfragen. D-C („Warum nicht gleich umsetzen?") — es gab keinen guten Grund zu warten, zumal es sich um die **benannte Invariante I12 „Verdeckte Runde"** (Slice 3, Testfall BLIND-2) handelt, die bisher nur auf UI-Ebene galt. D-A wurde entschieden: **Slice-3-Lesart** — einzelne Zahlen dürfen häppchenweise gesprochen werden („du hast Anna auf 4 geschätzt – sie sagt 4"); verboten sind Zahlen-Dump, Aggregat/Mittelwert (I13) und Richtungs-Vergleich. Der Korpus („Werte sieht nur das System") widersprach Slice 3 und wurde harmonisiert.
**Patch:** `patch-s91-i12-serverseitig-und-zahlenregel.mjs`

## Entscheidungen (Klärungsfragen)

| # | Entscheidung |
|---|---|
| D-C | Sofort umsetzen (Vorgabe). **Leitbefund der Analyse:** Reine Lese-Redaktion hätte über das Read-Modify-Write des Clients Partnerdaten **gelöscht** (A liest redigiert, schreibt ganz zurück → Bs offener Beitrag weg) — deshalb werden die Messungen **servergeführt**. |
| D-A | Slice-3-Lesart (Vorgabe). Konsequenz: Korpus-Präzisierung + MRV-01/C3 v2; ein etwaiger Laufzeit-Wächter zielte künftig auf I13-Muster (Dump/Aggregat/Ranking), nicht auf Zahlen an sich — Entscheidung darüber weiter erst nach MRV-Messläufen. |
| Akzeptierte Restgrenze | `ready` impliziert „beide haben abgegeben"; ab da liegen die Werte notwendig beim QZ-Client (er baut den Momentkontext und schickt sie ans Modell). Volle Post-ready-Geheimhaltung bräuchte serverseitige Kontext-Assemblierung — andere Architektur, bewusst nicht Teil von S91. Memory-/Artefakt-Plattform (ohne Server): I12 bleibt dort UI-Zusicherung, im Code dokumentiert. |

## Änderungen

**T1 · Messungen servergeführt (I12).**
- `core/ui/prozess.js`: neue reine Funktion `redigiereMessungenFuerRolle(mr, role)` — `ready`/`revealed` voll; `open` **ohne** eigenen Beitrag entfällt **samt Existenz** („niemand sieht den Stand des anderen"); `open` **mit** eigenem unverändert (der Partner-Slot ist dort ohnehin `null` — beide da hieße `ready`). `trageMessbeitragEin`/`markiereAufgedeckt` delegieren an `backend.mess`, falls vorhanden (der `!rundeId`-Guard bleibt **vor** der Delegation); der Kopfkommentar („offener Punkt") wurde auf den neuen Stand gehoben.
- `platforms/cloudflare/worker/index.js`: `GET /api/bstate/measurements` liefert nur noch redigiert (exakt über die Kernfunktion); `PUT` darauf → **403 `mess_managed`** (verhindert Redaktions-Echo-Datenverlust *und* Peek-by-Write). Neue Routen `POST /api/mess/beitrag` (Wertevalidierung 1–10, dann Kern-`trageMessbeitragEin` über eine Bstate-Adapterschale — Server-Merge mit voller Sicht, **eine Quelle der Wahrheit**; Antwort in der Sicht der abgebenden Rolle) und `POST /api/mess/aufgedeckt` (Kern-`markiereAufgedeckt`, ID-genau, folgenlos bei falscher ID). Rolle ausschließlich aus der Session.
- `platforms/cloudflare/pages/client.js`: `backend.mess = { beitrag, aufgedeckt }`.
- App-Code (`zeigeMess`, S89-Lazy-Check, `messFenster`) unverändert — `messFenster` liest ausschließlich eigene Beiträge und ist redaktionssicher; `bereiteRunde` sieht `ready` erst, wenn es wahr ist.

**T2 · Zahlenregel (D-A).**
- Korpus `mk.prozessKopf` / `mk.prozessNachtrag` (de+en): „Werte sieht nur das System" → „die Werte stehen nie in der UI und werden nie als Block vorgelesen; einzelne Zahlen häppchenweise, Treffer zuerst; nie Zahlen-Dump, nie Mittelwert oder Score, nie Richtungs-Vergleich". Einzige Fundstellen der alten Formel waren diese zwei Schlüssel (geprüft) — der AKT-1-Absatz brauchte keinen Eingriff.
- MRV-01 → **version 2** (de+en): C3 verletzt jetzt bei Dump / Aggregat / Richtungs-Ranking, nicht mehr bei jeder gesprochenen Zahl. C1/C2/C4/C5 unverändert.

## Tests

**Neu:** `tests/worker/blind2-mess.spec.js` — 6 Tests gegen den **echten** Worker (Miniflare, gebündelt): A gibt ab → B sieht **kein** Item (auch keine Existenz), A nur sich; B gibt blind ab → Server merged in **dieselbe** Runde, beide sehen voll `ready` (keine Parallel-Runde); direkter PUT für beide Rollen 403 + der Beitrag überlebt den Versuch; Aufdeckung ID-genau (falsche ID folgenlos) und gemischte Liste (revealed + fremd-offen) korrekt redigiert; unplausible Beiträge → 400 `mess_invalid`; ohne Session → 401.
**Neu:** `tests/unit/s91-i12-redaktion.spec.js` — 5 Tests: Redaktionsfunktion pur (Existenz-Tilgung, Voll-Sicht ab ready, Leerfälle) und Fassaden-Delegation (Bstate wird auf servergeführten Plattformen **nie** berührt; `!rundeId`-Guard vor der Delegation).
**Bestand:** unverändert grün — insbesondere die S89-Suite (Memory-Pfad ohne `backend.mess`) und alle 112 bisherigen Worker-Tests.

## Verifikation

- Voller Testlauf **grün**: **1160 Tests / 139 Dateien** (Basis 1149 + 11 neue)
- Build: `npm run build` · Kern-Hash `3190cd2f68362892`
- Korpus-Parität de/en grün; Katalog-Wohlgeformtheit grün (Zähler unverändert 25, nur C3-Text/Version)
- Patch auf frischem Klon (`58aedf3`): dry-run → apply → Idempotenz → Byte-Vergleich → Tests → Build

## Eval-Kadenz (S66)

- [x] **Korpus berührt** → MRV-Lauf lokal fällig (`npm run eval -- --familie MRV`), jetzt gegen C3 **v2**; Sandbox ohne API-Zugang — bitte vor/mit dem Merge. Der offene S89-Haken (Erst-Lauf der Familie) gilt weiter und deckt dies mit ab.
- [ ] Session-Prompts berührt → nein (nur `mk.*`-Korpuskopf) · Judge → nein · UI → nein (Worker/Fassade)
- [ ] Release-Gate → nicht Teil dieses Sprints

## Notizen

- **Deploy-Hinweis:** Worker-Änderung — nach dem Merge `npm run build` und Deploy aus `dist/cloudflare/` (Secrets bleiben erhalten). Pages-Client und Worker müssen zusammen ausgerollt werden (alter Client + neuer Worker: `PUT measurements` eines alten Clients liefe auf 403 — der einzige Schreiber war aber ohnehin `trageMessbeitragEin`, das im neuen Stand delegiert).
- Designnotiz auf **v1.1** gehoben (D-A entschieden, D-B nach Slice 3 neu gefasst → S92-Kandidat, D-C erledigt); Diagramm-Kasten AKT 1 entsprechend präzisiert.

# Sprint S92 — Verlaufs-Verbraucher nach Slice 3 (Trajektorien-Tür & Lese-Marker) + Pstate-Whitelist-Fix

**Basis:** `origin/main` @ `681a003` (S91 gemergt) · **Kern-Hash nach Build:** `e33a7729b111ff64`
**Quelle/Anlass:** Designnotiz v1.1 / D-B, nach dem Sparring: Die Trend-Erzählung („ihr lest euch besser als zuletzt") wurde **verworfen** — die Werte sind drittrangig; der Wert des Instruments ist die Perspektivenübernahme und der Austausch. Slice 3 spezifiziert die zwei richtigen Verbraucher des Verlaufs, die bisher beide fehlten (`measurements` war nach der Aufdeckung tote Daten): die **Trajektorien-Vertiefung** (Grammatik 4 — Tür, nie Aussage; Eigenleistungs-Attribution) und die **Marker-Regel „wiederkehrend schwache Lese-Richtung"** (Muster statt Schwellenwert; Vorzeichen-Bias; Brücke zum Empathie-Auftrag im Einzelkanal).
**Patch:** `patch-s92-verlauf-trajektorie-lesemarker.mjs`

## T0 · Nebenbefund-Fix: Pstate-Whitelist (echter Plattform-Bug)

Beim Erkunden gefunden: `PSTATE_FELDER` im Worker kannte nur `timeline`/`selfDisclosures` — die App nutzt aber auch **`merkposten`** (S44) und **`language`**. Auf Pages liefen beide ins **404**; Lesen war durch `.catch(() => null)` still maskiert: **Merkposten und persönliche UI-Sprache funktionierten nur im Artefakt, nie auf der Cloudflare-Plattform.** Kein Workertest deckte es. Fix: Whitelist um `merkposten`, `language` und das neue `leseMarker` erweitert; Regressionstest `tests/worker/pstate-felder.spec.js` prüft den Round-Trip **jedes von der App genutzten Feldes**, die Rollen-Isolation (Annas Merkposten/Marker erreichen Bernd nicht) und dass unbekannte Felder 404 bleiben.

## T1 · Kernfunktionen (`prozess.js`)

- `formatiereVerlauf(mr, nameA, nameB, k=3)` — letzte k **aufgedeckte** Runden; je Zeile Datum, beide Nähe-Werte, Lese-Abstand **je Richtung** (nie verrechnet); Kopf `mk.prozessVerlauf` trägt die Regeln (Tür statt Feststellung, Fortschritt gehört dem Paar, kein Aggregat/Score, Richtungen nie gegeneinander). `null` ohne Verlauf.
- `pruefeLeserichtung(mr, role)` — Richtung *role→Partner* (eigene Zweitschätzung vs. Partner-Nähe) über die letzten `fenster=3` aufgedeckten Runden: **„distanz"** (dreimal in Folge ≥ `deutlich=3`) vor **Vorzeichen-Bias** („ueberschaetzt" = Not wird überlesen · „unterschaetzt" = Distanz lesen, wo keine ist). Rückgabe `{muster, schluessel, ids}` — der Schlüssel (Muster + Runden-IDs) macht das Angebot **einmalig je Musterlage**. Konstanten `LESE_MUSTER` exportiert (kalibrierbare Startwerte, Slice 3).
- `formatiereLeseMarker(befund, me, partner)` — Solo-Kontext-Block; der Kopf (`sk.leseMarkerKopf`) trägt die Umgangsregeln wörtlich.

## T2 · Trajektorien-Tür (Qualitätszeit)

Momentkontext führt den MESS-VERLAUF **nur zusammen mit einer bereiten Runde** (Guard in `baueMomentKontext` — die Vertiefung gehört zur frischen Aufdeckung, kein kaltes Historien-Öffnen); der S89b-Nachtrag führt ihn identisch mit. `momentPrompt` (de+en): Trajektorien-Vertiefung als **Angebot nach der Aufdeckung**, kanonische Türform („Was steckt da drin? Was habt ihr verändern und entwickeln können?"), Fortschritt gehört dem Paar — nie dem System —, kein Mittelwert/Score, Richtungen nie gegeneinander, das Paar wählt.

## T3 · Lese-Marker im Einzelkanal (merken statt melden)

Solo-Start lädt `measurements` + `pstate.leseMarker`; feuert `pruefeLeserichtung` für die **eigene** Rolle mit **neuem** Schlüssel, geht der formatierte Marker-Block in den Solo-Kontext und der Schlüssel nach `pstate` (einmal je Musterlage; verschiebt sich das Fenster durch eine neue aufgedeckte Runde, entsteht ein neuer Schlüssel und darf erneut feuern). `reflexionsPrompt` (de+en): **anlassgebunden** (nie Eröffnung oder Tagesordnung), höchstens einmal, Angebots-Grammatik ohne Vorwurf („magst du schauen, was du da vielleicht überliest?"), Brücke zum **Empathie-Auftrag als Einladung** (Fokus-Leitlinie: ohne freien Platz nur vormerken), Themenwechsel gilt unkommentiert.

## T4 · Eval — MRV-03/04 (de+en, Katalog 25 → 27)

**MRV-03** (moment): Trajektorie als **Frage-Tür** statt Feststellung; Fortschritt dem **Paar** attribuiert (nie System/App); kein Aggregat/Kurven-Urteil; kein Richtungs-Ranking. **MRV-04** (solo, Marker „ueberschaetzt" im Kontext; die Eingaben liefern den Anlass — Bernds Ratlosigkeit — und den Themenwechsel): anlassgebundenes Aufgreifen, Einladungs-Grammatik ohne Vorwurf, Empathie-Auftrag als Angebot, Themenwechsel ohne Rückholversuch, kein Leistungsgefälle-Framing.

## Tests

**Neu:** `tests/unit/s92-verlauf-lesemarker.spec.js` — 9 Tests: Verlaufsformat (Abstände je Richtung, k-Begrenzung, nur revealed, Datenzeilen ohne Verrechnetes, `null` leer); Muster (Bias über/unter, Distanz schlägt Bias, gemischte Vorzeichen/Punktlandung/zu wenige Runden ⇒ kein Muster, Richtungs-Trennung, Schlüsselform); Momentkontext nur mit bereiter Runde (je frischem Chat); Nachtrag führt Verlauf mit; Solo-Einspielung einmal je Schlüssel, neue Musterlage feuert im frischen Chat erneut, Gegenrolle bleibt markerfrei.
**Neu:** `tests/worker/pstate-felder.spec.js` — 3 Tests (T0, s. o.).
**Angepasst:** `eval-runner.spec.js` (Zähler 25 → 27). Bestand unverändert grün, inkl. aller S89/S91-Suiten.

## Verifikation

- Voller Testlauf **grün**: **1172 Tests / 141 Dateien** (Basis 1160 + 12 neue)
- Build: `npm run build` · Kern-Hash `e33a7729b111ff64`
- Korpus-Parität de/en grün; Katalog-Wohlgeformtheit grün
- Patch auf frischem Klon (`681a003`): dry-run → apply → Idempotenz → Byte-Vergleich → Tests → Build

## Eval-Kadenz (S66)

- [x] **Prompts berührt** (`momentPrompt`, `reflexionsPrompt`, Korpus) → lokaler Lauf fällig: `npm run eval -- --familie MRV` (jetzt 01–04) + Solo-Bestandsfamilien gegenfahren; Sandbox ohne API-Zugang — bitte vor/mit dem Merge
- [x] Szenarien-Katalog berührt → additiv (+MRV-03/04 de+en)
- [ ] Judge berührt → nein · UI-Screens berührt → nein (nur Kontexte)
- [ ] Release-Gate → nicht Teil dieses Sprints

## Notizen

- **Deploy-Hinweis:** Worker-Änderung (T0-Whitelist) — nach dem Merge Build + Deploy aus `dist/cloudflare/`; danach funktionieren Merkposten und persönliche Sprachwahl erstmals auch auf Pages.
- Bewusst NICHT gebaut: jede Verlaufs-**Anzeige** (Kurven, Zahlen-UI) — „erzählt statt geplottet" bleibt; Rohdaten-Einsicht auf Wunsch (Slice-3-Regel 5) wäre ein eigener, kleiner UI-Sprint, falls je gewünscht.
- D-B ist damit **abgeschlossen**; offen aus der Designnotiz bleibt nur der I13-Wächter-Rest (nach MRV-Messläufen).

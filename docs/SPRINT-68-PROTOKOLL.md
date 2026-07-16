# Sprint S68 — Szenen anspringen: robust, schnell, mit klarem Feedback

**Basis:** `origin/main` @ `cf49392` (patch-s67-selbstfahrt-e2e), 761 Tests grün
**Ergebnis (Iteration 2):** **772 Tests grün** (661 Struktur · 20 Engine/Mock · 87 Worker · 4 E2E) · Kern-Hash **`1acb7dc872bbf5db`** (unverändert — kein `core/`-Eingriff)
**Anlass:** Nutzerbefund — erster Klick „nichts", zweiter Klick Meldung ohne sichtbare Änderung, echter Neustand erst nach weiterem Klick. **Feld-Befund zur Iteration 1:** „Anwendung lädt neu, aber Stand ist leer" (Szene freigaben-da).
**Patch:** `patch-s68-szenen-robustheit.mjs` (enthält beide Iterationen)

## Diagnose (fünf Ursachen über zwei Iterationen, alle im Code verifiziert)

**U1 · Kein Feedback, keine Sperre.** `wende()` lief sekundenlang (jeder `window.storage`-Call ein eigener, **sequenzieller** Sandbox-RPC; die Betrieb-Szene hat Dutzende Keys), Buttons blieben aktiv, keine Meldung — der erste Klick wirkte wie ins Leere.

**U2 · Nebenläufigkeits-Race.** Der zweite Klick startete ein ZWEITES `wende` parallel zum ersten: zwei wipe/set-Läufe verzahnten sich, zwei Reboots feuerten zeitversetzt — daher „shaky" und der verspätete Voll-Reload, der sich anfühlte wie „vom nächsten Klick ausgelöst".

**U3 · Tote Quittungs-Annahme + unsichtbarer Erfolg.** Die S60-Quittung nahm an, der Reboot baue das Panel neu — seit der pbMain/pbDevHost-Trennung stimmt das nicht mehr. Zudem landet der Reboot auf der **optisch identischen Rollenwahl**: der neue Stand IST da, sichtbar wird er aber erst mit der Rollenwahl — daher „Meldung da, System unverändert".

**U4 · Stumm verlorene Writes (Feld-Befund nach Iteration 1).** Die U1-Kur — unbegrenzte `Promise.all`-Parallelisierung — feuerte einen Burst von Dutzenden Storage-RPCs; die Sandbox drosselt, `ArtifactStore.set/del` melden Fehler still als `false`, niemand prüfte: wipe kam durch, ein Teil der Writes nicht ⇒ **Quittung „eingespielt", Stand leer.** Deterministisch nachgestellt in `dev-panel-robust.spec.js` (Drossel-Fake mit Parallelitäts-Limit + transienten Fehlern).

**U5 · Quittung ohne Verifikation.** Erfolg wurde gemeldet, ohne den Stand zurückzulesen — der falsch-positive Kern des Feld-Befunds.

## Änderungen (`platforms/artifact/dev-panel.js`)

**B1 · Ein Aktions-Helfer `fuehreAus` für alle Zustands-Wege** (Szenen, „Zustand laden", „Alles zurücksetzen"): Guard-Flag (laufende Aktion ⇒ weitere Klicks ignoriert), alle Aktions-Knöpfe gesperrt, **Sofort-Meldung** „… wird eingespielt …", dann `await wende` → `await reboot` → Erfolgsmeldung **mit Handlungsanweisung**: „… eingespielt — Rolle wählen, um den neuen Stand zu betreten." (ohne Meta: „— die Einrichtung erscheint."). Fehlerpfad: rote Meldung, kein Reboot, Knöpfe wieder frei. Die Quittungs-Weiche entfällt im Helfer — `msg()` läuft über den Host-Knoten und erreicht auch ein neu gebautes Panel; der bestehende S60-Test besteht unverändert.

**B2 · Parallelisierung, gezähmt (Iteration 2):** statt unbegrenztem `Promise.all` eine robuste Storage-Schicht — `inWellen` (Parallelität 4, 30 ms Atempause zwischen Wellen), `mussSet`/`mussDel` (bis zu 4 Versuche mit Backoff 80/250/600 ms, **Fehlerwurf statt stillem false**). `wipeZustand`, `setzeZustand`, `ladeZustand` laufen darüber; `dumpZustand` bleibt parallel lesend. Schnell genug gegen U1, drosselfest gegen U4.

**B3 · Verifikation vor der Quittung (U5):** `pruefeEingespielt` liest nach dem Einspielen die Key-Mengen beider Welten und das Meta zurück und **wirft bei Lücken** — die Erfolgsmeldung kann nicht mehr lügen; der Fehlerpfad zeigt stattdessen rot „… fehlgeschlagen: Einspielen unvollständig …".

## Tests

**Neu (It. 1):** `tests/unit/szenen-robustheit.spec.js` — 6 Tests: Sofort-Feedback + Sperre (U1); Doppel-/Dreifachklick ⇒ genau 1× wende, genau 1 Reboot (U2); Erfolgsmeldung erst NACH Reboot, mit „Rolle wählen" bzw. „Einrichtung erscheint" (U3/U3b); Fehlerpfad ohne Reboot; Parallelitäts-Beweis (In-Flight > 1).
**Neu (It. 2):** `tests/unit/dev-panel-robust.spec.js` — 5 Tests am Drossel-Fake (Parallelitäts-Limit 4 + transiente Fehler je Key): Szene „betrieb" übersteht Rate-Limits vollständig und verifiziert; Schreibwellen überschreiten die Sandbox-Parallelität nie; `pruefeEingespielt` entlarvt exakt den Feld-Befund (Teil-Stand); dauerhaft stilles set-Scheitern ⇒ rote Meldung, kein Reboot, keine Erfolgs-Quittung; Dump→Wipe→Laden-Roundtrip unter Drossel.
**Semantisch treu angepasst:** `dev-panel.spec.js` + `s60-mockdaten.spec.js` (klick-Helfer pollt bis das Panel wieder frei ist — die Härtung hat legitime Wartetakte); `szenen-robustheit.spec.js` (U3-Pin `tick(5)` → Polling); `s59-linearer-pfad.spec.js` (Minimal-Stub erfüllt jetzt den ArtifactStore-Vertrag: `set → true`, `list/get` sehen Geschriebenes — die gehärtete Schicht wiederholt scheinbar fehlgeschlagene Writes und verifiziert den Stand).

## Verifikation

- Voller Testlauf **grün**: 661 + 20 + 87 + 4 = **772 Tests** · Coverage 76,2 / 67,2 (über den Schwellen)
- Selbstfahrt/Journey 2 (nutzt `SZENEN.wende`) unverändert grün — Verhalten identisch, nur schneller
- `npm run build` · Kern-Hash `1acb7dc872bbf5db`
- Patch auf frischem Klon: dry-run → apply → Idempotenz → Byte-Vergleich → Tests → Build ✓

## Warum es sich anfühlte wie beschrieben (Symptom → Ursache)

| Dein Erleben | Ursache |
|---|---|
| „erster Klick: gar nichts" | U1 (sekundenlanger Lauf ohne Feedback) + U3 (Reboot landet auf optisch identischer Rollenwahl) |
| „zweiter Klick: Meldung, System unverändert" | U2 (zweiter Lauf parallel) + U3 |
| „später lädt alles neu, dann ist der Stand da" | der verspätete zweite Reboot aus U2 |
| „Anwendung lädt neu, aber Stand ist LEER" | U4/U5: wipe durch, Writes im Drossel-Burst verloren, Quittung ungeprüft |

## Hinweis zur Bedienung

Der Ablauf ist jetzt: Klick → sofort „wird eingespielt …" (Knöpfe gesperrt) → kurzer Moment → „eingespielt — **Rolle wählen**, um den neuen Stand zu betreten." Die Rollenwahl sieht bewusst aus wie vorher — der neue Stand liegt dahinter.

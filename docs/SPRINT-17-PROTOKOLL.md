# Sprint 17 — Protokoll · Entwickler-Panel: Zustände sichern, Mockdaten, Szenen anspringen

**Datum:** 2. Juli 2026 · **Stand:** 245 Tests grün (Ebene 1: 192 · Engine: 12 · Worker: 41) · Kern-Hash `1d8cc3f8abc1d7d2` (Panel liegt in der Artefakt-Hülle, nicht im Kern)

## Was es ist

Aufklappbares **Entwickler-Panel unter dem eigentlichen Interface** der Artefakt-Umgebung (`platforms/artifact/dev-panel.js`, gemountet in main.js; das Layout hat jetzt zwei feste Bereiche — App oben, Panel dauerhaft darunter, es überlebt jeden App-Reboot). Nur die Dev-Hülle; Kern und Cloudflare-Form unberührt.

## Funktionen

**Zustand speichern/laden:** `dumpZustand` sichert Meta + sämtliche Repo-Keys **beider Speicherwelten** (geteilt/privat) als versioniertes JSON — Download plus Textfeld. `ladeZustand` prüft die Dump-Version, wischt den Dev-Namensraum und stellt exakt die gesicherten Keys wieder her; ungültige Dumps werden abgewiesen, ohne den Bestand anzufassen. Dazu „Alles zurücksetzen" (wipe inkl. Meta → Onboarding).

**Mockdaten:** `baueMockdaten()` — kohärentes Paar Anna/Bernd im Vollausbau: aktiver gemeinsamer Auftrag AG1 (mit Startwerten, beidseitig bestätigt) + individueller AI2, ungelesener Regal-Eintrag, offener Agenda-Punkt (herkunft regal), früherer Moment mit Zwischenzeit-Impuls, aufgedeckte Messrunde, QZ-Wahl, vollständiger Befund, beide Kernwetten-Übergaben, je Rolle Zeitleiste/Generalprobe. Objekte tragen `_schema`/`module` wie echte Repo-Writes.

**Szenen (anspringbare Workflow-Abschnitte):**
| Szene | Zustand |
|---|---|
| Onboarding · Start | alles leer → Einrichtungs-Dialog |
| Onboarding · abgeschlossen, leer | nur Meta — direkt nach „Loslegen" |
| Auftragsklärung · beide Freigaben liegen vor | beide Übergaben gequert, Betrieb leer → gemeinsame Klärung steht an |
| Betrieb · Vollausbau | kompletter Mockdaten-Satz |
| Regal · Fassung wartet ungelesen | Pull-Prinzip erlebbar (als Bernd einsteigen) |
| Prozessreflexion · Aufdecken bereit | Runde `bereit` mit beiden verdeckten Beiträgen → nächster Moment deckt auf |
| Qualitätszeit · Stufe 2 | letzte Wahl >4 Wochen → Gründe-Frage |

Jeder Szenen-Knopf setzt den Zustand und bootet die App neu (Rollenwahl erscheint — Rolle bleibt bewusst deine Wahl, weil viele Szenen aus beiden Perspektiven interessant sind).

## Tests (+9, `tests/unit/dev-panel.spec.js`)

Dump→Wipe→Laden-**Roundtrip** exakt, inkl. Welt-Trennung (pstate privat, nie geteilt) und Lesbarkeit über die echten Bausteine · ungültiger Dump abgewiesen ohne Bestandsschaden · Szenen geprüft über echte Bstate/Repo/qzStufe-Logik (frisch/onboarding/freigaben/aufdecken-bereit mit genau einer bereiten Runde/QZ ergibt real Stufe 2 vs. 1/regal-ungelesen) · Panel-UI-Drehbuch (Szene→Reboot, Speichern füllt Textfeld, Wipe, Laden stellt her) · kaputtes Textfeld: Fehlermeldung, kein Reboot, Bestand unangetastet.

## Auslieferung

`apply-paarbegleitung-devpanel-patch.mjs` — zwei neue Dateien (base64) + drei anker-basierte Eingriffe in main.js; verifiziert (Trockenlauf, Byte-Abgleich aller drei Dateien, Idempotenz). Nebenbefund intern: Die Patch-Erzeugung selbst hatte einen re.sub-Escaping-Fehler, der beim Verifikationslauf sofort aufflog und behoben wurde — genau wofür der Verifikationsschritt da ist.

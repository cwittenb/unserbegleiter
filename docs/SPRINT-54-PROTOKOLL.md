# Sprint S54 — Protokoll: Wegweiser-Priorisierung (Deckel DREI)

**Basis:** `origin/main` @ `0f079c1` (patch-s52-judge-provider…) **PLUS
patch-s53-einzel-wiedereinstieg-vorraum (unmerged Vorgänger — zuerst anwenden!)**
**Ergebnis:** 614 Tests grün (74 Dateien) · Build-Kern-Hash `0f0d0f054df29f78`

## Umfang (Design D1–D4, freigegeben inkl. a/b/c + Start-Balance)

EINE Rangliste pro Vorraum statt der Kategorien Hinweise/Optionen:
`wegKandidaten()` liefert Kandidaten mit **Stufe** und **Bereich**,
`waehleWegzeilen()` sortiert stabil nach Stufe und deckelt auf **DREI Zeilen
über alles** (Titelzeile „Wegweiser" im gemeinsamen Raum zählt nicht mit).

Stufen: **1** Begonnenes fortsetzen (`einzelPause`, `momentOffen`) ·
**2** roter Faden Klärung→Auflösung (`startAuftrag`/`optAuftragEuch`,
Auflösungs-Zeile, `messBereit`) · **3** Neues/Offenes (`regalNeu`,
`agendaOffen`, `messOffen` — gemäß Antwort b) · **4** freie Sessions &
Stöbern (`startSolo`/`soloErster`, `optQz`/`optQzTeil`, `optRueckblick*`,
`optRegalTeil`).

**Invariante:** Stufe 4 füllt nur auf und verdrängt nie Stufe 1–3.
**Start-Balance (neuer Constraint, einzige Ausnahme der Invariante):** Auf dem
Startscreen steht mindestens eine Zeile je Bereich mein/gemeinsam; fehlt ein
Bereich, weicht die niedrigst priorisierte der drei Zeilen seiner besten Zeile.

**Verschmolzene Doppelungen (D2):** „Freigaben bereit" + Auflösungs-Einladung
= EINE Aktionszeile `weg.aufloesungStart` bzw. `…MitAufdeck` (die s43-geprüften
Substrings „Startet eure Gemeinsame Auflösung" / „beginnt mit der Auflösung
eurer Rate-Runde" bleiben wörtlich erhalten). Die stehende Regal-Einladung
`optRegalTeil` erscheint nur noch bei `regalNeu == 0`.

## i18n
Neu: `weg.aufloesungStart`, `weg.aufloesungStartMitAufdeck` (de/en).
Entfallen: `weg.aufloesungBereit`, `weg.optAufloesung`,
`weg.optAufloesungMitAufdeck` (de/en).

## Testanpassung (semantisch)
`tests/unit/s35-nutzerfuehrung.spec.js`: Erwartung „Auflösung kann starten"
(alter `aufloesungBereit`-Text) → verschmolzene Aktionszeile („Freigaben
liegen bereit" + „Startet eure Gemeinsame Auflösung"). Kernaussage (mit beiden
Freigaben ist die Auflösung startklar) unverändert. s41/s43/s36 laufen ohne
Anpassung, da die Options-Substrings erhalten blieben.

## Neue Tests
`tests/unit/s54-wegweiser-prio.spec.js` (9 Tests): Deckel DREI in Volllage
(gemeinsamer Raum + Start), Stufen-Invariante, ruhige Lage füllt mit Stufe 4,
Start-Balance in beide Richtungen, genau EINE Auflösungs-Zeile, Regal-Zähler
verdrängt Regal-Einladung (und umgekehrt), Mein Raum dreizeilig.

## Geänderte Dateien
`core/i18n/de.js`, `core/i18n/en.js`, `core/ui/app.js`,
`tests/unit/s35-nutzerfuehrung.spec.js`, `docs/wegweiser-inventar.md` (v2);
neu: `tests/unit/s54-wegweiser-prio.spec.js`, `docs/SPRINT-54-PROTOKOLL.md`.

## Verifikation
Frischer Clone @ `0f079c1` → patch-s53 (Vorgänger) → patch-s54: je dry-run →
apply → Idempotenz → Byte-Vergleich → `npx vitest run` (614 grün) →
`npm run build` (Kern `0f0d0f054df29f78`).

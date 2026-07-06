# Sprint 29 — Protokoll · Design in die App (gegen dein echtes Repo verifiziert)

**Datum:** 6. Juli 2026 · **Basis:** dein `origin/main` (`afcb554`) + S25 + S26 + S27 · **310 Tests grün** · **Kern-Hash: `266c889d65556a38`** (dein echter Hash)

## Wichtig vorweg: Divergenz aufgelöst

Mein früherer Arbeitsstand (und damit das `neubau-v1`-Zip und die ganze `app.js` aus dem ersten S29-Versuch) lag hinter deinem Repo zurück — ihm fehlten die Aufdeck-Runde, Resume, das Kapitel-Marken-System und die Übergänge. **Zip und Voll-`app.js` bitte NICHT verwenden.** Dieser Patch wurde gegen dein echtes, geklontes Repo gebaut und verifiziert.

## S28 verwerfen

`patch-s28-kapitel.mjs` **nicht anwenden**. Dein `einzelSys` hat die Kapitel bereits als vollständiges System (`[[KAPITEL-1..3]]`-Marken, App-seitiges Pause-oder-weiter, `[Weiter mit Kapitel N.]`-Wiedereinstieg, Drei-Schritt-Übergänge) — meiner S28 wollte das mit Prosa nachbauen und würde nur kollidieren.

## Was S29 macht (nur `core/ui/app.js`)

Rührt ausschließlich `core/ui/app.js` an — Aufdeck-Runde, Resume, Kapitel-System bleiben unberührt.

- **Neuer `<style>`:** zwei Themes über `html[data-theme]` — **hell** (Creme-Salbei-Pastell, Mischwald) und **dunkel** (Wasser-Grün, sehr große weiße Seerosen). Newsreader-Serife durchgängig, luftig, milchig-transparente Karten. Alle Bausteine (Karten, Buttons, Chat-Blasen, Composer, Skala, Items, Fehler) auf CSS-Variablen umgestellt.
- **Kulisse** als fixe Ebene hinter dem Inhalt: `pbTanne`/`pbLaub` (Nadel- und Laubbäume, höchster über 2/3 der Höhe) im hellen, `pbPad`/`pbRose` (Blätter + mehrlagige weiße Blüten nach Foto-Vorlage) im dunklen Layout.
- **Theme-Umschalter** oben rechts + `pbTheme()`-Logik, Default hell.

## Auslieferung & Verifikation

`patch-s29-design.mjs` — 3 Anker-Edits, nur `core/ui/app.js`. Verifiziert gegen eine frische Replikation deines Repos (`git clone` + S25 + S26 + S27): Trockenlauf 3/3, Byte-Abgleich identisch mit dem transplantierten Stand, Idempotenz 0 Fehler, 310 Tests grün, Build → `266c889d65556a38`.

## Stand deiner Kette

S25 · S26 (korrigiert) · S27 · **S29** — alle gegen dein echtes Repo geprüft, 310 Tests grün. S28 entfällt. Prüfe bei dir künftig mit `npm test` (grün) und optional dem Hash `266c889d65556a38` nach S29.

# Sprint D7 — Landing Page (Apex raumzuzweit.de)

**Design-Track D7** (Basis: D6; Design Turn 11a/12a) · Kette: … → patch-d6 → **patch-d7**

## Ziel

Eine statische, self-contained Landing als eigenes Build-Artefakt — getrennt vom App-Deploy (app.raumzuzweit.de).

## Umsetzung

1. **`platforms/cloudflare/landing/index.html`**: Hero als Zweiteilung (mobil gestapelt, ab 900px vertikale Naht), „Nur auf Einladung"-Badge auf der Naht, Baum-Kulisse, Zyklus-Sektion (5 Stationen + Qualitätszeit-Hinweis), Regel-Sektion (3 große Serif-Zeilen auf Regal-Ton), Signup-Sektion auf Tiefgrün, Footer (Impressum/Datenschutz/Kontakt — Ziele noch offen). Inline-CSS, hell/dunkel via `prefers-color-scheme`, beide Schriften.
2. **Texte = Copy-VORSCHLAG** wortgetreu aus dem Handoff (K2) — das Textreview folgt; nichts davon berührt App-i18n.
3. **Signup nur Oberfläche (K6)**: kein `fetch`, kein `action` — Submit zeigt eine stille Notiz. Der Backend-Teil (Speicherung, Double-Opt-in, Worker-Route) kommt als eigener Sprint.
4. **Build**: `buildPages` kopiert die Landing nach `dist/cloudflare/landing/index.html` — bewusst NICHT unter `public/`, damit die Deploy-Ziele getrennt bleiben.

## Offene Punkte (vorgemerkt)

Signup-Backend (eigener Sprint, K6) · Impressum-/Datenschutz-Seiten (Rechtstexte: Fachreview lt. Backlog) · EN-Fassung der Landing · Copy-Review (K2).

## Tests

Neu: `tests/unit/d7-landing.spec.js` (4): Artefakt entsteht getrennt, Schnitt-Marker, Handoff-Wortlaut, Signup ohne Netz-Aufruf. Volle Suite grün (1217). Build: Kern-Hash unverändert gegenüber D6 (Landing liegt außerhalb des Kerns).

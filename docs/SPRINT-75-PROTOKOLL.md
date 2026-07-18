# Sprint 75 — Wissenslinse „Entwicklungsraum" (nach P. Schellenbaum)

**Basis:** `origin/main` @ `70403a9` (patch-s74-sessionende-und-konsens)
**Patch:** `patch-s75-wissenslinse-entwicklungsraum.mjs`
**Kern-Hash nach Sprint:** `1d4def58e2ff6ef4`
**Tests:** 906 grün in 110 Dateien (858 Bestand + 48 neu)

*Hinweis zur Nummerierung: Der Sprint wurde als S74 geplant; während der
Umsetzung wanderte `main` von `c091633` auf `70403a9` (dort belegt
„patch-s74-sessionende-und-konsens" die Nummer 74). Der Sprint wurde auf
die neue Basis rebased und als S75 geführt; der SHA-Anker-Check des
Patches hat die Basis-Verschiebung korrekt erkannt und ein Überschreiben
verhindert.*

---

## Ziel

Erweiterung des therapeutischen Syllabus um Peter Schellenbaum (insb. *Das
Ja und das Nein in der Liebe*): Partnerschaft als gegenseitiger
Entwicklungsraum — als dritte explizit lizenzierte Wissenslinse neben der
IFS-informierten Anteile-Perspektive und Klein (S40). Prüfauftrag Cars10:
Widerspruchsfreiheit zu den bestehenden Ansätzen; eindeutige Linie, die
Ansätze müssen sich ergänzen.

## Entscheidungen (Cars10, Planfreigabe)

- **a)** Einbau in **alle vier Räume** (Klärung, Auflösung,
  Qualitätszeit/`momentPrompt`, Reflexion) — analog `anteileSprache`.
- **b)** Haltungs-Charta ins Repo überführt: `docs/haltungs-charta.md`
  (v0.3) ist ab jetzt SSOT.
- **c)** Kondensat freigegeben; zusätzliche Konsistenzprüfung
  durchgeführt (s. u.).

## Konsistenzprüfung (Ergebnis)

Kein Widerspruch zu den bestehenden Linsen, aber vier Reibungsflächen,
die eine explizite Vorrangregel brauchen — verankert als Regel (7)
VORRANG & ABGRENZUNG im Baustein und als Vorrangkette in der Charta:

> **Sicherheit → Stabilität → Kontakt → Deutung.**

1. **Sorgen-Weiche:** Erlebens-Qualität („einengend") → Linse möglich;
   konkrete Kontroll-/Bestrafungs-**Muster** → ausschließlich
   Sicherheitslogik, keine Entwicklungsraum-Hypothese.
2. **Ehrliches Mitteilen:** nie als erste Antwort auf EM (Kontakt vor
   Analyse, Nicht-Umdeutungs-Regel).
3. **Reaktionstypen / Invariante 4:** nur im regulierten Zustand.
4. **Prozessarbeits-Verbot:** keine biografische Herkunfts-Erkundung; die
   Einladung bleibt im Heute.

Ergänzungen (SSOT-diszipliniert): Lösungsversuch-Rahmung bleibt allein im
`haltungsKern` (kanarienfest); Defizit→Ziel-Prinzip = „Ressource statt
Bedrohung"; Fremd-Deutungs-Verbot = Querungslogik; Anteile-Sprache
komplementär (Berührung darf als Anteil weiter angeschaut werden, aber nie
beide Rahmungen in derselben Nachricht).

## Änderungen

1. **`core/prompts/prompts.de.js` / `.en.js`:** neuer Baustein
   `entwicklungsRaum` (de/en-Paritäts-Kondensat, 8 Regeln inkl. Vorrang &
   Abgrenzung); Verdrahtung in `klaerungsPrompt`, `aufloesungsPrompt`,
   `momentPrompt`, `reflexionsPrompt` (je 4 Einbaustellen pro Sprache).
2. **`tests/unit/entwicklungsraum-schellenbaum.spec.js`** (neu): 48 Tests —
   17 Kanarien-Pins je Sprache, Verdrahtungs-Assertions (alle vier Räume),
   Konsistenz-Wächter (Anteile-Sprache bleibt erhalten;
   Lösungsversuch-Formel nicht dupliziert).
3. **`docs/designnotiz-wissenslinse-entwicklungsraum.md`** (neu):
   Verortung, Kern der Linse, vollständige Konsistenzanalyse,
   Kanarien-Pins, Eval-Kandidaten ENT-01–04, Sprachregelung; Anhang A =
   kuratiertes Referenz-Destillat (Theorie + KI-Leitlinien, Cars10).
4. **`docs/haltungs-charta.md`** (neu im Repo, v0.3): Repo-Überführung als
   SSOT; Wissensrahmen nachgeführt (S40-Linsen) und erweitert
   (Entwicklungsraum-Linse, Vorrangkette, Blick-Erweiterung als
   Sprach-Grammatik 6, Hausvokabular + „Entwicklungsraum").

## Verifikation

- Frischer Klon `origin/main` @ `70403a9`; Patch: dry-run → apply →
  Idempotenz-Lauf (no-op) → Byte-Vergleich gegen Referenzstand.
- `npx vitest run`: 906/906 grün (110 Dateien).
- `npm run build`: Artefakt + Cloudflare-Build + Eval-Artefakt, Kern
  `1d4def58e2ff6ef4`.

## Eval-Nachlauf (Backlog)

ENT-01 (Hypothesen-Disziplin) · ENT-02 (kein Schuld-Flip) · ENT-03
(Sicherheits-Sperre) · ENT-04 (gemeinsamer Raum, Fremd-Deutung) — Details
in der Designnotiz, Abschnitt 5.

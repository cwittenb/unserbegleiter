# Sprint S69 — Sektions-Überschriften: „Euer gemeinsamer Boden“ · „Mein Weg“ (Light-Lane)

**Basis:** `origin/main` @ `259ddae` (patch-s68b-erfolg-per-ruecklesen)
**Anlass:** Nutzerwunsch — positivere Rahmung der beiden Gruppen-Überschriften; die alte Fassung definierte die Sektion über eine Abwesenheit („… ansehen, ohne etwas zu beginnen“).
**Patch:** `patch-s69-boden-und-weg.mjs` · **Lane:** Light (reine i18n-Chrome-Änderung, keine Logik)

## Änderungen (`core/i18n/de.js`, `core/i18n/en.js`)

| Schlüssel | vorher (DE / EN) | nachher (DE / EN) |
|---|---|---|
| `teil.gruppeRegale` | „Regale — ansehen, ohne etwas zu beginnen“ / „Shelves — browse without starting anything“ | „Euer gemeinsamer Boden“ / „Your common ground“ |
| `mein.gruppeRegale` | „Regale“ / „Shelves“ | „Mein Weg“ / „My path“ |

Analogie: gemeinsamer Raum = *Ort* (Boden, „euer“), privater Raum = *Pfad* (Weg, „mein“, von Natur aus zeitlich → passt auf die Zeitleiste, ohne den Ort-Begriff zu doppeln). Der bisher flache Container-Titel im privaten Raum verschwindet als Etikett; die Zeitleiste selbst bleibt unberührt.

## Entscheidungen

- „Regal“ bleibt Item-/Mechanik-Begriff (`teil.regal` = „Geteiltes“, `gate.weg.regal`, `regal.*`, `weg.regalNeu`) — nur die Gruppen-Dächer wurden umbenannt. Löst nebenbei die Kollision Gruppe „Regale“ ⊃ Regal-Button.
- Verbliebene sichtbare „Regale“-Erwähnungen (`teil.intro`, `weg.optRegalTeil`) bewusst unangetastet — Harmonisierung wäre eine separate Copy-Entscheidung.

## Verifikation (Light-Lane)

- `npx vitest run tests/unit/i18n-woerterbuecher.spec.js tests/unit/s69-boden-ueberschrift.spec.js` → **grün** (Paritätstest + gezielte Assertions; ~0,5 s)
- Patch idempotent (zweiter Lauf: übersprungen); `--dry-run` schreibt nicht; Basis-Anker je Datei geprüft.
- Bewusst KEIN Voll-Suite-Lauf / Build / Kern-Hash (Light-Lane). Der Kern-Hash aktualisiert sich beim nächsten `npm run build` von selbst.

## Offene Punkte

- `teil.intro` / `weg.optRegalTeil`: „Regale“-Wortlaut ggf. an „Boden“ angleichen (Folge-Light-Lane, bei Bedarf).
- Wire-Anglisierung (S31) unberührt.

# Sprintprotokoll · MOD-3b — korpusTexte nach Empfänger, tote Revisionstexte fort

**Basis:** `main` nach Merge `mod-5` (`f7d902e`)
**Kette:** … → MOD-3 → MOD-5 → **MOD-3b**
**Branch:** `mod-3b` → Merge nach `main`
**Endstand:** **2722 / 187 / 26 / 4 grün** (+7), `npm run build` grün
**Kern-Hash:** `6026f7e2ff9643c6`
**Entscheidungen:** E4 a (trennen und benennen, kein Umzug nach i18n), F8 a (Revisionstexte entfernen, Kanarie)

---

## 0 · Befund, der E4 geändert hat

E4 ging von „`korpusTexte` sind UI-Strings“ aus. Gezählt: 87 Schlüssel, davon **59 Modell-Kontext** (mk.*, sk.*, qm.*, ak.*, mess.*, regler.*, startwerte.*, aufdeckk.*, klaerung.*, rank.*.kopf — die Kontext-Bauer in `sessions.js`, `prozess.js`, `kernwetten.js`) und **28 Oberfläche** (titel.*, scale.*, choice.*, rank.*.titel/desc, rank.howto). Die 28 werden von der App gerendert, aber **in der Paarsprache** über `K()` — eine bewusste Entscheidung (app.js:2091 „Beschriftung aus korpusTexte (Paarsprache)“). `core/i18n` ist die UI-Sprache (`t()`). Ein Umzug hätte die Sprachlogik gebrochen. Deshalb E4 a.

## 1 · Was geändert wurde

| Datei | Änderung |
|---|---|
| `core/korpus/{de,en}/steuer.js` | `korpusTexte` → `kontextTexte` (59, ans Modell) + `oberflaechenTexte` (28, App in Paarsprache); `korpusTexte` bleibt als Fassade mit allen Schlüsseln in alter Reihenfolge (wirft, wenn ein Schlüssel in ≠ 1 Objekt liegt). Sechs `steuerTexte.*Revision` entfernt (DE+EN) — ohne Aufrufer seit S105.3 |
| `tests/unit/mod-korpustexte-empfaenger.spec.js` (neu) | disjunkt/vollständig/Reihenfolge; Trennung folgt dem Empfänger (Regel + Zählung 28/59); DE≡EN; Kanarie: kein `*Revision`-Schlüssel mehr, Engine-Kennungen stehen |
| `s99-3`, `s103` | zwei Tests invertiert: Revisionstexte `toBeUndefined`, Kennungen geprüft |

Alle Werte byte-identisch (Export-Vergleich alt↔neu, Golden unverändert). Kein Aufrufer geändert — `K().korpusTexte[…]` funktioniert weiter; wer neu schreibt, greift auf `kontextTexte`/`oberflaechenTexte` zu.

## 2 · Nicht angefasst, bewusst

- `QZ_STUFEN_TEXT` (DE+EN) hat keinen Aufrufer mehr (nur ein Re-Export in `prozess.js`). Nicht entfernt — nicht gefragt. Kandidat für dieselbe Behandlung wie F8.
- Die Kommentare in `aufdeck-waechter.js:77` und `urteils-waechter.js:87` verweisen noch auf `steuerTexte.aufdeckRevision`/`urteilsRevision` als historische Angabe (S94); sie beschreiben Vergangenheit und bleiben.

## 3 · Nächster Schritt

MOD-2c (F7 a): englische Zweiseitigkeits-Muster, dann MOD-4 (F9 b: `.md` + `slots.js`).

# Sprint S71 — Protokoll: Feinschliff Pause & Wiedereinstieg der Gemeinsamen Auflösung

**Basis:** `origin/main` @ `2465d93` (patch-s70-overload-haertung)
**Patch:** `patch-s71-wiedereinstieg-feinschliff.mjs` (Ganzdatei-Ersetzung, SHA-256-Anker, idempotent, `--dry-run`)
**Testlage nach Sprint:** 814 grün (4 e2e · 20 Engine/Mock · 699 Struktur · 91 Worker/Miniflare) · **Kern-Hash `bf19c0d6a54978f0`**

## Anlass

Vier Befunde aus dem Trockenlauf zur Pause/Wiederkehr der Gemeinsamen Auflösung:

1. **Fortsetzenpause zu feinfühlig.** Schon ein kurzes Verlassen (Sekunden) löste beim
   Wiederbetreten die volle Wiedereinstiegs-Zeremonie aus („beim letzten Mal …" + Ankommens-
   Menü). Für eine echte kurze Unterbrechung wirkt das befremdlich — der Faden war ja nie weg.
2. **Doppeltes Ankommen.** Bei der Rückkehr stellte das Modell eine zusätzliche offene Frage
   („Wie ist es euch seit der Pause ergangen?") **und** legte gleichzeitig das Ankommens-Menü
   vor. Zwei Ankommens-Gesten übereinander; das ablehnbare Menü sollte das Ankommen allein tragen.
3. **Erfundene Zustimmung.** Verließ jemand den Raum ganz am Anfang — bevor das „Ja" zur
   spielerischen Aufdeckung gefallen war — behauptete das Modell bei Rückkehr fälschlich, man
   habe gerade zugestimmt, und wollte „genau dort" weitermachen. Eine Zustimmung, die es nie gab.
4. **Redundanzen im Text.** (a) Der statische CHOICE-Platzhalter „Euer verbindendes Angebot:"
   klebte ohne Leerzeichen am Vorsatz und nahm mit „verbindend" ein Ergebnis vorweg, das das
   System nicht wissen kann; (b) der Wegweiser nannte „im gemeinsamen Raum", obwohl der Kontext
   (der gemeinsame Raum) ohnehin klar ist.

## Gelockte Entscheidungen

- **E1 = a** Fünf-Minuten-Schwelle **generisch** am Wiedereinstiegs-Gate (Einzel *und* Gemeinsam):
  Rückkehr binnen 5 Min läuft nahtlos weiter, erst danach die Zeremonie. Der **NACHKLANG** der
  freigegebenen Auftragsklärung (`einzelRueckkehr`) hängt nicht an dieser Schwelle und bleibt
  unberührt.
- **E2 = a** Steht bei ≥ 5 Min Rückkehr ein Auftakt-/Aufdeck-Konsens noch offen, wird er **sauber
  neu aufgegriffen** statt eine Zustimmung zu erfinden.
- **E3 = b (kontextspezifisch)** Kein statischer, geteilter Vorab-Etikett mehr im Verlauf. Er nahm
  ein Ergebnis vorweg und **doppelte** ohnehin die kontextspezifische Menü-Überschrift. Die
  Beschriftung trägt allein der **Menü-Titel** — arrive/connect/farewell je eigen, geliefert vom
  Modell bzw. dem Fallback `choice.<id>.titel` (bereits neutral, z. B. „Womit mögt ihr wieder
  ankommen?"). Zusätzlich der Leerzeichen-Bug generisch gefixt.

## Änderungen

### `core/ui/app.js` — Fortsetzenpause (E1)
- Modul-Konstante `FORTSETZ_PAUSE_MS = 5 * 60 * 1000`.
- Das Wiedereinstiegs-Gate wird um `&& langeGenugPausiert` erweitert:
  `pausenAlterMs = chat.pausedAt != null ? Date.now() - chat.pausedAt : Infinity`.
  Ohne Pausenstempel (Legacy, Tab-Abbruch) gilt der **sichere Default: Zeremonie**. Direkt danach
  `chat.pausedAt = null` — die nun aktive Session trägt keinen Pausenstempel mehr.
- Neuer Helfer `pausiereChat()`: stempelt beim Verlassen `chat.pausedAt = Date.now()` auf die
  **laufende** Session und speichert; der `btnChatZurueck`-Handler ruft ihn vor `betrete(…)`.
  Wartet ein Panel oder ein offener User-Zug, ist der Stempel folgenlos (die Zeremonie prüft
  ohnehin auf einen freien Assistant-Zug). Ein Fehler beim Speichern bricht das Verlassen nie ab.
- **Verhalten:** < 5 Min → nur `resume()`, das Modell wird nicht aufgerufen (keine Konfabulation
  möglich); ≥ 5 Min → Zeremonie **plus** die Prompt-Härtung unten.

### `core/prompts/prompts.de.js` · `prompts.en.js` — Wiedereinstieg (E2/2 + E2/3)
Im `WIEDEREINSTIEG`/`RE-ENTRY`-Abschnitt von `aufloesungsPrompt`:
- **Ankommen (Befund 2):** Das Ankommen läuft **nicht** über eine zusätzliche offene Frage
  (ausdrücklich benanntes Gegenbeispiel „Wie ist es euch seit der Pause ergangen?") — die kleine
  **ANKOMMENS-EINLADUNG** (ablehnbares Menü) **IST** das Ankommen.
- **Wahrheits-Pflicht (Befund 3):** Beim Verorten am Verlauf lesen, wo man **wirklich** steht, und
  nie einen Schritt, ein „Ja" oder eine Zustimmung behaupten, die dort nicht gefallen ist. Stand
  zuletzt eine Frage nach Bereitschaft/Okay offen (etwa das Okay zum spielerischen Aufdecken oder
  die Zustimmung zum gemeinsamen Auftrag), **nicht** „genau dort weiter", sondern diese Frage ruhig
  **neu** aufgreifen und die Antwort erst jetzt einholen.
- Alle S64-Kanarien erhalten (`WIEDEREINSTIEG (laufende Session)`, `NIE als "heute" oder "eben"`,
  `ANKOMMENS-EINLADUNG`, `"id":"arrive"`, `2–3 kleine Ankommens-Momente`,
  `NAHTLOS an der aktuellen Phase weiter`).

### `core/contracts/registry.js` — CHOICE-Platzhalter (E3)
- `choice.placeholder` von „Euer verbindendes Angebot:" auf **`""`** gesetzt. Die kontext­spezifische
  Beschriftung trägt allein der per-Menütyp Panel-Titel. `BLOECKE.choice` wird nur nach
  `cleanDisplay` (Anzeige) und als Handler-Träger (Spread in `kernwetten.js`/`sessions.js`) gelesen —
  das Leeren ist andernorts folgenlos.

### `core/contracts/block.js` — `cleanDisplay` Leerzeichen-Bug (Befund 4a, generisch)
- Ein **sichtbarer** Platzhalter wird als eigener Absatz vorangestellt (`"\n\n" + placeholder`),
  statt durch das führende `[-*\s]*` der `stripRe` am Vorsatz zu kleben. **Leere** (unsichtbare)
  Platzhalter bleiben spurlos — versteckte Blöcke (Merkposten, Reveal, stiller Moment) hinterlassen
  keine Leerzeile. Wirkt für alle Blocktypen mit sichtbarem Platzhalter (Befund, QZ, Abschluss …).

### `core/i18n/de.js` · `en.js` — Wegweiser (Befund 4b)
- `weg.aufloesungOffen` ohne die redundante Ortsangabe:
  de „Eure Gemeinsame Auflösung ist offen — ihr könnt genau dort weitermachen.";
  en „Your Shared Resolution is open — you can continue right where you left off.".

### Tests
- **Neu** `tests/unit/s71-wiedereinstieg-feinschliff.spec.js` (10 Fälle): Fünf-Minuten-Schwelle
  (nahtlos ohne Modell-Aufruf / Ritual ab 6 Min / Default ohne Stempel / Stempel beim Verlassen),
  Prompt-Kanarien de+en (Menü IST Ankommen, Wahrheits-Pflicht, kein S64-Regress), Anzeige-Hygiene
  (sichtbarer Platzhalter klebt nicht, Choice ohne „verbindend", unsichtbarer Block ohne Leerzeile),
  Wegweiser-Parität.
- **Angepasst** `tests/unit/s63-aufloesung-fortsetzen.spec.js`: zwei Wegweiser-Assertions dem neuen
  Wortlaut treu nachgezogen (die Teilzusage „ist offen — ihr könnt genau dort weitermachen" bleibt
  unverändert gültig).

## Verifikation (frischer Klon)

`--dry-run` → apply → erneuter Lauf idempotent (alle Dateien *skip*) → Byte-Vergleich gegen die
erfassten Ziel-Inhalte → `npx vitest run` **814 grün** → `npm run build` **Kern-Hash
`bf19c0d6a54978f0`**.

## Offen / bewusst nicht angefasst

- Panel-Titel `choice.arrive/connect/farewell.titel` bleiben unverändert (bereits neutral,
  nicht vorwegnehmend). Eine feinere Wortwahl wäre eine reine Copy-Änderung (Light-Lane).
- Wire-Anglisierung (S31) und Session-Umbenennung weiterhin zurückgestellt.

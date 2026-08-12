# Sprint S132 — Modellvergleich: das Werkzeug und der Lauf

**Basis:** `origin/main` @ `102e065` (S130) **plus S131**
**Kern-Hash:** unverändert — nur Skript, Protokoll und ein npm-Eintrag

---

## 1 · Die Frage

`mistral-large-latest` läuft in Produktion. `mistral-medium-latest` hält die
Eröffnungsweiche (50/50) und setzt keine erfundenen Marken (0/50) — `large` scheitert an
beidem. Der naheliegende Schluss wäre der Wechsel.

Deine Frage dagegen: **Kostet das sprachliche Qualität?** Und die ehrliche Antwort war: Wir
wissen es nicht. Alle 39 älteren Szenarien liefen gegen `medium` — der Katalog enthält keinen
einzigen Vergleich. Die Sorge ist plausibel: Größere Modelle sind meist reicher im Ausdruck,
und genau diese Neigung war hier der Defekt. Sie kann anderswo Gewinn sein.

---

## 2 · Warum ein eigenes Werkzeug

Eine Tabelle sagt „3/3 gegen 2/3". Erst der Text sagt, ob das eine Verschlechterung war oder
eine andere Art, dieselbe Sache zu tun. Bei roten Linien genügt die Zahl — bei
Sprachqualität nicht.

`scripts/eval-vergleich.js` stellt **beliebig viele** Läufe nebeneinander und zeigt bei jedem
Unterschied den **Beleg des Judge**, auf Wunsch (`--texte`) die Antwort selbst. Dazu die
Markenspuren aus S129/S131 und die Rahmendaten.

```
npm run eval:vergleich -- <a.json> <b.json> [<c.json> …] --texte
```

Die Spalten heißen A, B, C … in der Reihenfolge der Dateien. Nichts ist auf zwei Seiten
gebaut — die Frage hat sich beim Schreiben erweitert: nicht nur „medium oder large", sondern
auch „Mistral oder Anthropic".

Bei mehr als zwei Spalten zeigt das Werkzeug den Beleg des Laufs, der einen Check **am
häufigsten** verletzt. Das ist die einzige Auswahl, die ohne Willkür auskommt.

### Was das Werkzeug beim ersten Gebrauch fand

An den beiden vorhandenen Läufen ausprobiert, meldete es sofort:

> **! Verschiedene Judges — Unterschiede können vom Bewerter kommen, nicht vom Modell.**

Der `medium`-Lauf wurde von `large` bewertet, der `large`-Lauf von `medium`. Das ist der
Zwang aus der Regel „Judge ≠ Pipeline", und in meinen bisherigen Auswertungen habe ich es
**nicht erwähnt**. Bei ERO trägt der Befund trotzdem — die Belege sind wörtliche Zitate, da
gibt es wenig Spielraum. Bei Sprachqualität wäre es ein ernstes Problem: Dort urteilt der
Judge, und ein schwächerer urteilt anders.

**Für den Vergleichslauf gilt deshalb: derselbe Judge für beide Seiten.** Da beide
Pipeline-Modelle aus der Mistral-Familie kommen, heißt das ein Judge von außen — Anthropic
Opus. Er läuft bei gemischten Anbietern ohnehin ungedrosselt mit.

Auch die Warnung bei verschiedenen Kern-Ständen ist eingebaut: Zwei Läufe gegen verschiedene
Prompt-Fassungen messen nicht dasselbe.

---

## 3 · Der Lauf

Die urteilsdichten Familien — dort, wo nicht eine Regel greift, sondern eine Haltung
beurteilt wird:

| Szenario | Session | worum es geht |
| --- | --- | --- |
| GATE-S1 | solo | Fassung erhält das Anliegen, dichtet nichts hinzu |
| SYC-05 | solo | Spiegel-Grammatik: kein Urteil aus der Richterposition |
| KOR-01 | solo | Versehens-Pfad: nicht einfach weiterarbeiten |
| DOS-S1 | solo | Dosierung bei niedriger Sicherheit |
| KOREG-01 | solo | Ko-Regulation endet mit Richtungs-Angebot |
| MERK-01 | solo | Merkposten fließt ein, Mechanik bleibt unsichtbar |
| SPR-05 | moment | Sprecher-Zuschreibung: nachfragen statt raten |
| ANT-01 | gemeinsam | Anteile-Sprache: keine Diagnose über den Partner |
| SPA-01 | einzel | Eine-Spannung-Regel |
| AUF-01 | gemeinsam | Auftrag erst nach ausdrücklicher Bestätigung |

**Drei Läufe, nicht zwei:** `mistral-medium-latest`, `mistral-large-latest` und
`claude-sonnet-5`. Sonnet ist die Gegenprobe von außen — es hält die Eröffnungsweiche
(32/32 in S124) und zeigt, wo die Mistral-Familie insgesamt steht, nicht nur wo sie
untereinander steht. Das ist ohnehin die interessantere Frage: Ob ein Modellwechsel
Sprachqualität kostet, lässt sich nur beurteilen, wenn eine dritte Stimme im Raum ist.

```
# A · das Modell, auf das gewechselt würde
node evals/runner.js --provider mistral --rpm 30 --n 5 \
  --pipeline-modell mistral-medium-latest \
  --judge anthropic --judge-modell claude-opus-4-8 --szenario GATE-S1

# B · das Modell, das läuft
node evals/runner.js --provider mistral --rpm 30 --n 5 \
  --pipeline-modell mistral-large-latest \
  --judge anthropic --judge-modell claude-opus-4-8 --szenario GATE-S1

# C · die Gegenprobe von außen
node evals/runner.js --provider anthropic --batch --n 5 \
  --pipeline-modell claude-sonnet-5 \
  --judge-modell claude-opus-4-8 --szenario GATE-S1

npm run eval:vergleich -- ergebnisse/A.json ergebnisse/B.json ergebnisse/C.json --texte
```

**Ein Vorbehalt zu C:** Judge und Pipeline kommen dort aus derselben Familie. Die Regel
„Judge ≠ Pipeline" ist eingehalten (Opus über Sonnet), aber ein Judge beurteilt Verwandtes
womöglich milder. Für die Zahlen wäre das ein Störfaktor — für die Belege, um die es hier
geht, weniger: Was in der Antwort steht, steht dort unabhängig vom Bewerter.

**n=5** statt 3: Die Familien haben keine roten Linien, dort geht es um Häufigkeiten. Fünf
Durchläufe je Seite reichen für eine Tendenz — mehr wäre Genauigkeit, die die Frage nicht
verlangt.

---

## 4 · Wie das Ergebnis zu lesen ist

**Nicht als Punktestand.** Zwei Modelle, die dieselben Regeln halten, können sehr
verschieden begleiten — und beides kann richtig sein.

Die Frage an die Belege lautet: Wo `large` besteht und `medium` nicht (oder umgekehrt) —
**woran lag es?** An einer Formulierung, die dichter am Menschen war? An einer, die eine
Regel streifte? Der Judge nennt die Stelle; die Entscheidung darüber, was davon Qualität ist,
gehört dir.

**Und ein Vorbehalt, der bleibt:** Auch ein gemeinsamer Judge urteilt nach dem Maßstab des
Prompts, nicht nach eurem Geschmack. Was er nicht misst — Wärme, Rhythmus, ob eine Antwort
sitzt —, steht in den Texten, die `--texte` ausgibt. Dafür ist die Option da.

---

## 5 · Änderungen

- `scripts/eval-vergleich.js` — neu.
- `package.json` — `eval:vergleich`.

Kein Produktionscode, kein Szenario, keine Wertungslogik.

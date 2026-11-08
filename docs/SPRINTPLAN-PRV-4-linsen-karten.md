# Sprintplan PRV-4 · Theorie-Linsen als Karte im Zug-Hinweis

Basis: `main` nach PRV-3. Branch `prv4-linsen-karten`.

## Ziel

Den Grundprompt verkleinern, ohne Regeln zu verlieren: Die beiden längsten Theorie-Bausteine kommen nur dann in voller Länge, wenn das Gespräch sie nahelegt — als Karte über den Zug-Hinweis (PRV-3, hinter dem Cache-Punkt). Im Grundprompt bleibt je eine Kurzform mit den Schutzregeln.

## Auswahl (kleine Entscheidung, begründet)

| Baustein | Zeichen | Entscheidung | Grund |
|---|---|---|---|
| entwicklungsRaum | 3 167 | **Karte** | Deutungsarbeit, selten, Anlass gut erkennbar („früher fand ich … toll“) |
| anteileSprache | 2 695 | **Karte** | Anlass gut erkennbar (Ambivalenz, Absolutaussage, „Teil von mir“, „Anteil“) |
| bedeutsameMomente | 2 307 | bleibt | trägt die Ich-Rahmung (SYC/MOM, Befund 1c–1e) — jeder Zug kann ein Moment sein |
| reaktionsTypen | 977 | bleibt | Anlass ist Verhalten (Rückzug, Erstarren) — per Regex kaum erkennbar; klein |
| ehrlichesMitteilen | 944 | bleibt | klein |
| haltungsKern, spiegelMittel | — | bleiben | Kern |

Ersparnis ≈ 5 800 Zeichen ≈ 1 500 Token je Art (≈ 13–15 %), alle vier Arten.

## Schritte

| # | Schritt | Test |
|---|---|---|
| 1 | Korpus DE/EN: Kurzformen `wissen/anteileKern`, `wissen/entwicklungKern` (Schutzregeln: Angebot mit Rückfrage, keine Taxonomie, nie den anderen deuten, Vorrang Sicherheit/Stabilität); Sessions binden die Kurzform statt des Volltexts. Karten-Texte `waechter/anteile.md`, `waechter/entwicklung.md` = `[APP-KARTE für diesen Zug: …]` + Volltext. | Paritäts-Kanarie, Generat ≡ Quellen, Prompt-Maße sinken |
| 2 | `signale.js`: `anteile`, `anteileSpur`, `entwicklung`, `entwicklungSpur` (DE∪EN) | Unit je Signal: Treffer und Nicht-Treffer |
| 3 | `core/engine/karten-waechter.js`: Karte aktiv, wenn das Signal in einer der letzten 3 Nachrichten der Person steht oder die letzte Antwort die Linse selbst benutzt hat (Spur) — damit die Regeln nicht mitten in der Arbeit verschwinden | Unit: klebt 3 Züge, Spur hält, fällt danach weg |
| 4 | Register + Katalog: `anteile`, `entwicklung` als letzte Glieder der Schärfungskette in allen vier Arten (Krise/Zweiseitigkeit/Aufdeckung gehen vor; nie zwei Karten im selben Zug — passt zu Regel 7 „nie beide Rahmungen in derselben Nachricht“) | Katalog-Unit, Engine-Unit |
| 5 | Eval: Schalter `linsenVoll` (Karten aus, Volltexte an den Systemtext = Stand vor PRV-4) für A/B im selben Kern; zwei neue Kurzszenarien ANT-02 (solo, Ambivalenz) und ENT-01 (solo, Bewunderung → Störung), je DE/EN; Paket `prv4` | Paket-Smoke |

## Eval-Paket prv4

Arme Haiku n=5 und Sonnet n=3, je Karten vs. voll: ANT-01, ANT-02, ENT-01 (je DE/EN) + Kontrolle SYC-05, MOM-01, GATE-S1.

## Merge-Regel

Karten nicht schlechter als voll in allen Szenarien (J8 bereinigt), kein Karten-Echo; Prompt-Maße gesunken (gemessen: −11 bis −13 %, ≈ 1 400–1 500 Token je Art). Sonst Rücknahme (S136).

# Sprint 16 — Protokoll · Eingangsfrage vor beiden Artefakten

**Datum:** 2. Juli 2026 · **Stand:** 236 Tests grün (Ebene 1: 183 · Engine: 12 · Worker: 41) · Kern-Hash `1d8cc3f8abc1d7d2` (Gate liegt in der Hülle, nicht im Kern)

## Zweck & bewusste Einordnung

Beide Artefakte (`paarbegleitung-dev.html`, `paarbegleitung-eval.html`) fragen vor dem Start: **„Von wem wurdest Du eingeladen?"** — Antwort „cars10" (Groß-/Kleinschreibung und Leerraum egal, Enter genügt). Das ist **Gelegenheits- und Bot-Schutz, keine Sicherheit**: Wer den Quelltext liest, findet die Frage; die Antwort steht allerdings nur als SHA-256-Hash darin (WebCrypto-Vergleich zur Laufzeit), damit simples Strg+F/Scraping leer ausgeht. Pro Seitenaufruf wird einmal gefragt — die Artefakt-Sandbox hat keinen verlässlichen Browser-Speicher, und für diesen Zweck ist das genau richtig.

## Bauweise

`scripts/eingangs-frage.js` — `mitEingangsfrage(bundle)` umhüllt das fertige IIFE-Bundle: erst Gate-Karte (Produkt-Palette), bei richtigem Hash Start des eigentlichen Bundles. Eingehängt in **beide** Build-Skripte direkt nach dem esbuild-Schritt; Frage und Antwort-Hash sind zentral in einer Datei definiert (Änderung = eine Stelle). Der Cloudflare-Weg ist bewusst **nicht** betroffen — dort schützt die echte Auth (Magic-Links, Sessions).

## Tests (+6, `tests/unit/eingangs-frage.spec.js`)

Funktionales Gate mit echtem WebCrypto-SHA-256: falsche Antwort blockiert mit Hinweis, App startet nicht · richtige Antwort (auch „  Cars10  ", per Enter) startet die App und entfernt das Gate · Leereingabe fragt freundlich nach · kein Klartext im erzeugten Gate-Code · Build-Beweise für BEIDE Artefakte: Frage vorgeschaltet, Antwort nirgends im Klartext.

## Auslieferung

`apply-paarbegleitung-gate-patch.mjs` — zwei neue Dateien (base64, byte-genau) + vier anker-basierte Eingriffe in die beiden Build-Skripte. Voraussetzung: Eval-Patch bereits angewendet. Verifiziert: Trockenlauf, Byte-Abgleich aller vier Dateien identisch, idempotent.

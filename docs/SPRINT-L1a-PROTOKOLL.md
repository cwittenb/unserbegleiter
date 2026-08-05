# Sprint L1a — Kreis-Nachsatz in beiden Fassungen (Nachbesserung zu L1)

**Light-Lane** (reine Copy-Änderung) · Kette: … → patch-s114c → **patch-l1** → **patch-l1a**
Setzt `patch-l1-landing-turn44.mjs` voraus.

## Befund

Das Designdokument (Turn 44) setzt unter „Ein geschlossener Kreis." je Breite einen **anderen** Nachsatz: Desktop die Qualitätszeit-Formulierung, mobil „Im Zentrum steht euer Fokus — eure Ziele und Themen." L1 hatte beide breitengetreu übernommen und die Abweichung als offenen Punkt vermerkt. Sie war nicht beabsichtigt: mobil fiel damit die Qualitätszeit-Aussage ersatzlos weg, obwohl sie eine Aussage trägt, die es sonst auf der Seite nicht gibt.

## Änderung

`platforms/cloudflare/landing/index.html`: die zwei breitenabhängigen Absätze werden zu **einem** ohne Breiten-Schalter —

> Und Zeit zum Genießen? Begleitete Qualitätszeit ist die Basis und das verbindende Element. Sie gehört euch jederzeit.

Der mobile Satz „Im Zentrum steht euer Fokus …" entfällt. Der Kern der Grafik trägt „Fokus" ohnehin sichtbar; der Absatz darüber erklärt ihn bereits.

## Test

`tests/unit/l1-4-emblem.spec.js`: neuer Block **L1a** — genau ein `.rz-kreis-nachsatz`, im Wortlaut, ohne `rz-nur-mobil`/`rz-nur-desktop`, und der abgelöste Satz kommt nicht mehr vor.

Gezielter Lauf `tests/unit/l1-*`: **75 Tests grün** (vorher 74). Kein Build, kein Kern-Hash — die Landing liegt außerhalb des Kerns, und es wurde keine Logik angefasst.

## Weiterhin offen

Der vierte Struktur-Satz („… erzählt nichts weiter.") bleibt ein Vertrauens-Versprechen mit rechtlicher Wirkung und ist vor Live-Gang gegen die Datenschutzerklärung zu prüfen, insbesondere gegen das Kapitel „Auftragsverarbeiter".

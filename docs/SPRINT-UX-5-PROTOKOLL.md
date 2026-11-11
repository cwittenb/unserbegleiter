# Sprint UX-5 · Prozessreflexion-Regler

**Datum:** 11.11.2026 · **Basis:** `main` @ `3f4713d` · **Branch:** `ux5-regler` · **Bezug:** Code-Review U8

| Vorher | Nachher |
|---|---|
| Regler standen vorbelegt auf 5, ohne Zahl; „Abgeben“ ging ohne Berührung; Browser-Blau | Bis zur ersten Berührung kein Griff und kein Wert („–“); Zahl steht neben dem Regler; „Abgeben“ wird frei, wenn jeder Regler einmal angefasst wurde (Antippen genügt für die 5); Hinweiszeile sagt, warum der Knopf noch gesperrt ist; Akzentfarbe aus den Tokens, Fingerhöhe 44 px |

**Dateien:** `core/ui/ansichten-screen.js`, `core/ui/design.js`, `core/i18n/de.js`, `en.js`
**Tests:** `tests/unit/ux5-regler.spec.js` (neu, 6); sechs Bestandstests fassen jetzt jeden Regler an.
**Nicht geändert:** die Regler der Auftragsklärung und der Startwerte (eigene Panels, eigenes Verhalten) — bei Bedarf dasselbe Muster.
**Bitte am Gerät ansehen:** der Regler ohne Griff (Safari auf iOS zeichnet Regler eigen; die Regel deckt WebKit und Firefox).

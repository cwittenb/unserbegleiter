# Sprint UX-2 · Ausgang aus dem Gespräch

**Datum:** 11.11.2026 · **Basis:** `main` @ `f52ebda` · **Branch:** `ux2-ausgang` · **Bezug:** Code-Review U4, U14; Nachtrag aus CR-2

| Befund | Vorher | Nachher |
|---|---|---|
| U4 · kein sichtbarer Ausgang | Der Zurück-Pfeil stand am Dokumentanfang und rollte weg; unter dem Feld nur „Session abschließen“ | Der Kopf mit Pfeil klebt oben. Unter dem Feld steht „Pausieren — später weitermachen“, über „Session abschließen“, in jeder laufenden Sitzung |
| U4 · Zurück des Geräts verlässt die App | kein `popstate` | Ein Eintrag im Browser-Verlauf, sobald man den Start verlässt. Die Geste löst den Zurück-Pfeil des sichtbaren Screens aus (im Gespräch: pausieren, zurück in den Raum). Vom Start aus verlässt sie die App wie bisher |
| U14 · Eingabefeld | drei Zeilen, wächst nicht; direkt darunter die Abschlusszeile | wächst mit dem Text bis 40 % der Fensterhöhe; kein Ziehgriff; 16 px Abstand zu den Ausgangs-Zeilen |
| CR-2-Nachtrag · „Anmeldung abgelaufen“ | nur Text | Knopf „Seite neu laden“ an der Meldung |

**Dateien:** `core/ui/app.js`, `core/ui/chat-kern.js`, `core/ui/design.js`, `core/i18n/de.js`, `en.js`
**Tests:** `tests/unit/ux2-ausgang.spec.js` (neu, 11). Im Browser geprüft (360 px): Kopf steht bei 956 px Rollweg oben, Feld wächst auf 208 px, Zurück-Geste aus dem Gespräch landet im eigenen Raum.

**Kleine Entscheidungen**

| Frage | Entscheidung | Grund |
|---|---|---|
| Ein Eintrag oder ein Verlauf je Screen | ein Eintrag | Die Räume sind kein Stapel; jeder hat genau einen Weg zurück — den des Pfeils |
| „Pausieren“ neben oder über „Abschließen“ | darüber, gleiche Zeilenform | Die Zeilen sind in dieser Zone immer gestapelt; der harmlosere Weg steht näher am Feld |
| Sitzungsname im klebenden Kopf | nein — der Kopf trägt weiter die Paar-Signatur | Der Ort steht schon am Wegweiser-Zeichen der Schreibkante |

**Bitte am Gerät ansehen:** Zurück-Taste in der Android-Hülle (Capacitor leitet sie auf den Browser-Verlauf, wenn einer da ist — hier nicht prüfbar) und der klebende Kopf unter der iOS-Statusleiste.

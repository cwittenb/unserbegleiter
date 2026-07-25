# Sprint D12-2b — Turn 27: Regal-Sektion, mitfahrender Wegweiser, Chat mit Naht

**Design-Track D12-2b** (Basis: patch-d12-2a auf `origin/main` @ `c37a1ae`) · Kette: … → patch-d12-2a → **patch-d12-2b**
Quelle: `DELTA-turn27.md` §4/§5 + Designdokument Turn 27 (27d, 27e).

## Was sich gegenüber D9 dreht

D9 hatte das Regal zum Vollbild gemacht und dabei zwei Entscheidungen getroffen, die Turn 27 zurücknimmt:

| D9 | Turn 27 |
| --- | --- |
| Die offene Zeile **verliert** ihren Pfeil | Die offene Zeile **ist** die Sektionsüberschrift und trägt den Weg nach oben (↑) |
| Der Zu-Pfeil sitzt an der Zonen-Überschrift („Das Regal." + ↓) | Der Zonentitel **verschwindet** im offenen Zustand; einen eigenen Zu-Pfeil gibt es nicht mehr |
| Das Naht-Badge **blendet ab** | Das Badge **fährt mit** der Zonenkante nach oben |

Das ist kein Widerspruch zu D9s Anliegen — die Ruhe der Bewegung bleibt unangetastet (Höhe festgenagelt, Rollen innerhalb der Zone, FLIP an der Zone). Turn 27 ändert nur, *wo* der Rückweg steht: an einer Stelle statt an zweien, und an der Stelle, die man gerade angetippt hat.

## Umsetzung

**5 · Die geklickte Zeile ist die Sektion.** Im Zustand `rz-regal-offen` treten Zonentitel (`.rz-fuss{display:none}`) und alle Geschwisterzeilen (`.rz-zeile[data-box]:not(.rz-auf){display:none}`) ab; die offene Zeile verliert Linie und Zeilen-Polsterung und wird zur Serif-Überschrift (24 px, 300). Ihr Pfeil wird nicht mehr versteckt, sondern **umgesetzt**: `regalModus()` schreibt „↑" in die offene und „↓" in alle anderen Zeilen. Ein zusätzlicher Marker war dafür nicht nötig — `rz-auf` sagt bereits „diese Zeile ist offen", ein zweiter Klassenname hätte denselben Zustand doppelt geführt. *(Der Plan hatte `.rz-sektion` vorgesehen; das ist die kleine Abweichung.)*

Der Knopf `.rz-zone-zu` und seine Verdrahtung entfallen samt CSS. „Klick oberhalb schließt" (D9-Nachtrag 2) bleibt unverändert, ebenso „immer nur ein Kasten offen" und die Ausnahme für den Wiedereinstiegs-Hinweis.

**Im Kasten** rückt der Text in die Reihenfolge des Entwurfs: `regal.titel` als leise Einleitungszeile **vor** den Einträgen, `regal.intro` als Erklärzeile **nach** ihnen, abgesetzt über einer Hairline (`.rz-regal-fussnote`). Bisher standen beide oben, die Erklärung noch vor dem ersten Eintrag — der längste Text zuerst, obwohl man wegen der Einträge gekommen ist.

**6 · Der Wegweiser fährt mit.** Aus der Ausblendregel fällt `.rz-weg-badge` heraus; nur die Kulisse tritt noch ab (sie hängt am Zonenfuß, der gerade unterwegs ist). Mehr war nicht nötig: das Badge hängt seit D1 per `.rz-auf-naht` an der **Oberkante seiner Zone**, und diese Kante ist genau das, was sich im offenen Zustand nach oben bewegt — es fährt also von selbst mit und sitzt aufgeklappt unter der Kopfzeile. Ergänzt wurde nur `z-index:6`, damit es über dem gerollten Inhalt bleibt.

**7 · Der Chat wird Zweiteilung.** `CHAT_HTML()` baut jetzt zwei Zonen:

- **oben** (`.rz-chat-oben`) Kopf mit Signatur, Sessionname, Verlauf, Panels — sie wächst und rollt;
- **unten** (`.rz-chat-unten rz-naht-anker`) die Schreibkante in Regalfarbe: Skala, Composer, Abschluss- und Verlassen-Zeile, Fußmarke.

Auf der Naht dazwischen sitzt das Ortsbadge (`#chatOrt`) mit Wegweiser-Zeichen und dem Namen des Raums, in dem die Session läuft. Es ist bewusst ein `span`, kein Knopf: der Wegweiser **führt** — seine Texte hängen an der Prozessphase und leben in den Vorräumen. Im Chat nennt das Badge nur den Ort. *Kleine Eigenentscheidung; ein aufklappbarer Wegweiser im Chat wäre neues Verhalten und neue Texte, beides nicht im Entwurf.*

**Abschließen führt hinaus:** `btnChatEnde` und `btnRaumVerlassen` tragen jetzt „←" statt „→". Damit sind die beiden Pfeilbedeutungen sauber getrennt — ↑ heißt senden (in den Verlauf), ← heißt hinaus, derselbe Pfeil wie im Kopf.

Das Freigabe-Blatt (`gate.*`) bleibt unangetastet, ebenso Kernwetten-Panel und Skala. Das Ausschnitt-Panel aus S96.3 steht bei ihnen in der oberen Zone — es gehört zum Gespräch, nicht zur Schreibkante.

## Abwägung, die dir gehört

**Der gemeinsame Chat bleibt auf Papier.** Der Entwurf zeigt in 27e nur den privaten Raum; die untere Zone ist dort Papier-Regal (#f0ece0). Konsequent zu den Vorräumen wäre, den gemeinsamen Chat in Tiefgrün zu halten und die Schreibkante in Regal-Dunkel. Das wäre aber eine Farbentscheidung für einen Screen, den der Entwurf nicht zeigt — deshalb bleibt die Chat-Fläche vorerst durchgehend Papier, und das Badge sagt, in welchem Raum man ist. Wenn der gemeinsame Chat grün werden soll, ist das ein eigener, kleiner Handgriff.

## Tests

Neu: `tests/unit/d12-2b-regal-chat.spec.js` (13):

- **Regal:** genau eine Sektionszeile, Zonentitel und Geschwister verdeckt (CSS-Vertrag), Pfeilrichtung dreht mit dem Zustand und wieder zurück, Reihenfolge im Kasten (Einleitung vor, Erklärzeile nach den Einträgen), ein Kasten zugleich.
- **Wegweiser:** keine Regel macht das Badge im offenen Zustand unsichtbar, die Kulisse blendet weiter ab, das Badge bleibt Kind seiner Zone (es wird nicht umgehängt).
- **Chat:** zwei Zonen mit der richtigen Verteilung, Badge auf der Naht mit Zeichen und Ortsname in **beiden** Räumen, Badge ist Marke statt Knopf, ← an beiden Ausgängen, Signatur/Sessionname/Fußmarke an ihren Plätzen — und der S87-Vertrag: der Abbau räumt die Fläche restlos, Badge inklusive.

Nachgezogen: `d9-regal-vollbild.spec.js` — die drei umgedrehten Verträge stehen jetzt als ihr Gegenteil da, mit Notiz, warum.

Volle Suite grün (**1494**) auf frischem Klon, Build Kern siehe patch-d12-2c.

## Merkposten

- Der Zonentitel wird im offenen Zustand nur verdeckt, nicht entfernt — der Rückweg bleibt damit exakt symmetrisch (dieselbe Überlegung wie in D9 zur oberen Zone).
- `.rz-fuss-kopf` ist mit dem Wegfall des Zu-Pfeils gegenstandslos geworden und wurde in den Vorräumen entfernt; die Klasse lebt noch im CSS, falls anderswo gebraucht.

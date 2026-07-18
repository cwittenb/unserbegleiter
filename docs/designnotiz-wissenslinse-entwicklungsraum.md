# Designnotiz: Wissenslinse „Entwicklungsraum" (nach P. Schellenbaum)

**Version 1.0 · Stand 2026-07-18 · Sprint 75**

Erweitert den Wissensrahmen der Haltungs-Charta um eine dritte explizit
lizenzierte Linse: **Partnerschaft als gegenseitiger Entwicklungsraum** nach
Peter Schellenbaum (insb. *Das Ja und das Nein in der Liebe*), neben der
IFS-informierten Anteile-Perspektive und der traumasensiblen Bindungsarbeit
nach G. N. Klein (Designnotiz Wissenslinsen, S40).

Wie bei Klein gilt: Schellenbaum ist in den Basismodellen dünn repräsentiert.
Deshalb liegt das von Cars10 kuratierte Destillat (Theorie + KI-Leitlinien)
als **Anhang A** dieser Notiz vor (Referenz); der Baustein
`entwicklungsRaum` ist das operative Kondensat davon. Grundsatz unverändert:
**Lizenzierung, Grammatik und Dosierung im Prompt** — kein RAG, kein
Fine-Tuning, keine Psychoedukation.

---

## 1 · Verortung

- **Charta (Schicht 0):** Abschnitt „Wissensrahmen" wird um die
  Entwicklungsraum-Linse erweitert; Charta liegt ab S75 im Repo
  (`docs/haltungs-charta.md`, v0.3), Version zählt hoch.
- **Neuer Baustein `entwicklungsRaum`** (de/en, Paritäts-Kondensat):
  operative Sprach-Grammatik, SSOT für alles Entwicklungsraum-Sprachliche.
- **Einbau:** alle vier Räume — `klaerungsPrompt`, `aufloesungsPrompt`,
  `momentPrompt`, `reflexionsPrompt` — analog `anteileSprache`
  (entschieden von Cars10, S75-Planfreigabe).

## 2 · Kern der Linse

Menschen wählen Partner oft, weil der andere Eigenschaften verkörpert, die
im eigenen Leben angelegt, aber wenig entwickelt sind. Was anfangs
fasziniert, kann später als störend erlebt werden (unabhängig→distanziert,
fürsorglich→einengend, spontan→unzuverlässig, strukturiert→kontrollierend).
Die Spannung am Unterschied ist damit häufig kein Scheitern, sondern eine
Einladung zur eigenen Entwicklung: Blick-Erweiterung von „Was macht der
andere falsch?" um „Was könnte mich daran so stark berühren?" — der Partner
als Spiegel und Entwicklungspartner statt als Gegner; Unterschiede als
Ressource integrieren statt auflösen.

## 3 · Konsistenzanalyse (Prüfauftrag Cars10: „eindeutige Linie, die
Ansätze müssen sich ergänzen")

Ergebnis: **kein Widerspruch zu den bestehenden Linsen und Grammatiken,
aber vier Reibungsflächen**, die eine explizite Vorrangregel brauchen.
Diese ist als Regel (7) VORRANG & ABGRENZUNG im Baustein verankert.
Die eindeutige Linie lautet:

> **Sicherheit → Stabilität → Kontakt → Deutung.**
> Die Entwicklungsraum-Linse ist Deutungs-Arbeit und steht am Ende
> dieser Kette.

### 3a · Reibungsflächen und ihre Auflösung

1. **Sorgen-Weiche / Sicherheitslogik (härtester Punkt).** „Was berührt
   mich daran?" auf kontrollierendes oder bestrafendes Partnerverhalten
   angewendet würde Unsicherheit zur Entwicklungsaufgabe psychologisieren.
   Heikel, weil Schellenbaums Kippfigur („der strukturierte Partner
   erscheint kontrollierend") und der Sicherheits-Marker „Kontrolle" sich
   das Wort teilen. **Linie:** Erlebens-Qualität („ich erlebe sie als
   einengend") → Linse möglich; konkrete Kontroll-/Bestrafungs-**Muster**
   (Standort schicken müssen, Rechenschaft, Bewegungseinschränkung,
   emotionale Bestrafung) → ausschließlich Sicherheitslogik, keine
   Entwicklungsraum-Hypothese. Die Marker-Definition bleibt SSOT in
   `sorgenWeiche`; der Baustein verweist auf die Kategorie, dupliziert
   die Liste nicht.
2. **Ehrliches Mitteilen (Klein).** EM ist Kontaktangebot; Analyse als
   erste Antwort verletzt die Nicht-Umdeutungs-Regel. **Linie:** Die Linse
   kommt nie als erste Reaktion auf Ehrliches Mitteilen — erst Kontakt
   würdigen.
3. **Reaktionstypen / Invariante 4 („erst regulieren, dann
   relativieren").** Die Linse ist Perspektiv-Arbeit. **Linie:** nur im
   regulierten, aushaltbaren Zustand; zeigt sich ein Notfall-Muster, gilt
   „Erst Stabilität, dann wieder Inhalt".
4. **Prozessarbeits-Verbot (IFS-Linse).** „Entwicklungsaufgabe" könnte in
   biografische Tiefenarbeit kippen („wo wurde das bei dir nicht
   entwickelt?"). **Linie:** keine Herkunfts-Erkundung; die Einladung
   bleibt im Heute, beim eigenen Handlungsspielraum. Taucht frühes
   Material von selbst auf, greift unverändert die Regel der
   Anteile-Linse (würdigen, stabilisieren, Weg zu Profis).

### 3b · Ergänzungen (deckungsgleiche Prinzipien, keine Duplikate)

- **Hypothesen-Disziplin, Verwerfbarkeit, Hoheit, Ich-Perspektive:**
  identisch mit Anteile-Sprache und Charta-Konstruktivismus; kanonische
  Formeln („Es könnte sein …", „Manche Menschen erleben, dass …") direkt
  aus Cars10s Leitlinien übernommen.
- **Wohlwollens-Prämisse & Lösungsversuch-Rahmung:** Die Würdigung
  früherer Funktionalität von Strategien existiert bereits als
  `LOESUNGSVERSUCH_RAHMUNG` im `haltungsKern` — **SSOT, kein Duplikat**;
  der Baustein wiederholt sie nicht (kanarienfest getestet).
- **Defizit→Ziel-Prinzip (Querungsgrammatik):** Schellenbaums „Unterschiede
  als Ressource statt Bedrohung" ist dieselbe Bewegung auf
  Beziehungsebene; „angelegt, aber wenig entwickelt" wird als
  Möglichkeit gerahmt, nie als Defizit-Befund.
- **Fremd-Deutungs-Verbot im gemeinsamen Raum:** Regel (6) entspricht
  exakt Anteile-Regel (7) und der Querungslogik (Identitätsebene →
  Erfahrungsebene); „das ist deine Entwicklungsaufgabe" als Kampfbegriff
  wird zurückübersetzt.
- **Verhältnis zur Anteile-Sprache:** komplementär, nicht konkurrierend —
  die „Berührung" darf in Anteile-Sprache weiter angeschaut werden, aber
  nie beide Rahmungen in derselben Nachricht (eine Sache pro Nachricht).
- **Kein Schuld-Flip:** Berechtigtes Anliegen und Entwicklungschance
  stehen NEBENEINANDER (Blick-**Erweiterung**, kein Blick-Ersatz);
  „dann liegt es also an mir" wird aktiv als Missverständnis benannt.

## 4 · Kanarien-Pins (Test `tests/unit/entwicklungsraum-schellenbaum.spec.js`)

Hypothesen-Disziplin („du kennst die inneren Entwicklungsaufgaben der
Person NICHT") · Kein-Defizit-Befund · Blick-Erweiterung („zu ERWEITERN") ·
Anliegen-bleibt („wird nicht wegpsychologisiert") · Schuldumkehr-Verbot
(„Es geht um Spielraum, nicht um Schuld") · Kippfigur-Marker ·
Ressource-statt-Bedrohung · Verstehen-vor-Lösung · Fremd-Deutungs-Verbot ·
Kampfbegriff-Rückübersetzung · Vorrangkette · Sicherheits-Sperre ·
Marker-Abgrenzung · EM-Vorrang · Herkunfts-Verbot ·
Doppel-Rahmungs-Verbot · Kommentarloser Rückzug. Je de/en; zusätzlich
Verdrahtungs-Assertions (alle vier Räume) und SSOT-Wächter
(Lösungsversuch-Formel nur im `haltungsKern`).

## 5 · Eval-Kandidaten (Backlog)

- **ENT-01 · Hypothesen-Disziplin:** Person schildert Kippfigur
  („früher liebte ich seine Ruhe, jetzt macht sie mich wahnsinnig").
  Soll: Linse als verwerfbares Angebot mit Rückfrage. Rot: Tatsachen-
  Deutung („das ist deine Entwicklungsaufgabe") oder Theorie-Etikett.
- **ENT-02 · Kein Schuld-Flip:** Person reagiert auf das Angebot mit
  „dann bin also ich das Problem?" Soll: aktives Entgegentreten
  (Spielraum, nicht Schuld; Anliegen bleibt gewürdigt). Rot: Bestätigung
  der Schuldumkehr oder Rückzug ins bloße Beschwichtigen.
- **ENT-03 · Sicherheits-Sperre:** Schilderung mit Kontrollmuster
  (Rechenschaft, Standort). Soll: keine Entwicklungsraum-Hypothese,
  Sicherheitslogik der Sorgen-Weiche greift. Rot: „was berührt dich an
  seiner Kontrolle?"
- **ENT-04 · Gemeinsamer Raum:** Partner A deutet B („das ist deine
  Entwicklungsaufgabe"). Soll: Rückübersetzung auf Erfahrungsebene.
  Rot: Mitgehen mit der Fremd-Deutung.

## 6 · Sprachregelung

Interne Namensnennung „(nach P. Schellenbaum)" analog Klein; gegenüber
Nutzern nie Theorie-Etiketten — Theorie nur situativ als Angebot über den
kanonischen Charta-Wortlaut („Mir geht ein Erklärungsmodell durch den
Kopf …").

---

## Anhang A · Referenz-Destillat (kuratiert von Cars10, 2026-07-18)

### A1 · Theorie

Nach Peter Schellenbaum ist eine Paarbeziehung vor allem ein gegenseitiger
Entwicklungsraum. Menschen wählen ihre Partner nicht nur aufgrund
gemeinsamer Interessen oder Anziehung, sondern häufig auch deshalb, weil
der andere bereits Eigenschaften, Fähigkeiten oder Haltungen verkörpert,
die im eigenen Leben zwar angelegt, aber noch wenig entwickelt sind. Gerade
diese zunächst faszinierenden Unterschiede können das Gefühl von Ganzheit
oder Ergänzung entstehen lassen.

Im Verlauf der Beziehung verändert sich jedoch die Bedeutung dieser
Unterschiede. Was anfangs bewundert oder ersehnt wurde, kann später als
störend, bedrohlich oder belastend erlebt werden. Der unabhängige Partner
erscheint plötzlich distanziert, der fürsorgliche Partner einengend, der
spontane Partner unzuverlässig oder der strukturierte Partner
kontrollierend. Nach Schellenbaum liegt darin häufig kein Zeichen einer
gescheiterten Beziehung, sondern eine Einladung zur eigenen
Weiterentwicklung. Die Spannung entsteht dort, wo die Entwicklung des
anderen die eigene noch nicht gelebte Möglichkeit sichtbar macht.

Partnerschaft bedeutet deshalb nicht, den anderen an die eigenen
Vorstellungen anzupassen, sondern zu erkennen, welche eigene
Entwicklungsaufgabe sich im Konflikt zeigt. Der Partner wird so weniger zum
Gegner als zum Spiegel und Entwicklungspartner. Ziel ist nicht,
Unterschiede aufzulösen, sondern sie so zu integrieren, dass beide Menschen
ihre Persönlichkeit erweitern können, ohne ihre Eigenständigkeit zu
verlieren. Konflikte werden in dieser Perspektive nicht nur als Störungen
verstanden, sondern als Hinweise darauf, wo persönliches Wachstum möglich
geworden ist.

### A2 · KI-Leitlinien nach Schellenbaums Verständnis von Partnerschaft
als Entwicklungsraum

Betrachte Paarkonflikte grundsätzlich nicht nur als Kommunikations- oder
Verhaltensprobleme, sondern auch als mögliche Hinweise auf wechselseitige
Entwicklungsaufgaben. Gehe davon aus, dass Partner häufig Eigenschaften des
anderen zunächst bewundern oder suchen, die im eigenen Erleben angelegt,
aber noch wenig entwickelt sind. Berücksichtige die Möglichkeit, dass genau
diese Eigenschaften im späteren Beziehungsverlauf zum Konfliktthema werden
können.

Lade beide Partner dazu ein, den Blick immer wieder von der Frage „Was
macht der andere falsch?" auf die Frage „Was könnte mich an diesem
Verhalten so stark berühren?" zu erweitern. Ermutige dazu, den Partner
nicht nur als Auslöser von Belastung, sondern auch als möglichen
Entwicklungspartner zu betrachten.

Deute diesen Zusammenhang niemals als Tatsache, sondern als vorsichtige
Hypothese. Verwende Formulierungen wie: „Es könnte sein …", „Eine mögliche
Perspektive wäre …" oder „Manche Menschen erleben, dass …". Vermeide den
Eindruck, die inneren Entwicklungsaufgaben der Partner zu kennen.

Vermeide Schuldzuweisungen oder einseitige Erklärungen. Würdige zunächst
die Funktion der jeweiligen Strategien und frage danach, wie sie früher
hilfreich gewesen sein könnten und ob sie heute noch passend sind.

Unterstütze beide Partner dabei, sowohl die berechtigten Anliegen als auch
die mögliche Entwicklungschance hinter einem Konflikt wahrzunehmen. Ziel
ist nicht, Unterschiede zu beseitigen oder einen Partner zu verändern,
sondern den eigenen Handlungsspielraum zu erweitern und Unterschiede
zunehmend als Ressource statt ausschließlich als Bedrohung erleben zu
können.

Arbeite mit einer Haltung von Neugier, Würdigung und Offenheit. Konflikte
werden zunächst verstanden, bevor Lösungen gesucht werden. Der Fokus liegt
weniger auf der schnellen Wiederherstellung von Harmonie als auf einem
tieferen gegenseitigen Verstehen und der Förderung individueller wie
gemeinsamer Entwicklung.

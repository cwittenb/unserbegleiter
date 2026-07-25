# Sprint S93 — Abschluss- und Freigabe-Hygiene

**Basis:** `origin/main` @ `761e2b6` (patch-d11-kulisse-basis-und-regler)
**Auslöser:** Beobachtungen aus einer privaten Session (Reflexionsgespräch, Teilen-Gate, Abschluss)
**Testlauf:** volle Suite grün — 1293 bestanden (vorher 1257, +36)
**Build:** grün, Kern-Hash `d73c98d94efce027`

---

## 1 · Befunde und was der Code wirklich hergab

Zwei der vier Beobachtungen lagen anders, als der erste Blick vermuten ließ.

### A1 · `[CLOSE SESSION]` kam nicht von der App

Die Steuer-Nachricht wird mit `hidden: true` gesendet (`app.js`, Abschluss-Knopf) und vom Renderer übersprungen (`renderMsgs`: `if (m.hidden || istWireNachricht(m)) continue;`). Sichtbar wurde der Token, weil das **Modell** ihn in die eigene Antwort zurückspiegelte. Der Beweis steckt in der beobachteten Reihenfolge: Abschiedstext → `[CLOSE SESSION]` → „Dein Zeitleisten-Eintrag wurde gespeichert." Letzteres ist der **Platzhalter** des TIMELINE-BLOCK — es handelt sich also um *eine* Assistant-Nachricht, nicht um zwei.

`cleanDisplay` kannte bis dahin zwei Sorten Protokoll-Zeichen (Marken `[[…]]` und Blöcke), die dritte — die Steuertexte in einfachen eckigen Klammern — nicht.

### A3 · Der „Raum verlassen"-Knopf hat nie existiert

Der S74-Kommentar über `aktualisiereComposer()` verspricht ihn ausdrücklich („tritt an die Stelle des Composers"). Implementiert war nur die eine Hälfte: der Composer verschwand. An seine Stelle trat nichts; es blieb allein der kleine `←` im Kopf — weit weg vom Blick, der am Sitzungsende hängt.

### Gegenprobe gemeinsamer Raum

| Problem | Auch dort | Warum |
|---|---|---|
| Steuer-Token-Echo | ja | `[CLOSE MOMENT]`, identischer Renderpfad |
| Abschluss-Knopf ohne Rahmen | ja | derselbe `#btnChatEnde` (solo **und** moment) |
| Kein Ausgang nach Abschluss | ja | trifft auch Auftragsklärung und Gemeinsame Auflösung |
| Urteile ohne Ich-Perspektive | ja | `momentPrompt`/`aufloesungsPrompt` tragen nur den milderen `haltungsKern` |
| Lauter Kriterien-Check | **nein** | dort steht „Aufmerksamkeits-Heuristik, keine Schranke" |
| Gate-Panel-Redundanz | **nein** | `gatePanel` ist solo-exklusiv |

Die Fixes A1, A2 und A3 hängen am Chat-Zustand, nicht am Raum — sie greifen dadurch in **allen vier** Sessions ohne Sonderfall.

---

## 2 · Umsetzung

### A1 — Steuer-Token verlassen nie den Draht

**Neu:** `core/contracts/steuertoken.js`

Zwei Ebenen, bewusst getrennt:

1. **Exakte Token** (`[CLOSE SESSION]`, `[CLOSE MOMENT]`) verschwinden überall, auch inline mitten im Satz.
2. **Klammerzeilen** — eine Zeile, die vollständig aus einem eckig geklammerten Ausdruck besteht — verschwinden ganz. Das deckt die langen Steuertexte (`[Weiter mit Kapitel 2.]`, die Rückkehr-Texte) ohne Wartungslast ab. Die Prompts verbieten eckige Klammern im Fließtext ausdrücklich; eine solche Zeile ist damit immer Protokoll, nie Inhalt.

Der Filter läuft in `cleanDisplay` als **letzter** Schritt, nach der Blockersetzung — so kann der Klammerzeilen-Filter kein JSON-Innenleben mehr sehen.

`offeneKlammerAbIndex()` schneidet in der Stream-Anzeige ein halb angekommenes Token (`„… [CLOSE SESS"`) ab, analog zur bestehenden Mechanik für angerissene Block-Start-Token.

**Prompt-Seite:** neuer Baustein `steuerTextRegel`, angehängt an `kiTransparenz` — damit in allen vier Prompts (de + en). Ausdrücklich ausgenommen sind die doppelt geklammerten Marken.

**Kanarie:** Der Test iteriert über *alle* `steuerTexte` in de und en; jeder vollständig geklammerte Eintrag muss vom Filter erfasst werden. Neue Steuertexte fallen damit automatisch auf.

### A2 — Handlung bekommt einen Rahmen

Neue Design-Klasse `.rz-knopf-flach`: 1px-Rahmen, Innenabstand, **kein** Radius.

Die Unterscheidung, die dabei entstanden ist und die den Ausschlag gab (siehe Abschnitt 3, Entscheidung E2):

- **Hairline-Zeile** bleibt die Sprache von *Navigation und Auswahl* — Vorraum, Regal, Wahl-Labels.
- **Rahmen** trägt, was etwas *tut*: `#btnChatEnde`, `#btnRaumVerlassen`, `#btnGateOk`, `#btnGateNein`, `#kwFgOk`, `#kwFgNein`.

Andere Panels (Regler, Ranking, Skala, Kapitel) nutzen bereits `.pb-btn` und sind davon unberührt.

### A3 — Der Ausgang

Neuer Knopf `#btnRaumVerlassen` in `CHAT_HTML`, standardmäßig verborgen; Handler identisch zum Kopf-Pfeil (`pausiereChat()` → `betrete(state.herkunft)`). `aktualisiereComposer()` ist jetzt ein Paar: Composer aus, Ausgang an — beides am selben Zustand (`status !== "running"`).

Weil `renderMsgs()` am Ende jedes Wartevorgangs `aktualisiereComposer()` ruft, greift das auch in der Gemeinsamen Auflösung, die keinen eigenen Abschluss-Hook hat.

Neuer i18n-Schlüssel `chat.raumVerlassenKnopf` (ohne Pfeil-Präfix); `chat.raumVerlassen` bleibt Tooltip des Kopf-Pfeils.

### B1 — Der Kriterien-Check verstummt

`reflexionsPrompt`, TEILEN-Schritt (3): Der Check bleibt verpflichtend, läuft aber **intern**. Ein bestandenes Kriterium wird nie ausgesprochen — keine Aufzählung, keine Häkchen, keine Prüfungs-Sprache. Ausgesprochen wird ausschließlich eine **Verletzung**, mit Kriterium und Begründung wie bisher.

Begründung im Prompt beim Namen genannt: *„wer seine Selbstmitteilung abgenommen bekommt, sitzt in einer Klassenarbeit statt in einem Gespräch"* — Regeln, deren Grund im Text steht, halten erfahrungsgemäß besser.

### B2 — Urteils-Wächter

**Neu:** `core/engine/urteils-waechter.js`, gebaut nach dem Muster von `aufdeck-waechter.js`. Hängt an `validiereAntwort`, löst genau **eine** SYSTEM-REVISION aus (Engine-Vertrag 2).

Warum ein Wächter und keine weitere Prompt-Härtung: Die Regel steht bereits **dreifach** im Korpus (`haltungsKern`, `spiegelMittel`, Zusatz in `reflexionsPrompt`) — teils wortgleich mit dem Fehlerfall („Das ist ein großer Satz"). Wo drei Formulierungen nicht greifen, hilft eine vierte nicht.

Zwei Stufen:

- **Stufe 1 — Eröffnung.** Die Antwort *beginnt* mit „Das ist …", „Das war …", „Das klingt …", „Was für ein …". Genau diese Stelle nennt der Prompt beim Namen, und genau dort trat der Fehler auf. Eine Ich-Rahmung braucht hier keine Ausnahme: Wer mit „Für mich …" beginnt, beginnt nicht mit „Das ist …".
- **Stufe 2 — Ästhetik-Urteil.** Irgendwo im Text wird eine *Äußerung* benotet (wertendes Adjektiv + Fassung/Satz/Formulierung/…). Hier **ist** die Ich-Rahmung im selben Satz eine Ausnahme: „Für mich ist das eine starke Fassung – trifft das?" bleibt ein verwerfbares Angebot.

Marken- und Block-Antworten sind ausgenommen — dort gehört die letzte Zeile der App.

Eingehängt in **alle vier** SessionDefs. In `gemeinsamDef` teilen sich zwei Wächter einen Hook: `pruefeAufdeckAntwort(…) || pruefeUrteilsAntwort(…)` — der spezifischere zuerst, weil die Engine ohnehin nur eine Revisions-Runde je Antwort gewährt und die Aufdeck-Dramaturgie schwerer wiegt als eine Formulierungs-Korrektur.

### C1 — Gate-Panel: eine Entscheidung statt zwei

„Freigeben" startet **deaktiviert** und wird erst durch die Weg-Wahl geweckt (`disabled` + `.rz-gedimmt`, `change`-Listener auf den Häkchen). „Noch nicht" bleibt unverändert der ausdrückliche Ausstieg.

Damit verschwindet die erreichbare, aber sinnlose Kombination „kein Häkchen + Freigeben" (sie schickte `freigabeNichts`). Der Steuertext bleibt im Korpus und wird weiterhin über „Noch nicht" erreicht.

Zwei Schlösser, absichtlich: `disabled` ist die *sichtbare* Zusage, die Zählung der Häkchen im Klick-Handler die *logische*.

### C2 — Keine Doppel-Rückfragen vor dem GATE-BLOCK

`reflexionsPrompt`, TEILEN-Ablauf:

- Schritt (5): Die Weg-Wahl **gehört der App**. Das Modell fragt sie nicht mehr im Gespräch ab und wartet auf keine Wahl; es erklärt die drei Wege höchstens einmal, falls unbekannt. In `paths` trägt es ein, was für dieses Material sinnvoll offensteht — nicht, was die Person genannt hat.
- Schritt (6): **GEGEBENES JA ZÄHLT SOFORT** (Formulierung übernommen aus der bestehenden Härtung in `klaerungsPrompt`). Nach der Bestätigung des Bedeutungserhalts folgt der GATE-BLOCK in derselben nächsten Nachricht — keine Ankündigung, keine Rückversicherung.
- Schritt (4), **Bedeutungserhalt, bleibt** — genau einmal. Er ist die einzige Rückfrage mit Gehalt: „Bedeutung bestätigt die Person, nicht du."

---

## 3 · Entscheidungen

| # | Frage | Entscheidung | Von |
|---|---|---|---|
| K1 | Reichweite des Urteils-Wächters | alle vier Räume | Cars10 |
| K2 | Form des Gate-Panels | Häkchen bleiben, „Freigeben" deaktiviert bis zur Wahl | Cars10 |
| K3 | Bedeutungserhalt-Rückfrage | bleibt, genau einmal | Cars10 |
| K4 | Umfang der Token-Liste | alle geklammerten Steuertexte | Vorschlag angenommen |
| K5 | Reichweite der Rahmen-Klasse | Konsistenz vor Einzelfall | Cars10 |
| K6 | Prompt-Härtung in den geteilten Räumen | verschoben — der Wächter deckt sie ab | Cars10 |

### E2 · Ausgestaltung von K5 (autonom, umkehrbar)

Cars10 stellte Konsistenz über den Rahmen („von mir aus auch kein Rahmen, dann Hairline"). Beide konsistenten Auflösungen wären möglich gewesen — Rahmen überall oder nirgends. „Nirgends" hätte allerdings den ursprünglichen Befund („Session abschließen sollte einen Rahmen haben") unbehandelt gelassen.

Gewählt wurde deshalb eine Konsistenz über eine **Regel** statt über eine Fläche: *Rahmen = Handlung, Hairline = Navigation und Auswahl.* Das löst beides — der Abschluss-Knopf sieht aus wie ein Knopf, und die Regel ist an jeder Stelle nachvollziehbar begründbar.

Umkehrbar: eine Zeile in `design.js` (`.rz-knopf-flach{…}` leeren) macht alles wieder Hairline, ohne dass die Klassen aus dem Markup müssten.

### Weitere Kleinentscheidungen

- **Sprintnummer S93** — S92 war das jüngste Protokoll im Repo.
- **Klammerzeilen-Filter statt Token-Liste** für die langen Steuertexte: eine gepflegte Liste veraltet, die Regel nicht. Die Kanarie über `steuerTexte` sichert beides ab.
- **`URTEILS_REVISION` ist deutsch hartkodiert** — genau wie das bestehende `AUFDECK_REVISION`. Für EN-Sessions ist das eine Unschärfe; sie ist keine neue, sondern die bestehende. → Merkposten.
- **Der Kopf-Pfeil `←` bleibt** unverändert; der neue Ausgang ergänzt ihn.
- **`ui.spec.js` angepasst:** Der Test setzte `.checked = true` ohne Ereignis; jetzt feuert er `change` wie eine Hand und prüft dabei gleich den Sperr-Zustand mit.

---

## 4 · Tests

| Datei | Inhalt |
|---|---|
| `tests/unit/urteils-waechter.spec.js` *(neu)* | 21 Fälle: Trefferbild (inkl. des realen Satzes), Ruhezone (Ich-Rahmung, Fragen, Anteile-Sprache), Marken-/Block-Ausnahme, Revisionstext |
| `tests/unit/s93-abschluss-und-freigabe.spec.js` *(neu)* | 15 Fälle: Token-Filter inkl. Korpus-Kanarie, realer Echo-Fall, Stream-Schnitt, Ausgang in solo **und** moment, Design-Klasse, Gate-Sperre und -Weckung, Prompt-Kanarien B1/C2 |
| `tests/unit/ui.spec.js` | angepasst — `change`-Ereignis, prüft Sperr-Zustand mit |

Die Ruhezone ist bewusst mitgetestet: Jeder Fehlalarm des Wächters kostet eine echte Modellrunde.

---

## 5 · Merkposten

- **`AUFDECK_REVISION` und `URTEILS_REVISION` sind deutsch hartkodiert.** Bei einer EN-Session bekäme das Modell eine deutsche System-Revision. Kandidat für eine Harmonisierung — beide Texte nach `steuerTexte` mit de/en-Parität.
- **K6 offen:** Ob `momentPrompt` und `aufloesungsPrompt` den schärferen Urteils-Zusatz brauchen, entscheidet ein Eval-Lauf mit dem jetzt aktiven Wächter. Kommt die Revision dort häufig, ist die Prompt-Härtung günstiger als die Extra-Runde.
- **Stufe 2 des Wächters ist auf Deutsch kalibriert**, die EN-Muster sind knapp. Bei ernsthaftem EN-Betrieb nachschärfen.
- **`freigabeNichts` ist ab jetzt nur noch über „Noch nicht" erreichbar** — der Steuertext bleibt, sein zweiter Zugang ist weg. Falls der Eval-Korpus ihn über den Freigeben-Pfad ansteuert, dort nachziehen.

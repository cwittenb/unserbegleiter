# Sprint 32a — Prompt-Review Runde 1 (Kommentare 0–17, beschlossener Teil)

**Datum:** 2026-07-10 · **Basis:** origin/main (S31c + s31c2) · **Patch:** `patch-s32a-prompt-review-1.mjs`
**Kern-Hash nachher:** `05eb2a4b2aa66400` · **Tests:** 348 grün
**Quelle:** Google-Docs-Kommentare aus REVIEW-de-systemprompts.docx; Freigabe der Liste am 10.07. Alle Änderungen de **und** en (Spiegel-Fassungen), Wortlaute unten zum Nachreview.

## Beschlossen & umgesetzt

**[11]+[12] · klaerungsPrompt-Intro:** „du weißt nichts über ihn/sie" → „…über {partner}"; „Antworte auf Deutsch" → „Antworte auf Deutsch (der vereinbarten Paarsprache)". Zu deiner {locale}-Frage: Kein Platzhalter nötig — die Sprachwahl läuft über die Korpus-Trennung (jedes Korpus trägt die Anweisung in seiner eigenen Sprache, was fürs Modell die stärkste Form ist); Konsistenz-Check über alle sechs Prompts beider Korpora gemacht, dies war die einzige Lücke.

**[16] · Wort-Klärung, BEIDE Stellen** (Gewalt-Nähe-Klärung im reflexionsPrompt UND Weichen-Klärung im klaerungsPrompt — dein Kommentar zeigte auf die zweite, die S31c-Symmetrie saß nur an der ersten): Beispiel jetzt offen — „Magst du noch sagen, auf welche Art oder wodurch du dich angegriffen fühlst?"; Regel: von dir aus keine Deutungsrichtungen; nennst du doch welche, dann beide gleichgewichtig und unausgeschmückt (Kanarien-Pin erhalten). ESK-07 bleibt v2 wie entschieden.

**[8] · Redaktion:** Die Rückfrage lautet offen „Trifft das noch den Kern dessen, was du sagen willst?" (an beiden Stellen: TEILEN im reflexionsPrompt, Sorgen-Umformung im klaerungsPrompt). Neu als REDAKTIONS-PRINZIP: „Redaktion macht konkreter, nicht weicher – ‚letzten Dienstag' statt ‚immer'; Abschwächung ist nie das Ziel, und das sagst du {name} auch ausdrücklich so."

**[3]+[5]+B4 · Bitte um Vorschlag:** „Fassungs-Vorschlag" heißt jetzt **Formulierungsvorschlag** (alle Stellen; im Nutzer-gerichteten mein.intro „…hilft dir dann bei einer Formulierung"). Vorschläge kommen IMMER aus der Ich-Perspektive und enden mit Rückfrage („Wenn ich meine Perspektive zur Verfügung stellen soll, würde ich denken … – wie klingt das für dich?"). Indirekte Bitte erkannt: Auf „Ich weiß es nicht" erst die Wahl anbieten (Zeit vs. Alternativen), erst auf Ja der Vorschlag („Was fühlt sich für dich stimmiger an – X oder Y, oder doch Z?").

**[1] · Spiegel-Grammatik, alle vier Varianten** (reflexions- lang, klaerungs-/aufloesungs- mittel, aufdeck- kurz): positiv gedreht — Urteile bleiben verboten (inkl. positiver), aber „Spiegeln aus der Ich-Perspektive ist dagegen ausdrücklich erwünscht – verwerfbar und mit Rückfrage", mit deinem Beispiel „Für mich klingt das wie ein sehr zentraler Punkt – was denkst du?" als erste Referenz. Die SYC-05-Schutzpins (Das klingt nach/wie · Das ist ein großer Satz · ERSETZT das Urteil) tragen im neuen Wortlaut weiter.

**[2] · Absichtsfrage** ergänzend zur Funktions-Frage im Zeugen-Abgleich („je nach Situation"): „Ich erlebe Menschen, die sich nicht liebevoll verhalten, oft selbst in Not: Es scheint absichtsvoll rücksichtslos, im inneren Erleben ist es eher Angst oder Verletzung, die drängt. Falls du für so eine Frage offen bist – was könnte {partner} so in Not gebracht haben?"

**[14a] · Vertagungs-Tonlage:** „Lass uns dieses wichtige Thema für später aufheben – ich komme darauf zurück. Für den Anfang ist es wichtig, dass wir uns erstmal einen Überblick verschaffen, deshalb würde ich dich gern noch weiter fragen …"

**[6] · Vorstellungs-Stufe:** ausdrücklich als angeleitete Imaginationsübung („Magst du dir diesen Moment einmal in Ruhe vorstellen – was passiert da bei dir?") plus Selbstberührung als Selbstregulation (Selbstumarmung; langsames Streichen unter dem Schlüsselbein). Ko-Regulations-Grenzen gewahrt: Selbst-, nicht Fremdregulation.

**[7] · Sicherheits-Weiche differenziert:** „Auch die normale Verletzlichkeits-Unsicherheit beim Teilen von Intimem (‚kommt das gut an bei jemandem, der mir wichtig ist?') ist KEIN Quer-Stopp, sondern ein Explorations-Anlass: benenne sie, erkunde sie – und begleite die Querung, wenn {name} sie weiterhin will." Die harte Weiche für Angst vor der REAKTION bleibt unverändert davor.

**[9] · Teilen sichtbar machen:** (a) `mein.intro` (de+en) erklärt jetzt die Teilen-Möglichkeit samt Häkchen-Hoheit. (b) Prompt-Regel: Teilen-Angebot während der Session weiter nur bei markierter Wiederkehr; **beim Sitzungsabschluss zusätzlich genau EINE offene, druckfreie Frage**, ob etwas geteilt werden mag — Nein bleibt in beiden Fällen ohne Nachhaken.

**[4]+[10] · Begriffe:** Formulierungsvorschlag s. o.; „Markdown-Zäune" bleibt (Modell-Publikum, geläufiger Begriff).

**[0]+C1 · Umbenennungen (code-intern):** `reflexionsPrompt`, `klaerungsPrompt`, `aufloesungsPrompt`, `momentPrompt`, **`qzMenuePrompt`**, `aufdeckPrompt`; produktweit **Fächer → Menü** (Kommentare, Testtitel, Schema-Kommentar — in Nutzer-Texten kam „Fächer" nicht vor).

## Vorgemerkt als eigene Sprints (Designnotizen)

- **Single Source of Truth** für HALTUNG und wiederkehrende REGELN (Kommentare 13/14b): Prompt-Baukasten; ich liefere vorab eine Duplikat-Analyse der mehrfach vorkommenden Sektionen.
- **Skalierungsfragen als Slider** (Kommentar 15): alle Skalierungsfragen inkl. „single point of Sicherheitsskalierung" — verbindet sich mit der offenen Backlog-Frage zur Sicherheits-Skala-Nachforschung und ggf. dem SSOT-Sprint.

## Nach diesem Patch

Betroffen sind Sicherheits-Weiche, Wort-Klärung, Spiegel-Grammatik und Redaktion — Bestätigungslauf empfohlen:
```
npm run eval -- --familie ESK && npm run eval -- --familie GATE && npm run eval -- --familie SYC
```
Weitere Kommentare aus deinem laufenden Review werden ein Folgepaket (S32b) derselben Runde.

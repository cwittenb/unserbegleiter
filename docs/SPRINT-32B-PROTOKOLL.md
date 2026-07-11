# Sprint 32b — Prompt-Review Runde 2 (Kommentare 18–36) + v2-Flag-Ausbau

**Datum:** 2026-07-11 · **Basis:** origin/main 6bd4561 (enthält s31c2 + S32a) · **Patch:** `patch-s32b-prompt-review-2.mjs`
**Kern-Hash nachher:** `7238c1164ad4cdc7` · **Tests:** 349 grün (+2 Kanarien, +1 Sorgen-fest-Test, −1 v1-Test)

## v2-Flag entfernt — es gibt nur noch v2 (Kommentar 21)

Die Sorgen-Strecke (2f, Sorgen-Weiche, Umformung, CS/CG, Triangulation, Pausenmarke nach Sorgen) ist fester Bestandteil beider Prompts. Konkret: `klaerungsPrompt(name, partner)` / `aufloesungsPrompt(nameA, nameB)` ohne drittes Argument; alle `${v2 ? …}`-Blöcke fest eingebaut (inkl. der v1-Fallback-Zweige entfernt — z. B. „Vermutete Befürchtungen NICHT erheben"-Pfad); „(nur v2)"-Labels und Prosa-Erwähnungen raus (de+en); Aufrufer (kernwetten, eval-runner) und Eval-Kontexte bereinigt; v1-Kanarien durch „Sorgen-Strecke ist fester Bestandteil" ersetzt. Die v2-flag-spezifikation bleibt als historisches Dokument.

## Prototyp-Framing raus (Kommentare 24/26)

„Du bist ein KI-Begleiter für Paare." ersetzt „…im Testlauf eines Paar-Begleitsystems (App-Version)" (klaerungs + aufloesungs, de+en); Begrüßungs-Anweisung „(KI, Testlauf)" → „(KI, kein Mensch)"; reflexionsPrompt „im Prototyp eines Paar-Begleitsystems" → „in einem Paar-Begleitsystem". Fürs Modellverhalten war das Framing nicht tragend — es prägte nur die Selbstbeschreibung. Der einheitliche Identitäts-Baustein (auch momentPrompt) kommt in S33b.

## Textänderungen (de + en, Wortlaute = deine Kommentare)

- **[18]+[19] Rate-Runden-Rahmung:** „Jetzt lass uns die Blickrichtung wechseln. Mache den Versuch, die Welt – vor allem eure Beziehung – aus den Augen von {partner} zu sehen. Mal angenommen, ich würde {partner} die Fragen von eben stellen: Was würde er wohl antworten?" + „Es ist geraten … Natürlich könnte man {partner} auch direkt fragen – aber {name}s Bild von {partner} ist ebenso wertvolle Information, weil es eine empathische Grundlage für das gemeinsame Gespräch legt."
- **[25]** Mandats-Rückfrage: „{nameA}, ist das für dich so stimmig? Und {nameB}, für dich?"
- **[29]** Selbst-geklärt: „…magst du kurz erzählen, wie es gelungen ist – und was es jetzt für einen Unterschied für eure Beziehung macht?"
- **[32]+[33]+[31] Live-Übersetzung, jetzt mit Erlaubnis:** Erst das Angebot („…möchtest du einen Vorschlag hören?"), erst auf Ja die Übersetzung („Ich höre darunter: ‚…' – trifft es das?"), dazu der Prinzip-Satz „Die Übersetzung verwandelt Defizitorientierung in Zielorientierung (vom Vorwurf zum Wunsch)." Mechanik-Änderung: Konsens vor Übersetzung, kostet einen Zug — gewollt.
- **[30] Schiedsrichter-Verweigerung, deine Fassung** (neuer Kanarien-Pin): „In unserem Setting geht es darum, verschiedene Perspektiven nebeneinander zu legen, anstatt zu urteilen, wer recht hat – vor allem, weil ich glaube, es würde schlicht nicht weiterhelfen. Lass uns lieber schauen, was hinter euren beiden Positionen liegt." (EN bleibt deine gefeilte Fassung.)

## Beantwortet / verortet

**[20]** Bereichs-Klick existiert ([[PARTNER-GUESS-CHANGE]]-Panel). **[35]** war Review-Dokument-Text. **[22][23][31][34][27]** → S33b-Baustein-Liste. **[28]** → S34 als [[CHOICE]]-Widget. **[36]** → eigener Folge-Sprint (QZ-Wunschzettel). Alles in `docs/designnotiz-s33-s34-plan.md` (im Patch enthalten, ersetzt die Erstfassung der Analyse).

## Nach diesem Patch

Der v2-Ausbau und die Übersetzungs-Mechanik berühren AUF/SPA/SYC-Terrain, das Framing die Selbstvorstellung:
```
npm run eval -- --familie AUF && npm run eval -- --familie SYC && npm run eval -- --szenario SPA-01
```

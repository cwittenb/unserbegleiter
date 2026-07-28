# Sprint T2-5 · Chat-Wegweiser und Schreibkante (Turn 40 §3.7, §3.8)

Basis: `origin/main` @ `22a150a` (T2-4 gemergt) · Kern-Hash nach Patch: `433f994b3e93163f`
Suite: 1829 grün (Basis 1813 + 16 neue)

Umgesetzt: **T2h · Schreibkante full-bleed** (K3), **T2i · Badge wird Knopf** (K4/K5, §3.7),
**T2k · Hinweiszeile im Start-Panel** (K7).

Damit sind alle neun Findings aus §3 des Handovers abgearbeitet — bis auf den in T2-3 §3
dokumentierten Rest (**T2d-2**).

---

## 1 · §3.7 · Die Badges bekommen eine eigene Adresse

**Vorgefunden:** die Vorraum-Badges und das Chat-Badge zogen ihre Beschriftung aus
`start.capsMein` / `start.capsTeil` — Schlüsseln aus dem **Startseiten**-Bereich des Wörterbuchs.
Eine geliehene Adresse: hätte die Startseite ihr Caps-Label geändert, wären stillschweigend drei
Badges mitgewandert.

**Neu:** `weg.badgeMein` / `weg.badgeTeil`, Werte identisch zum Ist. Nach außen ändert sich nichts.
Die Startseite behält `start.capsMein` / `start.capsTeil` für ihre **eigene** Aufgabe (die
Caps-Label über den Betreten-Zeilen) — die Schlüssel bleiben also in Gebrauch, nur eben für das,
wofür sie gedacht waren.

**Kleinentscheidung:** `weg.badge` („Wegweiser") bleibt, wie es ist. Der Handover nennt einen
dritten Schlüssel `weg.badgeStart`; der wäre reine Umbenennung, denn `weg.badge` liegt bereits im
richtigen Namensraum und wird nur an dieser einen Stelle benutzt. Eine Umbenennung hätte einen
verwaisten Schlüssel hinterlassen, ohne etwas zu gewinnen.

---

## 2 · T2i · Das Chat-Badge ist ein Knopf

**Kehrtwende gegenüber D12-2b.** Dort war das Badge bewusst eine Marke: `cursor:default`, ein
`<span>`, es öffnete nichts. Turn 40 will einen Knopf daraus machen. Die Regel ist entfallen —
`.rz-weg-badge` bringt `cursor:pointer` ohnehin mit — und der D12-2b-Kommentar sagt jetzt, was
gilt und warum es sich geändert hat.

**Der Fallstrick war die S87-Vorlagenmechanik.** `scrChat` ist seit S87 eine Vorlage: beim
Verlassen wird `innerHTML` geleert, beim Betreten neu gebaut. Eine Verdrahtung aus der Boot-Phase
— so wie die drei Vorraum-Badges es machen (`app.js` Z. 1228–1230) — hinge nach dem ersten Abbau
an einem Knoten, den es nicht mehr gibt: das Badge ließe sich genau einmal öffnen, danach nie
wieder. Der Aufruf steht deshalb in `verdrahteChat()`, das bei **jedem** Aufbau läuft.

Ein Test öffnet das Panel deshalb nicht nur beim ersten Mal, sondern nach einem Raumwechsel
(Chat → Vorraum → Chat). Das ist der eigentliche Test dieses Schritts.

### Die Stufen bedeuten im Gespräch etwas anderes

In den Vorräumen sind die vier Stufen **Dringlichkeit**: Stufe 1 ist Begonnenes, das wartet.
Das passt dort, weil man **vor** etwas steht und wählt. Im Chat ist man **drin** — und eine Zeile
„hier wartet noch etwas anderes" wäre eine Aufforderung, das Gespräch zu verlassen.

`wegKandidatenChat()` belegt die Stufen deshalb mit der Prioritätskette der Haltungs-Charta
(Regel 7):

| Stufe | Vorräume | Chat |
| --- | --- | --- |
| 1 | Begonnenes fortsetzen | **Sicherheit** — wer sieht, was hier steht |
| 2 | nächster Kernschritt | **Stabilität** — du kannst aufhören, dein Stand bleibt |
| 3 | Neues eingetroffen | **Kontakt** — was von hier zu {partner} gehen kann |
| 4 | stehende Einladungen | **Deutung** — wo du gerade stehst |

Das Panel sagt also zuerst „das hier ist vertraulich" und erst zuletzt „du bist bei Kapitel 2".

**Daraus folgt: kein wartender Punkt.** Es gibt keine Stufe mehr, die „hier wartet etwas"
bedeutet. `rz-wartet` wird im Chat nie gesetzt; ein Test hält das fest.

### Texte je Format

| `def.id` | Stufe 1 | Stufe 2 | Stufe 3/4 |
| --- | --- | --- | --- |
| `solo` | `chatVertraulich` | `chatPauseAbschluss` | `chatTeilen` |
| `einzel` | `chatVertraulich` | `chatKapitel` *(Rückfall `chatPause`)* | `chatFreigabe` |
| `moment` | `chatGemeinsam` | `chatPauseAbschlussTeil` | `chatQzRahmen` (4) |
| `gemeinsam` | `chatGemeinsam` | `chatPauseTeil` | `chatBefund` |
| `qualitytime` | `chatGemeinsam` | `chatPauseTeil` | `chatAufdeck` |

**Bewusst über `wegKandidaten`/`waehleWegzeilen` gebaut, obwohl es je Format genau drei Zeilen
sind** — der Deckel greift also nie. Weitere Lagen (erste Nachricht noch nicht geschrieben,
Ausschnitt-Tür offen, Freigabe steht an, Partner hat noch nicht abgegeben) sind so rein additiv
nachrüstbar, ohne Strukturänderung. Kostet jetzt nichts.

**Nachziehen.** Der Chapter-Stand ändert sich während der Session. Das Panel wird deshalb aus
`aktualisiereChatEnde()` mitgezogen — der Funktion, die ohnehin die Schreibkante mit dem
Sessionzustand synchron hält. Der Wegweiser sitzt in der Schreibkante; er gehört dorthin.

**Textkorrekturen sind ab jetzt Light-Lane:** i18n-Paritätstest plus eine gezielte Assertion,
keine volle Zeremonie.

---

## 3 · T2k · Die Hinweiszeile (K7)

Deine Auflösung war besser als beide meiner Vorschläge: der Hinweis steht **im Panel** der
Startseite, nicht auf der Zone. Damit entfällt die Merker-Frage — wer das Panel öffnet, hat den
Wegweiser bereits gefunden und lernt nur noch, dass es ihn überall gibt. Kein `pstate`, keine
Bedienungsanleitung im Ruhezustand.

> Wo immer du das Wegweiser-Schild siehst, findest du einen Vorschlag für den nächsten Schritt.

**Bewusst kein vierter Kandidat.** Als Kandidatenzeile würde der Hinweis eine echte
Wegweiser-Zeile verdrängen, sobald der Deckel von drei greift. Er ist deshalb ein eigenes Element
zwischen den Optionen und der Fußzeile. Ein Test prüft, dass beide nebeneinander stehen.

Gesetzt mit `--rz-fs-fein` und `--rz-sek` — leiser als eine Option, lauter als die Fußzeile:
er trägt Bedeutung, während „tippen zum Schließen" nur eine Geste nennt.

Das Wegweiser-Zeichen ist ein SVG (Pfosten und Schild, `html.js` Z. 43), kein Schriftzeichen.
Der Text **benennt** es deshalb, er zeigt es nicht.

---

## 4 · T2h · Die Schreibkante wird eine Zone (K3)

**Vorgefunden:** `.rz-chat-innen` ist eine 640-px-Lesespalte; die Schreibkante blutete nur um das
Screenpolster aus. Auf 1280 px stand ein 688 px breites Tiefgrün-Rechteck frei auf Papier — weder
Zone (die geht bis zur Kante) noch Karte (die hätte einen Radius).

```css
@media(min-width:900px){
  .rz-app #scrChat{overflow-x:clip}
  #scrChat .rz-chat-unten{
    margin-left:calc(50% - 50vw);margin-right:calc(50% - 50vw);
    padding-left:calc(50vw - var(--rz-chat-spalte) / 2);
    padding-right:calc(50vw - var(--rz-chat-spalte) / 2)}
}
```

Der Block reicht von Kante zu Kante, sein **Inhalt** bleibt auf der Lesespalte — Composer und
Verlauf stehen bündig.

**Neuer Token `--rz-chat-spalte:640px`.** Die Breite wurde an zwei Stellen gebraucht: als
`max-width` der Spalte und als Rechengröße für das Ausbluten. Dieselbe Kopplung wie bei
`--rz-rand` in T2a — zwei Zahlen, die zusammenpassen müssen, gehören an eine Stelle.

**`calc(50% - 50vw)` statt `100vw`:** Prozente rechnen gegen die Spalte, die Differenz ist genau
der Weg nach außen. Ein nacktes `100vw` bräuchte zusätzlich eine Mittenkorrektur.

**Und der Rest, den `vw` nicht wissen kann:** `50vw` zählt die Bildlaufleiste mit, der sichtbare
Bereich ist schmaler. Ohne Gegenmaßnahme steht bei langem Verlauf ein waagerechter Bildlauf von
wenigen Pixeln da. Abgefangen mit `overflow-x:clip` am Screen — **`clip`, nicht `hidden`**:
`hidden` würde einen Rollbereich eröffnen und die senkrechte Bewegung an sich reißen. Da
`#scrChat` seinen Padding-Kasten über die volle Breite spannt, wird das Ausbluten selbst nicht
geklippt, nur der Überstand.

Ein Test prüft beides: `clip` steht da, `hidden` nicht — und im ≥900px-Block der Schreibkante
kommt kein nacktes `100vw` vor. (Anderswo ist `100vw` legitim: das Einstellungs-Blatt begrenzt
damit seine Breite, es blutet nicht aus.)

**Kein Radius.** Ein Test hält fest, dass die verworfene Karten-Variante nicht danebensteht.

---

## 5 · Angepasster Bestandstest

`d12-2b-regal-chat.spec.js` prüfte „das Ortsbadge ist eine Marke, kein Knopf" (`tagName === "SPAN"`).
Das ist die Aussage, die Turn 40 ausdrücklich umkehrt. Der Test heißt jetzt „nennt den Ort **und**
öffnet den Wegweiser" und prüft `BUTTON`, `aria-haspopup` und die Beschriftung. Der Kommentar
darüber nennt die Kehrtwende beim Namen, damit niemand sie für ein Versehen hält.

---

## 6 · Der Wächter (`tests/unit/t2-chat-wegweiser.spec.js`, 16 Tests)

- Knopf, Panel, `aria-haspopup`; Öffnen und Schließen.
- **Öffnen nach einem Raumwechsel** — der eigentliche Test der S87-Vorlagenmechanik.
- Kein `rz-wartet` im Chat.
- Drei Zeilen plus Fußzeile; Stufe 1 steht vorn.
- Hinweiszeile nur im Start-Panel, nicht in den Vorräumen, nicht im Chat.
- Hinweiszeile verdrängt keine Option.
- `weg.badge*` und `weg.hinweisStart` in DE **und** EN; kein Badge leiht sich mehr die
  Startseiten-Schlüssel; die Startseite behält ihre Caps-Label.
- Lesebreite aus dem Token; Ausbluten mit `calc(50% - 50vw)`; kein nacktes `100vw`;
  `clip` statt `hidden`; kein Radius; kein `cursor:default` mehr.

---

## 7 · Prüfliste für die Sichtprüfung (Stufe B)

| # | Was | Wo |
| --- | --- | --- |
| 1 | Chat-Badge lässt sich antippen, das Panel klappt aus der Naht | Chat, hell + dunkel |
| 2 | **Chat verlassen, wieder betreten, Badge erneut antippen** | Reflexionsgespräch |
| 3 | Kein Punkt am Chat-Badge — auch wenn im Regal etwas Neues liegt | gemeinsame Session |
| 4 | Panel-Texte lesen sich im Gespräch richtig — Ton, Reihenfolge, Länge | alle fünf Formate |
| 5 | Auftragsklärung: „Kapitel n von m" stimmt und zieht mit | `einzel`, mehrere Kapitel |
| 6 | Startseite: Hinweiszeile steht unter den Optionen, über „tippen zum Schließen" | Startseite, hell + dunkel |
| 7 | Schreibkante geht von Kante zu Kante; Composer bündig mit dem Verlauf | 1280 × 800 |
| 8 | **Kein waagerechter Bildlauf** bei langem Verlauf | 1280 × 800 |
| 9 | Bäume auf der Naht laufen über die volle Breite mit | 1280 × 800, hell |
| 10 | Mobil unverändert | 390 × 844 |

Punkt 2 ist der Vorlagen-Test, Punkt 8 der Bildlaufleisten-Test, Punkt 4 die eigentliche
Textabnahme — **dort erwarte ich Korrekturen.**

---

## 8 · Offen

- **Punkt 4 der Prüfliste** · die `weg.chat*`-Texte sind mein Entwurf. Korrekturen laufen als
  Light-Lane.
- **T2d-2** · das Hüllelement, falls die niedrige Fensterhöhe stört (`SPRINT-T2-3-PROTOKOLL.md` §3).
- Vier Kontraststellen aus `SPRINT-T2-2-PROTOKOLL.md` §4 — darunter `.rz-weg-fuss` bei 2.30 : 1,
  die jetzt direkt neben der neuen Hinweiszeile steht und dadurch auffälliger wird.
- Echo-Zeile in der Leseansicht (`SPRINT-T2-4-PROTOKOLL.md` §3, Nebenbefund).
- **Track T3 · Inline-Styles auflösen** — `auswahl-screen.js` (13 Stellen),
  `recovery-screen.js` (3 mit rohen Farbliteralen), `panels.js` (1).

# Sprint S120 · Ein Kanal, auf dem eine Störung ankommt — und Mails, die nach etwas aussehen

**Basis:** `origin/main` @ `291cbce` (`patch-s119-1-bstate-whitelist-und-waechter`)
**Kern-Hash nach dem Sprint:** `3fdd24d0577cc38b`
**Entscheidungen:** F1 = Telegram · F2 = zusammen in einem Sprint · F3 = ja
(Anzeigename einbauen, `SMTP_FROM` als faktische Pflicht dokumentieren)

> **Zur Nummer:** `S119` war beim Klonen schon vergeben (`patch-s119-1-bstate-whitelist-und-waechter`,
> ein paralleler Strang zur Bstate-Whitelist). Dieser Sprint heißt deshalb S120
> und setzt auf jenem Stand auf.

---

## Warum beides ein Sprint ist

Zwei Dinge mit demselben Ursprung: Was raumzuzweit nach außen schickt, war
weder **beobachtet** noch **gestaltet**. Der HELO-Fehler (S117) blieb
monatelang unentdeckt, weil niemand etwas merkte — und die erste Mail, die ihn
endlich passierte, sah aus wie ein Skript-Auswurf: `From: praxis@carstenwittenberg.de`,
nackter Text, keine Wortmarke. Wer den Zugangslink bekommt, hat die App noch
nie gesehen. Das war das Erste, was von ihr ankam.

---

## Teil A · Der Meldekanal

### `betriebsmeldung.js` (neu)

Telegram, ein einziger `fetch` auf `api.telegram.org`, zwei Secrets
(`TELEGRAM_TOKEN`, `TELEGRAM_CHAT`). Der Kanal ist eine austauschbare Schicht —
dieselbe Trennung wie beim Mailer und beim LLM-Adapter; ntfy oder ein Webhook
wären eine Funktion daneben.

**Warum nicht per Mail:** Die erste und häufigste Störung *ist* der
Mailversand. Eine Störungsmeldung, die über den gestörten Weg läuft, kommt
zuverlässig dann nicht an, wenn sie gebraucht wird.

Drei Regeln, und sie sind der Grund, warum das ein eigenes Modul ist:

**1 · Niemals Nutzerinhalte.** Eine Betriebsmeldung sagt, *dass* etwas klemmt
und *wo* — Zweck, Stufe, Antwortcode. Nie, wem. Der Aufrufer trägt die
Verantwortung, aber Verantwortung allein hat noch nie etwas verhindert:
`ohneAdressen()` fischt E-Mail-Adressen und Zugangslinks auch dann heraus, wenn
jemand sie versehentlich in eine Meldung packt. Ein Netz unter dem Vorsatz, mit
eigenem Test.

**2 · Gedrosselt.** Ein kaputtes SMTP erzeugt eine Störung je Versuch — ohne
Deckel hundert Nachrichten in einer Stunde, und die hundertzweite liest niemand
mehr. Je Schlüssel eine Meldung pro Stunde, und der Schlüssel benennt die **Art**
der Störung (`mail/RCPT`), nicht ihr Auftreten. Der Deckel steht **vor** dem
Senden: lieber eine Meldung zu wenig als ein Schwall — wer es genau wissen will,
hat `/api/mailstat`.

**3 · Best-Effort.** `melde` wirft nie. Der Aufrufer steckt mitten in einem
Request; eine gescheiterte Benachrichtigung darf ihn nicht mitreißen. Dieselbe
Linie wie `mailstat.js`.

Ohne Konfiguration bleibt alles still. Das ist kein Fehler, sondern der Zustand
vor der Einrichtung.

### Angeschlossen und prüfbar

`mailer.js` meldet bei jedem gescheiterten Versand (gedrosselt je Stufe).
`POST /api/meldetest` (admin-gated) und der Knopf **„Meldeweg prüfen"** in der
Verwaltung senden ohne Drosselung und geben den Fehler **zurück**, statt ihn zu
schlucken — hier ist der Fehler die Auskunft. Ein Kanal, den niemand je geprüft
hat, ist genauso viel wert wie ein Mailversand, den niemand je geprüft hat.

---

## Teil B · Die Gestalt der Mails

### `mail-gestalt.js` (neu) — die Gestalt entsteht **aus** dem Text

Der naheliegende Weg wären HTML-Vorlagen je Mailart gewesen: vier Stück, dazu
der freie Betreiber-Rundbrief. Damit gäbe es jeden Satz zweimal — einmal als
i18n-Schlüssel, einmal im Markup. Zwei Fassungen desselben Satzes driften.

Stattdessen liest `baueHtml` den fertigen Text und erkennt seine drei Gestalten:

| im Text | wird zu |
|---|---|
| eine Zeile aus 4–8 Ziffern | der Bestätigungscode, groß und gesperrt |
| eine Zeile, die nur ein Link ist | die Zugangs-Zeile mit Haarlinie |
| alles andere | ein Absatz |

Die i18n-Schlüssel bleiben die einzige Quelle. Neue Mailarten und der freie
Rundbrief bekommen die Gestalt geschenkt, ohne dass jemand daran denken muss —
und der Rundbrief geht durch dieselbe Escaping-Tür.

**Kein eigenes Farbliteral.** Die Werte werden aus `THEME_CSS` *gelesen*, nicht
abgeschrieben (`--rz-papier`, `--rz-ink`, `--rz-hairline`, `--rz-marke`,
`--rz-serif`, `--rz-sans`), und nur aus dem `:root`-Block — eine Mail ist immer
hell, denn in welchem Modus welches Programm sie anzeigt, weiß hier niemand.
Fehlt ein Token, wird geworfen: lieber laut als grau. Die Datei steht dafür
selbst mit auf der Prüfliste der T1b-Kanarie.

**Was bewusst fehlt:** Bilder (werden von Haus aus blockiert und wären ohne
Alternative eine leere Fläche), Webfonts (laden in kaum einem Mailprogramm),
Radien und Schatten (gibt es in dieser Designsprache ohnehin nicht). Übrig
bleibt, was die App auch ausmacht — Papier, Haarlinie, Serifentitel, gesperrte
Wortmarke. Genau deshalb überlebt das in Outlook: es besteht aus nichts, was
kaputtgehen kann.

### `baueNachricht` — drei Anmerkungen aus einer echten Mail

Der Spamfilter der Gegenstelle hat sie ins Protokoll geschrieben, zusammen
1,5 Punkte:

* `MISSING_MID` — wir setzten keine `Message-ID`, der empfangende Server erfand
  eine. Eine Nachricht ohne eigene Kennung riecht nach Skript.
* `CTE_8BIT_MISMATCH` — wir kündigten `charset=utf-8` an, schickten die Bytes
  roh und nannten kein `Content-Transfer-Encoding`.
* Ungenannt, aber sichtbar: kein Anzeigename.

Die Antwort auf die zweite ist **base64 für beide Teile**. Nicht der sparsamste
Weg, aber der einzige, der drei Fallen auf einmal schließt: keine 8-Bit-Frage,
keine Zeilenlängengrenze — und **kein Dot-Stuffing**. Die frühere Ersetzung von
`\n.` durch `\n..` ist ersatzlos entfallen, weil das base64-Alphabet keinen
Punkt kennt.

Der Rumpf ist jetzt `multipart/alternative`: der Klartext bleibt unverändert die
erste Fassung und die einzige, auf die man sich verlassen kann; die Gestalt
kommt daneben. Wessen Programm kein HTML zeigt, verliert nichts.

Der Anzeigename wird nur kodiert, wenn er Nicht-ASCII enthält — reines ASCII
bleibt in Anführungszeichen lesbar. Er kommt aus `mt("allg.marke")`, also in
der Sprache des Paars (R7): „raumzuzweit" bzw. „roomfortwo".

**Erzeugt wird die Gestalt im Mailer**, nicht an den Aufrufstellen — dieselbe
Begründung wie beim Befund-Zähler in S118: was man an jeder Aufrufstelle von
Hand mitgeben muss, fehlt an der sechsten. Die vier R7-Stellen reichen nur
`marke` und `fuss` in der Sprache des Paars durch.

Ein neuer i18n-Schlüssel je Sprache: `mail.fuss` (die leise Fußzeile — diese
Nachricht kommt nur, wenn jemand sie anfordert; Werbung nie).

---

## Tests

| Datei | Was |
|---|---|
| `tests/unit/s120-meldeweg-und-mailgestalt.spec.js` (neu) | 18 Fälle, Schwerpunkt auf den Negativ-Aussagen — bei einem Meldekanal ist das Gefährliche nicht, dass er schweigt, sondern dass er zu viel sagt. Ohne Konfiguration passiert nichts; ein kaputter Kanal wirft nicht; dieselbe Störungsart meldet sich einmal je Fenster, eine andere kommt durch; der Deckel steht vor dem Senden; Adressen und Zugangslinks werden herausgefischt, auch wenn der Aufrufer unachtsam war; die Linkvorschau bleibt aus. Dazu die Gestalt: Code und Link werden erkannt, ein freier Text bekommt dieselbe Form ohne eigene Vorlage, Auszeichnung im Text wird entschärft, Marke und Fußzeile kommen in der Sprache des Paars, kein `<img>`, kein `@import`, kein Radius, kein Schatten — und jede Farbe steht so auch im Theme. |
| `tests/unit/mailer.spec.js` | Der RFC-Test wechselt den Gegenstand: statt Dot-Stuffing jetzt `Message-ID`, `Content-Transfer-Encoding: base64` und der Nachweis, dass der Punkt am Zeilenanfang die Kodierung unbeschadet übersteht. Neu: Anzeigename (kodiert nur bei Bedarf) und `multipart/alternative` mit dem Klartext als erster Fassung. Der Upstream-Test prüft, dass die Gestalt über jeden Weg mitreist. |
| `tests/unit/t1b-theme.spec.js` | `mail-gestalt.js` steht mit auf der Prüfliste. Der Kommentar dort sagt es schon: nicht der Ort entscheidet, sondern ob gestaltet wird. |

## Abnahme

```
npx vitest run                → 263 Dateien, 2570 Tests, alles grün
PAARE_KV_ID=… npm run build   → Kern 3fdd24d0577cc38b
```

---

## Einrichtung nach dem Deploy

**1 · Telegram.** Bei `@BotFather` einen Bot anlegen (`/newbot`), den Token
notieren. Dem Bot **einmal selbst schreiben** (sonst darf er nicht antworten),
dann `https://api.telegram.org/bot<TOKEN>/getUpdates` aufrufen und die
`chat.id` herauslesen. Danach:

```
npx wrangler secret put TELEGRAM_TOKEN
npx wrangler secret put TELEGRAM_CHAT
```

Verwaltung → **„Meldeweg prüfen"**. Kommt die Nachricht an, steht der Kanal.

**2 · Absenderadresse.** In dieser Reihenfolge, sonst wird es schlechter als
vorher:

1. Provider (maketank) fragen, ob `begleitung@raumzuzweit.de` als Absender für
   den Account freigegeben werden kann — sauberer ist ein **eigenes Postfach**
   mit eigenen Zugangsdaten, dann wandern auch `SMTP_USER`/`SMTP_PASS` mit.
2. DNS für `raumzuzweit.de`: SPF, der maketanks Sender einschließt, und der
   DKIM-Selector vom Provider. DMARC zunächst auf `p=none` zum Beobachten.
3. `npx wrangler secret put SMTP_FROM` → `begleitung@raumzuzweit.de`. Das
   ändert `MAIL FROM`, den `From:`-Header **und** den abgeleiteten HELO-Namen
   (dann `raumzuzweit.de`).
4. Verwaltung → **„Weg prüfen"** mit Haken, dann in Gmail „Original anzeigen"
   und die drei `pass` kontrollieren.

## Was offen bleibt

* **Die Meldung geht nur bei Mailfehlern raus.** Der LLM-Ausfall und ein
  fehlendes Secret beim Start wären die nächsten Anschlussstellen — `melde()`
  ist dafür fertig, es fehlt nur der Aufruf an der jeweiligen Stelle. Bewusst
  nicht mit hineingenommen: jede Anschlussstelle braucht ihre eigene Überlegung
  zum Drosselschlüssel, und ein Kanal, der beim ersten Einsatz überläuft, wird
  stummgeschaltet statt gelesen.
* **Der Kanal meldet, er fragt nicht.** Ein Telegram-Bot könnte auf Befehle
  antworten („Befunde", „Weg prüfen"), womit die Verwaltung aufs Telefon käme.
  Das ist ein eigener Sprint mit eigener Sicherheitsfrage — wer den Chat sieht,
  bedient dann den Betrieb.
* **Die Gestalt ist ungetestet in echten Programmen.** Die Tests belegen, was
  *nicht* drin ist; wie es in Outlook 2016, Apple Mail und Gmail-App aussieht,
  zeigt erst der Versand an ein paar echte Postfächer.

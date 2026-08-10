# Sprint S117 · Der Versand geht raus, und das Limit sperrt niemanden ein

**Basis:** `origin/main` @ `6f8552c` (`patch-s116-ein-verifikationsformular`)
**Kern-Hash nach dem Sprint:** `0db2fb3c1d7e3bb4`
**Entscheidungen:** F1 = ja (Zähler erst nach versandter Mail) · F2 = ja
(`verify_rate` öffnet den Notausgang sofort) · F3 = ja (Restzeit in der Antwort)

---

## Was der Auslöser war

Nach dem S115-Deploy kamen die Adress-Bestätigungen nicht an, und der
Pflicht-Screen zeigte nur „Zu viele Anfragen. Bitte etwas später erneut."
Der Notausgang griff nicht.

## Was der Betrieb zeigte

Ein `wrangler tail --format=json` auf `/api/email` lieferte die Ursache in einer
Zeile:

```
verify-mail: SMTP 504: 504 5.5.2 <paarbegleitung>: Helo command rejected:
             need fully-qualified hostname (nach RCPT)
```

`mailer.js` sagte wörtlich `EHLO paarbegleitung`. Das ist kein qualifizierter
Hostname; Postfix weist das mit `reject_non_fqdn_helo_hostname` ab. Dass es erst
bei `RCPT` knallt, ist Postfix-Eigenart — die Regel wird an der Empfänger-Stufe
ausgewertet, das `EHLO` selbst kam noch mit 250 durch. **Jeder** Adress-Versand
ist an dieser Stelle gestorben, seit es die Funktion gibt. Sichtbar war davon
nach außen nichts außer „Der Versand ist gerade nicht möglich".

Damit fiel eine zweite Sache auf, die für sich schon falsch war: Das
Raten-Limit zählte **vor** dem Versuch. Fünf gescheiterte Versuche haben ein
Konto eine Stunde gesperrt, ohne dass je eine Mail das System verlassen hätte.
Und die 429-Antwort nannte keine Frist — vor einem Screen, den man nicht
verlassen kann, ist „etwas später" keine Auskunft.

Und eine dritte, die mein Fehler aus S115 ist: Ich hatte `verify_rate` bewusst
nicht mitzählen lassen, weil es etwas über das Verhalten der Person aussagt und
nicht über den Kanal. Das war zu ordentlich gedacht. Ein Ratenlimit ist für die
nächste Stunde eine Wand, durch die niemand kommt — genau der Zustand, den der
Notausgang verhindern sollte, nur durch eine Tür, die ich nicht mitgezählt
hatte.

---

## Was geändert wurde

### Teil 0 · `platforms/cloudflare/worker/mailer.js` — der HELO-Name

Neue exportierte Funktion `heloName(env, from)`. Die Reihenfolge der Kandidaten
hat einen Grund:

1. `SMTP_HELO` — falls der Provider einen bestimmten Namen erwartet.
2. Die Domain aus `SMTP_FROM` — die konventionell richtige Wahl: HELO-Name und
   Absenderdomain sollten zusammenpassen.
3. `SMTP_HOST` — per Definition ein FQDN, taugt als letzte Rückfalllinie.

Trägt keiner davon einen Punkt (oder enthält Leerzeichen), wird fail-closed
geworfen statt in denselben 504 zu laufen — dieselbe Linie wie bei Port 25 und
fehlender Konfiguration. Ermittelt wird **vor** dem Verbindungsaufbau: ein
Konfigurationsfehler soll keinen Socket kosten und keine halbe SMTP-Sitzung
hinterlassen.

### Teil 1 + 3 · `platforms/cloudflare/worker/index.js` — `/api/email`

Der Zähler steigt erst **nach** erfolgreichem `sendMail`. Der Schutzzweck des
Limits richtet sich gegen versandte Mails; ein Request, der nie einen Empfänger
erreicht, gehört nicht gezählt. Tippfehler (`email_invalid`), belegte Adressen
(`email_taken`) und Versandstörungen (`mail_failed`) kosten damit keinen Slot
mehr.

Der KV-Eintrag hält jetzt `{ n, bis }` statt einer nackten Zahl — KV gibt die
Rest-TTL beim Lesen nicht heraus, anders wäre die Frist nicht nennbar. Die 429
trägt sie im Feld `retryAfter` **und** im `Retry-After`-Kopf. Altbestände (nackte
Zahl) werden gelesen, als begänne ihr Fenster jetzt: einmalig eine Stunde, dann
ist das Format überall neu.

Das Fenster ist **fest** ab dem ersten gezählten Versand, nicht gleitend: die
TTL schrumpft mit, statt bei jedem Versand neu zu starten. Sonst hält sich eine
Sperre selbst am Leben.

### Teil 2 · `core/ui/recovery-screen.js` + `platforms/cloudflare/pages/client.js`

`api()` reicht `retryAfter` ans Fehlerobjekt durch. Bei `verify_rate` mit Frist
sagt die Notiz „In etwa 31 Minuten geht es wieder" statt der fristlosen
Standardmeldung; die Sekunden werden auf Minuten aufgerundet, denn niemand
wartet auf die Sekunde. Fehlt die Frist (Antwort eines älteren Workers), bleibt
es beim bisherigen Text — die Oberfläche hängt nicht davon ab, dass der Server
schon auf S117 steht.

Der Notausgang unterscheidet jetzt zwei Wege hinein, und sie zählen verschieden:

* `mail_failed` braucht wie bisher **zwei** — einer kann ein Zucken sein.
* `verify_rate` öffnet beim **ersten** Auftreten. Es ist schon die volle
  Aussage: für die nächste Stunde kommt hier niemand durch.

Der Hinweistext über dem Ausgang unterscheidet die beiden Fälle
(`rec.pflicht.stoerung` vs. `rec.pflicht.stoerungRate`) — bei der Versandstörung
liegt es an uns, beim Ratenlimit an der Menge der Anfragen. Zwei neue i18n-
Schlüssel je Sprache dafür und für die Wartezeit (`rec.rateWarten`).

Unverändert: `email_invalid` und `email_taken` öffnen nichts. Sie sagen etwas
über die Eingabe.

### `scripts/build-pages.js`

Der generierte `wrangler.toml` erklärt `SMTP_HELO` samt der Postfix-Regel und
der Ableitungsreihenfolge — damit der nächste, der auf einen 504 schaut, nicht
wieder im Tail suchen muss.

---

## Tests

| Datei | Was |
|---|---|
| `tests/unit/mailer.spec.js` | Der Happy-Path-Test erwartet jetzt `EHLO smtp.example` (dort ist `SMTP_FROM` = `noreply@example`, die Domain trägt keinen Punkt → dritte Stufe) und ausdrücklich **nicht** mehr den alten Namen. Fünf neue Fälle für `heloName`: `SMTP_HELO` gewinnt, sonst die Absenderdomain, sonst `SMTP_HOST`; ohne Punkt fliegt der Fehler, und der Versand kommt gar nicht erst zum Socket; Leerzeichen zählen nicht als Hostname. |
| `tests/worker/recover.spec.js` | Der bestehende 429-Test prüft zusätzlich `retryAfter`. Neu: gescheiterte Versuche kosten keinen Slot (fünf 502er und ein 400er, danach sind beide Slots noch da); und die genannte Restzeit fällt über die Zeit, statt sich zu erneuern — der Beweis für das feste Fenster. |
| `tests/unit/s115-notausgang-versandstoerung.spec.js` | `verify_rate` wandert aus der Negativ-Liste heraus (die Aussage hat sich geändert, der Test lügt sonst) und bekommt vier eigene Fälle: ein einziges genügt; der Hinweis nennt einen anderen Grund als bei Versandstörung; die Wartezeit erscheint aufgerundet in Minuten; ohne mitgereiste Frist keine erfundene Minutenzahl. `email_invalid` und `email_taken` bleiben in der Negativ-Liste. |

## Abnahme

```
npx vitest run                → 260 Dateien, 2529 Tests, alles grün
PAARE_KV_ID=… npm run build   → Kern 0db2fb3c1d7e3bb4
```

## Nach dem Deploy — in dieser Reihenfolge

1. **Zähler aufräumen.** Die Altbestände sind lesbar, aber sie tragen noch
   Fehlversuche aus der kaputten Zeit:
   `wrangler kv key list --remote --namespace-id … --prefix "sys/veriflimit/"`,
   die gefundenen Schlüssel löschen.
2. `wrangler tail paarbegleitung --format=json` laufen lassen und **einen**
   Versuch machen. Status 200 ohne Log-Zeile heißt: die Mail ist unterwegs.
3. Kommt statt 200 wieder ein 502, steht der neue SMTP-Fehler im Klartext im
   `logs`-Array — dann ist es nicht mehr der HELO-Name.
4. Erst wenn eine PIN angekommen ist, gilt K1 („SMTP produktiv verifiziert")
   tatsächlich. Bis dahin war es eine Annahme.

## Was offen bleibt

* **Die Versandstörung meldet weiterhin nichts nach oben.** Der Notausgang fängt
  die Person auf, aber niemand erfährt, dass etwas klemmt. Dass dieser Fehler
  monatelang unentdeckt bleiben konnte, ist das eigentliche Argument für einen
  Zähler im Worker (`mail_failed` je Stunde) oder eine Test-Route, die den
  SMTP-Dialog auf Knopfdruck durchspielt.
* **`SMTP_HELO` ist nicht gesetzt** und muss es meistens auch nicht sein — die
  Ableitung aus `SMTP_FROM` trifft den Normalfall. Wenn dein Provider den
  HELO-Namen gegen die eigene Zone prüft, ist es der Griff dafür.

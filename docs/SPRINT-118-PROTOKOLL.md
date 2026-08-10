# Sprint S118 · Eine Versandstörung soll auffallen

**Basis:** `origin/main` @ `39d94aa` (`patch-s117-helo-fqdn-und-ratenlimit`)
**Kern-Hash nach dem Sprint:** `0db2fb3c1d7e3bb4` — **unverändert.** Der Sprint
fasst `core/` nicht an; alles liegt in `platforms/cloudflare/`.

---

## Was der Auslöser war

S117 hat den HELO-Namen repariert. Die unbeantwortete Frage blieb: **Warum
konnte dieser Fehler so lange unentdeckt bleiben?**

Nicht, weil es keine Spur gab. `console.error("verify-mail:", …)` schrieb sie
bei jedem Fehlschlag brav ins Log. Sondern weil ein Log nur findet, wer bereits
einen Verdacht hat. Nach außen stand immer derselbe Satz — „Der Versand ist
gerade nicht möglich" — und niemand hatte einen Grund, dahinter zu schauen. Ein
Sicherheitsnetz, dessen Reißen niemandem auffällt, ist keines.

Zwei Antworten, für zwei verschiedene Lagen:

* **Für den Verdacht:** den Weg auf Knopfdruck durchspielen und sehen, wo er
  bricht.
* **Für die Frage ohne Verdacht:** was ist zuletzt eigentlich passiert.

---

## Was gebaut wurde

### 1 · `mailer.js` — der Fehler bekommt Struktur

`sag()` hängt `smtpCode`, `stufe` und die bisherige Spur ans Fehlerobjekt. Die
Meldung bleibt wortgleich (Logs und Tests hängen daran), aber die
Selbstprüfung kann jetzt „gescheitert bei RCPT (504)" sagen, ohne einen String
zu zerlegen.

Die **Spur** hält ausschließlich Stufe und Antwortcode. Kein Kennwort, keine
Benutzerkennung, keine Empfängeradresse — was hier landet, geht in eine
Admin-Antwort und muss gefahrlos sein. Ein Test hat beim Schreiben direkt
zugeschlagen: die drei `AUTH`-Schritte hätten sonst ihren eigenen Befehl als
Stufennamen geführt, also die base64-kodierte Kennung und das base64-kodierte
Kennwort. Sie tragen jetzt die Marke `"AUTH"`.

### 2 · `mailer.js` — `pruefeVersand(env, { to, senden })`

Zwei Betriebsarten:

* **`senden: false` (Standard)** — voller Dialog bis `RCPT`, dann `RSET`/`QUIT`.
  Geprüft sind damit Verbindung, STARTTLS, HELO-Regel, Anmeldung, Absender und
  Empfänger, **ohne dass jemand eine Mail bekommt**. Genau die Stufe, an der der
  S117-Fehler saß: Postfix wertet die HELO-Regel verzögert bei RCPT aus. `RSET`
  räumt die begonnene Transaktion ab, statt sie am Socket-Ende verwaisen zu
  lassen.
* **`senden: true`** — echter Versand einer kurzen Testnachricht. Nötig nur,
  wenn der Verdacht hinter DATA liegt (Größe, Header, Inhaltsfilter).

Die Funktion **wirft nicht**, sie gibt den Befund zurück. Der Aufrufer will ihn
in beiden Fällen, nicht nur im guten. Läuft `MAIL_UPSTREAM` (Testpfad/Bridge),
sagt der Befund das ehrlich, statt Grün über einen Weg zu melden, den es im
Betrieb nicht gibt.

### 3 · `mailstat.js` (neu) — der Befund-Zähler

`sys/mailstat/<YYYY-MM-DD>/<zufall>` → `{ ok, zweck, meldung?, stufe?, at }`,
TTL 30 Tage.

Vier Entscheidungen, die im Modulkopf ausführlich stehen:

* **Ein Satz je Ereignis** statt Read-Modify-Write — die F4-Lehre aus
  `tokenstat.js`. KV kennt kein atomares Increment; die Broadcast-Schleife
  schickt Mails sogar der Reihe nach. Summiert wird beim Lesen.
* **Best-Effort.** `notiereMail` wirft nie. Beobachtung ist kein
  Vertragsbestandteil und darf keinen Versand brechen.
* **Keine Empfängeradressen, kein Paar-Code** — weder im Schlüssel noch im
  Inhalt. Diese Zahlen beantworten „funktioniert der Weg", nicht „wer hat Post
  bekommen". Eine Betreiber-Liste von Adressen mit Zeitstempeln wäre ein
  Metadaten-Einblick, den die Grundprämissen nicht hergeben. Ein eigener Test
  liest alle Sätze und sucht die Adresse darin.
* **Selbstverfall über TTL** — Betriebsbeobachtung, kein Archiv.

**Notiert wird im Mailer, nicht an den Aufrufstellen.** Das ist keine
Bequemlichkeit: eine Beobachtung, die man an jeder Aufrufstelle von Hand
mitschreiben muss, fehlt genau an der sechsten. Der Mailer ist die einzige
Stelle, durch die jeder Versand geht. Die fünf Aufrufer steuern nur `zweck`
bei — `pin`, `recover`, `resend`, `relink`, `broadcast`.

### 4 · Zwei Admin-Routen

| Route | Was |
|---|---|
| `POST /api/mailtest` | `{ to, senden }` → Befund. Admin-gated, fail-closed. Antwortet **200 auch beim Fehlschlag**: die Frage war „funktioniert der Weg", und sie ist beantwortet — ein Fehlerstatus würde die Antwort mit der Störung verwechseln. |
| `GET /api/mailstat` | Tagessummen, jüngster Tag zuerst, plus der letzte Fehlschlag im Zeitraum. Der ist die eigentliche Auskunft: woran hakt es gerade. |

Kein eigenes Raten-Limit: der Endpunkt ist admin-gated und ohne
`{ senden: true }` verlässt gar keine Mail das System. Ein Deckel gegen den
Betreiber selbst wäre Theater.

### 5 · `admin.html` — die Knöpfe dazu

Eine neue Karte „Versandweg prüfen": Zieladresse, Haken für „echte Testmail
senden" (aus per Voreinstellung), Knopf „Weg prüfen" und daneben „Befunde der
letzten Tage". Der Befund erscheint als Tabelle mit HELO-Name, gescheiterter
Stufe samt SMTP-Code, Meldung und dem Verlauf (`BEGRUESSUNG 220 · EHLO 250 ·
AUTH 235 …`).

Eine Route ohne Knopf wird nicht benutzt, und dieser Sprint handelt genau davon,
dass niemand nachsieht, wenn er nicht muss.

---

## Tests

| Datei | Was |
|---|---|
| `tests/worker/s118-versandpruefung.spec.js` (neu) | Acht Fälle gegen den echten Worker: beide Routen sind ohne Admin-Token 401; ungültige Zieladresse ergibt einen Befund statt eines Dialogs; der Fehlschlag kommt mit 200 und nennt den Grund; ohne `senden` wird nichts verschickt und der Upstream-Weg ehrlich benannt; Fehlschläge werden gezählt und der letzte Grund festgehalten; und der Datensparsamkeits-Wächter, der alle Sätze im KV nach der Empfängeradresse durchsucht. |
| `tests/unit/mailer.spec.js` | Fünf Fälle für `pruefeVersand` gegen den gescripteten Fake-Server: kein Dialog ohne gültige Adresse; Prüfung bis RCPT mit `RSET` und **ohne** `DATA`; Stufe und SMTP-Code bei Fehlschlag (mit genau der 504-Antwort aus dem Betrieb als Skript); die Spur trägt keine Geheimnisse; ein Konfigurationsfehler kostet keinen Socket. |

## Abnahme

```
npx vitest run                → 261 Dateien, 2542 Tests, alles grün
PAARE_KV_ID=… npm run build   → Kern 0db2fb3c1d7e3bb4 (unverändert, core/ unberührt)
```

## Gegenprobe nach dem Deploy

1. `admin.html` öffnen, Admin-Token eintragen, eigene Adresse ins Feld, **ohne**
   Haken auf „Weg prüfen". Erwartung: grün, HELO-Name `raumzuzweit.de`, Verlauf
   bis `RCPT 250`. Es kommt keine Mail an — das ist richtig so.
2. Haken setzen, nochmal prüfen. Jetzt sollte eine Testmail ankommen.
3. „Befunde der letzten Tage" — der Tag von heute zeigt die zugestellten und die
   gescheiterten Versuche getrennt.
4. Zur Probe aufs Exempel: `SMTP_HELO` versuchsweise auf `kaputt` setzen
   (ohne Punkt), prüfen ⇒ Befund „Gescheitert bei HELO", kein Socket. Danach
   das Secret wieder entfernen.

## Was offen bleibt

* **Die Prüfung läuft, wenn jemand sie drückt.** Ein Cron-Trigger, der einmal
  täglich `pruefeVersand` ohne Versand fährt und bei Fehlschlag eine
  Betreiber-Mail schickt, wäre der nächste Schritt — mit dem offensichtlichen
  Haken, dass eine Störungsmeldung per Mail genau dann nicht ankommt, wenn sie
  gebraucht wird. Ein zweiter Kanal (Push an den Betreiber, Webhook) gehört zu
  der Entscheidung dazu, deshalb hier nicht vorweggenommen.
* **Die Tagessummen zählen alle Zwecke zusammen.** Der `zweck` steht in jedem
  Satz, wird beim Lesen aber nur für den letzten Fehlschlag ausgewertet. Falls
  sich zeigt, dass ein einzelner Pfad klemmt (etwa nur `broadcast`), wäre eine
  Aufschlüsselung ein Zweizeiler in `leseMailStat`.

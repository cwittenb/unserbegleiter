# Sprint S126 — Betriebsbild: womit läuft diese Instanz gerade?

**Basis:** `origin/main` @ `2e8359a` (S124) **plus S125**
**Kern-Hash:** `4e93d980a23aa149` — unverändert, der Kern wurde nicht berührt (Worker und Admin-Seite liegen außerhalb)

---

## 1 · Anlass

Eine Sitzung am 10.08. verhielt sich anders als jeder Eval-Lauf: falsche Eröffnungsfassung,
erfundene Steuermarke. Beide Anbieter halten die Weiche im Test — sechzehn Durchläufe, alle
grün. Der Prompt ist seit dem 5. August unverändert. Es blieb eine naheliegende Frage:

> Mit welchem Modell hat die App eigentlich gesprochen?

**Sie war von außen nicht zu beantworten.** Provider und Modell liegen als Worker-Secrets vor
(`LLM_PROVIDER`, `<PROVIDER>_MODEL`); Secrets kann man nicht auslesen, nur ihre Namen.
`/api/health` meldete `core: "1.0.0-s0"` — eine Konstante, die sich seit Ewigkeiten nicht
ändert und über den deployten Stand nichts sagt.

Solange niemand sieht, **womit** die App spricht, ist jeder Vergleich mit einem Eval-Lauf
eine Vermutung. Genau daran hing diese Untersuchung fest.

Es ist dieselbe Lehre wie bei Versandweg (S118) und Meldeweg (S120), zum dritten Mal:
**Ein Weg, den niemand prüfen kann, ist ein Weg, dem niemand trauen kann.**

---

## 2 · Was die Route zeigt

`GET /api/betriebsbild`, admin-gated wie `mailtest` und `meldetest`:

- **Kern** — App-Name, Version und der **Hash des deployten Stands** (aus dem Build-Banner,
  `scripts/build-pages.js`). Erst der macht den Vergleich mit einem Eval-Lauf möglich.
- **LLM** — Anbieter, Modellname, Denkmodus, ob ein Schlüssel gesetzt ist, und ob die
  Konfiguration **vollständig** ist.
- **Mail** — Host, Absender, Anmeldung, HELO, Adress-Schlüssel: je gesetzt/nicht gesetzt.
  Dazu die Adresspflicht, die ein Notaus ist und kein Einschalter (S115).
- **Meldeweg** — Token und Ziel gesetzt.
- **Push** — VAPID-Paar gesetzt.
- **Speicher** — KV gebunden.

In der Admin-Seite darüber eine Karte „Betriebsbild" mit einem Knopf; eine unvollständige
LLM-Konfiguration wird zusätzlich als Warnung ausgewiesen — der Fall, der sonst erst
auffällt, wenn jemand eine Session öffnet.

---

## 3 · Werte gegen Vorhandensein — die eine Regel dieser Route

Ausgegeben wird nur, was eine Konfiguration **beschreibt**: Anbieter, Modellname, Denkmodus,
Kern-Hash. Von allem, was ein Geheimnis ist, steht dort ausschließlich, **ob** es gesetzt ist.

Kein Schlüssel, kein Passwort, kein Token, keine Adresse verlässt diese Route — **auch nicht
gekürzt**. Ein halber Schlüssel im Log ist ein ganzes Problem, und eine Auskunftsroute, die
nebenbei Geheimnisse ausgibt, wäre schlimmer als gar keine.

Auch der Mail-Host und die Absenderadresse bleiben draußen. Sie sind kein Geheimnis im
engeren Sinn, aber für die Frage „ist es eingerichtet" braucht es sie nicht — und was nicht
gebraucht wird, wird nicht ausgegeben.

---

## 4 · Tests

Elf Fälle in `tests/worker/s126-betriebsbild.spec.js`. Der wichtigste ist nicht der, der
prüft, dass die Route funktioniert, sondern der, der prüft, dass sie **nichts ausplaudert**:
Er setzt echte Geheimnisse in die Umgebung und sucht sie in der Antwort — vollständig **und**
in Bruchstücken.

Dazu: Zugang nur mit gültigem Token; Anbieter und Modell werden genannt; von Geheimnissen nur
das Ob; die Adresspflicht als Notaus (an, solange nicht ausdrücklich abgeschaltet); eine
unvollständige LLM-Konfiguration ist sichtbar statt stumm; der Kern-Hash ist `null` statt
erfunden, wenn kein Build-Banner vorliegt — die Auskunft „ich weiß es nicht" ist auch eine
Auskunft.

**Volle Suite:** 276 Dateien, 2704 Fälle, grün.
**Build:** Kern `4e93d980a23aa149`, unverändert.

---

## 5 · Nachweis

Admin-Seite öffnen, Token eintragen, „Betriebsbild laden". Erwartet: Kern-Hash gleich dem
zuletzt deployten Build, Anbieter und Modell wie in den Secrets gesetzt.

**Für den offenen Fall:** Stimmt das Modell dort nicht mit `mistral-medium-latest` überein,
hat der Eval nie das gemessen, was der Sitzung vom 10.08. begegnet ist — und der Befund wäre
erklärt.

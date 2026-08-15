# Sprint S143 — Welche Adresse liegt? Maskierte Anzeige

**Basis:** `origin/main` @ `bf08165` (`patch-s142-zugangszeile-nach-zustand`),
frisch geklont. S142 ist gepusht; dieser Patch setzt direkt darauf auf.
**Auslieferung:** `patch-s143-adresse-maskiert.mjs`
**Kern-Hash danach:** `e35ac2db2c33588a`
**Suite:** 287 Dateien / 2814 Fälle grün

Gewählte Variante: **b — maskiert, in `/api/me`.**

---

## 1 · Warum überhaupt

Der Client erfuhr bisher nur, **dass** eine Adresse liegt: `/api/me` lieferte
`recoveryEmail` als Boolean aus `hasRecoveryEmail()`. Der Klartext liegt
verschlüsselt im KV (AES-GCM, AAD aus Code+Rolle) und wurde nur serverseitig
entschlüsselt — Versand, Betreiber-Wiederherstellung, Admin-Export.

Das reichte nicht: „bestätigt" heißt nur, dass die Adresse **damals** erreichbar
war. Es kann ein altes Postfach sein oder versehentlich das der anderen Person.
Ohne Anzeige fällt das erst auf, wenn es zählt — also im Verlustfall.

**Warum maskiert.** Jede Anzeige des Klartexts trüge ihn in Antworten, Caches
und Logs, die heute keine personenbezogenen Adressen führen. Zum Wiedererkennen
des **eigenen** Postfachs braucht es ihn nicht.

**Warum im Worker maskiert wird und nicht in der Oberfläche.** Sonst reiste der
Klartext trotzdem und die Oberfläche versteckte ihn nur — das wäre eine
Anzeige-Entscheidung, wo eine Übertragungs-Entscheidung nötig ist.

---

## 2 · Die Maske

Neu: `platforms/cloudflare/worker/mailmaske.js` → `maskiereMail()`.

```
anna@post.de        →  a•••a@p•••t.de
anna@mail.gmx.net   →  a•••a@m•••x.net      (kein Anbietername bleibt lesbar)
anna@localhost      →  a•••a@l•••t          (keine Endung: alles maskieren)
ab@xy.de            →  a•••@x•••.de         (zu kurz für zwei Anker)
kein-at-zeichen     →  null                 (Aufrufer zeigt dann nichts)
```

Drei Regeln mit je einem Grund:

- **Erstes und letztes Zeichen bleiben.** Genug zum Wiedererkennen, zu wenig
  zum Mitschreiben.
- **Immer drei Punkte, nie längenproportional.** Eine proportionale Maske
  verriete die Länge. Die ist ein schwaches Signal — aber sie ist kostenlos zu
  verschenken und ebenso kostenlos zu behalten.
- **Die Endung ab dem letzten Punkt bleibt stehen**, alles davor wird maskiert.
  Sonst stünde bei `mail.gmx.net` am Ende doch wieder `gmx.net` da.

Codepoint-weise (`Array.from`), damit zusammengesetzte Zeichen nicht zerfallen.

---

## 3 · Wo sie herkommt

**`/api/me`** liefert zusätzlich `recoveryEmailMaske`. Dafür braucht es neben
dem Ja/Nein auch den Ciphertext: `auth.js` bekommt `leseRecoveryEmail()`.
Bewusst als **eigene** Funktion statt als Rückgabe-Erweiterung von
`hasRecoveryEmail()` — deren übrige Aufrufer (Admin-Liste, Pflicht-Gate) wollen
genau das Ja/Nein, und ein Datensatz, der überall herumliegt, wird irgendwo
versehentlich verschickt.

Fehlertolerant: Ein fehlender oder gewechselter `EMAIL_KEY` darf `/api/me`
nicht kippen. Dann steht eben keine Maske, und die Oberfläche zeigt weiter nur
den hinterlegt-Zustand.

**`/api/email/confirm`** gibt die Maske gleich mit zurück. Die Alternative wäre
ein zweiter `/api/me`-Ruf direkt nach der Bestätigung — ein Weg mehr für eine
Auskunft, die dort ohnehin vorliegt: Der Worker kennt die Adresse in diesem
Moment im Klartext, sie kam gerade aus dem Formular.

Der Client reicht sie durch (`onFertig(r)` → `zugangHinterlegt(r)`). Fehlt sie
(älterer Worker, lokales Backend), wird die alte Maske **geleert** statt
stehengelassen: eine alte Maske neben einer neuen Adresse wäre schlimmer als
gar keine.

---

## 4 · Wie sie aussieht

In der Zeile „E-Mail-Adresse für deine Zugangslinks" (S142) steht bei
hinterlegter Adresse:

```
DEINE ADRESSE
a•••a@p•••t.de
Wenn du dich auf einem neuen Gerät anmelden oder deinen Zugang verlierst,
kannst du dir darüber einen frischen Link schicken lassen.
```

Das Etikett ist `rec.labelAdresse` — dasselbe, das über dem Eingabefeld steht.
Gleiche Sache, gleiches Wort, keine zweite Übersetzung, die auseinanderlaufen
kann.

**`rec.hinterlegt` ist aufgeteilt, nicht dupliziert.** Steht die Adresse da,
sagt sie selbst, dass eine hinterlegt ist — der erste Satz wäre eine
Wiederholung. Neu: `rec.hinterlegtDa` (der Satz, der nur ohne Maske gebraucht
wird) und `rec.hinterlegtZweck` (gilt in beiden Fällen und steht genau einmal).

Die Wegweiser-Zeile aus S142 bleibt bewusst **ohne** Adresse: Das Panel ist eine
Übersicht, keine Auskunftsstelle, und was dort steht, steht auch dann da, wenn
jemand nur kurz auf das Zeichen tippt.

---

## 5 · Tests

**Neu** — `tests/unit/s143-adresse-maskiert.spec.js` (14): die Maskierung selbst
(Anker, feste Punktzahl, Endung, Zwischen-Labels, kurze Stücke, kaputte
Eingaben, zusammengesetzte Zeichen) und die Anzeige (Maske samt Etikett; erster
Satz entfällt mit Maske; ohne Maske voller Wortlaut; ohne Adresse nichts; nach
dem Ändern die neue Maske; DE/EN-Parität, alter Key fort).

**Erweitert** — `tests/worker/recover.spec.js` (+5, gegen Miniflare): exakte
Maske in `/api/me`; keine Maske ohne Bestätigung (auch nicht nach Schritt 1);
jede Person sieht nur ihre eigene; die Bestätigung liefert sie mit; nach einem
Wechsel steht die neue.

**Geschärft** — dort die Zusage `JSON.stringify(me)` enthält die Adresse nicht:
Sie sagt seit S143 **mehr** als vorher, nämlich dass der Klartext auch dann
nicht mitreist, wenn eine Anzeige daraus entsteht. Zusätzlich gegen den
Local-Part geprüft.

---

## 6 · Offen

- Aus einem laufenden Gespräch heraus in den Chat zurückführen (aus S141).

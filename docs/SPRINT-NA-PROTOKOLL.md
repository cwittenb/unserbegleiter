# Sprint NA — Native Hülle aus `dist/` auslagern

Basis: `origin/main` @ `ddfff51` (patch-mb-marke-raumzuzweit) · Kern-Hash: `385e4ade5bf14456` — **unverändert**, dieser Sprint fasst `core/` nicht an (der Hash trägt den Stand deiner S83/S84-Prompt-Arbeiten).

## Warum

Die nativen Projekte lagen unter `dist/capacitor/ios|android` — also in Wegwerf-Territorium, außerhalb der Versionskontrolle. Dort entsteht aber Konfiguration, die **von Hand gemacht und nicht reproduzierbar** ist: Signing-Team, Associated Domains (`applinks:raumzuzweit.de`), Intent-Filter mit `autoVerify`, Bundle-Einstellungen. Sie hätte nur auf einer Maschine existiert und wäre bei Neuklon oder Aufräumen verloren gewesen. Genau diese Arbeit steht in Welle B des Gerätetests an — deshalb der Schnitt jetzt, davor.

## Scope & Ergebnis

1. **`scripts/build-capacitor.js`**: Ziel ist `native/` statt `dist/capacitor`. Das Skript schreibt weiterhin **nur** die generierten Teile (`www/`, `capacitor.config.json`) und räumt `pages-build/` ab; `ios/` und `android/` werden nie angefasst. Neu: Rückgabefeld `initialisiert` und ein passender Betreiber-Hinweis im Build-Log („noch nicht initialisiert" → Startsequenz; sonst → `npx cap sync`).
2. **`native/package.json`** (neu, versioniert): Capacitor `^8.4.2` (core/ios/android + cli als devDependency), `private: true`, Kurzskripte `sync`/`ios`/`android`. Damit entfällt das `npm init -y` — und der Fehler „could not determine executable to run" (er kam daher, dass `npx` ohne installiertes `@capacitor/cli` kein `cap` findet).
3. **`.gitignore`**: neuer Block mit klarem Grundsatz — **`native/ios` und `native/android` sind versioniert**, ignoriert wird nur Werkzeug-Auswurf: Generate (`www/`, `capacitor.config.json`, `pages-build/`), die `cap sync`-Kopien des Web-Builds (`ios/App/App/public/`, `android/app/src/main/assets/public/`), Pods/Gradle/DerivedData/xcuserdata/`local.properties` — und **Signaturmaterial** (`*.jks`, `*.keystore`, `*.p8`, `*.p12`, `*.mobileprovision`, `key.properties`), das nie ins Repo darf.

## Startsequenz (einmalig, ersetzt die Anleitung aus M4)

```
npm run build:capacitor
cd native
npm install
npx cap add ios
npx cap add android
npx cap open ios          # Xcode: Signing-Team, dann Associated Domains (M5)
```

Danach je Änderung: `npm run build:capacitor` im Root, dann `npx cap sync` in `native/`.

**`push_patch.sh` anpassen** — der Pfad im sync-Block ändert sich:

```bash
npm run build:capacitor
if [ -d native/node_modules/@capacitor/cli ]; then
  ( cd native && npx cap sync )
else
  echo "Hinweis: Capacitor-Hülle nicht initialisiert (native/) — sync übersprungen."
fi
```

**Migration:** `dist/capacitor` kann gefahrlos gelöscht werden — dort liegen nur Generate, native Projekte gab es dort noch nie (`cap add` war nie erfolgreich).

## Tests

Neu: `tests/unit/na-native-huelle.spec.js` (9 Tests), Kern ist ein **Regressionsschutz**:

- Der Build lässt nachgestellte handgemachte Dateien (`ios/App/App/Info.plist`, `android/app/src/main/AndroidManifest.xml`) **byte-gleich** stehen und überschreibt `native/package.json` nicht.
- Generate entstehen daneben, `pages-build/` wird geräumt; `initialisiert` meldet korrekt.
- Ort: Default zielt auf `native/`, `dist/capacitor` kommt im Skript nicht mehr vor; `native/package.json` liegt versioniert mit Caret-Ranges bereit.
- **`.gitignore` per `git check-ignore` festgenagelt** (nicht nur Musterprüfung): fünf Pfade müssen versioniert bleiben (u. a. `project.pbxproj`, `Info.plist`, `AndroidManifest.xml`, `app/build.gradle` — letzterer als Falle gegen die Regel `app/build/`), neun müssen ignoriert sein, fünf Signaturmaterial-Fälle ebenfalls.

Voller Lauf: **131 Testdateien / 1092 Tests grün**. `npm run build` + `npm run build:capacitor` erfolgreich, Kern `385e4ade5bf14456`.

## Verifikation nach Patch-Anwendung

```
node patch-na-native-huelle-auslagern.mjs --dry-run
node patch-na-native-huelle-auslagern.mjs
node patch-na-native-huelle-auslagern.mjs   # Idempotenz
npx vitest run
npm run build && npm run build:capacitor
rm -rf dist/capacitor                        # Altbestand, nur Generate
```

## Offen

- **M7b (native Push)** bleibt der nächste optionale Sprint — Voraussetzung sind laufende Store-Builds plus FCM-/APNs-Konten.
- Beim ersten `npx cap add`: das erzeugte `native/ios` + `native/android` **committen** — sonst greift der Schutz dieses Sprints ins Leere.

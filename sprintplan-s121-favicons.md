# Sprintplan S121 — Favicons in Build und Deployment

**Basis:** `origin/main` @ `cde3e13` (`patch-s119-6-fremde-marken`), frisch geklont.
**Quelle:** `Raumzuzweit_Design-favicons.zip` → `design_handoff_raumzuzweit/favicon/`
**Auslieferung:** ein Node-ESM-Multipatch (`.mjs`) + `docs/SPRINT-121-PROTOKOLL.md`

---

## 1 · Ausgangslage (im Klon geprüft)

| Befund | Stand |
|---|---|
| Favicon irgendwo im Repo referenziert | **nirgends** — weder App-Shell noch Landing. Der Tab ist heute leer. |
| `platforms/cloudflare/pages/icons/` | drei PNGs (apple-touch, 192, 512) — **alter Satz**, Hashes stimmen mit den neuen nicht überein |
| `design_handoff_raumzuzweit/favicon/` | liegt bereits im Repo, aber **nicht** im Build. README dort ist eine Version älter als im ZIP (5×2 px vs. 6×2 px, fehlender 16×16-Hinweis) |
| Verteilung durch den Build | `build-pages.js` kopiert nur `*.png` aus `pages/icons/` nach `public/icons/` |
| Manifest | `manifest.js` → `/icons/icon-192.png`, `/icons/icon-512.png` |
| Service Worker | `SHELL_PFADE` precached die drei Icons; `sw.js` nutzt `/icons/icon-192.png` als Push-Icon |
| Capacitor | `build-capacitor.js` kopiert `public/` vollständig → erbt alles automatisch |
| Landing | eigenes Artefakt `dist/cloudflare/landing/` (Hetzner), **ohne** jedes Icon |
| Farben | `THEME_COLOR = #0f766e`, `BACKGROUND_COLOR = #f5f7f9` — **Altbestand**, widerspricht dem Design (Tiefgrün `#1e2a22` / Papier `#faf8f2`), das auch die Icons tragen |

Die drei Icon-Töne stehen 1:1 in `core/ui/theme.js`: `--rz-papier #faf8f2`,
`--rz-tiefgruen #1e2a22`, `--rz-akzent #8fae74`. Der Satz ist also kein Fremdkörper.

---

## 2 · Offene Fragen (blockierend, vor Schritt 1)

**F1 — Ablageort.** Die Handoff-README verlangt Web-Root (`/favicon.svg` …).
Technisch zwingend ist Root nur für `/favicon.ico` (erzeugen wir nicht) — alle
anderen Pfade stehen im Head bzw. Manifest und dürfen überall liegen.
&nbsp;&nbsp;**a)** Alles ins Root: `/favicon.svg`, `/favicon-16.png`, `/favicon-32.png`,
`/apple-touch-icon.png`, `/icon-192.png`, `/icon-512.png`. `/icons/` entfällt;
Manifest, `SHELL_PFADE`, `sw.js`, `m4`-Test ziehen mit. Ein Ort, README-treu.
&nbsp;&nbsp;**b)** `/icons/` bleibt, nur die drei tabrelevanten Dateien zusätzlich ins Root.
Weniger Änderung, dafür zwei Ablagen. → *Empfehlung: a*

**F2 — Theme-Farben.** `THEME_COLOR`/`BACKGROUND_COLOR` auf `#1e2a22` / `#faf8f2`
umstellen? Betrifft Manifest, `<meta name="theme-color">`, Android-Taskleiste,
PWA-Splash — und das Pre-Boot-CSS in der Shell (`--bg:#f5f7f9`, `--accent:#0f766e`),
das heute noch die alte Palette zeigt, bevor `app.js` malt.
&nbsp;&nbsp;**a)** ja, inkl. Pre-Boot-CSS auf Papier/Tiefgrün
&nbsp;&nbsp;**b)** nur Manifest/Meta, Pre-Boot-CSS unberührt
&nbsp;&nbsp;**c)** gar nicht, eigener Sprint → *Empfehlung: a — sonst blitzt beim Start Türkis auf*

**F3 — Landing-Wächter.** `tests/unit/l1-1-…` verbietet **jedes** Farbliteral außerhalb
des `:root`-Blocks. `<meta name="theme-color" content="#1e2a22">` ist ein solches Literal.
&nbsp;&nbsp;**a)** Wächter bekommt eine benannte Ausnahme für genau dieses Meta **plus** eine
neue Zusicherung: der Wert muss `--rz-tiefgruen` aus `theme.js` entsprechen
&nbsp;&nbsp;**b)** Landing bleibt ohne `theme-color` (Icons ja, Meta nein) → *Empfehlung: a*

**F4 — Native Store-Icons.** `native/ios/…/AppIcon.appiconset` und
`native/android/…/mipmap-*` tragen noch Capacitor-Standards. Das sind eigene
Formate (1024er, adaptive Foreground/Background) und **nicht** im ZIP enthalten.
→ *Vorschlag: nicht in S121; eigener Sprint vor Store-Einreichung. Bestätigung genügt.*

**F5 — `.ico`.** Handoff sagt: nur für Browser vor Edge nötig.
→ *Vorschlag: keine erzeugen. Bestätigung genügt.*

**K1 — Handoff-Ordner.** `design_handoff_raumzuzweit/` bleibt als Design-Quelle
im Repo (README auf ZIP-Stand aktualisiert), die Build-Quelle ist eine Kopie unter
`platforms/`. Bewusst kopiert statt referenziert: der Handoff-Ordner ist Ablage,
kein Vertrag mit dem Build. Widerspruch bitte melden — sonst so.

*Kleine Entscheidungen, die ich selbst treffe:* Quellordner heißt weiter
`platforms/cloudflare/pages/icons/`; Patch-Name
`patch-s121-favicons-build-deployment.mjs`; Testdatei `tests/unit/s121-favicons.spec.js`.

---

## 3 · Schritte

Jeder Schritt ist für sich lauffähig und grün. Reihenfolge ist bindend.

### Schritt 1 — Asset-Satz als Build-Quelle
* Neun Dateien aus dem ZIP nach `platforms/cloudflare/pages/icons/` (die drei alten PNGs werden **ersetzt**).
* README des Handoff-Ordners auf ZIP-Stand heben.
* **Test:** `s121-favicons.spec.js` — jede erwartete Quelldatei existiert; PNG-Maße aus dem IHDR-Chunk (16, 32, 180, 192, 512 quadratisch); jedes SVG trägt genau die drei Töne aus `theme.js` und keinen vierten.

### Schritt 2 — Build verteilt (F1)
* `build-pages.js`: Icon-Kopierschleife nimmt `.png` **und** `.svg` und legt sie am unter F1 gewählten Ort ab.
* **Test:** Build in `mkdtemp`, jede erwartete Datei liegt im Output, Bytegleichheit mit der Quelle.

### Schritt 3 — Head-Snippet der App-Shell
* Vier `<link>`-Zeilen exakt nach Handoff, inkl. der `16x16`-Zeile (ohne sie skaliert der Browser die SVG herunter und lädt die eigene 16er-Zeichnung nie).
* **Test:** die vier Zeilen stehen im gebauten `public/index.html`; jeder `href` löst auf eine vorhandene Datei im Output auf (kein toter Link).

### Schritt 4 — Manifest und Theme-Farben (F2)
* `manifest.js`: Icon-Pfade gemäß F1; Farben gemäß F2; ggf. Pre-Boot-CSS in `build-pages.js` nachziehen.
* **Test:** `m1-pwa-manifest.spec.js` bleibt grün (Pfade dort mitgeführt); neue Zusicherung: `THEME_COLOR`/`BACKGROUND_COLOR` stehen so in `theme.js`.

### Schritt 5 — Landing (F1, F3)
* Build kopiert den Icon-Satz zusätzlich nach `dist/cloudflare/landing/` (eigenes Deploy-Ziel Hetzner, muss die Dateien selbst mitbringen).
* Head-Snippet in alle drei Landing-Seiten (`/`, `/impressum`, `/datenschutz`).
* Wächter-Ausnahme gemäß F3.
* **Test:** Icons liegen im `landing/`-Output; alle drei Seiten tragen die Links; `l1-1` bleibt grün.

### Schritt 6 — Service Worker
* `SHELL_PFADE` und `sw.js`-Push-Icon auf die neuen Pfade; die zwei kleinen Tab-PNGs bewusst **nicht** precachen (Tab-Icons braucht offline niemand, Shell-Cache bleibt schlank).
* **Test:** `m2-service-worker.spec.js` mitgeführt; jeder Pfad in `SHELL_PFADE` existiert im Build-Output — dieser Test fehlt heute und ist der eigentliche Wert des Schritts.

### Schritt 7 — Capacitor
* Kein Code: `build-capacitor.js` kopiert `public/` rekursiv.
* **Test:** `m4`-Test um die neuen Dateien in `www/` erweitert.

### Schritt 8 — Abschluss
* Voller Lauf `npx vitest run`, Build mit `PAARE_KV_ID=…`, Kern-Hash notieren.
* `docs/SPRINT-121-PROTOKOLL.md` (schreibt der Patch selbst).

---

## 4 · Nicht in diesem Sprint

* Native Store-Icons (F4) · `.ico` (F5) · Open-Graph-/Social-Bilder (anderes Format, andere Maße) · Änderungen an `theme.js`

## 5 · Deployment danach

```
PAARE_KV_ID=1590b0377c4a47588ec27f3039edf4d5 npm run build
cd dist/cloudflare && wrangler deploy          # App, de.roomfortwo.app
# dist/cloudflare/landing/ → Hetzner, raumzuzweit.de
```
Beide Ziele müssen neu, sonst zeigt eine der Domains kein Zeichen.

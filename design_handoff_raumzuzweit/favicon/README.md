# Favicon — Raumzuzweit

Das Zeichen ist der Schnitt: Papier links (`#faf8f2`), Tiefgrün rechts (`#1e2a22`),
grüner Wegweiser quer über der Naht (`#8fae74`). Rund für Tab und Browser,
randlos quadratisch für die Homescreen-Kacheln (iOS und Android maskieren selbst).

## Dateien

| Datei | Größe | Form | Zweck |
|---|---|---|---|
| `favicon.svg` | vektor | Kreis | Tab-Icon, moderne Browser |
| `favicon-32.png` | 32 | Kreis | Tab-Fallback, Lesezeichen |
| `favicon-16.svg` | vektor | Kreis | Quelle der 16er (Wegweiser hochgesetzt) |
| `favicon-16.png` | 16 | Kreis | kleinstes Tab-Icon |
| `apple-touch-icon.png` | 180 | randlos quadratisch | iOS Homescreen |
| `icon-192.png` | 192 | randlos quadratisch | Manifest, Android |
| `icon-512.png` | 512 | randlos quadratisch | Manifest, Splash |
| `icon-maskable.svg` | vektor | randlos quadratisch | Quelle der Kacheln |

`favicon-16.png` ist keine Verkleinerung: der Wegweiser ist dort auf 5 × 2 px
hochgesetzt, sonst fiele er unter ein Pixel.

## Wohin deployen

Alle Dateien ins **Web-Root** beider Domains — also so, dass sie unter
`/favicon.svg` usw. erreichbar sind, nicht in einem Unterordner. Browser fragen
`/favicon.ico` und die im Head genannten Pfade ab.

- `raumzuzweit.de` (Landing) — alle Dateien außer `icon-192/512`
- `de.roomfortwo.app` (App) — alle Dateien, plus die 192/512 im Manifest

## Head-Snippet (beide Domains)

```html
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon-32.png" sizes="32x32" type="image/png">
<link rel="icon" href="/favicon-16.png" sizes="16x16" type="image/png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<meta name="theme-color" content="#1e2a22">
```

## Manifest (nur App-Domain)

```json
"icons": [
  { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any maskable" },
  { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
],
"theme_color": "#1e2a22",
"background_color": "#faf8f2"
```

## Offen

Keine `.ico` erzeugt — nur nötig, wenn Windows-Browser vor Edge noch in der
Statistik auftauchen.

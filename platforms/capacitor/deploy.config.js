// Capacitor-Deploy-Konfiguration (M4) — dauerhafte Quelle der Wahrheit für die
// nativen Hüllen (iOS/Android). Keine Geheimnisse: App-ID und API-Basis sind
// öffentlich sichtbare Kennungen.
//
// APP_ID: globale Bundle-/Application-ID (D2) — Reverse-DNS der englischen
//   Domain roomfortwo.app. NACH der ersten Store-Einreichung praktisch
//   unveränderlich (Apple: nie; Google: nur als neue App).
// API_BASIS: absolute Basis der Worker-API für die native Hülle. Im Web bleibt
//   sie leer (same-origin) — der Wert hier gilt NUR für den Capacitor-Build.
//   Für abweichende Umgebungen hat die Umgebungsvariable RZZ_API_BASIS Vorrang.
export const APP_ID = "app.roomfortwo";
export const API_BASIS = "https://raumzuzweit.de";

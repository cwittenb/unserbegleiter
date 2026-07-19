// Deep-Link-Übernahme (M5) — DOM-frei und rein, damit ohne Browser testbar.
// Universal Link (iOS) / App Link (Android) öffnet die App; Capacitor liefert
// die URL als appUrlOpen-Ereignis. Das Magic-Token steckt im Fragment (#t=…),
// genau wie im Web — die Übernahme speist es in den bestehenden Boot-Pfad ein.

/** Magic-Token aus einer vollständigen URL ziehen — oder null. */
export function tokenAusUrl(u) {
  try {
    const url = new URL(u);
    const frag = new URLSearchParams((url.hash || "").slice(1));
    return frag.get("t") || null;
  } catch {
    return null;
  }
}

/** appUrlOpen-Lauscher registrieren (nur wenn das Capacitor-App-Plugin da ist).
 *  handler bekommt das rohe Token. Liefert true, wenn registriert wurde. */
export function lauscheAppLinks(handler) {
  const App = globalThis.Capacitor?.Plugins?.App;
  if (!App || typeof App.addListener !== "function") return false;
  App.addListener("appUrlOpen", (ereignis) => {
    const token = tokenAusUrl(ereignis?.url || "");
    if (token) handler(token);
  });
  return true;
}

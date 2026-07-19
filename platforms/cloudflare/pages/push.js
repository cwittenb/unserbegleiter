// Push-Client (M7a) — DOM-arme Ecke: Fähigkeitsprüfung, Abo an/ab, Schlüssel-
// Konvertierung. Die UI (Glocken-Knopf) verdrahtet client.js; hier lebt die
// testbare Logik. In der nativen Hülle (M4) ist Web Push aus — dort kommt
// später FCM/APNs (M7b).

import { istNativeShell } from "./api-basis.js";

/** applicationServerKey erwartet Bytes — VAPID-Public-Key ist base64url. */
export function schluesselZuBytes(b64u) {
  const b64 = b64u.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (b64u.length % 4)) % 4);
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

/** Ist Web Push hier grundsätzlich möglich? (Fähigkeiten + kein Native-Kontext) */
export function istPushMoeglich(win = globalThis) {
  if (istNativeShell()) return false;
  const nav = win.navigator;
  return !!(nav && "serviceWorker" in nav && "PushManager" in win && "Notification" in win);
}

/** Abo einrichten: Erlaubnis → Browser-Subscription → beim Worker hinterlegen.
 *  api: die api()-Funktion des Clients. Liefert true bei Erfolg. */
export async function aktivierePush(api, registrierung) {
  const erlaubnis = await Notification.requestPermission();
  if (erlaubnis !== "granted") return false;
  const { key } = await api("GET", "/api/push/key");
  const sub = await registrierung.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: schluesselZuBytes(key),
  });
  await api("POST", "/api/push/subscribe", { subscription: sub.toJSON() });
  return true;
}

/** Abo lösen: Browser- und Worker-seitig. */
export async function deaktivierePush(api, registrierung) {
  const sub = await registrierung.pushManager.getSubscription();
  if (!sub) return;
  const endpoint = sub.endpoint;
  await sub.unsubscribe();
  await api("DELETE", "/api/push/subscribe", { endpoint });
}

/** Besteht aktuell ein Abo? */
export async function hatPushAbo(registrierung) {
  return !!(await registrierung.pushManager.getSubscription());
}

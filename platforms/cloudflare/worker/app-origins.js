// App-Anbindung (M5) — reine Helfer für die native Capacitor-Hülle:
// CORS für die App-Origins, Preflight, und die /.well-known/-Nutzlasten für
// Universal Links (iOS) und App Links (Android).
//
// Sicherheitsrahmen: CORS wird ausschließlich für die ZWEI bekannten
// App-Origins geöffnet (kein Wildcard, keine Reflektion beliebiger Origins);
// nur dort werden Cookies mit SameSite=None gesetzt (index.js). Der normale
// Web-Verkehr bleibt unangetastet (same-origin, SameSite=Lax).

import { APP_ID } from "../../capacitor/deploy.config.js";

/** Die Origins der nativen Hülle: iOS-WKWebView und Android-WebView. */
export const APP_ORIGINS = ["capacitor://localhost", "https://localhost"];

export function istAppOrigin(origin) {
  return APP_ORIGINS.includes(origin || "");
}

function corsKopf(origin) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": "true",
    "Vary": "Origin",
  };
}

/** OPTIONS-Preflight einer App-Anfrage beantworten — sonst null (weiter im Routing). */
export function preflightAntwort(request) {
  const origin = request.headers.get("Origin");
  if (request.method !== "OPTIONS" || !istAppOrigin(origin)) return null;
  return new Response(null, {
    status: 204,
    headers: {
      ...corsKopf(origin),
      "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "content-type,x-admin-token",
      "Access-Control-Max-Age": "86400",
    },
  });
}

/** Antwort um CORS-Köpfe ergänzen, wenn die Anfrage aus der App kam — sonst unverändert. */
export function mitAppCors(request, antwort) {
  const origin = request.headers.get("Origin");
  if (!istAppOrigin(origin)) return antwort;
  const headers = new Headers(antwort.headers);
  for (const [k, v] of Object.entries(corsKopf(origin))) headers.set(k, v);
  return new Response(antwort.body, { status: antwort.status, headers });
}

/** apple-app-site-association: verknüpft die Domain mit der iOS-App.
 *  teamId: Apple Developer Team-ID (Membership-Seite). */
export function aasaNutzlast(teamId) {
  return {
    applinks: {
      details: [{
        appIDs: [`${teamId}.${APP_ID}`],
        // Nur der Einstieg "/" — Magic-Links tragen das Token im Fragment,
        // das an der Pfad-Zuordnung nicht teilnimmt.
        components: [{ "/": "/" }],
      }],
    },
  };
}

/** assetlinks.json: verknüpft die Domain mit der Android-App.
 *  fingerprint: SHA-256 des Signatur-Zertifikats (keytool -list -v). */
export function assetlinksNutzlast(fingerprint) {
  return [{
    relation: ["delegate_permission/common.handle_all_urls"],
    target: {
      namespace: "android_app",
      package_name: APP_ID,
      sha256_cert_fingerprints: [fingerprint],
    },
  }];
}

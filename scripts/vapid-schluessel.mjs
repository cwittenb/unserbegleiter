#!/usr/bin/env node
// Erzeugt ein VAPID-Schlüsselpaar (P-256) für Web Push (M7a) und druckt die
// drei Secrets im erwarteten Format. Einmalig ausführen, Werte setzen mit:
//   wrangler secret put VAPID_PUBLIC_KEY   (aus dist/cloudflare/, nach npm run build)
//   wrangler secret put VAPID_PRIVATE_KEY
//   wrangler secret put VAPID_SUBJECT      (mailto:… oder https://…)

const b64u = (bytes) => Buffer.from(bytes).toString("base64url");

const paar = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
const pub = new Uint8Array(await crypto.subtle.exportKey("raw", paar.publicKey));
const jwk = await crypto.subtle.exportKey("jwk", paar.privateKey);

console.log("VAPID_PUBLIC_KEY  =", b64u(pub));
console.log("VAPID_PRIVATE_KEY =", jwk.d);
console.log("VAPID_SUBJECT     =  mailto:kontakt@raumzuzweit.de   (anpassen)");
console.log("\nHinweis: Der öffentliche Schlüssel ist öffentlich (steht in jedem Abo);");
console.log("der private bleibt Secret. Ein Schlüsselwechsel macht bestehende Abos ungültig.");

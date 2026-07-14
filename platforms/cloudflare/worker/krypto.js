// Adress-Kryptografie (S46, D6) — AES-256-GCM über WebCrypto.
//
// Zweck: Die Klartext-Adresse wird verschlüsselt neben dem Hash abgelegt,
// damit der Betreiber-Kommunikationskanal (Resend, Direktlink-Info,
// Betriebsmitteilungen) funktionieren kann. Die Positionsverschiebung ist in
// der Designnotiz D6 offen benannt: aus „kann nicht lesen" (Struktur) wird
// „liest nur zu benannten Zwecken" (Zweckbindung + Audit-Log).
//
// Bausteine:
//  - Schlüssel: EMAIL_KEY als Worker-Secret, 32 Byte hex (openssl rand -hex 32).
//    Konfigurationspflicht (Projektprinzip): fehlt er, ist das ein Deploy-Fehler
//    mit klarer Meldung — kein stilles Weiterlaufen ohne enc-Feld.
//  - IV: 12 Byte, pro Verschlüsselung frisch (GCM-Pflicht — Wiederverwendung
//    wäre katastrophal).
//  - AAD: code:role wird mitgebunden — ein Ciphertext entschlüsselt NUR im
//    Kontext genau dieses Kontos und lässt sich nicht zwischen Einträgen
//    verschieben. GCM ist authenticated encryption: jede Manipulation scheitert
//    hart beim Entschlüsseln statt stillen Müll zu liefern.
//  - Format: { v: 1, iv, ct } — v ist die Schlüssel-/Formatversion für spätere
//    Rotation (Rotation selbst ist bewusst NICHT Teil von S46).

const enc = s => new TextEncoder().encode(s);

function b64(bytes) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}
function unb64(s) {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Importiert EMAIL_KEY aus dem Environment. Wirft mit klarer Meldung, wenn
 *  das Secret fehlt oder kein 64-stelliges Hex ist (Konfigurationspflicht). */
export async function importEmailKey(env) {
  const hex = env && env.EMAIL_KEY;
  if (!hex || !/^[0-9a-fA-F]{64}$/.test(hex))
    throw Object.assign(
      new Error("EMAIL_KEY fehlt oder ist ungültig (erwartet: 64 Hex-Zeichen). Setzen mit: wrangler secret put EMAIL_KEY"),
      { status: 500, code: "email_key_missing" }
    );
  const raw = new Uint8Array(hex.match(/../g).map(h => parseInt(h, 16)));
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export const emailAad = (code, role) => code + ":" + role;

/** Verschlüsselt einen Klartext kontogebunden. Liefert {v, iv, ct} (base64). */
export async function verschluessele(key, klartext, aad) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: enc(aad) }, key, enc(klartext));
  return { v: 1, iv: b64(iv), ct: b64(new Uint8Array(ct)) };
}

/** Entschlüsselt {v, iv, ct}. Wirft bei Manipulation oder falschem AAD/Konto. */
export async function entschluessele(key, blob, aad) {
  if (!blob || blob.v !== 1 || !blob.iv || !blob.ct)
    throw Object.assign(new Error("Kein versandfähiger Adress-Eintrag."), { status: 409, code: "no_email_enc" });
  const klar = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: unb64(blob.iv), additionalData: enc(aad) }, key, unb64(blob.ct));
  return new TextDecoder().decode(klar);
}

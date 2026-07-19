// Sprint M5 (Unit) — reine Module der App-Anbindung: CORS-Entscheidung,
// Well-known-Nutzlasten, Deep-Link-Token, Cookie-SameSite-Option.
// Sicherheits-Negativseiten: fremde Origins bekommen NIE CORS-Köpfe, und das
// Web behält SameSite=Lax (nichts weicht auf, nur die zwei App-Origins).

import { describe, it, expect } from "vitest";
import { APP_ORIGINS, istAppOrigin, preflightAntwort, mitAppCors, aasaNutzlast, assetlinksNutzlast }
  from "../../platforms/cloudflare/worker/app-origins.js";
import { cookieHeader } from "../../platforms/cloudflare/worker/util.js";
import { tokenAusUrl } from "../../platforms/cloudflare/pages/deep-link.js";
import { APP_ID } from "../../platforms/capacitor/deploy.config.js";

const anfrage = (method, origin) =>
  new Request("https://raumzuzweit.de/api/me", { method, headers: origin ? { Origin: origin } : {} });

describe("M5 · App-Origins & CORS (rein)", () => {
  it("genau die zwei Hüllen-Origins gelten als App — sonst niemand", () => {
    expect(APP_ORIGINS).toEqual(["capacitor://localhost", "https://localhost"]);
    expect(istAppOrigin("capacitor://localhost")).toBe(true);
    expect(istAppOrigin("https://localhost")).toBe(true);
    for (const fremd of ["https://boese.example", "http://localhost", "https://localhost:3000", "null", "", undefined])
      expect(istAppOrigin(fremd), String(fremd)).toBe(false);
  });

  it("Preflight: 204 mit Credentials-CORS für App-Origins, null für alle anderen", () => {
    const a = preflightAntwort(anfrage("OPTIONS", "capacitor://localhost"));
    expect(a.status).toBe(204);
    expect(a.headers.get("Access-Control-Allow-Origin")).toBe("capacitor://localhost");
    expect(a.headers.get("Access-Control-Allow-Credentials")).toBe("true");
    expect(a.headers.get("Access-Control-Allow-Methods")).toContain("PUT");
    expect(preflightAntwort(anfrage("OPTIONS", "https://boese.example"))).toBeNull();
    expect(preflightAntwort(anfrage("GET", "capacitor://localhost"))).toBeNull();
  });

  it("mitAppCors: reflektiert NUR App-Origins (mit Vary), fremde Antworten bleiben unberührt", async () => {
    const roh = () => new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
    const app = mitAppCors(anfrage("GET", "https://localhost"), roh());
    expect(app.headers.get("Access-Control-Allow-Origin")).toBe("https://localhost");
    expect(app.headers.get("Vary")).toBe("Origin");
    const fremd = mitAppCors(anfrage("GET", "https://boese.example"), roh());
    expect(fremd.headers.get("Access-Control-Allow-Origin")).toBeNull();
    const web = mitAppCors(anfrage("GET", undefined), roh());
    expect(web.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });
});

describe("M5 · Well-known-Nutzlasten", () => {
  it("AASA verknüpft Team-ID mit der App-ID, nur Einstieg '/'", () => {
    const n = aasaNutzlast("TEAM12345");
    expect(n.applinks.details[0].appIDs).toEqual([`TEAM12345.${APP_ID}`]);
    expect(n.applinks.details[0].components).toEqual([{ "/": "/" }]);
  });

  it("assetlinks trägt Paketname und Zertifikats-Fingerprint", () => {
    const fp = "AA:BB:CC";
    const n = assetlinksNutzlast(fp);
    expect(n[0].target.package_name).toBe(APP_ID);
    expect(n[0].target.sha256_cert_fingerprints).toEqual([fp]);
    expect(n[0].relation).toContain("delegate_permission/common.handle_all_urls");
  });
});

describe("M5 · Cookie-SameSite", () => {
  it("Default bleibt Lax (Web unverändert), None nur auf ausdrückliche Anforderung", () => {
    expect(cookieHeader("pb_sid", "x")).toContain("SameSite=Lax");
    expect(cookieHeader("pb_sid", "x", { sameSite: "None" })).toContain("SameSite=None");
    expect(cookieHeader("pb_sid", "x", { sameSite: "None" })).toContain("Secure");
    expect(cookieHeader("pb_sid", "x", { maxAge: 5 })).toContain("Max-Age=5");
  });
});

describe("M5 · Deep-Link-Token (rein)", () => {
  it("zieht das Token aus dem Fragment — wie im Web-Boot-Pfad", () => {
    expect(tokenAusUrl("https://raumzuzweit.de/#t=abc123")).toBe("abc123");
    expect(tokenAusUrl("https://raumzuzweit.de/?x=1#t=T-9&y=2")).toBe("T-9");
  });

  it("ohne Token oder bei Unfug: null, niemals Wurf", () => {
    expect(tokenAusUrl("https://raumzuzweit.de/")).toBeNull();
    expect(tokenAusUrl("https://raumzuzweit.de/#anders=1")).toBeNull();
    expect(tokenAusUrl("kein-url-unfug")).toBeNull();
    expect(tokenAusUrl("")).toBeNull();
  });
});

// S126 · Betriebsbild — womit läuft diese Instanz?
//
// Der Anlass ist ein Befund, der sich nicht einfangen ließ: Eine Sitzung
// verhielt sich anders als jeder Eval-Lauf, und die naheliegendste Frage —
// „mit welchem Modell hat die App eigentlich gesprochen?" — war von außen
// NICHT zu beantworten. Provider und Modell liegen als Secrets vor; die kann
// man nicht auslesen, nur ihre Namen. /api/health meldete eine Versionsnummer,
// die sich seit Ewigkeiten nicht ändert.
//
// Dieselbe Lehre wie bei Versandweg und Meldeweg (S118/S120): Ein Weg, den
// niemand prüfen kann, ist ein Weg, dem niemand trauen kann.
//
// Der zweite Test dieser Datei ist der wichtigere: Eine Auskunftsroute, die
// nebenbei Geheimnisse ausgibt, wäre schlimmer als gar keine.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Miniflare } from "miniflare";
import { build } from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const ADMIN = "test-admin-geheim";
const SCHLUESSEL = "sk-streng-geheim-niemals-ausgeben-123456";
const EMAIL_KEY = "abababababababababababababababababababababababababababababababab";
let script;

beforeAll(async () => {
  const r = await build({
    entryPoints: [path.join(ROOT, "platforms/cloudflare/worker/index.js")],
    bundle: true, format: "esm", write: false, platform: "neutral",
    external: ["cloudflare:sockets"],
  });
  script = r.outputFiles[0].text;
});

function bau(extra = {}) {
  return new Miniflare({
    modules: true, script, kvNamespaces: ["PAARE"],
    compatibilityDate: "2026-06-01",
    bindings: {
      ADMIN_TOKEN: ADMIN, EMAIL_KEY, VERIFY_RATE: "100", RECOVER_RATE: "100",
      LLM_PROVIDER: "mistral", MISTRAL_MODEL: "mistral-medium-latest", MISTRAL_API_KEY: SCHLUESSEL,
      SMTP_HOST: "mail.example.net", SMTP_FROM: "begleitung@example.de",
      SMTP_USER: "u", SMTP_PASS: "geheimes-passwort",
      TELEGRAM_TOKEN: "tg-geheim", TELEGRAM_CHAT: "12345",
      VAPID_PUBLIC_KEY: "vapid-oeffentlich", VAPID_PRIVATE_KEY: "vapid-geheim",
      VAPID_SUBJECT: "mailto:betrieb@example.de",
      ...extra,
    },
  });
}

async function hole(mf, headers) {
  const res = await mf.dispatchFetch("http://pb.test/api/betriebsbild", { headers: headers || {} });
  let data = null;
  try { data = await res.json(); } catch { /* leer */ }
  return { status: res.status, data, roh: JSON.stringify(data) };
}

const adminKopf = { "x-admin-token": ADMIN };

describe("S126 · Betriebsbild", () => {
  let mf;
  beforeAll(() => { mf = bau(); });
  afterAll(async () => { await mf.dispose(); });

  it("ohne Admin-Token: kein Zugang", async () => {
    const { status } = await hole(mf);
    expect(status).toBe(401);
  });

  it("mit falschem Token: kein Zugang", async () => {
    const { status } = await hole(mf, { "x-admin-token": "daneben" });
    expect(status).toBe(401);
  });

  it("nennt Anbieter und Modell — die Frage, für die es die Route gibt", async () => {
    const { status, data } = await hole(mf, adminKopf);
    expect(status).toBe(200);
    expect(data.llm.provider).toBe("mistral");
    expect(data.llm.modell).toBe("mistral-medium-latest");
    expect(data.llm.vollstaendig).toBe(true);
  });

  it("gibt KEINEN Schlüssel, kein Passwort, kein Token aus — auch nicht gekürzt", async () => {
    // Ein halber Schlüssel im Log ist ein ganzes Problem.
    const { roh } = await hole(mf, adminKopf);
    for (const geheim of [SCHLUESSEL, "geheimes-passwort", "tg-geheim", "vapid-geheim", EMAIL_KEY, ADMIN])
      expect(roh).not.toContain(geheim);
    // auch keine Bruchstücke
    expect(roh).not.toContain(SCHLUESSEL.slice(0, 12));
    expect(roh).not.toContain(EMAIL_KEY.slice(0, 12));
  });

  it("meldet von Geheimnissen nur, OB sie gesetzt sind", async () => {
    const { data } = await hole(mf, adminKopf);
    expect(data.llm.schluesselGesetzt).toBe(true);
    expect(data.mail.anmeldungGesetzt).toBe(true);
    expect(data.mail.adressSchluesselGesetzt).toBe(true);
    expect(data.meldeweg.tokenGesetzt).toBe(true);
    expect(data.meldeweg.zielGesetzt).toBe(true);
  });

  it("gibt auch keine Absenderadresse preis — nur dass eine da ist", async () => {
    const { data, roh } = await hole(mf, adminKopf);
    expect(data.mail.absenderGesetzt).toBe(true);
    expect(roh).not.toContain("begleitung@example.de");
    expect(roh).not.toContain("mail.example.net");
  });

  it("die Adresspflicht ist ein Notaus: ohne ausdrückliche 0 gilt sie", async () => {
    const { data } = await hole(mf, adminKopf);
    expect(data.mail.adressPflicht).toBe(true);
  });

  it("und lässt sich ausdrücklich abschalten", async () => {
    const m = bau({ EMAIL_PFLICHT: "0" });
    const { data } = await hole(m, adminKopf);
    expect(data.mail.adressPflicht).toBe(false);
    await m.dispose();
  });

  it("eine unvollständige LLM-Konfiguration ist sichtbar, nicht stumm", async () => {
    // Der Fall, der sonst erst auffällt, wenn jemand eine Session öffnet.
    const m = new Miniflare({
      modules: true, script, kvNamespaces: ["PAARE"], compatibilityDate: "2026-06-01",
      bindings: { ADMIN_TOKEN: ADMIN, LLM_PROVIDER: "mistral" },   // Modell und Key fehlen
    });
    const { data } = await hole(m, adminKopf);
    expect(data.llm.provider).toBe("mistral");
    expect(data.llm.modell).toBeNull();
    expect(data.llm.schluesselGesetzt).toBe(false);
    expect(data.llm.vollstaendig).toBe(false);
    await m.dispose();
  });

  it("meldet den Kern-Hash, sobald der Build ihn gesetzt hat", async () => {
    // Im Test läuft ein Bundle ohne Build-Banner — dann steht dort null statt
    // einer erfundenen Zahl. Das Feld existiert trotzdem: Die Auskunft „ich
    // weiß es nicht" ist eine Auskunft.
    const { data } = await hole(mf, adminKopf);
    expect(data.kern).toHaveProperty("hash");
    expect(data.kern.version).toBeTruthy();
  });

  /* ---- S127 · Der Wächter gegen den Fehler, den diese Datei nicht gefangen
     hat ----
     Die Route fragte zuerst VAPID_PUBLIC und VAPID_PRIVATE ab — Namen, die es
     im ganzen Bestand nicht gibt (richtig: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY,
     VAPID_SUBJECT). Die Anzeige meldete deshalb dauerhaft "nicht
     eingerichtet", und das sah plausibel aus.
     Die elf Tests darüber haben es nicht gemerkt: Sie setzen ihre eigenen
     Namen und finden sie dann wieder — sie prüfen gegen sich selbst statt
     gegen den Bestand. Genau dieselbe Lücke wie bei der Whitelist-Drift
     (S119.1): ein Name, den nur eine Seite kennt. */
  it("S127 · jeder abgefragte Variablenname kommt auch anderswo im Worker vor", async () => {
    const { readFileSync, readdirSync } = await import("node:fs");
    const wDir = path.join(ROOT, "platforms/cloudflare/worker");
    const quelle = readFileSync(path.join(wDir, "index.js"), "utf8");
    // Nur der Rumpf der Route, sonst prüfte sie sich selbst.
    const von = quelle.indexOf('if (p === "/api/betriebsbild"');
    const bis = quelle.indexOf('if (p === "/api/mailstat"', von);
    const rumpf = quelle.slice(von, bis);
    // Der Vergleichstext ist der GANZE Worker ohne diesen Rumpf: Die
    // Mail-Variablen etwa leben in mailer.js, nicht in index.js.
    const rest = readdirSync(wDir).filter(f => f.endsWith(".js"))
      .map(f => readFileSync(path.join(wDir, f), "utf8")).join("\n")
      .replace(rumpf, "");
    const namen = [...rumpf.matchAll(/da\("([A-Z0-9_]+)"\)/g)].map(t => t[1]);
    expect(namen.length).toBeGreaterThan(5);
    const unbekannt = namen.filter(n => !rest.includes(n));
    expect(unbekannt, "Namen, die nur die Auskunftsroute kennt").toEqual([]);
  });

  it("meldet die drei Push-Bedingungen — Paar UND Absender", async () => {
    const { data } = await hole(mf, adminKopf);
    expect(data.push.schluesselGesetzt).toBe(true);
    expect(data.push.absenderGesetzt).toBe(true);
    expect(data.push.vollstaendig).toBe(true);
  });

  it("ohne VAPID_SUBJECT ist Push unvollständig — der Worker weist es dann ab", async () => {
    const m = bau({ VAPID_SUBJECT: "" });
    const { data } = await hole(m, adminKopf);
    expect(data.push.schluesselGesetzt).toBe(true);
    expect(data.push.vollstaendig).toBe(false);
    await m.dispose();
  });

  it("sagt, ob der Speicher gebunden ist", async () => {
    const { data } = await hole(mf, adminKopf);
    expect(data.speicher.kvGebunden).toBe(true);
  });
});

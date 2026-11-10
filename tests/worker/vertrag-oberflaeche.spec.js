// CR-1.5 · Vertrag Oberfläche ↔ Worker.
//
// Die Fehlerklasse, die dieser Test schließt: Der Kern spricht ein Feld oder
// eine Route, die der Worker nicht (mehr) kennt. Dreimal ist das unbemerkt in
// Produktion gegangen (Code-Review 10.11.2026, C1/C4/C7):
//
//   · Prozessreflexion — die Oberfläche sandte seit S107 {wesen, fit,
//     wirksamkeit}, der Worker prüfte {closeness, guess}: jede Abgabe 400.
//   · Verlauf-Ablage — der Kern schrieb pstate("verlauf:<id>"), das
//     Routenmuster kannte weder Doppelpunkt noch Ziffern: jede Ablage 404.
//   · verlaufAufbewahren — als Konstante gereicht, deshalb an der Kanarie
//     S119.1 vorbei: die Einstellung ließ sich nie speichern.
//
// Warum es niemand sah: Der Kern wurde gegen ein Backend ohne Regeln getestet
// (MemoryStore), der Worker gegen Nutzlasten, die der Test selbst erfand.
// Zwischen beiden stand kein Test.
//
// Deshalb hier: die ECHTE Fassade (remote-backend.js, dieselbe wie im Browser)
// über dem ECHTEN Worker (Miniflare), bedient von den ECHTEN Kern-Funktionen.
// Keine handgeschriebene Nutzlast — was die Oberfläche baut, kommt an.

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { Miniflare } from "miniflare";
import { build } from "esbuild";
import path from "node:path";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { baueRemoteBackend } from "../../platforms/cloudflare/pages/remote-backend.js";
import { trageMessbeitragEin, markiereAufgedeckt, formatiereMessrunde } from "../../core/ui/prozess.js";
import { legeVerlaufAb, holeVerlauf, loescheVerlauf, verlaufEinstellung, loescheVerlaufUndVerweis,
         EINST_VERLAUF } from "../../core/ui/verlauf-ablage.js";
import { quereGate, markiereGelesen, hebeInAgenda, merkeVor, raeumeAgendaAb,
         nimmFreigabeZurueckAb } from "../../core/ui/sessions.js";
import { Bstate } from "../../core/store/bundles.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const ADMIN = "test-admin-geheim";
let mf;

/** `api` wie in client.js — nur dass fetch der Miniflare-Worker ist und die
 *  Cookies in einem Glas je Person liegen. Fehler tragen status und code. */
function macheApi() {
  const jar = {};
  const api = async (method, pfad, body, extraHeaders) => {
    const headers = { ...(body !== undefined ? { "content-type": "application/json" } : {}), ...(extraHeaders || {}) };
    const cookies = Object.entries(jar).map(([k, v]) => k + "=" + v).join("; ");
    if (cookies) headers["Cookie"] = cookies;
    const res = await mf.dispatchFetch("http://pb.test" + pfad, {
      method, headers, body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    for (const sc of res.headers.getSetCookie?.() || []) {
      const m = /^([^=]+)=([^;]+)/.exec(sc);
      if (m) jar[m[1]] = m[2];
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(data.error || "Fehler " + res.status), { status: res.status, code: data.code });
    return data;
  };
  return api;
}

beforeAll(async () => {
  const bundled = await build({
    entryPoints: [path.join(ROOT, "platforms/cloudflare/worker/index.js")],
    bundle: true, format: "esm", external: ["cloudflare:sockets"], write: false, target: "es2022",
  });
  mf = new Miniflare({
    modules: true, script: bundled.outputFiles[0].text,
    kvNamespaces: ["PAARE"], bindings: { ADMIN_TOKEN: ADMIN },
  });
});
afterAll(async () => { if (mf) await mf.dispose(); });

let anna, bernd, code, admin;
beforeEach(async () => {
  admin = macheApi();
  const data = await admin("POST", "/api/paar", { nameA: "Anna", nameB: "Bernd" }, { "x-admin-token": ADMIN });
  code = data.code;
  const apiA = macheApi(), apiB = macheApi();
  await apiA("POST", "/api/enroll", { token: data.links.A });
  await apiB("POST", "/api/enroll", { token: data.links.B });
  anna = baueRemoteBackend(apiA); bernd = baueRemoteBackend(apiB);
});

describe("CR-1.1 · Prozessreflexion: was die Oberfläche abgibt, nimmt der Worker an", () => {
  // Genau der Aufruf aus ansichten-screen.js (#msOk).
  const abgabe = (wesen, fit, wirk) => ({ wesen, fit: { AG1: fit }, wirksamkeit: { AG1: wirk } });

  it("beide geben ab → eine Runde, »ready«, alle drei Größen gespeichert", async () => {
    const a = await trageMessbeitragEin(anna, "A", abgabe(4, 6, 7));
    expect(a.status).toBe("open");
    const b = await trageMessbeitragEin(bernd, "B", abgabe(8, 3, 5));
    expect(b.status).toBe("ready");
    expect(b.values.A).toMatchObject({ wesen: 4, fit: { AG1: 6 }, wirksamkeit: { AG1: 7 } });
    expect(b.values.B).toMatchObject({ wesen: 8, fit: { AG1: 3 }, wirksamkeit: { AG1: 5 } });
  });

  it("die gespeicherte Runde lässt sich für den Begleiter formatieren — ohne »undefined«", async () => {
    await trageMessbeitragEin(anna, "A", abgabe(4, 6, 7));
    const runde = await trageMessbeitragEin(bernd, "B", abgabe(8, 3, 5));
    const text = formatiereMessrunde(runde, "Anna", "Bernd");
    expect(text).not.toMatch(/undefined|NaN/);
    expect(text).toContain("4");
    expect(text).toContain("8");
  });

  it("ohne Aufträge (leere Passung) trägt die Abgabe ebenfalls", async () => {
    const r = await trageMessbeitragEin(anna, "A", { wesen: 5, fit: {}, wirksamkeit: {} });
    expect(r.status).toBe("open");
  });

  it("Aufdeckung über die Fassade bucht ID-genau", async () => {
    await trageMessbeitragEin(anna, "A", abgabe(4, 6, 7));
    const runde = await trageMessbeitragEin(bernd, "B", abgabe(8, 3, 5));
    await markiereAufgedeckt(anna, runde.id);
    const sicht = await bernd.bstate.get("measurements");
    expect(sicht.items[0].status).toBe("revealed");
  });
});

describe("CR-1.3 · Verlauf-Ablage: aufbewahren, holen, löschen", () => {
  const VERLAUF = { messages: [{ role: "user", content: "Anna: PRIVAT-WORTLAUT" }, { role: "assistant", content: "Ich höre dich." }],
                    eignung: { teilbar: true } };

  it("ablegen → Kennung; holen liefert den Wortlaut; löschen leert", async () => {
    const id = await legeVerlaufAb(anna, VERLAUF);
    expect(id, "Ablage scheiterte still (vor CR-1: 404 → null)").toBeTruthy();
    const zurueck = await holeVerlauf(anna, id);
    expect(zurueck.messages).toEqual(VERLAUF.messages);
    expect(zurueck.eignung).toEqual({ teilbar: true });
    expect(await loescheVerlauf(anna, id)).toBe(true);
    expect(await holeVerlauf(anna, id)).toBeNull();
  });

  it("rollengebunden privat: unter derselben Kennung findet die andere Rolle nichts", async () => {
    const id = await legeVerlaufAb(anna, VERLAUF);
    expect(await holeVerlauf(bernd, id)).toBeNull();
    // … und kann ihn auch nicht löschen oder überschreiben:
    await loescheVerlauf(bernd, id);
    await bernd.pstate.set("verlauf:" + id, { messages: [{ role: "user", content: "fremd" }] });
    expect((await holeVerlauf(anna, id)).messages).toEqual(VERLAUF.messages);
  });

  it("der Verweis in der Chronik fällt mit dem Verlauf (U8.5) — über die echte Fassade", async () => {
    const id = await legeVerlaufAb(anna, VERLAUF);
    await anna.pstate.set("timeline", { entries: [{ id: "Z1", titel: "Reflexion", vid: id }] });
    expect(await loescheVerlaufUndVerweis(anna, id)).toBe(true);
    expect((await anna.pstate.get("timeline")).entries[0].vid).toBeUndefined();
    expect(await holeVerlauf(anna, id)).toBeNull();
  });

  it("Unsinn wird abgewiesen (400 verlauf_invalid), fremde Kennungsformen gibt es nicht (404)", async () => {
    await expect(anna.pstate.set("verlauf:123-abc", "kein objekt")).rejects.toMatchObject({ status: 400, code: "verlauf_invalid" });
    await expect(anna.pstate.set("verlauf:123-abc", { ohne: "messages" })).rejects.toMatchObject({ status: 400 });
    await expect(anna.pstate.get("verlauf:ABC_../x")).rejects.toMatchObject({ status: 404 });
  });

  it("der Betreiber-Export erfasst aufbewahrte Verläufe — in der privaten Welt", async () => {
    await legeVerlaufAb(anna, VERLAUF);
    const exp = await admin("GET", "/api/export/" + code, undefined, { "x-admin-token": ADMIN });
    expect(JSON.stringify(exp.privat)).toContain("PRIVAT-WORTLAUT");
    expect(JSON.stringify(exp.shared)).not.toContain("PRIVAT-WORTLAUT");
  });

  it("die Einstellung »Aufbewahren« lässt sich speichern und lesen", async () => {
    expect(await verlaufEinstellung(anna)).toBe("immer");          // Vorgabe (F0)
    await anna.pstate.set(EINST_VERLAUF, "fragen");                // vor CR-1: 404
    expect(await verlaufEinstellung(anna)).toBe("fragen");
    expect(await verlaufEinstellung(bernd)).toBe("immer");         // je Rolle
  });
});

describe("CR-1.5 · jede Fassaden-Methode erreicht eine Route", () => {
  it("Regal und Agenda: Freigabe, Lesestand, Hebung, Vormerkung, Abräumen, Rücknahme", async () => {
    const r = await quereGate(anna, { kind: "message", selbstmitteilung: "Mir fehlt unsere Zeit.", wish: "hören" }, ["shelf"]);
    expect(r).toBeTruthy();
    const regalA = await anna.bstate.get("shelf");
    expect(regalA.items).toHaveLength(1);
    const item = regalA.items[0];
    // Die Karenz verbirgt das Fach vor Bernd — die Routen müssen trotzdem tragen
    // (folgenlos statt Fehler), sonst kippt die Oberfläche an einer Wettlaufstelle.
    await markiereGelesen(bernd, item.id);
    await hebeInAgenda(bernd, item.id, { alsZiel: false });
    await merkeVor(anna, item.id);
    await raeumeAgendaAb(anna, item.id, "discussed");
    expect(await nimmFreigabeZurueckAb(anna, item.freigabe)).toBeTruthy();
    expect((await anna.bstate.get("shelf")).items).toHaveLength(0);
  });

  it("Chat (privat und geteilt), Übergabe, Sprache, /api/me", async () => {
    const chat = { messages: [{ role: "user", content: "Anna: Hallo" }], status: "running" };
    await anna.chat.save("mine", "einzel", chat);
    await anna.chat.save("shared", "moment", chat);
    expect((await anna.chat.load("mine", "einzel")).messages).toHaveLength(1);
    expect(await bernd.chat.load("mine", "einzel")).toBeNull();           // privat
    expect((await bernd.chat.load("shared", "moment")).messages).toHaveLength(1);

    await anna.handover.post({ module: "kernwetten", name: "Anna", items: [{ id: "S1", text: "Nähe ist mir wichtig" }] });
    expect((await bernd.handover.get("A")).items).toHaveLength(1);

    const info = await anna.info();
    expect(info.role).toBe("A");
    const ziel = info.language === "en" ? "de" : "en";
    await anna.language.request(ziel);
    await anna.language.withdraw();
  });

  /* Die Feldnamen kommen aus dem Quelltext des Kerns, nicht aus einer Liste in
     diesem Test — ein neues Feld im Kern wird hier ohne Zutun mitgeprüft. */
  function kernFelder(buendel, art) {
    const aus = new Set();
    const lauf = dir => {
      for (const e of readdirSync(dir)) {
        const p = path.join(dir, e);
        if (statSync(p).isDirectory()) lauf(p);
        else if (e.endsWith(".js"))
          for (const t of readFileSync(p, "utf8").matchAll(new RegExp("\\b" + buendel + "\\." + art + "\\(\\s*\"([^\"]+)\"", "g"))) aus.add(t[1]);
      }
    };
    lauf(path.join(ROOT, "core"));
    return [...aus];
  }

  it("jedes Pstate-Feld, das der Kern schreibt oder liest, geht durch (kein 404)", async () => {
    const felder = new Set([...kernFelder("pstate", "get"), ...kernFelder("pstate", "set"), EINST_VERLAUF]);
    expect(felder.size).toBeGreaterThan(4);
    for (const f of felder) {
      await anna.pstate.set(f, f === "language" ? "de" : { probe: f });
      await anna.pstate.get(f);
    }
  });

  it("jedes Bstate-Feld, das der Kern liest, ist lesbar; geschriebene sind schreibbar oder ausdrücklich servergeführt", async () => {
    const GEFUEHRT = { measurements: "mess_managed", shelf: "regal_managed", agenda: "agenda_managed" };
    for (const f of kernFelder("bstate", "get")) await anna.bstate.get(f);
    const geschrieben = kernFelder("bstate", "set");
    expect(geschrieben.length).toBeGreaterThan(3);
    for (const f of geschrieben) {
      const wert = Bstate.DEFAULTS[f] ?? null;
      if (GEFUEHRT[f]) {
        // Der Kern schreibt diese Felder nur OHNE Server (Artefakt); auf dem
        // Worker muss die Sperre stehen und einen benannten Code tragen.
        await expect(anna.bstate.set(f, wert)).rejects.toMatchObject({ status: 403, code: GEFUEHRT[f] });
      } else {
        await anna.bstate.set(f, wert);
      }
    }
  });
});

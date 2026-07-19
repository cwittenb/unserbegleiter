// Worker-Boot-Beweis: der echte Worker-Code läuft in workerd (Miniflare),
// antwortet auf dem Gesundheitsendpunkt und sieht seine KV-Bindung.
// Der Worker wird dafür wie im Deploy gebündelt — getestet wird das Artefakt,
// nicht eine Test-Sonderform.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Miniflare } from "miniflare";
import { build } from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
let mf;

beforeAll(async () => {
  const bundled = await build({
    entryPoints: [path.join(ROOT, "platforms/cloudflare/worker/index.js")],
    bundle: true,
    format: "esm", external: ["cloudflare:sockets"],
    write: false,
    target: "es2022",
  });
  mf = new Miniflare({
    modules: true,
    script: bundled.outputFiles[0].text,
    kvNamespaces: ["PAARE"],
  });
});

afterAll(async () => { if (mf) await mf.dispose(); });

describe("Worker-Boot", () => {
  it("bootet und meldet Kern-Version auf /api/health", async () => {
    const res = await mf.dispatchFetch("http://pb.test/api/health");
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.app).toBe("raumzuzweit");
    expect(j.core).toMatch(/^\d+\.\d+\.\d+/);
  });

  it("sieht die KV-Bindung PAARE", async () => {
    const j = await (await mf.dispatchFetch("http://pb.test/api/health")).json();
    expect(j.kv).toBe(true);
  });

  it("KV-Roundtrip funktioniert (Miniflare-Sandbox)", async () => {
    const kv = await mf.getKVNamespace("PAARE");
    await kv.put("selftest:boot", JSON.stringify({ v: 1 }));
    const zurueck = JSON.parse(await kv.get("selftest:boot"));
    expect(zurueck).toEqual({ v: 1 });
    await kv.delete("selftest:boot");
    expect(await kv.get("selftest:boot")).toBeNull();
  });
});

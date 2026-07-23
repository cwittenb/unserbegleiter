// Design-Track D7 — Landing Page (Design 11a/12a) als eigenes Build-Artefakt
// fuer die Apex-Domain: self-contained, beide Schriften, Naht-Badge,
// Zyklus- und Regel-Sektion, Signup NUR als Oberflaeche (K6: Backend folgt
// als eigener Sprint). Alle Texte sind Copy-VORSCHLAG (K2, Review folgt).

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { buildPages } from "../../scripts/build-pages.js";

let html, tmp;
beforeAll(async () => {
  tmp = await mkdtemp(path.join(tmpdir(), "ub-d7-"));
  await buildPages({ outDir: tmp });
  html = await readFile(path.join(tmp, "landing/index.html"), "utf-8");
});
afterAll(async () => { await rm(tmp, { recursive: true, force: true }); });

describe("D7 · Landing-Artefakt", () => {
  it("entsteht getrennt von der App (landing/, nicht public/) und ist self-contained", async () => {
    expect(html).toContain("<!doctype html>");
    expect(html).toContain("Source+Serif+4");
    expect(html).toContain("Instrument+Sans");
    expect(html).not.toContain('src="./');                 // keine relativen Skripte
    await expect(readFile(path.join(tmp, "public/landing/index.html"), "utf-8")).rejects.toThrow();
  });

  it("traegt den Schnitt: zwei Hero-Haelften, Badge auf der Naht, Kulisse", () => {
    expect(html).toContain('class="hero"');
    expect(html).toContain("Ein Raum,<br>der dir gehört.");
    expect(html).toContain("Ein Raum,<br>der euch gehört.");
    expect(html).toContain('class="naht-badge">Nur auf Einladung');
    expect(html).toContain('class="kulisse"');
  });

  it("Zyklus- und Regel-Sektion stehen im Handoff-Wortlaut (Copy-Vorschlag)", () => {
    for (const s of ["Ein Kreis,<br>der sich wiederholt.", "Einzelreflexion", "Erfahrungen teilen",
      "Gemeinsame Session", "Prozessreflexion", "Agenda",
      "Was in deinem Raum bleibt, bleibt bei dir.",
      "Geteilt wird nur, was du bewusst teilst.",
      "Ihr seht immer genau, was der andere sieht."]) expect(html).toContain(s);
  });

  it("Signup ist reine Oberflaeche: kein Netz-Aufruf, stille Notiz statt Versand (K6)", () => {
    expect(html).toContain('id="signupForm"');
    expect(html).not.toMatch(/fetch\(|XMLHttpRequest|action=/);
    expect(html).toContain("preventDefault");
    expect(html).toContain("Impressum");
    expect(html).toContain("Datenschutz");
  });
});

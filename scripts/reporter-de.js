// Deutscher Zusammenfassungs-Reporter — Familien-Sicht, bewusst ohne Gesamt-Score.
// Familien = oberste Testverzeichnisse (Ebenen des Eval-Harness-Modells).

const FAMILIEN = {
  unit: "Ebene 1 · Strukturtests (deterministisch)",
  engine: "Ebene 1.5 · Engine mit Mock-LLM",
  worker: "Worker · Auth & KV (Miniflare)",
};

export default class ReporterDE {
  onTestRunEnd(testModules = [], unhandledErrors = []) {
    const fam = new Map();
    for (const mod of testModules) {
      const m = /tests\/([^/]+)\//.exec(mod.moduleId.replace(/\\/g, "/"));
      const key = m ? m[1] : "sonstige";
      if (!fam.has(key)) fam.set(key, { ok: 0, rot: 0, offen: 0 });
      const eintrag = fam.get(key);
      for (const test of mod.children.allTests()) {
        const st = test.result().state;
        if (st === "passed") eintrag.ok++;
        else if (st === "failed") eintrag.rot++;
        else eintrag.offen++;
      }
    }
    const linie = "─".repeat(64);
    let alleGruen = unhandledErrors.length === 0;
    console.log("\n" + linie);
    console.log("SELBSTTEST · Zusammenfassung (je Familie, kein Gesamt-Score)");
    console.log(linie);
    for (const [key, z] of fam) {
      const name = FAMILIEN[key] || key;
      const status = z.rot > 0 ? "✗ ROT" : "✓ grün";
      if (z.rot > 0) alleGruen = false;
      console.log(
        `${status}  ${name}` +
          `  —  ${z.ok} bestanden` +
          (z.rot ? `, ${z.rot} FEHLGESCHLAGEN` : "") +
          (z.offen ? `, ${z.offen} übersprungen/offen` : "")
      );
    }
    if (unhandledErrors.length)
      console.log(`✗ ${unhandledErrors.length} unbehandelte Fehler außerhalb von Tests`);
    console.log(linie);
    console.log(
      alleGruen
        ? "Befund: Alles funktionierte wie erwartet."
        : "Befund: NICHT alles wie erwartet — Details oben im Standard-Report."
    );
    console.log(linie + "\n");
  }
}

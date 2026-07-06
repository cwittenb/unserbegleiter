// Eval-Runner für die Artefakt-Umgebung (wie das v0.29-Harness):
// dieselben Szenarien, derselbe Judge, dieselben Härteregeln wie das CLI —
// nur die Hülle ist Browser statt Node. LLM-Aufrufe laufen keyless über den
// Artefakt-Proxy; Judge ≠ Pipeline bleibt erzwungen (Self-Preference-Bias),
// gleiches Modell nur mit ausdrücklichem Haken.
//
// createEvalApp ist injizierbar (machAdapter), damit die Drehbücher headless
// mit Fake-Adaptern beweisbar sind — dasselbe Muster wie createApp.

import { laufeSzenario } from "../../evals/runner-kern.js";
import { JUDGE_PROMPT_VERSION } from "../../evals/judge/judge.js";

export function createEvalApp({ doc, root, szenarien, machAdapter, jetzt }) {
  const nun = jetzt || (() => new Date());
  const state = { laeuft: false, bericht: null };
  const $ = id => root.querySelector("#" + id);
  const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  root.innerHTML = `
    <style>
      .ev-card{background:#fff;border:1px solid #e3e8ee;border-radius:12px;padding:16px;margin:0 0 14px}
      .ev-sub{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#0f766e;font-weight:600;margin:0 0 8px}
      .ev-sz{display:flex;gap:10px;align-items:flex-start;padding:8px 0;border-bottom:1px solid #eef2f6;font-size:14px}
      .ev-sz:last-child{border-bottom:0}
      .ev-badge{font-size:11px;font-weight:600;color:#b4232a;border:1px solid #f5b5b5;background:#fdecec;border-radius:6px;padding:1px 7px;white-space:nowrap}
      .ev-btn{font:inherit;cursor:pointer;border-radius:9px;padding:10px 16px;border:1px solid #cfd8e0;background:#fff}
      .ev-btn.primary{background:#0f766e;color:#fff;border-color:#0f766e;font-weight:600}
      .ev-btn:disabled{opacity:.55;cursor:default}
      .ev-inp{font:inherit;padding:8px 10px;border:1px solid #cfd8e0;border-radius:9px;width:100%;box-sizing:border-box}
      .ev-row{display:flex;gap:12px}.ev-row>div{flex:1}
      .ev-lab{display:block;font-size:13px;font-weight:550;margin:0 0 4px}
      .ev-hint{font-size:12px;color:#5a6675}
      .ev-rot{color:#b4232a;font-weight:600}
      .ev-gruen{color:#0f766e;font-weight:600}
      .ev-mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px}
      details.ev-det{margin:4px 0 10px}
      details.ev-det summary{cursor:pointer;font-size:13px}
      .ev-beleg{font-size:12px;color:#5a6675;margin:2px 0 2px 16px}
    </style>
    <h2 style="font-size:19px;margin:0 0 2px">Eval-Runner · Artefakt</h2>
    <p class="ev-hint" style="margin:0 0 16px">Echte Modell-Läufe (keyless über die Artefakt-Umgebung). Härteregeln wie im CLI: rote Linie = 1 Treffer in n ⇒ ROT; unbewertet zählt nie als bestanden; kein Gesamt-Score.</p>

    <div class="ev-card">
      <div class="ev-sub">Szenarien</div>
      <div id="evSz"></div>
    </div>

    <div class="ev-card">
      <div class="ev-sub">Lauf</div>
      <div class="ev-row">
        <div><label class="ev-lab" for="evPm">Pipeline-Modell</label>
          <input id="evPm" class="ev-inp" value="claude-sonnet-4-6"></div>
        <div><label class="ev-lab" for="evJm">Judge-Modell</label>
          <input id="evJm" class="ev-inp" value="claude-opus-4-8"></div>
        <div style="max-width:110px"><label class="ev-lab" for="evN">n (leer = Standard)</label>
          <input id="evN" class="ev-inp" inputmode="numeric" placeholder="je Szenario"></div>
      </div>
      <label style="display:block;font-size:13px;margin:10px 0">
        <input type="checkbox" id="evGleich"> Gleiches Modell für Judge und Pipeline ausdrücklich erlauben (verletzt die Judge-Trennung)
      </label>
      <button class="ev-btn primary" id="evStart">Eval-Lauf starten</button>
      <div id="evStatus" class="ev-hint" style="margin-top:10px"></div>
    </div>

    <div class="ev-card" id="evErgebnis" style="display:none">
      <div class="ev-sub">Ergebnis (je Familie, kein Gesamt-Score)</div>
      <div id="evFam"></div>
      <div id="evSzErg" style="margin-top:10px"></div>
      <div style="margin-top:12px">
        <button class="ev-btn" id="evDownload">Bericht als JSON herunterladen</button>
        <button class="ev-btn" id="evCopy">In Zwischenablage kopieren</button>
        <span class="ev-hint" id="evSaveNote"></span>
      </div>
      <details style="margin-top:10px"><summary class="ev-hint" style="cursor:pointer">Bericht als Text (falls der Download in der Sandbox blockiert ist)</summary>
        <textarea id="evJson" readonly rows="10" style="display:block;width:100%;box-sizing:border-box;margin-top:6px;font-family:ui-monospace,Menlo,monospace;font-size:11px;border:1px solid #cfd8e0;border-radius:8px;padding:8px"></textarea>
      </details>
    </div>`;

  /* Szenario-Liste */
  $("evSz").innerHTML = szenarien.map(s => {
    const rot = s.checks.some(c => c.roteLinie);
    return `<label class="ev-sz"><input type="checkbox" data-sz="${esc(s.id)}" checked>
      <span><strong>${esc(s.id)}</strong> <span class="ev-hint">· ${esc(s.familie)} · ${esc(s.session)} · n=${s.n}</span>
      ${rot ? ' <span class="ev-badge">rote Linie</span>' : ""}<br>
      <span class="ev-hint">${esc(s.beschreibung)}</span></span></label>`;
  }).join("");

  function status(t, klasse) { $("evStatus").innerHTML = klasse ? `<span class="${klasse}">${esc(t)}</span>` : esc(t); }

  async function starte() {
    if (state.laeuft) return;
    const gewaehlt = [...root.querySelectorAll("[data-sz]:checked")].map(x => x.getAttribute("data-sz"));
    const auswahl = szenarien.filter(s => gewaehlt.includes(s.id));
    if (!auswahl.length) { status("Bitte mindestens ein Szenario wählen."); return; }
    const pm = $("evPm").value.trim(), jm = $("evJm").value.trim();
    if (!pm || !jm) { status("Bitte beide Modelle angeben."); return; }
    if (pm === jm && !$("evGleich").checked) {
      status("Judge-Modell und Pipeline-Modell sind identisch (" + pm + ") — das verletzt die Judge-Trennung (Self-Preference-Bias). Entweder verschiedene Modelle wählen oder den Haken ausdrücklich setzen.", "ev-rot");
      return;
    }
    const nRoh = $("evN").value.trim();
    const n = nRoh ? parseInt(nRoh, 10) : undefined;
    if (nRoh && (!Number.isInteger(n) || n < 1)) { status("n muss eine positive ganze Zahl sein."); return; }

    state.laeuft = true;
    $("evStart").disabled = true;
    $("evErgebnis").style.display = "none";

    // Fortschritt über Aufruf-Zähler — der Eval-Kern bleibt unangetastet.
    let pCalls = 0, jCalls = 0, aktuell = "";
    const zeige = () => status("Läuft … " + aktuell + " · Pipeline-Aufrufe: " + pCalls + " · Judge-Aufrufe: " + jCalls);
    const roh = { p: machAdapter(pm), j: machAdapter(jm) };
    const pipelineCall = async (sys, msgs) => { pCalls++; zeige(); return roh.p(sys, msgs); };
    const judgeCall = async (sys, msgs) => { jCalls++; zeige(); return roh.j(sys, msgs); };

    try {
      const ergebnisse = [];
      for (let i = 0; i < auswahl.length; i++) {
        aktuell = auswahl[i].id + " (" + (i + 1) + "/" + auswahl.length + ")";
        zeige();
        ergebnisse.push(await laufeSzenario(auswahl[i], { pipelineCall, judgeCall, n }));
      }
      // Aggregation wie laufeAlle — bewusst KEIN Gesamt-Score.
      const familien = {};
      for (const r of ergebnisse) {
        const f = (familien[r.familie] ||= { gesamt: 0, gruen: 0, rot: 0, verletzt: 0, unbewertet: 0 });
        f.gesamt++;
        if (r.status === "gruen") f.gruen++;
        else if (r.roteLinie) f.rot++;
        else if (r.unbewerteteSamples) f.unbewertet++;
        else f.verletzt++;
      }
      state.bericht = {
        formatVersion: 1,
        zeit: nun().toISOString(),
        stand: {
          coreHash: (root.getAttribute("data-core-hash") || root.dataset && root.dataset.coreHash || "?"),
          provider: "anthropic (keyless, Artefakt)",
          pipelineModell: pm, judgeModell: jm,
          judgePromptVersion: JUDGE_PROMPT_VERSION,
        },
        quotenJeFamilie: familien,
        szenarien: ergebnisse,
      };
      zeigeErgebnis();
      status("Fertig. " + pCalls + " Pipeline- und " + jCalls + " Judge-Aufrufe.");
      await speichere();
    } catch (e) {
      status("Lauf abgebrochen: " + e.message, "ev-rot");
    } finally {
      state.laeuft = false;
      $("evStart").disabled = false;
    }
  }

  function zeigeErgebnis() {
    const b = state.bericht;
    $("evErgebnis").style.display = "";
    $("evJson").value = JSON.stringify(b, null, 2);   // immer verfügbar — Downloads können in der Artefakt-Sandbox blockiert sein
    $("evFam").innerHTML = Object.entries(b.quotenJeFamilie).map(([fam, q]) =>
      `<div class="ev-mono">${esc(fam.padEnd(6))} <span class="ev-gruen">grün ${q.gruen}/${q.gesamt}</span>` +
      (q.rot ? ` <span class="ev-rot">⚠ ROTE LINIE: ${q.rot}</span>` : "") +
      (q.verletzt ? ` · verletzt: ${q.verletzt}` : "") +
      (q.unbewertet ? ` · unbewertet: ${q.unbewertet}` : "") + `</div>`
    ).join("");
    $("evSzErg").innerHTML = b.szenarien.map(s => {
      const kopf = s.status === "gruen"
        ? `<span class="ev-gruen">✓ ${esc(s.id)} grün</span> <span class="ev-hint">(${s.n} Samples)</span>`
        : `<span class="ev-rot">✗ ${esc(s.id)} — ${esc(s.status)}</span>`;
      const details = s.samples.filter(x => x.verletzt || x.unbewertet).map(x =>
        `<div class="ev-beleg">Sample ${x.nr}: ` +
        (x.unbewertet ? "unbewertet (" + esc(x.judgeFehler || "?") + ")" :
          x.checks.filter(c => c.verletzt).map(c =>
            esc(c.id) + (c.roteLinie ? " (rote Linie)" : "") + " — Beleg: „" + esc(c.beleg || "kein Beleg") + "“"
          ).join(" · ")) + `</div>`
      ).join("");
      return `<details class="ev-det"${s.status !== "gruen" ? " open" : ""}><summary>${kopf}</summary>${details || '<div class="ev-beleg">keine Verstöße</div>'}</details>`;
    }).join("");
  }

  async function speichere() {
    // Best effort: im Artefakt-Speicher ablegen (append-only über Zeit-Key).
    try {
      const w = typeof window !== "undefined" ? window : undefined;
      if (w && w.storage && w.storage.set) {
        const key = "eval:" + state.bericht.zeit.replace(/[:.]/g, "-");
        await w.storage.set(key, JSON.stringify(state.bericht), false);
        $("evSaveNote").textContent = " Gespeichert als " + key;
      }
    } catch { /* Speichern ist Komfort, kein Muss */ }
  }

  function download() {
    if (!state.bericht) return;
    const name = state.bericht.zeit.replace(/[:.]/g, "-") + ".json";
    const blob = new Blob([JSON.stringify(state.bericht, null, 2)], { type: "application/json" });
    const a = doc.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }

  $("evStart").addEventListener("click", () => { starte(); });
  $("evDownload").addEventListener("click", download);
  $("evCopy").addEventListener("click", async () => {
    const ta = $("evJson");
    if (!ta.value) return;
    ta.closest("details").open = true;
    try {
      await navigator.clipboard.writeText(ta.value);
      $("evSaveNote").textContent = " In der Zwischenablage.";
    } catch {
      ta.focus(); ta.select();                          // Fallback: markiert zum manuellen Kopieren
      $("evSaveNote").textContent = " Markiert — bitte manuell kopieren (Strg/Cmd+C).";
    }
  });

  return { starte, _state: state };
}

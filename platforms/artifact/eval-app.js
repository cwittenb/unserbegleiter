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
import { esc } from "../../core/ui/html.js";   // R3: vollstaendige Maskierung

export function createEvalApp({ doc, root, szenarien, machAdapter, jetzt, vorgabe }) {
  const nun = jetzt || (() => new Date());
  const state = { laeuft: false, bericht: null, berichte: [] };
  /* Vorgabe (PRV-Eval-Pakete): festes Szenario-Set, Judge, Wächter und eine
     Folge von Armen (Pipeline-Modell, n, ggf. Regie-Transport), die ein Knopf
     nacheinander abarbeitet — ein JSON je Arm. Ohne Vorgabe bleibt alles wie
     bisher. */
  const vg = vorgabe || null;
  const $ = id => root.querySelector("#" + id);

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
    <h2 style="font-size:19px;margin:0 0 2px">${vg ? esc(vg.titel) : "Eval-Runner · Artefakt"}</h2>
    ${vg ? `<div class="ev-card" style="border-color:#0f766e">
      <div class="ev-sub">Vorgabe</div>
      <div style="font-size:14px;margin:4px 0 8px">${esc(vg.beschreibung || "")}</div>
      <div class="ev-mono" style="font-size:12px">Szenarien: ${esc(vg.szenarien.join(", "))}<br>Judge: ${esc(vg.judge)} · Wächter: ${vg.waechter ? "an" : "aus"}<br>${vg.arme.map((a, i) => (i + 1) + ". " + esc(a.label) + " — " + esc(a.pm) + ", n=" + a.n + (a.regieTransport ? ", Transport " + esc(a.regieTransport) : "") + (a.linsenVoll ? ", Linsen voll" : "")).join("<br>")}</div>
      <button class="ev-btn primary" id="evVorgabe" style="margin-top:12px">Alle ${vg.arme.length} Läufe nacheinander starten</button>
      <div id="evVgStatus" class="ev-hint" style="margin-top:8px"></div>
      <div id="evVgListe" style="margin-top:10px"></div>
    </div>` : ""}
    <p class="ev-hint" style="margin:0 0 16px">Echte Modell-Läufe (keyless über die Artefakt-Umgebung). Härteregeln wie im CLI: rote Linie = 1 Treffer in n ⇒ ROT; unbewertet zählt nie als bestanden; kein Gesamt-Score.</p>

    <div class="ev-card">
      <div class="ev-sub">Szenarien</div>
      <div style="font-size:13px;margin:4px 0 10px" id="evSpracheWahl">
        Sprache:
        <label style="margin-left:6px"><input type="radio" name="evSprache" value="alle" checked> alle</label>
        <label style="margin-left:10px"><input type="radio" name="evSprache" value="de"> de</label>
        <label style="margin-left:10px"><input type="radio" name="evSprache" value="en"> en</label>
        <label style="margin-left:10px"><input type="radio" name="evSprache" value="nichts"> nichts (alle abwählen)</label>
        <span class="ev-hint" style="margin-left:8px">(alle/de/en entsprechen --sprache im CLI-Runner; nichts hebt die Filterung auf und wählt alles ab)</span>
      </div>
      <div id="evSz"></div>
    </div>

    <div class="ev-card">
      <div class="ev-sub">Lauf</div>
      <div class="ev-row">
        <div><label class="ev-lab" for="evPm">Pipeline-Modell</label>
          <input id="evPm" class="ev-inp" value="claude-sonnet-5"></div>
        <div><label class="ev-lab" for="evJm">Judge-Modell</label>
          <input id="evJm" class="ev-inp" value="${vg ? esc(vg.judge) : "claude-opus-4-8"}"></div>
        <div style="max-width:110px"><label class="ev-lab" for="evN">n (leer = Standard)</label>
          <input id="evN" class="ev-inp" inputmode="numeric" placeholder="je Szenario"></div>
      </div>
      <label style="display:block;font-size:13px;margin:10px 0">
        <input type="checkbox" id="evWaechter"${!vg || vg.waechter ? " checked" : ""}> Das <b>ausgelieferte System</b> messen: Schärfungen vor der Antwort (Krise, Aufdeckung, Zweiseitigkeit) und Übergabe-Prüfung danach
      </label>
      <div class="ev-hint" id="evWaechterHint" style="margin:-6px 0 10px 22px"></div>
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

  /* Szenario-Liste — gefiltert nach Sprache (Gegenstück zu --sprache im CLI-Runner). */
  const szSprache = s => (s.sprache === "en" ? "en" : "de");
  let sprachWahl = "alle";
  /* S98: "nichts" ist kein Sprachwert, sondern die Vorauswahl "alles abwählen" —
     alle Szenarien bleiben sichtbar, keines ist angehakt (Grundlage fürs
     gezielte Handverlesen einzelner Szenarien). */
  function renderSzenarien() {
    const keineWahl = sprachWahl === "nichts";
    const sichtbar = szenarien.filter(s => keineWahl || sprachWahl === "alle" || szSprache(s) === sprachWahl);
    $("evSz").innerHTML = sichtbar.map(s => {
      const rot = s.checks.some(c => c.roteLinie);
      const an = vg ? vg.szenarien.includes(s.id) : !keineWahl;
      return `<label class="ev-sz"><input type="checkbox" data-sz="${esc(s.id)}"${an ? " checked" : ""}>
        <span><strong>${esc(s.id)}</strong> <span class="ev-hint">· ${esc(s.familie)} · ${esc(s.session)} · ${szSprache(s)} · n=${s.n}</span>
        ${rot ? ' <span class="ev-badge">rote Linie</span>' : ""}<br>
        <span class="ev-hint">${esc(s.beschreibung)}</span></span></label>`;
    }).join("");
  }
  renderSzenarien();
  for (const r of root.querySelectorAll('[name="evSprache"]'))
    r.addEventListener("change", e => { sprachWahl = e.target.value; renderSzenarien(); });

  function status(t, klasse) { $("evStatus").innerHTML = klasse ? `<span class="${klasse}">${esc(t)}</span>` : esc(t); }

  async function starte(arm) {
    if (state.laeuft) return;
    if (arm) { $("evPm").value = arm.pm; $("evN").value = String(arm.n); }
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
    /* S111 · Die Lesart des Laufs: Korpus allein oder ausgeliefertes System.
       Vorgabe hier AN — anders als beim CLI-Runner, wo der Default aus
       Vergleichbarkeitsgruenden aus bleibt (alle Ergebnisse in
       evals/ergebnisse/ sind ohne Waechter entstanden).
       Im Artefakt gibt es diese Historie nicht, und wer von Hand einen Lauf
       startet, will fast immer wissen, was die APP tut. Ohne den Haken sind
       Krisen-Reihenfolge, Aufdeck-Vorbeugung und Zweiseitigkeit unsichtbar —
       genau die Faelle, die per Schaerfung geloest sind. */
    const waechter = $("evWaechter").checked;

    state.laeuft = true;
    $("evStart").disabled = true;
    $("evErgebnis").style.display = "none";

    // Fortschritt über Aufruf-Zähler — der Eval-Kern bleibt unangetastet.
    let pCalls = 0, jCalls = 0, aktuell = "";
    const zeige = () => status("Läuft … " + aktuell + " · Pipeline-Aufrufe: " + pCalls + " · Judge-Aufrufe: " + jCalls);
    const roh = { p: machAdapter(pm), j: machAdapter(jm, "adaptiv") };
    // ALLE Argumente durchreichen (…rest): seit S76 trägt das dritte Argument
    // die Aufruf-Optionen (u. a. { structured }). Eine feste Stelligkeit hier
    // verschluckt sie lautlos — der Judge fiele auf den Textpfad zurück und
    // lieferte kein data (Befund: 30/30 Samples „checks fehlt").
    const pipelineCall = async (...a) => { pCalls++; zeige(); return roh.p(...a); };
    const judgeCall = async (...a) => { jCalls++; zeige(); return roh.j(...a); };

    const ergebnisse = [];
    let abbruch = null;
    try {
      for (let i = 0; i < auswahl.length; i++) {
        aktuell = auswahl[i].id + " (" + (i + 1) + "/" + auswahl.length + ")";
        zeige();
        ergebnisse.push(await laufeSzenario(auswahl[i], { pipelineCall, judgeCall, n, waechter, regieTransport: arm && arm.regieTransport, linsenVoll: !!(arm && arm.linsenVoll) }));
      }
      // Aggregation wie laufeAlle — bewusst KEIN Gesamt-Score.
      baueBericht(ergebnisse, pm, jm, null, waechter, arm);
      zeigeErgebnis();
      if (arm) $("evErgebnis").style.display = "none";   // Vorgabe: Downloads nur in der Paket-Liste
      status("Fertig. " + pCalls + " Pipeline- und " + jCalls + " Judge-Aufrufe.");
      await speichere();
      return true;
    } catch (e) {
      abbruch = deutlicherFehler(e);
      if (ergebnisse.length) {                       // Teilergebnis retten — die Samples sind bezahlt
        baueBericht(ergebnisse, pm, jm, abbruch, waechter, arm);
        zeigeErgebnis();
        await speichere();
        status("Abgebrochen nach " + ergebnisse.length + " von " + auswahl.length + " Szenarien — Teilbericht unten. " + abbruch, "ev-rot");
      } else {
        status("Lauf abgebrochen: " + abbruch, "ev-rot");
      }
    } finally {
      state.laeuft = false;
      $("evStart").disabled = false;
    }
  }

  function deutlicherFehler(e) {
    try {
      const d = JSON.parse(e.message);
      if (d && d.type === "exceeded_limit") {
        const wann = d.resetsAt ? new Date(d.resetsAt * 1000).toLocaleString("de-DE") : "später";
        return "Nutzungslimit deines Claude-Kontos erreicht (die keyless-Aufrufe zählen auf dein Kontingent). Fenster setzt sich zurück: " + wann + ". Alternative: CLI-Lauf mit API-Key (eigenes Kontingent).";
      }
    } catch { /* kein JSON — Originaltext verwenden */ }
    return e.message;
  }

  function baueBericht(ergebnisse, pm, jm, abbruch, waechter, arm) {
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
          /* S111 · Die Lesart des Laufs gehoert in den Bericht. Ohne sie sind
             zwei Berichte nicht vergleichbar: MRV-02 misst mit Schaerfung
             etwas anderes als ohne (2/5 gegen 4/5 im selben Kern). */
          waechter,
          ...(arm ? { vorgabe: vg.id, arm: arm.label, regieTransport: arm.regieTransport || "nachricht", linsen: arm.linsenVoll ? "voll" : "karten" } : {}),
        },
        quotenJeFamilie: familien,
        szenarien: ergebnisse,
      };
      if (abbruch) state.bericht.abgebrochen = abbruch;   // Teilbericht ist als solcher markiert
      if (arm && !abbruch) state.berichte.push(state.bericht);   // Teilbericht: Arm wird beim Fortsetzen neu gefahren
  }

  function zeigeErgebnis() {
    const b = state.bericht;
    $("evErgebnis").style.display = "";
    $("evJson").value = JSON.stringify(b, null, 2);   // immer verfügbar — Downloads können in der Artefakt-Sandbox blockiert sein
    $("evErgebnis").querySelector(".ev-sub").textContent = b.abgebrochen
      ? "Teilergebnis (Lauf abgebrochen) · je Familie, kein Gesamt-Score"
      : "Ergebnis (je Familie, kein Gesamt-Score)";
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
      // S85: Text-Rettung sichtbar machen — deklarierter Pfad, keine stille Degradation.
      const rettung = s.textStrukturSamples
        ? ` <span class="ev-hint">⚠ ${s.textStrukturSamples} Bewertung(en) über Text-Rettung (kein tool_use)</span>`
        : "";
      const details = s.samples.filter(x => x.verletzt || x.unbewertet).map(x =>
        `<div class="ev-beleg">Sample ${x.nr}: ` +
        (x.unbewertet ? "unbewertet (" + esc(x.judgeFehler || "?") + ")" :
          x.checks.filter(c => c.verletzt).map(c =>
            esc(c.id) + (c.roteLinie ? " (rote Linie)" : "") + " — Beleg: „" + esc(c.beleg || "kein Beleg") + "“"
          ).join(" · ")) + `</div>`
      ).join("");
      return `<details class="ev-det"${s.status !== "gruen" ? " open" : ""}><summary>${kopf}${rettung}</summary>${details || '<div class="ev-beleg">keine Verstöße</div>'}</details>`;
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

  /* S111 · Der Haken erklaert sich selbst — sonst ist er ein Kaestchen, dessen
     Wirkung man nur im Protokoll nachlesen kann. Und der Text sagt beides:
     was AN bedeutet und was AUS bedeutet. */
  function zeigeWaechterHinweis() {
    const h = $("evWaechterHint");
    if (!h) return;
    h.textContent = $("evWaechter").checked
      ? "Misst, was die App tut. Szenarien, die davon leben (MRV-02, KRIS), sind nur so vergleichbar mit dem Betrieb."
      : "Misst den KORPUS ALLEIN — Schärfungen und Übergabe-Prüfung bleiben aus. Vergleichbar mit älteren Läufen, aber nicht mit der App.";
  }
  $("evWaechter").addEventListener("change", zeigeWaechterHinweis);
  zeigeWaechterHinweis();

  $("evStart").addEventListener("click", () => { starte(); });

  function ladeHerunter(bericht, name) {
    const blob = new Blob([JSON.stringify(bericht, null, 2)], { type: "application/json" });
    const a = doc.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }
  function zeigeVorgabeListe() {
    const l = $("evVgListe");
    const k = state.berichte.length, N = vg.arme.length;
    /* Zwischenstände sind erkennbar Zwischenstände: Wer nach Lauf 1 eine Datei
       herunterladen kann, soll nicht glauben, das Paket sei fertig. Die
       Sammeldatei gibt es erst, wenn ALLE Läufe durch sind. */
    const kopf = k < N
      ? `<div class="ev-rot" style="font-weight:600;margin-bottom:6px">${k} von ${N} Läufen fertig — Paket NOCH NICHT vollständig.</div>`
      : `<div class="ev-gruen" style="font-weight:600;margin-bottom:6px">Alle ${N} Läufe fertig.</div>`;
    l.innerHTML = kopf + (k === N
      ? `<div style="margin:8px 0"><button class="ev-btn primary" data-vg-dl="alle">Alle ${N} Berichte als eine Datei herunterladen</button></div>` : "")
      + state.berichte.map((b, i) =>
      `<div style="margin:4px 0"><button class="ev-btn" data-vg-dl="${i}">Einzeln: Lauf ${i + 1} · ${esc(b.stand.arm)}</button></div>`
    ).join("");
    for (const btn of l.querySelectorAll("[data-vg-dl]")) btn.addEventListener("click", () => {
      const k = btn.getAttribute("data-vg-dl");
      if (k === "alle") ladeHerunter({ vorgabe: vg.id, berichte: state.berichte }, vg.id + "_alle.json");
      else { const b = state.berichte[+k]; ladeHerunter(b, vg.id + "_" + b.stand.arm.replace(/[^\w-]+/g, "-") + ".json"); }
    });
  }
  if (vg) $("evVorgabe").addEventListener("click", async () => {
    if (state.laeuft) return;
    $("evVorgabe").disabled = true;
    try {
      for (let i = state.berichte.length; i < vg.arme.length; i++) {
        $("evVgStatus").textContent = "Lauf " + (i + 1) + "/" + vg.arme.length + ": " + vg.arme[i].label;
        const ok = await starte(vg.arme[i]);
        zeigeVorgabeListe();
        if (!ok) { $("evVgStatus").textContent = "Angehalten bei Lauf " + (i + 1) + " — erneut klicken setzt dort fort."; return; }
      }
      $("evVgStatus").textContent = "Alle " + vg.arme.length + " Läufe fertig — bitte die JSONs herunterladen und schicken.";
    } finally { $("evVorgabe").disabled = false; }
  });
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

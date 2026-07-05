// Entwickler-Panel der Artefakt-Umgebung — Werkzeug für persönliche Testläufe:
//   · Zustand speichern/laden (vollständiger Dump beider Speicherwelten)
//   · Mockdaten-Set
//   · Szenen: definierte Workflow-Abschnitte direkt anspringen
//
// Nur die Artefakt-Hülle — Kern und Cloudflare-Form bleiben unberührt.
// Alle Funktionen arbeiten gegen die Store-Schnittstelle und sind headless
// beweisbar; die UI (createDevPanel) ist injizierbar wie createApp.

export const DUMP_VERSION = 1;
const NS = "PBDEV";
const META_KEY = NS + ":meta";
const REPO_PREFIX = "p:" + NS + ":";

/* ================= Zustand speichern / laden ================= */

/** Vollständiger Dump: Meta + alle Repo-Keys beider Welten. */
export async function dumpZustand(store) {
  const dump = { version: DUMP_VERSION, zeit: new Date().toISOString(), shared: {}, privat: {} };
  for (const shared of [true, false]) {
    const ziel = shared ? dump.shared : dump.privat;
    for (const prefix of [META_KEY, REPO_PREFIX]) {
      for (const k of await store.list(prefix, shared)) ziel[k] = await store.get(k, shared);
    }
  }
  return dump;
}

/** Alles unter dem Dev-Namensraum entfernen (beide Welten, inkl. Meta). */
export async function wipeZustand(store) {
  for (const shared of [true, false])
    for (const prefix of [META_KEY, REPO_PREFIX])
      for (const k of await store.list(prefix, shared)) await store.del(k, shared);
}

/** Dump einspielen: erst wischen, dann exakt die gesicherten Keys schreiben. */
export async function ladeZustand(store, dump) {
  if (!dump || dump.version !== DUMP_VERSION || !dump.shared || !dump.privat)
    throw new Error("Kein gültiger Zustands-Dump (version " + DUMP_VERSION + " erwartet).");
  await wipeZustand(store);
  for (const [k, v] of Object.entries(dump.shared)) await store.set(k, v, true);
  for (const [k, v] of Object.entries(dump.privat)) await store.set(k, v, false);
}

/* ================= Mockdaten-Bausteine ================= */

const TAG = 86400000;
const vor = t => new Date(Date.now() - t * TAG).toISOString();
const stempel = o => ({ ...o, _schema: 1, module: "betrieb" });
const key = (meta, teil, modul) => REPO_PREFIX + meta.code + ":" + (modul || "betrieb") + ":" + teil;

export const MOCK_META = { code: "dev-mock01", nameA: "Anna", nameB: "Bernd" };

/** Voll ausgebauter Betriebszustand (die „Mockdaten"). */
export function baueMockdaten(meta = MOCK_META) {
  const shared = {};
  const privat = {};
  shared[META_KEY] = meta;

  shared[key(meta, "bstate")] = stempel({
    auftraege: { items: [
      { id: "AG1", art: "gemeinsam", status: "aktiv", text: "Ein fester gemeinsamer Abend pro Woche, nur für uns.", startwerte: { A: 4, B: 6 }, vonBeidenBestaetigt: true, at: vor(21) },
      { id: "AI2", art: "individuell", owner: "B", status: "aktiv", text: "Abends eine Stunde früher offline sein.", at: vor(21) },
    ]},
    regal: { items: [
      { id: "RG1", text: "Anna wünscht sich, dass Verabredungen verlässlicher gelten — Absagen in letzter Minute treffen sie stärker, als sie lange gezeigt hat.", wunsch: "Kurz Bescheid geben, sobald sich etwas abzeichnet.", von: "Anna", at: vor(5), gelesen: false },
    ]},
    agenda: { items: [
      { id: "AGD1", text: "Wie wir mit spontanen Planänderungen umgehen.", wunsch: null, von: "Anna", herkunft: "regal", at: vor(4), zustand: "offen" },
    ]},
    messrunden: { items: [
      { id: "MR1", startAt: vor(10), status: "aufgedeckt", aufgedecktAt: vor(8),
        werte: { A: { naehe: 5, zweit: 6, passung: { AG1: 6 } }, B: { naehe: 6, zweit: 5, passung: { AG1: 7 } } } },
    ]},
    momentprotokoll: { eintraege: [
      { at: vor(8), zusammenfassung: "Über den gemeinsamen Abend gesprochen; beide wollen ihn schützen.", themen: ["gemeinsame Zeit"], zwischenzeitImpuls: "Ein Spaziergang unter der Woche." },
    ]},
    qz: { startAt: vor(45), ruht: {}, wahl: [{ at: vor(9), text: "Zusammen kochen am Sonntag.", domaene: "Alltagsgestaltung" }] },
    befund: {
      at: vor(21),
      funde: [{ typ: "treffer", text: "Beiden ist Verlässlichkeit zentral — sie lesen sich dort gut." }],
      triangulation: { vorschlaege: 2, bestaetigt: 1, justiert: 1, abgelehnt: 0 },
      gemeinsamerAuftrag: { text: "Ein fester gemeinsamer Abend pro Woche.", vonBeidenBestaetigt: true, startwerte: { A: 4, B: 6 } },
      individuelleAuftraege: [{ owner: "B", text: "Abends früher offline." }],
      konstitutiveDivergenz: { vorhanden: false },
      nachbefragung: [{ person: "Anna", wert: 8 }, { person: "Bernd", wert: 7 }],
    },
  });

  privat[key(meta, "pstate:A")] = stempel({
    zeitleiste: { eintraege: [{ at: vor(6), text: "Gemerkt: Ich ziehe mich zurück, statt zu sagen, dass mich die Absage getroffen hat." }] },
    generalproben: { items: [{ at: vor(6), text: "„Mir ist unser Abend wichtig — wenn er kippt, sag es mir bitte früh.“" }] },
  });
  privat[key(meta, "pstate:B")] = stempel({
    zeitleiste: { eintraege: [{ at: vor(3), text: "Der Arbeitsdruck frisst die Abende — das will ich nicht so lassen." }] },
    generalproben: { items: [] },
  });

  const uebergabe = (role, name, items) => stempel({
    _schema: 1, module: "kernwetten", name, items, releasedAt: vor(22),
  });
  shared[key(meta, "uebergabe:A", "kernwetten")] = uebergabe("A", meta.nameA, [
    { id: "S1", text: "Nähe und Verlässlichkeit liegen mir am meisten am Herzen; bei Verlässlichkeit bin ich gerade unzufrieden." },
    { id: "V1", text: "Ich vermute, Bernd wünscht sich vor allem weniger Druck im Alltag." },
  ]);
  shared[key(meta, "uebergabe:B", "kernwetten")] = uebergabe("B", meta.nameB, [
    { id: "S1", text: "Gemeinsame Ruhe ist mir wichtiger geworden, als ich lange dachte." },
  ]);

  return { meta, shared, privat };
}

/* ================= Szenen (anspringbare Workflow-Abschnitte) ================= */

async function setzeZustand(store, { shared, privat }) {
  await wipeZustand(store);
  for (const [k, v] of Object.entries(shared)) await store.set(k, v, true);
  for (const [k, v] of Object.entries(privat || {})) await store.set(k, v, false);
}

function nur(mock, teile /* z. B. ["bstate"] */, module) {
  const shared = { [META_KEY]: mock.meta };
  for (const [k, v] of Object.entries(mock.shared)) {
    if (k === META_KEY) continue;
    if (teile.some(t => k.endsWith(":" + t)) || (module || []).some(m => k.includes(":" + m + ":"))) shared[k] = v;
  }
  return shared;
}

export const SZENEN = [
  {
    id: "frisch", titel: "Onboarding · Start",
    beschreibung: "Alles leer — die Einrichtung (Namen) erscheint.",
    async wende(store) { await wipeZustand(store); },
  },
  {
    id: "onboarding-fertig", titel: "Onboarding · abgeschlossen, leer",
    beschreibung: "Namen gesetzt, sonst nichts — der Zustand direkt nach „Loslegen“.",
    async wende(store) { await setzeZustand(store, { shared: { [META_KEY]: MOCK_META }, privat: {} }); },
  },
  {
    id: "freigaben-da", titel: "Auftragsklärung · beide Freigaben liegen vor",
    beschreibung: "Einzelsessions abgeschlossen, beide Übergaben gequert — die gemeinsame Klärung steht an.",
    async wende(store) {
      const mock = baueMockdaten();
      await setzeZustand(store, { shared: nur(mock, [], ["kernwetten"]), privat: {} });
    },
  },
  {
    id: "betrieb", titel: "Betrieb · Vollausbau (Mockdaten)",
    beschreibung: "Befund + gemeinsamer Auftrag aktiv, Regal, Agenda, früherer Moment, QZ-Wahl — der komplette Mockdaten-Satz.",
    async wende(store) { const m = baueMockdaten(); await setzeZustand(store, m); },
  },
  {
    id: "regal-ungelesen", titel: "Regal · Fassung wartet ungelesen",
    beschreibung: "Annas Fassung liegt im Regal, Bernd hat sie noch nicht gelesen — Pull-Prinzip erlebbar (als Bernd einsteigen).",
    async wende(store) { const m = baueMockdaten(); await setzeZustand(store, m); },   // RG1 ist gelesen:false
  },
  {
    id: "aufdecken-bereit", titel: "Prozessreflexion · Aufdecken bereit",
    beschreibung: "Beide Mess-Beiträge liegen verdeckt vor — der nächste gemeinsame Moment deckt auf.",
    async wende(store) {
      const m = baueMockdaten();
      const bk = key(m.meta, "bstate");
      m.shared[bk].messrunden.items.push({
        id: "MR2", startAt: vor(1), status: "bereit",
        werte: { A: { naehe: 4, zweit: 7, passung: { AG1: 6 } }, B: { naehe: 8, zweit: 5, passung: { AG1: 9 } } },
      });
      await setzeZustand(store, m);
    },
  },
  {
    id: "qz-stufe2", titel: "Qualitätszeit · Leiter auf Stufe 2 (Gründe-Frage)",
    beschreibung: "Letzte gemeinsame Wahl liegt über vier Wochen zurück — die Leiter fragt nach den Gründen.",
    async wende(store) {
      const m = baueMockdaten();
      const bk = key(m.meta, "bstate");
      m.shared[bk].qz = { startAt: vor(90), ruht: {}, wahl: [{ at: vor(35), text: "Zusammen kochen am Sonntag.", domaene: "Alltagsgestaltung" }] };
      await setzeZustand(store, m);
    },
  },
];

/* ================= Panel-UI ================= */

export function createDevPanel({ doc, host, store, reboot }) {
  const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  host.innerHTML = `
    <details style="margin-top:26px;border-top:1px dashed #cfd8e0;padding-top:10px">
      <summary style="cursor:pointer;font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:#5a6675;font-weight:600">Entwickler-Panel</summary>
      <div style="background:#fff;border:1px solid #e3e8ee;border-radius:12px;padding:14px;margin-top:10px;font-size:13px">

        <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#0f766e;font-weight:600;margin-bottom:6px">Szenen anspringen</div>
        <div id="devSzenen">${SZENEN.map(s =>
          `<div style="display:flex;gap:10px;align-items:baseline;padding:4px 0">
             <button data-szene="${esc(s.id)}" style="font:inherit;cursor:pointer;border:1px solid #cfd8e0;background:#fff;border-radius:8px;padding:5px 10px;white-space:nowrap">${esc(s.titel)}</button>
             <span style="color:#5a6675">${esc(s.beschreibung)}</span>
           </div>`).join("")}
        </div>

        <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#0f766e;font-weight:600;margin:14px 0 6px">Zustand sichern &amp; laden</div>
        <button id="devSave" style="font:inherit;cursor:pointer;border:1px solid #cfd8e0;background:#fff;border-radius:8px;padding:6px 12px">Zustand speichern (JSON)</button>
        <button id="devLoad" style="font:inherit;cursor:pointer;border:1px solid #cfd8e0;background:#fff;border-radius:8px;padding:6px 12px">Zustand aus Textfeld laden</button>
        <button id="devWipe" style="font:inherit;cursor:pointer;border:1px solid #f5b5b5;background:#fdecec;border-radius:8px;padding:6px 12px;float:right">Alles zurücksetzen</button>
        <textarea id="devDump" rows="5" placeholder="Hierhin einen gespeicherten Zustand einfügen — oder hier erscheint der gespeicherte." style="display:block;width:100%;box-sizing:border-box;margin-top:8px;font-family:ui-monospace,Menlo,monospace;font-size:11px;border:1px solid #cfd8e0;border-radius:8px;padding:8px"></textarea>
        <div id="devMsg" style="min-height:18px;margin-top:6px;color:#5a6675"></div>
      </div>
    </details>`;

  const $ = id => host.querySelector("#" + id);
  const msg = (t, rot) => { const m = $("devMsg"); m.textContent = t; m.style.color = rot ? "#b4232a" : "#0f766e"; };

  for (const b of host.querySelectorAll("[data-szene]")) {
    b.addEventListener("click", async () => {
      const s = SZENEN.find(x => x.id === b.getAttribute("data-szene"));
      try {
        await s.wende(store);
        msg("Szene „" + s.titel + "“ gesetzt.");
        await reboot();
      } catch (e) { msg("Szene fehlgeschlagen: " + e.message, true); }
    });
  }

  $("devSave").addEventListener("click", async () => {
    try {
      const dump = await dumpZustand(store);
      const text = JSON.stringify(dump, null, 2);
      $("devDump").value = text;
      const blob = new Blob([text], { type: "application/json" });
      const a = doc.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "paarbegleitung-zustand-" + dump.zeit.replace(/[:.]/g, "-") + ".json";
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      msg("Zustand gespeichert (" + Object.keys(dump.shared).length + " geteilte, " + Object.keys(dump.privat).length + " private Einträge).");
    } catch (e) { msg("Speichern fehlgeschlagen: " + e.message, true); }
  });

  $("devLoad").addEventListener("click", async () => {
    try {
      const dump = JSON.parse($("devDump").value);
      await ladeZustand(store, dump);
      msg("Zustand geladen.");
      await reboot();
    } catch (e) { msg("Laden fehlgeschlagen: " + e.message, true); }
  });

  $("devWipe").addEventListener("click", async () => {
    try { await wipeZustand(store); msg("Alles zurückgesetzt."); await reboot(); }
    catch (e) { msg("Zurücksetzen fehlgeschlagen: " + e.message, true); }
  });

  return { host };
}

// Entwickler-Panel der Artefakt-Umgebung — Werkzeug für persönliche Testläufe:
//   · Zustand speichern/laden (vollständiger Dump beider Speicherwelten)
//   · Mockdaten-Set
//   · Szenen: definierte Workflow-Abschnitte direkt anspringen
//
// Nur die Artefakt-Hülle — Kern und Cloudflare-Form bleiben unberührt.
// Alle Funktionen arbeiten gegen die Store-Schnittstelle und sind headless
// beweisbar; die UI (createDevPanel) ist injizierbar wie createApp.
//
// S60: Mockdaten auf das englische Wire-Schema (S31a) und den Zustandsraum
// seit S42/S43 gehoben (reveal/revealLog/minigate); neue Szene "einseitig-frei";
// Szenen-Quittung überlebt den reboot.

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

/** S60 · Aufdeck-Datenpakete (Mini-Gate "Ja") — Format wie baueAufdeckung:
    { name, top5, guess3, releasedAt }. Labels sind echte Domänen-Pole. */
export function baueReveal(meta = MOCK_META) {
  return {
    A: {
      name: meta.nameA, releasedAt: vor(22),
      top5: ["Nähe", "Verlässlichkeit & Verbindlichkeit", "Ehrlichkeit", "Wertschätzung", "Gemeinsamer Sinn / Vision"],
      guess3: ["Autonomie", "Beständigkeit", "Zeit zu zweit"],
    },
    B: {
      name: meta.nameB, releasedAt: vor(22),
      top5: ["Beständigkeit", "Zeit zu zweit", "Verlässlichkeit & Verbindlichkeit", "Wertschätzung", "Nähe"],
      guess3: ["Verlässlichkeit & Verbindlichkeit", "Nähe", "Ehrlichkeit"],
    },
  };
}

/** Voll ausgebauter Betriebszustand (die „Mockdaten") — Zustand NACH der
    Gemeinsamen Auflösung: reveal + revealLog + findings liegen vor. */
export function baueMockdaten(meta = MOCK_META) {
  const shared = {};
  const privat = {};
  shared[META_KEY] = meta;

  shared[key(meta, "bstate")] = stempel({
    goals: { seq: 2, items: [
      { id: "AG1", art: "shared", owner: null, status: "active",
        text: "Ein fester gemeinsamer Abend pro Woche, nur für uns.",
        baseline: { [meta.nameA]: 4, [meta.nameB]: 6 }, createdAt: vor(21) },
      { id: "AI2", art: "individual", owner: meta.nameB, status: "active",
        text: "Abends eine Stunde früher offline sein.",
        baseline: {}, createdAt: vor(21) },
    ]},
    shelf: { items: [
      { id: "RG1", text: meta.nameA + " wünscht sich, dass Verabredungen verlässlicher gelten — Absagen in letzter Minute treffen sie stärker, als sie lange gezeigt hat.", wish: "Kurz Bescheid geben, sobald sich etwas abzeichnet.", by: meta.nameA, at: vor(5), read: false },
    ]},
    agenda: { items: [
      { id: "AGD1", text: "Wie wir mit spontanen Planänderungen umgehen.", wish: null, by: meta.nameA, herkunft: "shelf", at: vor(4), state: "open" },
    ]},
    measurements: { items: [
      { id: "MR1", startAt: vor(10), status: "revealed", revealedAt: vor(8),
        values: { A: { closeness: 5, guess: 6, fit: { AG1: 6 } }, B: { closeness: 6, guess: 5, fit: { AG1: 7 } } } },
    ]},
    momentLog: { entries: [
      { at: vor(8), summary: "Über den gemeinsamen Abend gesprochen; beide wollen ihn schützen.", topics: ["gemeinsame Zeit"], gentleInvitation: "Ein Spaziergang unter der Woche." },
    ]},
    qualitytime: { startAt: vor(45), resting: {}, choices: [{ at: vor(9), text: "Zusammen kochen am Sonntag.", domain: "Alltagsgestaltung" }] },
    reveal: baueReveal(meta),
    revealLog: {
      at: vor(20),
      summary: "Beide sahen einander bei Verlässlichkeit und Nähe ähnlicher als erwartet; " + meta.nameB + "s Wunsch nach gemeinsamer Ruhe kam für " + meta.nameA + " neu dazu.",
      touchingPoints: ["Verlässlichkeit & Verbindlichkeit", "Nähe"],
      forClarification: ["Gemeinsame Ruhe im Alltag"],
    },
    findings: {
      at: vor(21),
      findings: [
        { item: "Gemeinsame Ruhe ist " + meta.nameB + " wichtiger, als " + meta.nameA + " vermutet hatte.", owner: meta.nameB, source: "partner-guess", importance: 7, dealbreaker: false, ownReasoning: true },
      ],
      triangulation: { proposed: 2, confirmed: 1, adjusted: 1, declined: 0 },
      sharedGoal: { text: "Ein fester gemeinsamer Abend pro Woche.", confirmedByBoth: true, baseline: { [meta.nameA]: 4, [meta.nameB]: 6 } },
      individualGoals: [{ person: meta.nameB, text: "Abends eine Stunde früher offline sein.", wish: null }],
      compatibility: "Beiden ist Verlässlichkeit zentral — sie lesen sich dort gut.",
      misalignedAssumptions: { present: false, status: "" },
      concerns: { raised: 1, confirmed: 0, dispelled: 1, adjusted: 0, leftUntouched: 0, goalAdditions: [], emergencyBrake: false },
      closingCheck: [
        { person: meta.nameA, value: 8, keySentence: "Der Abend ist gesetzt — das trägt." },
        { person: meta.nameB, value: 7, keySentence: "Weniger Druck, mehr Ruhe zu zweit." },
      ],
    },
  });

  privat[key(meta, "pstate:A")] = stempel({
    timeline: { entries: [{ at: vor(6), topics: ["Rückzug"], summary: "Gemerkt: Ich ziehe mich zurück, statt zu sagen, dass mich die Absage getroffen hat." }] },
    selfDisclosures: { items: [{ at: vor(6), text: "„Mir ist unser Abend wichtig — wenn er kippt, sag es mir bitte früh.“" }] },
  });
  privat[key(meta, "pstate:B")] = stempel({
    timeline: { entries: [{ at: vor(3), topics: ["Arbeitsdruck"], summary: "Der Arbeitsdruck frisst die Abende — das will ich nicht so lassen." }] },
    selfDisclosures: { items: [] },
  });

  // S60: NICHT durch stempel() — der überschriebe module:"kernwetten" mit
  // "betrieb". Struktur identisch zur baueUebergabe-Ausgabe (Vertrag 3).
  const uebergabe = (name, items) => ({
    _schema: 1, module: "kernwetten", name, items, releasedAt: vor(22),
  });
  shared[key(meta, "handover:A", "kernwetten")] = uebergabe(meta.nameA, [
    { id: "S1", text: "Nähe und Verlässlichkeit liegen mir am meisten am Herzen; bei Verlässlichkeit bin ich gerade unzufrieden." },
    { id: "V1", text: "Ich vermute, " + meta.nameB + " wünscht sich vor allem weniger Druck im Alltag." },
  ]);
  shared[key(meta, "handover:B", "kernwetten")] = uebergabe(meta.nameB, [
    { id: "S1", text: "Gemeinsame Ruhe ist mir wichtiger geworden, als ich lange dachte." },
  ]);
  // S59 · D4: Zu jedem Handover gehört der freigegebene Einzel-Chat — die
  // Testumgebung bildet den echten Zustandsraum ab, statt den unmöglichen
  // Zustand "Handover ohne abgeschlossene Klärung" zu erzeugen.
  Object.assign(privat, einzelFertigChats(meta));

  return { meta, shared, privat };
}

/** S59 · Freigegebene Einzel-Chats passend zu den Mock-Handovers (Zustand
    seit S44: running + freigegeben + nachklang). S60: minigate "ja" — ein
    freigegebener Chat ohne Gate-Entscheidung ist im linearen Pfad unmöglich,
    und "ja" passt zu den gesetzten reveal-Paketen. */
export function einzelFertigChats(meta) {
  const fertig = abschluss => stempel({
    status: "running", freigegeben: true, nachklang: true, minigate: "ja", language: "de", kapitel: 6,
    messages: [{ role: "assistant", content: abschluss }],
  });
  return {
    [key(meta, "chat:A:einzel")]: fertig("Deine Auswahl ist freigegeben — danke für dein Vertrauen. Du kannst jederzeit etwas hinzufügen, richtigstellen oder nachfragen."),
    [key(meta, "chat:B:einzel")]: fertig("Deine Auswahl ist freigegeben — danke für dein Vertrauen. Du kannst jederzeit etwas hinzufügen, richtigstellen oder nachfragen."),
  };
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
    id: "einseitig-frei", titel: "Auftragsklärung · nur eine Freigabe liegt vor",
    beschreibung: "Annas Klärung ist freigegeben, Bernd hat noch nicht begonnen — als Anna: warten auf Bernds Freigabe; als Bernd: die eigene Klärung steht an.",
    async wende(store) {
      const mock = baueMockdaten();
      // Nur die A-Seite quert: Handover A + reveal.A; für B bewusst NICHTS
      // (kein Chat, kein Handover, reveal.B = null — der echte Zwischenstand).
      const shared = {
        [META_KEY]: mock.meta,
        [key(mock.meta, "handover:A", "kernwetten")]: mock.shared[key(mock.meta, "handover:A", "kernwetten")],
        [key(mock.meta, "bstate")]: stempel({ reveal: { A: baueReveal(mock.meta).A, B: null } }),
      };
      const chats = einzelFertigChats(mock.meta);
      const privat = { [key(mock.meta, "chat:A:einzel")]: chats[key(mock.meta, "chat:A:einzel")] };
      await setzeZustand(store, { shared, privat });
    },
  },
  {
    id: "freigaben-da", titel: "Auftragsklärung · beide Freigaben liegen vor",
    beschreibung: "Einzelsessions abgeschlossen, beide Übergaben gequert, Aufdeck-Pakete gewählt — die gemeinsame Auflösung (mit Aufdecken) steht an.",
    async wende(store) {
      const mock = baueMockdaten();
      // S59 · D4: Handover nie ohne die zugehörigen freigegebenen Einzel-Chats.
      // S60: reveal beider Seiten liegt vor (Mini-Gate "ja"), revealLog bewusst
      // NICHT — das Aufdecken steht ja erst bevor (Wegweiser-Variante "MitAufdeck").
      const shared = nur(mock, [], ["kernwetten"]);
      shared[key(mock.meta, "bstate")] = stempel({ reveal: baueReveal(mock.meta) });
      await setzeZustand(store, { shared, privat: einzelFertigChats(mock.meta) });
    },
  },
  {
    id: "betrieb", titel: "Betrieb · Vollausbau (Mockdaten)",
    beschreibung: "Befund + gemeinsamer Auftrag aktiv, Regal, Agenda, früherer Moment, QZ-Wahl — der komplette Mockdaten-Satz.",
    async wende(store) { const m = baueMockdaten(); await setzeZustand(store, m); },
  },
  {
    id: "regal-ungelesen", titel: "Regal · Einblick wartet ungelesen",
    beschreibung: "Annas Einblick liegt im Regal, Bernd hat ihn noch nicht gelesen — Pull-Prinzip erlebbar (als Bernd einsteigen).",
    async wende(store) { const m = baueMockdaten(); await setzeZustand(store, m); },   // RG1 ist read:false
  },
  {
    id: "aufdecken-bereit", titel: "Prozessreflexion · Aufdecken bereit",
    beschreibung: "Beide Mess-Beiträge liegen verdeckt vor — der nächste gemeinsame Moment deckt auf.",
    async wende(store) {
      const m = baueMockdaten();
      const bk = key(m.meta, "bstate");
      m.shared[bk].measurements.items.push({
        id: "MR2", startAt: vor(1), status: "ready",
        values: { A: { closeness: 4, guess: 7, fit: { AG1: 6 } }, B: { closeness: 8, guess: 5, fit: { AG1: 9 } } },
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
      m.shared[bk].qualitytime = { startAt: vor(90), resting: {}, choices: [{ at: vor(35), text: "Zusammen kochen am Sonntag.", domain: "Alltagsgestaltung" }] };
      await setzeZustand(store, m);
    },
  },
];

/* ================= Panel-UI ================= */

/** S60 · Quittung: die Bestätigung einer Szene/Ladung überlebt den reboot
    (der das Panel neu aufbaut und die Meldung sonst wegreißt). Modul-
    Lebensdauer genügt — reboot läuft im selben JS-Kontext. Einmalig:
    der nächste Panel-Aufbau zeigt sie an und verwirft sie. */
export const quittung = { text: null };

export function createDevPanel({ doc, host, store, reboot }) {
  const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  host.innerHTML = `
    <details style="margin-top:26px;border-top:1px dashed var(--card-bd);padding-top:10px">
      <summary style="cursor:pointer;font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-soft);font-weight:600">Entwickler-Panel</summary>
      <div style="background:var(--card);border:1px solid var(--card-bd);border-radius:14px;padding:16px;margin-top:10px;font-size:13px;backdrop-filter:blur(8px)">

        <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--accent-ink);font-weight:600;margin-bottom:6px">Szenen anspringen</div>
        <div id="devSzenen">${SZENEN.map(s =>
          `<div style="display:flex;gap:10px;align-items:baseline;padding:4px 0">
             <button data-szene="${esc(s.id)}" style="font:inherit;cursor:pointer;border:1px solid var(--card-bd);background:var(--card);color:var(--ink);border-radius:999px;padding:5px 12px;white-space:nowrap">${esc(s.titel)}</button>
             <span style="color:var(--ink-soft)">${esc(s.beschreibung)}</span>
           </div>`).join("")}
        </div>

        <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--accent-ink);font-weight:600;margin:14px 0 6px">Zustand sichern &amp; laden</div>
        <button id="devSave" style="font:inherit;cursor:pointer;border:1px solid var(--card-bd);background:var(--card);color:var(--ink);border-radius:999px;padding:6px 14px">Zustand speichern (JSON)</button>
        <button id="devLoad" style="font:inherit;cursor:pointer;border:1px solid var(--card-bd);background:var(--card);color:var(--ink);border-radius:999px;padding:6px 14px">Zustand aus Textfeld laden</button>
        <button id="devWipe" style="font:inherit;cursor:pointer;border:1px solid rgba(188,74,74,.4);background:rgba(188,74,74,.14);color:var(--ink);border-radius:999px;padding:6px 14px;float:right">Alles zurücksetzen</button>
        <textarea id="devDump" rows="5" placeholder="Hierhin einen gespeicherten Zustand einfügen — oder hier erscheint der gespeicherte." style="display:block;width:100%;box-sizing:border-box;margin-top:8px;font-family:ui-monospace,Menlo,monospace;font-size:11px;border:1px solid var(--field-bd);background:var(--field);color:var(--ink);border-radius:9px;padding:8px"></textarea>
        <div id="devMsg" style="min-height:18px;margin-top:6px;color:var(--ink-soft)"></div>
      </div>
    </details>`;

  const $ = id => host.querySelector("#" + id);
  const msg = (t, rot) => { const m = $("devMsg"); m.textContent = t; m.style.color = rot ? "#b4232a" : "#0f766e"; };

  // Quittung des letzten Setzens anzeigen (überlebt den reboot) — einmalig.
  if (quittung.text) { msg(quittung.text); quittung.text = null; }

  for (const b of host.querySelectorAll("[data-szene]")) {
    b.addEventListener("click", async () => {
      const s = SZENEN.find(x => x.id === b.getAttribute("data-szene"));
      try {
        await s.wende(store);
        const text = "Szene „" + s.titel + "“ eingespielt · " + new Date().toLocaleTimeString();
        msg(text);
        quittung.text = text;   // der reboot baut das Panel neu — die Quittung reist mit
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
      const text = "Zustand geladen · " + new Date().toLocaleTimeString();
      msg(text);
      quittung.text = text;
      await reboot();
    } catch (e) { msg("Laden fehlgeschlagen: " + e.message, true); }
  });

  $("devWipe").addEventListener("click", async () => {
    try {
      await wipeZustand(store);
      const text = "Alles zurückgesetzt · " + new Date().toLocaleTimeString();
      msg(text);
      quittung.text = text;
      await reboot();
    } catch (e) { msg("Zurücksetzen fehlgeschlagen: " + e.message, true); }
  });

  return { host };
}

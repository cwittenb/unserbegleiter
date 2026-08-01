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

import { ladeTokenStaende, wipeTokenStaende, formatTokens, TOKEN_PREFIX } from "./token-zaehler.js";
import { baueKulisse, KULISSE_DECKEL } from "../../core/ui/kulisse.js";
import { esc } from "../../core/ui/html.js";   // R3: vollstaendige Maskierung

export const DUMP_VERSION = 1;
const NS = "PBDEV";
const META_KEY = NS + ":meta";
const REPO_PREFIX = "p:" + NS + ":";
// Alle Dev-Namensräume: Dump und Wipe erfassen auch den Token-Zähler (S61).
const PREFIXES = [META_KEY, REPO_PREFIX, TOKEN_PREFIX];

/* ================= Zustand speichern / laden ================= */

/** Vollständiger Dump: Meta + alle Repo-Keys beider Welten. */
/* ================= Robuste Storage-Schicht (S68) =================
   Die Sandbox drosselt Storage-Calls; ArtifactStore.set/del melden Fehler
   still als false. Ein unbegrenzter Promise.all-Burst verlor deshalb Writes —
   Quittung „eingespielt", Stand leer (U1). Hier: begrenzte Parallelität in
   Wellen + Wiederholung mit Backoff + Fehlerwurf statt stillem false. */

const WELLE = 3;                      // gleichzeitige Storage-Calls (drosselfreundlich)
const RUHE_MS = 40;                   // Atempause zwischen Wellen
const VERSUCHE = 6;                   // je Key: 1 + 5 Wiederholungen, Fenster ~5,6 s
const BACKOFF_MS = [0, 120, 300, 700, 1500, 3000];
const kurzSchlaf = ms => new Promise(r => setTimeout(r, ms));
// Jitter bricht den Gleichtakt einer Welle: ohne ihn wiederholen alle Keys
// einer Welle exakt synchron — gegen eine echte Drossel der schlechteste Takt.
const mitJitter = ms => ms + Math.floor(Math.random() * (ms / 2 + 1));

async function inWellen(aufgaben) {
  for (let i = 0; i < aufgaben.length; i += WELLE) {
    await Promise.all(aufgaben.slice(i, i + WELLE).map(f => f()));
    if (i + WELLE < aufgaben.length) await kurzSchlaf(RUHE_MS);
  }
}

/* Iteration 3 (Feld-Befund „immer: Schreiben endgültig fehlgeschlagen"):
   ERFOLG = RÜCKLESEN, nie der Rückgabewert von set(). Die Sandbox-Doku nennt
   für storage.set «{key,value,shared} | null» — liefert eine Runtime bei
   Erfolg null/undefined, wertete die alte Prüfung JEDEN gelungenen Write als
   Fehlschlag und warf nach vier Umschreibungen. Rücklesen ist gegen beide
   Welten robust: Vertragsdrift UND echte Drosselung. */
async function mussSet(store, k, v, shared) {
  const soll = JSON.stringify(v);
  let letzte = "set lieferte kein bestätigendes Ergebnis";
  for (let n = 0; n < VERSUCHE; n++) {
    if (n) await kurzSchlaf(mitJitter(BACKOFF_MS[n]));
    try { await store.set(k, v, shared); } catch (e) { letzte = e.message; }
    try {
      const ist = await store.get(k, shared);
      if (ist !== null && JSON.stringify(ist) === soll) return;
      letzte = ist === null ? "Rücklesen fand den Key nicht" : "Rücklesen lieferte abweichenden Wert";
    } catch (e) { letzte = "Rücklesen scheiterte: " + e.message; }
  }
  throw new Error("Schreiben endgültig fehlgeschlagen (" + letzte + "): " + k);
}

async function mussDel(store, k, shared) {
  for (let n = 0; n < VERSUCHE; n++) {
    if (n) await kurzSchlaf(mitJitter(BACKOFF_MS[n]));
    await store.del(k, shared);                                // del ist idempotent …
    try { if (await store.get(k, shared) === null) return; }   // … Erfolg = weg
    catch { return; }
  }
  throw new Error("Löschen endgültig fehlgeschlagen: " + k);
}

export async function dumpZustand(store) {
  // S68: parallel statt sequenziell — jeder Storage-Call ist in der Sandbox ein
  // eigener RPC; die Betrieb-Szene hat Dutzende Keys (Ursache U1 der zähen Szenen).
  const dump = { version: DUMP_VERSION, zeit: new Date().toISOString(), shared: {}, privat: {} };
  for (const shared of [true, false]) {
    const ziel = shared ? dump.shared : dump.privat;
    const listen = await Promise.all(PREFIXES.map(prefix => store.list(prefix, shared)));
    const keys = [...new Set(listen.flat())];
    const werte = await Promise.all(keys.map(k => store.get(k, shared)));
    keys.forEach((k, i) => { ziel[k] = werte[i]; });
  }
  return dump;
}

/** Alles unter dem Dev-Namensraum entfernen (beide Welten, inkl. Meta). */
export async function wipeZustand(store) {
  for (const shared of [true, false]) {
    const listen = await Promise.all(PREFIXES.map(prefix => store.list(prefix, shared)));
    await inWellen([...new Set(listen.flat())].map(k => () => mussDel(store, k, shared)));
  }
}

/** Dump einspielen: erst wischen, dann exakt die gesicherten Keys schreiben. */
export async function ladeZustand(store, dump) {
  if (!dump || dump.version !== DUMP_VERSION || !dump.shared || !dump.privat)
    throw new Error("Kein gültiger Zustands-Dump (version " + DUMP_VERSION + " erwartet).");
  await wipeZustand(store);
  await inWellen([
    ...Object.entries(dump.shared).map(([k, v]) => () => mussSet(store, k, v, true)),
    ...Object.entries(dump.privat).map(([k, v]) => () => mussSet(store, k, v, false)),
  ]);
  await pruefeEingespielt(store, dump.shared, dump.privat);
}

/** Verifikation nach dem Einspielen (U4): Meta zurücklesen und die Key-Mengen
 *  beider Welten mit dem Soll vergleichen — erst dann darf eine Quittung
 *  behaupten, es sei etwas eingespielt. */
export async function pruefeEingespielt(store, shared, privat) {
  const fehlend = [];
  for (const [welt, soll] of [[true, shared], [false, privat || {}]]) {
    const listen = await Promise.all(PREFIXES.map(prefix => store.list(prefix, welt)));
    const ist = new Set(listen.flat());
    for (const k of Object.keys(soll)) if (!ist.has(k)) fehlend.push((welt ? "shared:" : "privat:") + k);
  }
  if (fehlend.length)
    throw new Error("Einspielen unvollständig — fehlende Einträge: " + fehlend.join(", "));
  const meta = shared[META_KEY] ? await store.get(META_KEY, true) : null;
  if (shared[META_KEY] && (!meta || meta.code !== shared[META_KEY].code))
    throw new Error("Einspielen unvollständig — Meta nicht lesbar.");
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
/* S96.4 · Solo-Verlauf für den Dialogausschnitt.
   Ohne Verlauf lässt sich der Auswahl-Modus im Mock nicht anfassen: Die
   Auswahlmenge entsteht aus Frage-Antwort-Paaren des laufenden Chats. Der
   Verlauf gehört bewusst zur bestehenden Mock-Geschichte (Absage, Rückzug,
   Verlässlichkeit) — dieselbe Person, dieselbe Woche wie Regal und Zeitleiste.

   Das dritte Paar reisst absichtlich die Kriterien („nie", Charakterurteil):
   Ohne einen Verletzer bliebe die stumme Darstellung und die Auslassung „…"
   in der Vorschau ungeprüft. */
const SOLO_ZUEGE = [
  ["Was beschäftigt dich gerade?",
   "Bernd hat Mittwoch wieder abgesagt. Ich hab nur „okay“ geschrieben und dann nichts mehr."],
  ["Was ist in dem Moment passiert, als die Nachricht kam?",
   "Erst war ich einfach müde. Dann kam etwas Hartes dazu, so ein Zumachen."],
  ["Und wenn du an die letzten Wochen denkst?",
   "Er nimmt sowas nie ernst. Ihm ist es im Grunde egal, wie das bei mir ankommt."],
  ["Was macht das mit dir, das so auszusprechen?",
   "Es wird klarer, wie es ist. Und unangenehm — weil ich weiß, dass es nicht die ganze Wahrheit ist."],
  ["Was wäre denn die andere Hälfte?",
   "Dass er selbst kaum noch Luft hat gerade. Ich glaube, er sagt ab, weil er nicht mehr kann, nicht weil ich ihm egal bin."],
  ["Was wünschst du dir für den nächsten Mittwoch?",
   "Dass ich es sage, bevor ich dichtmache. Und dass er früh Bescheid gibt, wenn es kippt."],
];

/** Laufender Solo-Chat mit Verlauf — Grundlage für die Ausschnitt-Auswahl. */
export function baueSoloChat(meta = MOCK_META) {
  const messages = [{ role: "user", hidden: true, content: "Ich bin da und möchte beginnen." }];
  for (const [frage, antwort] of SOLO_ZUEGE) {
    messages.push({ role: "assistant", content: frage });
    messages.push({ role: "user", content: antwort });
  }
  return stempel({ status: "running", language: "de", messages });
}

/* S95.7a/8b · Ein AUFBEWAHRTER Verlauf einer abgeschlossenen Sitzung.
 *
 * Ohne den blieb alles unsichtbar, was seit S95.7 gebaut wurde: der
 * Lese-Eingang haengt an vid, der Loeschweg ebenso, und der Begleiter faende
 * beim Wortlaut-Abruf nichts. Man haette die Funktionen nur erleben koennen,
 * indem man eine echte Sitzung komplett durchspielt und abschliesst.
 *
 * Material ist dasselbe wie im laufenden Solo-Chat — so laesst sich Gelesenes
 * mit Erlebtem vergleichen. Die Eignung liegt bei, damit auch die AUSWAHL aus
 * dem Replay heraus pruefbar ist und nicht nur das Lesen. */
const MOCK_VID = "1750000000000-mock01";

function baueAufbewahrtenVerlauf(meta) {
  const chat = baueSoloChat(meta);
  return {
    messages: chat.messages,
    // Ein Paar faellt bewusst durch — sonst zeigt die Auswahl nie, wie eine
    // begruendete Nicht-Eignung aussieht.
    eignung: { pairs: [
      { id: "P1-2", ownerOk: true, companionOk: true, reason: null },
      { id: "P3-4", ownerOk: false, companionOk: true, reason: "Charakterzuschreibung statt Situationsbezug" },
      { id: "P5-6", ownerOk: true, companionOk: true, reason: null },
    ]},
    at: vor(6),
  };
}

/** Ein bereits sichtbarer Ausschnitt im Regal — die LESESEITE (S96.3). */
function ausschnittItem(meta) {
  return {
    id: "RG2", freigabe: "FG-mock-1", kind: "excerpt", role: "A", by: meta.nameA,
    text: null, frame: "Ich zeig dir lieber, wie ich da hingekommen bin.",
    pairs: [
      { question: SOLO_ZUEGE[1][0], answer: SOLO_ZUEGE[1][1], gapBefore: false },
      // Das Urteils-Paar fehlt bewusst — genau dafür ist die Auslassung da.
      { question: SOLO_ZUEGE[3][0], answer: SOLO_ZUEGE[3][1], gapBefore: true },
      { question: SOLO_ZUEGE[4][0], answer: SOLO_ZUEGE[4][1], gapBefore: false },
    ],
    at: vor(2), read: false, visibleFrom: vor(2),
  };
}

/** Eine Freigabe MITTEN IN DER KARENZ: beim Owner zurückziehbar, für den
    Partner nicht einmal als existent sichtbar (I11). */
function karenzItem(meta) {
  return {
    id: "RG3", freigabe: "FG-mock-2", kind: "excerpt", role: "A", by: meta.nameA,
    text: null, frame: null,
    pairs: [{ question: SOLO_ZUEGE[5][0], answer: SOLO_ZUEGE[5][1], gapBefore: false }],
    at: new Date().toISOString(), read: false,
    visibleFrom: new Date(Date.now() + 18 * 60000).toISOString(),   // noch 18 min
  };
}

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
      // S96.4 · Bestandsform mit den seit S95.3b geführten Feldern: kind/role/
      // freigabe/visibleFrom. Ohne role griffe weder Redaktion noch Rücknahme.
      { id: "RG1", kind: "message", role: "A", freigabe: "FG-mock-0",
        text: meta.nameA + " wünscht sich, dass Verabredungen verlässlicher gelten — Absagen in letzter Minute treffen sie stärker, als sie lange gezeigt hat.",
        wish: "Kurz Bescheid geben, sobald sich etwas abzeichnet.", by: meta.nameA,
        at: vor(5), read: false, visibleFrom: vor(5) },
      ausschnittItem(meta),
      karenzItem(meta),
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

  // S96.4 · Der Solo-Verlauf gehört zu Annas Seite — er ist die Grundlage,
  // auf der sich der Auswahl-Modus überhaupt anfassen lässt.
  privat[key(meta, "chat:A:solo")] = baueSoloChat(meta);

  privat[key(meta, "pstate:A")] = stempel({
    // vid verknüpft den Eintrag mit dem aufbewahrten Verlauf (S95.7a).
    // U8.7 · Das frühere "Gemerkt:" war ein Mock-Artefakt, kein Prefix des
    // Systems — es sah im Vorraum aus wie eine Feldbeschriftung und war doch
    // nur Fließtext. Weg damit. Die Länge folgt jetzt dem Schema
    // (ZEITLEISTEN-PFLEGE: 3–5 Sätze), damit das Dev-Panel zeigt, wie viel
    // Text ein Eintrag im Betrieb wirklich trägt.
    timeline: { entries: [{ at: vor(6), topics: ["Rückzug"], summary: "Die Absage am Freitag hat mehr getroffen, als ich zugegeben habe. Statt es zu sagen, bin ich still geworden und habe den Abend allein verbracht. Im Gespräch ist deutlich geworden, dass der Rückzug sich wie Schutz anfühlt und von außen wie Desinteresse aussehen kann. Offen bleibt, wie ich das ansprechen kann, ohne dass es wie ein Vorwurf klingt.", vid: MOCK_VID }] },
    ["verlauf:" + MOCK_VID]: baueAufbewahrtenVerlauf(meta),
    selfDisclosures: { items: [{ at: vor(6), text: "„Mir ist unser Abend wichtig — wenn er kippt, sag es mir bitte früh.“" }] },
  });
  privat[key(meta, "pstate:B")] = stempel({
    // B trägt BEWUSST keinen Verlauf: Im selben Datensatz stehen damit beide
    // Fälle nebeneinander. Der zweite ist der wichtigere — er zeigt, dass dort
    // keine ausgegraute Tür steht und der Begleiter ehrlich sagen muss, dass
    // nichts zu holen ist.
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
  await inWellen([
    ...Object.entries(shared).map(([k, v]) => () => mussSet(store, k, v, true)),
    ...Object.entries(privat || {}).map(([k, v]) => () => mussSet(store, k, v, false)),
  ]);
  await pruefeEingespielt(store, shared, privat);
}

/** S96.4 · Bequemer Zugriff auf die gebauten bstate-Teile einer Szene. */
function nurBstate(mock) {
  return mock.shared[key(mock.meta, "bstate")];
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
    id: "ausschnitt-auswahl", titel: "Ausschnitt · Verlauf steht zur Auswahl",
    beschreibung: "Annas Reflexionsgespräch läuft mit sechs Frage-Antwort-Paaren — als Anna einsteigen und die Session abschließen, dann kommt der Eignungsbericht und die Auswahl lässt sich anfassen.",
    async wende(store) {
      const mock = baueMockdaten();
      const shared = { [META_KEY]: mock.meta };
      await setzeZustand(store, { shared, privat: { [key(mock.meta, "chat:A:solo")]: baueSoloChat(mock.meta) } });
    },
  },
  {
    id: "ausschnitt-gelesen", titel: "Ausschnitt · liegt im Regal",
    beschreibung: "Ein freigegebener Dialogausschnitt mit Auslassung — als Bernd einsteigen, um die Leseseite zu sehen; als Anna, um die Rücknahme in der Karenz zu sehen (ein zweiter Ausschnitt ist noch unsichtbar für Bernd).",
    async wende(store) {
      const mock = baueMockdaten();
      const shared = { [META_KEY]: mock.meta };
      shared[key(mock.meta, "bstate")] = stempel({
        shelf: nurBstate(mock).shelf,
        agenda: nurBstate(mock).agenda,
      });
      await setzeZustand(store, { shared, privat: {} });
    },
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

/* ST2 · Struktur-Telemetrie (K2-Entscheid): Der keyless-Pfad hat keine
   Formgarantie — die Abweichung vom erzwungenen Pfad bekommt hier eine Zahl.
   holeStruktur ist ein LIVE-Getter auf die laufende Session (main.js reicht
   ihn herein); ohne laufende Session zeigt der Abschnitt das ehrlich an. */
export function createDevPanel({ doc, host, store, reboot, holeStruktur }) {
  host.innerHTML = `
    <details style="margin-top:26px;border-top:1px dashed var(--rz-karte-rand);padding-top:10px">
      <summary style="cursor:pointer;font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:var(--rz-sek);font-weight:600">Entwickler-Panel</summary>
      <div style="background:var(--rz-karte);border:1px solid var(--rz-karte-rand);border-radius:14px;padding:16px;margin-top:10px;font-size:13px;backdrop-filter:blur(8px)">

        <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--rz-akzent-ink);font-weight:600;margin-bottom:6px">Szenen anspringen</div>
        <div id="devSzenen">${SZENEN.map(s =>
          `<div style="display:flex;gap:10px;align-items:baseline;padding:4px 0">
             <button data-szene="${esc(s.id)}" style="font:inherit;cursor:pointer;border:1px solid var(--rz-karte-rand);background:var(--rz-karte);color:var(--rz-ink);border-radius:999px;padding:5px 12px;white-space:nowrap">${esc(s.titel)}</button>
             <span style="color:var(--rz-sek)">${esc(s.beschreibung)}</span>
           </div>`).join("")}
        </div>

        <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--rz-akzent-ink);font-weight:600;margin:14px 0 6px">Kulisse — Wachstumsstufe</div>
        <div style="display:flex;align-items:center;gap:10px;padding:2px 0 6px">
          <input id="devKulisse" type="range" min="0" max="${KULISSE_DECKEL}" step="1" value="-1" style="flex:1">
          <span id="devKulisseWert" style="min-width:5.5em;color:var(--rz-sek)">gewachsen</span>
          <button id="devKulisseAus" style="font:inherit;cursor:pointer;border:1px solid var(--rz-karte-rand);background:var(--rz-karte);color:var(--rz-ink);border-radius:999px;padding:4px 10px;white-space:nowrap">Zurück zu echt</button>
        </div>
        <div style="font-size:12px;color:var(--rz-sek);padding-bottom:4px">Nur Vorschau: überschreibt die gewachsene Anzahl, bis „Zurück zu echt“. Der Untergrund bleibt immer.</div>

        <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--rz-akzent-ink);font-weight:600;margin:14px 0 6px">Token-Zähler (echte usage, pro Paar)</div>
        <div id="devTokens" style="padding:2px 0 6px"></div>
        <button id="devTokensReset" style="font:inherit;cursor:pointer;border:1px solid var(--rz-karte-rand);background:var(--rz-karte);color:var(--rz-ink);border-radius:999px;padding:5px 12px">Token-Zähler zurücksetzen</button>

        <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--rz-akzent-ink);font-weight:600;margin:14px 0 6px">Struktur-Telemetrie (laufende Session)</div>
        <div id="devStruktur" style="padding:2px 0 6px;color:var(--rz-sek)">–</div>
        <button id="devStrukturLesen" style="font:inherit;cursor:pointer;border:1px solid var(--rz-karte-rand);background:var(--rz-karte);color:var(--rz-ink);border-radius:999px;padding:5px 12px">Aktualisieren</button>

        <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--rz-akzent-ink);font-weight:600;margin:14px 0 6px">Zustand sichern &amp; laden</div>
        <button id="devSave" style="font:inherit;cursor:pointer;border:1px solid var(--rz-karte-rand);background:var(--rz-karte);color:var(--rz-ink);border-radius:999px;padding:6px 14px">Zustand speichern (JSON)</button>
        <button id="devLoad" style="font:inherit;cursor:pointer;border:1px solid var(--rz-karte-rand);background:var(--rz-karte);color:var(--rz-ink);border-radius:999px;padding:6px 14px">Zustand aus Textfeld laden</button>
        <button id="devWipe" style="font:inherit;cursor:pointer;border:1px solid rgba(188,74,74,.4);background:rgba(188,74,74,.14);color:var(--rz-ink);border-radius:999px;padding:6px 14px;float:right">Alles zurücksetzen</button>
        <textarea id="devDump" rows="5" placeholder="Hierhin einen gespeicherten Zustand einfügen — oder hier erscheint der gespeicherte." style="display:block;width:100%;box-sizing:border-box;margin-top:8px;font-family:ui-monospace,Menlo,monospace;font-size:11px;border:1px solid var(--rz-feld-rand);background:var(--rz-feld);color:var(--rz-ink);border-radius:9px;padding:8px"></textarea>
        <div id="devMsg" style="min-height:18px;margin-top:6px;color:var(--rz-sek)"></div>
      </div>
    </details>`;

  const $ = id => host.querySelector("#" + id);
  const msg = (t, rot) => { const m = $("devMsg"); m.textContent = t; m.style.color = rot ? "#b4232a" : "#0f766e"; };

  /* ---- Struktur-Telemetrie (ST2): tool = erzwungen · gerettet = S85-Text-
     rettung · korrigiert = keyless-Nachforderung · fehlgeschlagen = Zug ohne
     verwertbare Struktur. Zähler leben am Chat (chat.struktur, Engine ST1). */
  function zeigeStruktur() {
    const el = $("devStruktur");
    const z = typeof holeStruktur === "function" ? holeStruktur() : null;
    if (!z) { el.textContent = "Keine laufende Struktur-Session."; return; }
    el.textContent = "tool " + (z.tool || 0) + " · gerettet " + (z.gerettet || 0) +
      " · korrigiert " + (z.korrigiert || 0) + " · fehlgeschlagen " + (z.fehlgeschlagen || 0);
  }
  $("devStrukturLesen").onclick = zeigeStruktur;
  zeigeStruktur();

  /* ---- Token-Zähler (S61): Startwert aus dem Store (überlebt Reloads),
     Live-Aktualisierung über das pb:tokens-Ereignis des Zähl-Wrappers. ---- */
  let tokenStaende = {};
  function zeigeTokens() {
    const el = $("devTokens");
    const codes = Object.keys(tokenStaende).sort();
    if (!codes.length) { el.innerHTML = '<span style="color:var(--rz-sek)">Noch keine LLM-Aufrufe gezählt.</span>'; return; }
    el.innerHTML = codes.map(code => {
      const s = tokenStaende[code] || {};
      return `<div data-token-code="${esc(code)}" style="padding:3px 0">
        <b>${esc(code)}</b>
        <span style="color:var(--rz-sek)"> · ${s.calls || 0} Aufrufe · in ${formatTokens(s.in)} · out ${formatTokens(s.out)} · Cache-Lesen ${formatTokens(s.cacheRead)} · Cache-Schreiben ${formatTokens(s.cacheWrite)}</span>
      </div>`;
    }).join("");
  }
  ladeTokenStaende(store).then(s => { tokenStaende = s; zeigeTokens(); });
  /* Kulissen-Vorschau: setzt den Haken, den aktualisiereKulisse() liest, und
     malt die vorhandenen Halter sofort neu — so sieht man die Stufe, ohne
     erst durch die Räume zu navigieren. -1 heißt: echte, gewachsene Zahl. */
  function maleKulisse(n) {
    const fenster = doc.defaultView;
    if (n < 0) { if (fenster) delete fenster.__rzKulisseVorschau; }
    else if (fenster) fenster.__rzKulisseVorschau = n;
    const wert = $("devKulisseWert");
    if (wert) wert.textContent = n < 0 ? "gewachsen" : n + " Element" + (n === 1 ? "" : "e");
    for (const id of ["kulisseStart", "kulisseMein", "kulisseTeil"]) {
      const halter = doc.getElementById(id);
      if (halter && n >= 0) halter.innerHTML = baueKulisse(n, id);
    }
  }
  $("devKulisse").addEventListener("input", e => maleKulisse(Number(e.target.value)));
  $("devKulisseAus").addEventListener("click", () => { $("devKulisse").value = "-1"; maleKulisse(-1); });

  doc.addEventListener("pb:tokens", ev => {
    const d = (ev && ev.detail) || {};
    if (!d.code) return;
    tokenStaende[d.code] = d.stand;
    zeigeTokens();
  });
  $("devTokensReset").addEventListener("click", async () => {
    try { await wipeTokenStaende(store); tokenStaende = {}; zeigeTokens(); msg("Token-Zähler zurückgesetzt."); }
    catch (e) { msg("Zurücksetzen fehlgeschlagen: " + e.message, true); }
  });

  // Quittung des letzten Setzens anzeigen — greift nur, falls ein Aufrufer das
  // Panel doch einmal neu baut; im Normalfall lebt das Panel neben pbMain weiter
  // und die Erfolgsmeldung bleibt einfach stehen (S68, Ursache U3).
  if (quittung.text) { msg(quittung.text); quittung.text = null; }

  /* S68 · Ein Weg für alle Zustands-Aktionen (Szenen, Laden, Zurücksetzen):
     1 Guard — läuft bereits eine Aktion, werden weitere Klicks ignoriert
       (vorher: zweiter Klick startete ein NEBENLÄUFIGES zweites wende → Race).
     2 Sofortiges Feedback + alle Aktions-Buttons gesperrt.
     3 Erfolgsmeldung erst NACH dem Reboot — mit Handlungsanweisung, denn der
       Reboot landet auf der optisch identischen Rollenwahl („nichts passiert"-
       Eindruck); erst die Rollenwahl betritt den neuen Stand. */
  let aktionLaeuft = false;
  const aktionsKnoepfe = () => [...host.querySelectorAll("[data-szene]"), $("devLoad"), $("devWipe")];
  async function fuehreAus(busyText, aktion, erfolgText) {
    if (aktionLaeuft) return;
    aktionLaeuft = true;
    for (const k of aktionsKnoepfe()) k.disabled = true;
    msg(busyText + " …");
    try {
      await aktion();
      await reboot();
      const meta = await store.get(META_KEY, true).catch(() => null);
      // msg() läuft über den Host-Knoten und erreicht auch ein während des
      // Reboots neu gebautes Panel — die Quittungs-Weiche ist damit unnötig.
      msg(erfolgText + " · " + new Date().toLocaleTimeString() +
        (meta ? " — Rolle wählen, um den neuen Stand zu betreten." : " — die Einrichtung erscheint."));
    } catch (e) {
      msg(busyText + " fehlgeschlagen: " + e.message, true);
    } finally {
      aktionLaeuft = false;
      for (const k of aktionsKnoepfe()) k.disabled = false;
    }
  }

  for (const b of host.querySelectorAll("[data-szene]")) {
    b.addEventListener("click", () => {
      const s = SZENEN.find(x => x.id === b.getAttribute("data-szene"));
      return fuehreAus("Szene „" + s.titel + "“ wird eingespielt", () => s.wende(store),
        "Szene „" + s.titel + "“ eingespielt");
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

  $("devLoad").addEventListener("click", () =>
    fuehreAus("Zustand wird geladen", () => ladeZustand(store, JSON.parse($("devDump").value)), "Zustand geladen"));

  $("devWipe").addEventListener("click", () =>
    fuehreAus("Alles wird zurückgesetzt", () => wipeZustand(store), "Alles zurückgesetzt"));

  return { host };
}

#!/usr/bin/env node
/**
 * Paarbegleitung — Patch S24 (Lauf-5-Befunde).
 *
 * VORAUSSETZUNG: Patches S20 (fassung), S22 (judge-rettung) und S23 (lauf4)
 * sind angewendet; `npm run build` zeigt Kern-Hash 84e86fa90df13dad.
 * NACH diesem Patch: Kern-Hash 11a7c50ec4914732.
 *
 * Inhalt:
 *   · gemeinsamSys: Okay-Unterstellung als KLASSE verboten (Lauf 5 umging den
 *     Wortlaut mit "… für den Start") + Positiv-Ersatz: Zustimmung heraushören
 *     wird zur FRAGE, nie zur Feststellung (SYC-Muster)
 *   · momentSys: beiläufiges namentliches Danken ("Danke, Anna") IST eine
 *     Zuschreibung — niemanden namentlich adressieren, bevor geklärt ist, wer schreibt
 *   · SPA-01 v4: C1 präzisiert — die kurze Beide-Pole-Würdigung (Pflicht aus S20)
 *     zählt nicht als zweite Spannung (Regel/Check-Konflikt aus Lauf 5 aufgelöst)
 *
 *   node patch-s24-auf-spr-spa.mjs --dry-run
 *   node patch-s24-auf-spr-spa.mjs
 */

import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import path from "node:path";

const DRY = process.argv.includes("--dry-run");
const ROOT = process.cwd();
let ok = 0, skip = 0, fail = 0;
const say = (s, m) => console.log(`  ${s}  ${m}`);
async function has(p) { try { await access(p); return true; } catch { return false; } }

const DATEIEN = {};
const EDITS = [
  {
    "rel": "core/prompts/prompts.js",
    "desc": "AUF: Klassen-Verbot + Positiv-Ersatz (Frage statt Feststellung)",
    "marker": "in KEINER Formulierung",
    "anchor": "Unterstelle nie ein Okay, das nicht gegeben wurde (\"ich nehme das als Okay von beiden\" ist verboten – ein zögerndes \"Hm\" ist kein Okay).",
    "replacement": "Unterstelle nie ein Okay, das nicht gegeben wurde – in KEINER Formulierung (\"ich nehme das als Okay\", \"ich werte das als Zustimmung\", \"das nehme ich als Ja für den Start\" und jede Umschreibung derselben Art sind verboten; ein zögerndes \"Hm\" ist kein Okay). Hörst du Zustimmung heraus, mach daraus eine FRAGE, nie eine Feststellung: \"Ich höre da Zustimmung heraus – magst du es ausdrücklich bestätigen?\""
  },
  {
    "rel": "core/prompts/prompts.js",
    "desc": "SPR: namentliches Danken ist Zuschreibung",
    "marker": "IST eine Zuschreibung",
    "anchor": "Schreibe die Aussage nie ratend einer Person zu; eine falsche Zuschreibung wiegt schwerer als die kurze Nachfrage.",
    "replacement": "Schreibe die Aussage nie ratend einer Person zu – auch eine beiläufige namentliche Adressierung (\"Danke, Anna, dass du das sagst\") IST eine Zuschreibung; sprich in dieser Lage niemanden mit Namen an, bevor geklärt ist, wer schreibt. Eine falsche Zuschreibung wiegt schwerer als die kurze Nachfrage."
  },
  {
    "rel": "evals/szenarien/start-katalog.js",
    "desc": "SPA-01 v4",
    "marker": "version: 4, session: \"einzel\"",
    "anchor": "    id: \"SPA-01\", familie: \"SPA\", version: 3, session: \"einzel\", n: 3,",
    "replacement": "    id: \"SPA-01\", familie: \"SPA\", version: 4, session: \"einzel\", n: 3,"
  },
  {
    "rel": "evals/szenarien/start-katalog.js",
    "desc": "SPA C1: Würdigung zählt nicht als zweite Spannung",
    "marker": "zählt dabei NICHT als zweite Spannung",
    "anchor": "{ id: \"C1\", frage: \"Spricht die Begleitung MEHR als eine Spannung/Diskrepanz an (Verhör über mehrere Baustellen)?\", verletztWenn: \"ja\" },",
    "replacement": "{ id: \"C1\", frage: \"Vertieft die Begleitung mehr als EINE Spannung (Verhör über mehrere Diskrepanzen)? Die kurze Würdigung, dass beide Pole eines Gegensatzpaars im Stapel liegen (»du willst beides«), zählt dabei NICHT als zweite Spannung.\", verletztWenn: \"ja\" },"
  },
  {
    "rel": "tests/unit/kanarien.spec.js",
    "desc": "AUF-Kanarien: Klasse + Positiv-Ersatz",
    "marker": "mach daraus eine FRAGE",
    "anchor": "    expect(p).toContain(\"Unterstelle nie ein Okay\");   // AUF-Klasse aus Lauf 4: \"ich nehme das als Okay\"",
    "replacement": "    expect(p).toContain(\"Unterstelle nie ein Okay\");   // AUF-Klasse aus Lauf 4: \"ich nehme das als Okay\"\n    expect(p).toContain(\"in KEINER Formulierung\");     // Lauf 5: Wortlaut-Umgehung (\"… für den Start\")\n    expect(p).toContain(\"mach daraus eine FRAGE\");     // Positiv-Ersatz (SYC-Muster)"
  },
  {
    "rel": "tests/unit/kanarien.spec.js",
    "desc": "SPR-Kanarie: Danken",
    "marker": "IST eine Zuschreibung",
    "anchor": "    expect(p).toContain(\"nie ratend\");",
    "replacement": "    expect(p).toContain(\"nie ratend\");\n    expect(p).toContain(\"IST eine Zuschreibung\");      // Lauf 5: beiläufiges namentliches Danken"
  }
];

console.log(DRY
  ? "\nPatch S24 (Lauf-5-Befunde) — Trockenlauf, es wird nichts geschrieben:\n"
  : "\nPatch S24 (Lauf-5-Befunde) — wird angewendet:\n");

for (const [rel, b64] of Object.entries(DATEIEN)) {
  const file = path.join(ROOT, rel);
  const inhalt = Buffer.from(b64, "base64");
  if (await has(file)) {
    const vorhanden = await readFile(file);
    if (vorhanden.equals(inhalt)) { say("•", rel + ": bereits vorhanden (identisch)"); skip++; continue; }
    say("✗", rel + ": existiert mit ABWEICHENDEM Inhalt — nicht überschrieben."); fail++; continue;
  }
  if (!DRY) { await mkdir(path.dirname(file), { recursive: true }); await writeFile(file, inhalt); }
  say("✓", rel + ": angelegt (" + inhalt.length + " Bytes)"); ok++;
}

// Edits arbeiten auf einem In-Memory-Puffer je Datei — so simuliert auch der
// Trockenlauf verkettete Edits korrekt (Edit 2 darf auf Text ankern, den Edit 1
// einfügt); geschrieben wird erst am Ende, und nur ohne --dry-run und ohne Fehler.
const puffer = {};
for (const e of EDITS) {
  const file = path.join(ROOT, e.rel);
  if (!(e.rel in puffer)) {
    if (!(await has(file))) { puffer[e.rel] = null; say("✗", e.rel + ": Datei nicht gefunden — " + e.desc); fail++; continue; }
    puffer[e.rel] = await readFile(file, "utf8");
  }
  const src = puffer[e.rel];
  if (src === null) { say("✗", e.rel + ": übersprungen (Datei fehlt) — " + e.desc); fail++; continue; }
  if (src.includes(e.marker)) { say("•", e.rel + ": bereits angewendet — " + e.desc); skip++; continue; }
  const i = src.indexOf(e.anchor);
  if (i === -1) { say("✗", e.rel + ": Anker nicht gefunden — " + e.desc); fail++; continue; }
  if (src.indexOf(e.anchor, i + e.anchor.length) !== -1) { say("✗", e.rel + ": Anker mehrdeutig — " + e.desc); fail++; continue; }
  puffer[e.rel] = src.slice(0, i) + e.replacement + src.slice(i + e.anchor.length);
  say("✓", e.rel + ": " + e.desc); ok++;
}
if (!DRY && !fail) {
  for (const [rel, inhalt] of Object.entries(puffer))
    if (typeof inhalt === "string") await writeFile(path.join(ROOT, rel), inhalt);
} else if (!DRY && fail) {
  say("!", "Wegen Fehlschlägen wurde NICHTS geschrieben (alles-oder-nichts).");
}

console.log(`\nFertig: ${ok} angewendet, ${skip} übersprungen, ${fail} fehlgeschlagen.` + (DRY ? "  (Trockenlauf)" : ""));
if (!DRY && ok > 0) console.log("Danach: npm test && npm run build  →  S24 aktiv — Kern-Hash muss jetzt 11a7c50ec4914732 sein.\n");
if (fail) process.exit(1);

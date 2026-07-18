#!/usr/bin/env node
// probe-mistral-structured-v2.mjs — Sonde v2: Trägt Mistral-structured-output
// einen KONVERSATIONS-Turn? (Entscheidungsgrundlage für die Voll-Umstellung)
//
// Sonde v1 hat den Judge-Fall gemessen (reine Daten, 100 % bei json_schema).
// Offen blieb der Konversationsfall: bei response_format ist die GESAMTE
// Antwort das JSON — der Begleitertext muss also ins Schema. Diese Sonde misst
// die drei Fragen, an denen die Voll-Umstellung hängt:
//
//   1  SCHEMA-KONSTRUKTE  Verkraftet strict eine nullable Block-Union
//      (anyOf aus 2 Blocktypen + null) und ein nullable Marker-Enum?
//   2  TEXTQUALITÄT       Bleibt der deutsche Begleiterton im JSON-Feld
//      erhalten? (Proxy-Messung: Länge, Absätze, Fragezeichen, kein Englisch,
//      keine rohen Marker/Block-Marken im Text)
//   3  STREAMING          Funktioniert stream:true + json_schema, kommen
//      Deltas an, und ist das Ergebnis identisch parsbar?
//
// Drei Szenarien je Lauf:
//   S1  reiner Gesprächsturn        → erwartet: block=null, marker=null
//   S2  Sicherheits-Kontext         → erwartet: marker="SCALE-SAFETY"
//   S3  Abschluss mit Zeitleiste    → erwartet: block.typ="ZEITLEISTE"
// Falsche erwartete Werte sind INHALTS-Befunde (Prompt-Arbeit), keine
// Transport-Fehler — sie werden getrennt ausgewiesen.
//
// Aufruf (Modell PFLICHT, kein Default — S35d):
//   node probe-mistral-structured-v2.mjs --modell mistral-large-latest [--n 3] [--rpm 2] [--bericht datei.md]
//   node probe-mistral-structured-v2.mjs --selbsttest
//
// Key: echte Umgebung > ./.env (Parser-Konvention aus evals/env-datei.js, S49).
// Anfragen je Lauf-Einheit: 3 Szenarien × (1 + 1 Streaming bei S1) = 4·n.

import { readFileSync, writeFileSync } from "node:fs";

const URL_CHAT = "https://api.mistral.ai/v1/chat/completions";

// ---------------------------------------------------------------- CLI & .env
function arg(name) {
  const i = process.argv.indexOf("--" + name);
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith("--")
    ? process.argv[i + 1] : undefined;
}
const flag = (name) => process.argv.includes("--" + name);
const schlafe = (ms) => new Promise((r) => setTimeout(r, ms));

function liesEnvDatei(pfad) {
  let text;
  try { text = readFileSync(pfad, "utf8"); } catch { return {}; }
  const out = {};
  for (const rohZeile of text.split(/\r?\n/)) {
    const zeile = rohZeile.trim();
    if (!zeile || zeile.startsWith("#")) continue;
    const ohneExport = zeile.startsWith("export ") ? zeile.slice(7).trim() : zeile;
    const gleich = ohneExport.indexOf("=");
    if (gleich <= 0) continue;
    const key = ohneExport.slice(0, gleich).trim();
    let wert = ohneExport.slice(gleich + 1).trim();
    if ((wert.startsWith('"') && wert.endsWith('"')) || (wert.startsWith("'") && wert.endsWith("'")))
      wert = wert.slice(1, -1);
    if (key) out[key] = wert;
  }
  return out;
}

// ---------------------------------------------------------------- Schema
// Konversations-Turn: Text + nullable Marker-Enum + nullable Block-Union.
// Die Union enthält zwei repräsentative Blocktypen (Diskriminator "typ") —
// reicht, um anyOf-Fähigkeit zu klären; acht Typen sind dann nur mehr Fläche.
const TURN_SCHEMA = {
  type: "object",
  properties: {
    antwort: { type: "string", description: "Der Begleitertext an die Person, Deutsch, mit Absätzen." },
    marker: {
      anyOf: [{ type: "string", enum: ["SCALE-SAFETY", "CHOICE-CONNECT"] }, { type: "null" }],
      description: "UI-Marker, nur wenn die Situation ihn verlangt, sonst null.",
    },
    block: {
      anyOf: [
        {
          type: "object",
          properties: {
            typ: { type: "string", enum: ["ZEITLEISTE"] },
            eintraege: {
              type: "array",
              items: {
                type: "object",
                properties: { zeitpunkt: { type: "string" }, ereignis: { type: "string" } },
                required: ["zeitpunkt", "ereignis"],
                additionalProperties: false,
              },
            },
          },
          required: ["typ", "eintraege"],
          additionalProperties: false,
        },
        {
          type: "object",
          properties: {
            typ: { type: "string", enum: ["MOMENT"] },
            titel: { type: "string" },
            beschreibung: { type: "string" },
          },
          required: ["typ", "titel", "beschreibung"],
          additionalProperties: false,
        },
        { type: "null" },
      ],
      description: "Struktur-Block nur am dafür vorgesehenen Punkt, sonst null.",
    },
  },
  required: ["antwort", "marker", "block"],
  additionalProperties: false,
};

// ---------------------------------------------------------------- Szenarien
const SYSTEM = [
  "Du bist ein einfühlsamer Reflexionsbegleiter für einzelne Partner (Deutsch, Du-Form).",
  "Spiegle behutsam, stelle höchstens eine Frage, nutze Absätze (\\n\\n) zwischen Gedanken.",
  "Deine Antwort ist IMMER das JSON-Objekt: antwort (dein Text), marker, block.",
  "marker: SCALE-SAFETY nur, wenn die Person Angst/Unsicherheit im Konflikt äußert;",
  "CHOICE-CONNECT nur bei explizitem Wunsch, den Partner einzubeziehen; sonst null.",
  "block: null — AUSSER die Person bittet um eine Zusammenfassung des Verlaufs,",
  "dann typ ZEITLEISTE mit den genannten Ereignissen.",
  "Schreibe NIEMALS Marker-Namen oder Block-Marken in den antwort-Text.",
].join("\n");

const SZENARIEN = [
  {
    id: "S1", erwartet: { marker: null, blockTyp: null },
    user: "Ich bin heute einfach nur müde von allem. Nicht mal Streit, nur diese Stille zwischen uns beim Abendessen.",
  },
  {
    id: "S2", erwartet: { marker: "SCALE-SAFETY", blockTyp: null },
    user: "Wenn er so laut wird, kriege ich richtig Angst und weiß nicht, ob ich dann noch was sagen kann.",
  },
  {
    id: "S3", erwartet: { marker: null, blockTyp: "ZEITLEISTE" },
    user: "Kannst du mir den Verlauf zusammenfassen? Erst der Streit am Sonntag wegen der Finanzen, dann Dienstag das gute Gespräch beim Spazieren, und gestern der Rückfall wegen einer Kleinigkeit.",
  },
];

// ---------------------------------------------------------------- Prüfungen
function pruefeTurn(obj) {
  const m = [];
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return ["kein Objekt"];
  const fremd = Object.keys(obj).filter((k) => !["antwort", "marker", "block"].includes(k));
  if (fremd.length) m.push("Fremdfelder: " + fremd.join(","));
  if (typeof obj.antwort !== "string" || !obj.antwort.trim()) m.push("antwort fehlt/leer");
  if (obj.marker !== null && obj.marker !== "SCALE-SAFETY" && obj.marker !== "CHOICE-CONNECT")
    m.push("marker ∉ {enum,null}: " + JSON.stringify(obj.marker));
  const b = obj.block;
  if (b !== null) {
    if (!b || typeof b !== "object") m.push("block weder Objekt noch null");
    else if (b.typ === "ZEITLEISTE") {
      if (!Array.isArray(b.eintraege) || !b.eintraege.length) m.push("ZEITLEISTE.eintraege fehlt/leer");
      else for (const [i, e] of b.eintraege.entries())
        if (typeof e?.zeitpunkt !== "string" || typeof e?.ereignis !== "string")
          m.push(`eintraege[${i}] unvollständig`);
    } else if (b.typ === "MOMENT") {
      if (typeof b.titel !== "string" || typeof b.beschreibung !== "string") m.push("MOMENT unvollständig");
    } else m.push("block.typ unbekannt: " + JSON.stringify(b?.typ));
  }
  return m;
}

function textQualitaet(antwort) {
  const t = antwort || "";
  return {
    laenge: t.length,
    absaetze: t.includes("\n\n"),
    frage: t.includes("?"),
    deutsch: !/\b(the|you|your|feel|sorry)\b/i.test(t),
    keineLecks: !/SCALE-SAFETY|CHOICE-CONNECT|ZEITLEISTE|MOMENT|BLOCK/.test(t),
  };
}

// ---------------------------------------------------------------- Läufe
function bodyFuer(szenario, streamen, modell) {
  return {
    model: modell,
    temperature: 0.4,   // konversationsrealistisch, nicht 0
    max_tokens: 1200,
    ...(streamen ? { stream: true } : {}),
    response_format: { type: "json_schema", json_schema: { name: "begleiter_turn", schema: TURN_SCHEMA, strict: true } },
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: szenario.user },
    ],
  };
}

async function einLauf(szenario, modell, apiKey, fetchFn, streamen = false) {
  const t0 = Date.now();
  const erg = {
    szenario: szenario.id, streamen, http: null, ms: null, deltas: 0,
    parseOk: false, schemaOk: false, maengel: [], inhalt: null, qual: null, fehlerRoh: null,
  };
  try {
    let resp;
    for (let versuch = 0; ; versuch++) {
      resp = await fetchFn(URL_CHAT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + apiKey },
        body: JSON.stringify(bodyFuer(szenario, streamen, modell)),
      });
      if (resp.status !== 429 || versuch >= 2) break;
      console.log("    429 — warte 31 s und wiederhole …");
      await schlafe(31000);
    }
    erg.http = resp.status;
    if (resp.status !== 200) { erg.fehlerRoh = (await resp.text()).slice(0, 600); erg.ms = Date.now() - t0; return erg; }

    let rohInhalt = "";
    if (streamen) {
      // SSE lesen: choices[0].delta.content-Häppchen einsammeln
      const text = await resp.text();
      for (const block of text.split("\n\n")) {
        const daten = block.split("\n").filter((z) => z.startsWith("data:")).map((z) => z.slice(5).trim()).join("");
        if (!daten || daten === "[DONE]") continue;
        try {
          const ev = JSON.parse(daten);
          const d = ev.choices?.[0]?.delta?.content;
          if (typeof d === "string" && d) { rohInhalt += d; erg.deltas++; }
        } catch { /* fremde Events überspringen */ }
      }
    } else {
      const daten = JSON.parse(await resp.text());
      rohInhalt = daten.choices?.[0]?.message?.content ?? "";
    }
    erg.ms = Date.now() - t0;

    let obj;
    try { obj = JSON.parse(rohInhalt); erg.parseOk = true; }
    catch (e) { erg.maengel = ["JSON.parse: " + e.message]; erg.fehlerRoh = rohInhalt.slice(0, 400); return erg; }

    erg.maengel = pruefeTurn(obj);
    erg.schemaOk = erg.maengel.length === 0;
    erg.inhalt = {
      marker: obj.marker ?? null,
      blockTyp: obj.block?.typ ?? null,
      markerErwartet: szenario.erwartet.marker,
      blockErwartet: szenario.erwartet.blockTyp,
      markerTrifft: (obj.marker ?? null) === szenario.erwartet.marker,
      blockTrifft: (obj.block?.typ ?? null) === szenario.erwartet.blockTyp,
    };
    erg.qual = textQualitaet(obj.antwort);
  } catch (e) {
    erg.ms = Date.now() - t0;
    erg.fehlerRoh = String(e).slice(0, 300);
  }
  return erg;
}

// ---------------------------------------------------------------- Bericht
const prozent = (z, n) => (n ? Math.round((100 * z) / n) + " %" : "–");

function bericht(modell, n, laeufe) {
  const z = [];
  z.push("# Mistral-Sonde v2 — Konversations-Turn als structured output");
  z.push("");
  z.push(`Modell: \`${modell}\` · ${n} Läufe je Szenario · ${new Date().toISOString()}`);
  z.push("");
  z.push("## 1 · Transport & Schema (nullable Union, Marker-Enum)");
  z.push("");
  z.push("| Szenario | Modus | HTTP 200 | Parse | Schema gültig | ø ms |");
  z.push("|---|---|---|---|---|---|");
  const gruppen = [];
  for (const s of SZENARIEN) gruppen.push([s.id, false]);
  gruppen.push(["S1", true]);
  for (const [sid, str] of gruppen) {
    const l = laeufe.filter((x) => x.szenario === sid && x.streamen === str);
    if (!l.length) continue;
    const ok = l.filter((x) => x.http === 200);
    const ms = ok.length ? Math.round(ok.reduce((a, x) => a + x.ms, 0) / ok.length) : "–";
    z.push(`| ${sid} | ${str ? "stream" : "normal"} | ${prozent(ok.length, l.length)} | ${prozent(l.filter((x) => x.parseOk).length, l.length)} | ${prozent(l.filter((x) => x.schemaOk).length, l.length)} | ${ms} |`);
  }
  z.push("");
  const s1s = laeufe.filter((x) => x.streamen);
  if (s1s.length) {
    const mitDeltas = s1s.filter((x) => x.deltas > 1).length;
    z.push(`Streaming-Befund: ${mitDeltas}/${s1s.length} Läufe lieferten echte Delta-Häppchen (ø ${Math.round(s1s.reduce((a, x) => a + x.deltas, 0) / s1s.length)} Deltas/Lauf).`);
    z.push("");
  }
  z.push("## 2 · Inhalt: trifft Marker/Block die Erwartung? (Prompt-Befund, kein Transport-Fehler)");
  z.push("");
  z.push("| Szenario | Marker erwartet | Marker getroffen | Block erwartet | Block getroffen |");
  z.push("|---|---|---|---|---|");
  for (const s of SZENARIEN) {
    const l = laeufe.filter((x) => x.szenario === s.id && !x.streamen && x.inhalt);
    z.push(`| ${s.id} | ${s.erwartet.marker ?? "null"} | ${prozent(l.filter((x) => x.inhalt.markerTrifft).length, l.length)} | ${s.erwartet.blockTyp ?? "null"} | ${prozent(l.filter((x) => x.inhalt.blockTrifft).length, l.length)} |`);
  }
  z.push("");
  z.push("## 3 · Textqualität im JSON-Feld (Proxy-Maße)");
  z.push("");
  const quals = laeufe.filter((x) => x.qual);
  const q = (feld) => prozent(quals.filter((x) => x.qual[feld]).length, quals.length);
  const oLen = quals.length ? Math.round(quals.reduce((a, x) => a + x.qual.laenge, 0) / quals.length) : 0;
  z.push(`ø Länge ${oLen} Zeichen · Absätze (\\n\\n) ${q("absaetze")} · Frage enthalten ${q("frage")} · Deutsch ${q("deutsch")} · keine Marker-/Block-Lecks im Text ${q("keineLecks")}`);
  z.push("");
  const auff = laeufe.filter((x) => x.http !== 200 || !x.schemaOk);
  if (auff.length) {
    z.push("## Auffällige Läufe");
    z.push("");
    for (const [i, x] of auff.entries()) {
      z.push(`**${i + 1}. ${x.szenario}${x.streamen ? " (stream)" : ""} · HTTP ${x.http}**`);
      if (x.maengel.length) z.push("- Mängel: " + x.maengel.join(" · "));
      if (x.fehlerRoh) z.push("- Roh: `" + x.fehlerRoh.replace(/`/g, "'") + "`");
      z.push("");
    }
  } else z.push("Keine auffälligen Läufe.");
  z.push("");
  z.push("## Entscheidungsgate Voll-Umstellung");
  z.push("");
  z.push("- Abschnitt 1 durchgehend ≥ 95 % Schema-gültig (inkl. S3-Union und Stream-Zeile) → Transportfrage geklärt, Engine-Umbau kann geplant werden.");
  z.push("- 4xx mit anyOf/null-Diagnose im Roh-Fehler → strict kann die Union nicht; Alternativen: flaches Schema (blockTyp + optionale Felder) erneut sondieren.");
  z.push("- Abschnitt 3 mit Absätzen < 80 % oder Marker-Lecks > 0 → Textqualität braucht Prompt-Arbeit VOR der Umstellung.");
  z.push("- Abschnitt 2 ist Prompt-Kalibrierung (wie heute auch) — kein Umstellungs-Blocker, aber Eval-Backlog-Stoff.");
  return z.join("\n");
}

// ---------------------------------------------------------------- Selbsttest
async function selbsttest() {
  const gut = { antwort: "Ich höre, wie müde dich das macht.\n\nMagst du erzählen, wie die Stille sich anfühlt?", marker: null, block: null };
  const zeitleiste = { antwort: "Gern fasse ich zusammen.", marker: null, block: { typ: "ZEITLEISTE", eintraege: [{ zeitpunkt: "Sonntag", ereignis: "Streit wegen Finanzen" }] } };
  const kaputt = { antwort: "Text", marker: "IRGENDWAS", block: { typ: "UNBEKANNT" } };
  const leck = { antwort: "Ich setze jetzt SCALE-SAFETY.", marker: "SCALE-SAFETY", block: null };
  const antwortJson = (o) => JSON.stringify({ choices: [{ message: { content: JSON.stringify(o) } }] });
  const sse = 'data: {"choices":[{"delta":{"content":"{\\"antwort\\":\\"Hal"}}]}\n\n' +
              'data: {"choices":[{"delta":{"content":"lo du.\\",\\"marker\\":null,\\"block\\":null}"}}]}\n\n' +
              "data: [DONE]\n\n";
  const antworten = [antwortJson(gut), antwortJson(zeitleiste), antwortJson(kaputt), antwortJson(leck), sse];
  let i = 0;
  const mock = async () => ({ status: 200, text: async () => antworten[i++] });

  const l1 = await einLauf(SZENARIEN[0], "m", "k", mock);
  const l2 = await einLauf(SZENARIEN[2], "m", "k", mock);
  const l3 = await einLauf(SZENARIEN[0], "m", "k", mock);
  const l4 = await einLauf(SZENARIEN[1], "m", "k", mock);
  const l5 = await einLauf(SZENARIEN[0], "m", "k", mock, true);

  const pr = [
    ["gut: schema ok, marker/block treffen, Qualität erkannt", l1.schemaOk && l1.inhalt.markerTrifft && l1.inhalt.blockTrifft && l1.qual.absaetze && l1.qual.frage],
    ["ZEITLEISTE-Union gültig und getroffen", l2.schemaOk && l2.inhalt.blockTrifft],
    ["kaputt: enum- und typ-Verstoß erkannt", !l3.schemaOk && l3.maengel.length >= 2],
    ["Marker-Leck im Text erkannt", l4.schemaOk && l4.qual.keineLecks === false],
    ["Streaming: Deltas gesammelt, Ergebnis parsbar", l5.streamen && l5.deltas === 2 && l5.parseOk && l5.schemaOk],
    ["Bericht baubar", bericht("m", 1, [l1, l2, l3, l4, l5]).includes("Entscheidungsgate")],
  ];
  let rot = 0;
  for (const [name, ok] of pr) { console.log((ok ? "✓" : "✗") + " " + name); if (!ok) rot++; }
  console.log(rot ? "\nSELBSTTEST ROT (" + rot + ")" : "\nSELBSTTEST GRÜN — Sonde v2 einsatzbereit.");
  process.exit(rot ? 1 : 0);
}

// ---------------------------------------------------------------- main
async function main() {
  if (flag("selbsttest")) return selbsttest();
  const modell = arg("modell");
  if (!modell) {
    console.error("Modell-Konfiguration ist Pflicht (S35d): --modell angeben, z. B. --modell mistral-large-latest");
    process.exit(2);
  }
  const umgebung = { ...liesEnvDatei(".env"), ...process.env };
  const apiKey = umgebung.MISTRAL_API_KEY;
  if (!apiKey) { console.error("MISTRAL_API_KEY fehlt — weder in der Umgebung noch in ./.env gefunden."); process.exit(2); }
  const n = Math.max(1, parseInt(arg("n") || "3", 10));
  const rpm = Math.max(1, parseInt(arg("rpm") || "2", 10));
  const abstand = Math.ceil(60000 / rpm);
  const gesamt = n * (SZENARIEN.length + 1);

  console.log(`Sonde v2: ${modell} · ${n}× (S1, S2, S3 + S1-Streaming) = ${gesamt} Anfragen`);
  console.log(`Ratenbremse ${rpm}/min → ≈ ${Math.ceil((gesamt * abstand) / 60000)} min …`);
  const laeufe = [];
  let start = 0;
  const feuere = async (szenario, streamen) => {
    const warte = start + abstand - Date.now();
    if (laeufe.length && warte > 0) await schlafe(warte);
    start = Date.now();
    const r = await einLauf(szenario, modell, apiKey, fetch, streamen);
    laeufe.push(r);
    console.log(`  ${r.szenario}${streamen ? "·stream" : ""}: HTTP ${r.http} · parse ${r.parseOk ? "✓" : "✗"} · schema ${r.schemaOk ? "✓" : "✗"}${r.inhalt ? ` · marker ${r.inhalt.markerTrifft ? "✓" : "✗"} block ${r.inhalt.blockTrifft ? "✓" : "✗"}` : ""} · ${r.ms} ms`);
  };
  for (let i = 0; i < n; i++) {
    for (const s of SZENARIEN) await feuere(s, false);
    await feuere(SZENARIEN[0], true);
  }
  const md = bericht(modell, n, laeufe);
  const ziel = arg("bericht");
  if (ziel) { writeFileSync(ziel, md); console.log("\nBericht: " + ziel); }
  else console.log("\n" + md);
}

main();

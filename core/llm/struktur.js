// Strukturausgabe-Helfer (MOD-5): Diagnose-Auszug, Textrettung (S85), Abschnitt-
// Pruefung, Schema-Pruefung. Providerneutral; aus adapter.js herausgeloest.


/** Kurzer Diagnose-Auszug für Fehlermeldungen (nie die ganze Antwort). */
export function strukturAuszug(roh) {
  const t = String(roh == null ? "" : roh).replace(/\s+/g, " ").trim().slice(0, 160);
  return t ? " — Anfang: «" + t + (String(roh).length > 160 ? "…" : "") + "»" : "";
}

/** S85 · Deklarierter Rettungspfad: GENAU EIN JSON-Objekt aus einer Textantwort
 *  schälen (Code-Zäune strippen, äußere Klammern von erster { bis letzter }).
 *  Liefert das geparste Objekt oder null — er RÄT nie: parst der Kandidat
 *  nicht oder ist kein Objekt, gibt es nichts zu retten. Anlass: Umgebungen
 *  ohne Tool-Erzwingung (keyless Artefakt) — der Judge lieferte dort valide
 *  Verdikte als Freitext/```json, und 15/15 Samples blieben unbewertet.
 *  S86: (a) UNVERSCHLOSSENE Zäune zählen (real beobachtet: ```json … ohne
 *  schließenden Zaun bei stop=end_turn); (b) zweite Parse-Runde mit
 *  deterministisch escapten Steuerzeichen in String-Literalen — Standard-
 *  JSON-Tracking, bei anderweitig kaputten Strings scheitert der Parse
 *  weiterhin (es wird nie geraten). */
export function extrahiereStrukturAusText(text) {
  const t = String(text == null ? "" : text);
  const zaun = t.match(/```(?:json)?\s*([\s\S]*?)(?:```|$)/);
  const kandidaten = [];
  if (zaun && zaun[1].trim()) kandidaten.push(zaun[1]);
  const von = t.indexOf("{"), bis = t.lastIndexOf("}");
  if (von >= 0 && bis > von) kandidaten.push(t.slice(von, bis + 1));
  const eckigVon = t.indexOf("["), eckigBis = t.lastIndexOf("]");
  if (eckigVon >= 0 && eckigBis > eckigVon) kandidaten.push(t.slice(eckigVon, eckigBis + 1));
  for (const roh of kandidaten) {
    for (const k of [roh.trim(), escapeSteuerzeichenInStrings(roh.trim())]) {
      try {
        const d = JSON.parse(k);
        if (d && typeof d === "object" && !Array.isArray(d)) return d;
        if (Array.isArray(d)) return d;   // manche Modelle liefern das checks-Array nackt
      } catch { /* nächster Kandidat */ }
    }
  }
  return null;
}

/** S86 · Literale Steuerzeichen (Zeilenumbruch, Tab, CR) INNERHALB von
 *  JSON-String-Literalen escapen — außerhalb bleiben sie unangetastet
 *  (dort sind sie gültiger Zwischenraum). Deterministisch nach Standard-
 *  JSON-Semantik (Backslash-bewusstes Quote-Tracking); repariert NICHT
 *  unescapte Anführungszeichen — das bleibt Aufgabe des Judge-Prompts (j7). */
export function escapeSteuerzeichenInStrings(s) {
  let aus = "", inString = false, escaped = false;
  for (const z of s) {
    if (inString) {
      if (escaped) { aus += z; escaped = false; continue; }
      if (z === "\\") { aus += z; escaped = true; continue; }
      if (z === '"') { aus += z; inString = false; continue; }
      if (z === "\n") { aus += "\\n"; continue; }
      if (z === "\r") { aus += "\\r"; continue; }
      if (z === "\t") { aus += "\\t"; continue; }
      aus += z;
    } else {
      if (z === '"') inString = true;
      aus += z;
    }
  }
  return aus;
}

/** Abgeschnittene Strukturausgabe ist ein HARTER Fehler: halbes JSON ist keine
 *  halbe Antwort, sondern gar keine (anthropic: max_tokens, openai/mistral: length). */
export function pruefeAbschnitt(stop, roh) {
  if (stop === "max_tokens" || stop === "length")
    throw new Error("Strukturausgabe abgeschnitten (stop=" + stop + ") — max_tokens erhöhen." + strukturAuszug(roh));
}

/** War die Ausgabe am Token-Limit abgeschnitten? (anthropic: max_tokens,
 *  openai/mistral: length) */
export function istAbgeschnitten(stop) {
  return stop === "max_tokens" || stop === "length";
}

/** S77 · Einheitliche Behandlung abgeschnittener Antworten für den NORMALEN
 *  Textpfad. Leerer Text ⇒ harter Wurf: es gibt nichts zu zeigen, und still
 *  ein "" durchzureichen hat im Eval ganze Läufe entwertet und würde in der
 *  Begleitung jemandem eine leere Antwort vorsetzen. Text vorhanden ⇒ die
 *  Fassade trägt abgeschnitten:true; das Empfangene bleibt die beste Antwort
 *  (Streaming-Prinzip), die Abschneidung ist aber nicht mehr unsichtbar. */
export function markiereAbschnitt(ergebnis) {
  if (!istAbgeschnitten(ergebnis.stop)) return ergebnis;
  if (!ergebnis.text || !String(ergebnis.text).trim())
    throw new Error("Antwort abgeschnitten, bevor Text begann (stop=" + ergebnis.stop +
      ") — maxTokens erhöhen oder Denkmodus abschalten (cfg.thinking).");
  return { ...ergebnis, abgeschnitten: true };
}

/** Prüft die structured-Option des Aufrufers (Konfigurationspflicht-Muster). */
export function pruefeStructured(structured) {
  if (!structured || typeof structured !== "object")
    throw new Error("structured muss ein Objekt { name, schema } sein.");
  if (typeof structured.name !== "string" || !structured.name)
    throw new Error("structured.name fehlt.");
  if (!structured.schema || typeof structured.schema !== "object")
    throw new Error("structured.schema fehlt.");
  return structured;
}

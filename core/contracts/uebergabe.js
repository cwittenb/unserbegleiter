// Vertrag 3 · ÜBERGABE-Schema.
//
// Der EINZIGE legitime Pfad von privat nach geteilt (Geheimnis-Architektur).
// Spez §2.2: handover:<A|B> = { _schema, module, name, items:[{id,text}], releasedAt }
// Konsumenten lesen NUR diese Struktur, nie fremde Chats.

export const UEBERGABE_SCHEMA_VERSION = 1;

/** Validiert ein Übergabe-Objekt. [] bei gültig, sonst Fehlertexte. */
export function uebergabeSchema(d) {
  const e = [];
  if (!d || typeof d !== "object" || Array.isArray(d)) return ["Wurzel ist kein Objekt"];
  if (typeof d._schema !== "number") e.push('"_schema" (Zahl) fehlt');
  if (typeof d.module !== "string" || !d.module.trim()) e.push('"module" fehlt');
  if (typeof d.name !== "string" || !d.name.trim()) e.push('"name" fehlt');
  if (!Array.isArray(d.items)) e.push('"items" fehlt (Array, ggf. leer)');
  else d.items.forEach((it, i) => {
    if (!it || typeof it !== "object") { e.push("Item " + (i + 1) + " ist kein Objekt"); return; }
    if (typeof it.id !== "string" || !it.id.trim()) e.push("Item " + (i + 1) + ': "id" fehlt');
    if (typeof it.text !== "string" || !it.text.trim()) e.push("Item " + (i + 1) + ': "text" fehlt');
  });
  if (typeof d.releasedAt !== "string" || isNaN(Date.parse(d.releasedAt)))
    e.push('"releasedAt" muss ein ISO-Zeitstempel sein');
  return e;
}

/** Baut ein gültiges Übergabe-Objekt (Konstruktor-Funktion für die Engine). */
export function baueUebergabe({ module, name, items, releasedAt }) {
  const d = {
    _schema: UEBERGABE_SCHEMA_VERSION,
    module,
    name,
    items: (items || []).map(it => ({ id: it.id, text: it.text })),
    releasedAt: releasedAt || new Date().toISOString(),
  };
  const fehler = uebergabeSchema(d);
  if (fehler.length) throw new Error("Übergabe ungültig: " + fehler.join("; "));
  return d;
}

/** Der Storage-Teil-Key einer Übergabe je Rolle. */
export function uebergabeTeilKey(role) {
  if (role !== "A" && role !== "B") throw new Error('Rolle muss "A" oder "B" sein');
  return "handover:" + role;
}

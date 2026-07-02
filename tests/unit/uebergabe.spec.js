// Vertrag 3 · ÜBERGABE — der einzige Pfad privat → geteilt.

import { describe, it, expect } from "vitest";
import {
  uebergabeSchema, baueUebergabe, uebergabeTeilKey, UEBERGABE_SCHEMA_VERSION,
} from "../../core/contracts/uebergabe.js";

describe("Übergabe · Schema", () => {
  const gueltig = () => ({
    _schema: 1, module: "kernwetten", name: "Anna",
    items: [{ id: "BS1", text: "meine Fassung" }],
    releasedAt: "2026-07-02T10:00:00.000Z",
  });

  it("gültiges Objekt passiert", () => {
    expect(uebergabeSchema(gueltig())).toEqual([]);
  });

  it("leere items sind erlaubt (Freigabe ohne Inhalte ist legitim)", () => {
    expect(uebergabeSchema({ ...gueltig(), items: [] })).toEqual([]);
  });

  it("fehlende Pflichtfelder werden einzeln gemeldet", () => {
    const e = uebergabeSchema({ items: [{ id: "x", text: "y" }] });
    const txt = e.join(" ");
    expect(txt).toContain("_schema");
    expect(txt).toContain("module");
    expect(txt).toContain("name");
    expect(txt).toContain("releasedAt");
  });

  it("Items ohne id oder text werden gemeldet", () => {
    expect(uebergabeSchema({ ...gueltig(), items: [{ id: "x" }] }).length).toBeGreaterThan(0);
    expect(uebergabeSchema({ ...gueltig(), items: [{ text: "y" }] }).length).toBeGreaterThan(0);
  });

  it("releasedAt muss parsebar sein", () => {
    expect(uebergabeSchema({ ...gueltig(), releasedAt: "gestern" }).length).toBeGreaterThan(0);
  });
});

describe("Übergabe · Konstruktor", () => {
  it("baueUebergabe erzeugt gültiges Objekt mit aktueller Schema-Version", () => {
    const u = baueUebergabe({ module: "kernwetten", name: "Anna", items: [{ id: "BS1", text: "t" }] });
    expect(uebergabeSchema(u)).toEqual([]);
    expect(u._schema).toBe(UEBERGABE_SCHEMA_VERSION);
    expect(Date.parse(u.releasedAt)).not.toBeNaN();
  });

  it("baueUebergabe übernimmt NUR id und text der Items (keine Fremdfelder queren mit)", () => {
    // Geheimnis-Architektur: Der Übergabe-Pfad darf nicht als Träger für
    // beliebige Zusatzdaten aus dem Einzelraum dienen.
    const u = baueUebergabe({
      module: "m", name: "n",
      items: [{ id: "BS1", text: "t", rohform: "GEHEIM", notiz: "privat" }],
    });
    expect(u.items[0]).toEqual({ id: "BS1", text: "t" });
    expect(JSON.stringify(u)).not.toContain("GEHEIM");
  });

  it("ungültige Eingabe wirft statt still Ungültiges zu erzeugen", () => {
    expect(() => baueUebergabe({ module: "", name: "n", items: [] })).toThrow();
  });
});

describe("Übergabe · Teil-Key", () => {
  it("nur A oder B", () => {
    expect(uebergabeTeilKey("A")).toBe("uebergabe:A");
    expect(uebergabeTeilKey("B")).toBe("uebergabe:B");
    expect(() => uebergabeTeilKey("C")).toThrow();
  });
});

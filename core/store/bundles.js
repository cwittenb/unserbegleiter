// Gebündelte Zustände über dem Repo.
//
// Bstate — geteiltes Betriebs-Bündel: 1 Read statt 6. Schreiben = frisch
// lesen → Feld ändern → ganzes Bündel schreiben (Last-Write-Wins bleibt,
// das Kollisionsfenster ist auf Millisekunden verengt).
//
// Beibehaltenes Prinzip "Lesen schreibt nie": Fehlt das Bündel, liefert
// load() die Defaults, OHNE zu persistieren — geschrieben wird erst beim
// ersten echten set(). (Die v0.29-Zusammensetzung aus Alt-Feld-Keys ist
// gestrichen — Ballast-Register: der Neubau startet mit leerem Speicher.)
//
// Pstate — persönliches Bündel je Rolle, Single-Writer, gleiche Prinzipien.

export class Bstate {
  static FIELDS = ["goals", "shelf", "agenda", "measurements", "momentLog", "qualitytime", "findings", "reveal", "revealLog"];
  static DEFAULTS = {
    goals: null,
    shelf: { items: [] },
    agenda: { items: [] },
    measurements: { items: [] },
    momentLog: { entries: [] },
    qualitytime: { resting: {}, choices: [] },
    findings: null,
    reveal: { A: null, B: null },
    revealLog: null,
  };

  constructor(repo) {
    this.repo = repo;
    this._inflight = null;
  }

  _defaults() { return JSON.parse(JSON.stringify(Bstate.DEFAULTS)); }

  async _doLoad(fresh) {
    const b = await this.repo.get("bstate", true, "betrieb", fresh ? { fresh: true } : undefined);
    if (b) {
      // fehlende Felder still mit Defaults auffüllen (migrationsfreundlich, ohne Write)
      const voll = this._defaults();
      for (const f of Bstate.FIELDS) if (b[f] !== undefined) voll[f] = b[f];
      // Metafelder (_schema, module) mittragen, damit set() sie nicht verliert
      for (const k of Object.keys(b)) if (!(k in voll)) voll[k] = b[k];
      return voll;
    }
    return this._defaults();   // KEIN Persistieren beim Lesen
  }

  async load(fresh) {
    if (fresh) return this._doLoad(true);
    if (this._inflight) return this._inflight;   // parallele Aufrufer teilen EINEN Flug
    this._inflight = this._doLoad(false);
    try { return await this._inflight; }
    finally { this._inflight = null; }
  }

  async get(field) {
    const b = await this.load();
    const v = b[field];
    return v === undefined ? this._defaults()[field] : v;
  }

  async set(field, val) {
    const b = await this.load(true);   // frisch lesen verengt das Kollisionsfenster
    b[field] = val;
    return this.repo.set("bstate", b, true, "betrieb");
  }
}

export class Pstate {
  constructor(repo) {
    this.repo = repo;
    this._inflight = {};
  }

  key(role) { return "pstate:" + role; }

  _defaults() { return { timeline: { entries: [] }, selfDisclosures: { items: [] } }; }

  async _doLoad(role) {
    const p = await this.repo.get(this.key(role), false, "betrieb");
    if (p) {
      const voll = this._defaults();
      for (const k of Object.keys(p)) voll[k] = p[k];
      return voll;
    }
    return this._defaults();   // KEIN Persistieren beim Lesen
  }

  async load(role) {
    if (this._inflight[role]) return this._inflight[role];
    this._inflight[role] = this._doLoad(role);
    try { return await this._inflight[role]; }
    finally { delete this._inflight[role]; }
  }

  async get(role, field) { return (await this.load(role))[field]; }

  async set(role, field, val) {
    const p = await this.load(role);
    p[field] = val;
    return this.repo.set(this.key(role), p, false, "betrieb");
  }
}

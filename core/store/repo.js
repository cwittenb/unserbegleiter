// Repo — die EINZIGE Stelle mit Storage-Key-Wissen (bewacht durch den
// Grep-Wächter in tests/unit/repo.spec.js).
//
// Key-Format: p:<NS>:<code>:<modulId>:<teil>
// Kein Legacy-Fallback mehr (Ballast-Register §1.1) — der Neubau startet mit
// EINEM Key-Schema; _schema-Stempel auf jedem Objekt hält die Tür für
// künftige Migrationen offen.
//
// Lese-Cache: kurzer TTL gegen wiederholte Roundtrips; eigene Writes
// aktualisieren ihn sofort (write-through); del invalidiert; Paar-Wechsel
// leert ihn komplett.

export const SCHEMA_VERSION = 1;

export class Repo {
  /**
   * @param {{store:object, ns:string, code:string, activeModuleId:string,
   *          cacheMs?:number, now?:()=>number}} cfg
   *   now ist injizierbar, damit Tests den TTL deterministisch prüfen können.
   */
  constructor({ store, ns, code, activeModuleId, cacheMs = 12000, now = Date.now }) {
    if (!store) throw new Error("Repo braucht einen Store");
    if (!ns || !code) throw new Error("Repo braucht ns und code");
    this.store = store;
    this.ns = ns;
    this.code = code;
    this.activeModuleId = activeModuleId || "betrieb";
    this.CACHE_MS = cacheMs;
    this._now = now;
    this._cache = new Map();
    this.lastError = null;
  }

  /** Paar-Wechsel: neuer Code, Cache komplett leeren (Invalidierungs-Regel). */
  setCode(code) {
    this.code = code;
    this.clearCache();
  }

  clearCache() { this._cache.clear(); }

  key(part, moduleId) {
    return `p:${this.ns}:${this.code}:${moduleId || this.activeModuleId}:${part}`;
  }

  _cput(k, shared, v) { this._cache.set(k + "|" + !!shared, { v, at: this._now() }); }
  _cget(k, shared) {
    const e = this._cache.get(k + "|" + !!shared);
    return e && this._now() - e.at < this.CACHE_MS ? e : null;
  }

  async get(part, shared, moduleId, opts) {
    const k = this.key(part, moduleId);
    if (!(opts && opts.fresh)) {
      const c = this._cget(k, shared);
      if (c) return c.v;
    }
    const v = await this.store.get(k, shared);
    this._cput(k, shared, v);
    return v;
  }

  async set(part, val, shared, moduleId) {
    const payload =
      val && typeof val === "object" && !Array.isArray(val)
        ? { ...val, _schema: SCHEMA_VERSION, module: moduleId || this.activeModuleId }
        : val;
    try {
      const k = this.key(part, moduleId);
      const ok = await this.store.set(k, payload, shared);
      if (!ok) { this.lastError = "Speichern abgelehnt"; return false; }
      this.lastError = null;
      this._cput(k, shared, payload);   // write-through
      return true;
    } catch (e) {
      this.lastError = e.message;
      return false;
    }
  }

  async del(part, shared, moduleId) {
    const k = this.key(part, moduleId);
    this._cache.delete(k + "|" + !!shared);
    try { await this.store.del(k, shared); } catch { /* idempotent */ }
  }
}

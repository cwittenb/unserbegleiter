// Store-Abstraktion — die einzige Schnittstelle des Kerns zur Speicherwelt.
//
// Vertrag (alle Methoden async):
//   get(key, shared)        → geparster Wert oder null
//   set(key, value, shared) → true/false (Wert wird serialisiert abgelegt)
//   del(key, shared)        → void (idempotent)
//   list(prefix, shared)    → string[] (Keys)
//
// "shared" trennt geteilten und persönlichen Namensraum. Implementierungen:
//   MemoryStore     — Tests & Ebene-1.5-Drehbücher (hier)
//   ArtifactStore   — window.storage-Wrapper (platforms/artifact)
//   KVStore         — Cloudflare-KV-Wrapper, SERVERSEITIG im Worker (platforms/cloudflare)
//
// Wichtig fürs Architekturbild: In der Cloudflare-Form lebt die gesamte
// Repo/Bstate/Pstate-Schicht im Worker — der Browser-Client dort spricht
// nur Entitäts-Endpunkte (S5), nie rohe Keys.

export class MemoryStore {
  constructor() {
    this._shared = new Map();
    this._priv = new Map();
    // Instrumentierung für Tests (Single-Flight, Schreib-Stürme):
    this.ops = { get: 0, set: 0, del: 0, list: 0 };
  }
  _m(shared) { return shared ? this._shared : this._priv; }
  async get(key, shared) {
    this.ops.get++;
    const raw = this._m(shared).get(key);
    return raw === undefined ? null : JSON.parse(raw);
  }
  async set(key, value, shared) {
    this.ops.set++;
    this._m(shared).set(key, JSON.stringify(value));
    return true;
  }
  async del(key, shared) {
    this.ops.del++;
    this._m(shared).delete(key);
  }
  async list(prefix, shared) {
    this.ops.list++;
    return [...this._m(shared).keys()].filter(k => k.startsWith(prefix || ""));
  }
}

/**
 * Fehlschlagender Store für Fehlerpfad-Tests: ab dem n-ten set() wird abgelehnt.
 */
export class StoernisStore extends MemoryStore {
  constructor({ rejectSetsFrom = Infinity } = {}) {
    super();
    this._rejectFrom = rejectSetsFrom;
  }
  async set(key, value, shared) {
    if (this.ops.set + 1 >= this._rejectFrom) { this.ops.set++; return false; }
    return super.set(key, value, shared);
  }
}

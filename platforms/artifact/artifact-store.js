// ArtifactStore — Store-Implementierung über window.storage (Artefakt-Sandbox).
// Der storage-Träger wird injiziert, damit die Klasse ohne Browser testbar ist.
// Bekannte Plattform-Grenze bleibt bestehen: shared:true teilt nur innerhalb
// einer Artefakt-Instanz — für die Solo-Entwicklungsumgebung akzeptiert.

export class ArtifactStore {
  /** @param {object} storage — window.storage-kompatibles Objekt */
  constructor(storage) {
    if (!storage) throw new Error("ArtifactStore braucht window.storage");
    this.storage = storage;
  }
  async get(key, shared) {
    try {
      const r = await this.storage.get(key, !!shared);
      return r ? JSON.parse(r.value) : null;
    } catch { return null; }   // nicht existenter Key wirft in der Sandbox
  }
  async set(key, value, shared) {
    try {
      const r = await this.storage.set(key, JSON.stringify(value), !!shared);
      return !!r;
    } catch { return false; }
  }
  async del(key, shared) {
    try { await this.storage.delete(key, !!shared); } catch { /* idempotent */ }
  }
  async list(prefix, shared) {
    try {
      const r = await this.storage.list(prefix || "", !!shared);
      return r && r.keys ? r.keys : [];
    } catch { return []; }
  }
}

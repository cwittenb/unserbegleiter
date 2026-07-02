// KVStore — Store-Implementierung über eine Cloudflare-KV-Bindung.
// Läuft SERVERSEITIG im Worker (S5): Der Browser-Client der Cloudflare-Form
// erhält nie rohe Keys, sondern nur Entitäts-Endpunkte hinter der Session.
// "shared" wird als Key-Präfix abgebildet (ein Namespace, zwei Welten) —
// die Zugriffskontrolle liegt NICHT hier, sondern in der Worker-API (S5).

export class KVStore {
  /** @param {KVNamespace} kv — z. B. env.PAARE */
  constructor(kv) {
    if (!kv) throw new Error("KVStore braucht eine KV-Bindung");
    this.kv = kv;
  }
  _k(key, shared) { return (shared ? "s/" : "p/") + key; }
  async get(key, shared) {
    const raw = await this.kv.get(this._k(key, shared));
    return raw === null ? null : JSON.parse(raw);
  }
  async set(key, value, shared) {
    await this.kv.put(this._k(key, shared), JSON.stringify(value));
    return true;
  }
  async del(key, shared) {
    await this.kv.delete(this._k(key, shared));
  }
  async list(prefix, shared) {
    const p = this._k(prefix || "", shared);
    const r = await this.kv.list({ prefix: p });
    return r.keys.map(k => k.name.slice(2));   // Präfix "s/"/"p/" wieder abstreifen
  }
}

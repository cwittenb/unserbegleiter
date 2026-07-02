// Engine — der Nachrichtenfluss über den drei Verträgen. DOM-frei, LLM injiziert.
//
// Vertrag 1 (Panel):  Marker in letzter Zeile → def.markers[mk](engine);
//                     Panel antwortet mit GENAU EINER User-Nachricht über
//                     submitToolResult (einziger Rückkanal).
// Vertrag 2 (Block):  Block gefunden → parse + Schema → handle; ungültig →
//                     GENAU EINE versteckte SYSTEM-KORREKTUR-Runde, danach
//                     Personen-Fehlermeldung (kein dritter Versuch).
// Vertrag 3 (Übergabe): freigebeUebergabe() in freigabe.js — einziger Pfad
//                     privat → geteilt.

import { findeMarker, pruefeMarkerOrder } from "../contracts/marker.js";
import { findeBlock, parseBlock, korrekturNachricht } from "../contracts/block.js";

export class Engine {
  /**
   * @param {{
   *   def: {sysPrompt:function, markerOrder:string[], markers:object,
   *          blocks:object[], canAct:function},
   *   chat: {messages:object[], status:string, blockFix?:boolean},
   *   llm: (system:string, messages:object[]) => Promise<{text:string, stop?:string}>,
   *   ctx?: object,
   *   hooks?: {onSave?:function, onPersonError?:function, onRender?:function}
   * }} cfg
   */
  constructor({ def, chat, llm, ctx = {}, hooks = {} }) {
    if (!def || typeof def.sysPrompt !== "function") throw new Error("Engine braucht eine SessionDef mit sysPrompt");
    const mo = pruefeMarkerOrder(def.markerOrder || []);
    if (mo.length) throw new Error("Ungültige markerOrder: " + mo.join("; "));
    for (const mk of def.markerOrder || [])
      if (typeof (def.markers || {})[mk] !== "function")
        throw new Error("Marker " + mk + " ohne registrierten Handler");
    this.def = def;
    this.chat = chat;
    this.chat.blockFix = !!chat.blockFix;
    this.llm = llm;
    this.ctx = ctx;
    this.hooks = hooks;
    this.busy = false;
  }

  _blocks() { return this.def.blocks || (this.def.block ? [this.def.block] : []); }

  async _save() { if (this.hooks.onSave) await this.hooks.onSave(this.chat); }
  _personError(msg) { if (this.hooks.onPersonError) this.hooks.onPersonError(msg); }

  /** Personen-Eingabe: genau eine User-Nachricht, dann Assistant-Runde. */
  async sendUser(text) {
    if (this.busy || !text || !text.trim()) return false;
    if (this.chat.status === "released" || this.chat.status === "finished") {
      this._personError("Diese Session ist abgeschlossen.");
      return false;
    }
    this.chat.messages.push({ role: "user", content: text.trim() });
    await this._save();
    await this.requestAssistant();
    return true;
  }

  /** Vertrag 1, Rückkanal: Panels antworten mit GENAU EINER User-Nachricht. */
  async submitToolResult(content, meta) {
    this.chat.messages.push(Object.assign({ role: "user", content }, meta || {}));
    await this._save();
    await this.requestAssistant();
  }

  async requestAssistant() {
    if (this.busy) return;
    this.busy = true;
    try {
      const { text, stop } = await this.llm(this.def.sysPrompt(this.ctx), this.chat.messages);
      this.chat.messages.push({ role: "assistant", content: text });
      this.chat.lastStop = stop || null;
      await this._save();
      if (this.hooks.onRender) this.hooks.onRender();
      await this._afterAssistant(text);
    } finally {
      this.busy = false;
    }
  }

  /** Dispatcher: Marker → Panel, sonst Block → Schema → Handler/Korrektur. */
  async _afterAssistant(text) {
    if (!this.def.canAct(this.chat)) return;

    const mk = findeMarker(text, this.def.markerOrder);
    if (mk) { this.def.markers[mk](this); return; }

    const f = findeBlock(text, this._blocks());
    if (!f) return;
    const { block, match } = f;
    if (!block.schema) { block.handle(match, this); return; }

    const r = parseBlock(block, match);
    if (r.ok) {
      this.chat.blockFix = false;
      await this._save();
      block.handle(r.data, this);
      return;
    }
    await this._blockCorrection(block, r.errors);
  }

  /** GENAU EINE automatische Korrektur-Runde (Vertrag 2). */
  async _blockCorrection(block, errors) {
    if (this.chat.blockFix) {
      this.chat.blockFix = false;
      await this._save();
      this._personError(
        "Der Block ist weiterhin ungültig (" + errors[0] +
        ") – bitte das System im Chat um eine Wiederholung bitten."
      );
      return;   // KEIN dritter Versuch
    }
    this.chat.blockFix = true;
    this.chat.messages.push({
      role: "user",
      hidden: true,
      content: korrekturNachricht(block, errors),
    });
    await this._save();
    // busy-Sperre für die Folge-Runde freigeben (wir sind noch im ersten Lauf)
    this.busy = false;
    await this.requestAssistant();
  }
}

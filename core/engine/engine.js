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
   *   llm: (system:string, messages:object[], onDelta?:function) => Promise<{text:string, stop?:string}>,
   *   ctx?: object,
   *   hooks?: {onSave?:function, onPersonError?:function, onRender?:function,
   *            onDelta?:function}   // onDelta(teilText) — kumulierter Stream
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
  /** Wiedereinstieg nach Reload: letzten Zug erneut dispatchen (Marker-Panels öffnen wieder; ein wartender User-Zug wird beantwortet). */
  async resume() {
    if (this.chat.status === "released" || this.chat.status === "finished") return;
    const last = this.chat.messages[this.chat.messages.length - 1];
    if (!last) return;
    if (last.role === "assistant") { await this._afterAssistant(last.content); return; }
    if (!this.busy) await this.requestAssistant();
  }

  async submitToolResult(content, meta) {
    this.chat.messages.push(Object.assign({ role: "user", content }, meta || {}));
    await this._save();
    await this.requestAssistant();
  }

  /* S105.1 · Antwort der APP auf einen Block — etwa der Wortlaut, den der
     RECALL-BLOCK angefordert hat.
     Sie entsteht im Block-Handler, und der laeuft NOCH im ersten Lauf: busy ist
     gesetzt, und requestAssistant() steigt an seiner eigenen Sperre wortlos aus.
     Genau das ist passiert — die Antwort landete im Verlauf, eine Modellrunde
     dazu gab es nie, und der Begleiter "bekam" den Wortlaut erst, wenn die
     Person von sich aus etwas tippte.
     Die beiden anderen Stellen, die eine Folgerunde brauchen (Revision und
     Blockkorrektur), geben die Sperre ausdruecklich frei. Hier fehlte das nur,
     weil onAbruf der einzige Handler ist, der ueberhaupt eine Runde braucht. */
  async antworteAufBlock(content, meta) {
    this.busy = false;
    await this.submitToolResult(content, meta);
  }

  async requestAssistant() {
    if (this.busy) return;
    this.busy = true;
    try {
      // Streaming: Deltas kumulieren und als wachsenden Teiltext an die UI
      // reichen (reine Anzeige — dispatcht wird erst der vollständige Text).
      let teil = "";
      const onDelta = this.hooks.onDelta
        ? (d) => { teil += d; this.hooks.onDelta(teil); }
        : undefined;
      // S70: onStatus ist der zweite Rückkanal (Auslastungs-Wiederholungen) —
      // rein informativ für die Warteanzeige, nie Teil des Antworttexts.
      /* S105.3 · Vorwaerts schaerfen. Die Session darf fuer GENAU DIESEN Zug
         einen Zusatzsatz an den Systemtext haengen — etwa wenn die Nachricht
         der Person Krisensignale traegt. Er geht nicht in den Verlauf und
         faellt mit der Runde weg; die naechste Runde entscheidet neu.
         Der Sinn: pruefen, BEVOR geantwortet wird. Danach laesst sich nichts
         mehr gutmachen, ohne etwas wegzunehmen — und das tun wir nicht mehr. */
      let system = this.def.sysPrompt(this.ctx);
      if (this.def.schaerfe) {
        const zusatz = this.def.schaerfe(this.chat.messages, this.ctx);
        if (zusatz) system += "\n\n" + zusatz;
      }
      const { text, stop } = await this.llm(system, this.chat.messages, onDelta, this.hooks.onStatus);
      this.chat.messages.push({ role: "assistant", content: text });
      this.chat.lastStop = stop || null;
      await this._save();
      if (this.hooks.onRender) this.hooks.onRender();
      await this._afterAssistant(text);
    } finally {
      this.busy = false;
    }
  }

  /** Dispatcher: Validator → Marker → Block → Schema → Handler/Korrektur. */
  async _afterAssistant(text) {
    if (!this.def.canAct(this.chat)) return;

    /* S105.3 · KEIN Text wird je zurueckgenommen.
       Bis hierher versteckte ein Wächtertreffer die beanstandete Antwort und
       liess sie neu schreiben (S72/S73). Von aussen sah das so aus, als naehme
       die Begleitung zurueck, was sie gerade gesagt hatte — ohne Erklaerung und
       ohne dass jemand wissen konnte, dass eine Maschine dazwischenging.
       Der Mechanismus half auch niemandem: Was gestreamt wurde, war gelesen.
       Das Verstecken raeumte das Protokoll auf, nicht die Erinnerung.
       Stattdessen PRUEFT der Waechter jetzt die HANDLUNG, nicht den Text: Wer
       eine Uebergabe (Block/Marke) falsch setzt, dessen Uebergabe wird
       verworfen — der Text bleibt stehen, das Gespraech laeuft weiter. Bei
       "fragen UND abschliessen in einer Nachricht" ist das genau das Gewollte:
       Die Frage steht, die Sitzung endet nicht, die Person kann antworten.
       Regeln, deren Verstoss im TEXT selbst liegt (Urteilsgrammatik,
       Speicher-Behauptung), tragen nur noch der Prompt — ein Stilfehler kostet
       weniger als eine sichtbare Ruecknahme. */
    const verweigert = this.def.pruefeUebergabe ? this.def.pruefeUebergabe(text, this) : null;
    if (verweigert) {
      // Nur vermerken, damit Oberflaeche und Tests es sehen koennen. Weder
      // Anzeige noch Verlauf werden angefasst.
      this.chat.letzteVerweigerung = verweigert;
      await this._save();
      return;                    // Marker und Block werden NICHT ausgefuehrt
    }
    if (this.chat.letzteVerweigerung) {
      this.chat.letzteVerweigerung = null;
      await this._save();
    }

    const mk = findeMarker(text, this.def.markerOrder);
    if (mk) { this.def.markers[mk](this); return; }

    const f = findeBlock(text, this._blocks());
    if (!f) return;
    const { block, match } = f;
    // S76 · Handler ABWARTEN und danach speichern: Handler ändern Chat-Zustand
    // (z. B. status "finished" beim MOMENT-BLOCK) — ohne das zweite Save ging
    // dieser Wechsel verloren, die Session blieb im Speicher "running" und
    // wurde beim Wiederbetreten erneut dispatcht (Doppel-Protokoll, kein
    // Neustart möglich).
    if (!block.schema) { await block.handle(match, this); await this._save(); return; }

    const r = parseBlock(block, match);
    if (r.ok) {
      this.chat.blockFix = false;
      await this._save();
      await block.handle(r.data, this);
      await this._save();
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

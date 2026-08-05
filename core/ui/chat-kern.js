// R4b · Der Chat-Kern: Verlauf zeichnen, Strom anzeigen, warten, senden.
//
// Die dichteste Gruppe des Tracks — und die einzige, bei der die Abhängigkeiten
// im KREIS laufen:
//
//     chat  ──braucht──▶  baueTafelKarte (panels), zeichneAuswahl (auswahl)
//     panels, auswahl  ──brauchen──▶  renderMsgs (chat)
//
// Das ist kein Versehen, sondern die Sache selbst: Der Verlauf zeichnet
// Panel-Karten und die Auswahlfläche, und beide stoßen ihrerseits ein
// Neuzeichnen an. Ein Ereigniskanal („Module melden Änderungen, der Chat
// lauscht") hätte den Kreis nicht aufgelöst, sondern nur unsichtbar gemacht —
// dieselbe Kopplung, schwerer zu verfolgen.
//
// Gewählt ist deshalb der ehrliche Weg: zweistufige Verdrahtung. Der Chat wird
// zuerst gebaut und gibt sein renderMsgs heraus; Panels und Auswahl entstehen
// damit; anschließend trägt `verbinde()` die Gegenrichtung nach. Der Kreis
// bleibt bestehen, aber er ist an EINER Stelle sichtbar — im
// Kompositionswurzelpunkt in app.js — statt über drei Module verteilt.

import { t, fuelle, fehlerText } from "../i18n/index.js";
import { esc, mdRender, IKON } from "./html.js";
import { schneideStreamText } from "./stream-anzeige.js";
import { cleanDisplay, findeBlock } from "../contracts/block.js";
import { findeMarker } from "../contracts/marker.js";
import { ALLE_BLOECKE } from "../contracts/registry.js";
import { K } from "../prompts/prompts.js";
import { bereiteRunde, formatiereMessrunde, formatiereVerlauf } from "./prozess.js";
import { istWireNachricht } from "../contracts/steuertoken.js";
import { WIRE_KOEPFE } from "../contracts/steuertoken.js";

const SCROLL_NAEHE_PX = 80;

/**
 * @param {object} ctx
 * @param {Document} ctx.doc
 * @param {(id:string)=>Element} ctx.$
 * @param {Function} ctx.el
 * @param {object} ctx.state
 * @param {object} ctx.backend
 * @param {(msg:string)=>void} ctx.err
 * @param {(msg:string)=>void} ctx.hint
 * @param {Function} ctx.aktualisiereBusy
 */
export function macheChatKern({ doc, $, el, state, backend, err, hint, aktualisiereBusy, hooks }) {
  /* Gegenrichtung des Kreises — wird nach dem Bau von panels/auswahl
     nachgetragen (siehe verbinde()). Bis dahin zeichnen sie nichts. */
  let baueTafelKarte = () => null;
  let zeichneAuswahl = () => false;

  /** Skalenfrage? Dann Schnellantwort-Slider zeigen (freies Tippen bleibt möglich). */
  function aktualisiereSkala() {
    const boxS = $("pbSkala");
    if (!boxS) return;
    const msgs = state.engine ? state.engine.chat.messages.filter(m => !m.hidden) : [];
    const letzte = msgs.length ? msgs[msgs.length - 1] : null;
    // S74 · Die Leiste ist eine Text-Heuristik — sie schweigt, wenn der letzte
    // Zug eine Marke oder einen Block trägt (dann antwortet ein Panel, etwa
    // die verdeckten Startwerte bei [[BASELINE]]) oder ein Panel bereits offen
    // ist; sonst standen zwei Regler übereinander. Erkennt de- und en-Wortlaut.
    const def = state.engine ? state.engine.def : null;
    const zugFrei = !!letzte && !findeMarker(letzte.content || "", (def && def.markerOrder) || []) &&
      !findeBlock(letzte.content || "", (def && (def.blocks || (def.block ? [def.block] : []))) || []);
    const panelOffen = ["kwPanel", "gatePanel"].some(id => {
      const p = $(id); return p && !p.classList.contains("pb-hidden");
    });
    const skala = !state.warten && letzte && letzte.role === "assistant" && zugFrei && !panelOffen &&
      /[Ss]kala von 1 bis 10|scale (?:of|from) 1 (?:to|through) 10/.test(letzte.content);
    boxS.classList.toggle("offen", !!skala);
  }

  /* Streaming-sichere Anzeige eines UNVOLLSTÄNDIGEN Assistant-Textes:
     fertige Marker/Blöcke entfernt cleanDisplay; ANGEFANGENE Protokoll-
     Artefakte (Block ohne Ende, "[["-Marker, angerissenes Start-Token am
     Textende) werden abgeschnitten, damit während des Stroms nie rohe
     Protokollzeichen sichtbar werden (S34-Lehre, auf Teiltexte übertragen). */
  /* R4a: Der Rumpf liegt jetzt als reine Funktion in stream-anzeige.js —
     hier bleibt nur die Bindung an den Zustand der laufenden Session. */
  function streamAnzeige(roh) {
    return schneideStreamText(roh, (state.engine && state.engine.def && state.engine.def.markerOrder) || []);
  }

  /* S105.6 · Die Stream-Blase trägt das Sprecherlabel VON ANFANG AN.
     Vorher entstand sie als nacktes .pb-msg.ai; das Label "Begleitung" kam erst
     beim Voll-Render nach der fertigen Antwort — und schob dann alles darunter
     um seine Höhe nach unten. Der Schirm ruckelte genau in dem Moment, in dem
     man zu Ende las.
     Die Entscheidung, OB ein Label fällt, muss dieselbe sein wie in renderMsgs
     (D4: nur beim Rollenwechsel) — sonst wandert das Ruckeln bloß in den Fall,
     wo zwei Begleitungs-Nachrichten aufeinanderfolgen. */
  function letzteSichtbareRolle() {
    const msgs = (state.engine && state.engine.chat && state.engine.chat.messages) || [];
    for (let i = msgs.length - 1; i >= 0; i--) {
      const m = msgs[i];
      if (m.echo) continue;                          // Echo-Zeilen führen keine Rolle (wie renderMsgs)
      if (m.hidden || istWireNachricht(m)) continue;
      return m.role;
    }
    return null;
  }

  /* S114.6 · Das Label faellt an DREI Orten: beim Voll-Render, an der
     Stream-Blase und an der Warte-Blase. Bis S114 kannte nur der Voll-Render
     und die Stream-Blase die Regel; die Warte-Blase (state.warten in
     renderMsgs) entstand nackt. Ergebnis: waehrend des Ladens stand kein
     Label, beim ersten Token kam es dazu — und schob den Text um seine Hoehe
     nach unten, genau beim Lesen. Die Regel steht jetzt EINMAL. */
  function haengeAnSprechgruppe(box, d, mitLabel) {
    if (!mitLabel) { box.appendChild(d); return d; }
    const gruppe = el("div", "rz-sprechgruppe");
    const lbl = el("div", "rz-sprecher");
    lbl.textContent = t("chat.begleitung");
    gruppe.appendChild(lbl);
    gruppe.appendChild(d);
    box.appendChild(gruppe);
    return d;
  }

  /** Erzeugt die Stream-Blase samt Sprechgruppe, falls nötig. */
  function baueStreamBlase(box) {
    let d = box.querySelector("#pbStream");
    if (d) return d;
    d = el("div", "pb-msg ai");
    d.id = "pbStream";
    return haengeAnSprechgruppe(box, d, letzteSichtbareRolle() !== "assistant");
  }

  /** Live-Update der Stream-Blase — gezielt, ohne Voll-Rerender je Delta. */
  function zeigeStream(teil) {
    state.streamText = teil;
    const box = $("pbMsgs");
    if (!box) return;
    const nah = nahAmEingabefeld();   // VOR der DOM-Änderung messen (S62)
    const d = baueStreamBlase(box);
    const anzeige = streamAnzeige(teil);
    d.innerHTML = anzeige
      ? mdRender(anzeige)
      : '<span class="pb-typing" aria-label="' + t("chat.tippt") + '"><span></span><span></span><span></span></span>';
    if (nah) scrolleZumEingabefeld();
  }

  /** S70 · Auslastungs-Wiederholung: ruhige, ZAHLENLOSE Warteanzeige in der
   *  Tipp-Blase. Retries laufen vor dem ersten Token — eine bereits laufende
   *  Stream-Anzeige wird deshalb nie überschrieben.
   *  ST2 · Derselbe Kanal trägt die Struktur-Ereignisse der Entwicklungs-
   *  umgebung (keyless, K2-Entscheid): struktur_korrektur läuft VOR der
   *  Nachforderungs-Runde (Warteanzeige richtig), struktur_rettung unmittelbar
   *  nach dem Empfang (kurzer Hinweis, die echte Nachricht folgt sofort).
   *  In direct/proxy ist die Struktur erzwungen — dort feuern beide nie. */
  function zeigeAusgelastet(art) {
    const TEXTE = {
      overloaded_retry: "chat.ausgelastetWarte",
      struktur_korrektur: "chat.strukturKorrektur",
      struktur_rettung: "chat.strukturRettung",
    };
    if (!TEXTE[art] || state.streamText) return;
    const box = $("pbMsgs");
    if (!box) return;
    const d = baueStreamBlase(box);   // S105.6: auch hier mit Label
    d.innerHTML = '<span class="pb-typing" aria-label="' + t("chat.tippt") + '"><span></span><span></span><span></span></span>' +
      '<span class="pb-sub rz-block-oben-1">' + t(TEXTE[art]) + '</span>';
  }

  /* S62 · Scroll-Disziplin (löst den harten S53-Sprung ans Seitenende ab):
     Ziel ist das EINGABEFELD (Composer), nie document.scrollHeight — Footer
     oder Dev-Panel unterhalb bleiben außerhalb der Sicht-Verankerung. Sticky
     nur, wenn die Sicht bereits nahe am Eingabefeld ist: Scrollt die Person
     hoch, stoppt das Mitlaufen von selbst (kein Listener nötig — die Nähe
     wird VOR jeder DOM-Änderung live gemessen); Rückkehr ans Ende oder das
     eigene Senden nimmt es wieder auf. Guarded: happy-dom/Umgebungen ohne
     scrollTo bleiben still (Nullmaße melden dort immer "nah"). */
  /* U10.4 (F3a) · Seit der Chat einen EIGENEN Rollbereich hat, misst die
     Disziplin nicht mehr am Fenster. Das Eingabefeld steht jetzt immer —
     "nah am Composer" hatte damit keine Bedeutung mehr, weil die Antwort
     stets ja gewesen waere. Gemessen wird jetzt die Naehe zum ENDE des
     Verlaufs: Scrollt die Person hoch, stoppt das Mitlaufen von selbst;
     Rueckkehr ans Ende oder das eigene Senden nimmt es wieder auf. Der
     Gedanke aus S62 bleibt, nur sein Bezugspunkt wandert. */
  const SCROLL_NAEHE_PX = 80;
  function roller() {
    const box = $("pbMsgs");
    return (box && typeof box.closest === "function" && box.closest(".rz-chat-oben")) || null;
  }
  function nahAmEingabefeld() {
    const r = roller();
    if (!r) return true;
    // Nullmasse (happy-dom, noch nicht gelayoutet) melden "nah" — still statt
    // springend, dieselbe Vorsicht wie in S62.
    return (r.scrollHeight - r.scrollTop - r.clientHeight) <= SCROLL_NAEHE_PX;
  }
  /* Ans Ende des Verlaufs, nicht ans Ende des Dokuments. */
  function scrolleZumEingabefeld() {
    const r = roller();
    if (r) r.scrollTop = r.scrollHeight;
  }

  function renderMsgs(scrollErzwingen = false) {
    const nah = scrollErzwingen || nahAmEingabefeld();   // Nähe VOR der DOM-Änderung messen
    state.streamText = null;   // Voll-Rerender ersetzt jede laufende Stream-Blase
    const box = $("pbMsgs");
    if (!box) return;   // S87: leere Hülle (kein Chat aufgebaut) — folgenlos
    // S96.2 · Im Auswahl-Modus übernimmt der Verlauf selbst die Fläche.
    if (zeichneAuswahl(box)) { const r = roller(); if (r) r.scrollTop = 0; return; }   // R4b: Phasen kennt nur das Modul
    box.innerHTML = "";
    if (state.engine) {
      const msgs = state.engine.chat.messages;
      const juengste = msgs[msgs.length - 1];
      let ersteTafel = true;   // Intro-Text nur an der ersten Tafel des Verlaufs
      let letzteRolle = null;  // D4: Sprecherlabel nur beim Rollenwechsel
      for (const m of msgs) {
        // S44 · Panel-Echo: geschlossene Regler/Slider hinterlassen eine
        // kompakte Zusammenfassungszeile im Verlauf (statt spurlos zu verschwinden).
        if (m.echo) {
          const e2 = el("div", "pb-echo rz-echo");   // T2j: Aussehen lebt in design.js
          e2.textContent = m.echo;
          box.appendChild(e2);
          continue;
        }
        if (m.hidden || istWireNachricht(m)) continue;   // S41: Wächter auch für Alt-Sessions
        // D4 · Kein Blasen-Layout mehr: die Begleitung traegt bei jedem
        // Rollenwechsel ein leises Caps-Label (Design 17e), Nutzertext steht
        // rechtsbuendig in Sans — beides via CSS, hier nur das Label.
        // T2g · Label und die zugehoerige Antwort stehen in EINEM Behaelter,
        // statt ueber einen negativen Rand gegen den Listen-Gap zu rechnen.
        let gruppe = null;
        if (m.role === "assistant" && letzteRolle !== "assistant") {
          gruppe = el("div", "rz-sprechgruppe");
          const lbl = el("div", "rz-sprecher");
          lbl.textContent = t("chat.begleitung");
          gruppe.appendChild(lbl);
          box.appendChild(gruppe);
        }
        letzteRolle = m.role;
        const d = el("div", "pb-msg " + (m.role === "assistant" ? "ai" : "me"));
        const mkListe = (state.engine && state.engine.def && state.engine.def.markerOrder) || [];
        /* ST2 · Struktur-Zug: Der Block lebt als Meta an der Nachricht, nicht
           im Text — die sichtbare Quittung (Platzhalter der Registry, z. B.
           "Dein Zeitleisten-Eintrag wurde gespeichert.") muss deshalb HIER
           angefügt werden; in der Text-Ära tat das cleanDisplay beim Ersetzen
           des Block-Rohtexts. Unsichtbare Blöcke (leerer Platzhalter) bleiben
           unsichtbar. cleanDisplay läuft weiter — Alt-Verläufe tragen den
           Block noch im Text. */
        let anzeige = cleanDisplay(m.content, mkListe, ALLE_BLOECKE);
        if (m.role === "assistant" && m.block && m.block.typ) {
          const bd = ALLE_BLOECKE.find(b => b.dataset === m.block.typ);
          if (bd && bd.placeholder) anzeige = (anzeige ? anzeige + "\n\n" : "") + bd.placeholder;
        }
        if (m.role === "assistant") d.innerHTML = mdRender(anzeige);
        else d.textContent = anzeige;
        (gruppe || box).appendChild(d);
        // S62 · Aufdeck-Tafel als Karte im Verlauf, direkt unter der
        // auslösenden Nachricht; der Weiter-Knopf nur an der jüngsten.
        if (m.role === "assistant" && m.tafel) {
          box.appendChild(baueTafelKarte(m.tafel, m === juengste && !state.warten, ersteTafel));
          ersteTafel = false;
        }
      }
    }
    if (state.warten) {
      // S114.6 · Dieselbe Label-Entscheidung wie oben — die Warte-Blase traegt
      // das Label VON ANFANG AN, sonst springt der Text beim ersten Token.
      // letzteRolle ist hier der Stand nach der Schleife: die Rolle der
      // letzten sichtbaren Nachricht.
      const d = el("div", "pb-msg ai");
      d.id = "pbStream";
      d.innerHTML = '<span class="pb-typing" aria-label="' + t("chat.tippt") + '"><span></span><span></span><span></span></span>';
      haengeAnSprechgruppe(box, d, letzteSichtbareRolle() !== "assistant");
    }
    if (nah) scrolleZumEingabefeld();
    aktualisiereSkala();
    aktualisiereComposer();
  }

  // S74 · Ist die Session abgeschlossen (Befund gespeichert), tritt der
  // "Raum verlassen"-Knopf an die Stelle des Composers: nichts Eintippbares
  // kann mehr im Nirwana verschwinden (die Engine nähme es ohnehin nicht an,
  // und die Fehlzeile stand außer Sicht am Seitenanfang). Der NACHKLANG der
  // Auftragsklärung bleibt unberührt — er heilt seinen Status auf "running".
  function aktualisiereComposer() {
    const c = $("pbComposer");
    if (!c) return;
    const fertig = !!(state.engine && state.engine.chat && state.engine.chat.status !== "running");
    c.classList.toggle("pb-hidden", fertig);
    // S93 · Das Versprechen des S74-Kommentars endlich einlösen: An die Stelle
    // des Composers TRITT der Ausgang. Er hängt am Chat-Zustand, nicht am Raum
    // — damit gilt er für alle vier Sessions (Reflexionsgespräch, Qualitätszeit,
    // Auftragsklärung, Gemeinsame Auflösung) ohne Sonderfall je Raum.
    const v = $("btnRaumVerlassen");
    if (v) v.classList.toggle("pb-hidden", !fertig);
  }

  /* S105.2 · Wie viele Wartevorgänge laufen gerade. Ein Zähler statt eines
     Schalters, weil sie sich schachteln (der Wortlaut-Abruf läuft INNERHALB des
     Zuges, der ihn ausgelöst hat) und weil ein Nachzügler sonst das Warten
     eines längst neuen Raumes abschaltete. */
  let wartende = 0;

  /* S105.5 · Das Warten sperrt auch den Abschluss-Knopf. Es genuegt NICHT, ihn
     beim Setzen zu sperren: Wer nur setzt, sperrt fuer immer — die Freigabe
     muss aus derselben Stelle kommen. Der Haken wird von aussen gereicht
     (app.js kennt den Knopf, dieses Modul nicht). */
  function setzeWarten(v) {
    state.warten = v;
    aktualisiereBusy();
    if (hooks && hooks.onWarten) hooks.onWarten(v);
  }

  /* S36 · EIN Wartepfad für alle ausstehenden Modell-Antworten: Tipp-Blase
     an, Senden gesperrt, dann Antwort. Panels (Regler, Skala, Gate, Kapitel,
     Freigabe …) laufen hierüber — fehlender Ladezustand nach Panel-Submits
     war ein globales Problem, das hier zentral gelöst ist. */
  /** S70 · Auslastung erkennen: stabiler Code (Proxy-Grenze) ODER nackter
   *  HTTP-Status aus Altpfaden — beide bekommen dieselbe freundliche Meldung. */
  /* R0: 429 allein reicht nicht mehr — der Kontingent-Waechter antwortet
     ebenfalls mit 429, und bei ihm waere „Erneut senden" der FALSCHE Rat:
     die Wiederholung laeuft ins Ratenlimit bzw. in den Duplikat-Waechter. */
  const istUeberlastet = e => !!e &&
    (e.code === "llm_overloaded" || ((e.status === 503 || e.status === 529) && !e.code));

  /** S70 · „Erneut senden": der gescheiterte Zug liegt vollständig im Verlauf
   *  (die User-Nachricht ist gespeichert) — resume() beantwortet den offenen
   *  Zug, ohne dass die Person ihren Text neu tippen muss. */
  function zeigeErneutSenden() {
    const b = $("pbErr");
    if (!b || !state.engine) return;
    const k = el("button", "pb-btn");
    k.id = "btnErneutSenden";
    k.textContent = t("chat.erneutSenden");
    k.addEventListener("click", () => { err(""); warteAntwort(() => state.engine.resume(), true); });
    b.appendChild(k);
  }

  async function warteAntwort(lauf, scrollErzwingen = false) {
    const gen = state.chatGen;   // S87 · Nachzügler-Zaun: nach einem Raumwechsel keine UI-Wirkung mehr
    wartende++;                  // S105.2 · Wartevorgänge schachteln sich (z. B. Wortlaut-Abruf im Zug)
    setzeWarten(true);
    // S70: jeder NEUE Wartevorgang macht ein offenes Retry-Angebot ungültig —
    // ein stehengebliebener Knopf dürfte später keinen falschen resume() feuern.
    const altKnopf = $("btnErneutSenden");
    if (altKnopf) altKnopf.remove();
    const bs = $("btnSend");
    if (bs) bs.disabled = true;
    renderMsgs(scrollErzwingen);
    try { await (typeof lauf === "function" ? lauf() : lauf); }
    catch (e) {
      if (gen !== state.chatGen) { /* alte Session: Fehler nicht in den neuen Raum tragen */ }
      /* R0: Frueher lief NUR der Auslastungsfall ueber fehlerText — jeder
         andere Fehler zeigte e.message roh, also den serverseitigen deutschen
         Klartext, unuebersetzt. fehlerText faellt selbst auf e.message
         zurueck; der zentrale Weg ist damit ausnahmslos der richtige. */
      else { err(fehlerText(e)); if (istUeberlastet(e)) zeigeErneutSenden(); }   // S70/R0
    }
    finally {
      /* S87: Ein Nachzügler darf die NEUE Session nicht aus dem Warten kippen
         oder ihren Verlauf neu rendern.
         S105.2 · Der Generations-Zaun war dafür das falsche Werkzeug. Er galt
         auch fürs Aufräumen — wechselte die Generation während eines
         Wartevorgangs, übersprang das finally ALLES, und `state.warten` blieb
         dauerhaft stehen; nichts anderes setzt es zurück.
         Umgekehrt darf ein Nachzügler den Ladezustand eines inzwischen
         gestarteten Wartens nicht abschalten — der S87-Fall ist echt.
         Beides zusammen heißt: Es geht nicht um die Generation, sondern darum,
         ob NOCH JEMAND wartet. Also zählen statt zäunen — dieselbe Bauweise wie
         beim Zähler der laufenden Backend-Aufrufe. */
      wartende = Math.max(0, wartende - 1);
      setzeWarten(wartende > 0);
      if (bs && !wartende) bs.disabled = false;
      if (gen === state.chatGen) renderMsgs();
    }
  }

  /* S89b · Nachzügler-Einspeisung (Lazy-Check, kein Polling): Wird die
     Messrunde erst WÄHREND der laufenden Qualitätszeit fertig (Abgabe auf dem
     eigenen Handy des Partners), reicht die App sie EINMAL als versteckten
     Nachtrag nach — vor der nächsten Nutzernachricht, als eigener User-Zug
     (das Muster zweier aufeinanderfolgender User-Nachrichten fährt der
     Sessionstart seit jeher: Kontext + Steuertext). Ein KV-Read pro Zug,
     nur solange nichts eingespeist ist; chat.messrundeId ist der Duplikat-
     Schutz UND der Anker für [[META-REVEALED]]. Fehlertolerant — die Session
     darf am Nachtrag nie scheitern. */
  async function pruefeMessNachtrag() {
    const e = state.engine;
    if (state.chatId !== "moment" || !e || !e.chat || e.chat.status !== "running" || e.chat.messrundeId) return;
    try {
      const mr = await backend.bstate.get("measurements");
      const runde = bereiteRunde(mr);
      if (!runde) return;
      e.chat.messrundeId = runde.id;
      const verlauf = formatiereVerlauf(mr, state.info.nameA, state.info.nameB);   // S92: identisch zum Startkontext
      e.chat.messages.push({ role: "user", hidden: true,
        content: K().korpusTexte["mk.prozessNachtrag"] + "\n" + formatiereMessrunde(runde, state.info.nameA, state.info.nameB)
          + (verlauf ? "\n" + verlauf : "") });
      await e._save();
    } catch { /* Nachtrag ist Komfort, kein Muss */ }
  }

  /** Zentraler Sendeweg: User-Text SOFORT zeigen, Ladezustand, dann Antwort. */
  async function sende(text) {
    if (!text || !state.engine || state.warten) return;
    await pruefeMessNachtrag();                   // S89b: Nachzügler VOR der Nutzernachricht
    const laeuft = state.engine.sendUser(text);   // pusht die Nachricht synchron …
    await warteAntwort(async () => {              // … die Blase zeigt sie sofort
      await laeuft;
      hint(backend.llm && backend.llm.kontingent ? backend.llm.kontingent.hinweis : null);
    }, true);                                     // eigenes Senden nimmt das Mitlaufen wieder auf (S62)
  }
  /** Zweite Stufe der Verdrahtung: die Gegenrichtung des Kreises nachtragen.
   *  MUSS vor dem ersten Rendern gerufen werden — app.js tut das unmittelbar
   *  nach dem Bau von panels und auswahl. */
  function verbinde(teile) {
    if (teile.baueTafelKarte) baueTafelKarte = teile.baueTafelKarte;
    if (teile.zeichneAuswahl) zeichneAuswahl = teile.zeichneAuswahl;
  }

  return { aktualisiereSkala, streamAnzeige, zeigeStream, zeigeAusgelastet,
           nahAmEingabefeld, scrolleZumEingabefeld, renderMsgs, aktualisiereComposer,
           setzeWarten, zeigeErneutSenden, warteAntwort, sende, verbinde };
}

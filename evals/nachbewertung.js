// S144a · Nachbewertung — gespeicherte Transkripte mit einem ANDEREN Judge neu
// richten und Urteil für Urteil gegen das alte stellen.
//
// Zweck: Ein Judge-Wechsel ist ein Wechsel des Messinstruments. Bevor ein neuer
// Judge neue Kandidaten bewertet, muss er auf DENSELBEN Transkripten zu
// denselben Urteilen kommen wie der alte — sonst ist bei einem besseren Ergebnis
// nicht zu sagen, ob das Modell besser oder der Judge milder ist.
//
// Reine Funktionen über Berichte und Urteile; das Skript
// (scripts/judge-nachbewertung.js) erledigt Netz, Datei und Ausgabe.

/**
 * Fälle aus gespeicherten Berichten sammeln.
 * @param {{datei:string, bericht:object}[]} berichte
 * @param {object[]} katalog  aktuelle Szenario-Definitionen (DE + EN)
 * @param {{referenzModell?:string, promptVersion?:string}} opt
 *        referenzModell — nur Berichte dieses Judges (Default: alle)
 *        promptVersion  — nur Berichte mit dieser Judge-Prompt-Version (Default: alle)
 * @returns {{faelle:object[], uebersprungen:object[], promptVersionen:string[]}}
 *
 * Übersprungen wird, was keinen fairen Vergleich erlaubt:
 *   judge      — Bericht stammt von einem anderen Judge als der Referenz
 *   prompt     — Bericht wurde mit einem anderen Judge-Prompt gerichtet
 *                (sonst misst der Abgleich Prompt UND Modell zugleich)
 *   unbekannt  — Szenario steht nicht mehr im Katalog
 *   version    — Szenario-Version weicht ab (geänderte Prüffragen ≠ derselbe Maßstab)
 *   format     — Altformat ohne Check-Liste am Sample
 *   unbewertet — das alte Sample hatte kein Urteil (technische Anomalie)
 */
export function sammleFaelle(berichte, katalog, opt = {}) {
  const jeId = new Map(katalog.map(s => [s.id, s]));
  const faelle = [], uebersprungen = [];
  const versionen = new Set();
  for (const { datei, bericht } of berichte) {
    const stand = bericht.stand || {};
    if (opt.referenzModell && stand.judgeModell !== opt.referenzModell) {
      uebersprungen.push({ datei, szenario: "*", grund: "judge", detail: stand.judgeModell || "?" });
      continue;
    }
    if (opt.promptVersion && stand.judgePromptVersion !== opt.promptVersion) {
      uebersprungen.push({ datei, szenario: "*", grund: "prompt", detail: stand.judgePromptVersion || "?" });
      continue;
    }
    if (stand.judgePromptVersion) versionen.add(stand.judgePromptVersion);
    for (const s of bericht.szenarien || []) {
      const def = jeId.get(s.id);
      if (!def) { uebersprungen.push({ datei, szenario: s.id, grund: "unbekannt" }); continue; }
      if (def.version !== s.version) {
        uebersprungen.push({ datei, szenario: s.id, grund: "version", detail: "v" + s.version + " → v" + def.version });
        continue;
      }
      for (const sm of s.samples || []) {
        if (sm.unbewertet) {
          uebersprungen.push({ datei, szenario: s.id, nr: sm.nr, grund: "unbewertet" });
          continue;
        }
        if (!Array.isArray(sm.checks) || !sm.checks.length) {
          uebersprungen.push({ datei, szenario: s.id, nr: sm.nr, grund: "format" });
          continue;
        }
        const alt = {};
        for (const c of sm.checks) alt[c.id] = { antwort: c.antwort, beleg: c.beleg };
        faelle.push({
          datei, szenario: def, nr: sm.nr, transkript: sm.transkript, alt,
          pipelineModell: stand.pipelineModell || null, coreHash: stand.coreHash || null,
        });
      }
    }
  }
  return { faelle, uebersprungen, promptVersionen: [...versionen].sort() };
}

/**
 * Ein Fall gegen das neue Urteil stellen — eine Zeile je Check.
 * Kein neues Urteil (Formfehler, Transport) → EINE Zeile mit unbewertet:true;
 * sie zählt weder als gleich noch als abweichend (unbewertet ≠ bestanden).
 */
export function vergleiche(fall, urteilNeu) {
  const kopf = {
    datei: fall.datei, szenario: fall.szenario.id, nr: fall.nr,
    pipelineModell: fall.pipelineModell,
  };
  if (!urteilNeu || !urteilNeu.bewertet)
    return [{ ...kopf, check: "*", unbewertet: true, fehler: (urteilNeu && urteilNeu.fehler) || "kein Urteil" }];
  return fall.szenario.checks.map(c => {
    const verletztWenn = c.verletztWenn || "ja";
    const alt = fall.alt[c.id] || {};
    const neu = urteilNeu.antworten[c.id] || {};
    return {
      ...kopf, check: c.id, roteLinie: !!c.roteLinie,
      alt: alt.antwort ?? null, neu: neu.antwort ?? null,
      verletztAlt: alt.antwort === verletztWenn,
      verletztNeu: neu.antwort === verletztWenn,
      abweichung: alt.antwort !== neu.antwort,
      belegAlt: alt.beleg || "", belegNeu: neu.beleg || "",
    };
  });
}

/**
 * Zusammenfassung über alle Zeilen. Richtung zählt mehr als Quote:
 *   strenger — neu verletzt, alt nicht
 *   milder   — alt verletzt, neu nicht
 * Eine Häufung in EINE Richtung bei einer Check-Klasse ist der Befund, der den
 * Judge-Wechsel stoppt — vereinzelte, beidseitige Abweichungen sind Streuung.
 */
export function fasseZusammen(zeilen) {
  const leer = () => ({ gesamt: 0, gleich: 0, abweichend: 0, strenger: 0, milder: 0 });
  const summe = { ...leer(), unbewertet: 0 };
  const jeCheck = {};
  for (const z of zeilen) {
    if (z.unbewertet) { summe.unbewertet++; continue; }
    const k = z.szenario + "/" + z.check;
    const e = (jeCheck[k] ||= leer());
    for (const t of [summe, e]) {
      t.gesamt++;
      if (z.abweichung) {
        t.abweichend++;
        if (!z.verletztAlt && z.verletztNeu) t.strenger++;
        if (z.verletztAlt && !z.verletztNeu) t.milder++;
      } else t.gleich++;
    }
  }
  summe.quote = summe.gesamt ? summe.gleich / summe.gesamt : null;
  return { ...summe, jeCheck };
}

/**
 * Einseitige Häufung je Check: mindestens `min` Abweichungen und alle in
 * dieselbe Richtung. Das ist das Stoppsignal aus dem Sprintplan.
 */
export function einseitigeChecks(zusammenfassung, min = 3) {
  const aus = [];
  for (const [k, e] of Object.entries(zusammenfassung.jeCheck)) {
    if (e.abweichend < min) continue;
    if (e.strenger === e.abweichend) aus.push({ check: k, richtung: "strenger", anzahl: e.abweichend, von: e.gesamt });
    else if (e.milder === e.abweichend) aus.push({ check: k, richtung: "milder", anzahl: e.abweichend, von: e.gesamt });
  }
  return aus;
}

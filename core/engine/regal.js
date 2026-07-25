// S95.3 · Regal-Kern: Karenz und rollenbewusste Redaktion.
//
// Reine Funktionen, von BEIDEN Seiten benutzt — der Worker ruft sie mit voller
// Sicht beim Lesen und Schreiben, die App auf Plattformen ohne Server direkt.
// Eine Quelle der Wahrheit, wie bei den Messungen (S91/I12).
//
// KARENZ (Designnotiz D5, erweitert in S95.3b): JEDE Querung wird erst nach
// 30 Minuten sichtbar - Selbstmitteilung wie Ausschnitt, Regal wie Agenda.
//
// Der frueher gemachte Unterschied (nur Ausschnitte) war ein Fehlgriff: Die
// Regel "gegebenes Ja zaehlt sofort" verbietet, NOCH EINMAL ZU FRAGEN - die
// Karenz fragt nichts. Sie ist still, verlangt keine Handlung, und wer nichts
// tut, dessen Ja steht. Asymmetrische Ruecknehmbarkeit waere ausserdem eine
// Falle: Wer sie beim einen Artefakt gelernt hat, nimmt sie beim anderen an. Das Vorbild ist der Gmail-Undo — und der zieht nichts
// zurück, er stellt VERZÖGERT ZU: Die Nachricht liegt während des Fensters
// beim Dienst, nicht beim Empfänger. Genau deshalb darf dort „rückgängig"
// stehen, ohne zu lügen. Läge der Text währenddessen schon beim Partner und
// würde dort nur ausgeblendet, wäre „noch zurückziehbar" eine Zusage, die die
// Mechanik nicht deckt.
//
// Anders als bei E-Mail kostet die Verzögerung hier nichts: Das Regal ist Pull,
// ohne Status und ohne Erwartung — „nie gelesen" ist ein legitimer Ausgang.
// Gmail deckelt bei 30 Sekunden, weil jemand wartet; hier wartet niemand.
//
// I11 (Status-Versiegelung): Ein Item in Karenz ist für die andere Rolle nicht
// „ausgegraut" oder „gesperrt", sondern SCHLICHT NICHT DA. Ein sichtbarer
// Platzhalter wäre eine Ankündigung („gleich kommt etwas") und damit genau der
// Sende-Status, den es nicht geben darf.

export const KARENZ_MS = 30 * 60 * 1000;

/* S95.3b - Das Wege-Menue ist konstant je Artefakt-Art. "selbst" (Generalprobe)
   entfaellt beim Ausschnitt: Man probt keinen Dialog, den man bereits gefuehrt
   hat. Sonst gilt fuer beide dasselbe. */
export const WEGE_NACHRICHT = ["selbst", "shelf", "moment"];
export const WEGE_AUSSCHNITT = ["shelf", "moment"];
export const WEGE_FUER = kind => (kind === "excerpt" ? WEGE_AUSSCHNITT : WEGE_NACHRICHT);

const zeit = w => (w ? Date.parse(w) || 0 : 0);

/** Ende der Karenz für ein neu abgelegtes Item. */
export function karenzBis(jetzt = Date.now()) {
  return new Date(jetzt + KARENZ_MS).toISOString();
}

/** Läuft für dieses Item noch die Karenz? (unabhängig von der Rolle) */
export function inKarenz(item, jetzt = Date.now()) {
  return !!(item && item.visibleFrom) && zeit(item.visibleFrom) > jetzt;
}

/**
 * Ist das Item für diese Rolle verborgen?
 * Verborgen ist es nur für die ANDERE Rolle und nur während der Karenz — die
 * eigene Ablage bleibt sichtbar, sonst wäre sie nicht zurückziehbar.
 */
export function regalItemVerborgen(item, role, jetzt = Date.now()) {
  return inKarenz(item, jetzt) && item.role !== role;
}

/**
 * Rollenbewusste Lese-Redaktion (D5). Reine Funktion, vom Worker beim GET
 * verwendet und einzeln getestet — analog redigiereMessungenFuerRolle.
 */
export function redigiereRegalFuerRolle(regal, role, jetzt = Date.now()) {
  const items = ((regal && regal.items) || []).filter(i => !regalItemVerborgen(i, role, jetzt));
  return { ...(regal || {}), items };
}

/**
 * Item ablegen. Der Server setzt id, Zeit und Karenz — nie der Client
 * (ein mitgeschicktes visibleFrom wird ignoriert, sonst wäre die Karenz
 * clientseitig abwählbar).
 *
 * Karenz NUR für Ausschnitte: Die Selbstmitteilung ist durch die Redaktion
 * gegangen, inklusive Bedeutungsrückfrage; ein Nachlauf widerspräche dort
 * „gegebenes Ja zählt sofort". Der Ausschnitt kennt keine Redaktion (D1) und
 * ist nach Sichtbarwerden endgültig — er braucht das Fenster.
 */
export function legeRegalItemAb(regal, entwurf, jetzt = Date.now()) {
  const r = regal && Array.isArray(regal.items) ? regal : { items: [] };
  const kind = entwurf.kind === "excerpt" ? "excerpt" : "message";
  const item = {
    id: "RG" + (r.items.length + 1),
    freigabe: entwurf.freigabe,   // Klammer ueber alle Faecher EINER Freigabe
    kind,
    text: entwurf.text ?? null,
    pairs: kind === "excerpt" ? (entwurf.pairs || []) : null,
    frame: kind === "excerpt" ? (entwurf.frame ?? null) : null,
    wish: entwurf.wish ?? null,
    by: entwurf.by,
    role: entwurf.role,
    at: new Date(jetzt).toISOString(),
    visibleFrom: karenzBis(jetzt),
    read: false,   // Pull, kein Push
  };
  r.items.push(item);
  return { regal: r, item };
}

/**
 * Agenda-Eintrag aus einer Querung (Weg "moment"). Traegt dieselbe Karenz und
 * dieselbe Freigabe-Klammer wie das Regal-Fach - es ist derselbe Klick.
 *
 * Nicht zu verwechseln mit hebeRegalItem: Dort bewegt der EMPFAENGER bereits
 * Sichtbares innerhalb der gemeinsamen Schicht. Das ist keine Querung.
 */
export function legeAgendaItemAb(agenda, entwurf, jetzt = Date.now()) {
  const a = agenda && Array.isArray(agenda.items) ? agenda : { items: [] };
  const item = {
    id: "AGD" + (a.items.length + 1),
    freigabe: entwurf.freigabe,
    text: entwurf.text ?? null,
    wish: entwurf.wish ?? null,
    by: entwurf.by,
    role: entwurf.role,
    at: new Date(jetzt).toISOString(),
    visibleFrom: karenzBis(jetzt),
    state: "open",
  };
  a.items.push(item);
  return { agenda: a, item };
}

/** Redaktion der Agenda - dieselbe Regel, anderes Fach. */
export function redigiereAgendaFuerRolle(agenda, role, jetzt = Date.now()) {
  const items = ((agenda && agenda.items) || []).filter(i => !regalItemVerborgen(i, role, jetzt));
  return { ...(agenda || {}), items };
}

/**
 * Ruecknahme wirkt auf die GANZE Freigabe, ueber alle gewaehlten Wege.
 * Zurueckziehen heisst "das doch nicht", nicht "davon die Haelfte" - sonst
 * muesste die Person zwei Zustaende im Kopf halten, obwohl sie einmal geklickt
 * hat. Gibt die Zahl der entfernten Eintraege zurueck.
 */
export function nimmFreigabeZurueck(regal, agenda, freigabeId, role, jetzt = Date.now()) {
  if (!freigabeId) return 0;
  let weg = 0;
  for (const bund of [regal, agenda]) {
    const items = (bund && bund.items) || [];
    for (let k = items.length - 1; k >= 0; k--) {
      const it = items[k];
      if (it.freigabe !== freigabeId) continue;
      if (it.role !== role || !inKarenz(it, jetzt)) continue;
      items.splice(k, 1); weg++;
    }
  }
  return weg;
}

/**
 * Gelesen-Markierung. Nur die EMPFANGENDE Rolle markiert — der Absender darf
 * den Lesestand nicht setzen, sonst wäre „nie gelesen ist legitim" aushebelbar.
 */
export function setzeRegalGelesen(regal, itemId, role, jetzt = Date.now()) {
  const it = ((regal && regal.items) || []).find(x => x.id === itemId);
  if (!it) return false;
  if (it.role === role) return false;              // eigene Ablage
  if (regalItemVerborgen(it, role, jetzt)) return false;
  it.read = true;
  return true;
}

/**
 * Rücknahme in der Karenz. Nur der Owner, nur solange verborgen.
 * Nach Sichtbarwerden endgültig: Etwas möglicherweise schon Gelesenes zu
 * entfernen ist schlimmer, als es stehenzulassen.
 */
export function nimmRegalZurueck(regal, itemId, role, jetzt = Date.now()) {
  const items = (regal && regal.items) || [];
  const k = items.findIndex(x => x.id === itemId);
  if (k < 0) return false;
  const it = items[k];
  if (it.role !== role) return false;
  if (!inKarenz(it, jetzt)) return false;
  items.splice(k, 1);
  return true;
}

/**
 * Regal-Item in die Agenda heben. Schreibt in BEIDE Bündel und gehört deshalb
 * hierher: Seit der PUT-Riegel auf dem Regal liegt, kann der Client den
 * gehoben-Vermerk nicht mehr selbst setzen.
 */
export function hebeRegalItem(regal, agenda, itemId, role, opts = {}, jetzt = Date.now()) {
  const it = ((regal && regal.items) || []).find(x => x.id === itemId);
  if (!it || it.gehoben) return null;
  if (regalItemVerborgen(it, role, jetzt)) return null;
  const a = agenda && Array.isArray(agenda.items) ? agenda : { items: [] };
  const eintrag = {
    id: "AGD" + (a.items.length + 1),
    text: it.text, wish: it.wish || null,
    by: it.by, herkunft: "shelf",
    at: new Date(jetzt).toISOString(), state: "open",
    // BEWUSST ohne visibleFrom: Die Hebung ist keine Querung - das Material
    // war bereits sichtbar, und wer hebt, gibt nichts von sich preis.
  };
  if (opts.alsZiel) eintrag.zielKandidat = true;
  else eintrag.vormerkung = true;   // „besprechen" heißt: fürs nächste Mal vorgemerkt
  a.items.push(eintrag);
  it.gehoben = true;
  if (opts.alsZiel) it.alsZiel = true;
  return { agenda: a, eintrag };
}

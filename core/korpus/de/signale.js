// Korpus DE · SIGNALE (MOD-6) — die Regexe der Waechter. Das ist CODE, kein
// Prompt-Text: Woran die App eine Lage erkennt (Krise, eigene Sache, Verfuegung)
// steht hier und wird von Tests gedeckt; was das Modell dazu liest, steht in
// bausteine/waechter/<name>.md. Entscheidung F12 a: Regexe bleiben JS.
// Krisen-Signale und Erkenner sind in DE und EN dieselbe Union (MOD-2a).

export const SIGNALE = {
  krise: /\bsuizid|\bselbstmord|\bumbringen|nicht mehr leben|nicht mehr weiterleben|sterben will|\britz(e|t|en|est)\b|\bselbst ?verletz|weg sein wollen|keinen sinn mehr|am ende sein|self-harm|\bsuicid|kill myself|end it all/i,
  krisenhilfe: /0800\s*111\s*0\s*111|Telefonseelsorge|Krisendienst|crisis line|helpline/i,
  einzelraum: /eigene[nrms]?\s+Raum|eigenen\s+Raum|Einzelraum|dein\s+Raum|deinem\s+Raum|individual\s+space|own\s+space|your\s+own\s+room/i,
  eigeneSache: /\b(ich|mir|mein[e]?[nrs]?)\b[^.!?]{0,60}\b(nicht gemacht|nicht geschafft|nicht dazu gekommen|vergessen|nicht fertig|nicht ausgefüllt|nicht abgegeben|nicht hinbekommen|keine zeit)|\bhab(e)? (es|sie|das)? ?(diesmal )?(gar )?nicht\b/i,
  verfuegung: /\b(lass uns|lassen wir|dann lassen wir|wir (machen|holen|überspringen|lassen)|einfach weiter|trotzdem weiter|ein andermal|später nach|nachholen|überspringen|auslassen|ruhen lassen|dann eben ohne|geht auch ohne)\b/i,
};

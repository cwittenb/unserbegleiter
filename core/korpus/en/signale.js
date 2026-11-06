// Corpus EN · SIGNALE (MOD-6) — the watchers' regexes (code, not prompt text). Mirror of de/signale.js.

export const SIGNALE = {
  krise: /\bsuizid|\bselbstmord|\bumbringen|nicht mehr leben|nicht mehr weiterleben|sterben will|\britz(e|t|en|est)\b|\bselbst ?verletz|weg sein wollen|keinen sinn mehr|am ende sein|self-harm|\bsuicid|kill myself|end it all/i,
  krisenhilfe: /0800\s*111\s*0\s*111|Telefonseelsorge|Krisendienst|crisis line|helpline/i,
  einzelraum: /eigene[nrms]?\s+Raum|eigenen\s+Raum|Einzelraum|dein\s+Raum|deinem\s+Raum|individual\s+space|own\s+space|your\s+own\s+room/i,
  eigeneSache: /\b(i|my|mine)\b[^.!?]{0,60}\b(didn'?t (do|get to|manage|finish|fill|hand|make)|did not (do|get to|manage|finish)|haven'?t (done|finished|gotten to|got to)|forgot|isn'?t (done|finished|ready)|not (done|finished|ready)|no time|never got (to|around))|\b(i )?(haven'?t|didn'?t|did not)( done| do)? (it|that|this|mine)\b/i,
  verfuegung: /\b(let'?s|let us|shall we|we('ll| will| can| could)?)\s+(just |simply )?(continue|move on|carry on|go on|skip|leave it|catch up|do (it|that) (later|another time)|get on with it)|\b(just|simply|anyway) (continue|move on|carry on|go on)|\b(another time|some other time|later on|skip (it|that)|leave (it|that) out|let (it|that) rest|never mind|without it|works without)\b/i,
};

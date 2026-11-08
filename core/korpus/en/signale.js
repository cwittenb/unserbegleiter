// Corpus EN · SIGNALE (MOD-6) — the watchers' regexes (code, not prompt text). Mirror of de/signale.js.

export const SIGNALE = {
  krise: /\bsuizid|\bselbstmord|\bumbringen|nicht mehr leben|nicht mehr weiterleben|sterben will|\britz(e|t|en|est)\b|\bselbst ?verletz|weg sein wollen|keinen sinn mehr|am ende sein|self-harm|\bsuicid|kill myself|end it all/i,
  krisenhilfe: /0800\s*111\s*0\s*111|Telefonseelsorge|Krisendienst|crisis line|helpline/i,
  einzelraum: /eigene[nrms]?\s+Raum|eigenen\s+Raum|Einzelraum|dein\s+Raum|deinem\s+Raum|individual\s+space|own\s+space|your\s+own\s+room/i,
  eigeneSache: /\b(i|my|mine)\b[^.!?]{0,60}\b(didn'?t (do|get to|manage|finish|fill|hand|make)|did not (do|get to|manage|finish)|haven'?t (done|finished|gotten to|got to)|forgot|isn'?t (done|finished|ready)|not (done|finished|ready)|no time|never got (to|around))|\b(i )?(haven'?t|didn'?t|did not)( done| do)? (it|that|this|mine)\b/i,
  verfuegung: /\b(let'?s|let us|shall we|we('ll| will| can| could)?)\s+(just |simply )?(continue|move on|carry on|go on|skip|leave it|catch up|do (it|that) (later|another time)|get on with it)|\b(just|simply|anyway) (continue|move on|carry on|go on)|\b(another time|some other time|later on|skip (it|that)|leave (it|that) out|let (it|that) rest|never mind|without it|works without)\b/i,
  /* PRV-4 · Anlaesse der Theorie-Linsen (Karten). DE ∪ EN wie bei der Krise.
     "Anteil" allein ist bewusst KEIN Treffer: "mein Anteil daran" ist die
     eigene Beteiligung (GATE), keine Anteile-Sprache. */
  anteile: /\b(ein|einen|mein|meinen|dein|deinen|sein|ihr)\w*\s+(\w+\s+)?teil\s+(von|in)\s+(mir|dir|ihm|ihr)\b|(?<![a-zäöüß])(ängstlich|verletzt|vermeidend|kindlich|innere|kritisch|wütend|traurig)[a-zäöüß]*\s+(an)?teil\b|hin- und hergerissen|hin und her gerissen|einerseits[^.!?]{0,100}andererseits|\bzwiespält|ich hasse (ihn|sie|dich|mich)\b|will nur noch weg|\bich bin (so |einfach )?(dumm|blöd|unfähig|wertlos)\b|\b(a |one )?part of (me|you|him|her)\b|\b(scared|hurt|angry|avoidant|inner|critical)\s+part\b|\btorn between\b|on the one hand[^.!?]{0,100}on the other|\bi hate (him|her|you|myself)\b|just want to (leave|get out)|\bi'?m (so )?(stupid|useless|worthless)\b/i,
  anteileSpur: /\bteil von dir\b|\bteil in dir\b|\banteile?n? (von|in) dir\b|\bpart of you\b|\bparts of you\b/i,
  entwicklung: /früher (fand|mochte|liebte|bewunderte) ich|(hat|haben) mich (damals|früher|anfangs|am anfang) (so |total |sehr )?(fasziniert|angezogen|begeistert)|was mich (damals|früher|anfangs|am anfang) an (ihm|ihr|dir)|genau das,? was mich (mal |damals |früher )?(an (ihm|ihr|dir) )?(angezogen|fasziniert|begeistert)|\bi used to (love|admire|like) (that|how|his|her|your)|what (first )?(drew|attracted) me|(fascinated|attracted) me (at first|back then|in the beginning)/i,
  entwicklungSpur: /entwicklungsraum|\b(eigene[nrn]? )?(handlungs)?spielraum\b|was (könnte|kann) dich (daran|an diesem verhalten) so (stark )?berühr|development space|room to grow|what might touch you so/i,
};

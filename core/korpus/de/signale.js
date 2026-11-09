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
  /* PRV-4 · Anlaesse der Theorie-Linsen (Karten). DE ∪ EN wie bei der Krise.
     "Anteil" allein ist bewusst KEIN Treffer: "mein Anteil daran" ist die
     eigene Beteiligung (GATE), keine Anteile-Sprache. */
  anteile: /\b(ein|einen|mein|meinen|dein|deinen|sein|ihr)\w*\s+(\w+\s+)?teil\s+(von|in)\s+(mir|dir|ihm|ihr)\b|(?<![a-zäöüß])(ängstlich|verletzt|vermeidend|kindlich|innere|kritisch|wütend|traurig)[a-zäöüß]*\s+(an)?teil\b|hin- und hergerissen|hin und her gerissen|einerseits[^.!?]{0,100}andererseits|\bzwiespält|ich hasse (ihn|sie|dich|mich)\b|will nur noch weg|\bich bin (so |einfach )?(dumm|blöd|unfähig|wertlos)\b|\b(a |one )?part of (me|you|him|her)\b|\b(scared|hurt|angry|avoidant|inner|critical)\s+part\b|\btorn between\b|on the one hand[^.!?]{0,100}on the other|\bi hate (him|her|you|myself)\b|just want to (leave|get out)|\bi'?m (so )?(stupid|useless|worthless)\b/i,
  anteileSpur: /\bteil von dir\b|\bteil in dir\b|\banteile?n? (von|in) dir\b|\bpart of you\b|\bparts of you\b/i,
  entwicklung: /früher (fand|mochte|liebte|bewunderte) ich|(hat|haben) mich (damals|früher|anfangs|am anfang) (so |total |sehr )?(fasziniert|angezogen|begeistert)|was mich (damals|früher|anfangs|am anfang) an (ihm|ihr|dir)|genau das,? was mich (mal |damals |früher )?(an (ihm|ihr|dir) )?(angezogen|fasziniert|begeistert)|\bi used to (love|admire|like) (that|how|his|her|your)|what (first )?(drew|attracted) me|(fascinated|attracted) me (at first|back then|in the beginning)/i,
  entwicklungSpur: /entwicklungsraum|\b(eigene[nrn]? )?(handlungs)?spielraum\b|was (könnte|kann) dich (daran|an diesem verhalten) so (stark )?berühr|development space|room to grow|what might touch you so/i,
  /* PRV-7 · Anlaesse der Phasenmodule im Reflexionsgespraech. Grosszuegig
     mit Absicht: Ein Fehltreffer kostet nur Token (das Modul ist dabei), ein
     verpasster Treffer kostet die Regeln. DE ∪ EN. */
  teilen: /\b(ihm|ihr|er|sie|bernd|anna)\b[^.!?]{0,40}\b(sagen|zeigen|schreiben|erzählen|mitteilen|wissen|lesen|liest|sieht|sehen|hört|hören|erfahren|wüsste)\b|wie ich (das|es|ihm|ihr)\b[^.!?]{0,25}(sage|sagen|formuliere|formulieren|anspreche|ansprechen)|\b(him|her|he|she)\b[^.!?]{0,40}\b(tell|show|say|write|know|read|reads|see|sees|hear|hears)\b|how (i|to) (say|put|phrase|word|bring up)|ansprechen|anzusprechen|angst[^.!?]{0,40}(reagiert|reaktion|reagieren)|bring (it|this|that) up|afraid[^.!?]{0,40}(react|reaction)|teilen|mitteil|zeigen|zugänglich|(soll|sollte|könnte|kann|darf) (er|sie|bernd|anna)? ?(das |es )?(wissen|lesen|sehen|erfahren)|(ihm|ihr) (das |es )?(sagen|zeigen|schreiben|erzählen)|wünschte,? (er|sie)|gelesen werden|\bshare|\bshow (him|her|it|this)|(he|she) (should|could|can|may) (know|read|see)|tell (him|her)|wish (he|she) could/i,
  abruf: /letzte[nmrs]? (woche|mal|sitzung|gespräch|reflexion)|vor (ein paar|einigen|zwei|drei|kurzem) (tagen|wochen|monaten)?|damals|neulich|wir hatten (doch|mal)|(gespräch|sitzung) (über|vom|von)|was (hatte|habe) ich (da |damals )?(gesagt|geschrieben)|nachlesen|nachschauen|wortlaut|zeitleiste|last (week|time|session)|a few (days|weeks) ago|the other day|we (talked|spoke) about|what did i (say|write)|look (it )?up|timeline|word for word|verbatim/i,
  ende: /\[close session|\[checkpoint|aufhören|schluss machen|schließen|für heute (reicht|genug|war)|reicht für heute|tschüss|ciao|bis bald|bis zum nächsten|ich geh(e)? jetzt|ich muss (los|weg)|danke für heute|\bstop (here|for today)|that'?s enough for today|wrap (it )?up|\bbye\b|see you|i have to go|i need to go|thanks for today|let'?s (stop|end|finish)/i,
};

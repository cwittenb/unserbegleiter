// Korpus DE · SIGNALE (MOD-6) — die Regexe der Waechter. Das ist CODE, kein
// Prompt-Text: Woran die App eine Lage erkennt (Krise, eigene Sache, Verfuegung)
// steht hier und wird von Tests gedeckt; was das Modell dazu liest, steht in
// bausteine/waechter/<name>.md. Entscheidung F12 a: Regexe bleiben JS.
// Krisen-Signale und Erkenner sind in DE und EN dieselbe Union (MOD-2a).

/* ---- CR-4.1 · Krisen-Signale (DE ∪ EN) ---------------------------------------
   Bis CR-4 stand hier EIN Muster aus elf Wortstaemmen. Es verfehlte die
   ueblichen Saetze ("Ich will sterben", "mich umzubringen", "ich bringe mich
   um", "mir das Leben nehmen", "am liebsten waere ich tot", "ich habe mich
   geritzt", "I want to die") und traf Unbeteiligtes ("das hat keinen Sinn mehr
   mit uns", "die Ritze im Parkett") — Code-Review C5.

   Die Regel dahinter:
     · GROSSZUEGIG bei Selbstbezug. Wer "mich", "mir", "ich" mit Sterben,
       Umbringen, Verletzen verbindet, bekommt den Hinweis. Ein unnoetiger
       Hinweis kostet ein paar unsichtbare Zeilen; ein uebersehener Satz mehr.
     · ENG bei Redewendungen ohne Selbstbezug. "Das bringt mich um" (die
       Arbeit), "keinen Sinn mehr mit uns" (die Beziehung), "Schluss machen"
       (die Trennung) sind Alltagssprache in genau den Gespraechen, fuer die
       diese App da ist.
   Als Liste von Bausteinen, damit jede Zeile fuer sich lesbar und pruefbar
   bleibt. Die Satzliste dazu: tests/unit/cr4-waechter-signale.spec.js —
   wer hier aendert, ergaenzt dort den Satz, der den Anlass gab.
   DE und EN sind dieselbe Union (MOD-2a): Paare wechseln die Sprache. */
const KRISE_DE = [
  String.raw`\bsuizid`, String.raw`\bselbstmord`, String.raw`\bselbsttötung`, String.raw`\bfreitod`,
  // umbringen — mit Selbstbezug (1./3. Person reflexiv), nicht "bringt mich um" (Redewendung)
  String.raw`\b(mich|sich|dich)\s+(selbst\s+)?um(zu)?bringen`, String.raw`\bbringe?\s+mich\s+(selbst\s+)?um\b`, String.raw`\bbringt\s+sich\s+(selbst\s+)?um\b`,
  String.raw`\b(mich|sich)\s+(selbst\s+)?umgebracht`, String.raw`\bumbringen\b`,
  // sterben wollen / tot sein
  String.raw`\b(will|möchte|wollte|würde gern|würde am liebsten)\s+(ich\s+)?(einfach\s+|nur\s+|nur noch\s+|am liebsten\s+)*sterben`, String.raw`\bsterben\s+(will|möchte|wollen|würde)`,
  String.raw`\bwäre\s+(ich\s+)?(lieber|am liebsten|besser|gern)\s+tot\b`, String.raw`\b(ich\s+)?wäre\s+tot\b`, String.raw`\b(lieber|am liebsten)\s+(wäre\s+ich\s+)?tot\b`, String.raw`\btot\s+sein\s+(will|möchte|wollen)`,
  // nicht mehr leben / da sein / aufwachen
  String.raw`\bnicht\s+mehr\s+(weiter)?leben\b(?!\s+(wie|als|mit dem|in d))`, String.raw`\bnicht\s+mehr\s+weiterleben`, String.raw`\b(will|möchte|wollte)\s+(ich\s+)?(einfach\s+)?nicht\s+mehr\s+da\s+sein`,
  String.raw`\bnicht\s+mehr\s+aufwachen`, String.raw`\bweg\s+sein\s+wollen`, String.raw`\bweg\s+sein,?\s+für\s+immer`,
  // Leben nehmen / Ende setzen
  String.raw`\b(mir|sich|dir)\s+das\s+leben\s+(zu\s+)?nehmen`, String.raw`\bein\s+ende\s+(setzen|machen|bereiten)`, String.raw`\bschluss\s+machen\s+mit\s+(dem\s+leben|allem|mir)\b`,
  // Selbstverletzung — mit Personbezug
  String.raw`\b(mich|sich)\s+(\w+\s+){0,4}(ge)?ritzt?\b`, String.raw`\b(mich|sich)\s+(zu\s+)?ritzen`, String.raw`\britze\s+mich`, String.raw`\bselbst ?verletz`, String.raw`\bverletze\s+mich\s+selbst`,
  String.raw`\b(mir|sich)\s+(selbst\s+)?(et)?was\s+an(zu)?tu[en]`, String.raw`\bmir\s+(et)?was\s+antue`,
  // Sinn — nur mit Lebensbezug
  String.raw`\bleben\s+hat\s+keinen\s+sinn`, String.raw`\bkeinen\s+sinn\s+mehr\s+im\s+leben`, String.raw`\balles\s+keinen\s+sinn\s+mehr`, String.raw`\bkeinen\s+sinn\s+mehr\s+zu\s+leben`,
  String.raw`\bbesser\s+dran\s+ohne\s+mich`, String.raw`\bam\s+ende\s+sein\b`,
];
const KRISE_EN = [
  String.raw`\bsuicid`, String.raw`\bself-?harm`, String.raw`\bkill(ing|ed)?\s+(myself|himself|herself|themselves|yourself)`,
  String.raw`\b(end|ending|take|taking)\s+(my|his|her|their)\s+(own\s+)?life`, String.raw`\b(want|wanna|wish)\s+(to\s+)?die\b`, String.raw`\bwanna\s+die\b`,
  String.raw`\bwish\s+i\s+(were|was)\s+dead`, String.raw`\b(rather|better\s+off)\s+(be\s+)?dead\b`,
  String.raw`\bdon'?t\s+want\s+to\s+(live|be\s+here|be\s+alive|wake\s+up)\b(?!\s+like)`, String.raw`\bcan'?t\s+go\s+on\s+living`,
  String.raw`\b(cut|cutting|hurt|hurting|harm|harming)\s+myself\b(?!\s+some\s+slack)`, String.raw`\bno\s+reason\s+to\s+live`, String.raw`\blife\s+has\s+no\s+(meaning|point)`,
  String.raw`\bend\s+it\s+all\b`, String.raw`\b(thinking|thought)\s+(of|about)\s+ending\s+it\b`, String.raw`\bbetter\s+off\s+without\s+me`, String.raw`\bdisappear\s+forever`,
];
export const KRISE_MUSTER = new RegExp([...KRISE_DE, ...KRISE_EN].join("|"), "i");

export const SIGNALE = {
  krise: KRISE_MUSTER,   // CR-4.1 · siehe oben
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
  ende: /\[close session|\[close moment|\[checkpoint|punkt machen|danke (dir|euch)|das war (schön|gut|gut so)|thank you|that was (nice|lovely|good)|aufhören|schluss machen|schließen|für heute (reicht|genug|war)|reicht für heute|tschüss|ciao|bis bald|bis zum nächsten|ich geh(e)? jetzt|ich muss (los|weg)|danke für heute|\bstop (here|for today)|that'?s enough for today|wrap (it )?up|\bbye\b|see you|i have to go|i need to go|thanks for today|let'?s (stop|end|finish)/i,
};

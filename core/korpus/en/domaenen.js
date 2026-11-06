// Corpus EN · DOMAENEN (MOD-6) — the 13 areas of life as data. Mirror of de/domaenen.js.

// Areas of life (domains) of the Focus clarification — EN per review package 1:
export const DOMAINS = [
  {t:"Closeness ↔ Autonomy", d:"Time together and space of your own – what the balance looks like for you.", poles:["Closeness","Autonomy"]},
  {t:"Exclusivity & Faithfulness", d:"Boundaries toward the outside – what belongs in for you, and what doesn't."},
  {t:"Financial Arrangements", d:"Openness about money, managing it together or separately."},
  {t:"Honesty ↔ Harmony", d:"Being able to raise anything – or rather keeping the peace.", poles:["Honesty","Harmony"]},
  {t:"Reliability & Commitment", d:"Promises, predictability, being able to count on each other."},
  {t:"Stability ↔ Adventure", d:"Familiar rituals and things to rely on – or novelty, variety, new departures.", poles:["Stability","Adventure"]},
  {t:"Roles & Fairness", d:"Housework, mental load, whose career takes priority."},
  {t:"Sexuality & Physical Intimacy", d:"Physical connection – in all the forms that make the two of you who you are."},
  {t:"Family & Children", d:"Whether and how, parenting, dealing with the families you come from."},
  {t:"Growth & Personal Development", d:"Being allowed to change, and supporting each other in it."},
  {t:"Appreciation", d:"How affection is shown – and how you need it."},
  {t:"Shared Meaning / Shared Vision", d:"Life goals and shared values – where you want to go together."},
  {t:"Social Life", d:"Friends and the world out there – or the cocoon for two.", poles:["Sociability","Time as a couple"]}
];
export const DOMAENEN = DOMAINS.map((x,i)=>`${i+1}. ${x.t} – ${x.d}`).join("\n");

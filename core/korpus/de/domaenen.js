// Korpus DE · DOMAENEN (MOD-6) — die 13 Lebensbereiche als Daten (Titel,
// Beschreibung, Pole). Kein Prompt-Text, sondern Katalog; genutzt von
// Templates ({{wissen.DOMAINS | count}}, {{wissen.DOMAENEN}}) und der UI.

// Lebensbereiche (Domänen) der Auftragsklärung (v0.29 Z.546-561, verbatim):
export const DOMAINS = [
  {t:"Nähe ↔ Autonomie", d:"Gemeinsame Zeit und eigener Raum – wie die Balance für dich aussieht.", poles:["Nähe","Autonomie"]},
  {t:"Exklusivität & Treue", d:"Grenzen nach außen – was für dich dazugehört und was nicht."},
  {t:"Finanzielle Gestaltung", d:"Transparenz beim Geld, gemeinsam oder getrennt wirtschaften."},
  {t:"Ehrlichkeit ↔ Harmonie", d:"Alles ansprechen können – oder lieber den Frieden halten.", poles:["Ehrlichkeit","Harmonie"]},
  {t:"Verlässlichkeit & Verbindlichkeit", d:"Zusagen, Planbarkeit, sich aufeinander verlassen können."},
  {t:"Beständigkeit ↔ Abenteuer", d:"Vertraute Rituale und Verlässliches – oder Neues, Abwechslung, Aufbruch.", poles:["Beständigkeit","Abenteuer"]},
  {t:"Rollen & Fairness", d:"Hausarbeit, Mental Load, wessen Karriere Vorrang hat."},
  {t:"Sexualität & körperliche Nähe", d:"Körperliche Verbindung – in allen Formen, die euch ausmachen."},
  {t:"Familie & Kinder", d:"Ob und wie, Erziehung, der Umgang mit den Herkunftsfamilien."},
  {t:"Wachstum & Entwicklung", d:"Sich verändern dürfen und einander dabei stützen."},
  {t:"Wertschätzung", d:"Wie Zuneigung gezeigt wird – und wie du sie brauchst."},
  {t:"Gemeinsamer Sinn / Vision", d:"Lebensziele und geteilte Werte – wohin ihr zusammen wollt."},
  {t:"Soziales Leben", d:"Freunde und die Welt draußen – oder der Kokon zu zweit.", poles:["Geselligkeit","Zeit zu zweit"]}
];
export const DOMAENEN = DOMAINS.map((x,i)=>`${i+1}. ${x.t} – ${x.d}`).join("\n");

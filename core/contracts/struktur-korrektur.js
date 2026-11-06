// ST1.4 · Formforderung der keyless-Korrektur-Runde (sprachinvariantes Wire,
// Muster: Judge-KORREKTUR + korrekturNachricht in block.js).
// MOD-5 · Aus core/llm/adapter.js hierher: Es ist Vertragstext zwischen App
// und Modell, keine Transport-Mechanik. Die keyless-Plattform reicht ihn dem
// Adapter als cfg.strukturKorrektur (platforms/artifact/llm-config.js).

export const STRUKTUR_KORREKTUR =
  "[SYSTEM-REVISION: Your last answer was not the required structure. " +
  "Answer NOW exclusively with ONE JSON object of the requested form " +
  "(fields as specified, e.g. {\"antwort\": …}) — no further text before or after, no Markdown fences.]";

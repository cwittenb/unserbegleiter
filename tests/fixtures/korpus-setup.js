// R5 · Korpus-Lader für die Testumgebung.
//
// Seit R5 liegt der englische Korpus NICHT mehr statisch in prompts.js — die
// Plattform reicht ihren Lader herein (Pages holt eine eigene Datei, das
// Artefakt hält beide bei). Die Testumgebung ist faktisch die dritte
// Plattform: Sie kann direkt importieren, weil Node ESM das kann und hier
// keine Bundle-Größe zählt.
//
// Bewusst ein globales Setup und keine Zeile je Testdatei: Wäre der Lader in
// jeder Spec einzeln zu setzen, wäre die erste vergessene Datei ein Test, der
// aus dem falschen Grund grün ist.

import { registerKorpus, setKorpusLader } from "../../core/prompts/prompts.js";
import * as en from "../../core/prompts/prompts.en.js";

registerKorpus("en", en);
setKorpusLader(async locale => (locale === "en" ? en : null));

// Provider Mistral (MOD-5): OpenAI-kompatible Instanz. Kein Modellname hier —
// Modell und Key kommen aus der Konfiguration (S35d).

import { openaiCompat } from "./openai-kompatibel.js";

export const mistral = openaiCompat("https://api.mistral.ai/v1/chat/completions", "mistral");

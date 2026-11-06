// Provider OpenAI (MOD-5): OpenAI-kompatible Instanz (mit stream_options fuer usage).

import { openaiCompat } from "./openai-kompatibel.js";

export const openai = openaiCompat("https://api.openai.com/v1/chat/completions", "openai");

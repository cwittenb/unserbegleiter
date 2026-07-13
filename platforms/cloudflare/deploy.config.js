// Cloudflare-Deploy-Konfiguration.
//
// Die KV-Namespace-ID ist KEIN Geheimnis: sie ist nur eine Resource-Kennung,
// jederzeit per `wrangler kv namespace list` einsehbar. Sie darf daher hier
// committet werden und ist die dauerhafte Quelle der Wahrheit für den Build.
//
// Für abweichende Umgebungen (z. B. CI, ein zweiter Account) hat die
// Umgebungsvariable PAARE_KV_ID Vorrang vor diesem Wert.
export const PAARE_KV_ID = "1590b0377c4a47588ec27f3039edf4d5";

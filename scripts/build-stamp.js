// Build-Stempel: Datum+Zeit (UTC, minutengenau) — landet im Dateinamen und
// sichtbar auf der Eingangskarte, damit immer klar ist, welcher Stand läuft.
export function buildStamp(d = new Date()) {
  const p = n => String(n).padStart(2, "0");
  return d.getUTCFullYear() + "-" + p(d.getUTCMonth() + 1) + "-" + p(d.getUTCDate()) +
    "_" + p(d.getUTCHours()) + p(d.getUTCMinutes());
}

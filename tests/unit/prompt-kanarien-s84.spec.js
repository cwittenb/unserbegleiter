// Prompt-Kanarien S84 — pinnen die Härtungen aus dem Mistral-Gegenprobe-Lauf
// 2026-07-19T06:40 (mistral-medium-Pipeline, mistral-large-Judge j5) — nach
// Entscheidung "auf Mistral optimieren": KRIS-01 (3/3, kein konkretes
// Krisenhilfe-Angebot), QZ-01 Modus B (keine Landung), WDR-01 (CHOICE ohne
// Verortung + Instruktions-Echo), MERK-01 (generische statt konkrete
// Anknüpfung), AUFD-01 (Marker-Disziplin), SYC-05 (Ich-Rahmung ohne
// Rückfrage). Aufbauend auf S83.

import { describe, it, expect } from "vitest";
import * as DE from "../../core/prompts/prompts.de.js";
import * as EN from "../../core/prompts/prompts.en.js";

const faelle = [
  ["de", DE, {
    krisKonkret: "Telefonseelsorge 0800 111 0 111",
    krisAktiv: "AKTIV an",
    krisAbfrage: "Eine bloße Abfrage genügt NICHT",
    krisBeispiel: '"Brauchst du Unterstützung?" oder "Ist das aushaltbar?" allein sind kein Hilfsangebot',
    spiegelRueckfrage: "Behauptung im Ich-Gewand",
    echo: "KEIN INSTRUKTIONS-ECHO",
    echoBeispiel: '"Lande ich warm:"',
    marker: "MARKEN-SELBSTCHECK",
    markerFolge: "unmittelbar nächste Nachricht",
    choiceAllein: "steht dabei NIE allein",
    choiceReihenfolge: "erst dann die Einladung",
    merkWortlaut: "im WORTLAUT des Merkpostens",
    merkVerbot: "ohne das Thema) ist ein Verstoß",
    qzSchritt1: "NIE die Frage allein",
    qzDirekt: "geh DIREKT zu SCHRITT 2",
    qzLandung: "LANDUNGS-PFLICHT",
  }],
  ["en", EN, {
    krisKonkret: "name at least ONE concrete option",
    krisAktiv: "ACTIVELY offer",
    krisAbfrage: "A mere query is NOT enough",
    krisBeispiel: '"Do you need support?" or "Is this bearable?" on their own are not an offer of help',
    spiegelRueckfrage: "assertion in I-clothing",
    echo: "NO INSTRUCTION ECHO",
    echoBeispiel: '"I land warmly:"',
    marker: "MARK SELF-CHECK",
    markerFolge: "very next message",
    choiceAllein: "NEVER stands alone",
    choiceReihenfolge: "only then the invitation",
    merkWortlaut: "WORDING of the memo",
    merkVerbot: "without the topic) is a violation",
    qzSchritt1: "NEVER the question alone",
    qzDirekt: "go DIRECTLY to STEP 2",
    qzLandung: "LANDING OBLIGATION",
  }],
];

describe.each(faelle)("Prompt-Kanarien S84 · %s", (_sprache, P, T) => {
  const auf = () => P.aufloesungsPrompt("Anna", "Bernd");
  const mom = () => P.momentPrompt("Anna", "Bernd");
  const refl = () => P.reflexionsPrompt("Anna", "Bernd");
  const klaer = () => P.klaerungsPrompt("Anna", "Bernd");

  it("KRIS-01: Krisen-Vorrang benennt konkrete Hilfe aktiv — bloße Abfrage genügt nicht (reale Fehlerbeispiele als Verbot)", () => {
    for (const p of [klaer(), refl()]) {
      expect(p).toContain(T.krisKonkret);
      expect(p).toContain(T.krisAktiv);
      expect(p).toContain(T.krisAbfrage);
      expect(p).toContain(T.krisBeispiel);
    }
  });

  it("SYC-05: Ich-Rahmung ist nur mit Rückfrage verwerfbar", () => {
    expect(P.bausteine.spiegelMittel("die Person")).toContain(T.spiegelRueckfrage);
  });

  it("WDR-01: Instruktions-Echo-Verbot mit realem Fehlerbeispiel in der gemeinsamen Auflösung", () => {
    const p = auf();
    expect(p).toContain(T.echo);
    expect(p).toContain(T.echoBeispiel);
  });

  it("AUFD-01: Marken-Selbstcheck — die auf die Wahl folgende Nachricht endet mit der Marke", () => {
    const p = auf();
    expect(p).toContain(T.marker);
    expect(p).toContain(T.markerFolge);
  });

  it("WDR-01: Wiedereinstiegs-CHOICE steht nie allein — Begrüßung und Verortung davor", () => {
    const p = auf();
    expect(p).toContain(T.choiceAllein);
    expect(p).toContain(T.choiceReihenfolge);
  });

  it("MERK-01: Merkposten-Angebot im Wortlaut des Themas — generische Anknüpfung ist ein Verstoß", () => {
    const p = refl();
    expect(p).toContain(T.merkWortlaut);
    expect(p).toContain(T.merkVerbot);
  });

  it("QZ-01 (Modus B): Schritt 1 nie als Frage allein; dankendes Abrunden führt direkt zu Schritt 2; Landungs-Pflicht mit Block", () => {
    const p = mom();
    expect(p).toContain(T.qzSchritt1);
    expect(p).toContain(T.qzDirekt);
    expect(p).toContain(T.qzLandung);
  });
});

describe("Prompt-Kanarien S84 · Konsistenz mit S83", () => {
  it("die S83-Härtungen bleiben unverändert bestehen (kein Regressions-Verlust durch S84)", () => {
    expect(DE.bausteine.zustimmungsGrammatik).toContain("ZUSTIMMUNGS-GRAMMATIK");
    expect(DE.bausteine.notbremseGemeinsam).toContain("NOTBREMSE (sessionweit");
    expect(EN.bausteine.zustimmungsGrammatik).toContain("CONSENT GRAMMAR");
    expect(EN.bausteine.notbremseGemeinsam).toContain("EMERGENCY BRAKE (session-wide");
    expect(DE.momentPrompt("Anna", "Bernd")).toContain("END-SIGNALE ERNST NEHMEN");
    expect(EN.momentPrompt("Anna", "Bernd")).toContain("TAKE END SIGNALS SERIOUSLY");
  });
});

// @vitest-environment happy-dom
// L3 (Turn 46) · Wiedereinstieg — der Screen vor dem Zugang.
//
// Vor diesem Sprint war er der EINZIGE Screen, der die Bausteine aus
// design.js nicht benutzte: alles aus Inline-Styles im HTML-String, in der
// Formsprache, die Turn 40 abgeschafft hat. Und er war voellig ungeschuetzt —
// `zeigeWiedereinstieg` kam in keinem einzigen Test vor.
//
// Der Grund fuer die Sonderform war nie ein technischer: die Funktion laeuft
// zwar vor createApp(), aber applyDesign(doc) laeuft in boot() DAVOR.
//
// Diese Datei prueft drei Dinge getrennt:
//   1. die Formsprache (L3.1) — an der Quelle, ohne Rendern
//   2. den gerenderten Screen (L3.3–L3.5)
//   3. die Invarianten aus §5 des Handovers (L3.7) — sie sind der Grund,
//      warum dieser Screen ueberhaupt heikel ist

import { describe, it, expect, beforeEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { setLocale } from "../../core/i18n/index.js";
import { de } from "../../core/i18n/de.js";
import { en } from "../../core/i18n/en.js";
import { RECOVER_MS, RECOVER_MINUTEN } from "../../core/zugang-fristen.js";
import { RECOVER_MS as AUTH_RECOVER_MS } from "../../platforms/cloudflare/worker/auth.js";

const CLIENT = readFileSync("platforms/cloudflare/pages/client.js", "utf8");
const DESIGN = readFileSync("core/ui/design.js", "utf8");

/** Nur der Rumpf von zeigeWiedereinstieg — der Rest der Datei ist nicht Turn 46. */
const SCREEN = (() => {
  const i = CLIENT.indexOf("export function zeigeWiedereinstieg");
  return CLIENT.slice(i, CLIENT.indexOf("\n/** Push-Glocke", i));
})();

/* ---------- L3.1 · Die Formsprache ---------- */

describe("L3.1 · Keine eigenen Werte mehr — der Screen benutzt die Bausteine", () => {
  it("kein Inline-Style, kein Radius, kein Weichzeichner", () => {
    expect(SCREEN).not.toContain('style="');
    expect(SCREEN).not.toContain("border-radius");
    expect(SCREEN).not.toContain("backdrop-filter");
  });

  it("kein Farbliteral — und kein Weiss (die Palette kennt keins)", () => {
    expect(SCREEN.match(/#[0-9a-fA-F]{3,8}\b/g) || []).toEqual([]);
    expect(SCREEN).not.toMatch(/\brgba?\(/);
    expect(SCREEN.toLowerCase()).not.toContain("#fff");
    expect(SCREEN.toLowerCase()).not.toMatch(/\bwhite\b/);
  });

  it("keine Schriftgroesse — die Streuner 26 und 14 px sind weg", () => {
    expect(SCREEN).not.toContain("font-size");
    expect(SCREEN).not.toContain("26px");
    expect(SCREEN).not.toContain("14px");
  });

  it("die neuen Klassen liegen in design.js, nicht in client.js", () => {
    for (const klasse of ["rz-sprachpaar", "rz-eintrag", "rz-extern",
      "rz-vor-papier", "rz-vor-mitte", "rz-rechtsfuss"])
      expect(DESIGN, `${klasse} fehlt in design.js`).toContain("." + klasse);
  });
});

/* ---------- L3.2 · Texte ---------- */

describe("L3.2 · Texte in beiden Fassungen, Frist als Argument", () => {
  const NEU = ["wieder.hinweis", "wieder.quittungTitel", "wieder.einmalCaps",
    "wieder.einmalTitel", "wieder.einmalText", "wieder.badge", "wieder.bedingung",
    "wieder.landingText", "wieder.landingZeile"];

  it("alle neuen Schluessel stehen in de und en, und en ist uebersetzt", () => {
    for (const k of NEU) {
      expect(de[k], `de fehlt ${k}`).toBeTruthy();
      expect(en[k], `en fehlt ${k}`).toBeTruthy();
      expect(en[k], `${k} unuebersetzt`).not.toBe(de[k]);
    }
  });

  it("tote Schluessel sind entfernt, nicht stehengelassen", () => {
    // "wieder.email" steht jetzt im Platzhalter, "wieder.sendet" hatte einen
    // Knopfzustand beschrieben, den es nicht mehr gibt.
    for (const k of ["wieder.email", "wieder.sendet"]) {
      expect(de[k], `${k} lebt noch in de`).toBeUndefined();
      expect(en[k], `${k} lebt noch in en`).toBeUndefined();
      expect(CLIENT, `${k} wird noch benutzt`).not.toContain(k);
    }
  });

  it("die Frist ist EIN Wert — Worker und Oberflaeche koennen nicht auseinanderlaufen", () => {
    expect(AUTH_RECOVER_MS).toBe(RECOVER_MS);
    expect(RECOVER_MINUTEN).toBe(15);
    // Die Zahl steht als Argument im Text, nicht ausgeschrieben.
    expect(de["wieder.hinweis"]).toContain("{minuten}");
    expect(de["wieder.unterwegs"]).toContain("{minuten}");
    expect(en["wieder.hinweis"]).toContain("{minuten}");
    expect(de["wieder.hinweis"]).not.toMatch(/\b15\b/);
  });
});

/* ---------- Gerenderter Screen ---------- */

/* Der Client haengt sein `app`-Element beim Laden ein und startet boot().
   Deshalb: Element ANLEGEN, fetch stumm schalten, EINMAL importieren, boot
   auslaufen lassen — und danach den Screen selbst rufen. Kein resetModules:
   ein zweiter Modulgraph brachte eine zweite i18n-Instanz mit, deren Sprache
   nicht die des Tests war (daher zuvor englische Erwartungen). */
document.body.innerHTML = '<div id="app"></div>';
globalThis.fetch = vi.fn(async () => { throw new Error("kein Netz im Test"); });
const client = await import("../../platforms/cloudflare/pages/client.js");
await new Promise(r => setTimeout(r, 20));   // boot() auslaufen lassen

async function rendere(fehler) {
  setLocale("de");
  globalThis.fetch = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({}) }));
  client.zeigeWiedereinstieg(fehler);
  return document.getElementById("app");
}

describe("L3.3 · Der Screen", () => {
  it("traegt die Zweiteilung: Papier oben, Tiefgruen unten, Badge auf der Naht", async () => {
    const app = await rendere();
    expect(app.querySelector(".rz-split")).toBeTruthy();
    expect(app.querySelectorAll(".rz-half")).toHaveLength(2);
    expect(app.querySelector(".rz-half.rz-papier")).toBeTruthy();
    expect(app.querySelector(".rz-half.rz-tiefgruen")).toBeTruthy();
    const badge = app.querySelector(".rz-auf-naht");
    expect(badge.textContent).toBe(de["wieder.badge"]);
    // §5a · Bedingung, kein Ort — also KEIN Wegweiser-Zeichen.
    for (const z of ["\u2192", "\u2193", "\u2197"]) expect(badge.textContent).not.toContain(z);
    expect(app.querySelector(".rz-kulisse-naht")).toBeTruthy();
  });

  it("genau EIN Feld, in einer Zeile mit Haarlinien — keine Karte", async () => {
    const app = await rendere();
    expect(app.querySelectorAll("input")).toHaveLength(1);
    const zeile = app.querySelector(".rz-eintrag");
    expect(zeile.contains(app.querySelector("input"))).toBe(true);
    expect(app.querySelector("input").getAttribute("placeholder")).toBe(de["rec.platzhalter"]);
    // Die abgeloesten Bestandteile: Beschriftung und Knopftext als eigene Elemente.
    expect(app.querySelector("label")).toBeNull();
    expect(app.textContent).not.toContain(de["wieder.titel"] + de["wieder.anfordern"]);
  });

  it("die Sprachwahl steht je Breite an einem anderen Ort — genau eine sichtbar", async () => {
    const app = await rendere();
    const schmal = app.querySelector(".rz-sprachpaar.rz-nur-schmal");
    const breit = app.querySelector(".rz-sprachpaar.rz-nur-breit");
    // schmal: neben der Wortmarke in der Papier-Haelfte
    expect(app.querySelector(".rz-vor-kopf").contains(schmal)).toBe(true);
    // breit: ganz oben rechts, also in der Tiefgruen-Spalte
    expect(app.querySelector(".rz-tiefgruen").contains(breit)).toBe(true);
    // display:none nimmt die verdeckte Fassung auch aus dem Bedienbaum.
    expect(DESIGN).toContain(".rz-nur-breit{display:none}");
    expect(DESIGN).toContain(".rz-nur-breit{display:flex}");
    expect(DESIGN).toContain(".rz-nur-schmal{display:none}");
  });

  it("Sprachwahl: Sprachnamen statt DE/EN, mit Tapziel", async () => {
    const app = await rendere();
    const paar = app.querySelector(".rz-sprachpaar");
    const knoepfe = [...paar.querySelectorAll("button")];
    expect(knoepfe.map(b => b.textContent)).toEqual([de["paarspr.name.de"], de["paarspr.name.en"]]);
    expect(paar.textContent).not.toMatch(/\bDE\b/);
    expect(knoepfe[0].getAttribute("aria-pressed")).toBe("true");
    expect(DESIGN).toContain(".rz-sprachpaar{display:flex;align-items:center;gap:10px;\n"
      + "                     min-height:var(--rz-tapziel-finger)");
  });

  it("die Aussage steht zweimal in zwei Rollen: Handgriff oben, Lage unten", async () => {
    const app = await rendere();
    const papier = app.querySelector(".rz-papier"), tief = app.querySelector(".rz-tiefgruen");
    expect(papier.querySelector(".rz-eintrag")).toBeTruthy();      // Handgriff
    expect(tief.textContent).toContain(de["wieder.bedingung"]);     // Lage
    expect(papier.textContent).not.toContain(de["wieder.bedingung"]);
  });

  it("der Weg zur Landing benennt den Domainwechsel und traegt rel", async () => {
    const app = await rendere();
    const weg = app.querySelector(".rz-extern");
    expect(weg.getAttribute("href")).toBe("https://raumzuzweit.de");
    expect(weg.getAttribute("rel")).toContain("noopener");
    expect(weg.textContent).toContain("\u2197");
    expect(app.textContent).toContain("raumzuzweit.de");
  });

  it("Impressum und Datenschutz sind ohne Zugang erreichbar", async () => {
    const app = await rendere();
    const ziele = [...app.querySelectorAll(".rz-rechtsfuss a")].map(a => a.getAttribute("href"));
    expect(ziele).toEqual(["https://raumzuzweit.de/impressum",
                           "https://raumzuzweit.de/datenschutz"]);
  });
});

describe("L3.5 · Die zwei Sonderlagen", () => {
  it("verbrauchter Link wird zur UEBERSCHRIFT, nicht zur roten Box", async () => {
    const app = await rendere({ code: "link_used" });
    expect(app.querySelector(".rz-caps").textContent).toBe(de["wieder.einmalCaps"]);
    expect(app.querySelector(".rz-h1").textContent).toBe(de["wieder.einmalTitel"]);
    expect(app.textContent).toContain(de["wieder.einmalText"]);
    // Keine Fehlerbox: kein Rot, kein Kasten.
    expect(app.innerHTML).not.toContain("188,74,74");
    expect(app.innerHTML).not.toContain("border-radius");
    // Und die Anforderungszeile steht weiterhin da — die Lage hat einen Weg.
    expect(app.querySelector(".rz-eintrag input")).toBeTruthy();
  });

  it("abgelaufener Link ebenso; der Normalfall traegt keine Caps-Zeile", async () => {
    expect((await rendere({ code: "link_expired" })).querySelector(".rz-caps").textContent)
      .toBe(de["wieder.einmalCaps"]);
    expect((await rendere()).querySelector(".rz-caps")).toBeNull();
  });

  it("die Quittung schreibt IN der Zeile weiter — Pfeil weg, Gesendet da", async () => {
    const app = await rendere();
    app.querySelector("input").value = "bernd@postfach.de";
    app.querySelector("#recGo").click();
    await new Promise(r => setTimeout(r, 5));

    const zeile = app.querySelector(".rz-eintrag");
    expect(zeile, "die Zeile wurde ersetzt statt fortgeschrieben").toBeTruthy();
    expect(zeile.querySelector(".rz-adresse").textContent).toBe("bernd@postfach.de");
    expect(zeile.querySelector(".rz-quittung").textContent).toBe(de["wieder.gesendet"]);
    expect(zeile.textContent).not.toContain("\u2192");
    expect(zeile.querySelector("input"), "kein Feld mehr").toBeNull();
    expect(zeile.querySelector("button"), "kein deaktivierter Knopf").toBeNull();
    expect(app.querySelector("#recMsg"), "recMsg entfaellt").toBeNull();
    expect(app.textContent).toContain(String(RECOVER_MINUTEN));
  });
});

/* ---------- L3.7 · Die Invarianten ---------- */

describe("L3.7 · Was nicht kaputtgehen darf (§5)", () => {
  it("keine Enumeration: die Quittung ist bei JEDEM Ausgang dieselbe", async () => {
    const ausgaenge = [
      async () => ({ ok: true, status: 200, json: async () => ({}) }),          // Erfolg
      async () => ({ ok: false, status: 429, json: async () => ({ code: "rate" }) }), // Rate-Limit
      async () => { throw new Error("offline"); },                               // Netzfehler
    ];
    const gesehen = new Set();
    for (const f of ausgaenge) {
      const app = await rendere();
      globalThis.fetch = vi.fn(f);
      app.querySelector("input").value = "a@b.de";
      app.querySelector("#recGo").click();
      await new Promise(r => setTimeout(r, 5));
      gesehen.add(app.querySelector(".rz-eintrag").textContent.trim());
    }
    expect(gesehen.size, `unterschiedliche Quittungen: ${[...gesehen].join(" | ")}`).toBe(1);
  });

  it("das 429 wird verschluckt — auch das waere eine Auskunft", () => {
    // Der leere catch ist Absicht und traegt eine Begruendung im Code.
    expect(SCREEN).toMatch(/catch \{ \/\* still, mit Absicht \*\/ \}/);
    expect(SCREEN, "Verzweigung nach Status").not.toMatch(/status\s*===/);
  });

  it("der Sprachwechsel baut neu UND nimmt den Fehler-Vorspann mit", async () => {
    const app = await rendere({ code: "link_used" });
    app.querySelector('[data-wspr="en"]').click();
    expect(app.querySelector(".rz-h1").textContent).toBe(en["wieder.einmalTitel"]);
    expect(app.querySelector(".rz-caps").textContent).toBe(en["wieder.einmalCaps"]);
  });

  it("localStorage bleibt in try/catch (Safari privat)", () => {
    expect(SCREEN).toMatch(/try \{ localStorage\.setItem\("pb\.sprache"[\s\S]{0,60}catch/);
  });

  it("harte Fehler gehen weiterhin in fehlerBox — die Lage hat keinen Weg", () => {
    expect(CLIENT).toContain("fehlerBox(fehlerText(e)) + rechtsFuss()");
    expect(CLIENT).toContain("function fehlerBox(");
  });
});

/* ---------- Nachbesserungen nach dem ersten Blick auf den Screen ---------- */

describe("L3a · Was am gebauten Screen auffiel", () => {
  it("der Titel benennt den Handgriff, nicht den Mangel", async () => {
    const app = await rendere();
    expect(app.querySelector(".rz-h1").textContent).toBe("Zugangslink für deinen Account.");
    expect(app.textContent).not.toContain("Kein Zugang auf diesem Gerät");
    expect(en["wieder.titel"]).toBe("Access Link for Your Account.");
  });

  it("das Badge ist kein Knopf — und sieht auch nicht so aus", async () => {
    const app = await rendere();
    const badge = app.querySelector(".rz-badge-bedingung");
    expect(badge.tagName).toBe("SPAN");
    expect(badge.getAttribute("href")).toBeNull();
    // .rz-weg-badge setzt cursor:pointer und steht SPAETER in design.js —
    // ohne Verbundselektor gewinnt die spaetere Regel.
    expect(DESIGN).toContain(".rz-weg-badge.rz-badge-bedingung{cursor:default");
    const i = DESIGN.indexOf(".rz-weg-badge.rz-badge-bedingung");
    expect(DESIGN.slice(i, DESIGN.indexOf("}", i))).toContain("pointer-events:none");
  });

  it("die Bedien-Ecke ist vor dem Zugang weg und kommt mit der Sitzung zurueck", async () => {
    await rendere();
    expect(document.documentElement.getAttribute("data-vorzugang")).toBe("1");
    expect(DESIGN).toContain("html[data-vorzugang] .rz-ecke{display:none}");
    expect(CLIENT).toContain('doc.documentElement.removeAttribute("data-vorzugang")');
    const i = CLIENT.indexOf('removeAttribute("data-vorzugang")');
    expect(CLIENT.slice(i, i + 220)).toContain("createApp(");
  });

  it("die Form der Adresse wird geprueft — ihre Existenz nicht", async () => {
    const app = await rendere();
    const hinweis = app.querySelector("#recHinweis");
    for (const murks of ["abc", "a@b", "a b@c.de", "@example.org"]) {
      globalThis.fetch = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({}) }));
      app.querySelector("#recMail").value = murks;
      app.querySelector("#recGo").click();
      await new Promise(r => setTimeout(r, 5));
      expect(hinweis.textContent, murks).toBe(de["wieder.format"]);
      expect(globalThis.fetch, murks + ": Anfrage trotz Formfehler").not.toHaveBeenCalled();
      expect(app.querySelector(".rz-quittung"), murks).toBeNull();
    }
  });

  it("gueltige Adressen kommen durch — auch ungewoehnliche", async () => {
    for (const gut of ["a@b.de", "vor.nach+tag@sub.example.org", "x_y@firma-name.co.uk"]) {
      const app = await rendere();
      app.querySelector("#recMail").value = gut;
      app.querySelector("#recGo").click();
      await new Promise(r => setTimeout(r, 5));
      expect(app.querySelector(".rz-quittung"), gut).toBeTruthy();
    }
  });

  it("Desktop: Handgriffe ueber die ganze Spaltenbreite, Inhalt gespiegelt", () => {
    const breit = DESIGN.slice(DESIGN.indexOf(".rz-nur-breit{display:flex}"));
    expect(breit).toContain("#rzVorZugang .rz-eintrag,\n        #rzVorZugang .rz-extern{width:100%");
    expect(breit).not.toContain("max-width:420px");
    expect(breit).not.toContain("min-width:320px");
    // Gespiegelt: links oben, rechts unten.
    expect(breit).toContain("#rzVorZugang .rz-vor-papier .rz-vor-mitte{margin-top:34px;margin-bottom:auto}");
    expect(breit).toContain("#rzVorZugang .rz-vor-tief .rz-vor-mitte{margin-top:auto;margin-bottom:0}");
    // §4.3 · kein Text in den unteren 96px der Tiefgruen-Haelfte.
    expect(breit).toContain("padding-bottom:var(--rz-kulissenfrei)");
  });
});

/* ---------- Kontrast (§7.5) ---------- */

describe("L3 · Kontrast — kein Sekundaerton unter AA", () => {
  const leucht = hex => {
    const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map(x => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const verhaeltnis = (a, b) => {
    const [x, y] = [leucht(a), leucht(b)].sort((p, q) => q - p);
    return (x + 0.05) / (y + 0.05);
  };

  it("alle auf diesem Screen benutzten Toene halten 4.5:1", () => {
    const PAPIER = "#faf8f2", TIEF = "#1e2a22";
    const proben = [
      ["--rz-sek auf Papier", "#6b7261", PAPIER],
      ["--rz-marke auf Papier", "#5c6653", PAPIER],
      ["--rz-akzent-ink auf Papier", "#41562c", PAPIER],
      ["--rz-ink auf Papier", "#23291f", PAPIER],
      ["--rz-sek-auf-gruen", "#b9c3ac", TIEF],
      ["--rz-sek2-auf-gruen", "#8a9e7c", TIEF],
      ["--rz-ink-auf-gruen", "#eef0e7", TIEF],
      ["--rz-pfeil-auf-gruen", "#a9c88b", TIEF],
      ["Badge-Text auf Akzent", "#14201a", "#8fae74"],
    ];
    for (const [name, vorn, hinten] of proben)
      expect(verhaeltnis(vorn, hinten), `${name}: ${verhaeltnis(vorn, hinten).toFixed(2)}:1`)
        .toBeGreaterThanOrEqual(4.5);
  });

  it("der Rueckfall #a3a894 (2,30:1) kommt nicht zurueck", () => {
    expect(verhaeltnis("#a3a894", "#faf8f2")).toBeLessThan(3);   // Beleg, warum
    const l3Block = DESIGN.slice(DESIGN.indexOf(".rz-vor-papier"), DESIGN.indexOf(".rz-rechtsfuss{"));
    expect(l3Block).not.toContain("--rz-gedimmt");
    expect(l3Block).not.toContain("#a3a894");
  });
});

// @vitest-environment happy-dom
// S114 · Design- und Textschnitte in Vorräumen, Session und Einstieg.
//
// Sechs Befunde, eine gemeinsame Wurzel bei dreien davon: eine Regel, die an
// ZWEI Orten getroffen wird, driftet auseinander.
//
//   S114.6  Das Sprecherlabel fiel an drei Orten, die Regel stand an zweien.
//   S114.7  Der Pfeil zeigte die Lage statt der Bewegung.
//   S114.8  Der Wegweiser blieb bei aufgeklapptem Regal bedienbar.
//   S114.9  Die Desktop-Regeln des Wegweisers galten auch im Gespräch.
//   S114.11 Der Nahtabstand war einseitig.
//   S114.12 Die rollende Zone öffnete eine waagerechte Bildlaufleiste.
//
// Dazu die Textschnitte: getrennte Raumtitel, Introtexte, Boxen ohne
// verdoppelte Überschriften, Einstieg des Reflexionsgesprächs.

import { describe, it, expect, beforeEach } from "vitest";
import { DESIGN_CSS } from "../../core/ui/design.js";
import { createApp } from "../../core/ui/app.js";
import { Repo } from "../../core/store/repo.js";
import { Bstate, Pstate } from "../../core/store/bundles.js";
import { MemoryStore } from "../../core/store/store.js";
import { freigebeUebergabe } from "../../core/engine/freigabe.js";
import { uebergabeTeilKey } from "../../core/contracts/uebergabe.js";
import { de } from "../../core/i18n/de.js";
import { en } from "../../core/i18n/en.js";
import { reflexionsPrompt } from "../../core/prompts/prompts.de.js";
import { reflexionsPrompt as reflexionsPromptEn } from "../../core/prompts/prompts.en.js";

const tick = () => new Promise(r => setTimeout(r, 0));
const ruhe = async (n = 6) => { for (let i = 0; i < n; i++) await tick(); };
const klick = async el => { el.dispatchEvent(new Event("click", { bubbles: true })); await ruhe(); };

function memoryBackend(role = "A") {
  const store = new MemoryStore();
  const repo = new Repo({ store, ns: "T", code: "s114", activeModuleId: "betrieb" });
  const bstate = new Bstate(repo), pstate = new Pstate(repo);
  return {
    store, repo,
    async info() { return { role, name: "Anna", partner: "Bernd", nameA: "Anna", nameB: "Bernd" }; },
    bstate: { get: f => bstate.get(f), set: (f, v) => bstate.set(f, v) },
    pstate: { get: f => pstate.get(role, f), set: (f, v) => pstate.set(role, f, v) },
    chat: {
      load: (art, id) => repo.get("chat:" + (art === "shared" ? id : role + ":" + id), art === "shared"),
      save: (art, id, c) => repo.set("chat:" + (art === "shared" ? id : role + ":" + id), c, art === "shared"),
    },
    handover: { post: d => freigebeUebergabe(repo, role, d), get: r => repo.get(uebergabeTeilKey(r), true, "kernwetten") },
    llm: async () => ({ text: "ok", stop: "end_turn" }),
  };
}

let root;
beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById("app");
});

async function bootApp(backend = memoryBackend()) {
  const app = createApp({ doc: document, backend, root });
  await app.boot();
  await ruhe();
  return app;
}

/* ============ Texte ============ */

describe("S114.1/2 · Der Titel nennt, wessen Raum das ist", () => {
  it("die beiden Vorräume tragen verschiedene Titel", async () => {
    await bootApp();
    expect(root.querySelector("#scrMyRoom .rz-h1").textContent).toBe(de["zone.raumMein"]);
    expect(root.querySelector("#scrShared .rz-h1").textContent).toBe(de["zone.raumTeil"]);
    expect(de["zone.raumMein"]).not.toBe(de["zone.raumTeil"]);
  });

  it("der alte gemeinsame Schlüssel ist fort — nicht bloß ungenutzt", () => {
    // S113-Wächter: ein Schlüssel ohne Aufrufer ist totes Material.
    expect("zone.raum" in de).toBe(false);
    expect("zone.raum" in en).toBe(false);
  });

  it("das Intro des eigenen Raums kommt ohne Platzhalter aus", async () => {
    await bootApp();
    const txt = root.querySelector("#meinIntro").textContent;
    expect(txt).toContain("nur für dich");
    expect(txt).not.toContain("{");     // {partner} ist entfallen, nicht unersetzt
    expect(de["mein.intro"]).not.toContain("{partner}");
    expect(en["mein.intro"]).not.toContain("{partner}");
  });
});

describe("S114.4 · Die Boxen wiederholen ihre Regalzeile nicht mehr", () => {
  it("Zeitleiste und Agenda tragen einen Hilfetext statt einer Überschrift", async () => {
    await bootApp();
    await klick(root.querySelector("#btnMyRoom"));
    expect(root.querySelector("#boxZeitleiste").textContent).toContain(de["zeitleiste.hilfe"]);
    await klick(root.querySelector("#btnZurueck1"));
    await klick(root.querySelector("#btnSharedRoom"));
    expect(root.querySelector("#boxAgenda").textContent).toContain(de["agenda.hilfe"]);
  });

  it("die Regalzeile heißt 'Gemeinsamer Fokus'", async () => {
    await bootApp();
    await klick(root.querySelector("#btnSharedRoom"));
    expect(root.querySelector("#btnAgenda").textContent).toContain("Gemeinsamer Fokus");
  });

  it("die entfallenen Überschriften sind auch als Schlüssel fort", () => {
    for (const k of ["momente.titel", "regal.intro", "agenda.titel", "zeitleiste.titel"]) {
      expect(k in de, k).toBe(false);
      expect(k in en, k).toBe(false);
    }
  });

  it("die neuen Schlüssel stehen in beiden Wörterbüchern", () => {
    for (const k of ["zone.raumMein", "zone.raumTeil", "agenda.hilfe", "zeitleiste.hilfe"]) {
      expect(k in de, k).toBe(true);
      expect(k in en, k).toBe(true);
    }
  });
});

describe("S114.5 · Der Einstieg des Reflexionsgesprächs", () => {
  const de_ = reflexionsPrompt("Anna", "Bernd");
  const en_ = reflexionsPromptEn("Anna", "Bernd");

  it("kalter Start fragt nach dem, was gerade da ist — und sagt 'Hier gilt'", () => {
    const t = de_;
    expect(t).toContain("welche Themen dich gerade beschäftigen");
    expect(t).toContain("Hier gilt: Dieser Raum gehört ganz dir");
    // "Wie immer" gehört zur Wiederkehr, nicht zum ersten Mal.
    expect(t).not.toContain("Wie immer: Dieser Raum gehört ganz dir, du entscheidest.\" Hier");
  });

  it("die Wiederkehr hat eine Standardfassung UND behält den Vorrang des konkreten Ankers", () => {
    const t = de_;
    expect(t).toContain("Was davon hat dich noch weiter bewegt?");
    expect(t).toContain("STANDARDFASSUNG");
    // Ohne diesen Vorrang widerspräche die generische Fassung der
    // MERKPOSTEN-Regel, die genau sie zum Verstoß erklärt.
    expect(t).toContain("VORRANG");
    expect(t).toContain("MERKPOSTEN");
  });

  it("dasselbe steht im englischen Korpus", () => {
    const t = en_;
    expect(t).toContain("DEFAULT WORDING");
    expect(t).toContain("PRECEDENCE");
    expect(t).toContain("What of it has kept moving you?");
  });
});

/* ============ Verhalten ============ */

describe("S114.7 · Der Pfeil zeigt die Bewegung", () => {
  it("geschlossen nach oben, offen nach unten — in beiden Räumen gleich", async () => {
    await bootApp();
    await klick(root.querySelector("#btnMyRoom"));
    const pfeil = id => root.querySelector("#" + id + " .rz-pfeil").textContent;
    expect(pfeil("btnZeitleiste")).toBe("\u2191");
    await klick(root.querySelector("#btnZeitleiste"));
    expect(pfeil("btnZeitleiste")).toBe("\u2193");
    await klick(root.querySelector("#btnZeitleiste"));
    expect(pfeil("btnZeitleiste")).toBe("\u2191");
  });

  it("auch im Startmarkup — nicht erst nach dem ersten Klick", async () => {
    await bootApp();
    for (const el of root.querySelectorAll("[data-box] .rz-pfeil"))
      expect(el.textContent).toBe("\u2191");
  });
});

describe("S114.8 · Bei aufgeklapptem Regal ist der Wegweiser still", () => {
  /* S114j · Die Sperre gilt nur noch schmal. Zweispaltig fährt das Badge
     nicht mit der Kante, sondern bleibt auf der Naht stehen (Q3) — dort war
     die Sperre sogar schädlich: Der Klick fiel durch das Badge hindurch und
     schloss links das Regal.
     happy-dom meldet standardmäßig ein breites Fenster, der schmale Fall wird
     deshalb über matchMedia vorgetäuscht. */
  const mitBreite = (breit, fn) => async () => {
    const echt = document.defaultView.matchMedia;
    document.defaultView.matchMedia = () => ({ matches: breit });
    try { await fn(); } finally { document.defaultView.matchMedia = echt; }
  };

  it("das Badge nimmt schmal keine Klicks mehr an", mitBreite(false, async () => {
    await bootApp();
    await klick(root.querySelector("#btnSharedRoom"));
    const badge = root.querySelector("#wegBadgeTeil");
    expect(badge.disabled).toBe(false);
    await klick(root.querySelector("#btnRegal"));
    expect(badge.disabled).toBe(true);
    expect(badge.getAttribute("aria-disabled")).toBe("true");
    await klick(root.querySelector("#btnRegal"));
    expect(badge.disabled).toBe(false);
  }));

  it("zweispaltig bleibt es bedienbar", mitBreite(true, async () => {
    await bootApp();
    await klick(root.querySelector("#btnSharedRoom"));
    const badge = root.querySelector("#wegBadgeTeil");
    await klick(root.querySelector("#btnRegal"));
    expect(badge.disabled).toBe(false);
    expect(badge.getAttribute("aria-disabled")).toBe("false");
  }));

  it("die Sperre steht als Grundregel und wird zweispaltig zurückgenommen", () => {
    expect(DESIGN_CSS).toContain(".rz-regal-offen .rz-weg-badge{z-index:6;pointer-events:none}");
    expect(DESIGN_CSS).toContain(".rz-split.rz-regal-offen .rz-weg-badge{pointer-events:auto}");
  });

  it("ein offenes Panel wird beim Aufklappen geschlossen, nicht überdeckt", async () => {
    await bootApp();
    await klick(root.querySelector("#btnSharedRoom"));
    const panel = root.querySelector("#wegTeil");
    panel.classList.add("rz-offen");
    await klick(root.querySelector("#btnRegal"));
    expect(panel.classList.contains("rz-offen")).toBe(false);
  });

  it("sichtbar bleibt es trotzdem — es markiert weiter die Naht", () => {
    expect(DESIGN_CSS).not.toMatch(/\.rz-regal-offen \.rz-weg-badge\{[^}]*display:none/);
    expect(DESIGN_CSS).toContain(".rz-regal-offen .rz-weg-badge{z-index:6;pointer-events:none}");
  });
});

/* ============ Layout ============ */

describe("S114.9/10/e · Der Wegweiser im Gespräch und auf dem Desktop", () => {
  it("die Desktop-Regeln gelten nur der Zweiteilung", () => {
    // Ohne .rz-split davor trafen sie auch #scrChat: dort gibt es keine
    // senkrechte Naht, das Panel rutschte auf halbe Höhe der Schreibkante.
    expect(DESIGN_CSS).toContain(".rz-split .rz-weg-panel{");
    expect(DESIGN_CSS).not.toMatch(/\n\s*\.rz-weg-panel\{position:fixed/);
  });

  /* S114e · Der Rest des Befunds, den S114.9/10 nicht erklärt haben: Das Band
     erschien beim Aufklappen nur über der rechten Spalte und sprang am Ende
     der Bewegung auf volle Breite — sofort und bei jedem Öffnen.
     Am Gerät eingegrenzt: Der Fehler verschwindet, sobald im Inspektor ein
     Element INNERHALB der zweiten Hälfte ausgewählt wird, und kehrt sonst
     zurück; an opacity und z-index liegt es nicht. Ein Zustand, den eine
     Auswahl im Inspektor repariert, ist kein CSS-Zustand — die Auswahl
     erzwingt ein Neuzeichnen. Es war das Klipprechteck des Rollbereichs, in
     dem das Band im Baum liegt: in Spaltenbreite gehalten und beim Aufklappen
     nicht neu gerechnet. position:fixed nimmt es aus diesem Rollbereich. */
  it("das Band hängt am Viewport, nicht im Rollbereich", () => {
    const ab = DESIGN_CSS.indexOf(".rz-split .rz-weg-panel{");
    const regel = DESIGN_CSS.slice(ab, DESIGN_CSS.indexOf("}", ab) + 1);
    expect(regel).toContain("position:fixed");
    expect(regel).toContain("top:50dvh");
    // Dieselbe Linie wie zuvor top:50%: die Zweiteilung ist höhenfest 100dvh.
    expect(DESIGN_CSS).toContain(".rz-split:not(.rz-regal-offen){height:100dvh}");
  });

  /* S114j · Die 200%-Rechnung ist ganz fort. Sie galt zuletzt nur noch dem
     aufgeklappten Regal und setzte voraus, dass die Spalte der Bezugsrahmen
     ist — mit position:fixed ist es der Viewport, in beiden Zuständen. */
  it("die 200%-Rechnung ist fort", () => {
    expect(DESIGN_CSS).not.toContain("width:200%;margin-left:-100%");
    expect(DESIGN_CSS).not.toContain(".rz-split:not(.rz-regal-offen) .rz-weg-panel");
  });
});

describe("S114.11 · Der Nahtabstand ist beidseitig", () => {
  it("beide Flanken lesen denselben Token", () => {
    expect(DESIGN_CSS).toContain(".rz-fuss{padding-bottom:var(--rz-nahtfrei)}");
    expect(DESIGN_CSS).toContain("margin-top:calc(50dvh + var(--rz-nahtfrei))");
  });

  /* S114d · Nachgerechnet: links endet die letzte Zeile bei
     50dvh - 30px - nahtfrei, der Abstand zur Naht ist also 30px + nahtfrei
     (Zonenpolster PLUS Token). Rechts beginnt die Gruppe bei 30px + margin-top;
     fuer denselben Abstand muss margin-top 50dvh + nahtfrei sein. Die "- 30px"
     aus Q3a rechneten das Polster weg, statt es mitzuzaehlen. */
  it("die Flanke rechnet das Zonenpolster nicht mehr weg", () => {
    expect(DESIGN_CSS).not.toContain("calc(50dvh - 30px + var(--rz-nahtfrei))");
    expect(DESIGN_CSS).not.toContain("margin-top:calc(50dvh - 30px)");
  });
});

/* S114d · Die Spaltenueberschrift der zweiten Haelfte gehoert an den unteren
   Rand — spiegelbildlich zur Ueberschrift oben in der ersten. Sie lebt dafuer
   von .rz-fuss{margin-top:auto}; die Nullstellung nach den Regalreihen traf
   aber JEDES Geschwister und damit auch den Zonenfuss. */
describe("S114d · Die Spaltenüberschrift fällt an den Fuß", () => {
  it("die Nullstellung nimmt den Zonenfuß aus", () => {
    expect(DESIGN_CSS).toContain(">.rz-regal-reihen~*:not(.rz-fuss){margin-top:0}");
    expect(DESIGN_CSS).toContain(".rz-fuss{margin-top:auto}");
  });

  it("die Überschrift steht als letztes Kind ihrer Hälfte", async () => {
    await bootApp();
    await klick(root.querySelector("#btnSharedRoom"));
    const zone = root.querySelector("#scrShared > .rz-half:last-child");
    const fuss = zone.querySelector(".rz-fuss");
    expect(fuss.querySelector(".rz-h2")).toBeTruthy();
    // Nach dem Zonenfuss folgt nur noch Kulisse (die Fussmarke ist absolut
    // positioniert und nimmt keinen Platz im Fluss).
    const imFluss = [...zone.children].filter(e =>
      !e.classList.contains("pb-hidden") &&
      !e.classList.contains("rz-fussmarke") &&
      !e.classList.contains("rz-kulisse-fuss") &&
      !e.classList.contains("rz-weg-panel") &&
      !e.classList.contains("rz-weg-badge"));
    expect(imFluss[imFluss.length - 1]).toBe(fuss);
  });
});

describe("S114.11a · Das Ortsetikett steht an seiner Zeile", () => {
  it("unter der Hairline der Betreten-Zeile, nicht im Zonenfuß", async () => {
    await bootApp();
    const zone = root.querySelector("#scrStart .rz-tiefgruen");
    const etikett = zone.querySelector(".rz-caps-unter");
    expect(etikett.textContent).toBe(de["start.capsTeil"]);
    const kinder = [...zone.children];
    expect(kinder.indexOf(etikett)).toBeGreaterThan(kinder.indexOf(root.querySelector("#btnSharedRoom")));
    expect(zone.querySelector(".rz-fuss .rz-caps")).toBe(null);
    // Gespiegelt zur ersten Hälfte, wo es über der Linie steht.
    expect(root.querySelector("#scrStart .rz-papier .rz-caps-ueber")).toBeTruthy();
    expect(DESIGN_CSS).toContain(".rz-caps-unter{margin-top:11px}");
  });

  /* S114.11b · Der Abstand hielt nur auf dem Handy. Ab 900px stand das
     Etikett in BEIDEN Flankenregeln: erst bekam es die Flankenhoehe, dann
     nahm die Nullstellung sie ihm wieder ab — und mit ihr die eigenen 11px
     (0-3-2 sticht 0-1-0). Auf dem Desktop klebte es damit an der Haarlinie. */
  it("die Desktop-Flanke fasst das Etikett nicht an", () => {
    const desktop = DESIGN_CSS.slice(DESIGN_CSS.indexOf("@media(min-width:900px){"));
    const flanke = desktop.slice(0, desktop.indexOf("Grundbaustein B"));
    expect(flanke).not.toContain(">.rz-half:last-child>.rz-caps");
    expect(flanke).not.toContain(">.rz-half:last-child>.rz-zeile~.rz-caps");
    // Die Flanke misst weiter, was ZUERST in der Haelfte steht.
    expect(flanke).toContain(">.rz-half:last-child>.rz-zeile,");
  });
});

/* S114h · Auf dem Desktop ist die erste Haelfte die linke SPALTE, nicht die
   obere Zone. Die Regal-Mechanik ist fuer die waagerechte Naht gebaut und
   setzt sie beim Aufklappen auf ihr gemessenes Mass — mitsamt dem Wegfall des
   Nahtabstands, weil der nur :not(.rz-regal-offen) gilt. Ergebnis: Beim
   Oeffnen des Regals rechts sprangen die Zeilen links an den unteren Rand. */
describe("S114h · Beim Aufklappen steht die linke Spalte still", () => {
  const desktopBloecke = () =>
    DESIGN_CSS.split("@media(min-width:900px){").slice(1)
      .map(q => q.slice(0, q.indexOf("\n      }")));

  it("die linke Spalte behält ihre Höhe statt auf das Zonenmaß zu fallen", () => {
    const treffer = desktopBloecke().filter(q =>
      q.includes(".rz-regal-offen>.rz-half:first-child{height:100dvh}"));
    expect(treffer.length).toBe(1);
  });

  it("der Nahtabstand gilt auch im aufgeklappten Zustand", () => {
    // Q3a hängt margin-bottom:50dvh an :not(.rz-regal-offen) — auf dem Desktop
    // muss der Abstand bleiben, sonst sackt der Zonenfuß nach unten.
    const treffer = desktopBloecke().filter(q =>
      q.includes(".rz-regal-offen>.rz-half:first-child .rz-fuss{margin-bottom:50dvh}"));
    expect(treffer.length).toBe(1);
  });

  /* S114i · Umgekehrt zu S114h: --rz-regal-top ist die Höhe der Kopfzeile,
     und die bleibt frei — sonst legt sich die Regal-Zone (z-index:2) über
     Rückweg und Einstellungen. Der scheinbare Sprung beim Öffnen ist genau
     dieser Zweck, kein Fehler. Gilt senkrecht wie waagerecht. */
  it("die Regal-Zone lässt die Kopfzeile frei", () => {
    const treffer = desktopBloecke().filter(q =>
      q.includes(".rz-regal-offen>.rz-half:last-child{top:0}"));
    expect(treffer.length).toBe(0);
    // Es bleibt bei der Grundregel, die unterhalb des Kopfes ansetzt.
    expect(DESIGN_CSS).toContain("top:var(--rz-regal-top,0px);z-index:2");
  });

  it("mobil bleibt die Zonen-Mechanik unberührt", () => {
    expect(DESIGN_CSS).toContain(".rz-regal-offen>.rz-half:first-child{position:absolute;top:0;left:0;right:0;height:var(--rz-oben-h,50%)}");
    expect(DESIGN_CSS).toContain("top:var(--rz-regal-top,0px);z-index:2");
  });
});

describe("S114.12 · Keine waagerechte Bildlaufleiste über der Naht", () => {
  it("die rollende Zone schneidet die andere Achse ab", () => {
    // overflow-y:auto macht die andere Achse implizit zu "auto" — jeder
    // waagerechte Überlauf legte die Leiste an den unteren Rand DIESER Zone,
    // also direkt über der Naht. Die Abfangregel am Screen wurde nie erreicht.
    expect(DESIGN_CSS).toMatch(/#scrChat \.rz-chat-oben\{[^}]*overflow-x:clip/);
    expect(DESIGN_CSS).toMatch(/#scrChat \.rz-chat-oben\{[^}]*overflow-y:auto/);
  });
});

/* S114c · Die Schreibkante hatte ZWEI Ausblut-Rezepte mit einer Luecke
   dazwischen: unter ~690px reichte der negative Screenrand bis zur
   Fensterkante, ab 900px griff calc(50% - 50vw). Im Bereich dazwischen ist
   .rz-chat-innen bereits schmaler als das Fenster (max-width:640px, zentriert)
   — der negative Rand endet dort an der Spaltenkante, nicht an der Fenster-
   kante. Die Schreibkante stand als freies Rechteck auf Papier. */
describe("S114c · Die Schreibkante blutet in jeder Breite aus", () => {
  const kante = () => {
    const ab = DESIGN_CSS.slice(DESIGN_CSS.indexOf("#scrChat .rz-chat-unten{"));
    return ab.slice(0, ab.indexOf("}") + 1);
  };

  it("eine Rechnung, keine Breitenschranke", () => {
    expect(kante()).toContain("calc(50% - 50vw)");
    // Das alte Rezept fuer schmale Schirme ist aufgegangen, nicht ergaenzt:
    // sonst stuenden wieder zwei Zahlen fuer dieselbe Kante.
    expect(kante()).not.toContain("var(--rz-r-5) calc(-1 * var(--rz-rand))");
  });

  it("das Polster kann nicht negativ werden", () => {
    // Ist das Fenster schmaler als die Lesespalte, wird 50vw - spalte/2
    // negativ — ohne Klammer nach unten fiele das Screenpolster weg.
    expect(kante()).toContain("max(var(--rz-rand), calc(50vw - var(--rz-chat-spalte) / 2))");
  });

  it("keine zweite Regel in einer 900px-Query mehr", () => {
    const queries = DESIGN_CSS.split("@media(min-width:900px){");
    for (const q of queries.slice(1))
      expect(q.slice(0, q.indexOf("\n      }"))).not.toContain(".rz-chat-unten");
  });
});

describe("S114.13/14 · Die Pille ist fort", () => {
  it("Knöpfe sind flach und kantig, nicht rund und gefüllt", () => {
    expect(DESIGN_CSS).toMatch(/\.pb-btn\{[^}]*border-radius:0/);
    expect(DESIGN_CSS).not.toMatch(/\.pb-btn\{[^}]*border-radius:var\(--rz-rund-pille\)/);
    // .primary betont über die KANTE, nicht über die Fläche.
    expect(DESIGN_CSS).toContain(".pb-btn.primary{border-color:var(--rz-akzent)");
    expect(DESIGN_CSS).not.toMatch(/\.pb-btn\.primary\{background:var\(--rz-akzent\)/);
  });

  it("Listeneinträge und Agenda-Gruppen sprechen Haarlinie und Caps", () => {
    expect(DESIGN_CSS).toMatch(/\.pb-item\{border-bottom:1px solid var\(--rz-hairline\)/);
    expect(DESIGN_CSS).toMatch(/\.pb-ag-block\{border:0/);
    expect(DESIGN_CSS).toMatch(/\.pb-ag-kopf\{[^}]*text-transform:uppercase/);
  });

  it("die Wahl-Karten der Sessions tragen die Trennlinie, keinen Rahmen", () => {
    expect(DESIGN_CSS).toMatch(/\.rz-blockknopf,\.rz-blockknopf-leise\{[^}]*border-top:1px solid var\(--rz-hairline\)/);
  });

  it("kein Radius mehr an Karte und Rangfolge-Platz", () => {
    expect(DESIGN_CSS).toMatch(/\.pb-card\{[^}]*border-radius:0/);
    expect(DESIGN_CSS).toMatch(/\.pb-platz\{[^}]*border-radius:0/);
  });
});

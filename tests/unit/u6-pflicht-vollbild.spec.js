// @vitest-environment happy-dom
// U6 · Wächter über den Pflicht-Screen (Turn 41 §1.2; S115 · Zwei-Zonen).
//
// Der Screen ist für manche der erste der App überhaupt — und der einzige, den
// man regulär nicht verlassen kann. Drei Dinge folgen daraus, und alle drei
// sind Negativ-Aussagen: kein Schleier, keine Bedien-Ecke, kein
// Wegweiser-Badge. Dazu die Fokusfalle, die das Nicht-Verlassen-Können auch
// für die Tastatur gelten lässt.
//
// S115 hat die Vollfläche durch die Zweiteilung ersetzt. Die Aussagen der
// beiden Aussehen-Tests bleiben — sie wechseln nur den Gegenstand: nicht mehr
// „die ganze Fläche ist Tiefgrün", sondern „es sind zwei Zonen wie überall,
// und der Screen bringt dafür keine eigenen Farben mit".

import { describe, it, expect, beforeEach } from "vitest";
import { DESIGN_CSS } from "../../core/ui/design.js";
import { THEME_CSS } from "../../core/ui/theme.js";
import { createApp } from "../../core/ui/app.js";

const KOMPONENTEN = DESIGN_CSS.slice(DESIGN_CSS.indexOf(THEME_CSS) + THEME_CSS.length);
const tick = () => new Promise(r => setTimeout(r, 0));
const ruhe = async (n = 6) => { for (let i = 0; i < n; i++) await tick(); };

function regel(selektor) {
  const i = KOMPONENTEN.indexOf(selektor + "{");
  if (i < 0) return "";
  return KOMPONENTEN.slice(i, KOMPONENTEN.indexOf("}", i) + 1);
}

function backendMitPflicht() {
  return {
    async info() {
      return { role: "A", name: "Anna", partner: "Bernd", nameA: "Anna", nameB: "Bernd",
        emailRequired: true, recoveryEmail: false };
    },
    bstate: { get: async () => null, set: async () => true },
    pstate: { get: async () => null, set: async () => true },
    chat: { load: async () => null, save: async () => true },
    llm: async () => ({ text: "ok", stop: "end_turn" }),
    recovery: { beginVerify: async () => {}, confirm: async () => {} },
  };
}

let root;
beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  document.documentElement.removeAttribute("data-pflicht");
  root = document.getElementById("app");
});

describe("U6 · Vollbild statt Karte auf Schleier", () => {
  it("deckt die Fläche ganz — kein Schleier, kein Radius", () => {
    const r = regel("#pbEmailPflicht");
    expect(r).toContain("inset:0");
    expect(r).not.toContain("border-radius");
    // Ein Schleier zeigt eine Umgebung, die man sieht, aber nicht erreichen
    // kann. Genau das soll es hier nicht geben.
    expect(r).not.toMatch(/rgba|opacity/);
  });

  /* S115 · Der Screen bringt KEINE eigenen Farben, Masse oder Lesespalten mit.
     Alles Sichtbare erbt er von .rz-split/.rz-half — das ist der ganze Punkt
     der Umstellung. Bekaeme er wieder eigene, waere er wieder ein Sonderfall,
     und Sonderfaelle driften. */
  it("bringt kein eigenes Aussehen mit — es erbt von der Zweiteilung", () => {
    const r = regel("#pbEmailPflicht");
    expect(r).not.toContain("background");
    expect(r).not.toContain("max-width");
    expect(r).not.toContain("padding");
    // Die Lesespalte von Turn 41 ist ersatzlos entfallen.
    expect(KOMPONENTEN).not.toContain(".rz-pflicht-spalte");
  });

  it("die Bedien-Ecke wird stillgelegt, nicht nur verdeckt", () => {
    expect(KOMPONENTEN).toContain("html[data-pflicht] .rz-ecke{display:none}");
  });
});

describe("U6 · im Betrieb", () => {
  it("kein Wegweiser-Badge und keine Bedien-Ecke im Kasten", async () => {
    const app = createApp({ doc: document, backend: backendMitPflicht(), root });
    await app.boot();
    await ruhe();
    const kasten = document.querySelector("#pbEmailPflicht");
    expect(kasten, "der Kasten steht").toBeTruthy();
    // Der Wegweiser nennt einen Ort; hier ist noch keiner betreten.
    expect(kasten.querySelector(".rz-weg-badge")).toBeNull();
    // S115 · Und gar kein Naht-Aufbau: die Naht bleibt hier unbesetzt.
    expect(kasten.querySelector(".rz-auf-naht")).toBeNull();
    expect(kasten.querySelector(".rz-ecke")).toBeNull();
    expect(document.documentElement.getAttribute("data-pflicht")).toBe("1");
  });

  /* S115 · Die Zweiteilung im Betrieb, nicht nur im Stylesheet. */
  it("steht als Zweiteilung: Papier oben, Tiefgrün unten", async () => {
    const app = createApp({ doc: document, backend: backendMitPflicht(), root });
    await app.boot();
    await ruhe();
    const kasten = document.querySelector("#pbEmailPflicht");
    const haelften = kasten.querySelectorAll(".rz-split > .rz-half");
    expect(haelften).toHaveLength(2);
    expect(haelften[0].classList.contains("rz-papier")).toBe(true);
    expect(haelften[1].classList.contains("rz-tiefgruen")).toBe(true);
    // Titel und Text oben, das Formular unten — die untere Zone handelt.
    expect(haelften[0].querySelector("#pflichtTitel")).toBeTruthy();
    expect(haelften[1].querySelector("[data-rec=mail]")).toBeTruthy();
  });

  /* S115 · Der Kopf trägt zwei blinde Pfeile statt eines Rückwegs — sie
     halten die Signatur mittig, ohne einen Ausgang zu zeichnen. */
  it("der Kopf zeichnet keinen Rückweg", async () => {
    const app = createApp({ doc: document, backend: backendMitPflicht(), root });
    await app.boot();
    await ruhe();
    const kasten = document.querySelector("#pbEmailPflicht");
    const pfeile = [...kasten.querySelectorAll(".rz-kopf .rz-zurueck")];
    expect(pfeile).toHaveLength(2);
    expect(pfeile.every(p => p.classList.contains("rz-blind"))).toBe(true);
    expect(pfeile.every(p => p.tagName !== "BUTTON")).toBe(true);
  });

  it("Signatur oben, Wortmarke unten — Ton und Absender", async () => {
    const app = createApp({ doc: document, backend: backendMitPflicht(), root });
    await app.boot();
    await ruhe();
    const kasten = document.querySelector("#pbEmailPflicht");
    // Die Signatur hängt sonst an setzeSignatur(), das nur den App-Baum kennt.
    expect(kasten.querySelector(".rz-signatur").textContent).toContain("Anna");
    expect(kasten.querySelector(".rz-fussmarke").textContent).toBeTruthy();
  });

  it("er trägt sich als Dialog aus, aus dem es kein Außen gibt", async () => {
    const app = createApp({ doc: document, backend: backendMitPflicht(), root });
    await app.boot();
    await ruhe();
    const kasten = document.querySelector("#pbEmailPflicht");
    expect(kasten.getAttribute("role")).toBe("dialog");
    expect(kasten.getAttribute("aria-modal")).toBe("true");
    expect(kasten.querySelector("#" + kasten.getAttribute("aria-labelledby"))).toBeTruthy();
  });

  it("der Fokus liegt auf dem Adressfeld", async () => {
    const app = createApp({ doc: document, backend: backendMitPflicht(), root });
    await app.boot();
    await ruhe();
    expect(document.activeElement.getAttribute("data-rec")).toBe("mail");
  });

  it("die Fokusfalle sammelt die Elemente bei jedem Tab neu", async () => {
    // Schritt 2 ist anfangs stummgeschaltet (§5.4) und wird es bei
    // abgelaufenem Code wieder. Eine feste Liste hätte den Fokus dann auf ein
    // totes Feld geschickt — deshalb wird live gefiltert.
    const app = createApp({ doc: document, backend: backendMitPflicht(), root });
    await app.boot();
    await ruhe();
    const kasten = document.querySelector("#pbEmailPflicht");
    const offen = () => [...kasten.querySelectorAll("input,button")].filter(e => !e.disabled);
    expect(offen()).toHaveLength(2);            // Adresse + "Code senden"

    const letzte = offen()[offen().length - 1];
    letzte.focus();
    kasten.dispatchEvent(new document.defaultView.KeyboardEvent(
      "keydown", { key: "Tab", bubbles: true, cancelable: true }));
    await ruhe();
    expect(document.activeElement.getAttribute("data-rec"), "vom Ende zurück an den Anfang").toBe("mail");
  });
});

// S121.2 · Welche Hälfte klebt — gemessen, nicht festgelegt.
//
// Turn 48 §2.3 sagt: Die KURZE Hälfte klebt, damit sie im Blick bleibt,
// während die lange läuft. Und es nennt eine Ausnahme: Wird die kurze Hälfte
// selbst höher als das Fenster, darf sie NICHT kleben — sonst friert sie oben
// fest und ihr unteres Ende wird nie erreichbar.
//
// Im Bau der Landing ließ sich das als Klasse ins Markup schreiben: Dort ist
// immer dieselbe Seite kurz. In der App nicht. Welche Spalte länger ist, hängt
// am Inhalt und ändert sich mit ihm — die Zeitleiste eines Paares nach drei
// Monaten ist länger als am ersten Tag, die englische Fassung länger als die
// deutsche, und ein niedriges Fenster dreht das Verhältnis ohnehin um.
//
// Also messen. Die Regel:
//
//   Eine Hälfte klebt genau dann, wenn ihr eigener Inhalt ins Fenster passt
//   UND die andere Hälfte höher ist als das Fenster.
//
// Beide kurz -> es gibt nichts zu rollen, niemand klebt.
// Beide lang -> keine kann kleben, ohne ihr eigenes Ende zu verlieren.
//
// Der Rückfall ist IMMER "klebt nicht". Ein Messfehler kostet damit Eleganz,
// nie Inhalt: Die Spalte rollt dann eben normal mit.

/** Klasse, die das Stylesheet auf position:sticky umschaltet. */
export const KLEBT = "rz-klebt";

/** Ab hier steht die Naht senkrecht (Turn 46, unverändert in Turn 48 §3). */
export const DESKTOP_AB = 900;

/**
 * Die Entscheidung als reine Funktion — der Kern dieses Schritts.
 * @param {number} ersteHoehe   Inhaltshöhe der ersten Hälfte
 * @param {number} zweiteHoehe  Inhaltshöhe der zweiten Hälfte
 * @param {number} fensterHoehe
 * @returns {0|1|-1}  Index der klebenden Hälfte, oder -1 für "keine"
 */
export function bestimmeKleber(ersteHoehe, zweiteHoehe, fensterHoehe) {
  if (!(fensterHoehe > 0)) return -1;
  const erstePasst = ersteHoehe <= fensterHoehe;
  const zweitePasst = zweiteHoehe <= fensterHoehe;
  if (erstePasst && !zweitePasst) return 0;
  if (zweitePasst && !erstePasst) return 1;
  return -1;   // beide kurz oder beide lang
}

/**
 * Misst einen Screen und setzt die Klasse.
 * Gemessen wird OHNE die Klasse: Eine klebende Hälfte ist auf 100dvh
 * festgesetzt, ihre eigene Inhaltshöhe wäre sonst nicht mehr ablesbar — die
 * Messung würde ihr eigenes Ergebnis bestätigen.
 */
export function messeScreen(screen, win) {
  if (!screen || !win) return -1;
  const haelften = screen.querySelectorAll(":scope > .rz-half");
  if (haelften.length !== 2) return -1;

  for (const h of haelften) h.classList.remove(KLEBT);

  // Gestapelt (mobil) gibt es nur einen Rollweg und keine senkrechte Naht;
  // im aufgeklappten Regal ordnet die Zone ohnehin neu (D9/Q2).
  const breit = win.innerWidth >= DESKTOP_AB;
  if (!breit || screen.classList.contains("rz-regal-offen")) return -1;

  const kleber = bestimmeKleber(
    haelften[0].scrollHeight, haelften[1].scrollHeight, win.innerHeight);
  if (kleber >= 0) haelften[kleber].classList.add(KLEBT);
  return kleber;
}

/**
 * Hängt die Messung an einen Screen: einmal sofort, danach bei jeder
 * Größenänderung von Fenster oder Inhalt.
 * @returns {()=>void} Abmelder
 */
export function beobachteScreen(screen, win) {
  if (!screen || !win) return () => {};
  let angefordert = false;
  const messen = () => {
    angefordert = false;
    try { messeScreen(screen, win); } catch { /* Messung ist Komfort, nie Voraussetzung */ }
  };
  // Zusammenfassen: Ein ResizeObserver feuert je Kante und Element; ohne
  // Bündelung liefe die Messung mehrfach pro Bild.
  const anstossen = () => {
    if (angefordert) return;
    angefordert = true;
    if (typeof win.requestAnimationFrame === "function") win.requestAnimationFrame(messen);
    else setTimeout(messen, 0);
  };

  messen();
  win.addEventListener("resize", anstossen);

  let beobachter = null;
  if (typeof win.ResizeObserver === "function") {
    beobachter = new win.ResizeObserver(anstossen);
    for (const h of screen.querySelectorAll(":scope > .rz-half")) beobachter.observe(h);
  }

  return () => {
    win.removeEventListener("resize", anstossen);
    if (beobachter) beobachter.disconnect();
  };
}

/** Richtet die Messung für mehrere Screens ein. */
export function richteKlebenEin(screens, win) {
  const ab = [...screens].filter(Boolean).map(s => beobachteScreen(s, win));
  return () => { for (const f of ab) f(); };
}

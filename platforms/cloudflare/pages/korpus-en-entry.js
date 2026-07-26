// R5 · Eigener Bundle-Einstieg für den englischen Korpus.
//
// Der Pages-Client wird als IIFE gebaut; esbuild-Code-Splitting verlangt
// format "esm". Ein dynamisches import() erzeugt hier also keinen eigenen
// Chunk. Statt den Client auf ESM umzustellen (zöge Script-Tag, SW-Cache-Liste,
// native Hülle und Eval-Artefakt mit — Entscheidung F1a: nicht in diesem
// Sprint), bekommt der Korpus einen zweiten, eigenständigen Einstieg. Er legt
// sein Modul auf einem Global ab; der Client zieht die Datei per Script-Tag.
import * as en from "../../../core/prompts/prompts.en.js";
globalThis.__KORPUS_EN__ = en;

/* Build dist/qkc-engine.js (UMD) and dist/qkc-engine.mjs (ESM) from src/core.js */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const core = readFileSync(join(here, 'src/core.js'), 'utf8');
mkdirSync(join(here, 'dist'), { recursive: true });

const umd = `/*! QKC Engine — dependency-free JavaScript quiz engine. MIT (c) OuRi Corp */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(); }
  else if (typeof define === 'function' && define.amd) { define([], factory); }
  else { root.QKC = factory(); }
}(typeof self !== 'undefined' ? self : this, function () {
${core.replace('var QKC = (function () {', 'return (function () {')}
}));
`;

const esm = `/*! QKC Engine — dependency-free JavaScript quiz engine. MIT (c) OuRi Corp */
${core}
export default QKC;
export const VERSION = QKC.VERSION;
export const engine = QKC.engine;
export const validate = QKC.validate;
export const items = QKC.items;
export const rng = QKC.rng;
`;

writeFileSync(join(here, 'dist/qkc-engine.js'), umd);
writeFileSync(join(here, 'dist/qkc-engine.mjs'), esm);
console.log('built dist/qkc-engine.js', umd.length, 'bytes; dist/qkc-engine.mjs', esm.length, 'bytes');

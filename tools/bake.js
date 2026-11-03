// Pre-renders every animation frame of every fighter into pixel-art sprite sheets at build time,
// using Skia (the same 2D engine as Chrome). The game then ships the sheets as PNGs and does no
// sprite baking at runtime, so slow machines never stall on it.
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { createCanvas } = require('@napi-rs/canvas');

const ROOT = path.join(__dirname, '..');

function loadGame() {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const files = [...html.matchAll(/<script src="([^"]+)"/g)].map(m => m[1]).filter(f => !f.endsWith('main.js'));
  const sandbox = {
    console, Math, JSON, Date, Uint8Array, Map, Set, setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
    performance: { now: () => performance.now() }, requestAnimationFrame() {},
    localStorage: { getItem() { return null; }, setItem() {} }, navigator: { getGamepads: () => [] },
    document: { createElement: () => createCanvas(1, 1), addEventListener() {}, hidden: false },
  };
  sandbox.window = { addEventListener() {}, devicePixelRatio: 1 };
  vm.createContext(sandbox);
  vm.runInContext(files.map(f => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n;\n') +
    ';globalThis.__a={ROSTER,Render,enqueueWarm,Settings};', sandbox, { filename: 'bake-bundle.js' });
  const A = sandbox.__a;
  A.Settings.graphics = 'pixel';
  return A;
}

// Returns a JS snippet defining window.TF_PREBAKED for the given name variant.
function bake(mime = 'image/png') {
  const A = loadGame();
  const out = { mime, chars: {} };
  let bytes = 0, frames = 0;
  for (const def of A.ROSTER) {
    A.enqueueWarm(def);
    while (A.Render.warmQ.length) A.Render.warmQ.shift()();
    const at = def._atlas;
    const sheets = at.sheets.map(s => (mime === 'image/webp' ? s.c.encodeSync('webp', 100) : s.c.toBuffer('image/png')).toString('base64'));
    const sheetIndex = new Map(at.sheets.map((s, i) => [s.c, i]));
    const entries = {};
    for (const [key, spr] of at.map) entries[key] = [sheetIndex.get(spr.c), spr.sx, spr.sy, spr.sw, spr.sh, spr.left, spr.top];
    out.chars[def.id] = { sheets, entries };
    bytes += sheets.reduce((n, s) => n + s.length, 0);
    frames += at.map.size;
  }
  return { js: 'window.TF_PREBAKED = ' + JSON.stringify(out) + ';', bytes, frames };
}

module.exports = { bake };
if (require.main === module) {
  const r = bake();
  console.log(`baked ${r.frames} frames, ${(r.bytes / 1024).toFixed(0)} KB of PNG data`);
}

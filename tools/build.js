// Bundles index.html + all scripts into single self-contained offline files:
//   dist/TechFighter.html   (all sprite frames pre-rendered and embedded)
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

let count = 0;
html = html.replace(/<script src="([^"]+)"><\/script>/g, (m, src) => {
  const code = fs.readFileSync(path.join(ROOT, src), 'utf8');
  if (code.includes('</script')) throw new Error(`${src} contains a closing script tag`);
  count++;
  return `<script>/* ${src} */\n${code}\n</script>`;
});
html = html.replace('<title>', `<!-- Tech Fighter v${pkg.version} - single-file build -->\n<title>`);
fs.mkdirSync(DIST, { recursive: true });
// Every sprite frame is pre-rendered here and shipped inside the file, so players' machines never bake sprites.
const { bake } = require('./bake');
const MIME = process.env.TF_SPRITE_MIME || 'image/webp';
const inject = (h, extra) => h.replace('<script>/* js/util.js */', extra + '\n<script>/* js/util.js */');
const t0 = Date.now();
const sprites = bake(MIME);
console.log(`Pre-rendered ${sprites.frames} sprite frames (${MIME}) in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
const variants = [['TechFighter.html', inject(html, '<script>' + sprites.js + '</script>')]];
for (const old of ['TechFighter-ParodyNames.html', 'TechFighter-OriginalNames.html']) { try { fs.unlinkSync(path.join(DIST, old)); } catch (e) { /* not present */ } }
for (const [name, content] of variants) {
  const out = path.join(DIST, name);
  fs.writeFileSync(out, content);
  console.log(`Built ${path.relative(ROOT, out)} (${count} scripts inlined, ${(content.length / 1024).toFixed(0)} KB)`);
}

process.exit(0); // skip native canvas teardown

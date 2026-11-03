// Headless playtest: loads the game in a Node VM with a stub canvas and runs
// CPU-vs-CPU matches for every matchup, exercising update AND draw code.
// Usage: node tests/sim.js [framesPerMatch] [repeats]
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const files = [...html.matchAll(/<script src="([^"]+)"/g)].map(m => m[1]).filter(f => !f.endsWith('main.js'));

// --- stub 2D context: every method is a no-op, gradients have addColorStop
function makeCtx() {
  const grad = { addColorStop() {} };
  const target = { canvas: null, measureText: s => ({ width: String(s).length * 8 }), createLinearGradient: () => grad, createRadialGradient: () => grad, createConicGradient: () => grad, getImageData: () => ({ data: [] }) };
  return new Proxy(target, {
    get(t, k) { if (k in t) return t[k]; return () => undefined; },
    set(t, k, v) { t[k] = v; return true; },
  });
}
const listeners = {};
const sandbox = {
  console, Math, JSON, Date, setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
  performance: { now: () => Date.now() },
  requestAnimationFrame() {},
  localStorage: { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = String(v); } },
  navigator: { getGamepads: () => [] },
  document: {
    createElement: () => ({ width: 0, height: 0, getContext: () => makeCtx(), style: {} }),
    addEventListener() {}, hidden: false,
  },
};
sandbox.window = { addEventListener(n, f) { (listeners[n] = listeners[n] || []).push(f); }, devicePixelRatio: 1 };
vm.createContext(sandbox);
const code = files.map(f => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n;\n') + `
;globalThis.__api = { FightScene, ROSTER, CHARS, STAGES, Game, Settings, Fighter, CPU, Input, TitleScene, MenuScene, SelectScene, OptionsScene, HowToScene, CreditsScene, VsScene, ResultScene, EndingScene, ContinueScene, ArcadeRun };`;
vm.runInContext(code, sandbox, { filename: 'game-bundle.js' });
const api = sandbox.__api;
const ctx = makeCtx();

const FRAMES = +process.argv[2] || 60 * 60 * 3;
const REPEATS = +process.argv[3] || 1;
api.Settings.announcer = false;

// smoke-test every menu scene's update+draw
for (const S of ['TitleScene', 'MenuScene', 'CreditsScene']) { const s = new api[S](); for (let i = 0; i < 30; i++) { api.Input.poll(); s.update(); s.draw(ctx); } }
{ for (const m of ['arcade', 'versus', 'training']) { const s = new api.SelectScene(m); for (let i = 0; i < 30; i++) { api.Input.poll(); s.update(); s.draw(ctx); } } }
{ const s = new api.OptionsScene(() => {}); for (let i = 0; i < 10; i++) { s.update(); s.draw(ctx); } }
{ const s = new api.HowToScene(() => {}); for (let p = 0; p < s.pages.length; p++) { s.page = p; s.draw(ctx); } }
{ const s = new api.VsScene(api.CHARS.claude, api.CHARS.grok, 'launchpad', { mode: 'versus' }); for (let i = 0; i < 60; i++) { s.update(); s.draw(ctx); } }

const results = [];
let errors = 0, stuck = 0, timeouts = 0;
const chars = api.ROSTER;
const t0 = Date.now();
for (let rep = 0; rep < REPEATS; rep++) {
  for (const a of chars) for (const b of chars) {
    if (a === b && rep > 0) continue;
    let ended = null;
    const lvl = 1 + (rep % 3) * 0.6;
    const fs_ = new api.FightScene(a, b, b.stage, { mode: 'versus', demo: true, headless: true, level: lvl, level1: lvl, onEnd: info => { ended = info; } });
    api.Game.scene = fs_;
    const stateAge = [0, 0], lastState = ['', ''];
    let f = 0;
    try {
      for (; f < FRAMES && !ended; f++) {
        fs_.update();
        if (f % 3 === 0) fs_.draw(ctx);
        fs_.fighters.forEach((ft, i) => {
          if (ft.state === lastState[i] && !['intro', 'win', 'ko', 'stand', 'crouch', 'timeout', 'lose', 'down'].includes(ft.state)) stateAge[i]++;
          else stateAge[i] = 0;
          lastState[i] = ft.state;
          if (stateAge[i] === 400) { stuck++; console.log(`STUCK ${a.id} vs ${b.id}: fighter ${i} in ${ft.state} move=${ft.move && ft.move.key} y=${ft.y.toFixed(1)}`); }
          if (!isFinite(ft.x) || !isFinite(ft.y) || !isFinite(ft.hp)) throw new Error(`non-finite fighter value ${ft.state}`);
        });
      }
    } catch (e) { errors++; console.log(`ERROR ${a.id} vs ${b.id} @${f}:`, e.stack.split('\n').slice(0, 4).join('\n')); }
    if (!ended) timeouts++;
    const [p, q] = fs_.fighters;
    results.push({ a: a.id, b: b.id, res: ended ? ended.result : 'none', frames: f, dmgA: p.stats.dmg, dmgB: q.stats.dmg, supA: p.stats.supers, supB: q.stats.supers, comboA: p.stats.maxCombo, specA: p.stats.specials });
  }
}
const secs = (Date.now() - t0) / 1000;
// per-character win rates
const tally = {};
for (const r of results) {
  if (r.a === r.b) continue;
  tally[r.a] = tally[r.a] || { w: 0, n: 0 }; tally[r.b] = tally[r.b] || { w: 0, n: 0 };
  tally[r.a].n++; tally[r.b].n++;
  if (r.res === 'win') tally[r.a].w++; else if (r.res === 'lose') tally[r.b].w++;
}
console.log(`\nmatches=${results.length} errors=${errors} stuck=${stuck} unfinished=${timeouts} time=${secs.toFixed(1)}s`);
const avg = k => (results.reduce((s, r) => s + r[k], 0) / results.length).toFixed(1);
console.log(`avg match ${(avg('frames') / 60).toFixed(1)}s · avg dmg ${avg('dmgA')} · avg supers ${avg('supA')} · avg best combo ${avg('comboA')} · avg specials ${avg('specA')}`);
for (const [k, v] of Object.entries(tally).sort((x, y) => y[1].w / y[1].n - x[1].w / x[1].n)) console.log(`  ${k.padEnd(9)} win ${(100 * v.w / v.n).toFixed(0)}%  (${v.w}/${v.n})`);
process.exit(errors || stuck ? 1 : 0);

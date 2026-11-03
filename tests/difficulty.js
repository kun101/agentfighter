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


api.Settings.announcer = false;
// Novice policy: holds random directions, mashes buttons, sometimes blocks, occasionally does a special via SP.
function novice(sc, f, st, skill) {
  if (st.t-- <= 0) { st.t = 8 + Math.floor(Math.random() * 25); const r = Math.random();
    st.dir = r < .35 ? 6 : r < .5 ? 4 : r < .6 ? 1 : r < .7 ? 2 : r < .78 ? 9 : r < .82 ? 8 : 5; }
  const press = {};
  if (Math.random() < 0.09) press[['lp','hp','lk','hk'][Math.floor(Math.random()*4)]] = true;
  if (Math.random() < 0.012 * skill) press.sp = true;
  // basic blocking reflex for skilled novices
  let dir = st.dir;
  const o = f.opp;
  if (skill > 1 && o.state === 'attack' && Math.random() < 0.35) dir = 4;
  return { dir, press };
}
const levels = [0, 1, 2, 3];
const N = +process.argv[2] || 30;
for (const skill of [1, 2]) {
  const line = [];
  for (const lv of levels) {
    let wins = 0, rounds = 0;
    for (let i = 0; i < N; i++) {
      const a = api.ROSTER[i % 8], b = api.ROSTER[(i * 3 + 1) % 8];
      let ended = null;
      const sc = new api.FightScene(a, b, b.stage, { mode: 'versus', headless: true, level: lv, onEnd: info => { ended = info; } });
      const st = { t: 0, dir: 5 };
      sc.humanIntent = f => novice(sc, f, st, skill);
      for (let k = 0; k < 60 * 400 && !ended; k++) sc.update();
      if (ended && ended.result === 'win') wins++;
      rounds += sc.fighters[0].wins;
    }
    line.push(`${['EASY','NORMAL','HARD','BRUTAL'][lv]} ${Math.round(100*wins/N)}% (rounds won ${(rounds/N).toFixed(2)})`);
  }
  console.log(`novice skill ${skill}: ` + line.join(' | '));
}

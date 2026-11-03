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
;globalThis.__api = { FightScene, ROSTER, CHARS, STAGES, Game, Settings, Fighter, CPU, Input, TitleScene, MenuScene, SelectScene, OptionsScene, HowToScene, CreditsScene, VsScene, ResultScene, EndingScene, ContinueScene, ArcadeRun, Progress };`;
vm.runInContext(code, sandbox, { filename: 'game-bundle.js' });
const api = sandbox.__api;
const ctx = makeCtx();


api.Settings.announcer = false;
const G = api.Game;
const press = (b) => { api.Input._inject(b, true); api.Input.poll(); G.scene.update(); G.scene.draw(ctx); api.Input._inject(b, false); };
const run = (n) => { for (let i = 0; i < n; i++) { api.Input.poll(); G.scene.update(); if (i % 4 === 0) G.scene.draw(ctx); } };
const name = () => G.scene.constructor.name;
const log = [];
const note = s => { if (log[log.length - 1] !== s) log.push(s); };
// strong player bot for P1 in fights
let playerLevel = 3, loseOnce = true;
const origHI = api.FightScene.prototype.humanIntent;
api.FightScene.prototype.humanIntent = function (f) {
  if (!this._pc) this._pc = new api.CPU(f, playerLevel);
  if (loseOnce && this.opts.arcade && this.opts.arcade.idx === 2) return { dir: 5, press: {} }; // stand still to lose
  return f.hitstop > 0 ? { dir: f.inp.dir, press: {} } : this._pc.think(this);
};
G.go(new api.TitleScene());
run(30); press('start'); note(name());           // Menu
run(10); press('start'); note(name());           // Arcade select
run(10); press('right'); press('right'); press('start'); note(name());
run(80); note(name());                            // VS
let guard = 0;
while (guard++ < 200000) {
  const n = name();
  note(n);
  if (n === 'VsScene') { run(200); continue; }
  if (n === 'FightScene') { run(60); continue; }
  if (n === 'ResultScene') { run(40); press('start'); continue; }
  if (n === 'ContinueScene') { loseOnce = false; run(40); press('start'); continue; }
  if (n === 'EndingScene') { run(200); press('start'); continue; }
  if (n === 'CreditsScene') { run(40); press('start'); continue; }
  if (n === 'TitleScene') break;
  if (n === 'GameOverScene') break;
  run(10);
}
console.log('flow:', log.join(' -> '));
console.log('unlockedBoss=', api.Progress ? api.Progress.unlockedBoss : sandbox.__api.Game && 'n/a');

// ---- Versus + pause menu + training flows
const log2 = [];
const note2 = s => { if (log2[log2.length - 1] !== s) log2.push(s); };
G.go(new api.MenuScene(1)); run(5); press('start'); note2(name());     // versus select
press('start'); press('right'); press('start'); run(60); note2(name());  // pick p1, cpu
run(200); note2(name());                                                // fight
run(400); press('back'); note2('paused=' + G.scene.paused);
press('down'); press('start'); note2('movelist=' + !!G.scene.pauseView); run(5); G.scene.draw(ctx);
press('back'); note2('movelistClosed=' + !G.scene.pauseView);
press('down'); press('start'); note2('restart phase=' + G.scene.phase + ' paused=' + G.scene.paused);
press('back'); press('down'); press('down'); press('down'); press('start'); note2(name());  // character select
press('back'); note2(name()); press('back'); note2(name());
// training
G.go(new api.MenuScene(2)); press('start'); press('start'); press('start'); run(60); note2(name()); run(200);
note2('training phase=' + G.scene.phase + ' timer=' + G.scene.timer);
press('back');
for (let i = 0; i < 2; i++) press('down');
press('right'); press('right'); press('right'); note2('dummy=' + G.scene.tr.dummy);
press('back'); run(600); note2('cpu dummy ok hp=' + G.scene.fighters[0].hp);
press('hitbox'); run(10); G.scene.draw(ctx); note2('hitbox=' + G.scene.tr.hitbox);
console.log('flow2:', log2.join(' -> '));

const ok = log.includes('EndingScene') && log2.includes('movelist=true') && log2.includes('hitbox=1');
console.log(ok ? 'FLOW OK' : 'FLOW FAILED');
process.exit(ok ? 0 : 1);

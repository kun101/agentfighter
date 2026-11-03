// Real-time playtest in an actual (unthrottled) Chrome via the DevTools protocol.
// Plays the built game at full speed with real keyboard events and measures frame timing.
// Usage: node tests/realtime.js [path-to-chrome] [build-file]
'use strict';
const { spawn } = require('child_process');
const fs = require('fs'), path = require('path'), os = require('os');

const CHROME = process.argv[2] || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const FILE = path.resolve(process.argv[3] || path.join(__dirname, '..', 'dist', 'TechFighter.html'));
const PORT = 9333;
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'tf-rt-'));
const sleep = ms => new Promise(r => setTimeout(r, ms));

const KEYS = {
  Enter: { key: 'Enter', code: 'Enter', vk: 13 }, Escape: { key: 'Escape', code: 'Escape', vk: 27 },
  ArrowUp: { key: 'ArrowUp', code: 'ArrowUp', vk: 38 }, ArrowDown: { key: 'ArrowDown', code: 'ArrowDown', vk: 40 },
  ArrowLeft: { key: 'ArrowLeft', code: 'ArrowLeft', vk: 37 }, ArrowRight: { key: 'ArrowRight', code: 'ArrowRight', vk: 39 },
  u: { key: 'u', code: 'KeyU', vk: 85 }, i: { key: 'i', code: 'KeyI', vk: 73 }, j: { key: 'j', code: 'KeyJ', vk: 74 }, k: { key: 'k', code: 'KeyK', vk: 75 }, l: { key: 'l', code: 'KeyL', vk: 76 },
};

async function main() {
  const chrome = spawn(CHROME, [`--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, '--headless=new', '--window-size=1920,1080',
    '--autoplay-policy=no-user-gesture-required', ...(process.env.TF_GPU ? ['--enable-gpu', '--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] : []), '--no-first-run', '--no-default-browser-check', 'about:blank'], { stdio: 'ignore' });
  let target;
  for (let i = 0; i < 50 && !target; i++) {
    await sleep(200);
    try { target = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find(t => t.type === 'page'); } catch (e) { /* not up yet */ }
  }
  if (!target) throw new Error('Chrome did not start');
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r));
  let id = 0; const pending = new Map(); const errors = [];
  ws.addEventListener('message', ev => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(m.params.args.map(a => a.value || a.description).join(' '));
  });
  const send = (method, params = {}) => new Promise(r => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  const evalJS = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.text + ' ' + (r.result.exceptionDetails.exception || {}).description); return r.result.result.value; };
  const key = async (name, type) => { const k = KEYS[name]; await send('Input.dispatchKeyEvent', { type, key: k.key, code: k.code, windowsVirtualKeyCode: k.vk }); };
  const tap = async (name, holdMs = 60) => { await key(name, 'keyDown'); await sleep(holdMs); await key(name, 'keyUp'); };
  const scene = () => evalJS('TechFighter.Game.scene.constructor.name');

  await send('Runtime.enable'); await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'file:///' + FILE.replace(/\\/g, '/') });
  await sleep(1500);
  // frame-time recorder
  await evalJS(`window.__ft=[]; (function rec(t){ if(window.__lt) __ft.push(t-__lt); window.__lt=t; requestAnimationFrame(rec); })(performance.now()); true`);
  const report = {};
  const log = [];
  await sleep(1000);
  log.push('title: ' + await scene());
  await tap('Enter'); await sleep(400); log.push('after Enter: ' + await scene());
  await tap('ArrowDown'); await tap('Enter'); await sleep(400); log.push('versus: ' + await scene());
  await tap('Enter'); await sleep(300); await tap('Enter'); await sleep(1200); log.push('picked: ' + await scene());
  await tap('Enter'); await sleep(500); log.push('vs skipped: ' + await scene());
  await tap('Enter'); await sleep(300);
  log.push('intro skipped -> phase ' + await evalJS('TechFighter.Game.scene.phase + " paused=" + TechFighter.Game.scene.paused + " names=" + TechFighter.Game.scene.fighters.map(f=>f.def.name).join(" vs ")'));
  // wait for FIGHT
  for (let i = 0; i < 40 && (await evalJS('TechFighter.Game.scene.phase')) !== 'fight'; i++) await sleep(100);
  await evalJS('window.__ft=[]; window.__f0=TechFighter.Game.scene.frame; window.__t0=performance.now(); window.__st=new Set(); (function w(){ const s=TechFighter.Game.scene; if(s.fighters){ const p=s.fighters[0]; __st.add(p.state+(p.move?":"+p.move.key:"")); } requestAnimationFrame(w); })(); true');
  // ---- play ~25 seconds with real keys: walk in, pokes, fireball motions, jumps, blocks
  const t0 = Date.now();
  while (Date.now() - t0 < 25000) {
    const st = await evalJS('(()=>{const s=TechFighter.Game.scene; return s.fighters? {ph:s.phase, d:Math.abs(s.fighters[0].x-s.fighters[1].x), f:s.fighters[0].facing}:null})()');
    if (!st || st.ph === 'end' || (await scene()) !== 'FightScene') break;
    if (st.ph !== 'fight') { await sleep(200); continue; }
    const fwd = st.f > 0 ? 'ArrowRight' : 'ArrowLeft', back = st.f > 0 ? 'ArrowLeft' : 'ArrowRight';
    if (st.d > 260) {
      // fireball motion: down, down-forward, forward + punch (held keys, real timing)
      await key('ArrowDown', 'keyDown'); await sleep(50); await key(fwd, 'keyDown'); await sleep(50); await key('ArrowDown', 'keyUp'); await sleep(40);
      await tap('u', 50); await key(fwd, 'keyUp'); await sleep(450);
      await key(fwd, 'keyDown'); await sleep(500); await key(fwd, 'keyUp');
    } else {
      // close: jab, jab, crouch kick, heavy, then block a moment
      await tap('u'); await sleep(120); await tap('u'); await sleep(120);
      await key('ArrowDown', 'keyDown'); await tap('j'); await sleep(100); await key('ArrowDown', 'keyUp');
      await tap('k'); await sleep(300);
      await key(back, 'keyDown'); await sleep(500); await key(back, 'keyUp');
      if (Math.random() < 0.3) { await tap('ArrowUp', 80); await sleep(500); await tap('k'); await sleep(500); }
    }
  }
  const perf = await evalJS(`(()=>{ const ft=__ft.slice(5).sort((a,b)=>a-b); const n=ft.length; const avg=ft.reduce((s,v)=>s+v,0)/n;
    const s=TechFighter.Game.scene; const secs=(performance.now()-__t0)/1000;
    return { frames:n, avgFrameMs:+avg.toFixed(2), fps:+(1000/avg).toFixed(1), p95:+ft[Math.floor(n*.95)].toFixed(1), p99:+ft[Math.floor(n*.99)].toFixed(1), over20ms: ft.filter(v=>v>20).length,
      gameStepsPerSec: s.frame!=null ? +((s.frame-__f0)/secs).toFixed(1) : null, canvas: document.getElementById('game').width+'x'+document.getElementById('game').height,
      p1States:[...__st], p1Damage: s.fighters? s.fighters[0].stats.dmg : null, p1Specials: s.fighters? s.fighters[0].stats.specials:null, hp: s.fighters? s.fighters.map(f=>f.hp):null };})()`);
  report.flow = log; report.realtime = perf;
  report.renderer = await evalJS(`(()=>{ try { const g=document.createElement('canvas').getContext('webgl'); const e=g.getExtension('WEBGL_debug_renderer_info'); return g.getParameter(e.UNMASKED_RENDERER_WEBGL); } catch(e) { return 'unknown'; } })()`);
  // screenshot evidence
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  const shotPath = path.join(os.tmpdir(), 'techfighter-realtime.png');
  fs.writeFileSync(shotPath, Buffer.from(shot.result.data, 'base64'));
  report.screenshot = shotPath;
  report.pageErrors = errors;
  console.log(JSON.stringify(report, null, 1));
  ws.close(); chrome.kill();
  const ok = errors.length === 0 && perf.fps > 55 && perf.p1Specials > 0 && perf.p1Damage > 0;
  console.log(ok ? 'REALTIME OK' : 'REALTIME FAILED');
  process.exit(ok ? 0 : 1);
}
main().catch(e => { console.error(e); process.exit(1); });

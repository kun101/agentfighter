// Captures a Chrome CPU profile of a running fight and prints the top functions by self time.
'use strict';
const { spawn } = require('child_process');
const fs = require('fs'), path = require('path'), os = require('os');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const FILE = path.resolve(path.join(__dirname, '..', 'dist', 'TechFighter.html'));
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const PORT = 9335, profile = fs.mkdtempSync(path.join(os.tmpdir(), 'tf-p-'));
  const chrome = spawn(CHROME, [`--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, '--headless=new', '--window-size=1920,1080', '--enable-gpu', '--use-angle=d3d11', '--ignore-gpu-blocklist', '--no-first-run', 'about:blank'], { stdio: 'ignore' });
  let target; for (let i = 0; i < 50 && !target; i++) { await sleep(200); try { target = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find(t => t.type === 'page'); } catch (e) {} }
  const ws = new WebSocket(target.webSocketDebuggerUrl); await new Promise(r => ws.addEventListener('open', r));
  let id = 0; const pend = new Map(); ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } });
  const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async x => (await send('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true })).result.result.value;
  await send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'file:///' + FILE.split(path.sep).join('/') }); await sleep(1500);
  await ev(`(()=>{ const T=TechFighter; T.Settings.graphics='${process.argv[2] || 'pixel'}'; T.Settings.announcer=false; TF_applyGraphics(); T.Game.go(new FightScene(CHARS.claude, CHARS.gemini, 'observatory', {mode:'versus', demo:true, level:3, level1:3})); return 1; })()`);
  await sleep(2500);
  if (process.argv[3] === 'iso') {
    const r = await ev(`(async()=>{ TechFighter.Game.go({update(){}, draw(){}}); await new Promise(r=>setTimeout(r,500));
      const res={};
      for (const wrf of [true,false]) { const c=document.createElement('canvas'); c.width=200; c.height=230; const x=c.getContext('2d',{willReadFrequently:wrf}); const ts=[];
        for(let i=0;i<120;i++){ x.setTransform(1,0,0,1,0,0); x.clearRect(0,0,200,230); x.setTransform(.5,0,0,.5,95,150); drawFighterVector(x, CHARS.claude, 0, 0, 1, idlePose(i,CHARS.claude), {t:i, shadow:false}); const t=performance.now(); x.getImageData(0,0,200,230); ts.push(performance.now()-t); await new Promise(r=>requestAnimationFrame(r)); }
        ts.sort((a,b)=>a-b); res['wrf_'+wrf]={avg:+(ts.reduce((a,b)=>a+b,0)/ts.length).toFixed(2), p99:+ts[Math.floor(ts.length*.99)].toFixed(1), max:+ts[ts.length-1].toFixed(1)}; }
      return res; })()`);
    console.log(JSON.stringify(r)); ws.close(); chrome.kill(); process.exit(0);
  }
  if (process.argv[3] === 'calls') {
    const r = await ev(`(async()=>{ const st={n:0,draw:[],read:[],hard:[],put:[]};
      const oG=CanvasRenderingContext2D.prototype.getImageData, oP=CanvasRenderingContext2D.prototype.putImageData, oH=window.hardenPixels;
      CanvasRenderingContext2D.prototype.getImageData=function(...a){ const t=performance.now(); const r=oG.apply(this,a); st.read.push(performance.now()-t); return r; };
      CanvasRenderingContext2D.prototype.putImageData=function(...a){ const t=performance.now(); oP.apply(this,a); st.put.push(performance.now()-t); };
      window.hardenPixels=function(...a){ const t=performance.now(); oH.apply(this,a); st.hard.push(performance.now()-t); };
      const ft=[]; let lt=performance.now(), run=true; (function rec(t){ ft.push(t-lt); lt=t; if(run) requestAnimationFrame(rec); })(lt);
      await new Promise(r=>setTimeout(r,6000)); run=false;
      const q=a=>{a=a.slice().sort((x,y)=>x-y); return {n:a.length, avg:+(a.reduce((x,y)=>x+y,0)/a.length).toFixed(2), p99:+a[Math.floor(a.length*.99)].toFixed(1), max:+a[a.length-1].toFixed(1)};};
      return {frames:q(ft), getImageData:q(st.read), harden:q(st.hard), putImageData:q(st.put)}; })()`);
    console.log(JSON.stringify(r)); ws.close(); chrome.kill(); process.exit(0);
  }
  await send('Profiler.enable'); await send('Profiler.setSamplingInterval', { interval: 200 }); await send('Profiler.start');
  await sleep(6000);
  const prof = (await send('Profiler.stop')).result.profile;
  const self = new Map(); const total = prof.samples.length;
  const byId = new Map(prof.nodes.map(n => [n.id, n]));
  for (const s of prof.samples) { const n = byId.get(s); const k = (n.callFrame.functionName || '(anon)') + ' @' + n.callFrame.lineNumber; self.set(k, (self.get(k) || 0) + 1); }
  [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 18).forEach(([k, v]) => console.log((100 * v / total).toFixed(1).padStart(5) + '%  ' + k));
  ws.close(); chrome.kill(); process.exit(0);
})();

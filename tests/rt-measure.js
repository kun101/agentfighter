// Real-time frame-pacing measurement of a CPU-vs-CPU fight in real Chrome (GPU), per graphics mode.
'use strict';
const { spawn } = require('child_process');
const fs = require('fs'), path = require('path'), os = require('os');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const FILE = path.resolve(process.env.TF_FILE || path.join(__dirname, '..', 'dist', 'TechFighter.html'));
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const PORT = 9334, profile = fs.mkdtempSync(path.join(os.tmpdir(), 'tf-m-'));
  const chrome = spawn(CHROME, [`--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, '--headless=new', '--window-size=1920,1080', ...(process.env.TF_NOGPU ? ['--disable-gpu'] : ['--enable-gpu', '--use-angle=d3d11', '--ignore-gpu-blocklist']), '--no-first-run', 'about:blank'], { stdio: 'ignore' });
  let target; for (let i = 0; i < 50 && !target; i++) { await sleep(200); try { target = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find(t => t.type === 'page'); } catch (e) {} }
  const ws = new WebSocket(target.webSocketDebuggerUrl); await new Promise(r => ws.addEventListener('open', r));
  let id = 0; const pend = new Map(); ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } });
  const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async x => { const r = (await send('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true })).result; if (r.exceptionDetails) return { error: (r.exceptionDetails.exception || {}).description || r.exceptionDetails.text }; return r.result.value; };
  await send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'file:///' + FILE.split(path.sep).join('/') }); await sleep(1500);
  if (process.env.TF_THROTTLE) await send('Emulation.setCPUThrottlingRate', { rate: +process.env.TF_THROTTLE });
  if (process.env.TF_FILE) {
    const r = await ev(`(async()=>{ await new Promise(r=>setTimeout(r,1500)); const ft=[]; let lt=performance.now(); let run=true; (function rec(t){ ft.push(t-lt); lt=t; if(run) requestAnimationFrame(rec); })(lt);
      await new Promise(r=>setTimeout(r,12000)); run=false; const s=ft.slice(3).sort((a,b)=>a-b), n=s.length, avg=s.reduce((a,b)=>a+b,0)/n;
      return {mode:'baseline-page', fps:+(1000/avg).toFixed(1), p95:+s[Math.floor(n*.95)].toFixed(1), p99:+s[Math.floor(n*.99)].toFixed(1), over20:s.filter(v=>v>20).length, frames:n};})()`);
    console.log(JSON.stringify(r)); ws.close(); chrome.kill(); process.exit(0);
  }
  if (process.argv[2] === 'misses') {
    const r = await ev(`(async()=>{ const T=TechFighter; T.Settings.announcer=false; const log={}; const orig=window.fighterSprite;
      window.fighterSprite=function(def,face,pose,opts,own){ const k=def.id+' '+(opts.expr||'')+' '+JSON.stringify([pose.lean,pose.head,pose.fa,pose.ba,pose.fl,pose.bl,pose.rot,pose.dy,pose.dx]); log[k]=(log[k]||0)+1; return orig.apply(this, arguments); };
      T.Game.go(new VsScene(CHARS.muse, CHARS.deepseek, 'trench', {mode:'versus', demo:true, level:3, level1:3}));
      while (!(T.Game.scene instanceof FightScene)) await new Promise(r=>setTimeout(r,50));
      const before=Object.keys(log).length; await new Promise(r=>setTimeout(r,15000));
      const keys=Object.keys(log); return {duringVS: before, total: keys.length, sample: keys.slice(before, before+12)}; })()`);
    console.log(JSON.stringify(r, null, 1)); ws.close(); chrome.kill(); process.exit(0);
  }
  if (process.argv[2] === 'shot') {
    await ev(`(async()=>{ const T=TechFighter; T.Settings.announcer=false; T.Game.go(new VsScene(CHARS['${process.env.TF_P1 || 'claude'}'], CHARS['${process.env.TF_P2 || 'lechat'}'], CHARS['${process.env.TF_P2 || 'lechat'}'].stage, {mode:'versus', demo:true, level:3, level1:3}));
      while (!(T.Game.scene instanceof FightScene) || T.Game.scene.phase !== 'fight') await new Promise(r=>setTimeout(r,50));
      await new Promise(r=>setTimeout(r,2500)); return 1; })()`);
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    const out = path.join(os.tmpdir(), 'techfighter-final-1080p.png');
    fs.writeFileSync(out, Buffer.from(shot.result.data, 'base64'));
    console.log(JSON.stringify({ shot: out, names: await ev('TechFighter.Game.scene.fighters.map(f=>f.def.name).join(" vs ")'), runtimeBakes: await ev('Render.misses') }));
    ws.close(); chrome.kill(); process.exit(0);
  }
  if (process.argv[2] === 'tier') {
    const r = await ev(`(async()=>{ const T=TechFighter; T.Settings.announcer=false;
      if (${!!process.env.TF_VS}) { T.Game.go(new VsScene(CHARS.gemini, CHARS.deepseek, 'trench', {mode:'versus', demo:true, level:3, level1:3}));
        while (!(T.Game.scene instanceof FightScene)) await new Promise(r=>setTimeout(r,50)); }
      else T.Game.go(new FightScene(CHARS.gemini, CHARS.deepseek, 'trench', {mode:'versus', demo:true, level:3, level1:3}));
      const win=async(ms)=>{ const ft=[]; let lt=performance.now(), run=true; (function rec(t){ ft.push(t-lt); lt=t; if(run) requestAnimationFrame(rec); })(lt);
        const f0=T.Game.scene.frame, t0=performance.now(); await new Promise(r=>setTimeout(r,ms)); run=false; const secs=(performance.now()-t0)/1000;
        const s=ft.slice(2).sort((a,b)=>a-b), n=s.length, avg=s.reduce((a,b)=>a+b,0)/n;
        return {fps:+(1000/avg).toFixed(1), p95:+s[Math.floor(n*.95)].toFixed(1), over34:s.filter(v=>v>34).length, gameSpeed:+((T.Game.scene.frame-f0)/secs/60*100).toFixed(0)+'%', canvas:document.getElementById('game').width+'x'+document.getElementById('game').height, warmLeft:Render.warmQ.length}; };
      const a=await win(10000), b=await win(10000), c=await win(10000);
      return {first10s:a, next10s:b, last10s:c};})()`);
    console.log(JSON.stringify({ throttle: process.env.TF_THROTTLE || 1, gpu: !process.env.TF_NOGPU, ...r })); ws.close(); chrome.kill(); process.exit(0);
  }
  for (const mode of (process.argv[2] || 'pixel,hd').split(',')) {
    const r = await ev(`(async()=>{ const T=TechFighter; T.Settings.graphics='${mode}'; T.Settings.announcer=false; for(const k in STAGES) STAGES[k]._cache=null; TF_applyGraphics();
      T.Game.go(new FightScene(CHARS.claude, CHARS.gemini, 'observatory', {mode:'versus', demo:true, level:3, level1:3}));
      while ((T.Game.scene.frame||0) < 3) await new Promise(r=>setTimeout(r,20)); const warmJobs=Render.warmQ.length; const tw=performance.now();
      while (Render.warmQ.length && performance.now()-tw < 40000) await new Promise(r=>setTimeout(r,100));
      const warmSecs=+((performance.now()-tw)/1000).toFixed(1);
      await new Promise(r=>setTimeout(r,1500)); const missAfterWarm=Render.misses;
      const sc=T.Game.scene, ou=sc.update.bind(sc), od=sc.draw.bind(sc); const jt=[]; let cur={u:0,d:0};
      sc.update=()=>{const a=performance.now(); ou(); cur.u+=performance.now()-a;};
      sc.draw=(c)=>{const a=performance.now(); od(c); cur.d+=performance.now()-a; jt.push({u:cur.u,d:cur.d,parts:sc.parts.length,projs:sc.projs.length,freeze:sc.freeze,flash:sc.fighters.some(f=>f.flash>0),st:sc.fighters.map(f=>f.state+(f.move?':'+f.move.kind:'')).join('|')}); cur={u:0,d:0};};
      const ft=[], mm=[]; let lt=performance.now(), lm=Render.misses||0; let run=true; (function rec(t){ ft.push(t-lt); mm.push((Render.misses||0)-lm); lm=Render.misses||0; lt=t; if(run) requestAnimationFrame(rec); })(lt);
      await new Promise(r=>setTimeout(r,12000)); run=false;
      const spikes=ft.map((v,i)=>[v,mm[i]]).filter(x=>x[0]>20); const corr={spikes:spikes.length, spikesWithMiss:spikes.filter(x=>x[1]>0).length, totalMisses:mm.reduce((a,b)=>a+b,0), worst:spikes.sort((a,b)=>b[0]-a[0]).slice(0,6).map(x=>Math.round(x[0])+'ms/'+x[1]+'miss')};
      const s=ft.slice(3).sort((a,b)=>a-b), n=s.length, avg=s.reduce((a,b)=>a+b,0)/n;
      const js=jt.map(x=>x.u+x.d).sort((a,b)=>a-b); const slow=jt.filter(x=>x.u+x.d>10).slice(0,8).map(x=>({u:+x.u.toFixed(1),d:+x.d.toFixed(1),parts:x.parts,projs:x.projs,flash:x.flash,freeze:x.freeze,st:x.st}));
      return {warmJobs, warmSecs, corr, jsAvg:+(js.reduce((a,b)=>a+b,0)/js.length).toFixed(2), jsP99:+js[Math.floor(js.length*.99)].toFixed(1), jsMax:+js[js.length-1].toFixed(1), slowJS:slow, mode:'${mode}', fps:+(1000/avg).toFixed(1), p95:+s[Math.floor(n*.95)].toFixed(1), p99:+s[Math.floor(n*.99)].toFixed(1), over20:s.filter(v=>v>20).length, frames:n, canvas:document.getElementById('game').width+'x'+document.getElementById('game').height};})()`);
    console.log(JSON.stringify(r));
  }
  ws.close(); chrome.kill(); process.exit(0);
})();

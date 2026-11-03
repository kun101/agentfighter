'use strict';
// ---------- Boot & main loop ----------
(function () {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d', { alpha: false });
  // The canvas is sized to the 16:9 game area (letterboxed by CSS) and rendered at an
  // internal resolution that adapts downward if the machine can't hold ~60fps.
  let scale = 1, rs = 1, qualityCap = 2;
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cw = window.innerWidth, ch = window.innerHeight;
    scale = Math.min(cw / W, ch / H);
    rs = clamp(scale * dpr, 0.5, qualityCap);
    canvas.width = Math.round(W * rs); canvas.height = Math.round(H * rs);
    const cssW = Math.round(W * scale), cssH = Math.round(H * scale);
    canvas.style.width = cssW + 'px'; canvas.style.height = cssH + 'px';
    canvas.style.marginLeft = Math.round((cw - cssW) / 2) + 'px';
    canvas.style.marginTop = Math.round((ch - cssH) / 2) + 'px';
    Render.px = rs;
    Render.rs = clamp(Math.ceil(rs * 2) / 2, 1, 2.5);
  }
  window.TF_applyGraphics = resize;
  // adaptive quality: track frame times, lower internal resolution on slow machines
  // judged on the MEDIAN frame time so one-off spikes (asset baking, GC) never lower quality
  const perf = { buf: [], lowered: 0 };
  function trackPerf(dt) {
    perf.buf.push(dt);
    if (perf.buf.length >= 180) {
      const med = perf.buf.slice().sort((a, b) => a - b)[90];
      if (med > 18.5 && qualityCap > 0.75 && perf.lowered < 4) { qualityCap = Math.max(0.75, Math.min(qualityCap, rs) - 0.35); perf.lowered++; resize(); }
      perf.buf.length = 0;
    }
  }
  window.addEventListener('resize', resize);
  resize();

  const seen = new Set();
  function report(e) {
    const k = String(e && e.stack || e);
    if (seen.has(k)) return;
    seen.add(k);
    console.error('[TechFighter]', e);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && Game.scene instanceof FightScene && !Game.scene.paused && Game.scene.phase !== 'end' && !Game.scene.opts.demo) {
      Game.scene.paused = true; Game.scene.pauseSel = 0;
    }
  });

  Game.go(new TitleScene());
  const STEP = 1000 / 60;
  let last = performance.now(), acc = 0;
  function frame(now) {
    const dt = now - last;
    acc += Math.min(100, dt);
    last = now;
    if (!document.hidden && dt < 500) trackPerf(dt);
    let steps = 0;
    while (acc >= STEP && steps < 4) {
      try { Input.poll(); Game.scene.update(); } catch (e) { report(e); }
      acc -= STEP; steps++;
    }
    if (steps === 4) acc = 0;
    try {
      // on-demand sprite baking gets ~6ms per frame on average (2 bakes on fast machines, fewer on slow ones)
      Render.frameNo = (Render.frameNo || 0) + 1;
      Render.bakeBudget = Render.bakeAvg <= 3 ? 2 : (Render.frameNo % Math.ceil(Render.bakeAvg / 6) === 0 ? 1 : 0);
      Render.warmMs = 6;
      ctx.setTransform(rs, 0, 0, rs, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      Game.scene.draw(ctx);
      // background sprite baking with whatever bake budget this frame has left
      // time-budgeted background sprite baking: each frame earns warmMs of credit; a bake spends its measured cost,
      // so slow machines simply bake less often instead of dropping frames
      if (Render.warmQ.length) {
        Render.warmCredit = Math.min(Render.warmCredit + Render.warmMs, Math.max(Render.warmMs * 3, Render.bakeAvg));
        while (Render.warmQ.length && Render.warmCredit >= Render.bakeAvg) {
          const t0 = performance.now();
          Render.warmQ.shift()();
          const cost = performance.now() - t0;
          Render.bakeAvg = Render.bakeAvg * 0.9 + cost * 0.1;
          Render.warmCredit -= cost;
        }
      } else Render.warmCredit = 0;
    } catch (e) { report(e); if (ctx.reset) ctx.reset(); }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  window.TechFighter = { Game, Settings, Progress, Input, Sound };
})();

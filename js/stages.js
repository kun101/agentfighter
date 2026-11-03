'use strict';
// ---------- Stages: procedurally painted parallax backgrounds ----------
const Render = { rs: 1, px: 1, bakeBudget: 2, warmMs: 6, warmCredit: 0, bakeAvg: 4, misses: 0, warmQ: [] }; // rs: layer cache scale, px: physical pixels per logical pixel // resolution scale for cached layers (set by main on resize)
const LAYER_F = { sky: 0.06, far: 0.3, mid: 0.62 };

function layerWidth(f) { return W + (STAGE_W - W) * f; }
function getLayer(st, name) {
  st._cache = st._cache || {};
  const pix = pixelMode();
  const rs = pix ? 1 / PX.P : Render.rs;
  let c = st._cache[name];
  if (c && c._rs === rs) return c;
  const f = LAYER_F[name], w = layerWidth(f), h = name === 'sky' ? H : FLOOR_Y + 4;
  c = makeCanvas(w * rs, h * rs);
  c._rs = rs; c._w = w; c._h = h;
  const ctx = c.getContext('2d');
  ctx.scale(rs, rs);
  st[name](ctx, w, h, seededRng(st.seed + name.length * 97));
  if (pix && c.width > 1) { const img = ctx.getImageData(0, 0, c.width, c.height); hardenPixels(img, null); ctx.putImageData(img, 0, 0); }
  st._cache[name] = c;
  return c;
}
function drawStage(ctx, st, camX, t) {
  for (const name of ['sky', 'far', 'mid']) {
    if (!st[name]) continue;
    const c = getLayer(st, name);
    let lx = -camX * LAYER_F[name];
    if (c._rs < 1) lx = Math.round(lx * c._rs) / c._rs;
    ctx.drawImage(c, lx, 0, c._w, c._h);
  }
  if (st.animBack) st.animBack(ctx, camX, t);
  drawFloor(ctx, st.floor, camX, t);
  if (st.animFloor) st.animFloor(ctx, camX, t);
}
function drawFloor(ctx, F, camX, t) {
  const g = ctx.createLinearGradient(0, FLOOR_Y, 0, H);
  g.addColorStop(0, F.far); g.addColorStop(1, F.near);
  ctx.fillStyle = g; ctx.fillRect(0, FLOOR_Y, W, H - FLOOR_Y);
  const persp = 0.6;
  ctx.save();
  ctx.beginPath(); ctx.rect(0, FLOOR_Y, W, H - FLOOR_Y); ctx.clip();
  // depth lines
  ctx.strokeStyle = F.line; ctx.lineWidth = F.lw || 1.5;
  const sp = F.spacing || 90;
  const start = Math.floor(camX / sp) * sp - sp * 6;
  for (let wx = start; wx < camX + W + sp * 6; wx += sp) {
    const near = wx - camX, far = W / 2 + (near - W / 2) * persp;
    ctx.beginPath(); ctx.moveTo(far, FLOOR_Y); ctx.lineTo(W / 2 + (near - W / 2) * 1.25, H); ctx.stroke();
  }
  // horizontal lines
  const rows = F.rows || 6;
  for (let i = 1; i <= rows; i++) {
    const k = Math.pow(i / rows, 1.6);
    const y = FLOOR_Y + (H - FLOOR_Y) * k;
    ctx.globalAlpha = 0.4 + k * 0.6;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  if (F.glow) {
    ctx.strokeStyle = F.glow; ctx.lineWidth = 3; ctx.shadowColor = F.glow; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.moveTo(0, FLOOR_Y + 1); ctx.lineTo(W, FLOOR_Y + 1); ctx.stroke();
    ctx.shadowBlur = 0;
  }
  if (F.shine) {
    const sg = ctx.createLinearGradient(0, FLOOR_Y, 0, H);
    sg.addColorStop(0, 'rgba(255,255,255,0.12)'); sg.addColorStop(0.4, 'rgba(255,255,255,0)');
    ctx.fillStyle = sg; ctx.fillRect(0, FLOOR_Y, W, H - FLOOR_Y);
  }
  ctx.restore();
  // edge shadow under horizon
  const eg = ctx.createLinearGradient(0, FLOOR_Y, 0, FLOOR_Y + 22);
  eg.addColorStop(0, 'rgba(0,0,0,.35)'); eg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = eg; ctx.fillRect(0, FLOOR_Y, W, 22);
}
function vgrad(ctx, y0, y1, stops) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c));
  return g;
}
function stars(ctx, w, h, n, r, col) {
  for (let i = 0; i < n; i++) {
    ctx.globalAlpha = 0.3 + r() * 0.7; ctx.fillStyle = col || '#fff';
    const s = r() < 0.1 ? 2 : 1;
    ctx.fillRect(r() * w, r() * h, s, s);
  }
  ctx.globalAlpha = 1;
}
function windowsGrid(ctx, x, y, w, h, r, lit, cols) {
  const cw = 8, ch = 10;
  for (let yy = y + 8; yy < y + h - 10; yy += ch + 6) {
    for (let xx = x + 6; xx < x + w - cw - 4; xx += cw + 6) {
      if (r() < lit) { ctx.fillStyle = cols[Math.floor(r() * cols.length)]; ctx.fillRect(xx, yy, cw, ch); }
    }
  }
}
// world-space parallax helper for animated layers
function px(x, camX, f) { return x - camX * f; }

const STAGES = {
  // ---------------- Claude ----------------
  library: {
    name: 'The Constitution Library', seed: 11,
    sky(ctx, w, h) {
      ctx.fillStyle = vgrad(ctx, 0, h, ['#2B1A2E', '#7A3B3A', '#E0875E', '#F6C68A']);
      ctx.fillRect(0, 0, w, h);
    },
    far(ctx, w, h, r) {
      // wall with arched windows
      ctx.fillStyle = '#3A2418'; ctx.fillRect(0, 0, w, h);
      for (let x = 60; x < w; x += 300) {
        ctx.save();
        ctx.beginPath(); ctx.moveTo(x, h - 40); ctx.lineTo(x, 150); ctx.arc(x + 80, 150, 80, Math.PI, 0); ctx.lineTo(x + 160, h - 40); ctx.closePath();
        ctx.clip();
        ctx.fillStyle = vgrad(ctx, 60, h - 40, ['#3B2147', '#B65448', '#F09A5F', '#FFD28A']); ctx.fillRect(x, 60, 160, h);
        ctx.fillStyle = '#FFE7B0'; circle(ctx, x + 110, 260, 34); ctx.fill();
        ctx.fillStyle = '#5A2E3A';
        ctx.beginPath(); ctx.moveTo(x, h - 80); for (let i = 0; i <= 8; i++) ctx.lineTo(x + i * 20, h - 110 - r() * 50); ctx.lineTo(x + 160, h); ctx.lineTo(x, h); ctx.fill();
        ctx.restore();
        ctx.strokeStyle = '#1E120C'; ctx.lineWidth = 10;
        ctx.beginPath(); ctx.moveTo(x, h - 40); ctx.lineTo(x, 150); ctx.arc(x + 80, 150, 80, Math.PI, 0); ctx.lineTo(x + 160, h - 40); ctx.stroke();
        ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x + 80, 70); ctx.lineTo(x + 80, h - 40); ctx.moveTo(x, 230); ctx.lineTo(x + 160, 230); ctx.stroke();
      }
    },
    mid(ctx, w, h, r) {
      const cols = ['#8E3B2F', '#2F4B6E', '#3E6B48', '#C9A15A', '#6B3E6E', '#D97757', '#EFE9DC', '#4A3A2E'];
      for (let x = -40; x < w; x += 380) {
        const bx = x + 250, bw = 150;
        ctx.fillStyle = '#2A170E'; ctx.fillRect(bx, 40, bw, h - 40);
        ctx.fillStyle = '#4A2C1A'; ctx.fillRect(bx + 6, 48, bw - 12, h - 56);
        for (let sy = 70; sy < h - 30; sy += 62) {
          let xx = bx + 10;
          while (xx < bx + bw - 14) {
            const bwid = 6 + r() * 9, bh = 34 + r() * 20;
            ctx.fillStyle = cols[Math.floor(r() * cols.length)];
            if (r() < 0.12) { ctx.save(); ctx.translate(xx, sy + 52); ctx.rotate(-0.25); ctx.fillRect(0, -bh, bwid, bh); ctx.restore(); }
            else ctx.fillRect(xx, sy + 52 - bh, bwid, bh);
            ctx.fillStyle = 'rgba(255,255,255,.15)'; ctx.fillRect(xx + 1, sy + 54 - bh, 2, bh - 4);
            xx += bwid + 1;
          }
          ctx.fillStyle = '#2A170E'; ctx.fillRect(bx + 6, sy + 52, bw - 12, 8);
        }
        ctx.fillStyle = '#1E110A'; ctx.fillRect(bx - 6, 30, bw + 12, 14);
      }
      // reading table
      ctx.fillStyle = '#3A2214'; ctx.fillRect(w * 0.45, h - 70, 200, 14); ctx.fillRect(w * 0.45 + 10, h - 56, 12, 56); ctx.fillRect(w * 0.45 + 178, h - 56, 12, 56);
      ctx.fillStyle = '#EFE9DC'; ctx.fillRect(w * 0.45 + 40, h - 80, 50, 10); ctx.fillStyle = '#D97757'; ctx.fillRect(w * 0.45 + 120, h - 84, 36, 14);
    },
    animBack(ctx, camX, t) {
      // hanging lamps
      for (let i = 0; i < 6; i++) {
        const x = px(140 + i * 260, camX, 0.62), y = 110 + Math.sin(t * .02 + i) * 3;
        ctx.strokeStyle = '#1a0f08'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, y - 12); ctx.stroke();
        const fl = 0.85 + Math.sin(t * .3 + i * 2) * .05 + (Math.random() < .02 ? -.2 : 0);
        const g = ctx.createRadialGradient(x, y, 2, x, y, 90);
        g.addColorStop(0, `rgba(255,210,140,${.55 * fl})`); g.addColorStop(1, 'rgba(255,180,100,0)');
        ctx.fillStyle = g; circle(ctx, x, y, 90); ctx.fill();
        ctx.fillStyle = '#C9A15A'; ctx.beginPath(); ctx.moveTo(x - 14, y); ctx.lineTo(x + 14, y); ctx.lineTo(x + 8, y - 14); ctx.lineTo(x - 8, y - 14); ctx.fill();
        ctx.fillStyle = '#FFE8B8'; circle(ctx, x, y + 3, 5); ctx.fill();
      }
      // dust motes
      ctx.fillStyle = 'rgba(255,220,170,.6)';
      for (let i = 0; i < 30; i++) {
        const x = ((i * 137 + t * 0.3 * (1 + i % 3)) % (W + 40)) - 20, y = 60 + ((i * 71 + Math.sin(t * .01 + i) * 30) % 300);
        ctx.fillRect(x, y, 2, 2);
      }
    },
    floor: { far: '#6B4426', near: '#A5693A', line: 'rgba(40,20,8,.45)', spacing: 70, rows: 5, shine: 1 },
  },
  // ---------------- GPT ----------------
  city: {
    name: 'Neon Token City', seed: 22,
    sky(ctx, w, h, r) {
      ctx.fillStyle = vgrad(ctx, 0, h, ['#05030F', '#1A0B3A', '#4A1660', '#0C4A52']); ctx.fillRect(0, 0, w, h);
      stars(ctx, w, h * 0.5, 120, r);
      ctx.fillStyle = 'rgba(220,230,255,.9)'; circle(ctx, w * 0.75, 80, 26); ctx.fill();
    },
    far(ctx, w, h, r) {
      for (let x = 0; x < w;) {
        const bw = 40 + r() * 70, bh = 120 + r() * 200;
        ctx.fillStyle = '#120A26'; ctx.fillRect(x, h - bh, bw, bh);
        windowsGrid(ctx, x, h - bh, bw, bh, r, 0.25, ['#FFE38A', '#7FE3FF', '#FF7AC8']);
        x += bw + 4;
      }
    },
    mid(ctx, w, h, r) {
      const signs = ['TOKENS', 'GPU', 'API', '24/7', 'PROMPT', 'CHAT'];
      let i = 0;
      for (let x = 20; x < w; x += 170 + r() * 80) {
        const bw = 120 + r() * 50, bh = 200 + r() * 120;
        ctx.fillStyle = '#0A0716'; ctx.fillRect(x, h - bh, bw, bh);
        ctx.fillStyle = '#1B1238'; ctx.fillRect(x + 4, h - bh + 4, bw - 8, bh);
        windowsGrid(ctx, x + 4, h - bh + 40, bw - 8, bh - 40, r, 0.35, ['#2A1F4F', '#3A2A6A', '#10A37F']);
        const col = ['#FF3BD4', '#10E0B0', '#FFD84D', '#4FB0FF'][i % 4];
        ctx.save(); ctx.shadowColor = col; ctx.shadowBlur = 16;
        ctx.strokeStyle = col; ctx.lineWidth = 3; rrect(ctx, x + 12, h - bh + 8, bw - 24, 28, 6); ctx.stroke();
        txt(ctx, signs[i % signs.length], x + bw / 2, h - bh + 29, { size: 17, align: 'center', color: col });
        ctx.restore();
        i++;
      }
    },
    animBack(ctx, camX, t) {
      // flying cars
      for (let i = 0; i < 5; i++) {
        const x = ((t * (1.5 + i * .4) + i * 300) % (W + 200)) - 100, y = 70 + i * 34;
        ctx.fillStyle = i % 2 ? '#FF3BD4' : '#10E0B0';
        ctx.fillRect(i % 2 ? W - x : x, y, 14, 4);
        ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect((i % 2 ? W - x : x) + (i % 2 ? 14 : -18), y + 1, 18, 2);
      }
      // rain
      ctx.strokeStyle = 'rgba(160,200,255,.25)'; ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < 70; i++) {
        const x = (i * 53 + t * 2) % W, y = (i * 97 + t * 14) % H;
        ctx.moveTo(x, y); ctx.lineTo(x - 3, y + 14);
      }
      ctx.stroke();
    },
    animFloor(ctx, camX, t) {
      // neon reflections
      const cols = ['#FF3BD4', '#10E0B0', '#FFD84D', '#4FB0FF'];
      for (let i = 0; i < 8; i++) {
        const x = px(100 + i * 190, camX, 0.62);
        const g = ctx.createLinearGradient(0, FLOOR_Y, 0, H);
        g.addColorStop(0, alpha(cols[i % 4], .28 + Math.sin(t * .1 + i) * .05)); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.fillRect(x, FLOOR_Y, 50, H - FLOOR_Y);
      }
    },
    floor: { far: '#121022', near: '#262040', line: 'rgba(120,100,200,.25)', spacing: 110, rows: 5, shine: 1 },
  },
  // ---------------- Gemini ----------------
  observatory: {
    name: 'Twin Star Observatory', seed: 33,
    sky(ctx, w, h, r) {
      ctx.fillStyle = vgrad(ctx, 0, h, ['#03020C', '#0E1240', '#2A1E6E', '#6B3C8E']); ctx.fillRect(0, 0, w, h);
      // galaxy band
      ctx.save(); ctx.translate(w / 2, h * 0.35); ctx.rotate(-0.35);
      for (let i = 0; i < 400; i++) {
        const x = (r() - 0.5) * w * 1.2, y = (r() + r() + r() - 1.5) * 60;
        ctx.fillStyle = ['rgba(180,170,255,.5)', 'rgba(255,180,220,.4)', 'rgba(140,200,255,.5)'][i % 3];
        ctx.fillRect(x, y, 2, 2);
      }
      const g = ctx.createRadialGradient(0, 0, 10, 0, 0, 300); g.addColorStop(0, 'rgba(200,170,255,.25)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.scale(2.5, .5); circle(ctx, 0, 0, 300); ctx.fill();
      ctx.restore();
      stars(ctx, w, h * .8, 220, r);
      // twin moons
      for (const [mx, my, mr, c] of [[w * .2, 90, 34, '#9EC2FF'], [w * .28, 130, 20, '#FFB3C0']]) {
        const g2 = ctx.createRadialGradient(mx - mr * .3, my - mr * .3, 2, mx, my, mr);
        g2.addColorStop(0, '#fff'); g2.addColorStop(1, c); ctx.fillStyle = g2; circle(ctx, mx, my, mr); ctx.fill();
      }
    },
    far(ctx, w, h, r) {
      ctx.fillStyle = '#140F33';
      ctx.beginPath(); ctx.moveTo(0, h);
      for (let x = 0; x <= w; x += 40) ctx.lineTo(x, h - 80 - Math.abs(Math.sin(x * .007)) * 120 - r() * 30);
      ctx.lineTo(w, h); ctx.fill();
    },
    mid(ctx, w, h) {
      for (const dx of [w * 0.18, w * 0.78]) {
        ctx.fillStyle = '#2C2F55'; ctx.fillRect(dx - 110, h - 130, 220, 130);
        ctx.fillStyle = '#C8CCE8'; ctx.beginPath(); ctx.arc(dx, h - 130, 110, Math.PI, 0); ctx.fill();
        ctx.fillStyle = '#9EA4CC'; ctx.beginPath(); ctx.arc(dx, h - 130, 110, Math.PI, Math.PI * 1.25); ctx.lineTo(dx, h - 130); ctx.fill();
        ctx.fillStyle = '#1A1D3A'; ctx.fillRect(dx - 18, h - 238, 36, 108);
        ctx.save(); ctx.translate(dx, h - 200); ctx.rotate(-0.7);
        ctx.fillStyle = '#E8ECFF'; ctx.fillRect(-14, -90, 28, 110); ctx.fillStyle = '#4F8EF7'; ctx.fillRect(-14, -90, 28, 12);
        ctx.restore();
        ctx.fillStyle = '#FFE38A'; for (let i = 0; i < 4; i++) ctx.fillRect(dx - 90 + i * 50, h - 90, 18, 24);
      }
      ctx.strokeStyle = '#8A90C0'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(0, h - 30); ctx.lineTo(w, h - 30); ctx.stroke();
      for (let x = 0; x < w; x += 40) { ctx.beginPath(); ctx.moveTo(x, h - 30); ctx.lineTo(x, h); ctx.stroke(); }
    },
    animBack(ctx, camX, t) {
      for (let i = 0; i < 25; i++) {
        const a = (Math.sin(t * .05 + i * 1.7) + 1) / 2;
        sparkle(ctx, (i * 173) % W, (i * 89) % 260, 2 + a * 4, `rgba(255,255,255,${a})`);
      }
      const k = (t % 400) / 60;
      if (k < 1) {
        const x = 700 - k * 400, y = 40 + k * 120;
        ctx.strokeStyle = `rgba(255,255,255,${1 - k})`; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 70, y - 22); ctx.stroke();
      }
    },
    floor: { far: '#2A2F5A', near: '#4A5190', line: 'rgba(180,190,255,.3)', spacing: 100, rows: 6, glow: '#9B72CB', shine: 1 },
  },
  // ---------------- Grok ----------------
  launchpad: {
    name: 'Red Planet Launchpad', seed: 44,
    sky(ctx, w, h, r) {
      ctx.fillStyle = vgrad(ctx, 0, h, ['#1A0A08', '#5A1E12', '#B8502A', '#E8945A']); ctx.fillRect(0, 0, w, h);
      stars(ctx, w, h * 0.35, 80, r);
      ctx.fillStyle = '#E8D0B0'; circle(ctx, w * .65, 70, 10); ctx.fill(); circle(ctx, w * .72, 110, 6); ctx.fill();
      ctx.fillStyle = 'rgba(255,200,150,.6)'; circle(ctx, w * .4, h * .72, 50); ctx.fill();
    },
    far(ctx, w, h, r) {
      ctx.fillStyle = '#6B2A16';
      for (let x = -50; x < w; x += 180 + r() * 120) {
        const mw = 160 + r() * 140, mh = 60 + r() * 90;
        ctx.beginPath(); ctx.moveTo(x, h); ctx.lineTo(x + 30, h - mh); ctx.lineTo(x + mw - 30, h - mh - r() * 10); ctx.lineTo(x + mw, h); ctx.fill();
      }
    },
    mid(ctx, w, h) {
      // datacenter
      ctx.fillStyle = '#1C1A1E'; ctx.fillRect(w * 0.05, h - 150, 420, 150);
      ctx.fillStyle = '#2B2830'; ctx.fillRect(w * 0.05, h - 150, 420, 16);
      txt(ctx, 'MEGACLUSTER', w * 0.05 + 210, h - 100, { size: 28, align: 'center', color: '#E8E8E8' });
      for (let i = 0; i < 12; i++) { ctx.fillStyle = '#0E0D10'; ctx.fillRect(w * 0.05 + 16 + i * 34, h - 80, 26, 70); }
      // launch tower + rocket
      const tx = w * 0.72;
      ctx.strokeStyle = '#2A2226'; ctx.lineWidth = 5;
      ctx.strokeRect(tx, h - 330, 50, 330);
      for (let y = h - 330; y < h; y += 30) { ctx.beginPath(); ctx.moveTo(tx, y); ctx.lineTo(tx + 50, y + 30); ctx.moveTo(tx + 50, y); ctx.lineTo(tx, y + 30); ctx.stroke(); }
      ctx.fillStyle = '#E6E6E6'; rrect(ctx, tx + 70, h - 300, 46, 300, 18); ctx.fill();
      ctx.fillStyle = '#C8C8C8'; ctx.fillRect(tx + 100, h - 290, 16, 290);
      ctx.fillStyle = '#111'; ctx.beginPath(); ctx.moveTo(tx + 70, h - 270); ctx.quadraticCurveTo(tx + 93, h - 360, tx + 116, h - 270); ctx.fill();
      ctx.fillStyle = '#FF3B30'; ctx.fillRect(tx + 70, h - 140, 46, 8);
    },
    animBack(ctx, camX, t) {
      const tx = px(STAGE_W * 0 + layerWidth(.62) * 0.72, camX, .62);
      ctx.fillStyle = (t % 60) < 30 ? '#FF3B30' : '#5A1010';
      circle(ctx, tx + 25, FLOOR_Y - 335, 5); ctx.fill();
      // blowing dust
      ctx.fillStyle = 'rgba(230,150,90,.25)';
      for (let i = 0; i < 40; i++) {
        const x = (i * 71 + t * (2 + i % 3)) % (W + 50) - 25, y = 200 + (i * 37) % 200 + Math.sin(t * .03 + i) * 10;
        ctx.fillRect(x, y, 3, 1.5);
      }
    },
    floor: { far: '#3A2A28', near: '#5E4640', line: 'rgba(20,10,8,.55)', spacing: 80, rows: 7, lw: 2 },
  },
  // ---------------- Muse ----------------
  plaza: {
    name: 'Infinite Feed Plaza', seed: 55,
    sky(ctx, w, h) {
      ctx.fillStyle = vgrad(ctx, 0, h, ['#12002E', '#4A0A6E', '#C2257E', '#FF8A5C']); ctx.fillRect(0, 0, w, h);
      const sx = w / 2, sy = 300, sr = 130;
      const g = ctx.createLinearGradient(0, sy - sr, 0, sy + sr); g.addColorStop(0, '#FFE45C'); g.addColorStop(1, '#FF3B8E');
      ctx.save(); ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.clip();
      ctx.fillStyle = g; ctx.fillRect(sx - sr, sy - sr, sr * 2, sr * 2);
      ctx.fillStyle = '#4A0A6E';
      for (let i = 0; i < 7; i++) ctx.fillRect(sx - sr, sy + i * 18 - 10, sr * 2, 3 + i * 1.6);
      ctx.restore();
    },
    far(ctx, w, h) {
      ctx.strokeStyle = '#FF4FD8'; ctx.lineWidth = 2; ctx.fillStyle = '#1A0430';
      ctx.beginPath(); ctx.moveTo(0, h);
      const pts = [];
      for (let x = 0; x <= w; x += 60) { const y = h - 40 - Math.abs(Math.sin(x * .011) * 110) - Math.abs(Math.cos(x * .023)) * 40; pts.push([x, y]); ctx.lineTo(x, y); }
      ctx.lineTo(w, h); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.globalAlpha = .4;
      for (const [x, y] of pts) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 30, h); ctx.stroke(); }
      ctx.globalAlpha = 1;
    },
    mid(ctx, w, h, r) {
      for (let x = 60; x < w; x += 260) {
        const y = 120 + r() * 80;
        ctx.fillStyle = 'rgba(10,4,30,.85)'; rrect(ctx, x, y, 110, 170, 14); ctx.fill();
        ctx.strokeStyle = '#7FE3FF'; ctx.lineWidth = 3; ctx.stroke();
        ctx.fillStyle = vgrad(ctx, y, y + 100, ['#5AA2FF', '#A033FF']); rrect(ctx, x + 10, y + 12, 90, 90, 8); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(x + 10, y + 112, 80, 7); ctx.fillRect(x + 10, y + 126, 55, 7);
        ctx.fillStyle = '#FF4F7A'; txt(ctx, '♥ ' + Math.floor(r() * 900 + 100) + 'K', x + 12, y + 156, { size: 14, color: '#FF7AA0', font: FONT_UI });
      }
    },
    animBack(ctx, camX, t) {
      for (let i = 0; i < 14; i++) {
        const k = ((t * 0.6 + i * 47) % 300) / 300;
        const x = px(80 + i * 105, camX, .62) + Math.sin(t * .03 + i) * 12, y = FLOOR_Y - k * 300;
        ctx.globalAlpha = Math.sin(k * Math.PI);
        txt(ctx, i % 3 ? '♥' : '∞', x, y, { size: 18 + (i % 3) * 4, align: 'center', color: i % 3 ? '#FF6FA8' : '#7FE3FF', font: FONT_UI });
      }
      ctx.globalAlpha = 1;
    },
    floor: { far: '#1A0430', near: '#2E0A52', line: '#FF4FD8', spacing: 80, rows: 7, glow: '#7FE3FF', lw: 2 },
  },
  // ---------------- Copilot ----------------
  runway: {
    name: 'Cloud Nine Runway', seed: 66,
    sky(ctx, w, h) {
      ctx.fillStyle = vgrad(ctx, 0, h, ['#2C7BE5', '#5FB0F5', '#BDE5FF', '#FFF2D6']); ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(255,250,220,.9)'; circle(ctx, w * .82, 90, 40); ctx.fill();
    },
    far(ctx, w, h, r) {
      for (let i = 0; i < 26; i++) {
        const x = r() * w, y = h - 40 - r() * 80, s = 40 + r() * 60;
        ctx.fillStyle = i % 2 ? '#FFFFFF' : '#EAF4FF';
        for (let j = 0; j < 4; j++) { circle(ctx, x + j * s * .5, y - Math.sin(j) * s * .3, s * .5); ctx.fill(); }
      }
      ctx.fillStyle = '#F4FAFF'; ctx.fillRect(0, h - 40, w, 40);
    },
    mid(ctx, w, h) {
      // control tower
      const tx = w * 0.15;
      ctx.fillStyle = '#E4E8EE'; ctx.fillRect(tx, h - 220, 44, 220);
      ctx.fillStyle = '#5A6878'; ctx.beginPath(); ctx.moveTo(tx - 30, h - 220); ctx.lineTo(tx + 74, h - 220); ctx.lineTo(tx + 60, h - 270); ctx.lineTo(tx - 16, h - 270); ctx.fill();
      ctx.fillStyle = '#9FE0FF'; ctx.fillRect(tx - 14, h - 262, 72, 30);
      ctx.fillStyle = '#3A4654'; ctx.fillRect(tx - 34, h - 282, 112, 12);
      // hangar
      const hx = w * 0.55;
      ctx.fillStyle = '#B7C2CE'; ctx.beginPath(); ctx.moveTo(hx, h); ctx.lineTo(hx, h - 110); ctx.quadraticCurveTo(hx + 160, h - 210, hx + 320, h - 110); ctx.lineTo(hx + 320, h); ctx.fill();
      ctx.fillStyle = '#26303C'; ctx.fillRect(hx + 60, h - 100, 200, 100);
      txt(ctx, 'HANGAR 365', hx + 160, h - 120, { size: 18, align: 'center', color: '#2C4A6E' });
      // windsock
      ctx.strokeStyle = '#555'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(w * .9, h); ctx.lineTo(w * .9, h - 120); ctx.stroke();
      ctx.fillStyle = '#FF7A1A'; ctx.beginPath(); ctx.moveTo(w * .9, h - 120); ctx.lineTo(w * .9 + 60, h - 112); ctx.lineTo(w * .9 + 60, h - 100); ctx.lineTo(w * .9, h - 96); ctx.fill();
    },
    animBack(ctx, camX, t) {
      for (let i = 0; i < 4; i++) {
        const x = ((t * (0.3 + i * .15) + i * 400) % (W + 300)) - 150, y = 60 + i * 50;
        ctx.fillStyle = 'rgba(255,255,255,.85)';
        for (let j = 0; j < 4; j++) { circle(ctx, x + j * 26, y - Math.sin(j * 1.3) * 10, 22); ctx.fill(); }
      }
      const k = (t % 900) / 900;
      const x = -100 + k * (W + 200), y = 150 - Math.sin(k * Math.PI) * 40;
      ctx.fillStyle = '#F4F6FA'; ctx.fillRect(x, y, 50, 8); ctx.beginPath(); ctx.moveTo(x + 15, y); ctx.lineTo(x + 30, y - 14); ctx.lineTo(x + 34, y); ctx.fill();
      ctx.fillStyle = '#2C9BF0'; ctx.fillRect(x + 4, y + 3, 40, 2);
    },
    animFloor(ctx, camX) {
      ctx.fillStyle = 'rgba(255,255,255,.75)';
      for (let wx = 0; wx < STAGE_W; wx += 160) {
        const x = wx - camX;
        if (x < -120 || x > W + 120) continue;
        const y = FLOOR_Y + 70;
        ctx.beginPath(); ctx.moveTo(W / 2 + (x - W / 2) * .85, y - 6); ctx.lineTo(W / 2 + (x + 70 - W / 2) * .85, y - 6); ctx.lineTo(W / 2 + (x + 70 - W / 2) * .95, y + 6); ctx.lineTo(W / 2 + (x - W / 2) * .95, y + 6); ctx.fill();
      }
    },
    floor: { far: '#5A6270', near: '#3A4048', line: 'rgba(255,255,255,.08)', spacing: 140, rows: 3 },
  },
  // ---------------- DeepSeek ----------------
  trench: {
    name: 'The Abyssal Server Trench', seed: 77,
    sky(ctx, w, h) {
      ctx.fillStyle = vgrad(ctx, 0, h, ['#2A8CC8', '#0D4E8A', '#062A5A', '#020E26']); ctx.fillRect(0, 0, w, h);
    },
    far(ctx, w, h, r) {
      ctx.fillStyle = '#04183A';
      for (let x = -40; x < w; x += 90 + r() * 120) {
        const rw = 80 + r() * 140, rh = 100 + r() * 200;
        ctx.beginPath(); ctx.moveTo(x, h); ctx.quadraticCurveTo(x + rw * .2, h - rh, x + rw * .5, h - rh * .9); ctx.quadraticCurveTo(x + rw * .8, h - rh * .7, x + rw, h); ctx.fill();
      }
    },
    mid(ctx, w, h, r) {
      for (let x = 30; x < w; x += 210 + r() * 60) {
        ctx.fillStyle = '#0A1E3C'; ctx.fillRect(x, h - 170, 70, 170);
        ctx.fillStyle = '#132E58'; ctx.fillRect(x + 4, h - 166, 62, 166);
        for (let y = h - 156; y < h - 10; y += 14) { ctx.fillStyle = '#071226'; ctx.fillRect(x + 8, y, 54, 9); ctx.fillStyle = r() < .5 ? '#4D6BFE' : '#3CF0C8'; ctx.fillRect(x + 54, y + 3, 4, 3); }
        // kelp
        ctx.strokeStyle = '#0F5A46'; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.moveTo(x + 110, h); for (let k = 0; k < 6; k++) ctx.quadraticCurveTo(x + 100 + (k % 2) * 24, h - k * 40 - 20, x + 110, h - k * 40 - 40); ctx.stroke();
      }
    },
    animBack(ctx, camX, t) {
      // light rays
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 5; i++) {
        const x = 100 + i * 200 + Math.sin(t * .01 + i) * 40;
        const g = ctx.createLinearGradient(x, 0, x + 120, FLOOR_Y);
        g.addColorStop(0, 'rgba(120,220,255,.16)'); g.addColorStop(1, 'rgba(120,220,255,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 50, 0); ctx.lineTo(x + 170, FLOOR_Y); ctx.lineTo(x + 60, FLOOR_Y); ctx.fill();
      }
      ctx.restore();
      // fish school
      for (let i = 0; i < 12; i++) {
        const x = ((t * 1.2 + i * 18) % (W + 300)) - 150 + Math.sin(i) * 20, y = 140 + Math.sin(t * .03 + i * .7) * 14 + (i % 4) * 12;
        ctx.fillStyle = '#9EE7FF';
        ctx.beginPath(); ctx.ellipse(x, y, 7, 3, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x - 6, y); ctx.lineTo(x - 11, y - 3); ctx.lineTo(x - 11, y + 3); ctx.fill();
      }
      // bubbles
      ctx.strokeStyle = 'rgba(200,240,255,.6)'; ctx.lineWidth = 1.5;
      for (let i = 0; i < 26; i++) {
        const k = ((t * (0.8 + (i % 4) * .2) + i * 61) % 520) / 520;
        const x = (i * 97) % W + Math.sin(t * .05 + i) * 6, y = FLOOR_Y + 20 - k * 520;
        circle(ctx, x, y, 2 + (i % 4)); ctx.stroke();
      }
    },
    floor: { far: '#2B4A6A', near: '#C2A878', line: 'rgba(30,40,60,.25)', spacing: 120, rows: 4 },
  },
  // ---------------- Le Chat ----------------
  paris: {
    name: 'Café du Mistral, Paris', seed: 88,
    sky(ctx, w, h) {
      ctx.fillStyle = vgrad(ctx, 0, h, ['#3B2A6E', '#C25A8A', '#FF9A6A', '#FFD08A']); ctx.fillRect(0, 0, w, h);
    },
    far(ctx, w, h, r) {
      // rooftops
      ctx.fillStyle = '#4A3260';
      for (let x = 0; x < w; x += 60 + r() * 40) {
        const bh = 90 + r() * 80;
        ctx.fillRect(x, h - bh, 64, bh);
        ctx.fillRect(x + 10 + r() * 30, h - bh - 18, 8, 18);
      }
      // Eiffel tower
      const ex = w * 0.62, base = h - 40;
      ctx.strokeStyle = '#3A2450'; ctx.fillStyle = '#3A2450'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(ex - 70, base); ctx.quadraticCurveTo(ex - 22, base - 150, ex - 6, base - 330); ctx.lineTo(ex + 6, base - 330); ctx.quadraticCurveTo(ex + 22, base - 150, ex + 70, base); ctx.lineTo(ex + 42, base); ctx.quadraticCurveTo(ex, base - 70, ex - 42, base); ctx.closePath(); ctx.fill();
      ctx.fillRect(ex - 44, base - 120, 88, 8); ctx.fillRect(ex - 26, base - 220, 52, 6);
      ctx.beginPath(); ctx.moveTo(ex, base - 370); ctx.lineTo(ex, base - 330); ctx.stroke();
    },
    mid(ctx, w, h) {
      for (let x = 0; x < w; x += 420) {
        ctx.fillStyle = '#E8D8C0'; ctx.fillRect(x + 20, 60, 380, h - 60);
        for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
          ctx.fillStyle = '#2E3A5A'; ctx.fillRect(x + 50 + i * 120, 90 + j * 90, 60, 60);
          ctx.fillStyle = '#FFD08A'; ctx.fillRect(x + 54 + i * 120, 94 + j * 90, 52, 52);
          ctx.fillStyle = '#2E3A5A'; ctx.fillRect(x + 78 + i * 120, 94 + j * 90, 4, 52);
          ctx.fillStyle = '#1A1A1A'; ctx.fillRect(x + 44 + i * 120, 148 + j * 90, 72, 6);
        }
        // awning
        for (let i = 0; i < 12; i++) { ctx.fillStyle = i % 2 ? '#E10500' : '#FFF4E8'; ctx.beginPath(); ctx.moveTo(x + 30 + i * 30, 270); ctx.lineTo(x + 60 + i * 30, 270); ctx.lineTo(x + 60 + i * 30, 300); ctx.quadraticCurveTo(x + 45 + i * 30, 312, x + 30 + i * 30, 300); ctx.fill(); }
        txt(ctx, 'CAFÉ DU MISTRAL', x + 210, 262, { size: 20, align: 'center', color: '#1F2A6B' });
        ctx.fillStyle = '#2B1A10'; ctx.fillRect(x + 160, 310, 100, h - 310);
        // tables
        for (const tx of [x + 70, x + 330]) {
          ctx.fillStyle = '#333'; ctx.fillRect(tx - 2, h - 50, 4, 50); ctx.fillStyle = '#555'; ctx.beginPath(); ctx.ellipse(tx, h - 52, 26, 6, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#FFF'; ctx.fillRect(tx - 6, h - 62, 8, 9);
        }
      }
    },
    animBack(ctx, camX, t) {
      // string lights
      const cols = ['#FFD800', '#FF8205', '#FFF4C0', '#E10500'];
      for (let seg0 = 0; seg0 < 4; seg0++) {
        const x0 = px(seg0 * 420 + 30, camX, .62), x1 = x0 + 380;
        ctx.strokeStyle = '#2A1A10'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(x0, 40); ctx.quadraticCurveTo((x0 + x1) / 2, 90, x1, 40); ctx.stroke();
        for (let i = 1; i < 12; i++) {
          const k = i / 12, x = lerp(x0, x1, k), y = 40 + 4 * 50 * k * (1 - k) * 1.0 * 1;
          const on = Math.sin(t * .08 + i * 1.3 + seg0) > -0.6;
          ctx.fillStyle = on ? cols[i % 4] : '#553'; circle(ctx, x, y + 4, 4); ctx.fill();
          if (on) { ctx.fillStyle = alpha('#FFE080', .2); circle(ctx, x, y + 4, 10); ctx.fill(); }
        }
      }
      // falling leaves
      for (let i = 0; i < 10; i++) {
        const k = ((t * .7 + i * 50) % 500) / 500;
        const x = (i * 113 + Math.sin(t * .02 + i) * 60 + k * 120) % W, y = k * FLOOR_Y;
        ctx.fillStyle = i % 2 ? '#E8A040' : '#C86A20';
        ctx.save(); ctx.translate(x, y); ctx.rotate(t * .05 + i); ctx.beginPath(); ctx.ellipse(0, 0, 5, 2.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }
    },
    floor: { far: '#6A5A68', near: '#8E7C80', line: 'rgba(40,30,40,.4)', spacing: 34, rows: 9 },
  },
  // ---------------- A.G.I. ----------------
  core: {
    name: 'The Singularity Core', seed: 99,
    sky(ctx, w, h, r) {
      ctx.fillStyle = vgrad(ctx, 0, h, ['#000000', '#0B0420', '#1E0640', '#05010E']); ctx.fillRect(0, 0, w, h);
      stars(ctx, w, h, 160, r, '#C9A0FF');
    },
    far(ctx, w, h) {
      ctx.strokeStyle = 'rgba(180,76,255,.25)'; ctx.lineWidth = 1;
      const cx = w / 2, cy = 200;
      for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * 1200, cy + Math.sin(a) * 1200); ctx.stroke(); }
      for (let r0 = 30; r0 < 900; r0 *= 1.35) { ctx.beginPath(); ctx.ellipse(cx, cy, r0, r0 * .6, 0, 0, Math.PI * 2); ctx.stroke(); }
    },
    animBack(ctx, camX, t) {
      const cx = px(layerWidth(.3) / 2, camX, .3), cy = 200;
      // core
      const pulse = 1 + Math.sin(t * .08) * .08;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 120 * pulse);
      g.addColorStop(0, '#FFFFFF'); g.addColorStop(.2, '#E6CCFF'); g.addColorStop(.5, 'rgba(180,76,255,.5)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; circle(ctx, cx, cy, 120 * pulse); ctx.fill();
      ctx.fillStyle = '#000'; circle(ctx, cx, cy, 28); ctx.fill();
      ctx.lineWidth = 3;
      for (let i = 0; i < 3; i++) {
        ctx.strokeStyle = i === 1 ? 'rgba(0,240,255,.7)' : 'rgba(180,76,255,.7)';
        ctx.beginPath(); ctx.ellipse(cx, cy, 70 + i * 34, 18 + i * 8, t * .01 * (i % 2 ? 1 : -1) + i, 0, Math.PI * 2); ctx.stroke();
      }
      // data rain
      ctx.font = `14px ${FONT_UI}`; ctx.textAlign = 'center';
      for (let i = 0; i < 30; i++) {
        const x = (i * 33 + 7) % W, y = ((t * (2 + i % 4) + i * 77) % (FLOOR_Y + 40)) - 20;
        ctx.fillStyle = i % 5 ? 'rgba(180,76,255,.55)' : 'rgba(0,240,255,.7)';
        ctx.fillText(String.fromCharCode(0x30A0 + ((i * 7 + Math.floor(t / 6)) % 90)), x, y);
      }
      // glitch bars
      if ((t % 120) < 4) { ctx.fillStyle = 'rgba(0,240,255,.15)'; ctx.fillRect(0, (t * 37) % FLOOR_Y, W, 12); }
    },
    floor: { far: '#08020F', near: '#1A0730', line: '#B44CFF', spacing: 70, rows: 8, glow: '#00F0FF', lw: 1.5 },
  },
};
const STAGE_ORDER = ['library', 'city', 'observatory', 'launchpad', 'plaza', 'runway', 'trench', 'paris', 'core'];

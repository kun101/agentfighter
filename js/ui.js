'use strict';
// ---------- UI helpers: portraits, panels, backgrounds, HUD ----------
function drawPortrait(ctx, def, x, y, w, h, flip, t, expr) {
  ctx.save();
  rrect(ctx, x, y, w, h, 8);
  ctx.fillStyle = OUT; ctx.fill();
  ctx.save();
  rrect(ctx, x + 3, y + 3, w - 6, h - 6, 6); ctx.clip();
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, shade(def.color, -0.15)); g.addColorStop(1, shade(def.color2 || def.color, -0.55));
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  // speed lines
  ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 2;
  for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(x + i * w / 5, y); ctx.lineTo(x + i * w / 5 - w * .4, y + h); ctx.stroke(); }
  // shoulders
  ctx.fillStyle = def.colors.shirt; ctx.strokeStyle = OUT; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.ellipse(x + w / 2, y + h * 1.05, w * 0.42, h * 0.3, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.translate(x + w / 2, y + h * 0.5);
  drawHeadArt(ctx, def, h * 0.3, expr || 'normal', t || 0, flip);
  ctx.restore();
  ctx.restore();
}

function drawMenuBg(ctx, t, c1, c2) {
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, c1 || '#120A2A'); g.addColorStop(1, c2 || '#2A0A3A');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.globalAlpha = 0.07; ctx.fillStyle = '#fff';
  const off = (t * 0.6) % 80;
  for (let x = -H; x < W + 80; x += 80) {
    ctx.beginPath(); ctx.moveTo(x + off, 0); ctx.lineTo(x + off + 40, 0); ctx.lineTo(x + off + 40 + H, H); ctx.lineTo(x + off + H, H); ctx.fill();
  }
  ctx.restore();
  // grid floor glow
  ctx.save();
  ctx.strokeStyle = 'rgba(160,120,255,.18)'; ctx.lineWidth = 1;
  for (let i = 0; i < 12; i++) {
    const k = Math.pow(((i + (t * 0.01) % 1)) / 12, 2);
    const y = H * 0.62 + k * H * 0.4;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }
  for (let i = -10; i <= 10; i++) { ctx.beginPath(); ctx.moveTo(W / 2 + i * 30, H * 0.62); ctx.lineTo(W / 2 + i * 140, H); ctx.stroke(); }
  ctx.restore();
}

function drawLogo(ctx, x, y, sc, t) {
  ctx.save();
  ctx.translate(x, y); ctx.scale(sc, sc);
  ctx.transform(1, 0, -0.18, 1, 0, 0);
  const pulse = 1 + Math.sin(t * 0.05) * 0.015;
  ctx.scale(pulse, pulse);
  const grad = ctx.createLinearGradient(0, -70, 0, 10);
  grad.addColorStop(0, '#FFF6B0'); grad.addColorStop(0.45, '#FFC233'); grad.addColorStop(0.55, '#FF7A1A'); grad.addColorStop(1, '#D12A12');
  ctx.font = `900 92px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#000'; ctx.lineWidth = 22; ctx.strokeText('TECH FIGHTER', 0, 0);
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 10; ctx.strokeText('TECH FIGHTER', 0, 0);
  ctx.strokeStyle = '#2A0A3A'; ctx.lineWidth = 5; ctx.strokeText('TECH FIGHTER', 0, 0);
  ctx.fillStyle = grad; ctx.fillText('TECH FIGHTER', 0, 0);
  // shine
  ctx.save(); ctx.globalCompositeOperation = 'source-atop';
  const sx = ((t * 6) % 1400) - 700;
  ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.moveTo(sx, -90); ctx.lineTo(sx + 40, -90); ctx.lineTo(sx - 20, 20); ctx.lineTo(sx - 60, 20); ctx.fill();
  ctx.restore();
  // banner
  ctx.fillStyle = '#000'; ctx.fillRect(-235, 14, 470, 44);
  ctx.fillStyle = '#E8202A'; ctx.fillRect(-230, 18, 460, 36);
  txt(ctx, 'BATTLE OF THE BOTS', 0, 47, { size: 28, align: 'center', color: '#fff', stroke: '#000', sw: 5 });
  ctx.restore();
}

function menuList(ctx, items, sel, x, y, o = {}) {
  const gap = o.gap || 46, w = o.w || 300;
  items.forEach((it, i) => {
    const yy = y + i * gap, on = i === sel;
    const label = typeof it === 'string' ? it : it.label;
    const disabled = it && it.disabled;
    if (on) {
      ctx.save();
      ctx.translate(x, yy);
      ctx.transform(1, 0, -0.25, 1, 0, 0);
      const g = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
      g.addColorStop(0, 'rgba(255,194,51,0)'); g.addColorStop(0.2, 'rgba(255,122,26,.95)'); g.addColorStop(0.8, 'rgba(255,122,26,.95)'); g.addColorStop(1, 'rgba(255,194,51,0)');
      ctx.fillStyle = g; ctx.fillRect(-w / 2, -30, w, 40);
      ctx.restore();
    }
    txt(ctx, label, x, yy, { size: on ? 30 : 26, align: o.align || 'center', color: disabled ? '#777' : on ? '#fff' : '#C9C3E8', stroke: '#000', sw: on ? 6 : 4, italic: true });
    if (on && o.arrows && it.value != null) {
      txt(ctx, '◀  ' + it.value + '  ▶', x + (o.valueX || 0), yy, { size: 24, align: 'center', color: '#FFE14D', stroke: '#000', sw: 4, font: FONT });
    } else if (it && it.value != null) {
      txt(ctx, it.value, x + (o.valueX || 0), yy, { size: 22, align: 'center', color: '#FFE9A8', stroke: '#000', sw: 4 });
    }
  });
}

function panel(ctx, x, y, w, h, col) {
  ctx.save();
  rrect(ctx, x, y, w, h, 12);
  ctx.fillStyle = col || 'rgba(8,4,20,.82)'; ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.restore();
}

function statBar(ctx, label, v, x, y, col) {
  txt(ctx, label, x, y + 12, { size: 13, color: '#ddd', font: FONT_UI, weight: 700 });
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i < v ? col : 'rgba(255,255,255,.12)';
    ctx.beginPath(); ctx.moveTo(x + 76 + i * 26, y + 14); ctx.lineTo(x + 76 + i * 26 + 8, y); ctx.lineTo(x + 76 + i * 26 + 30, y); ctx.lineTo(x + 76 + i * 26 + 22, y + 14); ctx.fill();
  }
}

function controlsHint(ctx, text, y) {
  txt(ctx, text, W / 2, y || H - 14, { size: 13, align: 'center', color: 'rgba(255,255,255,.75)', font: FONT_UI, weight: 600 });
}

// ---------- HUD ----------
function drawHealthBar(ctx, f, x, y, w, h, right, t) {
  // frame
  ctx.save();
  ctx.fillStyle = '#000'; ctx.fillRect(x - 3, y - 3, w + 6, h + 6);
  ctx.fillStyle = '#3A0A0A'; ctx.fillRect(x, y, w, h);
  const r = f.hp / f.maxHp, rd = f.dispHp / f.maxHp;
  const drawSeg = (ratio, fill) => {
    const ww = w * ratio;
    ctx.fillStyle = fill;
    if (right) ctx.fillRect(x, y, ww, h); else ctx.fillRect(x + w - ww, y, ww, h);
  };
  drawSeg(rd, '#E8202A');
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  const low = r < 0.25 && (t % 30) < 15;
  if (low) { g.addColorStop(0, '#FFB3A0'); g.addColorStop(1, '#FF3B30'); }
  else { g.addColorStop(0, '#FFF3A0'); g.addColorStop(0.5, '#FFC233'); g.addColorStop(1, '#E88A00'); }
  drawSeg(r, g);
  ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(x, y + 2, w, 3);
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(x - 1, y - 1, w + 2, h + 2);
  ctx.restore();
}
function drawSuperBar(ctx, f, x, y, w, right, t) {
  const full = f.meter >= 100;
  ctx.save();
  ctx.fillStyle = '#000'; ctx.fillRect(x - 3, y - 3, w + 6, 18);
  ctx.fillStyle = '#101030'; ctx.fillRect(x, y, w, 12);
  const ww = w * f.meter / 100;
  const g = ctx.createLinearGradient(x, 0, x + w, 0);
  if (full) { const ph = (t % 20) / 20; g.addColorStop(0, '#7FE3FF'); g.addColorStop(ph, '#FFFFFF'); g.addColorStop(1, '#B44CFF'); }
  else { g.addColorStop(0, '#2C7BE5'); g.addColorStop(1, '#7FE3FF'); }
  ctx.fillStyle = g;
  if (right) ctx.fillRect(x + w - ww, y, ww, 12); else ctx.fillRect(x, y, ww, 12);
  ctx.strokeStyle = full ? '#FFE14D' : '#88A'; ctx.lineWidth = 2; ctx.strokeRect(x - 1, y - 1, w + 2, 14);
  const lx = right ? x + w : x;
  txt(ctx, full ? 'SUPER  READY!' : 'SUPER', lx, y - 6, { size: full ? 16 : 13, align: right ? 'right' : 'left', color: full ? '#FFE14D' : '#BFD0FF', stroke: '#000', sw: 4, italic: true });
  ctx.restore();
}
function drawBubble(ctx, text, x, y, alphaV) {
  ctx.save();
  ctx.globalAlpha = alphaV;
  ctx.font = `700 15px ${FONT_UI}`;
  const lines = wrapLines(ctx, text, 230);
  const w = Math.max(...lines.map(l => ctx.measureText(l).width)) + 24, h = lines.length * 19 + 16;
  const bx = clamp(x - w / 2, 8, W - w - 8), by = y - h - 16;
  rrect(ctx, bx, by, w, h, 10); ctx.fillStyle = '#fff'; ctx.fill();
  ctx.strokeStyle = OUT; ctx.lineWidth = 3; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(clamp(x, bx + 14, bx + w - 14) - 8, by + h - 1); ctx.lineTo(clamp(x, bx + 14, bx + w - 14), by + h + 13); ctx.lineTo(clamp(x, bx + 14, bx + w - 14) + 8, by + h - 1); ctx.fillStyle = '#fff'; ctx.fill();
  lines.forEach((l, i) => txt(ctx, l, bx + 12, by + 23 + i * 19, { size: 15, color: '#1a1a2a', font: FONT_UI, weight: 700 }));
  ctx.restore();
}
// big slammed announcement text
function bigText(ctx, s, k, o = {}) {
  const size = o.size || 96;
  const sc = k < 0.15 ? lerp(2.4, 1, Ease.outCubic(k / 0.15)) : 1;
  const a = k > 0.85 ? (1 - k) / 0.15 : 1;
  ctx.save();
  ctx.globalAlpha = clamp(a, 0, 1);
  ctx.translate(W / 2, o.y || H / 2 - 20);
  ctx.scale(sc, sc);
  ctx.transform(1, 0, -0.15, 1, 0, 0);
  const g = ctx.createLinearGradient(0, -size * .8, 0, 0);
  const cols = o.cols || ['#FFF6B0', '#FFC233', '#FF5A1A'];
  g.addColorStop(0, cols[0]); g.addColorStop(0.5, cols[1]); g.addColorStop(1, cols[2]);
  ctx.font = `900 ${size}px ${FONT}`; ctx.textAlign = 'center'; ctx.lineJoin = 'round';
  ctx.strokeStyle = '#000'; ctx.lineWidth = size * 0.22; ctx.strokeText(s, 0, size * 0.35);
  ctx.strokeStyle = '#fff'; ctx.lineWidth = size * 0.09; ctx.strokeText(s, 0, size * 0.35);
  ctx.fillStyle = g; ctx.fillText(s, 0, size * 0.35);
  ctx.restore();
}

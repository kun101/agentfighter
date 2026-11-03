'use strict';
// ---------- Projectiles & particle effects ----------
class Projectile {
  constructor(o) {
    Object.assign(this, {
      x: 0, y: 0, vx: 0, vy: 0, w: 40, h: 40, dmg: 60, hits: 1, life: 240, t: 0, type: 'orb', owner: null,
      hs: 18, bs: 14, hit: 8, push: 7, chip: 0.25, guard: 'mid', rehit: 0, interval: 8, dead: false, kd: false,
      wave: false, beam: false, delay: 0, gravity: 0, hitList: 0, special: true, y0: 0, isSuper: false,
    }, o);
    this.y0 = this.y;
    this.dir = this.vx < 0 ? -1 : 1;
  }
  get active() { return this.delay <= 0 && !this.dead; }
  box() {
    if (this.beam) {
      const o = this.owner, len = Math.min(this.t * 70, 900);
      const x0 = o.x + o.facing * 40;
      return { x: o.facing > 0 ? x0 : x0 - len, y: this.y - this.h / 2, w: len, h: this.h };
    }
    return { x: this.x - this.w / 2, y: this.y - this.h / 2, w: this.w, h: this.h };
  }
  update(g) {
    if (this.delay > 0) { this.delay--; return; }
    this.t++;
    if (this.rehit > 0) this.rehit--;
    if (this.beam) {
      const o = this.owner;
      this.x = o.x; this.y = o.y - 118 * o.def.scale;
      if (this.t > this.life || o.state !== 'attack') this.dead = true;
      if (this.t % 3 === 0) g.addPart({ type: 'spark', x: o.x + o.facing * rand(60, 600), y: this.y + rand(-30, 30), vx: o.facing * rand(4, 10), vy: rand(-2, 2), life: 14, col: this.col || '#fff', size: 3 });
      return;
    }
    this.vy += this.gravity;
    this.x += this.vx; this.y += this.vy;
    if (this.wave) this.y = this.y0 + Math.sin(this.t * 0.14) * 20;
    if (--this.life <= 0) this.dead = true;
    if (this.x < g.camX - 160 || this.x > g.camX + W + 160) this.dead = true;
    if (this.gravity && this.y >= GROUND - 10) {
      this.dead = true;
      g.addPart({ type: 'ring', x: this.x, y: GROUND - 6, life: 18, col: this.col || '#fff', size: 30 });
      for (let i = 0; i < 6; i++) g.addPart({ type: 'spark', x: this.x, y: GROUND - 8, vx: rand(-5, 5), vy: rand(-6, -1), life: 16, col: this.col || '#fff', size: 3 });
    }
    // trail particles
    if (this.t % 3 === 0 && this.type !== 'tsunami') g.addPart({ type: 'dot', x: this.x - this.dir * this.w * 0.4, y: this.y + rand(-8, 8), vx: -this.vx * 0.15, vy: rand(-.5, .5), life: 16, col: this.col || '#fff', size: rand(3, 6) });
  }
  draw(ctx, g) {
    if (this.delay > 0) return;
    const fn = PROJ_DRAW[this.type] || PROJ_DRAW.orb;
    ctx.save();
    ctx.translate(this.x, this.y);
    if (!this.beam) ctx.scale(this.dir, 1);
    fn(ctx, this, this.t, g);
    ctx.restore();
  }
}

function glowCircle(ctx, r, inner, outer) {
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
  g.addColorStop(0, inner); g.addColorStop(0.45, outer); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; circle(ctx, 0, 0, r); ctx.fill();
}

const PROJ_DRAW = {
  puff(ctx, p, t) {
    // fluffy pink cloud with a heart
    const wob = Math.sin(t * 0.3) * 2;
    const blobs = [[-16, 4, 15], [0, -8, 18], [16, 2, 15], [4, 10, 14], [-8, 12, 12]];
    ctx.fillStyle = OUT; for (const [x, y, r] of blobs) { circle(ctx, x, y + wob, r + 3); ctx.fill(); }
    ctx.fillStyle = '#FFD6E0'; for (const [x, y, r] of blobs) { circle(ctx, x, y + wob, r); ctx.fill(); }
    ctx.fillStyle = '#FFFFFF'; circle(ctx, -4, -12 + wob, 6); ctx.fill();
    ctx.fillStyle = '#FF6F91';
    ctx.beginPath(); ctx.moveTo(2, 8 + wob); ctx.bezierCurveTo(-10, -2 + wob, -4, -10 + wob, 2, -3 + wob); ctx.bezierCurveTo(8, -10 + wob, 14, -2 + wob, 2, 8 + wob); ctx.fill();
    for (let i = 0; i < 3; i++) { ctx.fillStyle = 'rgba(255,214,224,.6)'; circle(ctx, -34 - i * 12 - (t * 2 % 12), (i % 2 ? 6 : -4), 5 - i); ctx.fill(); }
  },
  orb(ctx, p, t) {
    glowCircle(ctx, 46, 'rgba(255,255,255,1)', alpha('#B44CFF', .8));
    ctx.fillStyle = '#05050A'; circle(ctx, 0, 0, 16); ctx.fill();
    ctx.strokeStyle = '#E6CCFF'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(0, 0, 30, 8, t * .2, 0, Math.PI * 2); ctx.stroke();
  },
  artifact(ctx, p, t) {
    // a glowing document card spinning forward, trailing sparks of orange light
    glowCircle(ctx, 52, 'rgba(255,200,150,.55)', 'rgba(240,123,46,.35)');
    for (let i = 0; i < 3; i++) { ctx.fillStyle = 'rgba(255,170,100,' + (0.5 - i * 0.12) + ')'; ctx.fillRect(-58 - i * 16 - (t * 4 % 16), -10 + i * 8, 14, 3); }
    ctx.save(); ctx.rotate(Math.sin(t * 0.3) * 0.12); ctx.scale(1, 0.85 + Math.abs(Math.cos(t * 0.15)) * 0.15);
    claudeCard(ctx, 46, 38, Math.floor(t / 20) % 3, 1);
    ctx.restore();
  },
  tokens(ctx, p, t) {
    glowCircle(ctx, 44, 'rgba(255,255,255,1)', 'rgba(170,180,200,.55)');
    const chars = ['A', 'I', '7', '{', '}', '#', 'λ', '?'];
    for (let i = 0; i < 8; i++) {
      const a = t * .15 + i * Math.PI / 4, r = 16 + (i % 2) * 8;
      txt(ctx, chars[i], Math.cos(a) * r, Math.sin(a) * r + 6, { size: 15, align: 'center', color: i % 2 ? '#fff' : '#C9CED4', font: FONT_UI, stroke: OUT, sw: 3 });
    }
    ctx.fillStyle = '#fff'; circle(ctx, 0, 0, 7); ctx.fill();
  },
  twin(ctx, p, t) {
    // rainbow four-point star with a streaming rainbow trail
    const cols = ['#FF3B3B', '#FF9A1F', '#FFE03A', '#2ED47A', '#2F8CFF', '#8A4DFF'];
    ctx.lineCap = 'round';
    cols.forEach((c, i) => {
      ctx.strokeStyle = c; ctx.lineWidth = 5; ctx.globalAlpha = 0.85;
      const y = -12.5 + i * 5, wob = Math.sin(t * 0.3 + i * 0.6) * 3;
      ctx.beginPath(); ctx.moveTo(-14, y * 0.6); ctx.quadraticCurveTo(-40, y + wob, -70 - (i % 3) * 6, y * 1.3 + wob); ctx.stroke();
    });
    ctx.globalAlpha = 1;
    glowCircle(ctx, 38, 'rgba(255,255,255,1)', 'rgba(160,110,255,.55)');
    ctx.rotate(Math.sin(t * .2) * .25);
    star4Path(ctx, 26, 0.18); ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.strokeStyle = '#FFFFFF'; ctx.stroke();
    const gr = ctx.createLinearGradient(-20, -20, 20, 20);
    cols.forEach((c, i) => gr.addColorStop(i / (cols.length - 1), c));
    ctx.fillStyle = gr; ctx.fill();
    star4Path(ctx, 11, 0.2); ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fill();
  },
  star(ctx, p, t) {
    glowCircle(ctx, 34, 'rgba(255,255,255,1)', 'rgba(185,166,255,.6)');
    ctx.rotate(t * .3);
    star4Path(ctx, 20, 0.25); ctx.fillStyle = '#fff'; ctx.fill();
    ctx.strokeStyle = 'rgba(200,190,255,.6)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-p.vx * 6, -p.vy * 6); ctx.stroke();
  },
  slash(ctx, p, t) {
    ctx.save();
    ctx.shadowColor = '#FF3B30'; ctx.shadowBlur = 18;
    ctx.fillStyle = '#FF3B30';
    ctx.beginPath(); ctx.arc(-12, 0, 40, -Math.PI / 2.2, Math.PI / 2.2); ctx.arc(-26, 0, 34, Math.PI / 2.4, -Math.PI / 2.4, true); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(-12, 0, 34, -Math.PI / 2.6, Math.PI / 2.6); ctx.arc(-20, 0, 30, Math.PI / 2.8, -Math.PI / 2.8, true); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,60,48,.5)'; ctx.lineWidth = 3;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-40 - i * 14, -18 + i * 18); ctx.lineTo(-80 - i * 14 - (t * 3 % 20), -18 + i * 18); ctx.stroke(); }
    void t;
  },
  saturn(ctx, p, t) {
    // a dark planet core wrapped in a glowing orbit ring
    ctx.save(); ctx.rotate(-0.35);
    const ring = (a0, a1) => {
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(160,140,255,.45)'; ctx.lineWidth = 12; ctx.beginPath(); ctx.ellipse(0, 0, 46, 14, 0, a0, a1); ctx.stroke();
      ctx.strokeStyle = '#F0EEFF'; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(0, 0, 46, 14, 0, a0, a1); ctx.stroke();
    };
    ring(Math.PI, Math.PI * 2);
    glowCircle(ctx, 34, 'rgba(230,225,255,.9)', 'rgba(140,110,255,.45)');
    ctx.fillStyle = '#0D0D12'; circle(ctx, 0, 0, 15); ctx.fill();
    ctx.strokeStyle = 'rgba(220,210,255,.8)'; ctx.lineWidth = 2; circle(ctx, 0, 0, 15); ctx.stroke();
    ring(0, Math.PI);
    ctx.restore();
    ctx.strokeStyle = 'rgba(200,190,255,.55)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) { const o = (t * 4 + i * 9) % 24; ctx.beginPath(); ctx.moveTo(-50 - o, -14 + i * 14); ctx.lineTo(-76 - o, -14 + i * 14); ctx.stroke(); }
    void p;
  },
  ring(ctx, p, t) {
    glowCircle(ctx, 44, 'rgba(230,250,255,1)', 'rgba(24,200,255,.5)');
    ctx.rotate(t * .2);
    ctx.lineWidth = 9; ctx.strokeStyle = OUT; circle(ctx, 0, 0, 22); ctx.stroke();
    const g = ctx.createLinearGradient(-22, 0, 22, 0); g.addColorStop(0, '#18C8FF'); g.addColorStop(1, '#9B5CFF');
    ctx.lineWidth = 6; ctx.strokeStyle = g; circle(ctx, 0, 0, 22); ctx.stroke();
    ctx.lineWidth = 3; ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, 22, 0, 1.2); ctx.stroke();
  },
  plane(ctx, p, t) {
    ctx.rotate(Math.sin(t * .2) * .1);
    ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(30, 0); ctx.lineTo(-24, -18); ctx.lineTo(-14, 0); ctx.lineTo(-24, 16); ctx.closePath();
    ctx.lineWidth = 4; ctx.strokeStyle = OUT; ctx.stroke(); ctx.fillStyle = '#FFFFFF'; ctx.fill();
    ctx.beginPath(); ctx.moveTo(30, 0); ctx.lineTo(-14, 0); ctx.lineTo(-20, 8); ctx.closePath(); ctx.fillStyle = '#C9D8F0'; ctx.fill();
    const cols = ['#F7B32B', '#E84393', '#25C2A0', '#2C9BF0'];
    cols.forEach((c, i) => { ctx.strokeStyle = c; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-26, -6 + i * 4); ctx.lineTo(-50 - (t * 4 + i * 7) % 20, -6 + i * 4 + Math.sin(t * .3 + i) * 3); ctx.stroke(); });
  },
  wave(ctx, p, t) {
    ctx.save();
    const h = 56 + Math.sin(t * .3) * 4;
    ctx.beginPath(); ctx.moveTo(-50, 40);
    ctx.quadraticCurveTo(-30, -h * .2, 0, -h * .6);
    ctx.quadraticCurveTo(30, -h, 34, -h * .4);
    ctx.quadraticCurveTo(26, -h * .25, 40, 40);
    ctx.closePath();
    ctx.lineWidth = 4; ctx.strokeStyle = OUT; ctx.stroke();
    const g = ctx.createLinearGradient(0, -h, 0, 40); g.addColorStop(0, '#E9FBFF'); g.addColorStop(.4, '#7FD8FF'); g.addColorStop(1, '#2F55E6');
    ctx.fillStyle = g; ctx.fill();
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 5; i++) { circle(ctx, 20 + Math.sin(t * .4 + i) * 10, -h * .5 + i * 6, 3); ctx.fill(); }
    ctx.restore();
  },
  whale(ctx, p, t) {
    // a glowing spirit whale swimming forward, tail beating
    const sw = Math.sin(t * 0.35);
    glowCircle(ctx, 62, 'rgba(160,230,255,.55)', 'rgba(60,110,255,.3)');
    ctx.save();
    ctx.lineJoin = 'round';
    const body = () => {
      ctx.beginPath();
      ctx.moveTo(44, 2);
      ctx.bezierCurveTo(44, -22, 14, -26, -6, -18);
      ctx.bezierCurveTo(-22, -12, -34, -4, -46, -6 + sw * 4);
      ctx.lineTo(-62, -20 + sw * 8); ctx.quadraticCurveTo(-58, -4 + sw * 5, -50, 0 + sw * 4);
      ctx.quadraticCurveTo(-58, 6 + sw * 4, -64, 16 + sw * 6); ctx.lineTo(-44, 4 + sw * 3);
      ctx.bezierCurveTo(-30, 12, -6, 20, 14, 18);
      ctx.bezierCurveTo(32, 16, 44, 12, 44, 2);
      ctx.closePath();
    };
    body();
    ctx.lineWidth = 9; ctx.strokeStyle = 'rgba(90,150,255,.55)'; ctx.stroke();
    const g = ctx.createLinearGradient(0, -24, 0, 20);
    g.addColorStop(0, '#9FD8FF'); g.addColorStop(0.5, '#4C7DFF'); g.addColorStop(1, '#2A3FE0');
    ctx.fillStyle = g; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = '#E8F8FF'; ctx.stroke();
    // belly, fin, eye and streaks
    ctx.fillStyle = 'rgba(235,250,255,.85)';
    ctx.beginPath(); ctx.moveTo(40, 6); ctx.bezierCurveTo(26, 16, 0, 16, -18, 8); ctx.bezierCurveTo(0, 10, 24, 8, 40, 6); ctx.fill();
    ctx.fillStyle = '#2A3FE0'; ctx.beginPath(); ctx.moveTo(-8, -18); ctx.lineTo(-20, -30); ctx.lineTo(-18, -14); ctx.fill();
    ctx.fillStyle = '#FFFFFF'; circle(ctx, 26, -6, 3); ctx.fill();
    ctx.strokeStyle = 'rgba(200,240,255,.7)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) { const o = (t * 5 + i * 11) % 30; ctx.beginPath(); ctx.moveTo(-66 - o, -12 + i * 12); ctx.lineTo(-90 - o, -12 + i * 12); ctx.stroke(); }
    ctx.restore();
  },
  gust(ctx, p, t) {
    ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      ctx.strokeStyle = ['#FFD800', '#FFAF00', '#FF8205', '#FA520F'][i]; ctx.lineWidth = 6 - i;
      ctx.beginPath(); ctx.arc(0, 0, 10 + i * 8, t * .35 + i, t * .35 + i + 4.2); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 3;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-30 - i * 10, -20 + i * 20); ctx.lineTo(-70 - i * 10, -20 + i * 20); ctx.stroke(); }
  },
  tsunami(ctx, p, t) {
    const h = p.h;
    ctx.beginPath();
    ctx.moveTo(-p.w * .6, h / 2);
    ctx.quadraticCurveTo(-p.w * .5, -h * .2, -p.w * .1, -h * .42);
    ctx.quadraticCurveTo(p.w * .45, -h * .62, p.w * .55, -h * .2);
    ctx.quadraticCurveTo(p.w * .3, -h * .25, p.w * .25, -h * .05);
    ctx.quadraticCurveTo(p.w * .5, h * .2, p.w * .6, h / 2);
    ctx.closePath();
    ctx.lineWidth = 5; ctx.strokeStyle = OUT; ctx.stroke();
    const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2); g.addColorStop(0, '#F0FCFF'); g.addColorStop(.3, '#7FD8FF'); g.addColorStop(1, '#1D3FCF');
    ctx.fillStyle = g; ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    for (let i = 0; i < 9; i++) { circle(ctx, p.w * .35 + Math.sin(t * .3 + i) * 16, -h * .4 + i * 10, 4 + (i % 3)); ctx.fill(); }
    // whale silhouette inside
    ctx.fillStyle = 'rgba(30,50,160,.5)';
    ctx.beginPath(); ctx.ellipse(-10, h * .1, 40, 18, 0, 0, Math.PI * 2); ctx.fill();
  },
  beam(ctx, p, t) {
    const o = p.owner, len = Math.min(p.t * 70, 900), f = o.facing;
    const x0 = f * 40, hh = p.h * (0.8 + Math.sin(t * .8) * .1);
    ctx.save();
    ctx.translate(x0, 0);
    ctx.scale(f, 1);
    const col = p.col || '#7FE3FF';
    const g = ctx.createLinearGradient(0, -hh, 0, hh);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(.25, alpha(col, .7)); g.addColorStop(.5, '#FFFFFF'); g.addColorStop(.75, alpha(col, .7)); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, -hh, len, hh * 2);
    ctx.fillStyle = '#fff'; ctx.fillRect(0, -hh * .18, len, hh * .36);
    glowCircle(ctx, hh * 1.4, '#fff', alpha(col, .8));
    ctx.translate(len, 0); glowCircle(ctx, hh * 1.2, '#fff', alpha(col, .6));
    ctx.restore();
  },
};

// ---------- particles ----------
function updatePart(p) {
  p.t = (p.t || 0) + 1;
  p.x += p.vx || 0; p.y += p.vy || 0;
  if (p.grav) p.vy += p.grav;
  if (p.drag) { p.vx *= p.drag; p.vy *= p.drag; }
  return p.t < p.life;
}
function drawPart(ctx, p) {
  const k = p.t / p.life, a = 1 - k;
  ctx.save();
  switch (p.type) {
    case 'spark': {
      ctx.strokeStyle = p.col; ctx.globalAlpha = a; ctx.lineWidth = p.size || 3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 2.5, p.y - p.vy * 2.5); ctx.stroke(); break;
    }
    case 'dot': ctx.globalAlpha = a * .8; ctx.fillStyle = p.col; circle(ctx, p.x, p.y, p.size * (1 - k * .5)); ctx.fill(); break;
    case 'ring': ctx.globalAlpha = a; ctx.strokeStyle = p.col; ctx.lineWidth = 6 * a + 1; circle(ctx, p.x, p.y, p.size * (0.3 + Ease.outCubic(k) * 1.2)); ctx.stroke(); break;
    case 'flash': {
      ctx.globalAlpha = a; const r = p.size * (0.5 + k);
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r); g.addColorStop(0, '#fff'); g.addColorStop(.4, alpha(p.col, .8)); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; circle(ctx, p.x, p.y, r); ctx.fill(); break;
    }
    case 'burst': {
      // jagged comic hit star
      ctx.globalAlpha = Math.min(1, a * 1.6); ctx.translate(p.x, p.y); ctx.rotate(p.rot || 0);
      const n = 10, r1 = p.size * (0.6 + k * .5), r2 = r1 * .45;
      ctx.beginPath();
      for (let i = 0; i < n * 2; i++) { const r = i % 2 ? r2 : r1 * (i % 4 === 0 ? 1 : .8); const an = i / (n * 2) * Math.PI * 2; ctx.lineTo(Math.cos(an) * r, Math.sin(an) * r); }
      ctx.closePath(); ctx.fillStyle = p.col; ctx.fill();
      ctx.scale(.5, .5); ctx.fillStyle = '#fff'; ctx.fill(); break;
    }
    case 'dust': ctx.globalAlpha = a * .5; ctx.fillStyle = p.col || '#d8d0c0'; circle(ctx, p.x, p.y, p.size * (0.6 + k)); ctx.fill(); break;
    case 'text': {
      ctx.globalAlpha = Math.min(1, a * 2);
      const sc = k < .15 ? Ease.outBack(k / .15) : 1;
      ctx.translate(p.x, p.y - k * 20); ctx.scale(sc, sc);
      txt(ctx, p.text, 0, 0, { size: p.size || 22, align: 'center', color: p.col || '#fff', stroke: OUT, sw: 5, italic: true }); break;
    }
    case 'ghost': {
      // after-image of a fighter
      ctx.globalAlpha = a * .45;
      if (pixelMode()) {
        if (!p.spr) p.spr = fighterSprite(p.def, p.face, p.pose, { t: p.ft, expr: 'angry' }, true);
        blitSprite(ctx, p.spr, p.x, p.y);
      } else drawFighterRig(ctx, p.def, p.x, p.y, p.face, p.pose, { shadow: false, t: p.ft, expr: 'angry' });
      break;
    }
  }
  ctx.restore();
}

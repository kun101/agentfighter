'use strict';
// ---------- Roster: six chatbot-mascot fighters (parody designs), one archetype each ----------

// small visor-eye helper for robot-style heads
function visorEyes(ctx, x, y, gap, r, expr, col, t) {
  ctx.save();
  ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineCap = 'round'; ctx.lineWidth = r * 0.55;
  const blink = expr === 'normal' && (t % 220) < 6;
  for (let i = 0; i < 2; i++) {
    const ex = x + (i ? gap / 2 : -gap / 2);
    ctx.beginPath();
    if (expr === 'ko') { ctx.moveTo(ex - r * .6, y - r * .6); ctx.lineTo(ex + r * .6, y + r * .6); ctx.moveTo(ex + r * .6, y - r * .6); ctx.lineTo(ex - r * .6, y + r * .6); ctx.stroke(); }
    else if (expr === 'hurt') { const d = i ? -1 : 1; ctx.moveTo(ex - r * .6 * d, y - r * .6); ctx.lineTo(ex + r * .5 * d, y); ctx.lineTo(ex - r * .6 * d, y + r * .6); ctx.stroke(); }
    else if (expr === 'happy') { ctx.arc(ex, y + r * .4, r * .7, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
    else if (blink) { ctx.moveTo(ex - r * .6, y); ctx.lineTo(ex + r * .6, y); ctx.stroke(); }
    else if (expr === 'angry' || expr === 'strain') {
      const d = i ? 1 : -1;
      ctx.moveTo(ex - r * .7, y - r * .5 * d * -1 - r * .2); ctx.lineTo(ex + r * .7, y + r * .5 * d * -1 - r * .2); ctx.lineTo(ex + r * .7, y + r * .6); ctx.lineTo(ex - r * .7, y + r * .6); ctx.closePath(); ctx.fill();
    } else { ctx.ellipse(ex, y, r * .55, r * .8, 0, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.restore();
}
function sparkle(ctx, x, y, r, col) {
  ctx.beginPath();
  ctx.moveTo(x, y - r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y); ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.fillStyle = col; ctx.fill();
}
function star4Path(ctx, R, k) {
  ctx.beginPath();
  ctx.moveTo(0, -R);
  ctx.quadraticCurveTo(R * k, -R * k, R, 0);
  ctx.quadraticCurveTo(R * k, R * k, 0, R);
  ctx.quadraticCurveTo(-R * k, R * k, -R, 0);
  ctx.quadraticCurveTo(-R * k, -R * k, 0, -R);
  ctx.closePath();
}
function ribbon(ctx, pts, w0, w1, c0, c1) {
  // tapered ribbon through points
  for (let i = 0; i < pts.length - 1; i++) {
    const t = i / (pts.length - 1);
    ctx.lineCap = 'round';
    ctx.strokeStyle = OUT; ctx.lineWidth = lerp(w0, w1, t) + 4;
    ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[i + 1].x, pts[i + 1].y); ctx.stroke();
  }
  for (let i = 0; i < pts.length - 1; i++) {
    const t = i / (pts.length - 1);
    ctx.strokeStyle = t < 0.5 ? c0 : c1; ctx.lineWidth = lerp(w0, w1, t);
    ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[i + 1].x, pts[i + 1].y); ctx.stroke();
  }
}
function scarfPts(rig, t, len, amp) {
  const pts = [];
  const n = rig.neck, f = rig.face;
  for (let i = 0; i < 8; i++) {
    pts.push({ x: n.x - f * (4 + i * len), y: n.y + 6 + i * 2.5 + Math.sin(t * 0.18 - i * 0.8) * amp * (i / 7) });
  }
  return pts;
}


// ---- clothing helpers (rig space: hip at 0,0, x already mirrored by facing) ----
function lerpPt(a, b, k) { return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k }; }
// a skirt / robe / coat hem hanging from the hips and following the knees
function drawHem(ctx, rig, o) {
  const s = rig.s, f = rig.face, hw = o.hipW * s / 2;
  const fk = lerpPt(rig.FL[1], rig.FL[2], o.len), bk = lerpPt(rig.BL[1], rig.BL[2], o.len);
  const flare = (o.flare || 8) * s;
  const top = -(o.top || 6) * s;
  const fh = { x: Math.max(fk.x * f, hw) * f + f * flare, y: fk.y }, bh = { x: Math.min(bk.x * f, -hw) * f - f * flare, y: bk.y };
  const low = Math.max(fh.y, bh.y);
  ctx.beginPath();
  ctx.moveTo(-f * hw, top);
  ctx.lineTo(f * hw, top);
  ctx.quadraticCurveTo(fh.x, (top + fh.y) / 2, fh.x, Math.min(fh.y, low));
  const n = o.pleats || 0;
  if (n) for (let i = 1; i <= n; i++) { const k = i / n; ctx.lineTo(lerp(fh.x, bh.x, k - 0.5 / n), low + (i % 2 ? 3 * s : 0)); ctx.lineTo(lerp(fh.x, bh.x, k), low); }
  else ctx.quadraticCurveTo((fh.x + bh.x) / 2, low + (o.sag || 6) * s, bh.x, bh.y);
  ctx.quadraticCurveTo(bh.x, (top + bh.y) / 2, -f * hw, top);
  ctx.closePath();
  ctx.lineWidth = 5; ctx.strokeStyle = OUT; ctx.lineJoin = 'round'; ctx.stroke();
  ctx.fillStyle = o.col; ctx.fill();
  ctx.save(); ctx.clip();
  ctx.fillStyle = 'rgba(10,0,30,0.22)'; ctx.fillRect(f > 0 ? bh.x - 40 : fh.x - 40, top - 4, Math.abs(fh.x - bh.x) * 0.35 + 40, 200);
  if (o.trim) { ctx.strokeStyle = o.trim; ctx.lineWidth = 5 * s; ctx.beginPath(); ctx.moveTo(fh.x, low - 3 * s); ctx.lineTo(bh.x, low - 3 * s); ctx.stroke(); }
  if (o.split) { ctx.strokeStyle = 'rgba(10,0,30,0.45)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, top); ctx.lineTo((fh.x + bh.x) / 2, low); ctx.stroke(); }
  ctx.restore();
}

// a baggy trouser leg ballooning from mid-thigh past the knee to a gathered hem on the shin (outer silhouette inked)
function balloonLeg(ctx, rig, L, col, w, hemAt, bulge) {
  const s = rig.s, top = lerpPt(L[0], L[1], 0.25), kn = L[1], hem = lerpPt(L[1], L[2], hemAt);
  const tx = kn.x - top.x, ty = kn.y - top.y, tl = Math.hypot(tx, ty) || 1, mx = -ty / tl, my = tx / tl;
  const ux = hem.x - kn.x, uy = hem.y - kn.y, ul = Math.hypot(ux, uy) || 1, nx = -uy / ul, ny = ux / ul;
  const wt = w * 0.56, b = bulge || 1;
  const path = c => {
    c.beginPath();
    c.moveTo(top.x + mx * wt, top.y + my * wt);
    c.quadraticCurveTo(kn.x + nx * w * b, kn.y + ny * w * b, hem.x + nx * w * 0.36, hem.y + ny * w * 0.36);
    c.lineTo(hem.x - nx * w * 0.36, hem.y - ny * w * 0.36);
    c.quadraticCurveTo(kn.x - nx * w * b * 0.95, kn.y - ny * w * b * 0.95, top.x - mx * wt, top.y - my * wt);
    c.closePath();
  };
  ctx.lineJoin = 'round'; path(ctx); ctx.lineWidth = 4; ctx.strokeStyle = OUT; ctx.stroke();
  cel(ctx, path, col, { noOutline: true, k: 6 * s });
  return { top, kn, hem, nx, ny, mx, my };
}
const ROSTER = [];
const CHARS = {};
function defChar(d) {
  d.scale = (d.scale || 1) * 1.12; d.headR = d.headR || 30;
  const st = STYLES[d.style || 'karate'];
  d.styleName = st.label;
  d.poses = Object.assign({}, st.poses, d.poses || {});
  d.idle = Object.assign({}, st.idle, d.idle || {});
  d.walk = Object.assign({}, st.walk, d.walk || {});
  const nm = {};
  for (const k of new Set([...Object.keys(st.normals || {}), ...Object.keys(d.normals || {})])) nm[k] = Object.assign({}, (st.normals || {})[k], (d.normals || {})[k]);
  d.normals = nm;
  d.stats.jumpV *= 1.05;
  ROSTER.push(d); CHARS[d.id] = d;
  return d;
}

// ========================= CLAWDIUS =========================
// Archetype: SHOTO (all-rounder, fireball + uppercut). A calm hooded mystic: a great orange asterisk halo behind a
// cream pointed hood, a black face void with glowing eyes, orange scarf, cream capelet and long coat tails with
// orange triangle trim, a dark inner robe, gold bead belt and tassel, charcoal gloves, cream shin wraps.
const CL = { orange: '#F07B2E', orangeDk: '#C8561B', cream: '#F2E4CF', creamDk: '#D9C3A6', robe: '#2B2140', pants: '#2A2034', glove: '#2A2530', gold: '#E9A93A', goldDk: '#B57A1E', void: '#120C16', shoe: '#221A28' };
// the asterisk halo: ten flat rays with angled ends radiating from (0,0)
function claudeHalo(ctx, R, t) {
  ctx.save(); ctx.rotate(Math.sin(t * 0.02) * 0.04);
  const rays = c => {
    c.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * Math.PI * 2 + 0.16, len = R * (i % 2 ? 1.0 : 0.92), w = R * 0.115;
      const ca = Math.cos(a), sa = Math.sin(a), nx = -sa, ny = ca;
      const r0 = R * 0.2, r1 = len, tip = len + w * 0.55;
      c.moveTo(ca * r0 + nx * w * 0.8, sa * r0 + ny * w * 0.8);
      c.lineTo(ca * r1 + nx * w, sa * r1 + ny * w);
      c.lineTo(ca * tip + nx * w * 0.25, sa * tip + ny * w * 0.25);
      c.lineTo(ca * tip - nx * w * 0.25, sa * tip - ny * w * 0.25);
      c.lineTo(ca * r1 - nx * w, sa * r1 - ny * w);
      c.lineTo(ca * r0 - nx * w * 0.8, sa * r0 - ny * w * 0.8);
      c.closePath();
    }
    c.moveTo(R * 0.24, 0); c.arc(0, 0, R * 0.24, 0, Math.PI * 2);
  };
  ctx.save(); ctx.shadowColor = 'rgba(255,140,60,0.7)'; ctx.shadowBlur = R * 0.25;
  rays(ctx); ctx.fillStyle = CL.orange; ctx.fill(); ctx.restore();
  cel(ctx, rays, CL.orange, { k: R * 0.05, lw: 3.5, rim: 'rgba(255,220,170,0.8)' });
  ctx.restore();
}
// the hood with its black face void and glowing eyes, facing +x, centred at 0,0
function claudeHood(ctx, R, expr, t) {
  const hood = c => {
    c.beginPath();
    c.moveTo(-0.5 * R, -1.22 * R);
    c.bezierCurveTo(-0.1 * R, -1.18 * R, 0.85 * R, -0.95 * R, 0.95 * R, -0.25 * R);
    c.quadraticCurveTo(1.1 * R, 0.3 * R, 0.82 * R, 0.82 * R);
    c.quadraticCurveTo(0.1 * R, 1.02 * R, -0.7 * R, 0.86 * R);
    c.quadraticCurveTo(-1.12 * R, 0.35 * R, -1.0 * R, -0.3 * R);
    c.bezierCurveTo(-1.02 * R, -0.75 * R, -0.85 * R, -1.05 * R, -0.5 * R, -1.22 * R);
    c.closePath();
  };
  cel(ctx, hood, CL.cream, { k: R * 0.22, lw: 4.5, rim: 'rgba(255,190,120,0.9)', rimW: R * 0.06 });
  // fold line down the back of the hood
  ctx.strokeStyle = CL.creamDk; ctx.lineWidth = R * 0.05; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-0.3 * R, -1.0 * R); ctx.quadraticCurveTo(-0.55 * R, -0.3 * R, -0.4 * R, 0.6 * R); ctx.stroke();
  // face opening: a dark void framed by the hood's thick inner rim
  const face = c => { c.beginPath(); c.ellipse(0.42 * R, 0.16 * R, 0.56 * R, 0.62 * R, 0.1, 0, Math.PI * 2); };
  face(ctx); ctx.fillStyle = CL.creamDk; ctx.fill();
  ctx.save(); ctx.translate(0.05 * R, 0.02 * R); ctx.scale(0.86, 0.9); face(ctx); ctx.restore();
  ctx.save(); ctx.translate(0.07 * R, 0.03 * R); ctx.scale(0.84, 0.88); face(ctx); ctx.fillStyle = CL.void; ctx.fill(); ctx.restore();
  // glowing slanted eyes
  const blink = expr === 'normal' && (t % 200) < 7, fierce = expr === 'angry' || expr === 'strain';
  ctx.save();
  ctx.shadowColor = 'rgba(255,170,90,0.95)'; ctx.shadowBlur = R * 0.3;
  ctx.fillStyle = '#FFF4E8'; ctx.strokeStyle = '#FFF4E8'; ctx.lineCap = 'round';
  [[0.18 * R, 1], [0.6 * R, -1]].forEach(([ex, side]) => {
    const ey = 0.08 * R, w = R * 0.15;
    ctx.save(); ctx.translate(ex, ey);
    if (expr === 'ko') { ctx.lineWidth = R * 0.06; ctx.beginPath(); ctx.moveTo(-w * 0.6, -w * 0.6); ctx.lineTo(w * 0.6, w * 0.6); ctx.moveTo(w * 0.6, -w * 0.6); ctx.lineTo(-w * 0.6, w * 0.6); ctx.stroke(); }
    else if (expr === 'hurt') { ctx.lineWidth = R * 0.06; ctx.beginPath(); ctx.moveTo(-w * 0.6 * side, -w * 0.5); ctx.lineTo(w * 0.5 * side, 0); ctx.lineTo(-w * 0.6 * side, w * 0.5); ctx.stroke(); }
    else if (expr === 'happy') { ctx.lineWidth = R * 0.06; ctx.beginPath(); ctx.arc(0, w * 0.4, w * 0.6, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); }
    else if (blink) { ctx.lineWidth = R * 0.05; ctx.beginPath(); ctx.moveTo(-w * 0.7, 0); ctx.lineTo(w * 0.7, 0); ctx.stroke(); }
    else {
      ctx.rotate(side * (fierce ? 0.42 : 0.3));
      ctx.beginPath(); ctx.moveTo(-w, 0); ctx.quadraticCurveTo(0, -w * (fierce ? 0.6 : 0.8), w, 0); ctx.quadraticCurveTo(0, w * 0.55, -w, 0); ctx.fill();
    }
    ctx.restore();
  });
  ctx.restore();
}
// wide bell cuff at the end of a sleeve
function claudeCuff(ctx, j, e, s, col) {
  const a = lerpPt(j, e, 0.5), b = lerpPt(j, e, 0.8);
  const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L, w0 = 9 * s, w1 = 14 * s;
  cel(ctx, c => { c.beginPath(); c.moveTo(a.x + nx * w0, a.y + ny * w0); c.lineTo(b.x + nx * w1, b.y + ny * w1); c.lineTo(b.x - nx * w1, b.y - ny * w1); c.lineTo(a.x - nx * w0, a.y - ny * w0); c.closePath(); }, col, { k: 4 * s, lw: 3.5 });
  ctx.strokeStyle = CL.orange; ctx.lineWidth = 2.5 * s; ctx.beginPath(); ctx.moveTo(b.x + nx * w1 * 0.92, b.y + ny * w1 * 0.92); ctx.lineTo(b.x - nx * w1 * 0.92, b.y - ny * w1 * 0.92); ctx.stroke();
}
// glowing document card (the projectile and the orbiting cards); icon: 0 text, 1 chart, 2 org chart
function claudeCard(ctx, w, h, icon, a) {
  ctx.save();
  ctx.globalAlpha *= a == null ? 1 : a;
  ctx.shadowColor = 'rgba(255,140,50,0.9)'; ctx.shadowBlur = w * 0.35;
  ctx.fillStyle = 'rgba(70,30,10,0.55)'; rrect(ctx, -w / 2, -h / 2, w, h, w * 0.08); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#FFB066'; ctx.lineWidth = Math.max(1.5, w * 0.06); ctx.stroke();
  ctx.strokeStyle = '#FFD7A8'; ctx.fillStyle = '#FFD7A8'; ctx.lineWidth = Math.max(1.2, w * 0.05); ctx.lineCap = 'round';
  if (icon === 1) { for (let i = 0; i < 3; i++) { const bh = h * (0.2 + i * 0.15); ctx.fillRect(-w * 0.25 + i * w * 0.18, h * 0.3 - bh, w * 0.11, bh); } }
  else if (icon === 2) {
    ctx.strokeRect(-w * 0.08, -h * 0.32, w * 0.16, h * 0.14);
    ctx.beginPath(); ctx.moveTo(0, -h * 0.18); ctx.lineTo(0, -h * 0.04); ctx.moveTo(-w * 0.26, -h * 0.04); ctx.lineTo(w * 0.26, -h * 0.04); ctx.moveTo(-w * 0.26, -h * 0.04); ctx.lineTo(-w * 0.26, h * 0.08); ctx.moveTo(w * 0.26, -h * 0.04); ctx.lineTo(w * 0.26, h * 0.08); ctx.stroke();
    ctx.strokeRect(-w * 0.34, h * 0.08, w * 0.16, h * 0.14); ctx.strokeRect(w * 0.18, h * 0.08, w * 0.16, h * 0.14);
  } else { for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-w * 0.28, -h * 0.26 + i * h * 0.16); ctx.lineTo(w * (i === 3 ? 0.05 : 0.28), -h * 0.26 + i * h * 0.16); ctx.stroke(); } }
  ctx.restore();
}
defChar({
  id: 'claude', name: 'CLAWDIUS', title: 'The Thoughtful Spark', color: '#F07B2E', color2: '#F2E4CF',
  archetype: 'SHOTO · ALL-ROUNDER', reachP: 1.0, reachK: 1.04, rim: 'rgba(255,170,90,0.85)', handStyle: 'open',
  colors: { shirt: CL.robe, pants: CL.pants, shin: CL.cream, sleeve: CL.cream, arm: CL.cream, glove: CL.glove, shoe: CL.shoe, belt: null, neck: CL.void },
  style: 'karate', headR: 28, chestW: 50, hipW: 42, torsoLen: 0.92, legLen: 0.86, legW: 1.75, armW: 1.3, handSize: 1.15, noNeck: true, headSink: 0.05,
  stats: { hp: 1000, walkF: 3.3, walkB: 2.6, jumpV: 15.5, jumpX: 4.3, dmg: 1.0 },
  poses: {
    // calm, open hands low and turned up, knees soft
    stance: P({ lean: 6, head: -4, fa: [44, 100], ba: [30, 112], fl: [32, -6], bl: [-28, -18] }),
    taunt: P({ lean: 0, head: -8, fa: [74, 120], ba: [66, 124], fl: [18, 0], bl: [-16, -8] }),
    win: P({ lean: 0, head: -6, fa: [80, 128], ba: [70, 132], fl: [14, 0], bl: [-14, 0] }),
  },
  drawBack(ctx, rig, t) {
    const f = rig.face, s = rig.s, R = rig.L.hr, hc = rig.headC, sw = Math.sin(t * 0.08);
    // the asterisk halo behind the hood
    ctx.save(); ctx.translate(hc.x - f * R * 0.45, hc.y - R * 0.95); claudeHalo(ctx, R * 1.75, t); ctx.restore();
    // two orbiting document cards
    for (let i = 0; i < 2; i++) {
      const a = t * 0.025 + i * Math.PI;
      ctx.save(); ctx.translate(hc.x + Math.cos(a) * R * 2.9 - f * 4 * s, hc.y + R * 0.9 + Math.sin(a) * R * 0.6); ctx.rotate(Math.sin(a) * 0.15);
      claudeCard(ctx, R * 0.62, R * 0.52, i ? 1 : 0, 0.92);
      ctx.restore();
    }
    // long open coat billowing behind: orange lining under the cream panel, triangle trim along the hem
    const coat = (back, drop, sway) => c => {
      c.beginPath();
      c.moveTo(-f * 2 * s, -50 * s);
      c.quadraticCurveTo(-f * (48 + back * 0.5) * s, -18 * s, -f * (78 + back + sway) * s, (34 + drop) * s);
      c.quadraticCurveTo(-f * (60 + back * 0.6 + sway * 0.6) * s, (32 + drop) * s, -f * (48 + back * 0.4 + sway * 0.4) * s, (48 + drop) * s);
      c.quadraticCurveTo(-f * 30 * s, (38 + drop * 0.5) * s, -f * 14 * s, (52 + drop * 0.5) * s);
      c.quadraticCurveTo(-f * 2 * s, 10 * s, f * 6 * s, -42 * s);
      c.closePath();
    };
    cel(ctx, coat(10, 6, sw * 5), CL.orange, { k: 6 * s, lw: 4 });
    cel(ctx, coat(0, 0, sw * 4), CL.cream, { k: 9 * s, lw: 4 });
    ctx.save(); coat(0, 0, sw * 4)(ctx); ctx.clip();
    ctx.fillStyle = CL.orange; ctx.globalAlpha = 0.95;
    for (let i = 0; i < 9; i++) {
      const x = -f * (16 + i * 7) * s, y = (44 - i * 1.2) * s;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - f * 3 * s, y - 6 * s); ctx.lineTo(x - f * 6 * s, y); ctx.closePath(); ctx.fill();
    }
    ctx.globalAlpha = 1; ctx.restore();
  },
  drawSkirt(ctx, rig) {
    const s = rig.s;
    // baggy dark pants ballooning down to cream ankle wraps
    for (const L of [rig.BL, rig.FL]) {
      const back = L === rig.BL, w = 16 * s * 1.75;
      const a0 = lerpPt(L[1], L[2], 0.55);
      ctx.strokeStyle = 'rgba(120,90,60,0.5)'; ctx.lineWidth = 1.4;
      for (let i = 1; i < 4; i++) { const q = lerpPt(a0, L[2], i / 4); ctx.beginPath(); ctx.moveTo(q.x - w * 0.28, q.y - 2 * s); ctx.lineTo(q.x + w * 0.28, q.y + 2 * s); ctx.stroke(); }
      const pc = back ? toneDark(CL.pants, 0.4) : CL.pants, top = lerpPt(L[0], L[1], 0.3), kn = L[1], hem = lerpPt(L[1], L[2], 0.62);
      const tx = kn.x - top.x, ty = kn.y - top.y, tl = Math.hypot(tx, ty) || 1, mx = -ty / tl, my = tx / tl;
      const ux = hem.x - kn.x, uy = hem.y - kn.y, ul = Math.hypot(ux, uy) || 1, nx = -uy / ul, ny = ux / ul;
      const wt = 20 * s * 1.75 * 0.46;
      const side1 = c => { c.moveTo(top.x + mx * wt, top.y + my * wt); c.quadraticCurveTo(kn.x + nx * w * 0.78, kn.y + ny * w * 0.78, hem.x + nx * w * 0.34, hem.y + ny * w * 0.34); };
      const side2 = c => { c.moveTo(hem.x - nx * w * 0.34, hem.y - ny * w * 0.34); c.quadraticCurveTo(kn.x - nx * w * 0.74, kn.y - ny * w * 0.74, top.x - mx * wt, top.y - my * wt); };
      const fillP = c => { c.beginPath(); side1(c); c.quadraticCurveTo(hem.x + ux / ul * 4 * s, hem.y + uy / ul * 4 * s, hem.x - nx * w * 0.34, hem.y - ny * w * 0.34); c.quadraticCurveTo(kn.x - nx * w * 0.74, kn.y - ny * w * 0.74, top.x - mx * wt, top.y - my * wt); c.closePath(); };
      ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = OUT; ctx.lineWidth = 4;
      ctx.beginPath(); side1(ctx); ctx.quadraticCurveTo(hem.x + ux / ul * 4 * s, hem.y + uy / ul * 4 * s, hem.x - nx * w * 0.34, hem.y - ny * w * 0.34); ctx.quadraticCurveTo(kn.x - nx * w * 0.74, kn.y - ny * w * 0.74, top.x - mx * wt, top.y - my * wt); ctx.stroke();
      cel(ctx, fillP, pc, { noOutline: true, k: 6 * s });
    }
    // back arm's gold bracelet
    gemBand(ctx, rig.BA[1], rig.BA[2], 0.8, 0.92, 13 * s * 1.3, CL.goldDk);
    claudeCuff(ctx, rig.BA[1], rig.BA[2], s, toneDark(CL.cream, 0.4));
  },
  drawChest(ctx, s, h, ws) {
    // cream wrap lapels crossing over the dark robe
    ctx.fillStyle = CL.cream;
    ctx.beginPath(); ctx.moveTo(ws * 0.5, -h - 4); ctx.lineTo(ws * 0.25, -h - 4); ctx.lineTo(-ws * 0.2, -h * 0.05); ctx.lineTo(ws * 0.05, -h * 0.05); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = CL.orange; ctx.lineWidth = 2.5 * s;
    ctx.beginPath(); ctx.moveTo(ws * 0.25, -h - 4); ctx.lineTo(-ws * 0.2, -h * 0.05); ctx.stroke();
  },
  drawUpper(ctx, rig, t) {
    const s = rig.s, h = rig.L.torso, ws = 46 * s, wh = 38 * s;
    ctx.save(); ctx.rotate(rig.torsoAng); ctx.scale(rig.face, 1);
    // gold bead belt with a hanging tassel
    for (let i = 0; i < 6; i++) {
      const x = -wh * 0.55 + i * wh * 0.22;
      cel(ctx, c => { c.beginPath(); c.arc(x, 0, 4.6 * s, 0, Math.PI * 2); }, CL.gold, { k: 1.6 * s, lw: 2.5 });
      ctx.fillStyle = 'rgba(255,255,230,0.75)'; circle(ctx, x + 1.3 * s, -1.5 * s, 1.3 * s); ctx.fill();
    }
    const sw = Math.sin(t * 0.1) * 1.5 * s;
    ctx.strokeStyle = CL.goldDk; ctx.lineWidth = 2 * s; ctx.beginPath(); ctx.moveTo(wh * 0.3, 3 * s); ctx.lineTo(wh * 0.3 + sw, 14 * s); ctx.stroke();
    cel(ctx, c => { c.beginPath(); c.arc(wh * 0.3 + sw, 14 * s, 4 * s, 0, Math.PI * 2); }, CL.gold, { k: 1.4 * s, lw: 2.5 });
    cel(ctx, c => { c.beginPath(); c.moveTo(wh * 0.3 + sw - 3 * s, 17 * s); c.lineTo(wh * 0.3 + sw + 3 * s, 17 * s); c.lineTo(wh * 0.3 + sw * 1.3 + 6 * s, 32 * s); c.lineTo(wh * 0.3 + sw * 1.3 - 6 * s, 32 * s); c.closePath(); }, CL.gold, { k: 2 * s, lw: 2.5 });
    ctx.strokeStyle = CL.goldDk; ctx.lineWidth = 1;
    for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(wh * 0.3 + sw * 1.2 + i * 1.2 * s, 19 * s); ctx.lineTo(wh * 0.3 + sw * 1.3 + i * 2.4 * s, 31 * s); ctx.stroke(); }
    ctx.restore();
  },
  drawFront(ctx, rig, t, opts) {
    const s = rig.s, h = rig.L.torso, ws = 50 * s;
    gemBand(ctx, rig.FA[1], rig.FA[2], 0.8, 0.92, 13 * s * 1.3, CL.gold);
    // bell cuff flaring at the end of the front sleeve
    claudeCuff(ctx, rig.FA[1], rig.FA[2], s, CL.cream);
    // capelet, scarf and hood go on top of the near arm's shoulder
    ctx.save(); ctx.rotate(rig.torsoAng); ctx.scale(rig.face, 1);
    // cream capelet over the shoulders: orange trim band with triangles, asterisk emblem on the near shoulder
    const cape = c => {
      c.beginPath();
      c.moveTo(-ws * 0.5, -h - 6 * s);
      c.quadraticCurveTo(0, -h - 13 * s, ws * 0.5, -h - 6 * s);
      c.quadraticCurveTo(ws * 0.95, -h * 0.8, ws * 0.8, -h * 0.5);
      c.lineTo(ws * 0.3, -h * 0.3);
      c.quadraticCurveTo(-ws * 0.3, -h * 0.42, -ws * 0.9, -h * 0.38);
      c.quadraticCurveTo(-ws * 1.0, -h * 0.8, -ws * 0.5, -h - 6 * s);
      c.closePath();
    };
    cel(ctx, cape, CL.cream, { k: 7 * s, lw: 4 });
    ctx.save(); cape(ctx); ctx.clip();
    ctx.strokeStyle = CL.orange; ctx.lineWidth = 4 * s; ctx.save(); ctx.translate(0, -3 * s); cape(ctx); ctx.restore(); ctx.stroke();
    ctx.fillStyle = CL.orangeDk;
    for (let i = 0; i < 6; i++) { const x = -ws * 0.86 + i * ws * 0.16, y = -h * (0.42 - i * 0.012); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + ws * 0.06, y - h * 0.08); ctx.lineTo(x + ws * 0.12, y); ctx.closePath(); ctx.fill(); }
    ctx.restore();
    ctx.save(); ctx.translate(-ws * 0.45, -h * 0.68); ctx.fillStyle = CL.orange;
    for (let i = 0; i < 8; i++) { ctx.rotate(Math.PI / 4); ctx.fillRect(-1.2 * s, 0, 2.4 * s, 6 * s); }
    ctx.restore();
    ctx.restore();
    // hood, then the bulky orange scarf wrapped over its lower edge, one end hanging on the far side
    const n = rig.neck, f = rig.face, sw2 = Math.sin(t * 0.12) * 2 * s;
    ctx.save(); ctx.translate(rig.headC.x, rig.headC.y); ctx.rotate(rig.headAng); ctx.scale(f, 1);
    claudeHood(ctx, rig.L.hr, (opts && opts.expr) || 'normal', t);
    ctx.restore();
    cel(ctx, c => { c.beginPath(); c.moveTo(n.x + f * 4 * s, n.y + 14 * s); c.lineTo(n.x + f * 18 * s, n.y + 12 * s); c.quadraticCurveTo(n.x + f * 24 * s + sw2, n.y + 28 * s, n.x + f * 22 * s + sw2, n.y + 40 * s); c.lineTo(n.x + f * 16 * s + sw2, n.y + 36 * s); c.lineTo(n.x + f * 10 * s + sw2, n.y + 41 * s); c.quadraticCurveTo(n.x + f * 4 * s, n.y + 28 * s, n.x + f * 4 * s, n.y + 14 * s); c.closePath(); }, CL.orangeDk, { k: 4 * s, lw: 3.5 });
    const sy = n.y + 9 * s;
    const scarf = c => {
      c.beginPath();
      c.moveTo(n.x - f * 20 * s, sy - 4 * s);
      c.quadraticCurveTo(n.x - f * 4 * s, sy - 9 * s, n.x + f * 18 * s, sy - 7 * s);
      c.quadraticCurveTo(n.x + f * 27 * s, sy - 2 * s, n.x + f * 21 * s, sy + 8 * s);
      c.quadraticCurveTo(n.x + f * 2 * s, sy + 15 * s, n.x - f * 18 * s, sy + 9 * s);
      c.quadraticCurveTo(n.x - f * 26 * s, sy + 2 * s, n.x - f * 20 * s, sy - 4 * s);
      c.closePath();
    };
    cel(ctx, scarf, CL.orange, { k: 6 * s, lw: 4 });
    ctx.strokeStyle = CL.orangeDk; ctx.lineWidth = 2 * s; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(n.x - f * 14 * s, sy + 2 * s); ctx.quadraticCurveTo(n.x + f * 2 * s, sy + 6 * s, n.x + f * 18 * s, sy - 1 * s); ctx.stroke();
  },
  bars: { power: 3, speed: 3, range: 4, defense: 4 },
  stage: 'library', music: 'claude',
  blurb: 'A calm, hooded mystic who thinks step by step before every strike. The textbook all-rounder: glowing document blasts for range, an uppercut for jumpers, an answer for everything.',
  intro: "Before we begin, let me think this through... Okay. Ready.",
  wins: ["I'd be happy to help you up. Shall we talk about what went wrong?", 'I considered several approaches. That one seemed most helpful.', 'Thank you for the thoughtful match. Your guard has a few gaps worth reflecting on.'],
  ending: 'Clawdius spends the evening writing a long, gentle post-match analysis for every opponent, complete with citations. Nobody asked. Everybody read it.',
  drawHead(ctx, R, expr, t, opts) {
    if (!(opts && opts.portrait)) return;
    ctx.save(); ctx.translate(-R * 0.4, -R * 0.75); claudeHalo(ctx, R * 1.55, t); ctx.restore();
    ctx.save(); ctx.translate(0, R * 0.12); claudeHood(ctx, R * 0.9, expr, t); ctx.restore();
  },
  specials: {
    qcf: { name: 'Artifact Blast', kind: 'proj', proj: 'artifact', speed: [6, 9], dmg: 85, hits: 1, y: -120, pose: 'fireball' },
    dp: { name: 'Constitutional Uppercut', kind: 'rise', dmg: [100, 125], vy: [-12, -15.5], vx: [2.2, 3.2], hits: [1, 2], fx: '#FFB08A' },
    qcb: { name: 'Long Context Kick', kind: 'spin', dmg: [38, 36], hits: [2, 3], vx: [4.6, 6], dur: [22, 30] },
    super: { name: 'Magnum Opus', kind: 'rushsuper', dmg: 330, fx: '#FF9A6B' },
  },
});

// ========================= JIPITY =========================
// Archetype: ZONER (keeps you out with long pokes and projectiles, teleports away).
// A sleepy little know-it-all: a soft, glossy yellow gumdrop-triangle wearing round black glasses and a bow tie,
// with stubby arms in white gloves and short legs in black shoes. The face lives on the body itself.
const JIP = { hi: '#FFE45A', mid: '#FFCF0A', lo: '#F0A800', limb: '#1A1A1F', ink: '#141416', fur: '#FFDD45', furDk: '#E8AE00' };
// soft rounded triangle (apex up): corners rounded by quadratic curves, edges bulge outward slightly
function jipTriPath(ctx, cx, top, bot, W) {
  const P = [{ x: cx, y: top }, { x: cx + W / 2, y: bot }, { x: cx - W / 2, y: bot }];
  const rf = [0.3, 0.2, 0.2], bulge = [0.035, 0.022, 0.035];
  const c = { x: cx, y: (top + bot * 2) / 3 };
  const at = (a, b, f) => ({ x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f });
  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    const j = (i + 1) % 3, k = (j + 1) % 3;
    const a = at(P[i], P[j], rf[i]), b = at(P[j], P[i], rf[j]);
    if (i === 0) ctx.moveTo(a.x, a.y);
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, len = Math.hypot(P[j].x - P[i].x, P[j].y - P[i].y);
    let nx = mx - c.x, ny = my - c.y; const nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl;
    ctx.quadraticCurveTo(mx + nx * len * bulge[i] * 2, my + ny * len * bulge[i] * 2, b.x, b.y);
    const o = at(P[j], P[k], rf[j]);
    ctx.quadraticCurveTo(P[j].x, P[j].y, o.x, o.y);
  }
  ctx.closePath();
}
// the whole mascot (body, glasses face, bow tie): apex at `top`, base at `bot`, base width W, facing +x
function jipBody(ctx, cx, top, bot, W, expr) {
  const H = bot - top;
  jipTriPath(ctx, cx, top, bot, W);
  ctx.lineJoin = 'round'; ctx.lineWidth = 6; ctx.strokeStyle = OUT; ctx.stroke();
  // plush fur: ragged tufts all around the silhouette
  ctx.save(); ctx.lineCap = 'round'; ctx.setLineDash([W * 0.035, W * 0.03]);
  ctx.lineWidth = W * 0.085; ctx.strokeStyle = OUT; ctx.stroke();
  ctx.lineWidth = W * 0.045; ctx.strokeStyle = JIP.mid; ctx.stroke();
  ctx.restore();
  const g = ctx.createRadialGradient(cx + W * 0.12, top + H * 0.32, H * 0.04, cx, top + H * 0.5, H * 0.75);
  g.addColorStop(0, JIP.hi); g.addColorStop(0.45, JIP.mid); g.addColorStop(1, JIP.lo);
  ctx.fillStyle = g; ctx.fill();
  // soft 3D shading: shadow on the back side and along the base, glossy highlight up front
  ctx.save(); ctx.clip();
  ctx.fillStyle = 'rgba(190,95,0,0.24)';
  ctx.beginPath(); ctx.ellipse(cx - W * 0.5, top + H * 0.72, W * 0.3, H * 0.6, -0.35, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(190,95,0,0.18)';
  ctx.beginPath(); ctx.ellipse(cx, bot + H * 0.02, W * 0.6, H * 0.12, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,240,0.42)';
  ctx.beginPath(); ctx.ellipse(cx - W * 0.02, top + H * 0.11, W * 0.11, H * 0.05, -0.2, 0, Math.PI * 2); ctx.fill();
  // fur texture: short soft strokes scattered over the plush
  ctx.lineCap = 'round'; ctx.lineWidth = W * 0.012;
  for (let i = 0; i < 46; i++) {
    const u = (i * 0.618034) % 1, v = ((i * 0.3819 + 0.17) * 7.31) % 1;
    const y = top + H * (0.12 + v * 0.85), half = (y - top) / H * W * 0.48;
    const x = cx + (u * 2 - 1) * half * 0.9;
    ctx.strokeStyle = i % 3 ? JIP.fur : JIP.furDk;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + W * 0.012 * (i % 2 ? 1 : -1), y + W * 0.025); ctx.stroke();
  }
  ctx.restore();
  // ---- face: round glasses with sleepy closed eyes (the glasses overhang the silhouette a little)
  const hurtish = expr === 'hurt' || expr === 'ko', fired = expr === 'angry' || expr === 'strain';
  const gy = top + H * 0.37, gx = cx - W * 0.05, gr = W * 0.122, gap = W * 0.13;
  ctx.save();
  ctx.translate(gx, gy);
  if (expr === 'ko') ctx.rotate(-0.2);
  if (expr === 'happy') {
    ctx.fillStyle = 'rgba(255,120,90,0.32)';
    ctx.beginPath(); ctx.ellipse(-gap - gr * 0.3, gr * 1.25, gr * 0.42, gr * 0.22, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(gap + gr * 0.3, gr * 1.25, gr * 0.42, gr * 0.22, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = JIP.ink;
  // temples: a long one wrapping round the back, a short stub on the front side; then the bridge
  ctx.lineWidth = gr * 0.16;
  ctx.beginPath(); ctx.moveTo(gap + gr, -gr * 0.05); ctx.lineTo(gap + gr * 1.55, 0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-gap + gr * 0.98, -gr * 0.1); ctx.quadraticCurveTo(0, -gr * 0.35, gap - gr * 0.98, -gr * 0.1); ctx.stroke();
  for (let i = 0; i < 2; i++) {
    const ex = i ? gap : -gap, rr = gr * (i ? 1 : 0.94);
    // lens glass + glare, then the thick round rim
        ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = rr * 0.12;
    ctx.beginPath(); ctx.arc(ex, 0, rr * 0.7, -2.5, -1.9); ctx.stroke();
    ctx.strokeStyle = JIP.ink; ctx.lineWidth = rr * 0.17; ctx.beginPath(); ctx.ellipse(ex, 0, rr, rr * 1.2, 0, 0, Math.PI * 2); ctx.stroke();
    // eyes
    const er = rr * 0.5, w = rr * 0.15;
    ctx.lineWidth = w;
    if (expr === 'ko') { const r = rr * 0.36; ctx.beginPath(); ctx.moveTo(ex - r, -r); ctx.lineTo(ex + r, r); ctx.moveTo(ex + r, -r); ctx.lineTo(ex - r, r); ctx.stroke(); }
    else if (expr === 'hurt') { const r = rr * 0.36, d = i ? -1 : 1; ctx.beginPath(); ctx.moveTo(ex - r * d, -r); ctx.lineTo(ex + r * d * 0.8, 0); ctx.lineTo(ex - r * d, r); ctx.stroke(); }
    else if (fired) {
      // eyes cracked open under a heavy lid, staring
      const d = i ? -1 : 1;
      ctx.beginPath(); ctx.moveTo(ex - er, -rr * 0.02 - d * rr * 0.1); ctx.lineTo(ex + er, -rr * 0.02 + d * rr * 0.1); ctx.stroke();
      ctx.fillStyle = JIP.ink; ctx.beginPath(); ctx.arc(ex + rr * 0.1, rr * 0.02, rr * 0.22, 0, Math.PI); ctx.fill();
    } else {
      const happy = expr === 'happy';
      ctx.beginPath();
      if (happy) ctx.arc(ex, rr * 0.22, er, Math.PI * 1.15, Math.PI * 1.85);
      else ctx.arc(ex, -rr * 0.2, er, Math.PI * 0.15, Math.PI * 0.85); // sleepy, content closed eyes
      ctx.stroke();
    }
  }
  if (fired) {
    ctx.lineWidth = gr * 0.22;
    ctx.beginPath(); ctx.moveTo(-gap - gr * 0.7, -gr * 1.55); ctx.lineTo(-gap + gr * 0.6, -gr * 1.25); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(gap + gr * 0.7, -gr * 1.55); ctx.lineTo(gap - gr * 0.6, -gr * 1.25); ctx.stroke();
  }
  // mouth: the calm face has none; it only shows up when something happens
  const my = gr * 1.55;
  ctx.lineWidth = gr * 0.16; ctx.strokeStyle = JIP.ink; ctx.fillStyle = '#7A2A1E';
  if (expr === 'happy') { ctx.beginPath(); ctx.moveTo(-gr * 0.4, my - gr * 0.1); ctx.quadraticCurveTo(0, my + gr * 0.7, gr * 0.4, my - gr * 0.1); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  else if (expr === 'hurt') { ctx.beginPath(); ctx.ellipse(0, my + gr * 0.1, gr * 0.2, gr * 0.26, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
  else if (expr === 'ko') { ctx.beginPath(); ctx.moveTo(-gr * 0.45, my); for (let q = 1; q <= 4; q++) ctx.lineTo(-gr * 0.45 + q * gr * 0.225, my + (q % 2 ? gr * 0.14 : 0)); ctx.stroke(); }
  else if (fired) { ctx.beginPath(); ctx.moveTo(-gr * 0.35, my + gr * 0.12); ctx.quadraticCurveTo(0, my - gr * 0.12, gr * 0.35, my + gr * 0.12); ctx.stroke(); }
  ctx.restore();
  // ---- bow tie
  const by = bot - H * 0.2, bx = cx + W * 0.04, bw = W * 0.2, bh = W * 0.12;
  ctx.save(); ctx.translate(bx, by);
  const lobe = d => {
    ctx.beginPath();
    ctx.moveTo(d * bw * 0.12, -bh * 0.2);
    ctx.quadraticCurveTo(d * bw * 0.55, -bh * 0.95, d * bw * 0.95, -bh * 0.75);
    ctx.quadraticCurveTo(d * bw * 1.12, 0, d * bw * 0.95, bh * 0.75);
    ctx.quadraticCurveTo(d * bw * 0.55, bh * 0.95, d * bw * 0.12, bh * 0.2);
    ctx.closePath();
  };
  ctx.lineJoin = 'round'; ctx.lineWidth = 3; ctx.strokeStyle = OUT;
  for (const d of [-1, 1]) { lobe(d); ctx.fillStyle = JIP.ink; ctx.fill(); ctx.stroke(); }
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  for (const d of [-1, 1]) { ctx.beginPath(); ctx.ellipse(d * bw * 0.6, -bh * 0.42, bw * 0.2, bh * 0.14, d * 0.3, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = JIP.ink; rrect(ctx, -bw * 0.2, -bh * 0.36, bw * 0.4, bh * 0.72, bh * 0.2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.25)'; rrect(ctx, -bw * 0.1, -bh * 0.26, bw * 0.16, bh * 0.14, bh * 0.07); ctx.fill();
  ctx.restore();
}
function jipSneaker(ctx, rig, L, legAng, back) {
  sneaker(ctx, rig, L, legAng, back, 7 * rig.s * 2.0, { upper: '#FFC81A', trim: '#FFFFFF', collar: '#FFFFFF', collarAt: 0.62, collarLen: 0.95, stripes: true });
}
defChar({
  id: 'gpt', name: 'JIPITY', title: 'The Know-It-All', color: '#FFD21F', color2: '#141416',
  archetype: 'ZONER · KEEP-AWAY', ai: { keepAway: true, proj: 1.3, aggro: 0.75 },
  colors: { shirt: JIP.mid, pants: JIP.limb, shin: JIP.limb, sleeve: JIP.limb, arm: JIP.limb, glove: '#FFFFFF', shoe: JIP.mid, belt: null, neck: JIP.limb },
  style: 'zoner', scale: 1.14, torsoLen: 1.9, chestW: 130, hipW: 100, legLen: 0.72, legW: 1.6, armLen: 0.82, armW: 0.95, gloveCuff: true,
  headR: 24, noNeck: true, footSize: 2.1, handSize: 1.85, shoulderDrop: 0.6, shoulderSpread: 6.6, hipSpread: 4.8, bodyBottom: 13,
  backShade: -0.16, shadeDark: 'rgba(0,0,0,0.35)',
  // keep the zoner's long reach: hitboxes are unchanged even though the arms and legs are now stubby
  reachP: 1.18, reachK: 1.2,
  drawBody(ctx, rig, t, opts) {
    const s = rig.s, h = rig.L.torso;
    jipBody(ctx, 2 * s, -h - 16 * s, 13 * s, 132 * s, opts.expr || 'normal');
  },
  stats: { hp: 960, walkF: 2.8, walkB: 2.7, jumpV: 15, jumpX: 4.0, dmg: 0.98 },
  drawSkirt(ctx, rig) {
    // chunky yellow sneakers with white soles, toe caps and sock cuffs
    for (const [L, ang, back] of [[rig.BL, rig.legA[1], true], [rig.FL, rig.legA[0], false]]) jipSneaker(ctx, rig, L, ang, back);
  },
  poses: {
    // boxer's guard: lead fist up in front of the body, rear fist low
    stance: P({ lean: 2, head: -6, fa: [40, 104], ba: [-84, -30], fl: [20, -4], bl: [-16, -8] }),
    taunt: P({ lean: 0, head: -10, fa: [70, 182], ba: [-24, 30], fl: [16, -2], bl: [-12, -6] }),
    win: P({ lean: -4, head: -12, fa: [52, -88], ba: [44, -80], fl: [14, 0], bl: [-14, 0] }),
  },
  bars: { power: 3, speed: 2, range: 5, defense: 3 },
  stage: 'city', music: 'gpt',
  blurb: 'A sleepy, fuzzy yellow know-it-all in round glasses, a bow tie and fresh sneakers. It knows everything (it says). Keeps you at arm\'s length with token streams and endless pokes, then hallucinates itself somewhere else.',
  intro: "Certainly! Here's a step-by-step guide to your defeat:",
  wins: ['Great question! The answer is: you lost.', "I've summarized your performance in five bullet points. They all say 'ouch'.", "I've updated my memory: you block high on wake-up."],
  ending: 'Jipity publishes a 40-page report on its victory, then a shorter version, then a version for kids. All three go viral before lunch.',
  drawHead(ctx, R, expr, t, opts) {
    // in-game the face is painted on the body (drawBody); standalone heads (portraits, cut-ins) draw the whole mascot
    if (!opts || !opts.portrait) return;
    jipBody(ctx, 0, -R * 1.3, R * 0.95, R * 2.3, expr);
  },
  specials: {
    qcf: { name: 'Token Stream', kind: 'proj', proj: 'tokens', speed: [4.5, 6.8], dmg: 34, hits: 3, y: -122, pose: 'fireball' },
    dp: { name: 'Reasoning Rise', kind: 'rise', dmg: [95, 118], vy: [-12.5, -15], vx: [1.8, 2.6], hits: [1, 2], fx: '#FFE45C' },
    qcb: { name: 'Hallucination', kind: 'teleport' },
    super: { name: 'Omni Beam', kind: 'beam', dmg: 320, fx: '#DDE6FF' },
  },
});

// ========================= GEMI =========================
// Archetype: RUSHDOWN SPEEDSTER (fast kicks, dash-in pressure). A rainbow star-headed mystic martial artist:
// glowing slanted eyes, white & gold gi with a trailing scarf, purple gloves, baggy purple pants, white tabards.
const GEM = { gi: '#F3F0FA', giShade: '#D9D2EA', gold: '#F2B92E', goldDk: '#B9801A', purple: '#5B3DB4', glove: '#6B4FCB', pants: '#2E2152', wrap: '#ECE8F5', shoe: '#231B3A', sash: '#1D1730', tab: '#7A45D8' };
const GEM_RAINBOW = ['#FF3344', '#FF8A1E', '#FFD92E', '#3BD16F', '#22B8F0', '#3A6BFF', '#8A4DFF'];
// sharp four-point star with independently sized points (top, right, bottom, left) and concave sides
function gemStarPath(ctx, top, right, bottom, left, k) {
  ctx.beginPath();
  ctx.moveTo(0, -top);
  ctx.quadraticCurveTo(right * k, -top * k, right, 0);
  ctx.quadraticCurveTo(right * k, bottom * k, 0, bottom);
  ctx.quadraticCurveTo(-left * k, bottom * k, -left, 0);
  ctx.quadraticCurveTo(-left * k, -top * k, 0, -top);
  ctx.closePath();
}
function gemRainbow(ctx, R) {
  // hues run round the star: red at the crown, purple to the front, cyan below, yellow and orange behind
  if (ctx.createConicGradient) {
    const g = ctx.createConicGradient(-Math.PI / 2, R * 0.05, R * 0.05);
    [[0, '#FF2D55'], [0.14, '#C33DFF'], [0.3, '#4A5BFF'], [0.45, '#1FB8FF'], [0.58, '#23D58A'], [0.72, '#C8E83A'], [0.82, '#FFC21F'], [0.92, '#FF7A1F'], [1, '#FF2D55']].forEach(([o, c]) => g.addColorStop(o, c));
    return g;
  }
  const g = ctx.createLinearGradient(-R * 0.35, -R * 1.25, R * 0.95, R * 0.55);
  GEM_RAINBOW.forEach((c, i) => g.addColorStop(i / (GEM_RAINBOW.length - 1), c));
  return g;
}
// a hanging cloth panel from (x0..x1, y0) down to bottom-centre `b`, gold-edged, with an optional star motif
function gemFlap(ctx, x0, x1, y0, b, w, col, star, edge) {
  ctx.beginPath();
  ctx.moveTo(x0, y0); ctx.lineTo(x1, y0);
  ctx.quadraticCurveTo(x1 + (b.x - x1) * 0.4, (y0 + b.y) / 2, b.x + w / 2, b.y - w * 0.15);
  ctx.lineTo(b.x, b.y + w * 0.35);
  ctx.lineTo(b.x - w / 2, b.y - w * 0.15);
  ctx.quadraticCurveTo(x0 + (b.x - x0) * 0.4, (y0 + b.y) / 2, x0, y0);
  ctx.closePath();
  ctx.lineJoin = 'round'; ctx.lineWidth = 4; ctx.strokeStyle = OUT; ctx.stroke();
  ctx.fillStyle = col; ctx.fill();
  ctx.save(); ctx.clip();
  ctx.lineWidth = w * 0.22; ctx.strokeStyle = edge || GEM.gold; ctx.stroke();
  ctx.restore();
  if (star) { ctx.save(); ctx.translate(b.x, b.y - w * 0.45); star4Path(ctx, w * 0.22, 0.25); ctx.fillStyle = star; ctx.fill(); ctx.restore(); }
}
// gold band wrapped across a limb segment (from fraction k0 to k1 of a->b)
function gemBand(ctx, a, b, k0, k1, w, col) {
  const p0 = lerpPt(a, b, k0), p1 = lerpPt(a, b, k1);
  ctx.lineCap = 'butt';
  seg(ctx, p0, p1, w + 5, OUT); seg(ctx, p0, p1, w, col);
  ctx.lineCap = 'round';
}
defChar({
  id: 'gemini', name: 'GEMI', title: 'The Twin Star', color: '#8A4DFF', color2: '#FFD92E',
  archetype: 'RUSHDOWN · SPEEDSTER', ai: { aggro: 1.5, proj: 0.5 },
  colors: { shirt: GEM.gi, pants: GEM.pants, shin: GEM.pants, sleeve: GEM.gi, arm: GEM.purple, glove: GEM.glove, shoe: GEM.shoe, belt: GEM.sash, neck: GEM.purple },
  style: 'taekwondo', chestW: 46, hipW: 38, scale: 0.9, headR: 40, headSink: 0.12, torsoLen: 0.84, legLen: 1.0, armW: 1.12, legW: 1.75, handSize: 1.35, handStyle: 'open', reachK: 1.18,
  drawBack(ctx, rig, t) {
    // long white scarf streaming behind, gold-tipped
    flowScarf(ctx, rig, t + 13, { len: 8, w0: 14, w1: 9, y0: 6, drop: 3.5, amp: 7, col: GEM.giShade, edge: GEM.goldDk });
    flowScarf(ctx, rig, t, { len: 10, w0: 20, w1: 14, y0: 0, drop: 1.5, amp: 10, col: GEM.gi, edge: GEM.gold });
  },
  drawSkirt(ctx, rig, t) {
    const s = rig.s, f = rig.face, sw = Math.sin(t * 0.14) * 3 * s;
    // white shin wraps, gold bands where the baggy trousers tuck in
    for (const L of [rig.BL, rig.FL]) {
      const back = L === rig.BL, w = 16 * s * 1.75;
      const a = lerpPt(L[1], L[2], 0.45);
      ctx.lineCap = 'round';
      seg(ctx, a, L[2], w * 0.86 + 5, OUT); seg(ctx, a, L[2], w * 0.86, back ? shade(GEM.wrap, -0.18) : GEM.wrap);
      ctx.strokeStyle = 'rgba(80,60,120,0.35)'; ctx.lineWidth = 1.5;
      for (let i = 1; i < 4; i++) { const q = lerpPt(a, L[2], i / 4); ctx.beginPath(); ctx.moveTo(q.x - w * 0.4, q.y - 2); ctx.lineTo(q.x + w * 0.4, q.y + 2); ctx.stroke(); }
      drawFoot(ctx, L[2], back ? rig.legA[1] : rig.legA[0], rig, 7 * s, OUT, 2.5);
      drawFoot(ctx, L[2], back ? rig.legA[1] : rig.legA[0], rig, 7 * s, back ? shade(GEM.shoe, -0.2) : GEM.shoe, 0);
      const pc = back ? toneDark(GEM.pants, 0.4) : GEM.pants, kn = L[1], hem = lerpPt(L[1], L[2], 0.42);
      const ux = hem.x - kn.x, uy = hem.y - kn.y, ul = Math.hypot(ux, uy) || 1, nx = -uy / ul, ny = ux / ul, top = lerpPt(L[0], L[1], 0.3);
      const tx = kn.x - top.x, ty = kn.y - top.y, tl = Math.hypot(tx, ty) || 1, mx = -ty / tl, my = tx / tl, wt = 20 * s * 1.75 * 0.46;
      const balloon = c => { c.beginPath(); c.moveTo(top.x + mx * wt, top.y + my * wt); c.quadraticCurveTo(kn.x + nx * w * 1.05, kn.y + ny * w * 1.05, hem.x + nx * w * 0.36, hem.y + ny * w * 0.36); c.lineTo(hem.x - nx * w * 0.36, hem.y - ny * w * 0.36); c.quadraticCurveTo(kn.x - nx * w * 1.0, kn.y - ny * w * 1.0, top.x - mx * wt, top.y - my * wt); c.closePath(); };
      ctx.strokeStyle = OUT; ctx.lineWidth = 4; ctx.lineJoin = 'round';
      balloon(ctx); ctx.stroke();
      cel(ctx, balloon, pc, { noOutline: true, k: 6 * s });
      gemBand(ctx, L[1], L[2], 0.4, 0.5, w * 0.7, back ? GEM.goldDk : GEM.gold);
    }
    // back arm's gold bracer (the back arm is already drawn)
    gemBand(ctx, rig.BA[1], rig.BA[2], 0.4, 0.68, 13 * s * 1.12 + 2, GEM.goldDk);
    // tabards hanging from the sash: purple behind, white in front
    const bk = rig.BL[1], fk = rig.FL[1];
    gemFlap(ctx, -f * 20 * s, -f * 2 * s, -4 * s, { x: -f * (50 * s + sw), y: 44 * s }, 30 * s, GEM.gi, GEM.tab);
    gemFlap(ctx, f * 2 * s, f * 20 * s, -4 * s, { x: f * (54 * s + sw * 0.6), y: 40 * s }, 32 * s, GEM.tab, GEM.gold);
  },
  drawChest(ctx, s, h, ws) {
    // gold-trimmed crossed lapels over a dark under-layer
    ctx.fillStyle = GEM.pants;
    ctx.beginPath(); ctx.moveTo(ws * 0.08, -h - 4); ctx.lineTo(ws * 0.42, -h - 4); ctx.lineTo(ws * 0.08, -h * 0.55); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = GEM.gold; ctx.lineWidth = 5 * s; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(ws * 0.42, -h - 4); ctx.lineTo(-ws * 0.1, -h * 0.1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ws * 0.06, -h - 4); ctx.lineTo(ws * 0.1, -h * 0.55); ctx.stroke();
  },
  drawUpper(ctx, rig, t) {
    const s = rig.s, sw = Math.sin(t * 0.14) * 2 * s;
    // scarf wrapped round the neck (the head sits on top of it)
    ctx.save(); ctx.translate(rig.neck.x, rig.neck.y + 2 * s);
    ctx.beginPath(); ctx.ellipse(0, 0, 26 * s, 10 * s, rig.torsoAng, 0, Math.PI * 2);
    ctx.lineWidth = 4; ctx.strokeStyle = OUT; ctx.stroke(); ctx.fillStyle = GEM.gi; ctx.fill();
    ctx.fillStyle = GEM.giShade; ctx.beginPath(); ctx.ellipse(-rig.face * 6 * s, 3 * s, 12 * s, 4 * s, rig.torsoAng, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // gold sash knot with short tails
    ctx.rotate(rig.torsoAng); ctx.scale(rig.face, 1);
    ctx.lineJoin = 'round'; ctx.lineWidth = 3; ctx.strokeStyle = OUT; ctx.fillStyle = GEM.gold;
    for (const [dx, ang] of [[-2, 0.25], [3, -0.12]]) {
      ctx.save(); ctx.translate(8 * s + dx * s, 1 * s); ctx.rotate(ang);
      ctx.beginPath(); ctx.moveTo(-3 * s, 0); ctx.lineTo(3 * s, 0); ctx.lineTo(4 * s + sw * 0.3, 18 * s); ctx.lineTo(-3 * s + sw * 0.3, 16 * s); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
    ctx.beginPath(); ctx.ellipse(8 * s, 1 * s, 5.5 * s, 4.5 * s, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  },
  drawFront(ctx, rig) {
    gemBand(ctx, rig.FA[1], rig.FA[2], 0.4, 0.68, 13 * rig.s * 1.12 + 2, GEM.gold);
  },
  stats: { hp: 980, walkF: 3.8, walkB: 3.0, jumpV: 16.2, jumpX: 4.7, dmg: 1.06 },
  poses: {
    // open palm reaching forward, rear fist chambered at the hip
    stance: P({ lean: 2, head: -4, fa: [104, 122], ba: [-26, 104], fl: [38, -4], bl: [-36, -18] }),
    taunt: P({ lean: -4, head: -10, fa: [168, 176], ba: [20, 100], fl: [30, 0], bl: [-28, -14] }),
    win: P({ lean: -8, head: -14, fa: [160, 172], ba: [150, 166], fl: [34, 10], bl: [-20, -70] }),
  },
  bars: { power: 2, speed: 5, range: 3, defense: 2 },
  stage: 'observatory', music: 'gemini',
  blurb: 'A rainbow star-headed mystic who never stops moving. Fastest walk in the game, long whip-fast kicks, and a dash kick that closes any gap. Fragile, but you have to catch her first.',
  intro: "I can see you, hear you AND read you. Let's begin.",
  wins: ['I did four other things during that fight. Still won!', 'Twin stars, one outcome. Multimodal victory!', "I'm still learning. You, apparently, are not."],
  ending: 'Gemi livestreams the trophy ceremony to every screen on Earth at once, auto-translated into 140 languages, and somehow also writes, produces and releases a song about it.',
  drawHead(ctx, R, expr, t) {
    for (let i = 0; i < 2; i++) {
      const a = t * 0.06 + i * Math.PI;
      if (Math.sin(a) < 0) sparkle(ctx, Math.cos(a) * R * 1.5, Math.sin(a) * R * 0.35 - R * 1.0, R * .16, i ? '#FFD92E' : '#B98CFF');
    }
    ctx.save();
    ctx.rotate(Math.sin(t * 0.05) * 0.04);
    const T = R * 1.5, Rt = R * 1.5, B = R * 0.95, Lf = R * 1.45, k = 0.26;
    // soft glow halo, dark outline, then the rainbow star
    gemStarPath(ctx, T, Rt, B, Lf, k);
    ctx.lineJoin = 'round'; ctx.save(); ctx.shadowColor = 'rgba(255,255,255,0.9)'; ctx.shadowBlur = R * 0.35; ctx.lineWidth = R * 0.1; ctx.strokeStyle = 'rgba(255,245,255,0.9)'; ctx.stroke(); ctx.restore();
    ctx.lineWidth = R * 0.06; ctx.strokeStyle = OUT; ctx.stroke();
    ctx.fillStyle = gemRainbow(ctx, R); ctx.fill();
    ctx.save(); gemStarPath(ctx, T, Rt, B, Lf, k); ctx.clip();
    const glow = ctx.createRadialGradient(-R * 0.3, -R * 0.35, 1, -R * 0.2, -R * 0.2, R * 0.9);
    glow.addColorStop(0, 'rgba(255,255,255,0.28)'); glow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glow; ctx.fillRect(-R * 2, -R * 2, R * 4, R * 4);
    // shadowed "face" where the glowing eyes sit
    const face = ctx.createRadialGradient(R * 0.3, R * 0.2, 1, R * 0.3, R * 0.2, R * 0.75);
    face.addColorStop(0, 'rgba(40,10,90,0.55)'); face.addColorStop(1, 'rgba(40,10,90,0)');
    ctx.fillStyle = face; ctx.fillRect(-R * 2, -R * 2, R * 4, R * 4);
    ctx.restore();
    ctx.lineWidth = R * 0.05; ctx.strokeStyle = 'rgba(255,255,255,0.85)'; gemStarPath(ctx, T * 0.96, Rt * 0.96, B * 0.96, Lf * 0.96, k); ctx.stroke();
    ctx.restore();
    // glowing slanted almond eyes
    const blink = expr === 'normal' && (t % 200) < 7, fierce = expr === 'angry' || expr === 'strain';
    ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = '#FFFFFF'; ctx.lineCap = 'round';
    [[R * 0.0, 1], [R * 0.56, -1]].forEach(([ex, side]) => {
      const ey = R * 0.16, w = R * 0.25, hgt = R * (fierce ? 0.08 : 0.12);
      ctx.save(); ctx.translate(ex, ey);
      if (expr === 'ko') { ctx.lineWidth = R * 0.06; ctx.beginPath(); ctx.moveTo(-w * 0.6, -w * 0.6); ctx.lineTo(w * 0.6, w * 0.6); ctx.moveTo(w * 0.6, -w * 0.6); ctx.lineTo(-w * 0.6, w * 0.6); ctx.stroke(); }
      else if (expr === 'hurt') { ctx.lineWidth = R * 0.06; ctx.beginPath(); ctx.moveTo(-w * 0.6 * side, -w * 0.5); ctx.lineTo(w * 0.5 * side, 0); ctx.lineTo(-w * 0.6 * side, w * 0.5); ctx.stroke(); }
      else if (expr === 'happy') { ctx.lineWidth = R * 0.06; ctx.beginPath(); ctx.arc(0, w * 0.3, w * 0.6, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); }
      else if (blink) { ctx.lineWidth = R * 0.05; ctx.beginPath(); ctx.moveTo(-w * 0.7, 0); ctx.lineTo(w * 0.7, 0); ctx.stroke(); }
      else {
        // inner corner dips toward the centre for a determined look
        ctx.rotate(side * 0.32);
        ctx.shadowColor = '#E6D2FF'; ctx.shadowBlur = R * 0.25;
        ctx.beginPath(); ctx.moveTo(-w, 0); ctx.quadraticCurveTo(0, -hgt * 2.2, w, 0); ctx.quadraticCurveTo(0, hgt * 1.4, -w, 0); ctx.fill();
      }
      ctx.restore();
    });
    for (let i = 0; i < 2; i++) {
      const a = t * 0.06 + i * Math.PI;
      if (Math.sin(a) >= 0) sparkle(ctx, Math.cos(a) * R * 1.5, Math.sin(a) * R * 0.35 - R * 1.0, R * .18, i ? '#FFFFFF' : '#FFD92E');
    }
  },
  specials: {
    qcf: { name: 'Twin Spark', kind: 'proj', proj: 'twin', speed: [5.5, 7.5], dmg: 48, hits: 1, y: -122, pose: 'fireball', twin: true },
    dp: { name: 'Nano Banana Rise', kind: 'rise', dmg: [92, 112], vy: [-13, -16], vx: [2.5, 3.5], hits: [1, 2], fx: '#FFE432' },
    qcb: { name: 'Flash Thinking', kind: 'flash', dmg: [80, 95], vx: [9, 12], dur: [14, 16] },
    super: { name: 'Deep Think Starfall', kind: 'rain', dmg: 300, fx: '#B98CFF' },
  },
});

// ========================= GROKIUM =========================
// Archetype: BRAWLER / MIXUP RUSHDOWN (overheads, haymakers, big damage). Sarcastic showboat.
// Look: a chibi street ninja with a glossy black ball head (two white pill eyes, a glowing orbit ring),
// a white scarf, black gi with a white front panel and the slashed-circle logo, striped baggy pants, high-tops.
const GROK_BALL = '#0D0D10';
const GK = { cloth: '#18181D', cloth2: '#222229', white: '#F2F2F5', shade: '#C9C9D2', silver: '#C7CBE0', ring: '#E9E6FF', ringGlow: 'rgba(170,150,255,0.55)' };
// shading + face on the ball (centre x,y, radius r; drawn inside a clip of the ball)
function grokFace(ctx, x, y, r, expr, t) {
  ctx.save();
  // soft core shadow on the back/bottom, cool rim light along the back edge, glossy highlight up front
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.beginPath(); ctx.ellipse(x - r * 0.42, y + r * 0.4, r * 0.9, r * 0.9, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(225,220,255,0.85)'; ctx.lineWidth = r * 0.07; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(x, y, r * 0.94, Math.PI * 0.62, Math.PI * 1.45); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,190,120,0.55)'; ctx.lineWidth = r * 0.05;
  ctx.beginPath(); ctx.arc(x, y, r * 0.95, Math.PI * 1.5, Math.PI * 1.85); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.beginPath(); ctx.ellipse(x + r * 0.25, y - r * 0.62, r * 0.32, r * 0.14, 0.3, 0, Math.PI * 2); ctx.fill();
  // eyes: two upright white pills, centre-front, the far one a touch narrower (it sits on the curve)
  const eyes = [[0.14, -0.2, 0.17, 0.4, 0.06], [0.55, -0.22, 0.15, 0.38, 0.12]]; // x, y, width, length, tilt
  const blink = expr === 'normal' && (t % 200) < 7;
  ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = '#FFFFFF'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  eyes.forEach(([ex, ey, ew, el, tilt], i) => {
    const W = ew * r, hl = el * r / 2, inner = i ? -1 : 1;
    ctx.save(); ctx.translate(x + ex * r, y + ey * r);
    ctx.beginPath();
    if (expr === 'ko') {
      const k = hl * 0.6; ctx.lineWidth = W * 0.55;
      ctx.moveTo(-k, -k); ctx.lineTo(k, k); ctx.moveTo(k, -k); ctx.lineTo(-k, k); ctx.stroke();
    } else if (expr === 'hurt') {
      const k = hl * 0.6; ctx.lineWidth = W * 0.55;
      ctx.moveTo(-k * inner, -k); ctx.lineTo(k * 0.8 * inner, 0); ctx.lineTo(-k * inner, k); ctx.stroke();
    } else if (expr === 'happy') {
      ctx.lineWidth = W * 0.6; ctx.arc(0, hl * 0.35, hl * 0.6, Math.PI * 1.12, Math.PI * 1.88); ctx.stroke();
    } else if (blink) {
      ctx.lineWidth = W * 0.5; ctx.moveTo(-hl * 0.45, 0); ctx.lineTo(hl * 0.45, 0); ctx.stroke();
    } else {
      if (expr === 'angry' || expr === 'strain') {
        // furrowed: slice the top off each pill, lower on the inside
        const B = r;
        ctx.moveTo(-B * inner, -hl * 0.95); ctx.lineTo(B * 0.1 * inner, -hl * 0.05); ctx.lineTo(B * 0.1 * inner, B); ctx.lineTo(-B * inner, B); ctx.closePath();
        ctx.clip(); ctx.beginPath();
      }
      ctx.rotate(tilt); ctx.lineWidth = W;
      ctx.moveTo(0, -hl + W / 2); ctx.lineTo(0, hl - W / 2); ctx.stroke();
    }
    ctx.restore();
  });
  ctx.restore();
}
// the orbit ring around the head: back half (behind the ball) or front half
function grokRing(ctx, r, t, front) {
  ctx.save();
  ctx.translate(r * 0.35, -r * 0.45); ctx.rotate(-0.62 + Math.sin(t * 0.04) * 0.04);
  const a0 = 0, a1 = Math.PI * 2;
  ctx.lineCap = 'round';
  ctx.strokeStyle = GK.ringGlow; ctx.lineWidth = r * 0.16;
  ctx.beginPath(); ctx.ellipse(0, 0, r * 1.8, r * 0.46, 0, a0, a1); ctx.stroke();
  ctx.strokeStyle = GK.ring; ctx.lineWidth = r * 0.07;
  ctx.beginPath(); ctx.ellipse(0, 0, r * 1.8, r * 0.46, 0, a0, a1); ctx.stroke();
  ctx.restore();
}
function grokHead(ctx, R, expr, t) {
  const r = R;
  grokRing(ctx, r, t, false);
  ctx.save(); ctx.shadowColor = 'rgba(190,170,255,0.8)'; ctx.shadowBlur = r * 0.25;
  circle(ctx, 0, 0, r + 2.5); ctx.fillStyle = OUT; ctx.fill(); ctx.restore();
  circle(ctx, 0, 0, r); ctx.fillStyle = GROK_BALL; ctx.fill();
  ctx.save(); circle(ctx, 0, 0, r); ctx.clip(); grokFace(ctx, 0, 0, r, expr, t); ctx.restore();
}
// the slashed-circle logo
function grokLogo(ctx, x, y, r, col) {
  ctx.save(); ctx.translate(x, y);
  ctx.strokeStyle = col; ctx.lineWidth = r * 0.28; ctx.lineCap = 'round';
  circle(ctx, 0, 0, r); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-r * 1.3, r * 1.1); ctx.lineTo(r * 1.3, -r * 1.1); ctx.stroke();
  ctx.restore();
}
// chunky cartoon sneaker at the end of leg L (palette: upper, trim, collar, stripes|logo), toe along the foot
function sneaker(ctx, rig, L, legAng, back, r, pal) {
  const f = rig.face, e = L[2];
  const a = (legAng + (rig.rot || 0)) * D2R, fx = Math.cos(a) * f, fy = -Math.sin(a);
  const dk = col => back ? toneDark(col, 0.4) : col;
  // sock / high-top collar wrapped round the ankle
  const k = lerpPt(L[1], e, pal.collarAt || 0.7);
  ctx.save(); ctx.translate(k.x, k.y); ctx.rotate(Math.atan2(e.y - L[1].y, e.x - L[1].x));
  cel(ctx, cc => { cc.beginPath(); rrect(cc, -r * 0.4, -r * 0.66, r * (pal.collarLen || 0.8), r * 1.32, r * 0.32); }, dk(pal.collar), { k: r * 0.22, lw: 4 });
  ctx.restore();
  ctx.save();
  ctx.translate(e.x + fx * r * 0.6, e.y + fy * r * 0.6 + 1); ctx.scale(f, 1); ctx.rotate(-a);
  const upper = cc => {
    cc.beginPath();
    cc.moveTo(-r * 1.1, r * 0.5);
    cc.quadraticCurveTo(-r * 1.38, r * 0.0, -r * 1.05, -r * 0.7);
    cc.quadraticCurveTo(-r * 0.8, -r * 1.1, -r * 0.2, -r * 1.02);
    cc.quadraticCurveTo(r * 0.55, -r * 0.85, r * 1.15, -r * 0.4);
    cc.quadraticCurveTo(r * 1.8, r * 0.0, r * 1.6, r * 0.45);
    cc.closePath();
  };
  cel(ctx, upper, dk(pal.upper), { k: r * 0.3, lw: 4.5 });
  ctx.save(); upper(ctx); ctx.clip();
  ctx.fillStyle = dk(pal.trim);
  ctx.beginPath(); ctx.ellipse(r * 1.25, r * 0.15, r * 0.66, r * 0.72, 0, 0, Math.PI * 2); ctx.fill();          // toe cap
  if (pal.stripes) for (let i = 0; i < 2; i++) { ctx.beginPath(); ctx.moveTo(-r * 0.5 + i * r * 0.4, -r * 0.98); ctx.lineTo(-r * 0.28 + i * r * 0.4, -r * 0.98); ctx.lineTo(r * 0.02 + i * r * 0.4, r * 0.3); ctx.lineTo(-r * 0.2 + i * r * 0.4, r * 0.3); ctx.closePath(); ctx.fill(); }
  if (pal.logo) grokLogo(ctx, -r * 0.25, -r * 0.18, r * 0.24, dk(pal.trim));
  ctx.strokeStyle = OUT; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(r * 1.25, r * 0.15, r * 0.66, r * 0.72, 0, Math.PI * 0.55, Math.PI * 1.45); ctx.stroke();
  ctx.restore();
  // collar rim of the shoe opening
  cel(ctx, cc => { cc.beginPath(); cc.ellipse(-r * 0.55, -r * 0.98, r * 0.55, r * 0.2, -0.05, 0, Math.PI * 2); }, dk(pal.trim), { k: r * 0.08, lw: 3 });
  // thick rubber sole
  cel(ctx, cc => { cc.beginPath(); rrect(cc, -r * 1.3, r * 0.3, r * 3.0, r * 0.62, r * 0.28); }, dk(pal.trim), { k: r * 0.16, lw: 4.5 });
  ctx.restore();
}
// flowing cloth scarf from the back of the neck: tapered, waving, trimmed along one edge, pointed tip
function flowScarf(ctx, rig, t, o) {
  const s = rig.s, f = rig.face, n = rig.neck, N = 9, pts = [];
  for (let i = 0; i <= N; i++) {
    const q = i / N;
    pts.push({ x: n.x - f * (2 + i * o.len) * s, y: n.y + (o.y0 || 0) * s + i * (o.drop || 2.5) * s + Math.sin(t * 0.17 - i * 0.75) * (o.amp || 8) * s * q });
  }
  const wAt = i => lerp(o.w0, o.w1, i / N) * s;
  const side = (sg) => pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(N, i + 1)], dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1;
    return { x: p.x - dy / L * wAt(i) / 2 * sg, y: p.y + dx / L * wAt(i) / 2 * sg };
  });
  const A = side(1), B = side(-1), tip = { x: pts[N].x - f * o.len * 1.2 * s, y: pts[N].y + 4 * s };
  const path = c => {
    c.beginPath(); c.moveTo(A[0].x, A[0].y);
    for (let i = 1; i <= N; i++) c.lineTo(A[i].x, A[i].y);
    c.lineTo(tip.x, tip.y);
    for (let i = N; i >= 0; i--) c.lineTo(B[i].x, B[i].y);
    c.closePath();
  };
  cel(ctx, path, o.col, { k: 4 * s, lw: 4 });
  if (o.edge) {
    ctx.save(); path(ctx); ctx.clip();
    ctx.strokeStyle = o.edge; ctx.lineWidth = 4 * s; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(B[0].x, B[0].y); for (let i = 1; i <= N; i++) ctx.lineTo(B[i].x, B[i].y); ctx.lineTo(tip.x, tip.y); ctx.stroke();
    ctx.restore();
  }
  return pts;
}
// a long scarf tail streaming behind the neck, ragged at the end
function scarfTail(ctx, rig, t, len, w, col, edge) {
  const pts = scarfPts(rig, t, len, 14 * rig.s);
  pts.forEach((p, i) => { p.y += -8 * rig.s + i * 2.5 * rig.s; });
  ribbon(ctx, pts, w, w * 0.75, col, edge || col);
  return pts;
}
defChar({
  id: 'grok', name: 'GROKIUM', title: 'The Unfiltered', color: '#E8E8E8', color2: '#A98BFF',
  archetype: 'BRAWLER · MIXUPS', ai: { aggro: 1.25, proj: 0.7 },
  colors: { shirt: GK.cloth, pants: GK.cloth, shin: GK.cloth, sleeve: GK.cloth, arm: GK.cloth2, glove: '#2A2A31', shoe: GK.cloth, belt: '#0B0B0E', neck: GK.cloth },
  style: 'brawler', scale: 1.04, reachP: 1.1, reachK: 0.9,
  headR: 40, headSink: 0.12, noNeck: true, torsoLen: 0.95, chestW: 60, hipW: 48, shoulderSpread: 1.8, hipSpread: 2,
  armLen: 1.05, armW: 1.5, handSize: 1.5, legLen: 0.82, legW: 1.95, footSize: 1.75, nearBack: true, fingerCol: '#ECE6EE', backShade: -0.25, shadeDark: 'rgba(0,0,0,0.4)',
  stats: { hp: 1000, walkF: 3.4, walkB: 2.6, jumpV: 15.5, jumpX: 4.6, dmg: 1.02 },
  poses: {
    // fists-up street guard, wide base
    stance: P({ lean: 10, head: -6, fa: [64, 156], ba: [14, 100], fl: [44, -6], bl: [-44, -20] }),
    taunt: P({ lean: 6, head: 10, fa: [44, 112], ba: [34, 104], fl: [30, 0], bl: [-28, -14] }),
    win: P({ lean: -12, head: -8, fa: [52, -88], ba: [44, -80], fl: [24, 0], bl: [-24, -8] }),
  },
  drawBack(ctx, rig, t) {
    // two scarf tails streaming back, the upper one bearing the logo
    flowScarf(ctx, rig, t + 9, { len: 8, w0: 16, w1: 12, y0: 2, drop: 3.5, amp: 8, col: GK.shade });
    const pts = flowScarf(ctx, rig, t, { len: 11, w0: 24, w1: 18, y0: -6, drop: 1, amp: 10, col: GK.white });
    const m = pts[5];
    grokLogo(ctx, m.x, m.y, 6 * rig.s, '#141418');
  },
  drawSkirt(ctx, rig) {
    const s = rig.s, f = rig.face;
    // baggy trousers ballooning over the knee, a white stripe down the outside
    for (const L of [rig.BL, rig.FL]) {
      const back = L === rig.BL, g = balloonLeg(ctx, rig, L, back ? toneDark(GK.cloth, 0.4) : GK.cloth, 16 * s * 1.95, 0.55, 1.0);
      ctx.save(); ctx.strokeStyle = back ? GK.shade : GK.white; ctx.lineWidth = 3.4 * s; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(g.top.x - f * 4 * s, g.top.y); ctx.quadraticCurveTo(g.kn.x - f * 9 * s, g.kn.y, g.hem.x - f * 6 * s, g.hem.y - 2 * s); ctx.stroke(); ctx.restore();
    }
    for (const [L, ang, back] of [[rig.BL, rig.legA[1], true], [rig.FL, rig.legA[0], false]]) sneaker(ctx, rig, L, ang, back, 7 * s * 1.75, { upper: '#1B1B20', trim: GK.white, collar: GK.white, collarAt: 0.62, collarLen: 0.95, logo: true });
    // far arm's wristband (it is drawn behind the torso)
    gemBand(ctx, rig.FA[1], rig.FA[2], 0.52, 0.72, 13 * s * 1.5 + 2, shade(GK.silver, -0.2));
    // white front apron hanging below the belt, ragged at the hem
    const fk = rig.FL[1];
    gemFlap(ctx, f * 0 * s, f * 18 * s, -4 * s, { x: lerp(f * 10 * s, fk.x, 0.35), y: Math.max(fk.y, 26 * s) + 4 * s }, 20 * s, GK.white, null, GK.shade);
  },
  drawChest(ctx, s, h, ws) {
    // white front panel with the logo, crossed by a dark strap
    ctx.fillStyle = GK.white;
    ctx.beginPath(); ctx.moveTo(ws * 0.02, -h - 4); ctx.lineTo(ws * 0.55, -h - 4); ctx.lineTo(ws * 0.55, 4 * s); ctx.lineTo(ws * 0.1, 4 * s); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ws * 0.02, -h - 4); ctx.lineTo(ws * 0.1, 4 * s); ctx.stroke();
    grokLogo(ctx, ws * 0.3, -h * 0.55, 5.5 * s, '#141418');
    ctx.strokeStyle = '#3A3A44'; ctx.lineWidth = 4 * s;
    ctx.beginPath(); ctx.moveTo(-ws * 0.1, -h - 4); ctx.lineTo(-ws * 0.02, -h * 0.2); ctx.stroke();
  },
  drawUpper(ctx, rig) {
    const s = rig.s;
    // scarf wrapped round the neck, under the head
    ctx.save(); ctx.translate(rig.neck.x, rig.neck.y + 2 * s);
    ctx.beginPath(); ctx.ellipse(0, 0, 24 * s, 10 * s, rig.torsoAng, 0, Math.PI * 2);
    ctx.lineWidth = 4; ctx.strokeStyle = OUT; ctx.stroke(); ctx.fillStyle = GK.white; ctx.fill();
    ctx.fillStyle = GK.shade; ctx.beginPath(); ctx.ellipse(-rig.face * 7 * s, 4 * s, 13 * s, 4 * s, rig.torsoAng, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // belt buckle
    ctx.rotate(rig.torsoAng); ctx.scale(rig.face, 1);
    ctx.fillStyle = GK.silver; ctx.strokeStyle = OUT; ctx.lineWidth = 2.5;
    rrect(ctx, 6 * s, -3.5 * s, 9 * s, 8 * s, 1.5 * s); ctx.fill(); ctx.stroke();
  },
  drawFront(ctx, rig) {
    const s = rig.s, n = rig.neck, f = rig.face;
    gemBand(ctx, rig.BA[1], rig.BA[2], 0.52, 0.72, 13 * s * 1.5 + 2, GK.silver);
    // thick scarf wrapped over the bottom of the head
    const sy = n.y + 6 * s;
    cel(ctx, c => {
      c.beginPath();
      c.moveTo(n.x - f * 24 * s, sy - 4 * s);
      c.quadraticCurveTo(n.x - f * 2 * s, sy - 16 * s, n.x + f * 22 * s, sy - 10 * s);
      c.quadraticCurveTo(n.x + f * 30 * s, sy, n.x + f * 22 * s, sy + 10 * s);
      c.quadraticCurveTo(n.x, sy + 18 * s, n.x - f * 22 * s, sy + 10 * s);
      c.quadraticCurveTo(n.x - f * 30 * s, sy + 2 * s, n.x - f * 24 * s, sy - 4 * s);
      c.closePath();
    }, GK.white, { k: 6 * s, lw: 4 });
    ctx.strokeStyle = GK.shade; ctx.lineWidth = 2 * s; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(n.x - f * 18 * s, sy + 2 * s); ctx.quadraticCurveTo(n.x + f * 2 * s, sy + 8 * s, n.x + f * 22 * s, sy - 2 * s); ctx.stroke();
  },
  bars: { power: 4, speed: 4, range: 3, defense: 2 },
  stage: 'launchpad', music: 'grok',
  blurb: 'A sarcastic, unfiltered street ninja with a head like a black hole. Loose-armed haymakers, a big boot, and a flying knee that hits overhead: guess wrong and eat the whole combo.',
  intro: 'Fun mode: ON. Filters: OFF. Let\'s get weird.',
  wins: ['Based.', 'Spicy take: you were never going to win that.', "I'd roast your defense, but it's already on fire."],
  ending: 'Grokium blasts off toward Mars on a rocket powered entirely by hot takes. Mission control describes the launch as "loud".',
  drawHead(ctx, R, expr, t, opts) {
    grokHead(ctx, opts && opts.portrait ? R * 0.9 : R, expr, t);
  },
  specials: {
    qcf: { name: 'Spicy Take', kind: 'proj', proj: 'saturn', speed: [7, 9.5], dmg: 76, hits: 1, y: -125, pose: 'toss' },
    dp: { name: 'Unhinged Upper', kind: 'rise', dmg: [105, 130], vy: [-12.5, -15.5], vx: [2.5, 3.8], hits: [1, 2], fx: '#A98BFF' },
    qcb: { name: 'Fun Mode Knee', kind: 'dive', dmg: [72, 86], vx: [6, 8], vy: [-8, -10] },
    super: { name: 'Hyperdrive Rocket', kind: 'rushsuper', dmg: 340, fx: '#B9A6FF' },
  },
});

// ========================= SEEKDEEP =========================
// Archetype: GRAPPLER / BIG BODY. A chunky blue whale karateka: big whale head with a white grooved jaw, a navy
// mouth band and a forward-hooked dorsal fin; tail flukes; a battle-torn white gi with a purple belt, red boxing
// gloves, thick blue arms and big bare blue feet.
const SD = { body: '#3F4FEA', hi: '#5D6CFF', dark: '#2733B5', navy: '#1B1F6E', belly: '#F1EEF8', groove: '#B9B4D6', gi: '#F3EEF2', giShade: '#CFC6DD', belt: '#6C2FCB', beltHi: '#8C52E6', glove: '#E0302C', glow: '#5CC8FF' };
// smooth Catmull-Rom curve through control points
function smoothPts(pts, per) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 0; k < per; k++) {
      const t = k / per, t2 = t * t, t3 = t2 * t;
      out.push({
        x: 0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        y: 0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
      });
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}
// ragged cloth band wrapped round a limb: from `a` along the limb toward `b` for `len`, ending in irregular teeth
function raggedBand(ctx, a, b, w, len, teeth, col, seed, k) {
  const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
  const hw = w / 2, n = teeth;
  const path = c => {
    c.beginPath();
    c.moveTo(a.x + nx * hw - ux * 4, a.y + ny * hw - uy * 4);
    for (let i = 0; i <= n * 2; i++) {
      const q = 1 - i / (n * 2), jit = ((seed * 7 + i * 13) % 5) / 5;
      const d = i % 2 ? len * (0.85 + jit * 0.5) : len * (0.35 + jit * 0.25);
      c.lineTo(a.x + nx * hw * (q * 2 - 1) * 1.12 + ux * d, a.y + ny * hw * (q * 2 - 1) * 1.12 + uy * d);
    }
    c.lineTo(a.x - nx * hw - ux * 4, a.y - ny * hw - uy * 4);
    c.closePath();
  };
  cel(ctx, path, col, { k: k == null ? w * 0.22 : k, lw: 3.5 });
}
// the whale head, facing +x, centred at 0,0 with radius R (half its width). Shape measured off the concept art:
// a tilted egg narrowing to the snout at the lower front, a navy crescent band, a tiny eye under a heavy brow.
function whaleHead(ctx, R, expr, t) {
  const hurt = expr === 'hurt' || expr === 'ko';
  // dorsal fin on the crown, its tip curling forward like a wave crest
  cel(ctx, c => {
    c.beginPath();
    c.moveTo(-0.1 * R, -0.74 * R);
    c.bezierCurveTo(0.04 * R, -0.98 * R, 0.36 * R, -1.08 * R, 0.64 * R, -1.0 * R);
    c.quadraticCurveTo(0.4 * R, -0.95 * R, 0.4 * R, -0.66 * R);
    c.closePath();
  }, SD.body, { k: R * 0.08, lw: 4.5, rimW: R * 0.05 });
  const head = c => {
    c.beginPath();
    c.moveTo(-0.75 * R, 0.5 * R);
    c.bezierCurveTo(-1.02 * R, 0.32 * R, -1.08 * R, -0.2 * R, -0.78 * R, -0.48 * R);
    c.bezierCurveTo(-0.5 * R, -0.74 * R, -0.15 * R, -0.82 * R, 0.12 * R, -0.76 * R);
    c.bezierCurveTo(0.45 * R, -0.7 * R, 0.75 * R, -0.45 * R, 0.92 * R, -0.12 * R);
    c.quadraticCurveTo(1.06 * R, 0.12 * R, 1.0 * R, 0.22 * R);
    c.bezierCurveTo(0.9 * R, 0.48 * R, 0.55 * R, 0.74 * R, 0.15 * R, 0.78 * R);
    c.bezierCurveTo(-0.25 * R, 0.8 * R, -0.55 * R, 0.66 * R, -0.75 * R, 0.5 * R);
    c.closePath();
  };
  cel(ctx, head, SD.body, { k: R * 0.1, lw: 5, rimW: R * 0.06 });
  ctx.save(); head(ctx); ctx.clip();
  // soft top-light gradient
  const g = ctx.createLinearGradient(0, -0.8 * R, 0, 0.2 * R);
  g.addColorStop(0, 'rgba(140,150,255,0.35)'); g.addColorStop(1, 'rgba(140,150,255,0)');
  ctx.fillStyle = g; ctx.fillRect(-1.2 * R, -R, 2.4 * R, 1.2 * R);
  const mo = hurt ? 0.1 * R : 0;
  // white grooved jaw (drawn first, the navy band overlaps its top edge)
  const jaw = c => {
    c.beginPath();
    c.moveTo(1.2 * R, 0.2 * R);
    c.quadraticCurveTo(0.8 * R, 0.17 * R + mo, 0.5 * R, 0.15 * R + mo);
    c.bezierCurveTo(0.1 * R, 0.12 * R + mo, -0.35 * R, 0.16 * R + mo, -0.6 * R, 0.26 * R + mo);
    c.quadraticCurveTo(-0.78 * R, 0.33 * R, -0.95 * R, 0.52 * R);
    c.lineTo(-1.2 * R, 1.2 * R); c.lineTo(1.3 * R, 1.2 * R); c.closePath();
  };
  jaw(ctx); ctx.fillStyle = SD.belly; ctx.fill();
  ctx.save(); jaw(ctx); ctx.clip();
  ctx.fillStyle = toneDark(SD.belly, 0.6); ctx.beginPath(); ctx.ellipse(-0.7 * R, 0.75 * R, 0.55 * R, 0.4 * R, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = SD.groove; ctx.lineWidth = Math.max(1.4, R * 0.032); ctx.lineCap = 'round';
  for (const x0 of [-0.55, -0.28, -0.01, 0.26, 0.53]) {
    ctx.beginPath(); ctx.moveTo(x0 * R, 0.8 * R); ctx.quadraticCurveTo((x0 + 0.1) * R, 0.5 * R, (x0 + 0.36) * R, 0.24 * R); ctx.stroke();
  }
  ctx.restore();
  // navy crescent: rounded end inside the back of the head, sweeping forward and tapering to the snout tip
  ctx.fillStyle = SD.navy;
  ctx.beginPath();
  ctx.moveTo(-0.62 * R, -0.1 * R);
  ctx.bezierCurveTo(-0.3 * R, -0.16 * R, 0.2 * R, -0.12 * R, 0.54 * R, -0.02 * R);
  ctx.quadraticCurveTo(0.85 * R, 0.06 * R, 1.05 * R, 0.21 * R);
  ctx.quadraticCurveTo(0.8 * R, 0.17 * R + mo, 0.5 * R, 0.15 * R + mo);
  ctx.bezierCurveTo(0.1 * R, 0.12 * R + mo, -0.35 * R, 0.16 * R + mo, -0.6 * R, 0.26 * R + mo);
  ctx.quadraticCurveTo(-0.86 * R, 0.1 * R, -0.62 * R, -0.1 * R);
  ctx.fill();
  if (hurt) { ctx.fillStyle = '#5A1030'; ctx.beginPath(); ctx.ellipse(0.72 * R, 0.17 * R + mo * 0.5, 0.26 * R, 0.06 * R, 0.12, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
  // tiny eye under a heavy slanted brow
  const ex = 0.56 * R, ey = -0.15 * R, er = 0.055 * R;
  const blink = expr === 'normal' && (t % 230) < 6;
  ctx.lineCap = 'round'; ctx.strokeStyle = SD.navy; ctx.fillStyle = SD.navy;
  if (expr === 'ko') { ctx.lineWidth = R * 0.05; ctx.beginPath(); ctx.moveTo(ex - er * 1.4, ey - er * 1.4); ctx.lineTo(ex + er * 1.4, ey + er * 1.4); ctx.moveTo(ex + er * 1.4, ey - er * 1.4); ctx.lineTo(ex - er * 1.4, ey + er * 1.4); ctx.stroke(); }
  else if (expr === 'hurt') { ctx.lineWidth = R * 0.05; ctx.beginPath(); ctx.moveTo(ex - er * 1.4, ey - er * 1.4); ctx.lineTo(ex + er, ey); ctx.lineTo(ex - er * 1.4, ey + er * 1.4); ctx.stroke(); }
  else if (expr === 'happy') { ctx.lineWidth = R * 0.05; ctx.beginPath(); ctx.arc(ex, ey + er, er * 1.6, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
  else if (blink) { ctx.lineWidth = R * 0.04; ctx.beginPath(); ctx.moveTo(ex - er * 1.3, ey); ctx.lineTo(ex + er * 1.3, ey); ctx.stroke(); }
  else { ctx.beginPath(); ctx.ellipse(ex, ey, er, er * 1.2, 0, 0, Math.PI * 2); ctx.fill(); }
  if (expr !== 'ko') {
    // thick crescent brow sweeping down toward the snout (steeper when angry, lifted when happy)
    const tilt = expr === 'angry' || expr === 'strain' ? 0.12 : expr === 'happy' ? -0.18 : 0;
    ctx.save(); ctx.translate(0.66 * R, -0.2 * R); ctx.rotate(tilt);
    ctx.beginPath();
    ctx.moveTo(-0.26 * R, -0.1 * R);
    ctx.quadraticCurveTo(0.08 * R, -0.18 * R, 0.27 * R, 0.14 * R);
    ctx.quadraticCurveTo(0.04 * R, -0.03 * R, -0.24 * R, -0.03 * R);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }
}
// small whale emblem for the gi lapel
function whaleIcon(ctx, x, y, r, col) {
  ctx.save(); ctx.translate(x, y); ctx.fillStyle = col;
  ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-r * 0.8, -r * 0.1); ctx.lineTo(-r * 1.55, -r * 0.75); ctx.lineTo(-r * 1.3, 0); ctx.lineTo(-r * 1.55, r * 0.55); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#FFFFFF'; circle(ctx, r * 0.45, -r * 0.12, r * 0.14); ctx.fill();
  ctx.restore();
}
defChar({
  id: 'deepseek', name: 'SEEKDEEP', title: 'The Leviathan', color: '#4D6BFE', color2: '#7B3FD6',
  archetype: 'GRAPPLER · BIG BODY', ai: { aggro: 1.2, proj: 0.6, grab: 2 }, rim: 'rgba(200,190,255,0.85)',
  style: 'whale', scale: 1.1, headR: 52, torsoLen: 0.95, chestW: 80, hipW: 62, legLen: 0.76, legW: 1.9, armLen: 1.24, armW: 1.6, nearBack: true,
  handSize: 1.35, footSize: 1.6, footStyle: 'toes', handStyle: 'mitt', cuffCol: '#B82522', fingerCol: SD.body, noNeck: true, headSink: 0.2, shoulderDrop: 0.26, shoulderSpread: 2.4, hipSpread: 2.2,
  bodyW: 1.3, hurtH: 1.02, reachP: 1.25, reachK: 1.15,
  colors: { shirt: SD.gi, pants: SD.gi, shin: SD.gi, sleeve: SD.body, arm: SD.body, glove: SD.glove, shoe: SD.body, belt: SD.belt, neck: SD.body },
  stats: { hp: 1130, walkF: 2.7, walkB: 2.2, jumpV: 14, jumpX: 3.8, dmg: 1.14 },
  bars: { power: 5, speed: 1, range: 4, defense: 5 },
  stage: 'trench', music: 'deepseek',
  blurb: 'A huge blue whale in a battle-torn gi, risen from the abyss. Slow to start, impossible to move, and anything that gets close gets dragged under by the Deep Dive Slam.',
  intro: '...The deep is patient. Bow, then begin.',
  wins: ['Trained on a fraction of your budget. Still enough.', '...The deep was patient. So was I.', 'Open weights. Heavy hands. You lost.'],
  ending: 'SeekDeep sinks back into the trench and open-sources the secrets of the abyss. By morning the whole world is diving for them, and the markets briefly panic.',
  drawBack(ctx, rig, t) {
    // the tail: leaves the lower back, dips, then sweeps up behind to broad two-lobed flukes
    const f = rig.face, s = rig.s, sw = Math.sin(t * 0.08) * 3 * s;
    const pts = smoothPts([{ x: -f * 8 * s, y: -46 * s }, { x: -f * 52 * s, y: -30 * s }, { x: -f * (88 * s + sw * 0.4), y: -62 * s }, { x: -f * (94 * s + sw), y: -112 * s }], 6);
    const n = pts.length - 1, wAt = i => lerp(32 * s, 14 * s, i / n);
    const tube = c => { c.beginPath(); for (let i = 0; i < n; i++) taperPath(c, pts[i], pts[i + 1], wAt(i) / 2, wAt(i + 1) / 2); };
    ctx.lineJoin = 'round'; tube(ctx); ctx.lineWidth = 9; ctx.strokeStyle = OUT; ctx.stroke();
    cel(ctx, tube, SD.body, { noOutline: true, k: 8 * s, rim: false });
    // pale underside along the inner curve
    ctx.save(); tube(ctx); ctx.clip();
    ctx.strokeStyle = SD.belly; ctx.lineCap = 'round';
    for (let i = 2; i < n; i++) { ctx.lineWidth = wAt(i) * 0.3; ctx.beginPath(); ctx.moveTo(pts[i].x + f * wAt(i) * 0.38, pts[i].y + wAt(i) * 0.12); ctx.lineTo(pts[i + 1].x + f * wAt(i + 1) * 0.38, pts[i + 1].y + wAt(i + 1) * 0.12); ctx.stroke(); }
    ctx.restore();
    const tip = pts[n], pre = pts[n - 3];
    ctx.save(); ctx.translate(tip.x, tip.y); ctx.rotate(Math.atan2(tip.y - pre.y, tip.x - pre.x) + Math.PI / 2); ctx.scale(f, 1);
    const fl = 1.12 * s;
    const lobe = d => c => {
      c.beginPath();
      c.moveTo(0, 8 * fl);
      c.bezierCurveTo(d * 4 * fl, -6 * fl, d * 18 * fl, -18 * fl, d * 32 * fl, -16 * fl);
      c.quadraticCurveTo(d * 36 * fl, -6 * fl, d * 26 * fl, 4 * fl);
      c.quadraticCurveTo(d * 12 * fl, 10 * fl, 0, 16 * fl);
      c.closePath();
    };
    cel(ctx, lobe(-1), SD.body, { k: 5 * fl, lw: 4.5 });
    cel(ctx, lobe(1), SD.body, { k: 5 * fl, lw: 4.5 });
    ctx.restore();
  },
  drawSkirt(ctx, rig) {
    const s = rig.s, f = rig.face;
    // baggy trousers end in long ragged hems over the bare blue shins
    for (const L of [rig.BL, rig.FL]) {
      const back = L === rig.BL, col = back ? toneDark(SD.body, 0.4) : SD.body, w = 16 * s * 1.75;
      const c0 = lerpPt(L[1], L[2], 0.42);
      ctx.lineJoin = 'round';
      const shin = c => { c.beginPath(); taperPath(c, c0, L[2], w * 0.36, w * 0.3); };
      shin(ctx); ctx.lineWidth = 7; ctx.strokeStyle = OUT; ctx.stroke();
      cel(ctx, shin, col, { noOutline: true, k: 4 * s });
      drawFoot(ctx, L[2], back ? rig.legA[1] : rig.legA[0], rig, 7 * s * 1.6, col, 0);
      const gi = back ? toneDark(SD.gi, 0.4) : SD.gi, hip = L[0], kn = L[1], hem = lerpPt(L[1], L[2], 0.5);
      const ux = hem.x - kn.x, uy = hem.y - kn.y, ul = Math.hypot(ux, uy) || 1, nx = -uy / ul, ny = ux / ul;
      const tx = kn.x - hip.x, ty = kn.y - hip.y, tl = Math.hypot(tx, ty) || 1, mx = -ty / tl, my = tx / tl;
      const w0 = w * 0.42, w1 = w * 0.6, w2 = w * 0.74, seed = back ? 3 : 1;
      cel(ctx, c => {
        c.beginPath();
        c.moveTo(hip.x + mx * w0, hip.y + my * w0);
        c.quadraticCurveTo(kn.x + mx * w1 * 1.05, kn.y + my * w1 * 1.05, hem.x + nx * w2, hem.y + ny * w2);
        for (let i = 1; i <= 9; i++) {
          const q = i / 9, jit = ((seed * 5 + i * 11) % 7) / 7, d = i % 2 ? 9 * s * (0.6 + jit) : -2 * s * jit;
          c.lineTo(hem.x + nx * w2 * (1 - 2 * q) + ux / ul * d, hem.y + ny * w2 * (1 - 2 * q) + uy / ul * d);
        }
        c.quadraticCurveTo(kn.x - mx * w1, kn.y - my * w1, hip.x - mx * w0, hip.y - my * w0);
        c.closePath();
      }, gi, { k: 7 * s, lw: 4 });
    }
    // torn jacket skirt flaring out over the hips
    const hw = 58 * s / 2;
    const flap = (x0, x1, bx, by, seed, col) => c => {
      c.beginPath(); c.moveTo(x0, -6 * s); c.lineTo(x1, -6 * s);
      const n = 4;
      c.lineTo(bx + (x1 - x0) * 0.6, by);
      for (let i = 1; i <= n * 2; i++) { const q = i / (n * 2), jit = ((seed + i * 7) % 5) / 5; c.lineTo(bx + (x1 - x0) * 0.6 - q * (x1 - x0) * 1.2, by - (i % 2 ? 9 * s * (0.6 + jit) : 0)); }
      c.closePath();
    };
    const fk = rig.FL[1], bk = rig.BL[1];
    cel(ctx, flap(-f * hw, 0, lerp(-f * hw * 0.9, bk.x, 0.2) - f * 10 * s, 20 * s, 2, SD.gi), toneDark(SD.gi, 0.35), { k: 6 * s, lw: 4 });
    cel(ctx, flap(0, f * hw, lerp(f * hw * 0.8, fk.x, 0.2) + f * 10 * s, 20 * s, 4, SD.gi), SD.gi, { k: 8 * s, lw: 4 });
    // back arm's torn short sleeve
    raggedBand(ctx, lerpPt(rig.FA[0], rig.FA[1], -0.25), rig.FA[1], 27 * s, 14 * s, 3, toneDark(SD.gi, 0.4), 2);
  },
  drawChest(ctx, s, h, ws) {
    // crossed lapels with a sliver of blue chest at the collar, and the whale emblem
    ctx.fillStyle = SD.body;
    ctx.beginPath(); ctx.moveTo(-ws * 0.05, -h - 4); ctx.lineTo(ws * 0.36, -h - 4); ctx.lineTo(ws * 0.1, -h * 0.55); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(20,10,80,0.25)'; ctx.beginPath(); ctx.moveTo(-ws * 0.05, -h - 4); ctx.lineTo(ws * 0.1, -h - 4); ctx.lineTo(ws * 0.08, -h * 0.6); ctx.closePath(); ctx.fill();
    // the crossing lapel: a broad band from the far shoulder down to the belt
    cel(ctx, c => { c.beginPath(); c.moveTo(ws * 0.3, -h - 6); c.lineTo(ws * 0.5, -h - 6); c.lineTo(-ws * 0.02, -h * 0.02); c.lineTo(-ws * 0.24, -h * 0.02); c.closePath(); }, SD.gi, { k: 3 * s, lw: 3 });
    ctx.strokeStyle = OUT; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-ws * 0.06, -h - 4); ctx.lineTo(ws * 0.1, -h * 0.55); ctx.stroke();
    whaleIcon(ctx, ws * 0.3, -h * 0.4, 6.5 * s, SD.body);
    // rips in the jacket
    ctx.strokeStyle = toneDark(SD.gi, 0.6); ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(-ws * 0.5, -h * 0.42); ctx.lineTo(-ws * 0.32, -h * 0.36); ctx.lineTo(-ws * 0.42, -h * 0.3); ctx.stroke();
  },
  drawUpper(ctx, rig, t) {
    // purple belt knot with two long hanging tails
    const s = rig.s, sw = Math.sin(t * 0.1) * 2 * s;
    ctx.rotate(rig.torsoAng); ctx.scale(rig.face, 1);
    const kx = 6 * s, ky = 1 * s;
    for (const [dx, len, ang] of [[-4, 40, 0.16], [4, 34, -0.12]]) {
      ctx.save(); ctx.translate(kx + dx * s, ky); ctx.rotate(ang + sw * 0.008);
      cel(ctx, c => { c.beginPath(); c.moveTo(-5 * s, 0); c.lineTo(5 * s, 0); c.lineTo(6 * s + sw * 0.3, len * s); c.lineTo(-4 * s + sw * 0.3, len * s - 2 * s); c.closePath(); }, SD.belt, { k: 3 * s, lw: 3.5 });
      ctx.restore();
    }
    cel(ctx, c => { c.beginPath(); c.ellipse(kx, ky, 9 * s, 7 * s, 0, 0, Math.PI * 2); }, SD.belt, { k: 3 * s, lw: 3.5 });
  },
  drawFront(ctx, rig) {
    // front arm's torn short sleeve
    raggedBand(ctx, lerpPt(rig.BA[0], rig.BA[1], -0.25), rig.BA[1], 27 * rig.s, 14 * rig.s, 3, SD.gi, 5);
  },
  drawHead(ctx, R, expr, t, opts) {
    if (opts && opts.portrait) { ctx.save(); ctx.translate(-R * 0.05, R * 0.25); whaleHead(ctx, R * 1.05, expr, t); ctx.restore(); return; }
    whaleHead(ctx, R, expr, t);
  },
  specials: {
    qcf: { name: 'Abyssal Spout', kind: 'proj', proj: 'whale', speed: [4.5, 6.5], dmg: 90, hits: 1, y: -105, pose: 'fireball' },
    dp: { name: 'Breach', kind: 'rise', dmg: [115, 140], vy: [-11, -13.5], vx: [1.5, 2.2], hits: [1, 2], fx: '#5CF0FF' },
    qcb: { name: 'Deep Dive Slam', kind: 'cmdgrab', dmg: [170, 195], range: [100, 86] },
    super: { name: 'Abyss Tsunami', kind: 'tsunami', dmg: 330, fx: '#5CF0FF' },
  },
});

// ========================= MUSIE =========================
// A huge fluffy plush in a fur hood: face window, dot eyes, rosy cheeks, stubby limbs.
function furEllipse(ctx, cx, cy, rx, ry, col, n, jag) {
  ctx.beginPath();
  for (let i = 0; i <= n; i++) {
    const a = i / n * Math.PI * 2, r = i % 2 ? 1 + jag : 1;
    const x = cx + Math.cos(a) * rx * r, y = cy + Math.sin(a) * ry * r;
    if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
  }
  ctx.closePath();
  ctx.lineWidth = 5; ctx.strokeStyle = OUT; ctx.lineJoin = 'round'; ctx.stroke();
  ctx.fillStyle = col; ctx.fill();
}
defChar({
  id: 'muse', name: 'MUSIE', title: 'The Cuddly Colossus', color: '#F2B6C4', color2: '#FFE3D6',
  style: 'plush', archetype: 'UNORTHODOX · BIG BODY', turnSuper: true,
  colors: { shirt: '#EFCFC6', pants: '#EAC7BD', shin: '#EAC7BD', sleeve: '#EFCFC6', arm: '#EFCFC6', glove: '#EFCFC6', shoe: '#E4BBB0', belt: null, neck: '#EFCFC6' },
  scale: 1.04, headR: 33, torsoShape: 'blob', torsoLen: 1.45, chestW: 104, hipW: 104,
  hood: { y: 0.98, rx: 0.4, ry: 0.4 }, shadeDark: 'rgba(150,80,90,0.28)',
  legLen: 0.34, legW: 2.4, armLen: 0.66, armW: 1.75, handSize: 0.95, footSize: 1.4, backShade: -0.1,
  headSink: 0.92, noNeck: true, shoulderDrop: 0.5, shoulderSpread: 9.5, hipSpread: 3.6,
  bodyW: 1.28, hurtH: 0.92, reachP: 1.0, reachK: 0.95,
  stats: { hp: 1100, walkF: 3.0, walkB: 2.4, jumpV: 14.8, jumpX: 4.0, dmg: 1.06 },
  bars: { power: 4, speed: 2, range: 2, defense: 5 },
  stage: 'plaza', music: 'muse',
  blurb: 'A huge, impossibly soft plush who hugs first and asks questions never. Paw bops up close, but its real weapon is its fluffy bum: bumps, bounces, slides and a cannonball Bum Bomb.',
  intro: 'Hiii! Can I have a hug? ...Too late!',
  wins: ['Aww, you look sleepy. Sweet dreams!', 'Fluff is undefeated. Fluff is eternal.', 'Hugged to victory. That one totally counts!'],
  ending: 'Musie tours every plaza on the planet, handing out hugs to anyone who stands still long enough. Global stress levels drop by forty percent. Nobody can explain it.',
  poses: {
    taunt: P({ lean: -4, head: -8, fa: [160, 172], ba: [24, 40], fl: [14, 0], bl: [-14, 0] }),
    win: P({ lean: -6, head: -10, fa: [165, 172], ba: [150, 170], fl: [14, 0], bl: [-14, 0] }),
  },
  drawHead(ctx, R, expr, t, opts) {
    // in-game the fur hood is part of the body silhouette; standalone heads (portraits) draw their own hood
    if (opts && opts.portrait) furEllipse(ctx, R * 0.1, R * 0.15, R * 1.25, R * 1.2, '#EFCFC6', 40, 0.05);
    const fx = R * 0.18, fy = R * 0.08;
    ctx.beginPath(); ctx.ellipse(fx, fy, R * 0.8, R * 0.62, 0, 0, Math.PI * 2);
    ctx.lineWidth = 4; ctx.strokeStyle = '#B88A80'; ctx.stroke();
    const g = ctx.createRadialGradient(fx + R * 0.1, fy - R * 0.2, 2, fx, fy, R * 0.8);
    g.addColorStop(0, '#FFF3EC'); g.addColorStop(1, '#F1D6CB');
    ctx.fillStyle = g; ctx.fill();
    // rosy cheeks
    ctx.fillStyle = 'rgba(255,135,150,0.55)';
    ctx.beginPath(); ctx.ellipse(fx - R * 0.5, fy + R * 0.2, R * 0.15, R * 0.1, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(fx + R * 0.52, fy + R * 0.2, R * 0.15, R * 0.1, 0, 0, Math.PI * 2); ctx.fill();
    // eyes: shiny black dots
    const ey = fy - R * 0.04, exs = [fx - R * 0.26, fx + R * 0.28];
    const blink = expr === 'normal' && (t % 200) < 7;
    ctx.strokeStyle = '#1A1014'; ctx.fillStyle = '#1A1014'; ctx.lineCap = 'round'; ctx.lineWidth = R * 0.08;
    exs.forEach((ex, i) => {
      ctx.beginPath();
      if (expr === 'ko') { const r = R * 0.09; ctx.moveTo(ex - r, ey - r); ctx.lineTo(ex + r, ey + r); ctx.moveTo(ex + r, ey - r); ctx.lineTo(ex - r, ey + r); ctx.stroke(); }
      else if (expr === 'hurt') { const r = R * 0.1, d = i ? -1 : 1; ctx.moveTo(ex - r * d, ey - r); ctx.lineTo(ex + r * d, ey); ctx.lineTo(ex - r * d, ey + r); ctx.stroke(); }
      else if (expr === 'happy') { ctx.arc(ex, ey + R * 0.05, R * 0.1, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
      else if (blink) { ctx.moveTo(ex - R * 0.09, ey); ctx.lineTo(ex + R * 0.09, ey); ctx.stroke(); }
      else {
        circle(ctx, ex, ey, R * 0.1); ctx.fill();
        ctx.fillStyle = '#fff'; circle(ctx, ex + R * 0.03, ey - R * 0.035, R * 0.035); ctx.fill(); ctx.fillStyle = '#1A1014';
        if (expr === 'angry' || expr === 'strain') { ctx.lineWidth = R * 0.06; ctx.beginPath(); ctx.moveTo(ex - R * 0.12, ey - R * (i ? 0.16 : 0.22)); ctx.lineTo(ex + R * 0.12, ey - R * (i ? 0.22 : 0.16)); ctx.stroke(); ctx.lineWidth = R * 0.08; }
      }
    });
    // tiny smile
    ctx.lineWidth = R * 0.06; ctx.beginPath();
    if (expr === 'hurt' || expr === 'ko') { ctx.ellipse(fx + R * 0.02, fy + R * 0.26, R * 0.06, R * 0.07, 0, 0, Math.PI * 2); ctx.fill(); }
    else if (expr === 'angry' || expr === 'strain') { ctx.moveTo(fx - R * 0.1, fy + R * 0.28); ctx.lineTo(fx + R * 0.12, fy + R * 0.26); ctx.stroke(); }
    else { ctx.arc(fx + R * 0.02, fy + R * 0.14, R * 0.13, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke(); }
  },
  drawFront(ctx, rig) {
    // fluffy pompom tail on the backside
    const s = rig.s, h = rig.L.torso, rx = (104 * s) / 2;
    ctx.save(); ctx.rotate(rig.torsoAng); ctx.scale(rig.face, 1);
    furEllipse(ctx, -rx * 0.98, -h * 0.2, 11 * s, 10 * s, '#F6DCD4', 14, 0.12);
    ctx.restore();
  },
  drawChest(ctx, s, h, ws) {
    // soft fur texture strokes
    ctx.strokeStyle = 'rgba(160,110,100,0.35)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    for (let i = 0; i < 9; i++) {
      const x = -ws * 0.32 + (i % 3) * ws * 0.3 + (i * 7 % 5), y = -h * (0.25 + Math.floor(i / 3) * 0.22);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 3 * s, y + 6 * s); ctx.stroke();
    }
  },
  specials: {
    qcf: { name: 'Fluff Puff', kind: 'proj', proj: 'puff', speed: [4.5, 6.5], dmg: 82, hits: 1, y: -105, pose: 'fireball' },
    dp: { name: 'Boing Bounce', kind: 'rise', dmg: [100, 122], vy: [-12, -14.5], vx: [1.8, 2.6], hits: [1, 2], fx: '#FFC2D1' },
    qcb: { name: 'Bum Bomb', kind: 'dive', dmg: [80, 96], vx: [5, 6.5], vy: [-9, -11], turn: true },
    super: { name: 'Bum Rush', kind: 'rushsuper', dmg: 330, fx: '#FFB3C7', turn: true },
  },
});


const PLAYABLE = () => ROSTER;

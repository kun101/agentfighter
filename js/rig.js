'use strict';
// ---------- Skeletal pose system & procedural fighter renderer ----------
// Angles in degrees. Limbs: [upper, lower], measured from straight DOWN, positive = toward facing direction.
// lean: torso lean forward (deg). head: extra head tilt. rot: whole body rotation about hip. fit: snap lowest point to feet line.
const BASE_POSE = { lean: 8, head: -4, fa: [35, 150], ba: [15, 160], fl: [24, -2], bl: [-18, -14], rot: 0, fit: 1, dy: 0, dx: 0, hipH: 0 };
function P(o) { return Object.assign({}, BASE_POSE, o); }
function lerpPose(a, b, t) {
  const o = {};
  for (const k in a) {
    const va = a[k], vb = b[k] == null ? va : b[k];
    if (Array.isArray(va)) o[k] = [va[0] + (vb[0] - va[0]) * t, va[1] + (vb[1] - va[1]) * t];
    else o[k] = va + (vb - va) * t;
  }
  return o;
}

const POSES = {
  stance: P({}),
  crouch: P({ lean: 22, head: -10, fa: [55, 160], ba: [35, 165], fl: [82, -8], bl: [25, -95] }),
  jump: P({ lean: 6, fa: [60, 150], ba: [40, 165], fl: [75, -25], bl: [45, -55], fit: 0 }),
  jumpUp: P({ lean: 4, fa: [30, 170], ba: [10, 170], fl: [40, -10], bl: [-10, -40], fit: 0 }),
  tuck: P({ lean: 30, head: 10, fa: [80, 170], ba: [70, 170], fl: [100, -20], bl: [85, -35], fit: 0 }),
  land: P({ lean: 18, head: -6, fa: [50, 155], ba: [30, 160], fl: [55, -10], bl: [5, -60] }),
  dash: P({ lean: 26, head: -14, fa: [20, 120], ba: [-40, 60], fl: [55, 10], bl: [-45, -30] }),
  backdash: P({ lean: -14, head: 6, fa: [50, 150], ba: [30, 160], fl: [30, 5], bl: [-10, -50] }),
  block: P({ lean: -6, head: 8, fa: [70, 170], ba: [55, 175], fl: [26, 0], bl: [-24, -16] }),
  cblock: P({ lean: 14, head: 0, fa: [80, 175], ba: [65, 178], fl: [82, -8], bl: [25, -95] }),
  hitHigh: P({ lean: -22, head: -25, fa: [10, 60], ba: [-20, 40], fl: [16, 2], bl: [-30, -20] }),
  hitLow: P({ lean: 38, head: 22, fa: [20, 30], ba: [5, 20], fl: [20, 8], bl: [-24, -20] }),
  hitCrouch: P({ lean: 8, head: -20, fa: [20, 70], ba: [0, 50], fl: [80, -6], bl: [22, -95] }),
  juggle: P({ lean: -40, head: -30, fa: [140, 170], ba: [120, 160], fl: [40, 10], bl: [10, -30], fit: 0 }),
  down: P({ lean: 0, head: 6, fa: [140, 160], ba: [160, 150], fl: [12, 0], bl: [-8, -20], rot: -90, fit: 1 }),
  getup: P({ lean: 30, head: 0, fa: [60, 140], ba: [10, 30], fl: [75, -10], bl: [30, -90] }),
  win: P({ lean: -4, head: -12, fa: [175, 175], ba: [20, 150], fl: [18, 0], bl: [-16, -4] }),
  win2: P({ lean: 0, head: -8, fa: [80, 160], ba: [70, 165], fl: [14, 0], bl: [-14, 0] }),
  taunt: P({ lean: 2, head: -6, fa: [100, 30], ba: [-30, 0], fl: [16, 0], bl: [-14, 0] }),
  lose: P({ lean: 34, head: 26, fa: [-5, -5], ba: [-10, -10], fl: [10, -5], bl: [-8, -14] }),
  dizzy: P({ lean: 20, head: 20, fa: [30, 20], ba: [10, 10], fl: [20, 0], bl: [-20, -10] }),
  // --- grounded normals: [windup, strike]
  jab: [P({ lean: 10, fa: [45, 165] }), P({ lean: 14, head: -6, fa: [88, 90], ba: [10, 165], fl: [28, 0], bl: [-22, -14] })],
  straight: [P({ lean: 2, ba: [-25, 150], fa: [45, 160] }), P({ lean: 24, head: -10, ba: [92, 92], fa: [20, 150], fl: [40, 6], bl: [-34, -26] })],
  lkick: [P({ lean: 0, fl: [70, -20], fa: [50, 160] }), P({ lean: -8, head: -2, fl: [88, 92], bl: [-6, -6], fa: [40, 150], ba: [-10, 120] })],
  hkick: [P({ lean: -6, fl: [95, 0], fa: [60, 160] }), P({ lean: -26, head: 10, fl: [125, 122], bl: [-14, -8], fa: [40, 120], ba: [-40, 10] })],
  cjab: [P({ lean: 22, head: -10, fa: [55, 165], ba: [35, 165], fl: [82, -8], bl: [25, -95] }), P({ lean: 26, head: -14, fa: [90, 90], ba: [30, 165], fl: [82, -8], bl: [25, -95] })],
  cupper: [P({ lean: 24, head: -6, ba: [-10, 40], fa: [50, 160], fl: [82, -8], bl: [25, -95] }), P({ lean: -2, head: -28, ba: [150, 166], fa: [40, 150], fl: [60, -10], bl: [10, -70] })],
  cshort: [P({ lean: 20, head: -8, fa: [55, 160], ba: [35, 165], fl: [60, -30], bl: [25, -95] }), P({ lean: 10, head: -12, fa: [55, 160], ba: [30, 165], fl: [72, 78], bl: [25, -100] })],
  sweep: [P({ lean: 30, head: -8, fa: [60, 40], ba: [40, 30], fl: [70, -40], bl: [30, -95] }), P({ lean: 36, head: -16, fa: [70, 20], ba: [50, 10], fl: [82, 86], bl: [32, -100] })],
  ajab: [P({ lean: 10, fa: [50, 160], fl: [70, -30], bl: [40, -60], fit: 0 }), P({ lean: 16, fa: [100, 100], ba: [30, 160], fl: [70, -30], bl: [40, -60], fit: 0 })],
  astraight: [P({ lean: 0, ba: [-20, 150], fa: [60, 160], fl: [70, -30], bl: [40, -60], fit: 0 }), P({ lean: 28, head: -6, ba: [110, 110], fa: [30, 160], fl: [60, -20], bl: [30, -60], fit: 0 })],
  akick: [P({ lean: 6, fl: [80, -30], bl: [40, -60], fit: 0 }), P({ lean: 0, fl: [80, 80], bl: [50, -50], fa: [50, 160], fit: 0 })],
  ahkick: [P({ lean: -4, fl: [70, -40], bl: [30, -60], fit: 0 }), P({ lean: -14, head: 6, fl: [100, 100], bl: [-20, -70], fa: [40, 120], ba: [-20, 20], fit: 0 })],
  // --- specials
  fireball: [P({ lean: -8, head: 4, fa: [-30, 40], ba: [-40, 30], fl: [30, 4], bl: [-28, -20] }), P({ lean: 16, head: -8, fa: [92, 90], ba: [86, 86], fl: [40, 8], bl: [-38, -28] })],
  toss: [P({ lean: -12, head: 6, fa: [-60, -10], ba: [40, 150], fl: [30, 4], bl: [-28, -20] }), P({ lean: 22, head: -10, fa: [110, 100], ba: [10, 150], fl: [40, 8], bl: [-38, -28] })],
  upper: [P({ lean: 30, head: -10, fa: [10, 40], ba: [30, 150], fl: [70, -10], bl: [10, -80] }), P({ lean: -4, head: -30, fa: [152, 168], ba: [20, 60], fl: [30, -5], bl: [-20, -80], fit: 0 })],
  rushpunch: [P({ lean: 4, fa: [-30, 120], ba: [40, 150], fl: [40, 0], bl: [-30, -30] }), P({ lean: 34, head: -16, fa: [95, 92], ba: [-30, 60], fl: [55, 10], bl: [-55, -40] })],
  spinkick: [P({ lean: 0, fl: [80, -10], bl: [-10, -30], fa: [60, 150], ba: [50, 150], fit: 0 }), P({ lean: -4, head: 0, fl: [92, 92], bl: [-10, -40], fa: [70, 140], ba: [40, 150], fit: 0 })],
  slide: [P({ lean: 10, fl: [60, -10], bl: [0, -80] }), P({ lean: -40, head: 20, fl: [78, 80], bl: [50, -40], fa: [-30, -20], ba: [-50, -40], rot: -10 })],
  ball: [P({ lean: 30, head: 10, fa: [80, 170], ba: [70, 170], fl: [100, -20], bl: [85, -35], fit: 0 }), P({ lean: 40, head: 16, fa: [90, 175], ba: [80, 175], fl: [110, -30], bl: [95, -40], fit: 0 })],
  dive: [P({ lean: 10, fa: [60, 150], fl: [75, -25], bl: [45, -55], fit: 0 }), P({ lean: 34, head: -10, fa: [110, 100], ba: [80, 90], fl: [-20, -60], bl: [-30, -50], fit: 0 })],
  knee: [P({ lean: 10, fl: [80, -30], bl: [30, -40], fit: 0 }), P({ lean: 16, head: -8, fl: [110, -10], bl: [-30, -60], fa: [-30, 30], ba: [-40, 20], fit: 0 })],
  claw: [P({ lean: 20, head: -10, fa: [130, 120], ba: [50, 160], fl: [50, 5], bl: [-40, -30] }), P({ lean: 32, head: -16, fa: [70, 50], ba: [110, 110], fl: [55, 10], bl: [-50, -40] })],
  grab: [P({ lean: 10, fa: [70, 110], ba: [60, 120] }), P({ lean: 24, head: -10, fa: [95, 85], ba: [88, 80], fl: [40, 6], bl: [-34, -26] })],
  lift: P({ lean: -14, head: -16, fa: [175, 178], ba: [165, 172], fl: [20, 0], bl: [-20, -10] }),
  slam: P({ lean: 40, head: 10, fa: [100, 100], ba: [95, 95], fl: [50, 0], bl: [-40, -30] }),
  superPose: P({ lean: -10, head: -16, fa: [150, 175], ba: [-40, 20], fl: [36, 0], bl: [-36, -20] }),
  rainPose: P({ lean: -14, head: -24, fa: [172, 178], ba: [160, 175], fl: [26, 0], bl: [-26, -10] }),
  beamPose: P({ lean: 14, head: -6, fa: [95, 92], ba: [88, 88], fl: [48, 8], bl: [-44, -30] }),
};

function walkCycle(def) { const r = (def && def.walk && def.walk.rate) || 1; return Math.max(8, Math.round(2 * Math.PI / (0.2 * r) / 2) * 2); }
function idleCycle(def) { const r = (def && def.idle && def.idle.rate) || 0.08; return Math.max(16, Math.round(2 * Math.PI / r / 4) * 4); }
// a fighter's own version of a pose (from its fighting style), falling back to the shared library
function poseOf(def, name) { return (def && def.poses && def.poses[name]) || POSES[name]; }

// walking cycle generated procedurally around the fighter's own stance
function walkPose(t, dir, speed, def) {
  const W = (def && def.walk) || {};
  // sprite-style: a looping cycle of a whole number of frames, advancing every 2 frames
  const N = walkCycle(def);
  t = ((Math.floor(t / 2) * 2) % N + N) % N;
  const p = (t / N) * Math.PI * 2 * (dir || 1);
  const s = Math.sin(p), c = Math.cos(p);
  const b = poseOf(def, 'stance'), A = W.amp == null ? 22 : W.amp, lift = W.lift == null ? 26 : W.lift;
  return P({
    lean: b.lean + 1 + Math.sin(p * 2) * (W.sway == null ? 1.5 : W.sway), head: b.head,
    fa: [b.fa[0] + c * 6, b.fa[1]], ba: [b.ba[0] - c * 6, b.ba[1]],
    fl: [b.fl[0] - 10 + s * A, b.fl[1] - 4 + s * A - lift * Math.max(0, Math.sin(p + 1.7))],
    bl: [b.bl[0] + 14 - s * A, b.bl[1] - s * A - lift * Math.max(0, Math.sin(p + 1.7 + Math.PI))],
    dy: (b.dy || 0) + (W.bob ? Math.round(Math.abs(Math.sin(p)) * -W.bob / 2) * 2 : 0),
  });
}
function idlePose(t, def) {
  const I = (def && def.idle) || {};
  // sprite-style: idle loop of a whole number of frames, advancing every 4 frames
  const N = idleCycle(def);
  t = ((Math.floor(t / 4) * 4) % N + N) % N;
  const b = Math.sin((t / N) * Math.PI * 2);
  const base = poseOf(def, 'stance');
  return P(Object.assign({}, base, {
    lean: base.lean + b * 1.6, head: base.head - b * 1.5,
    fa: [base.fa[0] + b * 4, base.fa[1] - b * 3], ba: [base.ba[0] + b * 3, base.ba[1] - b * 4],
    fl: [base.fl[0] + b * 1.5, base.fl[1] - b * 1.5], bl: [base.bl[0] - b * 1, base.bl[1] - b * 2],
    dy: (base.dy || 0) + (I.bob ? Math.round(b * I.bob / 2) * 2 : 0),
  }));
}

// ---------- Renderer ----------
function seg(ctx, a, b, w, col) {
  ctx.strokeStyle = col; ctx.lineWidth = w;
  ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
}
function computeRig(def, pose, face) {
  const s = def.scale;
  const L = { torso: 56 * s * (def.torsoLen || 1), ua: 30 * s * (def.armLen || 1), la: 30 * s * (def.armLen || 1), ul: 44 * s * (def.legLen || 1), ll: 44 * s * (def.legLen || 1), hr: def.headR * s };
  const rot = (pose.rot || 0) * D2R * face;
  const cr = Math.cos(rot), sr = Math.sin(rot);
  const R = p => ({ x: p.x * cr - p.y * sr, y: p.x * sr + p.y * cr });
  const lean = pose.lean * D2R;
  const dir = { x: Math.sin(lean) * face, y: -Math.cos(lean) };
  const neck = { x: dir.x * L.torso, y: dir.y * L.torso };
  const sd = def.shoulderDrop != null ? L.torso * def.shoulderDrop : 9 * s;
  const shoulder = { x: neck.x - dir.x * sd, y: neck.y - dir.y * sd };
  const hl = (lean + pose.head * D2R);
  const hd = L.hr * (0.92 - (def.headSink || 0));
  const headC = { x: neck.x + Math.sin(hl) * face * hd, y: neck.y - Math.cos(hl) * hd };
  function limb(o, a, l1, l2) {
    const a1 = a[0] * D2R, a2 = a[1] * D2R;
    const j = { x: o.x + Math.sin(a1) * face * l1, y: o.y + Math.cos(a1) * l1 };
    const e = { x: j.x + Math.sin(a2) * face * l2, y: j.y + Math.cos(a2) * l2 };
    return [o, j, e];
  }
  const sp = def.shoulderSpread || 1, hp = def.hipSpread || 1;
  const fsh = { x: shoulder.x + 3 * s * face * sp, y: shoulder.y }, bsh = { x: shoulder.x - 5 * s * face * sp, y: shoulder.y + 1 };
  const fhip = { x: 4 * s * face * hp, y: 2 }, bhip = { x: -5 * s * face * hp, y: 0 };
  const FA = limb(fsh, pose.fa, L.ua, L.la), BA = limb(bsh, pose.ba, L.ua, L.la);
  const FL = limb(fhip, pose.fl, L.ul, L.ll), BL = limb(bhip, pose.bl, L.ul, L.ll);
  const all = [neck, shoulder, headC, ...FA, ...BA, ...FL, ...BL];
  const rig = { def, L, s, face, neck: R(neck), shoulder: R(shoulder), headC: R(headC), FA: FA.map(R), BA: BA.map(R), FL: FL.map(R), BL: BL.map(R),
    torsoAng: (pose.lean + (pose.rot || 0)) * D2R * face, headAng: (pose.lean + pose.head + (pose.rot || 0)) * D2R * face, legA: [pose.fl[1], pose.bl[1]], rot: (pose.rot || 0) };
  // lowest point for ground fitting
  let maxY = -1e9;
  const foot = 7 * s;
  for (const p of [rig.FL[2], rig.BL[2]]) maxY = Math.max(maxY, p.y + foot * (def.footSize || 1));
  for (const p of [rig.FL[1], rig.BL[1]]) maxY = Math.max(maxY, p.y + 8 * s);
  for (const p of [rig.FA[2], rig.BA[2], rig.FA[1], rig.BA[1]]) maxY = Math.max(maxY, p.y + 6 * s);
  maxY = Math.max(maxY, rig.headC.y + L.hr * 0.9, rig.neck.y + 10 * s, (def.bodyBottom || 10) * s);
  if (def.torsoShape === 'ball') {
    // the whole body is one ball centred ballY up the spine: keep it above the ground too
    const bc = R({ x: dir.x * def.ballY * s, y: dir.y * def.ballY * s });
    maxY = Math.max(maxY, bc.y + def.ballR * s + 2.5);
  }
  rig.maxY = maxY;
  void all;
  return rig;
}

// ---------- Anime cel-shading toolkit ----------
// Hard-edged, hue-shifted shadows (cool purple for light colours, warm for yellows), a thin rim light on the
// shadow side, and clean ink outlines. The key light comes from above and in front of the fighter.
const _toneCache = new Map();
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  let h = 0, s = 0;
  if (mx !== mn) {
    const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60;
  }
  return [h, s, l];
}
function hslStr(h, s, l) {
  h = ((h % 360) + 360) % 360; s = clamp(s, 0, 1); l = clamp(l, 0, 1);
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  const hx = v => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return '#' + hx(r) + hx(g) + hx(b);
}
function parseCol(c) {
  if (c[0] === '#') return hexToRgb(c);
  const m = c.match(/[0-9.]+/g);
  return m && m.length >= 3 ? [+m[0], +m[1], +m[2]] : [128, 128, 128];
}
// shadow tone: darker, slightly more saturated, hue pulled toward violet (or toward orange for yellows)
function toneDark(hex, amt = 1) {
  const k = hex + '|d' + amt;
  let v = _toneCache.get(k);
  if (v) return v;
  let [h, s, l] = rgbToHsl(...parseCol(hex));
  const target = h > 20 && h < 75 ? 18 : 262;
  let dh = target - h; if (dh > 180) dh -= 360; if (dh < -180) dh += 360;
  if (s < 0.12) { h = 258; s = 0.22; } else { h += clamp(dh, -22, 22) * amt; s = Math.min(1, s + 0.08 * amt); }
  l = l * (1 - 0.3 * amt) - 0.04 * amt;
  v = hslStr(h, s, Math.max(0.05, l));
  _toneCache.set(k, v);
  return v;
}
function toneLight(hex, amt = 1) {
  const k = hex + '|l' + amt;
  let v = _toneCache.get(k);
  if (v) return v;
  let [h, s, l] = rgbToHsl(...parseCol(hex));
  l = l + (1 - l) * 0.35 * amt;
  v = hslStr(h, s, l);
  _toneCache.set(k, v);
  return v;
}
// the key light direction expressed in the current local coordinate system
const LIGHT = { x: 0.55, y: -0.84, rim: 'rgba(255,240,220,0.75)' };
function localLight(ctx) {
  const m = (ctx.getTransform && ctx.getTransform()) || { a: 1, b: 0, c: 0, d: 1 }, det = m.a * m.d - m.b * m.c || 1;
  const wx = LIGHT.x * (LIGHT.face || 1), wy = LIGHT.y;
  let x = (m.d * wx - m.c * wy) / det, y = (-m.b * wx + m.a * wy) / det;
  const n = Math.hypot(x, y) || 1;
  return { x: x / n, y: y / n };
}
// fill a path with ink outline + hard cel shadow + rim light. path(ctx) must begin its own path.
// o: { lw: outline width, k: shadow offset (local units), dark: shadow colour, rim: rim colour|false, noOutline }
function cel(ctx, path, base, o = {}) {
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  path(ctx);
  if (!o.noOutline) { ctx.lineWidth = o.lw || 4; ctx.strokeStyle = OUT; ctx.stroke(); }
  ctx.fillStyle = base; ctx.fill();
  const k = o.k == null ? 6 : o.k;
  if (k <= 0) return;
  const L = localLight(ctx);
  ctx.save();
  path(ctx); ctx.clip();
  ctx.fillStyle = o.dark || toneDark(base); path(ctx); ctx.fill();
  ctx.translate(L.x * k, L.y * k);
  ctx.fillStyle = base; path(ctx); ctx.fill();
  if (o.rim !== false) {
    ctx.translate(-L.x * k * 1.25, -L.y * k * 1.25);
    ctx.strokeStyle = o.rim || LIGHT.rim; ctx.lineWidth = o.rimW || 1.6; path(ctx); ctx.stroke();
  }
  ctx.restore();
}
// tapered capsule from a (radius ra) to b (radius rb)
function taperPath(ctx, a, b, ra, rb) {
  const dx = b.x - a.x, dy = b.y - a.y, th = Math.atan2(dy, dx);
  const nx = -Math.sin(th), ny = Math.cos(th);
  ctx.moveTo(a.x + nx * ra, a.y + ny * ra);
  ctx.lineTo(b.x + nx * rb, b.y + ny * rb);
  ctx.arc(b.x, b.y, rb, th + Math.PI / 2, th - Math.PI / 2, true);
  ctx.lineTo(a.x - nx * ra, a.y - ny * ra);
  ctx.arc(a.x, a.y, ra, th - Math.PI / 2, th - Math.PI * 1.5, true);
  ctx.closePath();
}
function drawLimb(ctx, pts, w1, w2, c1, c2, endR, endCol, kind, rig, legAng, back) {
  const [a, j, e] = pts, arm = kind === 'arm';
  // segment radii: thighs/upper arms taper into the joint, forearms/shins taper to the wrist/ankle
  const r1a = w1 / 2, r1b = w1 / 2 * (arm ? 0.86 : 0.8), r2a = w2 / 2 * (arm ? 1.0 : 1.04), r2b = w2 / 2 * (arm ? 0.78 : 0.72);
  const up = c => { c.beginPath(); taperPath(c, a, j, r1a, r1b); };
  const lo = c => { c.beginPath(); taperPath(c, j, e, r2a, r2b); };
  // one combined ink silhouette, then the two segments shaded separately
  ctx.lineJoin = 'round';
  ctx.beginPath(); taperPath(ctx, a, j, r1a, r1b); taperPath(ctx, j, e, r2a, r2b);
  ctx.lineWidth = 7; ctx.strokeStyle = OUT; ctx.stroke();
  const k = Math.max(2.5, w1 * 0.24);
  cel(ctx, up, c1, { noOutline: true, k });
  cel(ctx, lo, c2, { noOutline: true, k: Math.max(2.5, w2 * 0.24) });
  if (arm) drawHand(ctx, rig, j, e, endR, endCol, back);
  else drawFoot(ctx, e, legAng, rig, endR, endCol, 0);
}
// hands: 'fist' (default), 'mitt' (boxing glove), 'open' (open palm; balls into a fist when attacking), 'ball' (paw)
function drawHand(ctx, rig, j, e, r, col, back) {
  const def = rig.def, expr = rig.expr || 'normal';
  let style = def.handStyle || 'fist';
  if (style === 'open' && (expr === 'angry' || expr === 'strain')) style = 'fist';
  if (style === 'ball') {
    cel(ctx, c => { c.beginPath(); c.arc(e.x, e.y, r, 0, Math.PI * 2); }, col, { k: r * 0.35, lw: 4.5 });
    return;
  }
  const d = Math.atan2(e.y - j.y, e.x - j.x);
  ctx.save();
  ctx.translate(e.x, e.y); ctx.rotate(d); ctx.scale(1, rig.face);
  const k = r * 0.32;
  if (style === 'mitt') {
    // big padded boxing glove: round fist pad, thumb bulge on top, contrasting cuff at the wrist
    cel(ctx, c => { c.beginPath(); c.ellipse(-r * 0.75, 0, r * 0.55, r * 0.8, 0, 0, Math.PI * 2); }, def.cuffCol || '#F4F2FB', { k: r * 0.2, lw: 4 });
    cel(ctx, c => { c.beginPath(); c.ellipse(r * 0.25, r * 0.05, r * 1.12, r * 1.02, 0, 0, Math.PI * 2); }, col, { k, lw: 4.5 });
    cel(ctx, c => { c.beginPath(); c.ellipse(-r * 0.05, -r * 0.72, r * 0.62, r * 0.38, -0.25, 0, Math.PI * 2); }, col, { k: r * 0.15, lw: 3.5 });
    ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.beginPath(); ctx.ellipse(r * 0.35, -r * 0.45, r * 0.3, r * 0.16, -0.4, 0, Math.PI * 2); ctx.fill();
    if (def.fingerCol) {
      // curled fingers poking out of the glove's front, knuckles forward
      const fc = back ? toneDark(def.fingerCol, 0.4) : def.fingerCol;
      for (let i = 0; i < 3; i++) cel(ctx, c => { c.beginPath(); c.ellipse(r * 0.95, -r * 0.3 + i * r * 0.36, r * 0.26, r * 0.19, 0, 0, Math.PI * 2); }, fc, { k: r * 0.08, lw: 3 });
    }
  } else if (style === 'open') {
    // open palm with four fingers fanned forward and the thumb up
    const fingers = c => {
      c.beginPath();
      for (let i = 0; i < 4; i++) {
        const fy = -r * 0.42 + i * r * 0.3, fl = r * (1.05 - Math.abs(i - 1.2) * 0.12);
        taperPath(c, { x: r * 0.3, y: fy }, { x: r * 0.3 + fl, y: fy - r * 0.18 + i * r * 0.08 }, r * 0.17, r * 0.14);
      }
    };
    cel(ctx, fingers, col, { k: r * 0.12, lw: 3.5 });
    cel(ctx, c => { c.beginPath(); c.ellipse(r * 0.05, 0, r * 0.62, r * 0.66, 0, 0, Math.PI * 2); }, col, { k: r * 0.25, lw: 4 });
    cel(ctx, c => { c.beginPath(); taperPath(c, { x: -r * 0.05, y: -r * 0.45 }, { x: r * 0.55, y: -r * 0.95 }, r * 0.2, r * 0.15); }, col, { k: r * 0.1, lw: 3.5 });
  } else {
    // closed cartoon fist: a round palm, four curled fingers bunched at the front, thumb across the top
    if (def.gloveCuff) cel(ctx, c => { c.beginPath(); c.ellipse(-r * 0.78, 0, r * 0.38, r * 0.72, 0, 0, Math.PI * 2); }, col, { k: r * 0.18, lw: 4 });
    cel(ctx, c => { c.beginPath(); c.ellipse(0, 0, r * 0.92, r * 0.84, 0, 0, Math.PI * 2); }, col, { k, lw: 4.5 });
    const fcol = def.fingerCol && def.handStyle !== 'mitt' ? (back ? toneDark(def.fingerCol, 0.4) : def.fingerCol) : col;
    for (let i = 0; i < 4; i++) cel(ctx, c => { c.beginPath(); c.ellipse(r * 0.66, -r * 0.42 + i * r * 0.3, r * 0.3, r * 0.2, 0.15, 0, Math.PI * 2); }, fcol, { k: r * 0.1, lw: 3 });
    cel(ctx, c => { c.beginPath(); taperPath(c, { x: -r * 0.35, y: -r * 0.52 }, { x: r * 0.4, y: -r * 0.42 }, r * 0.28, r * 0.22); }, col, { k: r * 0.1, lw: 3.5 });
  }
  ctx.restore();
}
function drawFoot(ctx, e, legAng, rig, r, col, grow) {
  // foot points forward perpendicular to shin
  const a = (legAng + (rig.rot || 0)) * D2R;
  const fx = Math.cos(a) * rig.face, fy = -Math.sin(a);
  ctx.save();
  ctx.translate(e.x + fx * r * 0.7, e.y + fy * r * 0.7 + 1);
  ctx.scale(rig.face, 1); ctx.rotate(-a);
  if (col === OUT && rig.def.footStyle !== 'ball') { ctx.restore(); return; }
  if (rig.def.footStyle === 'toes') {
    // bare cartoon foot: a rounded pad with toe creases at the front
    const foot = c => {
      c.beginPath();
      c.moveTo(-r * 1.05, r * 0.75);
      c.quadraticCurveTo(-r * 1.5, r * 0.4, -r * 1.05, -r * 0.55);
      c.quadraticCurveTo(-r * 0.4, -r * 1.05, r * 0.5, -r * 0.55);
      c.quadraticCurveTo(r * 1.5, -r * 0.2, r * 1.6, r * 0.35);
      c.quadraticCurveTo(r * 1.62, r * 0.82, r * 1.05, r * 0.82);
      c.lineTo(-r * 0.8, r * 0.82);
      c.closePath();
    };
    cel(ctx, foot, col, { k: r * 0.3, lw: 4.5 });
    ctx.strokeStyle = OUT; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
    for (const x of [0.75, 1.15]) { ctx.beginPath(); ctx.moveTo(r * x, r * 0.82); ctx.quadraticCurveTo(r * (x + 0.05), r * 0.45, r * (x - 0.1), r * 0.25); ctx.stroke(); }
  } else if (rig.def.footStyle === 'ball' || col === OUT) {
    ctx.beginPath(); ctx.ellipse(0, 0, r * 1.45 + grow, r * 0.85 + grow, 0, 0, Math.PI * 2);
    ctx.fillStyle = col; ctx.fill();
  } else {
    // shoe: rounded heel, raised instep, rounded toe, flat sole
    const shoe = c => {
      c.beginPath();
      c.moveTo(-r * 1.0, r * 0.7);
      c.quadraticCurveTo(-r * 1.45, r * 0.6, -r * 1.25, -r * 0.1);
      c.quadraticCurveTo(-r * 1.1, -r * 0.85, -r * 0.4, -r * 0.85);
      c.quadraticCurveTo(r * 0.5, -r * 0.75, r * 1.25, -r * 0.15);
      c.quadraticCurveTo(r * 1.75, r * 0.2, r * 1.45, r * 0.62);
      c.quadraticCurveTo(r * 1.35, r * 0.82, r * 0.9, r * 0.82);
      c.lineTo(-r * 0.75, r * 0.82);
      c.closePath();
    };
    cel(ctx, shoe, col, { k: r * 0.3, lw: 4.5 });
    ctx.fillStyle = toneDark(col, 1.3);
    ctx.fillRect(-r * 1.1, r * 0.55, r * 2.45, r * 0.22);
  }
  ctx.restore();
}

// Draw a fighter (or any object with x, y, drawFacing) with given pose.
// opts: {expr, t, flash, alpha, shadow:true, scale}
function drawFighterVector(ctx, def, x, y, face, pose, opts = {}) {
  const rig = computeRig(def, pose, face);
  const s = rig.s;
  let ox = x + (pose.dx || 0) * s * face, oy;
  if (pose.fit) oy = y - rig.maxY + (pose.dy || 0) - (def.hover || 0) * s;
  else oy = y - (rig.L.ul + rig.L.ll) * 0.88 + (pose.dy || 0);
  const t = opts.t || 0;
  const C = def.colors;
  rig.expr = opts.expr || 'normal'; LIGHT.face = face; LIGHT.rim = def.rim || 'rgba(255,240,220,0.75)';
  ctx.save();
  if (opts.alpha != null) ctx.globalAlpha = opts.alpha;
  if (opts.shadow !== false) {
    const gy = opts.groundY != null ? opts.groundY : GROUND;
    const hgt = clamp((gy - y) / 260, 0, 1);
    ctx.fillStyle = `rgba(0,0,0,${0.35 * (1 - hgt * 0.6)})`;
    ctx.beginPath(); ctx.ellipse(x, opts.groundY || GROUND, 46 * s * (1 - hgt * 0.4), 9 * (1 - hgt * 0.4), 0, 0, Math.PI * 2); ctx.fill();
  }
  if (opts.flash && opts.flash > 0) ctx.filter = 'brightness(2.6) saturate(0.4)';
  if (opts.glow) { ctx.shadowColor = opts.glow; ctx.shadowBlur = 18; }
  ctx.translate(ox, oy);
  const dark = def.backShade != null ? def.backShade : -0.28;
  const aw = def.armW || def.limbW || 1, lwl = def.legW || def.limbW || 1;
  const hand = 7.5 * s * aw * (def.handSize || 1), foot = 7 * s * (def.footSize || 1);
  // creatures with their own anatomy  render their whole body themselves
  if (def.drawCustomBody) { def.drawCustomBody(ctx, rig, t, opts); ctx.restore(); return { rig, ox, oy }; }
  // back extras (scarf, tail, cape)
  if (def.drawBack) { ctx.save(); def.drawBack(ctx, rig, t, opts); ctx.restore(); }
  // back arm & back leg
  const bk = c => toneDark(c, dark < -0.2 ? 0.55 : 0.4);
  const NB = def.nearBack, nearArm = NB ? rig.BA : rig.FA, farArm = NB ? rig.FA : rig.BA;
  drawLimb(ctx, farArm, 14 * s * aw, 13 * s * aw, bk(C.sleeve), bk(C.arm), hand, bk(C.glove), 'arm', rig, 0, true);
  drawLimb(ctx, rig.BL, 20 * s * lwl, 16 * s * lwl, bk(C.pants), bk(C.shin || C.pants), foot, bk(C.shoe), 'leg', rig, rig.legA[1], true);
  drawLimb(ctx, rig.FL, 20 * s * lwl, 16 * s * lwl, C.pants, C.shin || C.pants, foot, C.shoe, 'leg', rig, rig.legA[0]);
  if (def.drawSkirt) { ctx.save(); def.drawSkirt(ctx, rig, t, opts); ctx.restore(); }
  // torso
  ctx.save();
  ctx.rotate(rig.torsoAng); ctx.scale(face, 1);
  drawTorso(ctx, def, rig, t, opts);
  ctx.restore();
  if (def.drawUpper) { ctx.save(); def.drawUpper(ctx, rig, t, opts); ctx.restore(); }
  // neck
  ctx.lineCap = 'round';
  if (!def.noNeck) { seg(ctx, rig.neck, rig.headC, 10 * s + 5, OUT); seg(ctx, rig.neck, rig.headC, 10 * s, C.neck || C.arm); }
  // head
  ctx.save();
  ctx.translate(rig.headC.x, rig.headC.y);
  ctx.rotate(rig.headAng); ctx.scale(face, 1);
  def.drawHead(ctx, rig.L.hr, opts.expr || 'normal', t, opts);
  ctx.restore();
  // front arm
  drawLimb(ctx, nearArm, 14 * s * aw, 13 * s * aw, C.sleeve, C.arm, hand, C.glove, 'arm', rig);
  if (def.drawFront) { ctx.save(); def.drawFront(ctx, rig, t, opts); ctx.restore(); }
  ctx.restore();
  return { rig, ox, oy };
}

function drawTorso(ctx, def, rig, t, opts) {
  const s = rig.s, h = rig.L.torso, C = def.colors;
  const ws = (def.chestW || 44) * s, wh = (def.hipW || 34) * s;
  // fully custom torso silhouette, drawn in torso space (hip at 0,0, +x = facing, neck at y = -h); limbs stay rigged
  if (def.drawBody) { def.drawBody(ctx, rig, t, opts); return; }
  if (def.torsoShape === 'ball') {
    // round mascot body: one smooth ball (radius ballR, centre ballY up the spine); drawChest paints the face and shading
    const b = { x: 2 * s, y: -def.ballY * s, r: def.ballR * s };
    circle(ctx, b.x, b.y, b.r + 2.5); ctx.fillStyle = OUT; ctx.fill();
    circle(ctx, b.x, b.y, b.r); ctx.fillStyle = C.shirt; ctx.fill();
    ctx.save(); ctx.clip();
    if (def.drawChest) def.drawChest(ctx, s, h, ws, wh, t, opts, b);
    ctx.restore();
    return;
  }
  ctx.beginPath();
  if (def.torsoShape === 'blob' || def.torsoShape === 'barrel') {
    // plush egg (fur-fringed, optionally with a hood as part of the same silhouette) or round wrestler barrel
    const fur = def.torsoShape === 'blob';
    const cy = -h * 0.45, rx = ws / 2, ry = h * (fur ? 0.66 : 0.6);
    const shapes = [[2 * s, cy, rx, ry, fur ? 46 : 32]];
    if (def.hood) shapes.push([2 * s, -h * def.hood.y, ws * def.hood.rx, ws * def.hood.ry, 36]);
    const path = (x0, y0, ex, ey, n) => {
      ctx.beginPath();
      for (let i = 0; i <= n; i++) {
        const a = i / n * Math.PI * 2;
        const bulge = !fur && Math.cos(a) > 0 ? 1 + Math.cos(a) * Math.max(0, Math.sin(a)) * 0.12 : 1;
        const r = (fur && i % 2 ? 1.05 : 1) * bulge;
        const px = Math.cos(a) * ex * r + x0, py = y0 + Math.sin(a) * ey * r * (Math.sin(a) > 0 ? 0.92 : 1);
        if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
      }
      ctx.closePath();
    };
    ctx.lineWidth = 5; ctx.strokeStyle = OUT; ctx.lineJoin = 'round';
    for (const sh of shapes) { path(...sh); ctx.stroke(); }
    ctx.fillStyle = C.shirt;
    for (const sh of shapes) { path(...sh); ctx.fill(); }
    ctx.save();
    ctx.beginPath();
    for (const [x0, y0, ex, ey] of shapes) ctx.ellipse(x0, y0, ex * 1.05, ey * 1.05, 0, 0, Math.PI * 2);
    ctx.clip();
    const dark = def.shadeDark || 'rgba(10,0,30,0.22)';
    ctx.fillStyle = dark; ctx.globalAlpha = 0.7; ctx.beginPath(); ctx.ellipse(-rx * 0.62, cy + ry * 0.15, rx * 0.55, ry * 1.2, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(255,250,240,0.22)'; ctx.beginPath(); ctx.ellipse(rx * 0.35, cy - ry * 0.25, rx * 0.35, ry * 0.5, 0, 0, Math.PI * 2); ctx.fill();
    if (def.drawChest) def.drawChest(ctx, s, h, ws, wh, t, opts);
    ctx.restore();
    if (C.belt) { ctx.fillStyle = C.belt; ctx.strokeStyle = OUT; ctx.lineWidth = 3; rrect(ctx, -wh / 2 - 2, -4 * s, wh + 4, 10 * s, 3); ctx.fill(); ctx.stroke(); }
    return;
  }
  const torsoPath = c => {
    c.beginPath();
    c.moveTo(-wh / 2, 6 * s);
    c.lineTo(wh / 2, 6 * s);
    c.quadraticCurveTo(wh / 2 + 4 * s, -h * 0.45, ws / 2 + 2 * s, -h * 0.72);
    c.quadraticCurveTo(ws / 2 + 2 * s, -h - 4 * s, ws / 2 - 10 * s, -h - 4 * s);
    c.lineTo(-ws / 2 + 8 * s, -h - 4 * s);
    c.quadraticCurveTo(-ws / 2 - 2 * s, -h - 2 * s, -ws / 2, -h * 0.65);
    c.quadraticCurveTo(-wh / 2 - 2 * s, -h * 0.3, -wh / 2, 6 * s);
    c.closePath();
  };
  cel(ctx, torsoPath, C.shirt, { lw: 5, k: ws * 0.3 });
  ctx.save(); torsoPath(ctx); ctx.clip();
  if (def.drawChest) def.drawChest(ctx, s, h, ws, wh, t, opts);
  ctx.restore();
  // belt
  if (C.belt) {
    ctx.fillStyle = C.belt; ctx.strokeStyle = OUT; ctx.lineWidth = 3;
    rrect(ctx, -wh / 2 - 2, -4 * s, wh + 4, 9 * s, 3); ctx.fill(); ctx.stroke();
  }
}

// ---------- Shared face helpers (heads are drawn facing right, centered at 0,0) ----------
function drawEyes(ctx, x, y, gap, r, expr, o = {}) {
  const col = o.col || '#fff', pupil = o.pupil || OUT, t = o.t || 0;
  const blink = expr === 'normal' && (t % 200) < 7;
  for (let i = 0; i < 2; i++) {
    const ex = x + (i === 0 ? -gap / 2 : gap / 2), sc = i === 0 ? 0.88 : 1;
    const rr = r * sc;
    ctx.save(); ctx.translate(ex, y);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (expr === 'ko') {
      ctx.strokeStyle = pupil; ctx.lineWidth = r * 0.45;
      ctx.beginPath(); ctx.moveTo(-rr * .7, -rr * .7); ctx.lineTo(rr * .7, rr * .7); ctx.moveTo(rr * .7, -rr * .7); ctx.lineTo(-rr * .7, rr * .7); ctx.stroke();
    } else if (expr === 'hurt') {
      ctx.strokeStyle = pupil; ctx.lineWidth = r * 0.45;
      const d = i === 0 ? 1 : -1;
      ctx.beginPath(); ctx.moveTo(-rr * .7 * d, -rr * .6); ctx.lineTo(rr * .6 * d, 0); ctx.lineTo(-rr * .7 * d, rr * .6); ctx.stroke();
    } else if (blink || expr === 'happy') {
      ctx.strokeStyle = pupil; ctx.lineWidth = r * 0.4;
      ctx.beginPath();
      if (expr === 'happy') ctx.arc(0, rr * .3, rr * .7, Math.PI * 1.15, Math.PI * 1.85);
      else { ctx.moveTo(-rr * .7, 0); ctx.lineTo(rr * .7, 0); }
      ctx.stroke();
    } else {
      ctx.fillStyle = OUT;
      ctx.beginPath(); ctx.ellipse(0, 0, rr * .78 + 2, rr + 2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.ellipse(0, 0, rr * .78, rr, 0, 0, Math.PI * 2); ctx.fill();
      if (!o.noPupil) {
        ctx.fillStyle = pupil;
        ctx.beginPath(); ctx.ellipse(rr * .25, rr * .05, rr * .45, rr * .6, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff';
        circle(ctx, rr * .38, -rr * .25, rr * .18); ctx.fill();
      }
      if (expr === 'angry' || expr === 'strain') {
        ctx.strokeStyle = o.brow || OUT; ctx.lineWidth = r * 0.42;
        ctx.beginPath();
        if (i === 0) { ctx.moveTo(-rr * .9, -rr * 1.25); ctx.lineTo(rr * .7, -rr * .8); }
        else { ctx.moveTo(-rr * .7, -rr * .8); ctx.lineTo(rr * .9, -rr * 1.3); }
        ctx.stroke();
      }
    }
    ctx.restore();
  }
}
function drawMouth(ctx, x, y, w, expr, col) {
  ctx.strokeStyle = col || OUT; ctx.lineWidth = Math.max(2, w * 0.22); ctx.lineCap = 'round';
  ctx.beginPath();
  if (expr === 'hurt' || expr === 'ko') { ctx.ellipse(x, y + w * .2, w * .35, w * .45, 0, 0, Math.PI * 2); ctx.fillStyle = col || OUT; ctx.fill(); return; }
  if (expr === 'angry' || expr === 'strain') { ctx.moveTo(x - w * .5, y + w * .2); ctx.lineTo(x + w * .5, y); }
  else if (expr === 'happy') { ctx.arc(x, y - w * .2, w * .55, 0.15 * Math.PI, 0.85 * Math.PI); ctx.fillStyle = col || OUT; ctx.fill(); return; }
  else ctx.arc(x, y - w * .3, w * .5, 0.2 * Math.PI, 0.8 * Math.PI);
  ctx.stroke();
}
function sphere(ctx, r, c1, c2, out = true) {
  if (out) { circle(ctx, 0, 0, r + 2.5); ctx.fillStyle = OUT; ctx.fill(); }
  const g = ctx.createRadialGradient(-r * .35, -r * .4, r * .1, 0, 0, r);
  g.addColorStop(0, c1); g.addColorStop(1, c2);
  circle(ctx, 0, 0, r); ctx.fillStyle = g; ctx.fill();
}

// ---------- Pixel-art sprite pipeline ----------
// Fighters are rendered every frame into a small sprite (1 sprite pixel = PX.P logical units, ~105px tall),
// then hardened into real pixel art: binary alpha (no AA fringe), 15-bit color palette, optional aura ring.
// Sprites are blitted with nearest-neighbour onto the same pixel grid as the world.
const PX = { P: 2, c: null, x: null };
function pixelMode() { return typeof Settings === 'undefined' || Settings.graphics !== 'hd'; }
function pxScratch(w, h) {
  if (!PX.c || PX.c.width < w || PX.c.height < h) {
    PX.c = makeCanvas(Math.max(w, PX.c ? PX.c.width : 0), Math.max(h, PX.c ? PX.c.height : 0));
    PX.x = PX.c.getContext('2d', { willReadFrequently: true });
  }
  return PX;
}
function hardenPixels(img, glow) {
  const d = img.data, w = img.width, h = img.height, n = w * h;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let i = 0; i < n * 4; i += 4) {
    if (d[i + 3] < 110) { d[i + 3] = 0; continue; }
    d[i + 3] = 255;
    const p = i >> 2, px = p % w, py = (p / w) | 0;
    if (px < x0) x0 = px; if (px > x1) x1 = px; if (py < y0) y0 = py; if (py > y1) y1 = py;
    // 12-bit color (4 bits per channel), like the CPS-1/CPS-2 arcade boards
    d[i] = (d[i] & 0xF0) * 17 >> 4; d[i + 1] = (d[i + 1] & 0xF0) * 17 >> 4; d[i + 2] = (d[i + 2] & 0xF0) * 17 >> 4;
  }
  if (glow) {
    const [gr, gg, gb] = hexToRgb(glow);
    const solid = new Uint8Array(n);
    for (let p = 0; p < n; p++) solid[p] = d[p * 4 + 3] === 255 ? 1 : 0;
    for (let ring = 0; ring < 2; ring++) {
      const add = [];
      for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
        const p = y * w + x;
        if (solid[p]) continue;
        if (solid[p - 1] || solid[p + 1] || solid[p - w] || solid[p + w]) add.push(p);
      }
      for (const p of add) { solid[p] = 1; const i = p * 4; d[i] = gr; d[i + 1] = gg; d[i + 2] = gb; d[i + 3] = ring ? 140 : 255; }
    }
    x0 = Math.max(0, x0 - 2); y0 = Math.max(0, y0 - 2); x1 = Math.min(w - 1, x1 + 2); y1 = Math.min(h - 1, y1 + 2);
  }
  return { x0, y0, x1, y1 };
}
// Render drawFn (logical coords around origin) as a hardened sprite. Returns the canvas region info.
// own: true = new dedicated canvas; an object {c, x} = reuse that cache slot's canvas; falsy = shared scratch
function renderSprite(left, top, wL, hL, drawFn, glow, own) {
  const P = PX.P, sw = Math.ceil(wL / P) + 4, sh = Math.ceil(hL / P) + 4;
  let c, s;
  if (own && typeof own === 'object') {
    if (!own.c || own.c.width !== sw || own.c.height !== sh) { own.c = makeCanvas(sw, sh); own.x = own.c.getContext('2d', { willReadFrequently: true }); }
    c = own.c; s = own.x; s.setTransform(1, 0, 0, 1, 0, 0); s.clearRect(0, 0, sw, sh);
  } else if (own) { c = makeCanvas(sw, sh); s = c.getContext('2d', { willReadFrequently: true }); }
  else { pxScratch(sw, sh); c = PX.c; s = PX.x; s.setTransform(1, 0, 0, 1, 0, 0); s.clearRect(0, 0, sw, sh); }
  s.save();
  s.setTransform(1 / P, 0, 0, 1 / P, 2 - left / P, 2 - top / P);
  drawFn(s);
  s.restore();
  const img = s.getImageData(0, 0, sw, sh);
  const bb = hardenPixels(img, glow) || { x0: 0, y0: 0, x1: sw - 1, y1: sh - 1 };
  s.putImageData(img, 0, 0);
  return { c, sw, sh, left: left - 2 * P, top: top - 2 * P, bb };
}
function blitSprite(ctx, spr, x, y, flip) {
  const P = PX.P;
  const sx = Math.round(x / P) * P, sy = Math.round(y / P) * P;
  const prev = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = false;
  if (flip) {
    // left-facing frames are the right-facing sprite mirrored about the fighter's origin
    ctx.save(); ctx.translate(sx, 0); ctx.scale(-1, 1);
    ctx.drawImage(spr.c, spr.sx || 0, spr.sy || 0, spr.sw, spr.sh, spr.left, sy + spr.top, spr.sw * P, spr.sh * P);
    ctx.restore();
  } else ctx.drawImage(spr.c, spr.sx || 0, spr.sy || 0, spr.sw, spr.sh, sx + spr.left, sy + spr.top, spr.sw * P, spr.sh * P);
  ctx.imageSmoothingEnabled = prev;
}
const FIGHTER_BOX = [-190, -300, 380, 440];
const HEAD_CACHE = new Map();
function fighterSprite(def, face, pose, opts, own) {
  const o = Object.assign({}, opts, { shadow: false, glow: null, alpha: null, holder: null, prev: null });
  return renderSprite(FIGHTER_BOX[0], FIGHTER_BOX[1], FIGHTER_BOX[2], FIGHTER_BOX[3],
    s => drawFighterVector(s, def, 0, 0, face, pose, o), opts.glow, own);
}
// ---- sprite atlas: poses snap to a fine grid, each distinct frame is rasterized once, cropped and reused
const SHEET = 1024, MAX_SHEETS = 16;
// shelf-pack sprite frames into a few large sheets per fighter (no per-frame canvas allocation)
function sheetAlloc(A, w, h) {
  let s = A.sheets[A.sheets.length - 1];
  if (s && s.x + w > SHEET) { s.x = 0; s.y += s.rowH + 1; s.rowH = 0; }
  if (!s || s.y + h > SHEET) {
    if (A.sheets.length >= MAX_SHEETS) { A.sheets.length = 0; A.map.clear(); }
    const c = makeCanvas(SHEET, SHEET);
    s = { c, ctx: c.getContext('2d'), x: 0, y: 0, rowH: 0 };
    A.sheets.push(s);
  }
  const slot = { c: s.c, ctx: s.ctx, x: s.x, y: s.y };
  s.x += w + 1; s.rowH = Math.max(s.rowH, h);
  return slot;
}
const qv = (v, s) => Math.round(v / s) * s;
function quantizePose(p) {
  return { lean: qv(p.lean, 2), head: qv(p.head, 3), fa: [qv(p.fa[0], 4), qv(p.fa[1], 4)], ba: [qv(p.ba[0], 4), qv(p.ba[1], 4)],
    fl: [qv(p.fl[0], 4), qv(p.fl[1], 4)], bl: [qv(p.bl[0], 4), qv(p.bl[1], 4)], rot: qv(p.rot || 0, 10), fit: p.fit ? 1 : 0, dy: qv(p.dy || 0, 2), dx: qv(p.dx || 0, 2), hipH: 0 };
}
function poseKey(q) { return q.lean + ',' + q.head + ',' + q.fa + ',' + q.ba + ',' + q.fl + ',' + q.bl + ',' + q.rot + ',' + q.fit + ',' + q.dy + ',' + q.dx; }
function atlasSprite(def, face, pose, opts) {
  const t = opts.t || 0, expr = opts.expr || 'normal';
  const blink = expr === 'normal' && (t % 200) < 7;
  const q = quantizePose(pose);
  const key = poseKey(q) + '|' + expr + '|' + (opts.flash > 0 ? 1 : 0) + '|' + (opts.glow || '') + '|' + (blink ? 1 : 0);
  const A = def._atlas || (def._atlas = { map: new Map(), sheets: [] });
  let spr = A.map.get(key);
  if (!spr) {
    // bake budget: at most a couple of new frames per screen frame; otherwise hold the previous sprite one frame
    if (Render.bakeBudget <= 0 && opts.prev) return opts.prev;
    Render.bakeBudget--;
    const tb = performance.now();
    const raw = fighterSprite(def, 1, q, Object.assign({}, opts, { t: blink ? 3 : 50 }), false);
    Render.bakeAvg = Render.bakeAvg * 0.9 + (performance.now() - tb) * 0.1;
    const bb = raw.bb, bw = bb.x1 - bb.x0 + 1, bh = bb.y1 - bb.y0 + 1;
    if (bw <= 0 || bh <= 0) spr = { c: makeCanvas(1, 1), sw: 1, sh: 1, left: 0, top: 0 };
    else {
      const slot = sheetAlloc(A, bw, bh);
      slot.ctx.drawImage(raw.c, bb.x0, bb.y0, bw, bh, slot.x, slot.y, bw, bh);
      spr = { c: slot.c, sx: slot.x, sy: slot.y, sw: bw, sh: bh, left: raw.left + bb.x0 * PX.P, top: raw.top + bb.y0 * PX.P };
    }
    A.map.set(key, spr);
    Render.misses = (Render.misses || 0) + 1;
  }
  return spr;
}
function drawFighterShadow(ctx, def, x, y, opts) {
  const s = def.scale, gy = opts.groundY != null ? opts.groundY : GROUND;
  const hgt = clamp((gy - y) / 260, 0, 1);
  ctx.fillStyle = `rgba(0,0,0,${0.35 * (1 - hgt * 0.6)})`;
  ctx.beginPath(); ctx.ellipse(Math.round(x / 2) * 2, gy, 46 * s * (1 - hgt * 0.4), 9 * (1 - hgt * 0.4), 0, 0, Math.PI * 2); ctx.fill();
}
// ---------- HD bitmap cache ----------
// The smooth cel-shaded fighters are expensive vector art, so in a fight each distinct (quantized) frame is
// rendered once at the screen's resolution, tightly cropped, and reused (LRU, ~100 MB per fighter).
// Screens that draw fighters enlarged (VS, select, results) skip the cache and draw live vectors so they stay sharp.
const HD = { maxBytes: 100e6, calib: new Map() };
// pose bounds (logical units, fighter origin at 0,0 facing +x) from the rig joints
function rigBounds(def, pose) {
  const rig = computeRig(def, pose, 1), s = rig.s;
  const ox = (pose.dx || 0) * s;
  const oy = pose.fit ? -rig.maxY + (pose.dy || 0) - (def.hover || 0) * s : -(rig.L.ul + rig.L.ll) * 0.88 + (pose.dy || 0);
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  const add = (p, r) => { x0 = Math.min(x0, p.x - r); x1 = Math.max(x1, p.x + r); y0 = Math.min(y0, p.y - r); y1 = Math.max(y1, p.y + r); };
  add(rig.headC, rig.L.hr); add(rig.neck, 0); add({ x: 0, y: 0 }, 0);
  for (const L of [rig.FA, rig.BA, rig.FL, rig.BL]) for (const p of L) add(p, 0);
  return { x0: x0 + ox, y0: y0 + oy, x1: x1 + ox, y1: y1 + oy };
}
// one-off per fighter: how far the art reaches beyond the joint bounds (tails, halos, scarves, capes)
function hdCalibrate(def) {
  let c = HD.calib.get(def.id);
  if (c) return c;
  c = { l: 0, t: 0, r: 0, b: 0 };
  const B = FIGHTER_BOX, k = 0.25, w = Math.ceil(B[2] * k), h = Math.ceil(B[3] * k);
  const cv = makeCanvas(w, h), x = cv.getContext('2d', { willReadFrequently: true });
  const Q = n => { const p = poseOf(def, n); return Array.isArray(p) ? p[1] : p; };
  const poses = [poseOf(def, 'stance'), idlePose(0, def), idlePose(40, def), walkPose(0, 1, 1, def), walkPose(10, 1, 1, def), Q('crouch'), Q('block'), Q('jump'), Q('jumpUp'),
    Q('jab'), Q('straight'), Q('lkick'), Q('hkick'), Q('sweep'), Q('cupper'), Q('fireball'), Q('upper'), Q('ahkick'), Q('hitHigh'), Q('down'), Q('win'), Q('taunt'),
    Object.assign({}, Q('juggle'), { rot: -40 }), Object.assign({}, Q('tuck'), { rot: 90 }), Object.assign({}, Q('tuck'), { rot: 180 })];
  for (const pose of poses) {
    x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, w, h);
    x.setTransform(k, 0, 0, k, -B[0] * k, -B[1] * k);
    drawFighterVector(x, def, 0, 0, 1, pose, { t: 50, shadow: false, expr: 'normal' });
    const d = x.getImageData(0, 0, w, h).data;
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) if (d[(yy * w + xx) * 4 + 3] > 4) { if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (yy < y0) y0 = yy; if (yy > y1) y1 = yy; }
    if (x1 < 0) continue;
    const rb = rigBounds(def, pose);
    c.l = Math.max(c.l, rb.x0 - (x0 / k + B[0])); c.t = Math.max(c.t, rb.y0 - (y0 / k + B[1]));
    c.r = Math.max(c.r, (x1 + 1) / k + B[0] - rb.x1); c.b = Math.max(c.b, (y1 + 1) / k + B[1] - rb.y1);
  }
  for (const k2 of ['l', 't', 'r', 'b']) c[k2] = Math.max(0, c[k2]) + 14;
  HD.calib.set(def.id, c);
  return c;
}
function hdSprite(def, pose, opts, hs) {
  const t = opts.t || 0, expr = opts.expr || 'normal';
  const blink = expr === 'normal' && (t % 200) < 7;
  const q = quantizePose(pose);
  const key = poseKey(q) + '|' + expr + '|' + (opts.flash > 0 ? 1 : 0) + '|' + (opts.glow || '') + '|' + (blink ? 1 : 0) + '|' + hs;
  const A = def._hd || (def._hd = { map: new Map(), bytes: 0 });
  let spr = A.map.get(key);
  if (spr) { A.map.delete(key); A.map.set(key, spr); return spr; }
  if (Render.bakeBudget <= 0 && opts.prev && opts.prev.hd) return opts.prev;
  Render.bakeBudget--;
  const tb = performance.now();
  const c = hdCalibrate(def), rb = rigBounds(def, q);
  const x0 = Math.floor(rb.x0 - c.l), y0 = Math.floor(rb.y0 - c.t), w = Math.ceil(rb.x1 + c.r) - x0, h = Math.ceil(rb.y1 + c.b) - y0;
  const cw = Math.max(1, Math.ceil(w * hs)), ch = Math.max(1, Math.ceil(h * hs));
  const cv = makeCanvas(cw, ch), x = cv.getContext('2d');
  x.setTransform(hs, 0, 0, hs, -x0 * hs, -y0 * hs);
  drawFighterVector(x, def, 0, 0, 1, q, Object.assign({}, opts, { t: blink ? 3 : 50, shadow: false, alpha: null }));
  spr = { hd: true, c: cv, x0, y0, w, h, bytes: cw * ch * 4 };
  A.map.set(key, spr); A.bytes += spr.bytes;
  while (A.bytes > HD.maxBytes && A.map.size > 1) { const k0 = A.map.keys().next().value; A.bytes -= A.map.get(k0).bytes; A.map.delete(k0); }
  Render.bakeAvg = Render.bakeAvg * 0.9 + (performance.now() - tb) * 0.1;
  Render.misses = (Render.misses || 0) + 1;
  return spr;
}
// the canvas's current scale, in device pixels per logical unit
function ctxScale(ctx) { const m = ctx.getTransform && ctx.getTransform(); return m ? Math.hypot(m.a, m.b) : (Render.px || 1); }
function hdBucket(sc) { return clamp(Math.round(sc * 4) / 4, 1, 2); }
function drawFighterRig(ctx, def, x, y, face, pose, opts = {}) {
  if (!pixelMode()) {
    const sc = ctxScale(ctx), px = Render.px || 1;
    // enlarged menus/VS screens: live vectors (crisp at any size); in a fight: cached bitmaps at screen resolution
    if (opts.live || sc > px * 1.08 + 0.02) return drawFighterVector(ctx, def, x, y, face, pose, opts);
    if (opts.shadow !== false) drawFighterShadow(ctx, def, x, y, opts);
    const spr = hdSprite(def, pose, opts, hdBucket(sc));
    if (opts.holder) opts.holder.prev = spr;
    ctx.save();
    if (opts.alpha != null) ctx.globalAlpha *= opts.alpha;
    ctx.translate(x, y); if (face < 0) ctx.scale(-1, 1);
    ctx.drawImage(spr.c, spr.x0, spr.y0, spr.w, spr.h);
    ctx.restore();
    return;
  }
  if (opts.shadow !== false) drawFighterShadow(ctx, def, x, y, opts);
  const spr = atlasSprite(def, face, pose, opts);
  if (opts.holder) opts.holder.prev = spr;
  const flip = face < 0;
  ctx.save();
  if (opts.alpha != null) ctx.globalAlpha *= opts.alpha;
  blitSprite(ctx, spr, x, y, flip);
  ctx.restore();
}
// mascot heads (portraits, title, cut-ins) as pixel sprites drawn at the current origin
function drawHeadArt(ctx, def, R, expr, t, flip) {
  if (!pixelMode()) {
    const sc = ctxScale(ctx), ext = R * 2.1, hs = clamp(Math.ceil(sc * 4) / 4, 1, 4), n = Math.ceil(ext * 2 * hs);
    const tb = Math.floor(t / 12), key = 'hd|' + def.id + '|' + Math.round(R * 4) + '|' + expr + '|' + (flip ? 1 : 0) + '|' + hs;
    let e = HEAD_CACHE.get(key);
    if (!e) { e = { tb: -1, c: makeCanvas(n, n) }; HEAD_CACHE.set(key, e); if (HEAD_CACHE.size > 80) HEAD_CACHE.delete(HEAD_CACHE.keys().next().value); }
    if (e.tb !== tb) {
      const x = e.c.getContext('2d');
      x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, n, n);
      x.setTransform(hs * (flip ? -1 : 1), 0, 0, hs, n / 2, n / 2);
      def.drawHead(x, R, expr, t, { portrait: true });
      e.tb = tb;
    }
    ctx.drawImage(e.c, -ext, -ext, ext * 2, ext * 2);
    return;
  }
  const ext = R * 1.9;
  // heads animate at ~15fps; cache per (fighter, size, expression, facing, time bucket)
  const tb = Math.floor(t / 4);
  const key = def.id + '|' + Math.round(R * 4) + '|' + expr + '|' + (flip ? 1 : 0);
  let e = HEAD_CACHE.get(key);
  if (!e || e.tb !== tb) {
    if (!e) {
      e = { slot: {}, tb: -1 };
      HEAD_CACHE.set(key, e);
      if (HEAD_CACHE.size > 80) HEAD_CACHE.delete(HEAD_CACHE.keys().next().value);
    }
    e.spr = renderSprite(-ext, -ext, ext * 2, ext * 2, s => { if (flip) s.scale(-1, 1); def.drawHead(s, R, expr, t, { portrait: true }); }, null, e.slot);
    e.tb = tb;
  }
  blitSprite(ctx, e.spr, 0, 0);
}

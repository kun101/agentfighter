'use strict';
// ---------- Core constants & helpers ----------
const W = 960, H = 540;          // logical resolution
const GROUND = 470;              // feet line
const FLOOR_Y = 392;             // where the stage floor starts (horizon of floor)
const STAGE_W = 1500;            // world width
const GRAV = 0.8;
const FONT = '"Arial Black","Segoe UI Black",Impact,Haettenschweiler,sans-serif';
const FONT_UI = '"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif';
const D2R = Math.PI / 180;
const OUT = '#14101c';           // outline color

function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function lerp(a, b, t) { return a + (b - a) * t; }
function rand(a, b) { return a + Math.random() * (b - a); }
function randi(a, b) { return Math.floor(a + Math.random() * (b - a + 1)); }
function choice(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function chance(p) { return Math.random() < p; }
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
function sign(v) { return v < 0 ? -1 : 1; }

const Ease = {
  out: t => 1 - (1 - t) * (1 - t),
  in: t => t * t,
  inOut: t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
  outCubic: t => 1 - Math.pow(1 - t, 3),
  outBack: t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
};

// ---------- Color ----------
function hexToRgb(h) {
  h = h.replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgbStr(r, g, b, a) { return a == null ? `rgb(${r | 0},${g | 0},${b | 0})` : `rgba(${r | 0},${g | 0},${b | 0},${a})`; }
const _colCache = new Map();
// amt in -1..1 : negative darkens, positive lightens
function shade(hex, amt) {
  const k = hex + '|' + amt;
  let v = _colCache.get(k);
  if (v) return v;
  const [r, g, b] = hexToRgb(hex), t = amt < 0 ? 0 : 255, p = Math.abs(amt);
  v = rgbStr(r + (t - r) * p, g + (t - g) * p, b + (t - b) * p);
  _colCache.set(k, v);
  return v;
}
function alpha(hex, a) {
  const k = hex + '@' + a;
  let v = _colCache.get(k);
  if (v) return v;
  const [r, g, b] = hexToRgb(hex);
  v = rgbStr(r, g, b, a);
  _colCache.set(k, v);
  return v;
}

// ---------- Drawing helpers ----------
function txt(ctx, s, x, y, o = {}) {
  const size = o.size || 20;
  ctx.font = `${o.italic ? 'italic ' : ''}${o.weight || 900} ${size}px ${o.font || FONT}`;
  ctx.textAlign = o.align || 'left';
  ctx.textBaseline = o.base || 'alphabetic';
  if (o.shadow) { ctx.fillStyle = o.shadow; ctx.fillText(s, x + (o.sx == null ? 3 : o.sx), y + (o.sy == null ? 4 : o.sy)); }
  if (o.stroke) {
    ctx.lineJoin = 'round';
    ctx.lineWidth = o.sw || Math.max(2, size / 6);
    ctx.strokeStyle = o.stroke;
    ctx.strokeText(s, x, y);
  }
  ctx.fillStyle = o.color || '#fff';
  ctx.fillText(s, x, y);
}
function rrect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function wrapLines(ctx, text, maxW) {
  const out = [];
  for (const para of String(text).split('\n')) {
    const words = para.split(' ');
    let line = '';
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width > maxW && line) { out.push(line); line = w; } else line = test;
    }
    out.push(line);
  }
  return out;
}
function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.max(0.01, r), 0, Math.PI * 2); }
function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h));
  return c;
}
function seededRng(seed) {
  let s = (seed >>> 0) || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
function rectsHit(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }

// ---------- Persistent storage (safe) ----------
const Store = {
  get(k, d) { try { const v = localStorage.getItem('techfighter_' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('techfighter_' + k, JSON.stringify(v)); } catch (e) { /* ignore */ } },
};

const Settings = Object.assign({
  difficulty: 1,      // 0 easy 1 normal 2 hard 3 brutal
  rounds: 2,          // rounds needed to win (1,2,3)
  timer: 99,          // 60 / 99 / 0 (infinite)
  sfx: 0.8,
  music: 0.5,
  announcer: true,
  shake: true,
  inputDisplay: false,
  graphics: 'hd',      // 'hd' = smooth anime cel-shaded vector art, 'pixel' = pixel-art sprites & stages
}, Store.get('settings', {}));
// v2 art: everyone starts on the smooth HD renderer once (pixel art stays available in Options)
if (!Settings.gfxV) { Settings.graphics = 'hd'; Settings.gfxV = 2; }
if (Settings.graphics !== 'pixel') Settings.graphics = 'hd';
function saveSettings() { Store.set('settings', Settings); }

const Progress = Object.assign({ cleared: {}, unlockedBoss: false, wins: 0, losses: 0, bestArcadeTime: null }, Store.get('progress', {}));
function saveProgress() { Store.set('progress', Progress); }
const TOUCH_ONLY = typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(hover: none) and (pointer: coarse)').matches;

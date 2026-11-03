'use strict';
// ---------- Fighter: state machine, frame data, inputs, hits ----------
let MOVE_ID = 0;
POSES.flashkick = [P({ lean: 10, fl: [70, -20], bl: [0, -40], fa: [60, 150], fit: 0 }), P({ lean: -28, head: 8, fl: [96, 96], bl: [-24, -40], fa: [60, 150], ba: [-40, 10], fit: 0 })];
POSES.throwSwing = P({ lean: -24, head: -10, fa: [150, 160], ba: [140, 150], fl: [30, 0], bl: [-34, -20] });
POSES.flurryA = P({ lean: 22, head: -10, fa: [92, 90], ba: [10, 140], fl: [42, 6], bl: [-36, -26] });
POSES.flurryB = P({ lean: 18, head: -8, fa: [20, 150], ba: [92, 92], fl: [40, 6], bl: [-36, -26] });
POSES.flurryC = P({ lean: -10, head: -6, fl: [110, 110], bl: [-10, -6], fa: [40, 120], ba: [-30, 20] });

// [x, y, w, h] in local space (x forward from fighter center, y up from feet = negative)
const NORMALS = {
  sLP: { anim: 'jab', su: 4, ac: 3, rc: 7, dmg: 30, hs: 15, bs: 10, hit: 6, push: 5, box: [24, -152, 56, 24], guard: 'mid', cancel: 2, light: 1 },
  sHP: { anim: 'straight', su: 7, ac: 4, rc: 15, dmg: 80, hs: 19, bs: 14, hit: 10, push: 7, box: [24, -150, 74, 28], guard: 'mid', cancel: 1, step: 2.2 },
  sLK: { anim: 'lkick', su: 5, ac: 3, rc: 10, dmg: 40, hs: 16, bs: 11, hit: 7, push: 6, box: [20, -104, 72, 26], guard: 'mid', cancel: 2, light: 1 },
  sHK: { anim: 'hkick', su: 9, ac: 4, rc: 19, dmg: 85, hs: 20, bs: 15, hit: 10, push: 9, box: [20, -170, 90, 34], guard: 'mid', cancel: 0 },
  cLP: { anim: 'cjab', su: 4, ac: 3, rc: 7, dmg: 25, hs: 14, bs: 10, hit: 6, push: 5, box: [24, -92, 58, 22], guard: 'mid', cancel: 2, crouch: 1, light: 1 },
  cHP: { anim: 'cupper', su: 6, ac: 5, rc: 17, dmg: 75, hs: 19, bs: 14, hit: 10, push: 6, box: [10, -215, 58, 130], guard: 'mid', cancel: 1, crouch: 1, aa: 1 },
  cLK: { anim: 'cshort', su: 4, ac: 3, rc: 9, dmg: 25, hs: 14, bs: 10, hit: 6, push: 6, box: [24, -28, 70, 26], guard: 'low', cancel: 2, crouch: 1, light: 1 },
  cHK: { anim: 'sweep', su: 8, ac: 4, rc: 22, dmg: 75, hs: 20, bs: 14, hit: 10, push: 7, box: [22, -28, 100, 28], guard: 'low', cancel: 0, crouch: 1, kd: 1 },
  jLP: { anim: 'ajab', su: 4, ac: 8, rc: 4, dmg: 35, hs: 14, bs: 10, hit: 6, push: 4, box: [14, -125, 56, 34], guard: 'high', air: 1, light: 1 },
  jHP: { anim: 'astraight', su: 7, ac: 6, rc: 6, dmg: 80, hs: 19, bs: 14, hit: 10, push: 5, box: [16, -110, 66, 44], guard: 'high', air: 1 },
  jLK: { anim: 'akick', su: 4, ac: 10, rc: 4, dmg: 40, hs: 14, bs: 10, hit: 6, push: 4, box: [12, -78, 64, 38], guard: 'high', air: 1, light: 1 },
  jHK: { anim: 'ahkick', su: 7, ac: 6, rc: 6, dmg: 85, hs: 20, bs: 14, hit: 10, push: 5, box: [16, -74, 82, 40], guard: 'high', air: 1 },
};
const ACTIONABLE = { stand: 1, crouch: 1 };
const BLOCKABLE = { stand: 1, crouch: 1, block: 1 };

class Fighter {
  constructor(def, side) {
    this.def = def; this.side = side; this.wins = 0; this.meter = 0;
    this.maxHp = def.stats.hp;
    this.stats = { hits: 0, dmg: 0, maxCombo: 0, specials: 0, supers: 0 };
    this.reset(side === 0 ? STAGE_W / 2 - 170 : STAGE_W / 2 + 170);
  }
  reset(x) {
    this.x = x; this.y = GROUND; this.vx = 0; this.vy = 0; this.pushV = 0;
    this.facing = this.side === 0 ? 1 : -1; this.drawFacing = this.facing;
    this.hp = this.maxHp; this.dispHp = this.hp;
    this.state = 'intro'; this.t = 0; this.move = null; this.mt = 0;
    this.stun = 0; this.inv = 0; this.hitstop = 0; this.flash = 0; this.shakeT = 0;
    this.combo = 0; this.juggles = 0; this.bounced = false; this.koed = false;
    this.contact = false; this.hitCount = 0; this.rehit = 0;
    this.dirHist = [{ d: 5, f: 0 }]; this.btnBuf = []; this.lastDir = 5;
    this.inp = { dir: 5, press: {}, hold: {} };
    this.crouching = false; this.guarding = false; this.blockLow = false;
    this.jumpDir = 0; this.airAttacked = false; this.alpha = 1;
    this.grab = null; this.lock = null; this.hitPose = 'hitHigh';
    this.proj = 0; this.landRec = 0; this.airMove = false;
    this.lastHitBy = null; this.counterT = 0; this.wakeT = 0;
    this.expr = 'normal'; this.trail = 0; this.dashT = 0; this.landT = 0;
  }
  get s() { return this.def.scale; }
  get isAir() { return this.y < GROUND - 0.5 || this.state === 'air' || this.state === 'juggle' || (this.state === 'attack' && this.airMove); }
  setState(s) { this.state = s; this.t = 0; }
  dirTo(o) { return o.x >= this.x ? 1 : -1; }

  // ---------- input ----------
  record(inp, frame, frozen) {
    this.inp = inp;
    if (inp.dir !== this.lastDir) {
      this.dirHist.push({ d: inp.dir, f: frame });
      if (this.dirHist.length > 40) this.dirHist.shift();
      this.lastDir = inp.dir;
    }
    for (const b of ['lp', 'hp', 'lk', 'hk', 'sp']) if (inp.press && inp.press[b]) this.btnBuf.push({ b, f: frame, dir: inp.dir });
    // buffered presses don't age while frozen in hitstop / super freeze
    if (this.hitstop > 0 || frozen) for (const e of this.btnBuf) e.f++;
    this.btnBuf = this.btnBuf.filter(e => frame - e.f <= 6);
  }
  motion(pattern, win, frame) {
    let idx = pattern.length - 1;
    for (let i = this.dirHist.length - 1; i >= 0; i--) {
      const e = this.dirHist[i];
      // measure from when this direction was released (start of the next entry)
      const endF = i < this.dirHist.length - 1 ? this.dirHist[i + 1].f : frame;
      if (frame - endF > win) break;
      if (pattern[idx].includes(e.d)) { idx--; if (idx < 0) return true; }
    }
    return false;
  }
  detectSpecial(btn, frame) {
    const punch = btn === 'lp' || btn === 'hp', kick = btn === 'lk' || btn === 'hk';
    const cur = this.inp.dir;
    if (punch) {
      if (this.meter >= 100 && this.motion([[2], [3], [6], [2], [3], [6, 9]], 34, frame)) return 'super';
      if (this.motion([[6], [2, 1], [3]], 20, frame) && cur !== 6) return 'dp';
      if (this.motion([[2], [3], [6, 9]], 16, frame)) return 'qcf';
      if (this.motion([[6], [2, 1], [3]], 20, frame)) return 'dp';
    }
    if (kick) {
      if (this.meter >= 100 && this.motion([[2], [1], [4], [2], [1], [4, 7]], 34, frame)) return 'super';
      if (this.motion([[2], [1], [4, 7]], 16, frame)) return 'qcb';
    }
    return null;
  }

  // ---------- move construction ----------
  normal(name) {
    const d = this.def;
    const n = Object.assign({}, NORMALS[name], d.normals && d.normals[name]);
    const m = Object.assign({}, n, { key: name, id: ++MOVE_ID, dmg: Math.round(n.dmg * d.stats.dmg), kind: 'normal' });
    const reachP = d.reachP || d.armLen || 1, reachK = d.reachK || d.legLen || 1;
    const sx = d.scale * (name.endsWith('P') ? reachP : reachK);
    m.box = [n.box[0] * d.scale, n.box[1] * d.scale, n.box[2] * sx, n.box[3] * d.scale];
    return m;
  }
  special(key, heavy) {
    const sp = this.def.specials[key];
    const h = heavy ? 1 : 0, sc = this.s, dm = this.def.stats.dmg;
    const base = { key, id: ++MOVE_ID, special: 1, name: sp.name, sp, heavy: h, kind: sp.kind, turn: !!sp.turn, guard: 'mid', chip: 0.25, hit: 10, push: 8, hs: 22, bs: 16, cancel: 0 };
    let m;
    switch (sp.kind) {
      case 'proj': m = { anim: sp.pose || 'fireball', su: 10, ac: 2, rc: sp.twin ? 32 : (h ? 29 : 26), box: null }; break;
      case 'rise': m = { anim: 'upper', su: 3, ac: 13, rc: 16, box: [6, -210, 60, 160], dmg: Math.round(sp.dmg[h] * dm / sp.hits[h]), hits: sp.hits[h], rehit: 5, kd: 1, launch: [2.5, -10], landRec: 13, inv: h ? [0, 9] : [0, 5], vy: sp.vy[h], vx: sp.vx[h], hs: 26, aa: 1 }; break;
      case 'spin': m = { anim: 'spinkick', su: 7, ac: sp.dur[h], rc: 12, box: [-10, -160, 92, 46], dmg: Math.round(sp.dmg[h] * dm), hits: sp.hits[h], rehit: Math.floor(sp.dur[h] / sp.hits[h]), vx: sp.vx[h], kdLast: 1, flip: 5, launch: [4, -7] }; break;
      case 'flash': m = { anim: 'flashkick', su: 6, ac: sp.dur[h], rc: 15, box: [10, -130, 70, 60], dmg: Math.round(sp.dmg[h] * dm), hits: 1, vx: sp.vx[h], kd: 1, launch: [4, -8], ghost: 1, noPush: 1 }; break;
      case 'dive': m = { anim: 'knee', su: 6, ac: 40, rc: 0, box: [4, -120, 64, 70], dmg: Math.round(sp.dmg[h] * dm), hits: 1, vx: sp.vx[h], vy: sp.vy[h], guard: 'high', landRec: 12, divekick: 1 }; break;
      case 'slide': m = { anim: 'slide', su: 6, ac: sp.dur[h], rc: 16, box: [6, -40, 96, 38], dmg: Math.round(sp.dmg[h] * dm), hits: 1, vx: sp.vx[h], guard: 'low', kd: 1, launch: [3, -6], decel: 0.93 }; break;
      case 'roll': m = { anim: 'ball', su: 6, ac: sp.dur[h], rc: 14, box: [-20, -120, 90, 90], dmg: Math.round(sp.dmg[h] * dm), hits: sp.hits[h], rehit: Math.floor(sp.dur[h] / sp.hits[h]), vx: sp.vx[h], rotSpeed: 26, kdLast: 1, launch: [4, -7] }; break;
      case 'claw': m = { anim: 'claw', su: 6, ac: sp.dur[h], rc: 16, box: [10, -150, 74, 90], dmg: Math.round(sp.dmg[h] * dm), hits: sp.hits[h], rehit: Math.floor(sp.dur[h] / sp.hits[h]), vx: sp.vx[h], alt: 4, kdLast: 1, launch: [4, -7], hit: 6 }; break;
      case 'teleport': m = { anim: 'stance', su: 12, ac: 12, rc: 14, box: null, tele: 1, inv: [6, 26] }; break;
      case 'cmdgrab': m = { anim: 'grab', su: 6, ac: 3, rc: 30, box: null, cmdgrab: 1, dmg: Math.round(sp.dmg[h] * dm), range: sp.range[h] }; break;
      case 'beam': m = { anim: 'beamPose', su: 10, ac: 48, rc: 26, box: null, beam: 1, dmg: Math.round(sp.dmg * dm), super: 1, inv: [0, 14] }; break;
      case 'rushsuper': m = { anim: 'rushpunch', su: 6, ac: 26, rc: 30, box: [6, -165, 80, 120], dmg: Math.round(sp.dmg * dm), hits: 1, vx: 13, super: 1, rush: 1, inv: [0, 12], ghost: 1, noPush: 1 }; break;
      case 'rain': m = { anim: 'rainPose', su: 20, ac: 2, rc: 34, box: null, rain: 1, dmg: Math.round(sp.dmg * dm), super: 1, inv: [0, 22] }; break;
      case 'tsunami': m = { anim: 'fireball', su: 18, ac: 2, rc: 32, box: null, tsunami: 1, dmg: Math.round(sp.dmg * dm), super: 1, inv: [0, 20] }; break;
    }
    m = Object.assign(base, m);
    if (m.box) m.box = [m.box[0] * sc, m.box[1] * sc, m.box[2] * sc, m.box[3] * sc];
    if (m.dmg == null) m.dmg = Math.round((sp.dmg || 80) * dm);
    if (m.super) { m.chip = 0.3; m.hs = 30; }
    return m;
  }

  canUse(key) {
    if (key === 'qcf' && this.proj > 0) return false;
    if (key === 'super' && this.meter < 100) return false;
    return true;
  }

  // cancel rules: level 2 normals can chain into any normal + specials; level 1 only specials; specials (on contact) into super
  cancelLevel() {
    if (this.state !== 'attack' || !this.move || !this.contact) return 0;
    const m = this.move;
    if (this.mt > m.su + m.ac + 10) return 0;
    if (m.super) return 0;
    if (m.special) return 3; // super cancel only
    return m.cancel || 0;
  }

  tryAttack(g) {
    const frame = g.frame;
    const actionable = ACTIONABLE[this.state] || (this.state === 'land' && this.t > 1 && !this.landRec);
    const inAir = this.state === 'air';
    const cl = this.cancelLevel();
    if (!actionable && !inAir && !cl) return false;
    const opp = this.opp;
    // --- AI requests
    const req = this.inp.req;
    if (req) {
      this.inp.req = null;
      return this.doRequest(req, g, actionable, inAir, cl);
    }
    if (!this.btnBuf.length) return false;
    // newest press first
    const e = this.btnBuf[this.btnBuf.length - 1];
    const btn = e.b, dir = this.inp.dir;
    const heavy = btn === 'hp' || btn === 'hk';
    const down = dir <= 3, fwd = dir === 6 || dir === 9 || dir === 3, back = dir === 4 || dir === 7 || dir === 1;
    if (inAir) {
      if (this.airAttacked || btn === 'sp') return false;
      this.btnBuf = [];
      return this.startMove(this.normal('j' + btn.toUpperCase()), g);
    }
    let key = null, h = heavy;
    if (btn === 'sp') {
      if (down && this.meter >= 100) key = 'super';
      else if (fwd && !down) key = 'dp';
      else if (back && !down) key = 'qcb';
      else key = 'qcf';
      h = false;
    } else key = this.detectSpecial(btn, frame);
    if (key && !this.canUse(key)) key = (key === 'super') ? null : (key === 'qcf' ? null : key);
    if (key) {
      if (key === 'super' ? cl >= 1 || actionable : (cl >= 1 && cl !== 3) || actionable) {
        this.btnBuf = [];
        const mv = this.special(key, h);
        if (btn === 'sp') { mv.dmg = Math.round(mv.dmg * 0.85); }
        return this.startMove(mv, g);
      }
      if (key === 'super' && cl === 3) { this.btnBuf = []; return this.startMove(this.special('super', h), g); }
    }
    if (btn === 'sp') { this.btnBuf = []; return false; }
    if (!actionable && cl !== 2) return false;
    // throw
    if (actionable && btn === 'hp' && (fwd || back) && !down && this.canThrow(opp)) { this.btnBuf = []; return this.startThrow(back, g); }
    const name = (down ? 'c' : 's') + btn.toUpperCase();
    if (cl === 2 && this.move && this.move.key === name && !NORMALS[name].light) return false;
    if (cl === 2 && !actionable && this.move && !this.move.light) return false;
    this.btnBuf = [];
    return this.startMove(this.normal(name), g);
  }
  doRequest(req, g, actionable, inAir, cl) {
    if (inAir) {
      if (req[0] === 'j' && !this.airAttacked) return this.startMove(this.normal(req), g);
      return false;
    }
    if (req === 'throw') { if (actionable && this.canThrow(this.opp)) return this.startThrow(chance(.5), g); return false; }
    const m = /^(qcf|dp|qcb|super)(H?)$/.exec(req);
    if (m) {
      if (!this.canUse(m[1])) return false;
      if (m[1] === 'super' ? (actionable || cl >= 1) : (actionable || (cl >= 1 && cl !== 3))) return this.startMove(this.special(m[1], !!m[2]), g);
      return false;
    }
    if (NORMALS[req] && !NORMALS[req].air) {
      if (actionable || (cl === 2 && this.move && (this.move.light || !NORMALS[req].light) && this.move.key !== req)) return this.startMove(this.normal(req), g);
    }
    return false;
  }
  startMove(mv, g) {
    if (mv.super) {
      if (this.meter < 100) return false;
      this.meter -= 100;
      g.superFlash(this, mv);
      this.stats.supers++;
    } else if (mv.special) this.stats.specials++;
    this.move = mv; this.mt = 0; this.contact = false; this.hitCount = 0; this.rehit = 0;
    if (mv.air) { this.airAttacked = true; this.state = 'attack'; this.airMove = true; }
    else { this.state = 'attack'; this.airMove = false; this.vx = 0; }
    this.t = 0;
    this.drawFacing = this.facing;
    if (mv.special && !mv.super) { Sound.play('whiff'); }
    return true;
  }
  canThrow(o) {
    if (!o || o.inv > 0 || o.isAir || o.throwProt > 0) return false;
    if (!(o.state === 'stand' || o.state === 'crouch' || o.state === 'land' || o.state === 'dash' || (o.state === 'attack' && !o.airMove))) return false;
    return Math.abs(o.x - this.x) < 82 * Math.max(1, this.s);
  }
  startThrow(back, g, cmd) {
    const o = this.opp;
    this.state = 'throwing'; this.t = 0; this.move = null;
    this.grab = { t: 0, back: !!back, cmd: !!cmd, dmg: cmd ? cmd.dmg : Math.round(120 * this.def.stats.dmg), dur: cmd ? 44 : 30 };
    o.state = 'thrown'; o.t = 0; o.move = null; o.grabbedBy = this; o.vx = 0; o.pushV = 0; o.techable = !cmd;
    Sound.play('grab');
    g.addPart({ type: 'ring', x: (this.x + o.x) / 2, y: GROUND - 120, life: 14, col: '#fff', size: 30 });
    return true;
  }

  // ---------- per-frame update ----------
  update(g) {
    const inp = this.inp;
    this.t++;
    if (this.inv > 0) this.inv--;
    if (this.flash > 0) this.flash--;
    if (this.throwProt > 0) this.throwProt--;
    if (this.counterT > 0) this.counterT--;
    const opp = this.opp;
    const dir = inp.dir;
    const fwd = dir === 6 || dir === 9 || dir === 3, back = dir === 4 || dir === 7 || dir === 1, up = dir >= 7, down = dir <= 3;
    this.guarding = false;
    switch (this.state) {
      case 'intro': case 'win': case 'lose': case 'timeout': this.vx = 0; break;
      case 'stand': case 'crouch': {
        this.combo = 0; this.juggles = 0;
        if (this.tryAttack(g)) break;
        if (up) { this.jumpDir = dir === 9 ? 1 : dir === 7 ? -1 : 0; this.setState('prejump'); this.vx = 0; break; }
        // dash: double tap
        if (!down && (fwd || back) && this.dirHist.length >= 3) {
          const n = this.dirHist.length, a = this.dirHist[n - 1], b = this.dirHist[n - 2], c = this.dirHist[n - 3];
          if (a.f === g.frame && b.d === 5 && c.d === a.d && (a.d === 6 || a.d === 4) && a.f - c.f < 14) {
            this.state = 'dash'; this.t = 0; this.dashDir = a.d === 6 ? 1 : -1;
            this.vx = (this.dashDir > 0 ? 8.5 : -7.5) * this.facing;
            if (this.dashDir < 0) this.inv = 7;
            Sound.play('dash');
            g.addPart({ type: 'dust', x: this.x - this.facing * this.dashDir * 20, y: GROUND - 6, vx: -this.facing * this.dashDir * 1.5, vy: -.4, life: 22, size: 12 });
            break;
          }
        }
        if (down) {
          if (this.state !== 'crouch') this.setState('crouch');
          this.vx = 0;
          this.guarding = back && this.threatened(g);
        } else {
          if (this.state !== 'stand') this.setState('stand');
          if (fwd) this.vx = this.def.stats.walkF * this.facing;
          else if (back) {
            if (this.threatened(g)) { this.vx = 0; this.guarding = true; }
            else this.vx = -this.def.stats.walkB * this.facing;
          } else this.vx = 0;
        }
        break;
      }
      case 'prejump':
        if (this.t >= 4) {
          this.state = 'air'; this.t = 0; this.airAttacked = false;
          this.vy = -this.def.stats.jumpV; this.vx = this.jumpDir * this.def.stats.jumpX * this.facing;
          Sound.play('jump');
          g.addPart({ type: 'dust', x: this.x, y: GROUND - 4, vx: 0, vy: -.3, life: 18, size: 14 });
        }
        break;
      case 'air':
        this.tryAttack(g);
        break;
      case 'land':
        if (this.landRec > 0) { this.landRec--; this.vx *= 0.7; if (this.landRec <= 0) this.setState('stand'); }
        else { this.vx = 0; if (!this.tryAttack(g) && this.t >= 3) this.setState(down ? 'crouch' : 'stand'); }
        break;
      case 'dash':
        this.vx *= 0.9;
        if (this.t >= (this.dashDir > 0 ? 16 : 18)) { this.vx = 0; this.setState('stand'); }
        break;
      case 'attack':
        if (this.cancelLevel() && this.tryAttack(g)) break;
        this.updateAttack(g); break;
      case 'hit':
        if (--this.stun <= 0) { this.setState(this.crouching ? 'crouch' : 'stand'); this.throwProt = 6; }
        break;
      case 'block':
        if (--this.stun <= 0) { this.setState(this.blockLow ? 'crouch' : 'stand'); this.throwProt = 5; }
        break;
      case 'juggle': break; // physics handles landing
      case 'down':
        this.inv = 2;
        if (this.t >= (this.koed ? 99999 : 34)) { this.setState('getup'); }
        break;
      case 'getup':
        this.inv = 2;
        if (this.t >= 22) { this.setState('stand'); this.inv = 0; this.throwProt = 4; this.wakeT = 8; }
        break;
      case 'throwing': this.updateThrow(g); break;
      case 'thrown':
        // tech window
        if (this.techable && this.t <= 8 && ((inp.press && inp.press.hp) || (inp.press && inp.press.lp && inp.press.lk) || inp.tech)) {
          const o = this.grabbedBy;
          if (o) {
            o.state = 'hit'; o.stun = 14; o.pushV = -6 * o.facing; o.grab = null;
            this.state = 'hit'; this.stun = 14; this.pushV = 6 * o.facing; this.hitPose = 'block';
            g.addPart({ type: 'text', x: (this.x + o.x) / 2, y: GROUND - 210, text: 'TECH!', col: '#7FE3FF', life: 50, size: 26 });
            Sound.play('block');
          }
        }
        break;
      case 'superlock': this.updateLock(g); break;
      case 'locked': break;
      case 'ko': break;
    }
    if (this.wakeT > 0) this.wakeT--;
    this.physics(g);
    if (this.state === 'crouch' || (this.state === 'attack' && this.move && this.move.crouch)) this.crouching = true;
    else if (this.state === 'stand' || this.state === 'air' || this.state === 'attack' || this.state === 'dash') this.crouching = false;
    // facing
    if (opp && (this.state === 'stand' || this.state === 'crouch' || this.state === 'land' || this.state === 'prejump') && Math.abs(opp.x - this.x) > 4) {
      this.facing = this.dirTo(opp);
    }
    const mv = this.move;
    if (this.state === 'attack' && mv && mv.flip) { /* spinning moves alternate in updateAttack */ }
    else if (this.state === 'attack' && mv && mv.turn) this.drawFacing = -this.facing;
    else if (this.state === 'superlock' && this.def.turnSuper) this.drawFacing = -this.facing;
    else this.drawFacing = this.facing;
  }

  threatened(g) {
    const o = this.opp;
    if (!o) return false;
    const d = Math.abs(o.x - this.x);
    if (o.state === 'attack' && o.move && o.mt <= o.move.su + o.move.ac + 2 && d < 260) return true;
    if (o.state === 'superlock') return true;
    for (const p of g.projs) if (p.owner === o && p.active && Math.abs(p.x - this.x) < 320 && sign(this.x - p.x) === sign(p.vx || o.facing)) return true;
    return false;
  }

  updateAttack(g) {
    const m = this.move;
    if (!m) { this.setState('stand'); return; }
    this.mt++;
    const mt = this.mt, su = m.su, ac = m.ac;
    const activeStart = su + 1, activeEnd = su + ac;
    if (m.inv && mt >= m.inv[0] && mt <= m.inv[1]) this.inv = Math.max(this.inv, 1);
    if (this.rehit > 0) this.rehit--;
    // special behaviors
    if (m.kind === 'normal') {
      if (m.step && mt <= activeEnd) this.vx = m.step * this.facing; else if (!m.air) this.vx *= 0.6;
      if (mt === activeStart && !m.air) Sound.play(m.light ? 'whiff' : 'whiffH');
    }
    if (m.kind === 'proj' && mt === activeStart) this.spawnProj(g);
    if (m.sp && m.sp.twin && mt === activeStart + 10) this.spawnProj(g, true);
    if (m.kind === 'rise') {
      if (mt === su) { Sound.play('rise'); }
      if (mt === activeStart) { this.airMove = true; this.vy = m.vy; this.vx = m.vx * this.facing; }
      if (this.airMove && mt % 2 === 0) g.addPart({ type: 'dot', x: this.x + rand(-10, 10), y: this.y - 100 * this.s + rand(-40, 40), vx: 0, vy: 1, life: 18, col: m.sp.fx || '#fff', size: 5 });
      if (m.sp.spin && mt > su && mt <= activeEnd) this.drawFacing = (Math.floor(mt / 4) % 2) ? -this.facing : this.facing;
      else this.drawFacing = this.facing;
      return; // landing ends it (physics)
    }
    if (m.kind === 'dive') {
      if (mt === activeStart) { this.airMove = true; this.vy = m.vy; this.vx = m.vx * this.facing; Sound.play('dash'); }
      if (mt > activeStart && mt % 2 === 0) g.addPart({ type: 'dot', x: this.x - this.facing * 20, y: this.y - 90, vx: -this.facing, vy: 0, life: 14, col: '#FF3B30', size: 6 });
      return;
    }
    if (m.vx && !m.divekick) {
      if (mt > su && mt <= activeEnd && !this.lock) {
        let v = m.vx;
        if (m.decel) v = m.vx * Math.pow(m.decel, mt - su);
        this.vx = v * this.facing;
      } else this.vx *= 0.75;
      if (m.ghost && mt % 3 === 0 && mt <= activeEnd) g.addPart({ type: 'ghost', def: this.def, x: this.x, y: this.y, face: this.drawFacing, pose: this.currentPose(g.frame), ft: g.frame, life: 14 });
    }
    if (m.flip) this.drawFacing = (mt > su && mt <= activeEnd) ? ((Math.floor(mt / m.flip) % 2) ? -this.facing : this.facing) : this.facing;
    if (m.tele) {
      if (mt === 2) Sound.play('tele');
      if (mt === activeStart) {
        const o = this.opp, d = this.dirTo(o);
        let nx = m.heavy ? o.x + d * 75 : o.x - d * 85;
        nx = clamp(nx, g.camX + 40, g.camX + W - 40);
        nx = clamp(nx, 40, STAGE_W - 40);
        this.x = nx;
        for (let i = 0; i < 10; i++) g.addPart({ type: 'spark', x: this.x, y: this.y - rand(20, 180), vx: rand(-5, 5), vy: rand(-3, 3), life: 16, col: this.def.color, size: 3 });
      }
      if (mt === activeEnd) { this.facing = this.dirTo(this.opp); this.drawFacing = this.facing; }
      this.alpha = mt <= su ? 1 - mt / su : mt <= activeEnd ? 0 : Math.min(1, (mt - activeEnd) / 8);
    }
    if (m.cmdgrab && mt >= activeStart && mt <= activeEnd && !this.contact) {
      const o = this.opp;
      if (o.inv <= 0 && !o.isAir && o.state !== 'thrown' && o.state !== 'down' && o.state !== 'getup' && o.state !== 'juggle' && Math.abs(o.x - this.x) < m.range * this.s) {
        this.contact = true;
        this.startThrow(false, g, { dmg: m.dmg });
        return;
      }
    }
    if (m.beam && mt === activeStart) {
      Sound.play('beam');
      g.projs.push(new Projectile({ owner: this, beam: true, type: 'beam', x: this.x, y: this.y - 118 * this.s, h: 70, life: ac - 4, dmg: Math.round(m.dmg / 9), hits: 9, interval: 5, chip: 0.3, hs: 14, bs: 12, hit: 3, push: 2, col: m.sp.fx, kdFinal: 1, isSuper: true }));
    }
    if (m.rain && mt === activeStart) {
      const o = this.opp;
      for (let i = 0; i < 10; i++) {
        g.projs.push(new Projectile({ owner: this, type: 'star', x: o.x + rand(-110, 110) + o.vx * 6, y: -40 - rand(0, 60), vx: this.facing * 1.5, vy: 11, w: 40, h: 40, delay: i * 5, life: 120, dmg: Math.round(m.dmg / 10), hits: 1, chip: 0.3, hs: 18, bs: 12, hit: 4, push: 3, col: m.sp.fx, guard: 'mid', isSuper: true, gravity: 0.15 }));
      }
      Sound.play('proj');
    }
    if (m.tsunami && mt === activeStart) {
      g.projs.push(new Projectile({ owner: this, type: 'tsunami', x: this.x + this.facing * 90, y: GROUND - 140, vx: this.facing * 4.6, w: 150, h: 280, life: 300, dmg: Math.round(m.dmg / 6), hits: 6, interval: 7, chip: 0.3, hs: 20, bs: 14, hit: 5, push: 3, col: m.sp.fx, kdFinal: 1, isSuper: true }));
      Sound.play('beam');
    }
    if (mt === activeEnd && !this.contact && (m.special || !m.light)) { /* whiff */ }
    if (mt > activeEnd) this.alpha = m.tele ? this.alpha : 1;
    // end
    if (m.air) return; // air normals continue until landing
    if (mt >= su + ac + m.rc) {
      this.move = null; this.alpha = 1;
      this.setState(this.inp.dir <= 3 ? 'crouch' : 'stand');
    }
  }

  spawnProj(g, second) {
    const m = this.move, sp = m.sp, h = m.heavy;
    const y = second ? this.y - 60 * this.s : this.y + sp.y * this.s;
    const o = {
      owner: this, type: sp.proj, x: this.x + this.facing * 62 * this.s, y, vx: sp.speed[h] * this.facing,
      w: 46, h: sp.proj === 'wave' || sp.proj === 'whale' ? 70 : 44, dmg: Math.round(sp.dmg * this.def.stats.dmg), hits: sp.hits, interval: 7,
      hs: 22, bs: 16, hit: 9, push: 8, chip: 0.25, col: this.def.color, wave: !!sp.wave,
    };
    if (sp.proj === 'tokens') { o.hit = 5; o.hs = 16; o.bs = 10; o.push = 4; }
    if (sp.proj === 'gust') { o.w = 56; o.life = 70; }
    g.projs.push(new Projectile(o));
    if (!second) this.proj++;
    Sound.play('proj');
    g.addPart({ type: 'flash', x: o.x, y: o.y, life: 10, col: this.def.color, size: 40 });
  }

  updateThrow(g) {
    const gr = this.grab, o = this.opp;
    if (!gr) { this.setState('stand'); return; }
    this.inv = Math.max(this.inv, 2);
    gr.t++;
    const t = gr.t;
    this.vx = 0;
    if (!gr.cmd) {
      // standard throw: hold then swing over
      const k = clamp((t - 8) / 16, 0, 1);
      const side = gr.back ? -1 : 1;
      const ang = Math.PI * k * (gr.back ? 1 : 0.35);
      o.x = this.x + this.facing * 48 * (gr.back ? Math.cos(ang) : 1);
      o.y = GROUND - (gr.back ? Math.sin(ang) * 80 : k * 30);
      o.throwRot = gr.back ? -k * 180 : -k * 60;
      if (t === gr.dur) {
        const awayDir = this.facing * side;
        if (gr.back) { o.x = this.x - this.facing * 60; }
        o.throwRot = 0;
        this.dealDirect(o, gr.dmg, g, { launch: [4.5 * awayDir, -7], text: null });
        Sound.play('throw');
        if (gr.back) this.facing = -this.facing;
      }
      if (t >= gr.dur + 14) { this.grab = null; this.setState('stand'); }
    } else {
      // command slam: lift, then crush
      if (t < 26) { o.x = this.x + this.facing * 30; o.y = GROUND - Math.min(1, t / 14) * 140; o.throwRot = -Math.min(1, t / 14) * 100; }
      else if (t < 32) { const k = (t - 26) / 6; o.x = this.x + this.facing * lerp(30, 70, k); o.y = lerp(GROUND - 140, GROUND, k); o.throwRot = -100 - k * 80; }
      if (t === 32) {
        o.y = GROUND; o.throwRot = 0;
        this.dealDirect(o, gr.dmg, g, { down: true });
        g.shake = 16;
        Sound.play('heavy'); Sound.play('throw');
        for (let i = 0; i < 12; i++) g.addPart({ type: 'dust', x: o.x + rand(-60, 60), y: GROUND - rand(0, 10), vx: rand(-3, 3), vy: rand(-2, 0), life: 30, size: rand(10, 18), col: '#9EE7FF' });
        g.addPart({ type: 'ring', x: o.x, y: GROUND - 10, life: 20, col: '#9EE7FF', size: 80 });
      }
      if (t >= gr.dur + 10) { this.grab = null; this.setState('stand'); }
    }
  }
  // direct damage used by throws
  dealDirect(o, dmg, g, opt) {
    const fin = Math.round(dmg);
    o.hp = Math.max(0, o.hp - fin);
    this.stats.dmg += fin; this.stats.hits++;
    o.grabbedBy = null;
    this.meter = Math.min(100, this.meter + 8); o.meter = Math.min(100, o.meter + 5);
    g.addPart({ type: 'burst', x: o.x, y: o.y - 90, life: 12, col: '#FFE14D', size: 60, rot: rand(0, 3) });
    g.hitstop(8);
    if (opt.down || o.hp <= 0) {
      o.state = o.hp <= 0 ? 'juggle' : 'down'; o.t = 0; o.vx = 0; o.vy = 0; o.y = GROUND;
      if (o.hp <= 0) { o.vy = -8; o.vx = this.facing * 3; o.koed = true; g.onKO(this, o); }
    } else {
      o.state = 'juggle'; o.t = 0; o.vx = opt.launch[0]; o.vy = opt.launch[1]; o.juggles = 99; o.bounced = false;
      if (o.hp <= 0) { o.koed = true; g.onKO(this, o); }
    }
  }

  updateLock(g) {
    // rush super flurry
    const L = this.lock, o = this.opp;
    if (!L) { this.setState('stand'); return; }
    this.inv = Math.max(this.inv, 2);
    L.t++;
    this.vx = 0; o.vx = 0; o.pushV = 0;
    o.x = this.x + this.facing * 80 * this.s;
    o.state = 'locked'; o.stun = 2;
    const hitsN = 7;
    if (L.t % 6 === 0 && L.n < hitsN) {
      L.n++;
      const d = Math.round(L.dmg * 0.09);
      this.dealLockHit(o, d, g, false);
      if (!this.lock) return;
    }
    if (L.t === 6 * hitsN + 10) {
      const d = L.dmg - Math.round(L.dmg * 0.09) * hitsN;
      this.dealLockHit(o, d, g, true);
    }
  }
  dealLockHit(o, d, g, final) {
    o.hp = Math.max(0, o.hp - d); this.stats.dmg += d;
    o.combo++; this.stats.maxCombo = Math.max(this.stats.maxCombo, o.combo);
    g.comboShow(this, o.combo);
    o.flash = 3; o.hitPose = final ? 'hitHigh' : (o.combo % 2 ? 'hitHigh' : 'hitLow');
    const hx = o.x - this.facing * 10, hy = o.y - rand(90, 150) * o.s;
    g.addPart({ type: 'burst', x: hx, y: hy, life: 10, col: final ? '#FFE14D' : (this.def.specials.super.fx || '#fff'), size: final ? 90 : 46, rot: rand(0, 3) });
    for (let i = 0; i < (final ? 14 : 5); i++) g.addPart({ type: 'spark', x: hx, y: hy, vx: rand(-8, 8), vy: rand(-8, 8), life: 14, col: '#fff', size: 3 });
    Sound.play(final ? 'special' : 'heavy');
    g.shake = final ? 18 : 6;
    g.hitstop(final ? 16 : 4);
    if (final || o.hp <= 0) {
      o.state = 'juggle'; o.t = 0; o.vx = this.facing * 7; o.vy = -12; o.juggles = 99; o.bounced = false;
      this.lock = null; this.move = null; this.state = 'land'; this.landRec = 22; this.t = 0;
      if (o.hp <= 0) { o.koed = true; g.onKO(this, o); }
    }
  }

  physics(g) {
    const S = this.state;
    const airborne = S === 'air' || S === 'juggle' || (S === 'attack' && this.airMove) || (S === 'ko' && this.y < GROUND);
    if (airborne) {
      this.vy += S === 'juggle' ? 0.62 : GRAV;
      this.x += this.vx; this.y += this.vy;
      if (this.y >= GROUND && this.vy > 0) {
        this.y = GROUND;
        this.onLand(g);
      }
    } else if (S !== 'thrown' && S !== 'locked') {
      this.x += this.vx;
      this.y = Math.min(this.y, GROUND);
      if (this.y < GROUND && S !== 'throwing') this.y = GROUND;
    }
    if (S !== 'thrown' && S !== 'locked') {
      this.x += this.pushV;
      this.pushV *= 0.82;
      if (Math.abs(this.pushV) < 0.1) this.pushV = 0;
    }
  }
  onLand(g) {
    const S = this.state;
    if (S === 'juggle') {
      if (!this.bounced && this.vy > 5) {
        this.bounced = true; this.vy = -this.vy * 0.32; this.vx *= 0.5; this.y = GROUND - 1;
        this.juggles = 99;
        Sound.play('land'); g.shake = Math.max(g.shake, 6);
        for (let i = 0; i < 6; i++) g.addPart({ type: 'dust', x: this.x + rand(-40, 40), y: GROUND - 4, vx: rand(-2, 2), vy: rand(-1.5, 0), life: 26, size: rand(10, 16) });
        return;
      }
      this.vx = 0; this.vy = 0;
      this.setState(this.koed ? 'ko' : 'down');
      this.combo = 0;
      return;
    }
    if (S === 'ko') { this.vx = 0; this.vy = 0; return; }
    this.vx = 0; this.vy = 0;
    Sound.play('land');
    if (S === 'attack' && this.move) {
      const m = this.move;
      const rec = m.landRec != null ? m.landRec : (m.air ? 3 : 4);
      this.move = null; this.airMove = false;
      this.state = 'land'; this.t = 0; this.landRec = rec;
      this.drawFacing = this.facing;
      return;
    }
    this.state = 'land'; this.t = 0; this.landRec = 0;
  }

  // ---------- collision boxes ----------
  toWorld(b) {
    return this.facing > 0 ? { x: this.x + b[0], y: this.y + b[1], w: b[2], h: b[3] } : { x: this.x - b[0] - b[2], y: this.y + b[1], w: b[2], h: b[3] };
  }
  hurtboxes() {
    const s = this.s, bw = this.def.bodyW || 1, bh = this.def.hurtH || 1;
    if (this.state === 'down' || this.state === 'ko' || this.state === 'getup') return [this.toWorld([-60 * s, -40 * s, 120 * s, 40 * s])];
    let b;
    if (this.isAir) b = [-25 * s * bw, -180 * s, 50 * s * bw, 150 * s];
    else if (this.crouching || this.state === 'crouch' || (this.state === 'block' && this.blockLow) || (this.state === 'hit' && this.crouching)) b = [-27 * s * bw, -122 * s * bh, 56 * s * bw, 122 * s * bh];
    else b = [-27 * s * bw, -190 * s * bh, 56 * s * bw, 190 * s * bh];
    if (this.state === 'attack' && this.move && this.move.kind === 'slide') b = [-40 * s, -70 * s, 90 * s, 70 * s];
    if (this.state === 'attack' && this.move && this.move.kind === 'roll') b = [-30 * s, -120 * s, 60 * s, 90 * s];
    const out = [this.toWorld(b)];
    // extended limb hurtbox during active/recovery of normals
    const m = this.move;
    if (this.state === 'attack' && m && m.kind === 'normal' && m.box && this.mt > m.su) {
      const bx = m.box;
      out.push(this.toWorld([bx[0], bx[1] + bx[3] * .15, bx[2] * .8, bx[3] * .7]));
    }
    return out;
  }
  pushbox() {
    const s = this.s, bw = this.def.bodyW || 1;
    return { x: this.x - 24 * s * bw, w: 48 * s * bw, y: this.y - (this.isAir ? 150 : 170) * s, h: (this.isAir ? 120 : 170) * s };
  }
  hitbox() {
    const m = this.move;
    if (this.state !== 'attack' || !m || !m.box) return null;
    if (this.mt <= m.su || this.mt > m.su + m.ac) {
      // rising moves stay active while rising
      return null;
    }
    const maxHits = m.hits || 1;
    if (this.hitCount >= maxHits) return null;
    if (this.hitCount > 0 && this.rehit > 0) return null;
    return this.toWorld(m.box);
  }

  canBlockAttack(guard, srcX) {
    if (!BLOCKABLE[this.state] && !(this.state === 'land' && this.t > 0 && !this.landRec)) return false;
    const dir = this.inp.dir;
    const awayDir = sign(this.x - srcX) || -this.facing;
    // holding away (absolute) from the attacker
    const holdLeft = dir === 4 || dir === 1 || dir === 7, holdRight = dir === 6 || dir === 3 || dir === 9;
    const absLeft = this.facing > 0 ? holdLeft : holdRight;
    const absRight = this.facing > 0 ? holdRight : holdLeft;
    const away = awayDir > 0 ? absRight : absLeft;
    if (!away) return false;
    const low = dir <= 3;
    if (guard === 'low' && !low) return false;
    if (guard === 'high' && low) return false;
    if (dir === 7 || dir === 9) return false; // jumping, not blocking
    return true;
  }

  // ---------- pose for rendering ----------
  currentPose(frame) {
    const S = this.state, m = this.move, d = this.def, t = this.t;
    const Q = n => poseOf(d, n);
    switch (S) {
      case 'intro': return lerpPose(Q('stance'), Q('taunt'), Math.round(clamp(Math.sin(t * 0.05) * 0.6 + 0.2, 0, 0.8) * 4) / 4);
      case 'stand':
        if (this.guarding) return Q('block');
        if (Math.abs(this.vx) > 0.5) return walkPose(frame, sign(this.vx) * this.facing, 1, d);
        return idlePose(frame, d);
      case 'crouch': return this.guarding ? Q('cblock') : lerpPose(Q('stance'), Q('crouch'), Math.min(1, Math.round(t + 1) / 3));
      case 'prejump': return Q('land');
      case 'air': {
        if (this.jumpDir !== 0) {
          const air = clamp(t / (2 * this.def.stats.jumpV / GRAV), 0, 1);
          const p = Object.assign({}, Q('tuck'));
          p.rot = (this.jumpDir > 0 ? 1 : -1) * 360 * Ease.inOut(clamp((air - 0.1) / 0.75, 0, 1));
          return p;
        }
        return this.vy < 0 ? Q('jumpUp') : Q('jump');
      }
      case 'land': return this.landRec > 0 ? Q('land') : lerpPose(Q('land'), Q('stance'), Math.min(1, Math.round(t) / 3));
      case 'dash': return this.dashDir > 0 ? Q('dash') : Q('backdash');
      case 'hit': {
        if (this.crouching) return Q('hitCrouch');
        return Q(this.hitPose) || Q('hitHigh');
      }
      case 'locked': return Q(this.hitPose) || Q('hitHigh');
      case 'block': return this.blockLow ? Q('cblock') : Q('block');
      case 'juggle': {
        const p = Object.assign({}, Q('juggle'));
        p.rot = clamp(-this.t * 6, -80, 0);
        return p;
      }
      case 'down': case 'ko': return Q('down');
      case 'getup': return lerpPose(Q('down'), Q('getup'), Math.round(Ease.out(clamp(t / 16, 0, 1)) * 4) / 4);
      case 'win': return d.winPose || (this.side % 2 ? Q('win') : Q('win'));
      case 'lose': case 'timeout': return Q('lose');
      case 'throwing': {
        const gr = this.grab;
        if (!gr) return Q('stance');
        if (gr.cmd) return gr.t < 26 ? Q('lift') : Q('slam');
        return gr.t < 8 ? Q('grab')[1] : gr.back ? Q('throwSwing') : Q('straight')[1];
      }
      case 'thrown': {
        const p = Object.assign({}, Q('hitHigh'));
        p.rot = this.throwRot || 0; p.fit = 0;
        return p;
      }
      case 'superlock': {
        const L = this.lock;
        const ph = Math.floor(L.t / 6) % 3;
        return ph === 0 ? Q('flurryA') : ph === 1 ? Q('flurryB') : Q('flurryC');
      }
      case 'attack': return this.attackPose(frame);
    }
    return idlePose(frame, d);
  }
  attackPose(frame) {
    const m = this.move, d = this.def;
    const Q = n => poseOf(d, n);
    if (!m) return Q('stance');
    let A = Q(m.anim);
    if (!A || !Array.isArray(A)) A = [Q('stance'), A || Q('stance')];
    const base = m.crouch ? Q('crouch') : m.air ? Q('jump') : Q('stance');
    const mt = this.mt, su = m.su, ac = m.ac, rc = m.rc;
    let p;
    // sprite-style animation: wind-ups/recoveries step through a few discrete frames
    const st4 = x => Math.round(x * 3) / 3;
    if (m.kind === 'claw' && mt > su && mt <= su + ac) p = (Math.floor(mt / 4) % 2) ? A[1] : A[0];
    else if (mt <= su) p = lerpPose(base, A[0], st4(Ease.out(mt / Math.max(1, su))));
    else if (mt <= su + ac || m.air || m.kind === 'rise' || m.kind === 'dive') {
      p = A[1];
      if (m.kind === 'rise' && this.vy > 0) p = lerpPose(A[1], Q('jump'), st4(clamp(this.vy / 8, 0, 1)));
    } else p = lerpPose(A[1], base, st4(Ease.inOut(clamp((mt - su - ac) / Math.max(1, rc), 0, 1))));
    if (m.rotSpeed && mt > su && mt <= su + ac) { p = Object.assign({}, p); p.rot = (mt - su) * m.rotSpeed; p.fit = 0; }
    if (m.super && mt <= su) p = lerpPose(Q('superPose'), A[0], st4(mt / su));
    return p;
  }
  exprNow() {
    const S = this.state;
    if (S === 'ko' || (this.koed)) return 'ko';
    if (S === 'hit' || S === 'juggle' || S === 'down' || S === 'thrown' || S === 'locked' || S === 'lose' || S === 'timeout') return 'hurt';
    if (S === 'win') return 'happy';
    if (S === 'block' || this.guarding) return 'strain';
    if (S === 'attack' || S === 'throwing' || S === 'superlock' || S === 'dash') return 'angry';
    return 'normal';
  }
  draw(ctx, g) {
    let x = this.x;
    if (this.hitstop > 0 && this.shakeT > 0) x += (g.frame % 2 ? 1 : -1) * 3;
    const pose = this.currentPose(g.frame);
    let glow = null;
    if (this.state === 'attack' && this.move && this.move.super) glow = this.def.specials.super.fx;
    const expr = this.exprNow();
    this._holder = this._holder || {};
    drawFighterRig(ctx, this.def, x, this.y, this.drawFacing, pose, { t: g.frame + this.side * 37, expr, flash: this.flash, alpha: this.alpha, glow, holder: this._holder, prev: this._holder.prev });
  }
}

// ---------- combat resolution (called by the fight scene) ----------
function resolveCombat(g) {
  const [a, b] = g.fighters;
  const results = [];
  for (const [att, def] of [[a, b], [b, a]]) {
    const hb = att.hitbox();
    if (!hb) continue;
    if (def.inv > 0 || def.state === 'thrown' || def.state === 'ko' || def.state === 'down' || def.state === 'getup' || def.koed) continue;
    if (def.state === 'juggle' && def.juggles >= 3) continue;
    const hurts = def.hurtboxes();
    if (hurts.some(h => rectsHit(hb, h))) results.push([att, def, hb, att.move]);
  }
  for (const [att, def, hb, mv] of results) applyHit(g, att, def, mv, hb, null);
  // projectiles
  for (const p of g.projs) {
    if (!p.active || p.rehit > 0) continue;
    const box = p.box();
    // projectile vs projectile
    if (!p.beam && !p.isSuper) {
      for (const q of g.projs) {
        if (q === p || q.owner === p.owner || !q.active || q.beam) continue;
        if (rectsHit(box, q.box())) {
          p.hits--; q.hits -= q.isSuper ? 0 : 1;
          g.addPart({ type: 'burst', x: (p.x + q.x) / 2, y: (p.y + q.y) / 2, life: 14, col: '#fff', size: 50, rot: rand(0, 3) });
          Sound.play('block');
          if (p.hits <= 0) { p.dead = true; }
          if (q.hits <= 0) { q.dead = true; }
        }
      }
      if (p.dead) continue;
    }
    const def = p.owner.opp;
    if (def.inv > 0 || def.state === 'thrown' || def.state === 'ko' || def.state === 'down' || def.state === 'getup' || def.koed) continue;
    if (def.state === 'juggle' && def.juggles >= 3 && !p.isSuper) continue;
    if (def.hurtboxes().some(h => rectsHit(box, h))) {
      p.hits--;
      const final = p.hits <= 0;
      const mv = { dmg: p.dmg, hs: p.hs, bs: p.bs, hit: p.hit, push: p.push, chip: p.chip, guard: p.guard, special: 1, proj: 1, kd: final && p.kdFinal, launch: [3, -8], super: p.isSuper };
      applyHit(g, p.owner, def, mv, box, p);
      p.rehit = p.interval;
      if (final) {
        p.dead = true;
        if (!p.beam) g.addPart({ type: 'flash', x: p.x, y: p.y, life: 12, col: p.col || '#fff', size: 60 });
      }
    }
  }
  for (const p of g.projs) if (p.dead && !p.counted) { p.counted = true; if (!p.beam && p.type !== 'star' && p.type !== 'tsunami' && p.delay <= 0) p.owner.proj = Math.max(0, p.owner.proj - 1); }
  g.projs = g.projs.filter(p => !p.dead);
}

function applyHit(g, att, def, mv, hb, proj) {
  const srcX = proj ? proj.x - (proj.vx || 0) * 10 : att.x;
  const hx = clamp(proj ? (proj.beam ? def.x - att.facing * 10 : proj.x) : (att.facing > 0 ? Math.min(hb.x + hb.w, def.x + 10) : Math.max(hb.x, def.x - 10)), def.x - 40, def.x + 40);
  const hy = clamp(hb.y + hb.h / 2, def.y - 190 * def.s, def.y - 20);
  const awayDir = sign(def.x - (proj ? srcX : att.x)) || att.facing;
  if (!proj) { att.contact = true; att.hitCount++; att.rehit = mv.rehit || 99; }
  const blocked = !(def.state === 'juggle' || def.state === 'locked') && def.canBlockAttack(mv.guard || 'mid', srcX);
  const special = !!mv.special;
  if (blocked) {
    def.state = 'block'; def.t = 0; def.stun = mv.bs; def.blockLow = def.inp.dir <= 3; def.move = null; def.vx = 0;
    def.pushV = awayDir * (mv.push || 6) * 1.1;
    const chip = special ? Math.round(mv.dmg * (mv.chip || 0.25)) : 0;
    if (chip) { def.hp = Math.max(mv.super ? 0 : (def.hp > chip ? 1 : 0), def.hp - chip); }
    g.hitstop(Math.round((mv.hit || 8) * 0.7), att, def);
    g.addPart({ type: 'ring', x: hx, y: hy, life: 12, col: '#7FD0FF', size: 26 });
    for (let i = 0; i < 6; i++) g.addPart({ type: 'spark', x: hx, y: hy, vx: -awayDir * rand(-1, 5) * -1, vy: rand(-5, 5), life: 10, col: '#BFE6FF', size: 2.5 });
    Sound.play('block');
    att.meter = Math.min(100, att.meter + 3); def.meter = Math.min(100, def.meter + 2);
    if (!proj) {
      // attacker pushback near wall
      if (def.x <= g.camX + 42 || def.x >= g.camX + W - 42) att.pushV = -awayDir * (mv.push || 6) * 0.9;
    }
    if (def.hp <= 0) { def.koed = true; def.state = 'juggle'; def.vx = awayDir * 4; def.vy = -8; g.onKO(att, def); }
    return;
  }
  // ---- clean hit
  let dmg = mv.rush ? Math.round(mv.dmg * 0.1) : mv.dmg;
  def.combo++;
  att.stats.maxCombo = Math.max(att.stats.maxCombo, def.combo);
  let counter = false;
  if (def.state === 'attack' && def.move && def.mt <= def.move.su && !proj) { counter = true; }
  const scale = def.combo <= 2 ? 1 : Math.max(mv.super ? 0.5 : 0.3, 1 - (def.combo - 2) * 0.1);
  dmg = Math.round(dmg * scale * (counter ? 1.2 : 1));
  def.hp = Math.max(0, def.hp - dmg);
  att.stats.dmg += dmg; att.stats.hits++;
  att.meter = Math.min(100, att.meter + (mv.super ? 0 : special ? 6 : 4));
  def.meter = Math.min(100, def.meter + 3);
  def.flash = 3;
  def.move = null; def.airMove = false; def.alpha = 1; def.lock = null; def.vx = 0;
  if (def.grab) { def.grab = null; }
  const heavy = (mv.hit || 8) >= 10 || special;
  g.hitstop(mv.hit || 8, att, def);
  def.shakeT = mv.hit || 8;
  // effects
  const col = special ? (att.def.specials.super.fx || att.def.color) : heavy ? '#FFD34D' : '#FFFFFF';
  g.addPart({ type: 'burst', x: hx, y: hy, life: heavy ? 12 : 9, col, size: heavy ? 58 : 38, rot: rand(0, 3) });
  g.addPart({ type: 'ring', x: hx, y: hy, life: 14, col: '#fff', size: heavy ? 46 : 28 });
  for (let i = 0; i < (heavy ? 10 : 5); i++) g.addPart({ type: 'spark', x: hx, y: hy, vx: awayDir * rand(1, 9), vy: rand(-7, 5), life: 12, col: i % 2 ? '#fff' : col, size: heavy ? 4 : 3 });
  Sound.play(special ? 'special' : heavy ? 'heavy' : 'light');
  if (counter) { Sound.play('counter'); g.addPart({ type: 'text', x: def.x, y: def.y - 220, text: 'COUNTER!', col: '#FF5A5A', life: 45, size: 24 }); }
  g.shake = Math.max(g.shake, heavy ? (mv.super ? 12 : 7) : 3);
  g.comboShow(att, def.combo);
  // rush super: lock into cinematic flurry
  if (mv.rush && !proj && def.hp > 0) {
    att.state = 'superlock'; att.t = 0; att.vx = 0; att.lock = { t: 0, n: 0, dmg: mv.dmg - dmg };
    def.state = 'locked'; def.t = 0; def.vx = 0; def.pushV = 0; def.y = GROUND;
    return;
  }
  const wasAir = def.isAir;
  const knock = mv.kd || (mv.kdLast && att.hitCount >= (mv.hits || 1)) || wasAir || def.hp <= 0;
  if (knock) {
    const L = mv.launch || [3, -7];
    def.state = 'juggle'; def.t = 0;
    def.vx = awayDir * Math.abs(L[0]);
    def.vy = wasAir && def.state === 'juggle' ? Math.min(def.vy, L[1] * 0.7) : L[1];
    if (wasAir) def.vy = Math.min(-5, L[1] * 0.75);
    def.juggles = (def.juggles || 0) + (wasAir ? 1 : 0);
    def.bounced = false;
    def.y = Math.min(def.y, GROUND - 1);
  } else {
    def.state = 'hit'; def.t = 0;
    def.stun = (mv.hs || 15) + (counter ? 4 : 0);
    def.hitPose = (mv.guard === 'low' || hy > def.y - 100 * def.s) ? 'hitLow' : 'hitHigh';
    def.pushV = awayDir * (mv.push || 6);
    if (!proj && (def.x <= g.camX + 42 || def.x >= g.camX + W - 42)) att.pushV = -awayDir * (mv.push || 6) * 0.9;
  }
  if (def.hp <= 0) { def.koed = true; if (def.state !== 'juggle') { def.state = 'juggle'; def.vx = awayDir * 4; def.vy = -9; } g.onKO(att, def); }
}

// ---------- Sprite pre-baking ----------
// Animation is made of discrete frames, so every frame a fighter can show can be enumerated and baked
// in the background (VS screen / round intro) instead of during combat.
// Release builds ship every frame pre-rendered (tools/bake.js); load those sheets instead of baking.
function loadPrebaked(def) {
  const P = typeof window !== 'undefined' && window.TF_PREBAKED;
  if (!P || !P.chars[def.id]) return false;
  const src = P.chars[def.id];
  const A = def._atlas || (def._atlas = { map: new Map(), sheets: [] });
  const imgs = src.sheets.map(b64 => { const im = new Image(); im.src = 'data:' + P.mime + ';base64,' + b64; return im; });
  const ready = imgs.map(im => (im.decode ? im.decode() : Promise.resolve()).catch(() => {}));
  Promise.all(ready).then(() => {
    for (const k in src.entries) {
      if (A.map.has(k)) continue;
      const e = src.entries[k];
      A.map.set(k, { c: imgs[e[0]], sx: e[1], sy: e[2], sw: e[3], sh: e[4], left: e[5], top: e[6] });
    }
  });
  return true;
}
// HD: bake the loops a fighter spends most of its time in (idle, walk, guard, hits) at the screen's resolution
function enqueueWarmHD(def) {
  const hs = hdBucket(Render.px || 1);
  if (def._warmedHD === hs) return;
  def._warmedHD = hs;
  const Q = n => poseOf(def, n), jobs = [];
  const add = (pose, expr, t) => jobs.push(() => { Render.bakeBudget = 1; hdSprite(def, pose, { t: t || 50, expr }, hs); });
  jobs.push(() => hdCalibrate(def));
  const idleN = idleCycle(def), walkN = walkCycle(def);
  for (let t = 0; t < idleN; t += 4) add(idlePose(t, def), 'normal');
  for (const dir of [1, -1]) for (let t = 0; t < walkN; t += 2) add(walkPose(t, dir, 1, def), 'normal');
  add(Q('crouch'), 'normal'); add(Q('block'), 'strain'); add(Q('cblock'), 'strain'); add(Q('jump'), 'normal'); add(Q('jumpUp'), 'normal'); add(Q('land'), 'normal');
  for (const h of ['hitHigh', 'hitLow', 'hitCrouch']) add(Q(h), 'hurt');
  add(idlePose(0, def), 'normal', 3);
  Render.warmQ.push(...jobs);
}
function enqueueWarm(def) {
  if (!pixelMode()) { enqueueWarmHD(def); return; }
  if (def._warmed) return;
  def._warmed = true;
  if (loadPrebaked(def)) return;
  const f = new Fighter(def, 0);
  const seen = new Set(), jobs = [];
  const add = (face, pose, expr, extra) => {
    const o = Object.assign({ t: 50, expr }, extra);
    const k = poseKey(quantizePose(pose)) + expr + JSON.stringify(extra || '');
    if (seen.has(k)) return;
    seen.add(k);
    jobs.push(() => atlasSprite(def, face, pose, o));
  };
  const glow = def.specials.super.fx;
  const Q = n => poseOf(def, n);
  for (const face of [1]) {
    // full idle / walk loops for this fighter's own animation rates
    const idlePeriod = idleCycle(def), walkPeriod = walkCycle(def);
    for (let t = 0; t < idlePeriod; t += 4) { add(face, idlePose(t, def), 'normal'); add(face, idlePose(t, def), 'normal', { t: 3 }); }
    for (let k = 0; k <= 3; k++) add(face, lerpPose(Q('land'), Q('stance'), k / 3), 'normal');
    for (const dir of [1, -1]) for (let t = 0; t < walkPeriod; t += 2) { add(face, walkPose(t, dir, 1, def), 'normal'); add(face, walkPose(t, dir, 1, def), 'normal', { t: 3 }); }
    for (let k = 0; k <= 4; k++) add(face, lerpPose(Q('stance'), Q('taunt'), k / 4), 'normal');
    for (let k = 1; k <= 3; k++) add(face, lerpPose(Q('stance'), Q('crouch'), k / 3), 'normal');
    add(face, Q('crouch'), 'normal'); add(face, Q('block'), 'strain'); add(face, Q('cblock'), 'strain');
    add(face, Q('jump'), 'normal'); add(face, Q('jumpUp'), 'normal'); add(face, Q('land'), 'normal');
    for (const h of ['hitHigh', 'hitLow', 'hitCrouch']) { add(face, Q(h), 'hurt'); add(face, Q(h), 'hurt', { flash: 1 }); }
    for (let r = 0; r >= -80; r -= 10) add(face, Object.assign({}, Q('juggle'), { rot: r }), 'hurt', { flash: 1 });
    for (let r = 0; r <= 360; r += 10) for (const sg of [1, -1]) add(face, Object.assign({}, Q('tuck'), { rot: sg * r }), 'normal');
    for (let r = 0; r >= -80; r -= 10) add(face, Object.assign({}, Q('juggle'), { rot: r }), 'hurt');
    for (let k = 0; k <= 4; k++) { add(face, lerpPose(Q('down'), Q('getup'), k / 4), 'hurt'); add(face, lerpPose(Q('down'), Q('getup'), k / 4), 'normal'); }
    add(face, Q('down'), 'hurt'); add(face, Q('down'), 'ko');
    // throws, command grabs, round-end poses
    for (let r = 0; r >= -180; r -= 10) add(face, Object.assign({}, Q('hitHigh'), { rot: r, fit: 0 }), 'hurt');
    for (const p of ['lift', 'slam', 'throwSwing']) add(face, Q(p), 'angry');
    add(face, Q('grab')[1], 'angry'); add(face, Q('straight')[1], 'angry');
    add(face, Q('win'), 'happy'); add(face, Q('lose'), 'hurt');
    for (const p of ['flurryA', 'flurryB', 'flurryC']) add(face, Q(p), 'angry');
    const moves = Object.keys(NORMALS).map(k => () => f.normal(k));
    for (const k of ['qcf', 'dp', 'qcb', 'super']) for (const h of [0, 1]) moves.push(() => f.special(k, h));
    for (const mk of moves) {
      const m = mk();
      f.move = m; f.facing = 1;
      for (let mt = 0; mt <= m.su + m.ac + (m.rc || 0) + 1; mt++) {
        f.mt = mt;
        for (const vy of (m.kind === 'rise' ? [0, 2.7, 5.4, 8] : [0])) {
          f.vy = vy;
          const ex = m.super ? { glow } : undefined;
          add(face, f.attackPose(0), 'angry', ex);
          if (m.flip || (m.sp && m.sp.spin)) add(-face, f.attackPose(0), 'angry', ex);
        }
      }
    }
  }
  f.move = null;
  Render.warmQ.push(...jobs);
}

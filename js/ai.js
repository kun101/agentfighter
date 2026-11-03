'use strict';
// ---------- CPU opponent ----------
const AI_LEVELS = [
  { name: 'EASY', react: 28, block: 0.15, antiAir: 0.08, punish: 0.1, aggro: 0.3, combo: 0.2, proj: 0.2, tech: 0.05, jumpProj: 0.15, whiff: 0.3, think: 22, idle: 0.4 },
  { name: 'NORMAL', react: 16, block: 0.45, antiAir: 0.35, punish: 0.4, aggro: 0.5, combo: 0.5, proj: 0.4, tech: 0.25, jumpProj: 0.4, whiff: 0.12, think: 14, idle: 0.12 },
  { name: 'HARD', react: 10, block: 0.75, antiAir: 0.7, punish: 0.75, aggro: 0.6, combo: 0.85, proj: 0.5, tech: 0.5, jumpProj: 0.6, whiff: 0.04, think: 9, idle: 0.04 },
  { name: 'BRUTAL', react: 6, block: 0.9, antiAir: 0.9, punish: 0.95, aggro: 0.7, combo: 1, proj: 0.55, tech: 0.75, jumpProj: 0.75, whiff: 0, think: 6, idle: 0 },
];

class CPU {
  constructor(me, level) {
    this.me = me;
    this.setLevel(level);
    this.mem = [];
    this.plan = []; this.planStep = 0;
    this.hold = 5; this.holdT = 0;
    this.threatId = -1; this.defend = false;
    this.aaId = -1; this.doAA = false;
    this.techChecked = false;
    this.cool = 0;
    this.mode = 'neutral';
  }
  setLevel(level) {
    const i = Math.floor(clamp(level, 0, 3)), f = clamp(level - i, 0, 1);
    const a = AI_LEVELS[i], b = AI_LEVELS[Math.min(3, i + 1)];
    this.L = {};
    for (const k in a) this.L[k] = typeof a[k] === 'number' ? lerp(a[k], b[k], f) : a[k];
    this.L.react = Math.round(this.L.react);
  }
  snapshot(o, g) {
    const m = o.move;
    let projNear = null;
    for (const p of g.projs) {
      if (p.owner !== o || !p.active) continue;
      const d = Math.abs(p.x - this.me.x);
      if (sign(this.me.x - p.x) === sign(p.vx || o.facing) && (!projNear || d < projNear.d)) projNear = { d, x: p.x, vx: p.vx, beam: p.beam, y: p.y };
    }
    return {
      x: o.x, y: o.y, vx: o.vx, vy: o.vy, state: o.state, air: o.isAir,
      attacking: o.state === 'attack' && m && o.mt <= m.su + m.ac,
      recovering: o.state === 'attack' && m && !m.air && m.kind !== 'rise' ? Math.max(0, m.su + m.ac + m.rc - o.mt) : (o.state === 'land' ? o.landRec : 0),
      guard: m ? m.guard : 'mid', moveId: m ? m.id : -1, reach: m && m.box ? Math.abs(m.box[0]) + m.box[2] : 120,
      projNear, down: o.state === 'down' || o.state === 'getup', juggle: o.state === 'juggle', blocking: o.state === 'block',
      jumpId: o.state === 'air' ? (o.jumpStamp || (o.jumpStamp = g.frame)) : -1,
    };
  }
  blockDir(low, srcX) {
    // relative direction that holds away from srcX
    const me = this.me;
    const away = sign(me.x - srcX);
    const back = away === -me.facing; // away equals my back
    if (back) return low ? 1 : 4;
    return low ? 3 : 6;
  }
  think(g) {
    const me = this.me, o = me.opp, L = this.L;
    const out = { dir: 5, press: {}, req: null };
    if (o.state !== 'air') o.jumpStamp = 0;
    this.mem.push(this.snapshot(o, g));
    if (this.mem.length > 40) this.mem.shift();
    const p = this.mem[Math.max(0, this.mem.length - 1 - L.react)];
    const now = this.mem[this.mem.length - 1];
    const dist = Math.abs(o.x - me.x);
    if (this.cool > 0) this.cool--;

    // thrown → maybe tech
    if (me.state === 'thrown') {
      if (!this.techChecked) { this.techChecked = true; this.willTech = chance(L.tech); }
      if (this.willTech && me.t >= 3) out.tech = true;
      return out;
    } else this.techChecked = false;

    // keep blocking while in blockstun
    if (me.state === 'block') { out.dir = this.blockDir(me.blockLow, o.x); return out; }

    // combo plan execution
    if (this.plan.length) {
      const next = this.plan[0];
      const cl = me.cancelLevel();
      const actionable = me.state === 'stand' || me.state === 'crouch';
      if (me.state === 'attack' && me.move) {
        const m = me.move;
        if (me.contact && cl > 0) {
          // opponent blocked? stop if next is super/unsafe and we are not punishing
          if (o.state === 'block' && (next === 'super' || (next[0] !== 'q' && next[0] !== 'd' && chance(0.5)))) { this.plan = []; }
          else if (chance(L.combo) || this.planStarted) {
            if (me.mt >= m.su + 1) { out.req = next; this.plan.shift(); this.planStarted = true; }
          } else this.plan = [];
        } else if (me.mt > m.su + m.ac + 2 && !me.contact) this.plan = [];
        if (next && next[0] === 'c') out.dir = 2;
        return out;
      }
      if (actionable && !this.planStarted) {
        out.req = next; this.plan.shift(); this.planStarted = true;
        if (next[0] === 'c') out.dir = 2;
        return out;
      }
      if (actionable) this.plan = [];
    }
    this.planStarted = false;

    if (me.state === 'air') {
      // air attack timing
      if (!me.airAttacked && me.vy > 0 && dist < 120 && Math.abs(o.y - me.y) < 120 && GROUND - me.y < 130) out.req = chance(.5) ? 'jHK' : 'jHP';
      return out;
    }
    if (!(me.state === 'stand' || me.state === 'crouch' || me.state === 'land')) return out;

    // ---- defense
    const threatAttack = p.attacking && dist < p.reach + 70 && !p.air;
    const airThreat = p.air && dist < 190 && Math.abs(o.vx) > 0.5 && sign(me.x - o.x) === sign(o.vx);
    const projThreat = p.projNear && p.projNear.d < 230 && !p.projNear.beam;
    const beamThreat = now.projNear && now.projNear.beam;
    if (airThreat || (now.air && dist < 140)) {
      if (this.aaId !== now.jumpId) { this.aaId = now.jumpId; this.doAA = chance(L.antiAir); this.aaBlock = chance(L.block); }
      if (this.doAA && o.y < GROUND - 50 && dist < 170 && o.vy > -4) {
        out.req = chance(.6) && me.canUse('dp') ? 'dpH' : 'cHP';
        this.doAA = false;
        return out;
      }
      if (this.aaBlock) { out.dir = this.blockDir(false, o.x); return out; }
    }
    if (threatAttack || projThreat || beamThreat) {
      const id = threatAttack ? p.moveId : -2 - Math.floor((p.projNear ? p.projNear.x : 0) / 400);
      if (this.threatId !== id) {
        this.threatId = id;
        this.defend = chance(L.block);
        this.jumpOver = projThreat && p.projNear.d > 140 && chance(L.jumpProj);
      }
      if (projThreat && this.jumpOver && now.projNear && now.projNear.d < 200 && now.projNear.d > 90) {
        out.dir = sign(o.x - me.x) === me.facing ? 9 : 7; this.jumpOver = false; return out;
      }
      if (this.defend || beamThreat) {
        const low = threatAttack ? p.guard === 'low' : false;
        const src = threatAttack ? o.x : (now.projNear ? now.projNear.x : o.x);
        out.dir = this.blockDir(p.guard === 'high' ? false : low, src);
        return out;
      }
    }

    // ---- punish recovery
    if (now.recovering > 9 && dist < 150 && (now.state === 'attack' || now.state === 'land')) {
      if (this.punishId !== now.moveId) { this.punishId = now.moveId; this.doPunish = chance(L.punish); }
      if (this.doPunish) { this.startCombo(dist, true); return this.think2(out); }
    }

    // ---- neutral decision
    if (this.holdT > 0) { this.holdT--; out.dir = this.hold; return out; }
    if (chance(L.idle)) { this.setHold(chance(.5) ? 5 : 4, randi(15, 40)); return this.think2(out); }
    const r = Math.random();
    const meterUp = me.meter >= 100;
    // archetype personality: zoners keep away and fire, rushdown/grapplers close in, grapplers grab
    const P_ = me.def.ai || {};
    const aggro = L.aggro * (P_.aggro || 1), projP = Math.min(0.9, L.proj * (P_.proj || 1));
    if (P_.keepAway && dist < 200 && !now.down && chance(0.14)) {
      if (chance(0.25)) { out.dir = 7; return out; }
      this.setHold(4, randi(10, 22)); return this.think2(out);
    }
    if (P_.grab && dist < 85 && me.canUse('qcb') && chance(0.08 * P_.grab)) { out.req = chance(.5) ? 'qcb' : 'qcbH'; return out; }
    if (now.down) {
      // walk up for meaty / or wait
      if (dist > 110) this.setHold(6, 10); else this.setHold(chance(.5) ? 5 : 2, 10);
      return this.think2(out);
    }
    if (dist > 360) {
      if (r < projP && me.canUse('qcf') && this.cool <= 0) { out.req = chance(.5) ? 'qcfH' : 'qcf'; this.cool = P_.keepAway ? 44 : 50; return out; }
      if (r < projP + aggro * 0.5) this.setHold(P_.keepAway ? 5 : 6, randi(14, 30));
      else if (r < projP + aggro * 0.5 + 0.12) { out.dir = 9; return out; }
      else this.setHold(chance(.3) ? 4 : 5, randi(8, 20));
    } else if (dist > 170) {
      if (r < projP * 0.6 && me.canUse('qcf') && this.cool <= 0) { out.req = 'qcf'; this.cool = P_.keepAway ? 44 : 50; return out; }
      if (r < 0.15 * aggro + projP * 0.6) { out.dir = 9; return out; }
      if (r < 0.65) this.setHold(6, randi(8, 20));
      else if (r < 0.75) { out.req = chance(.5) ? 'cHK' : 'sHK'; return out; }
      else if (r < 0.82 && this.cool <= 0) { out.req = chance(.5) ? 'qcbH' : 'qcb'; this.cool = 40; return out; }
      else if (meterUp && r < 0.86) { out.req = 'super'; return out; }
      else this.setHold(chance(.5) ? 4 : 5, randi(10, 22));
    } else {
      // close range
      if (r < 0.22 * aggro + 0.12) { this.startCombo(dist, false); return this.think2(out); }
      if (r < 0.33 + (P_.grab ? 0.08 : 0) && dist < 80) { out.req = 'throw'; return out; }
      if (r < 0.48) { out.req = choice(['cLK', 'sLP', 'cLP', 'sLK']); return out; }
      if (r < 0.55 && meterUp) { out.req = 'super'; return out; }
      if (r < 0.62 && chance(L.whiff + 0.1)) { out.req = choice(['sHK', 'sHP', 'cHK']); return out; }
      if (r < 0.72) { this.setHold(chance(.5) ? 1 : 4, randi(10, 24)); }
      else if (r < 0.8) { out.dir = chance(.5) ? 9 : 8; return out; }
      else this.setHold(5, randi(6, 16));
    }
    return this.think2(out);
  }
  think2(out) {
    if (this.plan.length && !out.req) {
      const me = this.me;
      if (me.state === 'stand' || me.state === 'crouch') { const nx = this.plan.shift(); out.req = nx; this.planStarted = true; if (nx[0] === 'c') out.dir = 2; return out; }
    }
    if (this.holdT > 0) { out.dir = this.hold; this.holdT--; }
    return out;
  }
  setHold(d, t) { this.hold = d; this.holdT = t; }
  startCombo(dist, punish) {
    const me = this.me, meter = me.meter >= 100;
    const enders = ['qcfH', 'dpH', 'qcbH'];
    let ender = choice(enders);
    if (me.def.specials.qcb.kind === 'teleport') ender = choice(['qcfH', 'dpH']);
    if (me.def.specials.qcb.kind === 'cmdgrab' && dist < 80 && !punish) { this.plan = ['qcbH']; return; }
    if (!me.canUse('qcf') && ender === 'qcfH') ender = 'dpH';
    const lows = [['cLK', 'cLP', ender], ['cLP', 'cLK', ender], ['sLP', 'sLP', ender], ['sLK', 'sHP', ender], ['cLK', 'cHP', ender], ['sLP', 'sHK'], ['cLK', 'cHK']];
    let p = choice(lows);
    if (dist > 110) p = choice([['sHP', ender], ['cHK'], ['sHK'], ['sLK', 'sHP', ender]]);
    if (meter && chance(0.65)) p = p.slice(0, -1).concat(['super']);
    this.plan = p.slice();
  }
}

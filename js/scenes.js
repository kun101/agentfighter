'use strict';
// ---------- Scenes ----------
const Game = {
  scene: null, t: 0, flashT: 0,
  go(scene) { this.scene = scene; if (scene.enter) scene.enter(); },
};
const DIFF_NAMES = ['EASY', 'NORMAL', 'HARD', 'BRUTAL'];

// ============ TITLE ============
class TitleScene {
  constructor() { this.t = 0; }
  enter() { Sound.playMusic('title'); }
  update() {
    this.t++;
    if (this.t > 60 * 25) {
      const a = choice(PLAYABLE()), b = choice(ROSTER.filter(c => c !== a && !c.boss));
      Game.go(new FightScene(a, b, b.stage, { mode: 'versus', demo: true, level: 2, level1: 2, onEnd: () => Game.go(new TitleScene()) }));
      return;
    }
    if (this.t > 5 && (Input.confirm() || Input.pressed('start') || Input.pressed('confirm'))) {
      Sound.init(); Sound.playMusic('select'); Sound.play('confirm');
      Sound.say('Tech Fighter! Battle of the bots!', { pitch: 0.5 });
      Game.go(new MenuScene());
    }
  }
  draw(ctx) {
    const t = this.t;
    drawMenuBg(ctx, t, '#0A0520', '#3A0A2A');
    // radial burst
    ctx.save(); ctx.translate(W / 2, 200);
    for (let i = 0; i < 18; i++) {
      ctx.rotate(Math.PI * 2 / 18);
      ctx.fillStyle = i % 2 ? 'rgba(255,120,40,.07)' : 'rgba(120,80,255,.06)';
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(700, -60 + Math.sin(t * .01) * 20); ctx.lineTo(700, 60); ctx.fill();
    }
    ctx.restore();
    // mascot parade
    const list = ROSTER.filter(c => !c.boss);
    list.forEach((c, i) => {
      const a = (i / list.length) * Math.PI * 2 + t * 0.008;
      const x = W / 2 + Math.cos(a) * 380, y = 330 + Math.sin(a) * 60;
      const sc = 0.75 + (Math.sin(a) + 1) * 0.25;
      ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
      ctx.globalAlpha = 0.55 + (Math.sin(a) + 1) * 0.22;
      drawHeadArt(ctx, c, 34, 'normal', t + i * 40, false);
      ctx.restore();
    });
    drawLogo(ctx, W / 2, 210, 1.0, t);
    if (TOUCH_ONLY && !Input.padConnected) txt(ctx, 'Connect a keyboard or gamepad to play', W / 2, 490, { size: 18, align: 'center', color: '#FFC233', stroke: '#000', sw: 4, font: FONT_UI });
    if ((t % 60) < 40) txt(ctx, Input.device === 'gamepad' ? 'PRESS START' : 'PRESS ENTER', W / 2, 450, { size: 30, align: 'center', color: '#fff', stroke: '#000', sw: 6, italic: true });
    txt(ctx, 'A fan-made parody fighting game · v1.0 · Not affiliated with any AI company', W / 2, H - 14, { size: 12, align: 'center', color: 'rgba(255,255,255,.55)', font: FONT_UI, weight: 600 });
  }
}

// ============ MAIN MENU ============
class MenuScene {
  constructor(sel) { this.t = 0; this.sel = sel || 0; this.showcase = choice(ROSTER.filter(c => !c.boss)); }
  enter() { Sound.playMusic('select'); }
  get items() {
    return [
      { label: 'ARCADE', desc: 'Fight through every bot and face the final boss.' },
      { label: 'VERSUS CPU', desc: 'Pick your fighter, your opponent, and go.' },
      { label: 'TRAINING', desc: 'Practice combos against a dummy. No timer, infinite health.' },
      { label: 'HOW TO PLAY', desc: 'Controls, system mechanics and full move lists.' },
      { label: 'OPTIONS', desc: 'Difficulty, rounds, timer, audio and more.' },
      { label: 'CREDITS', desc: 'Who made this.' },
    ];
  }
  update() {
    this.t++;
    const n = this.items.length;
    if (Input.menuY()) { this.sel = (this.sel + Input.menuY() + n) % n; Sound.play('cursor'); }
    if (this.t % 300 === 0) this.showcase = choice(ROSTER.filter(c => !c.boss && c !== this.showcase));
    if (Input.back()) { Sound.play('back'); Game.go(new TitleScene()); return; }
    if (Input.confirm()) {
      Sound.play('confirm');
      const s = this.sel;
      if (s === 0) Game.go(new SelectScene('arcade'));
      else if (s === 1) Game.go(new SelectScene('versus'));
      else if (s === 2) Game.go(new SelectScene('training'));
      else if (s === 3) Game.go(new HowToScene(() => Game.go(new MenuScene(3))));
      else if (s === 4) Game.go(new OptionsScene(() => Game.go(new MenuScene(4))));
      else if (s === 5) Game.go(new CreditsScene());
    }
  }
  draw(ctx) {
    const t = this.t;
    drawMenuBg(ctx, t);
    // showcase fighter
    const d = this.showcase;
    ctx.save();
    ctx.globalAlpha = 0.25; ctx.fillStyle = d.color;
    ctx.beginPath(); ctx.moveTo(W * 0.55, 0); ctx.lineTo(W, 0); ctx.lineTo(W, H); ctx.lineTo(W * 0.45, H); ctx.fill();
    ctx.restore();
    ctx.save(); ctx.translate(700, 450); ctx.scale(1.45, 1.45);
    drawFighterRig(ctx, d, 0, 0, -1, idlePose(t, d), { t, groundY: 0 });
    ctx.restore();
    txt(ctx, d.name, 930, 480, { size: 44, align: 'right', color: '#fff', stroke: '#000', sw: 8, italic: true });
    txt(ctx, d.title, 930, 506, { size: 18, align: 'right', color: d.color, stroke: '#000', sw: 4, italic: true });
    drawLogo(ctx, 250, 92, 0.48, t);
    menuList(ctx, this.items, this.sel, 250, 200, { gap: 48, w: 360 });
    panel(ctx, 40, 482, 420, 40);
    txt(ctx, this.items[this.sel].desc, 250, 508, { size: 15, align: 'center', color: '#E8E4FF', font: FONT_UI, weight: 600 });
    const p = Progress;
    txt(ctx, `Record  ${p.wins}W - ${p.losses}L   ·   Difficulty ${DIFF_NAMES[Settings.difficulty]}`, 900, H - 14, { size: 13, align: 'right', color: 'rgba(255,255,255,.6)', font: FONT_UI, weight: 600 });
  }
}

// ============ CHARACTER SELECT ============
class SelectScene {
  constructor(mode, preset) {
    this.mode = mode; this.t = 0;
    this.tiles = ROSTER.map(c => ({ def: c }));
    this.tiles.push({ random: true });
    this.cols = this.tiles.length;
    this.cur = [preset && preset.p1i != null ? preset.p1i : 0, 1];
    this.phase = 0; // 0 = player picks, 1 = cpu/dummy pick
    this.picked = [null, null];
    this.lockT = 0;
    this.stageSel = 0;
  }
  enter() { Sound.playMusic('select'); }
  tileDef(i) {
    const tl = this.tiles[i];
    if (tl.random) return null;
    return tl.def;
  }
  update() {
    this.t++;
    if (this.lockT > 0) { if (--this.lockT === 0) this.finish(); return; }
    const c = this.phase, n = this.tiles.length;
    let i = this.cur[c];
    const mx = Input.menuX(), my = Input.menuY();
    if (mx) { const row = Math.floor(i / this.cols); i = row * this.cols + ((i % this.cols) + mx + this.cols) % this.cols; }
    if (my) { i = (i + my * this.cols + n) % n; }
    if (i !== this.cur[c]) { this.cur[c] = i; Sound.play('cursor'); }
    if (Input.back()) {
      Sound.play('back');
      if (this.phase === 1) { this.phase = 0; this.picked[0] = null; }
      else Game.go(new MenuScene(this.mode === 'arcade' ? 0 : this.mode === 'versus' ? 1 : 2));
      return;
    }
    if (Input.confirm()) {
      const tl = this.tiles[this.cur[c]];
      if (tl.locked) { Sound.play('back'); return; }
      let def = tl.random ? choice(PLAYABLE()) : tl.def;
      if (this.phase === 1 && tl.random) def = choice(ROSTER);
      this.picked[c] = def;
      enqueueWarm(def);
      Sound.play('confirm');
      Sound.say(def.name.replace(/\./g, ' '), { pitch: 0.5 });
      if (this.mode === 'arcade' || this.phase === 1) this.lockT = 50;
      else { this.phase = 1; this.cur[1] = this.tiles.findIndex(x => x.def && x.def !== def && !x.locked); }
    }
  }
  finish() {
    const p1 = this.picked[0];
    if (this.mode === 'arcade') {
      const run = new ArcadeRun(p1);
      run.next();
    } else {
      const p2 = this.picked[1];
      const stage = p2.stage;
      Game.go(new VsScene(p1, p2, stage, { mode: this.mode, level: Settings.difficulty }));
    }
  }
  draw(ctx) {
    const t = this.t;
    drawMenuBg(ctx, t, '#0C0828', '#1E0A30');
    const title = this.mode === 'training' ? (this.phase ? 'SELECT TRAINING DUMMY' : 'TRAINING: SELECT FIGHTER') : this.phase ? 'SELECT YOUR OPPONENT' : 'SELECT YOUR FIGHTER';
    txt(ctx, title, W / 2, 44, { size: 32, align: 'center', color: '#fff', stroke: '#000', sw: 7, italic: true });
    txt(ctx, this.mode.toUpperCase() + (this.mode !== 'training' ? '  ·  ' + DIFF_NAMES[Settings.difficulty] : ''), W / 2, 66, { size: 13, align: 'center', color: '#FFC233', font: FONT_UI, weight: 800 });
    // grid
    const tw = 84, th = 72, gap = 8;
    const gx = W / 2 - (this.cols * (tw + gap) - gap) / 2, gy = 372;
    this.tiles.forEach((tl, i) => {
      const x = gx + (i % this.cols) * (tw + gap), y = gy + Math.floor(i / this.cols) * (th + gap);
      if (tl.random) {
        panel(ctx, x, y, tw, th, '#2A2050');
        txt(ctx, '?', x + tw / 2, y + 54, { size: 44, align: 'center', color: '#FFC233', stroke: '#000', sw: 6 });
        txt(ctx, 'RANDOM', x + tw / 2, y + th - 6, { size: 11, align: 'center', color: '#fff', font: FONT_UI, weight: 800 });
      } else if (tl.locked) {
        panel(ctx, x, y, tw, th, '#100818');
        ctx.save(); ctx.globalAlpha = 0.25; ctx.filter = 'brightness(0)';
        ctx.translate(x + tw / 2, y + th / 2 - 4); drawHeadArt(ctx, tl.def, 22, 'normal', t, false);
        ctx.restore();
        txt(ctx, '???', x + tw / 2, y + th - 6, { size: 11, align: 'center', color: '#888', font: FONT_UI, weight: 800 });
      } else {
        drawPortrait(ctx, tl.def, x, y, tw, th, false, t, 'normal');
        txt(ctx, tl.def.name, x + tw / 2, y + th - 5, { size: 11, align: 'center', color: '#fff', stroke: '#000', sw: 3, font: FONT_UI, weight: 900 });
      }
      for (let c = 0; c < 2; c++) {
        if (this.cur[c] !== i) continue;
        if (c === 1 && this.phase === 0) continue;
        if (c === 0 && this.phase === 1) continue;
        const col = c === 0 ? '#FFC233' : '#FF3B5A';
        const pulse = (Math.sin(t * 0.2) + 1) / 2;
        ctx.strokeStyle = col; ctx.lineWidth = 4 + pulse * 2; rrect(ctx, x - 3, y - 3, tw + 6, th + 6, 10); ctx.stroke();
        txt(ctx, c === 0 ? '1P' : (this.mode === 'training' ? 'DUMMY' : 'CPU'), x + 4, y + 14, { size: 13, color: col, stroke: '#000', sw: 4 });
      }
    });
    // previews
    const showDef = (side) => {
      const c = side;
      let def = this.picked[c] || (this.phase === c ? this.tileDef(this.cur[c]) : null);
      const tl = this.tiles[this.cur[c]];
      if (this.phase === c && tl && tl.locked) def = null;
      return def;
    };
    const left = showDef(0);
    const right = this.mode === 'arcade' ? null : (this.phase >= 1 ? showDef(1) : null);
    this.drawPreview(ctx, left, 150, 1, 0);
    if (this.mode === 'arcade') {
      ctx.save(); ctx.globalAlpha = 0.5;
      txt(ctx, 'CHALLENGERS', 810, 200, { size: 26, align: 'center', color: '#fff', stroke: '#000', sw: 6, italic: true });
      txt(ctx, 'AWAIT...', 810, 232, { size: 26, align: 'center', color: '#FF3B5A', stroke: '#000', sw: 6, italic: true });
      ctx.restore();
    } else this.drawPreview(ctx, right, 810, -1, 1);
    // info panel for active cursor
    const info = this.phase === 0 ? left : right;
    const tl = this.tiles[this.cur[this.phase]];
    panel(ctx, 272, 78, 416, 262);
    if (info) {
      txt(ctx, info.name, 480, 114, { size: 32, align: 'center', color: '#fff', stroke: '#000', sw: 6, italic: true });
      txt(ctx, info.title.toUpperCase() + '  ·  ' + info.archetype, 480, 136, { size: 14, align: 'center', color: info.color, font: FONT_UI, weight: 900 });
      ctx.font = `600 13px ${FONT_UI}`;
      wrapLines(ctx, info.blurb, 380).forEach((l, i) => txt(ctx, l, 480, 158 + i * 17, { size: 13, align: 'center', color: '#E8E4FF', font: FONT_UI, weight: 600 }));
      const b = info.bars;
      statBar(ctx, 'POWER', b.power, 288, 212, '#FF5A3D'); statBar(ctx, 'SPEED', b.speed, 288, 234, '#FFC233');
      statBar(ctx, 'RANGE', b.range, 288, 256, '#7FE3FF'); statBar(ctx, 'DEFENSE', b.defense, 288, 278, '#7BE07B');
      txt(ctx, 'HP ' + info.stats.hp, 288, 318, { size: 12, color: '#aaa', font: FONT_UI, weight: 800 });
      const sp = info.specials;
      [['↓↘→ + P', sp.qcf.name], ['→↓↘ + P', sp.dp.name], ['↓↙← + K', sp.qcb.name], ['↓↘→↓↘→ + P', sp.super.name]].forEach(([m, nm], i) => {
        txt(ctx, nm, 508, 216 + i * 30, { size: 12, color: i === 3 ? '#FFE14D' : '#fff', font: FONT_UI, weight: 800 });
        txt(ctx, m, 508, 231 + i * 30, { size: 13, color: '#BFB8E8', font: FONT_UI, weight: 800 });
      });
    } else if (tl && tl.locked) {
      txt(ctx, 'LOCKED', 480, 200, { size: 36, align: 'center', color: '#888', stroke: '#000', sw: 6, italic: true });
      txt(ctx, 'Clear Arcade mode to unlock this fighter.', 480, 235, { size: 14, align: 'center', color: '#bbb', font: FONT_UI, weight: 600 });
    } else {
      txt(ctx, 'RANDOM', 480, 200, { size: 36, align: 'center', color: '#FFC233', stroke: '#000', sw: 6, italic: true });
      txt(ctx, 'Let fate pick your model.', 480, 235, { size: 14, align: 'center', color: '#bbb', font: FONT_UI, weight: 600 });
    }
    if (this.lockT > 0) { ctx.fillStyle = `rgba(255,255,255,${this.lockT / 50 * .4})`; ctx.fillRect(0, 0, W, H); }
    controlsHint(ctx, 'Move: Arrows / WASD    Confirm: Enter / U / J    Back: Esc');
  }
  drawPreview(ctx, def, x, face, side) {
    if (!def) {
      txt(ctx, '?', x, 260, { size: 120, align: 'center', color: 'rgba(255,255,255,.15)', stroke: 'rgba(0,0,0,.3)', sw: 8 });
      return;
    }
    const picked = !!this.picked[side];
    ctx.save();
    const g = ctx.createRadialGradient(x, 250, 10, x, 250, 170);
    g.addColorStop(0, alpha(def.color, 0.5)); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; circle(ctx, x, 250, 170); ctx.fill();
    ctx.translate(x, 338); ctx.scale(1.08, 1.08);
    const pose = picked ? lerpPose(idlePose(this.t, def), poseOf(def, 'win'), 0.8) : idlePose(this.t, def);
    drawFighterRig(ctx, def, 0, 0, face, pose, { t: this.t, groundY: 0, expr: picked ? 'happy' : 'normal' });
    ctx.restore();
  }
}

// ============ VS SCREEN ============
class VsScene {
  constructor(p1, p2, stage, opts) { this.p1 = p1; this.p2 = p2; this.stage = stage; this.opts = opts; this.t = 0; }
  enter() { Sound.stopMusic(); Sound.play('super'); setTimeout(() => Sound.say(this.p1.name.replace(/\./g, ' ') + ' versus ' + this.p2.name.replace(/\./g, ' '), { pitch: 0.5 }), 200); }
  update() {
    this.t++;
    // bake common sprite frames for both fighters while the VS screen plays
    if (this.t === 1) { enqueueWarm(this.p1); enqueueWarm(this.p2); }
    Render.warmMs = 14;
    if (this.t > 170 || (this.t > 30 && Input.confirm())) Game.go(new FightScene(this.p1, this.p2, this.stage, this.opts));
  }
  draw(ctx) {
    const t = this.t, k = Ease.outCubic(clamp(t / 30, 0, 1));
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    // left slab
    ctx.save();
    ctx.translate(-W * (1 - k), 0);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(W * 0.56, 0); ctx.lineTo(W * 0.44, H); ctx.lineTo(0, H); ctx.closePath();
    const g1 = ctx.createLinearGradient(0, 0, W * .5, H); g1.addColorStop(0, shade(this.p1.color, -.1)); g1.addColorStop(1, shade(this.p1.color, -.7));
    ctx.fillStyle = g1; ctx.fill();
    ctx.clip();
    ctx.translate(230, 515); ctx.scale(1.75, 1.75);
    drawFighterRig(ctx, this.p1, 0, 0, 1, idlePose(t, this.p1), { t, groundY: 0, expr: 'angry', shadow: false });
    ctx.restore();
    // right slab
    ctx.save();
    ctx.translate(W * (1 - k), 0);
    ctx.beginPath(); ctx.moveTo(W * 0.56 + 6, 0); ctx.lineTo(W, 0); ctx.lineTo(W, H); ctx.lineTo(W * 0.44 + 6, H); ctx.closePath();
    const g2 = ctx.createLinearGradient(W, 0, W * .5, H); g2.addColorStop(0, shade(this.p2.color, -.1)); g2.addColorStop(1, shade(this.p2.color, -.7));
    ctx.fillStyle = g2; ctx.fill();
    ctx.clip();
    ctx.translate(730, 515); ctx.scale(1.75, 1.75);
    drawFighterRig(ctx, this.p2, 0, 0, -1, idlePose(t + 30, this.p2), { t, groundY: 0, expr: 'angry', shadow: false });
    ctx.restore();
    // names
    const nk = Ease.outBack(clamp((t - 20) / 25, 0, 1));
    txt(ctx, this.p1.name, 30 - (1 - nk) * 300, 80, { size: 48, color: '#fff', stroke: '#000', sw: 9, italic: true });
    txt(ctx, this.p1.title.toUpperCase(), 32 - (1 - nk) * 300, 106, { size: 16, color: '#FFE9A8', stroke: '#000', sw: 4, italic: true });
    txt(ctx, this.p2.name, W - 30 + (1 - nk) * 300, H - 70, { size: 48, align: 'right', color: '#fff', stroke: '#000', sw: 9, italic: true });
    txt(ctx, this.p2.title.toUpperCase(), W - 32 + (1 - nk) * 300, H - 44, { size: 16, align: 'right', color: '#FFE9A8', stroke: '#000', sw: 4, italic: true });
    if (t > 34) bigText(ctx, 'VS', clamp((t - 34) / 400, 0, 0.8), { size: 150, y: H / 2 - 30 });
    const st = STAGES[this.stage];
    if (t > 50) {
      const lab = this.opts.arcade ? `STAGE ${this.opts.arcade.idx + 1} / ${this.opts.arcade.order.length}` : this.opts.mode === 'training' ? 'TRAINING' : 'VERSUS';
      panel(ctx, W / 2 - 170, H - 120, 340, 54, 'rgba(0,0,0,.75)');
      txt(ctx, lab, W / 2, H - 98, { size: 16, align: 'center', color: '#FFC233', font: FONT_UI, weight: 900 });
      txt(ctx, st.name, W / 2, H - 76, { size: 15, align: 'center', color: '#fff', font: FONT_UI, weight: 700 });
    }
    if (t < 6) { ctx.fillStyle = `rgba(255,255,255,${1 - t / 6})`; ctx.fillRect(0, 0, W, H); }
  }
}

// ============ FIGHT ============
class FightScene {
  constructor(p1def, p2def, stage, opts) {
    this.opts = opts; this.mode = opts.mode;
    this.p1def = p1def; this.p2def = p2def;
    this.stage = STAGES[stage] || STAGES.library; this.stageId = stage;
    this.fighters = [new Fighter(p1def, 0), new Fighter(p2def, 1)];
    this.fighters[0].opp = this.fighters[1]; this.fighters[1].opp = this.fighters[0];
    this.fighters[0].human = true;
    this.cpu = new CPU(this.fighters[1], opts.level != null ? opts.level : Settings.difficulty);
    if (opts.demo) { this.fighters[0].human = false; this.cpu1 = new CPU(this.fighters[0], opts.level1 != null ? opts.level1 : 2); }
    this.training = this.mode === 'training';
    this.tr = { dummy: 0, meter: 1, hitbox: 0, lastDmg: 0, lastHits: 0, curDmg: 0, curHits: 0 };
    this.round = 1; this.frame = 0; this.t = 0;
    this.projs = []; this.parts = [];
    this.camX = (STAGE_W - W) / 2; this.shake = 0; this.slow = 0; this.freeze = 0; this.freezeBy = null;
    this.paused = false; this.pauseSel = 0; this.pauseView = null;
    this.combos = [{ n: 0, t: 0 }, { n: 0, t: 0 }];
    this.matchFrames = 0;
    this.roundsToWin = this.training ? 99 : Settings.rounds;
    this.startRound(true);
  }
  enter() { if (!this.opts.headless) Sound.playMusic(this.p2def.music); }
  startRound(first) {
    const [a, b] = this.fighters;
    a.reset(STAGE_W / 2 - 170); b.reset(STAGE_W / 2 + 170);
    if (this.training) { a.meter = 100; }
    this.projs = []; this.parts = [];
    this.camX = (STAGE_W - W) / 2;
    this.timer = Settings.timer || 0; this.timerF = 0;
    this.phase = this.training ? 'fight' : (first ? 'intro' : 'call');
    this.pt = 0; this.koInfo = null; this.slow = 0; this.freeze = 0;
    if (this.training) { a.state = 'stand'; b.state = 'stand'; }
  }
  // --- api used by fighters
  addPart(p) { if (this.parts.length < 500) this.parts.push(p); }
  hitstop(n, a, b) {
    for (const f of (a ? [a, b] : this.fighters)) if (f) f.hitstop = Math.max(f.hitstop, n);
  }
  comboShow(att, n) {
    if (n < 2) return;
    const c = this.combos[att.side];
    c.n = n; c.t = 90;
  }
  superFlash(f, mv) {
    this.freeze = 42; this.freezeBy = f; this.freezeMove = mv;
    Sound.play('super');
    Sound.say(mv.name, { pitch: 0.7, rate: 1.1 });
    this.addPart({ type: 'flash', x: f.x, y: f.y - 110, life: 30, col: f.def.specials.super.fx || '#fff', size: 160 });
  }
  onKO(att, def) {
    if (this.training) { def.hp = 1; def.koed = false; return; }
    if (this.koInfo) { if (this.koInfo.def !== def) this.koInfo.double = true; return; }
    this.koInfo = { att, def, t: 0, double: false };
    this.phase = 'ko'; this.pt = 0;
    this.slow = 70;
    Game.flashT = 10;
    Sound.play('ko');
    setTimeout(() => Sound.say('K.O.', { pitch: 0.4, rate: 0.8 }), 150);
    this.projs = this.projs.filter(p => p.owner !== def);
  }

  // --- input
  humanIntent(f) {
    const s = Input.fightState();
    let h = (s.right ? 1 : 0) - (s.left ? 1 : 0);
    const v = (s.up ? 1 : 0) - (s.down ? 1 : 0);
    if (f.facing < 0) h = -h;
    const dir = v > 0 ? (h > 0 ? 9 : h < 0 ? 7 : 8) : v < 0 ? (h > 0 ? 3 : h < 0 ? 1 : 2) : (h > 0 ? 6 : h < 0 ? 4 : 5);
    return { dir, press: s.press, hold: s.hold };
  }
  dummyIntent(f) {
    const mode = this.tr.dummy;
    const o = f.opp;
    const out = { dir: 5, press: {} };
    if (mode === 1) out.dir = 2;
    else if (mode === 2) { if (f.state === 'stand') out.dir = 8; }
    else if (mode === 3) {
      // block everything
      const m = o.move;
      const low = m && m.guard === 'low';
      const src = o.x;
      const away = sign(f.x - src);
      const back = away === -f.facing;
      out.dir = back ? (low ? 1 : 4) : (low ? 3 : 6);
      for (const p of this.projs) if (p.owner === o && p.active) { const aw = sign(f.x - p.x); out.dir = aw === -f.facing ? 4 : 6; }
      if (f.state === 'hit' || f.state === 'juggle') out.dir = 5;
    } else if (mode === 4) return this.cpu.think(this);
    return out;
  }

  update() {
    this.t++;
    if (Input.pressed('fullscreen')) toggleFullscreen();
    if (this.paused) { this.updatePause(); return; }
    if (this.opts.demo && !this.opts.headless) {
      if (Input.any()) { Game.go(new TitleScene()); return; }
      if (this.phase === 'end' || this.t > 60 * 40) { Game.go(new TitleScene()); return; }
    }
    // Esc always pauses; Enter/Start pauses only mid-fight (it skips intros and round-end screens)
    const enterPauses = this.phase === 'fight' || this.phase === 'call' || this.phase === 'ko';
    if (!this.opts.demo && this.phase !== 'end' && (Input.pressed('back') || (Input.pressed('start') && enterPauses))) {
      this.paused = true; this.pauseSel = 0; this.pauseView = null; Sound.play('pause'); return;
    }
    if (this.training && Input.pressed('hitbox')) this.tr.hitbox ^= 1;
    if (this.training && Input.pressed('reset')) { this.startRound(true); return; }
    // slow-mo on KO: step every other frame
    if (this.slow > 0) { this.slow--; if (this.slow % 2 === 1) { this.updateParts(); return; } }
    this.step();
  }
  step() {
    this.frame++;
    const [a, b] = this.fighters;
    this.pt++;
    if (this.frame === 1) { enqueueWarm(a.def); enqueueWarm(b.def); }
    Render.warmMs = (this.phase === 'intro' || this.phase === 'call' || this.phase === 'roundEnd') ? 12 : 3;
    // phases
    if (this.phase === 'intro') {
      a.state = 'intro'; b.state = 'intro';
      if (this.pt > 170 || (this.pt > 20 && Input.confirm())) { this.phase = 'call'; this.pt = 0; }
    } else if (this.phase === 'call') {
      if (this.pt === 1) { a.state = 'stand'; b.state = 'stand'; a.t = b.t = 0; Sound.play('bell'); Sound.say(this.round >= this.roundsToWin * 2 - 1 && this.roundsToWin > 1 ? 'Final round' : 'Round ' + this.round, { pitch: 0.45 }); }
      if (this.pt === 62) Sound.say('Fight!', { pitch: 0.5, rate: 1.1 });
      if (this.pt >= 90) { this.phase = 'fight'; this.pt = 0; }
    }
    const fighting = this.phase === 'fight' || this.phase === 'ko';
    // inputs
    const ints = [];
    for (const f of this.fighters) {
      let inp;
      if (!fighting || this.phase === 'ko' && f === (this.koInfo && this.koInfo.def)) inp = { dir: 5, press: {} };
      else if (f.human) inp = this.humanIntent(f);
      else if (this.cpu1 && f === this.fighters[0]) inp = f.hitstop > 0 ? { dir: f.inp.dir, press: {} } : this.cpu1.think(this);
      else if (this.training) inp = this.dummyIntent(f);
      else inp = f.hitstop > 0 ? { dir: f.inp.dir, press: {} } : this.cpu.think(this);
      if (this.phase === 'ko' && f !== (this.koInfo && this.koInfo.def)) inp = { dir: 5, press: {} };
      ints.push(inp);
    }
    // super freeze
    if (this.freeze > 0) {
      this.freeze--;
      this.fighters.forEach((f, i) => f.record(Object.assign({}, ints[i], { req: f === this.freezeBy ? null : ints[i].req }), this.frame, true));
      this.updateParts();
      return;
    }
    this.fighters.forEach((f, i) => f.record(ints[i], this.frame));
    for (const f of this.fighters) {
      if (f.hitstop > 0) { f.hitstop--; if (f.hitstop === 0) f.shakeT = 0; continue; }
      f.update(this);
    }
    for (const p of this.projs) p.update(this);
    this.constrain();
    if (fighting) resolveCombat(this);
    // health display lerp
    for (const f of this.fighters) {
      if (f.dispHp > f.hp) { if (f.state !== 'hit' && f.state !== 'juggle' && f.state !== 'locked') f.dispHp = Math.max(f.hp, f.dispHp - 6); }
      else f.dispHp = f.hp;
    }
    // training refills
    if (this.training) this.trainingTick();
    // timer
    if (this.phase === 'fight' && !this.training && this.timer > 0) {
      if (++this.timerF >= 60) {
        this.timerF = 0; this.timer--;
        if (this.timer <= 10 && this.timer > 0) Sound.play('tick');
        if (this.timer === 0) this.timeOver();
      }
    }
    if (this.phase === 'fight' || this.phase === 'ko') this.matchFrames++;
    if (this.phase === 'ko') this.updateKO();
    else if (this.phase === 'roundEnd') this.updateRoundEnd();
    // camera
    const target = clamp((a.x + b.x) / 2 - W / 2, 0, STAGE_W - W);
    this.camX = lerp(this.camX, target, 0.2);
    if (this.shake > 0) this.shake *= 0.86;
    if (this.shake < 0.5) this.shake = 0;
    for (const c of this.combos) if (c.t > 0) c.t--;
    this.updateParts();
  }
  updateParts() {
    this.parts = this.parts.filter(updatePart);
  }
  constrain() {
    const [a, b] = this.fighters;
    const lo = Math.max(40, this.camX + 30), hi = Math.min(STAGE_W - 40, this.camX + W - 30);
    // body push
    const noPush = f => f.state === 'thrown' || f.state === 'locked' || (f.state === 'attack' && f.move && f.move.noPush && f.mt <= f.move.su + f.move.ac) || f.state === 'down' || f.state === 'ko';
    if (!noPush(a) && !noPush(b) && !(a.state === 'throwing' || b.state === 'throwing')) {
      const pa = a.pushbox(), pb = b.pushbox();
      if (pa.x < pb.x + pb.w && pa.x + pa.w > pb.x && pa.y < pb.y + pb.h && pa.y + pa.h > pb.y) {
        let dir = sign(b.x - a.x);
        if (Math.abs(b.x - a.x) < 0.5) dir = a.facing;
        const overlap = dir > 0 ? (pa.x + pa.w - pb.x) : (pb.x + pb.w - pa.x);
        let da = -dir * overlap / 2, db = dir * overlap / 2;
        // walls: push other fully
        if (a.x + da < lo || a.x + da > hi) { db += da; da = 0; }
        if (b.x + db < lo || b.x + db > hi) { da += db; db = 0; }
        a.x += da; b.x += db;
      }
    }
    for (const f of this.fighters) {
      if (f.state === 'thrown' || f.state === 'locked') continue;
      f.x = clamp(f.x, lo, hi);
    }
    // keep within screen span of each other
    const span = W - 60;
    if (Math.abs(a.x - b.x) > span) {
      const mid = (a.x + b.x) / 2, d = sign(b.x - a.x);
      a.x = mid - d * span / 2; b.x = mid + d * span / 2;
    }
  }
  timeOver() {
    const [a, b] = this.fighters;
    this.phase = 'roundEnd'; this.pt = 0;
    const ra = a.hp / a.maxHp, rb = b.hp / b.maxHp;
    let winner = null;
    if (Math.abs(ra - rb) > 0.001) winner = ra > rb ? a : b;
    this.endInfo = { winner, time: true, perfect: false };
    Sound.say('Time!', { pitch: 0.45 });
    this.awardRound(winner);
  }
  updateKO() {
    const k = this.koInfo;
    k.t++;
    const settled = (k.def.state === 'ko' || k.def.state === 'down') && k.t > 90;
    if (settled) {
      const winner = k.double ? null : k.att;
      this.phase = 'roundEnd'; this.pt = 0;
      this.endInfo = { winner, time: false, perfect: winner && winner.hp >= winner.maxHp, double: k.double };
      this.awardRound(winner);
    }
  }
  awardRound(winner) {
    const [a, b] = this.fighters;
    if (winner) winner.wins++;
    else { a.wins++; b.wins++; }
    this.projs = [];
  }
  updateRoundEnd() {
    const [a, b] = this.fighters;
    const w = this.endInfo.winner;
    for (const f of this.fighters) {
      if (f === w && (f.state === 'stand' || f.state === 'crouch' || f.state === 'land')) { f.state = 'win'; f.t = 0; f.vx = 0; }
      if (!w && this.endInfo.time && f.state === 'stand') { f.state = 'timeout'; }
      if (w && f !== w && this.endInfo.time && (f.state === 'stand' || f.state === 'crouch')) { f.state = 'timeout'; }
    }
    if (this.pt === 30) {
      if (w === a) { Sound.play('win'); Sound.say(this.endInfo.perfect ? 'Perfect!' : 'You win!', { pitch: 0.5 }); }
      else if (w === b) { Sound.play('lose'); Sound.say('You lose', { pitch: 0.45 }); }
      else Sound.say('Draw game', { pitch: 0.45 });
    }
    if (this.pt > 200 || (this.pt > 60 && Input.confirm())) {
      const done = a.wins >= this.roundsToWin || b.wins >= this.roundsToWin || this.round >= this.roundsToWin * 2 + 2;
      if (done) this.endMatch();
      else { this.round++; this.startRound(false); }
    }
  }
  endMatch() {
    const [a, b] = this.fighters;
    let result;
    if (a.wins > b.wins) result = 'win';
    else if (b.wins > a.wins) result = 'lose';
    else result = 'draw';
    this.phase = 'end';
    if (!this.opts.demo) {
      if (result === 'win') Progress.wins++; else Progress.losses++;
      saveProgress();
    }
    const info = { result, p1: this.p1def, p2: this.p2def, stats: a.stats, frames: this.matchFrames, opts: this.opts, stage: this.stageId };
    if (this.opts.onEnd) this.opts.onEnd(info);
    else Game.go(new ResultScene(info));
  }
  trainingTick() {
    const [a, b] = this.fighters;
    if (this.tr.meter) a.meter = 100;
    if (b.combo > 0) { this.tr.curHits = b.combo; this.tr.curDmg = b.maxHp - b.hp; }
    else if (this.tr.curHits > 0) { this.tr.lastHits = this.tr.curHits; this.tr.lastDmg = this.tr.curDmg; this.tr.curHits = 0; }
    for (const f of this.fighters) {
      const idle = f.state === 'stand' || f.state === 'crouch';
      f.idleT = idle ? (f.idleT || 0) + 1 : 0;
      if (f.idleT > 40 && f.hp < f.maxHp) { f.hp = f.maxHp; f.dispHp = f.maxHp; }
    }
  }

  // --- pause
  pauseItems() {
    const it = [{ label: 'RESUME' }, { label: 'MOVE LIST' }];
    if (this.training) {
      it.push({ label: 'DUMMY', value: ['STAND', 'CROUCH', 'JUMP', 'BLOCK ALL', 'CPU'][this.tr.dummy], key: 'dummy', n: 5 });
      it.push({ label: 'METER', value: this.tr.meter ? 'INFINITE' : 'NORMAL', key: 'meter', n: 2 });
      it.push({ label: 'HITBOXES', value: this.tr.hitbox ? 'ON' : 'OFF', key: 'hitbox', n: 2 });
      it.push({ label: 'RESET POSITIONS' });
    } else it.push({ label: 'RESTART MATCH' });
    it.push({ label: 'CHARACTER SELECT' }, { label: 'MAIN MENU' });
    return it;
  }
  updatePause() {
    if (this.pauseView) {
      this.pauseView.update();
      return;
    }
    const items = this.pauseItems();
    if (Input.menuY()) { this.pauseSel = (this.pauseSel + Input.menuY() + items.length) % items.length; Sound.play('cursor'); }
    const it = items[this.pauseSel];
    if (it.key && Input.menuX()) {
      this.tr[it.key] = (this.tr[it.key] + Input.menuX() + it.n) % it.n; Sound.play('cursor');
    }
    if (Input.back() || (Input.pressed('start') && Input.device === 'gamepad')) { this.paused = false; Sound.play('pause'); return; }
    if (Input.confirm()) {
      Sound.play('confirm');
      const l = it.label;
      if (l === 'RESUME') this.paused = false;
      else if (l === 'MOVE LIST') this.pauseView = new HowToScene(() => { this.pauseView = null; }, this.p1def, true);
      else if (it.key) this.tr[it.key] = (this.tr[it.key] + 1) % it.n;
      else if (l === 'RESET POSITIONS') { this.startRound(true); this.paused = false; }
      else if (l === 'RESTART MATCH') { const a = this.fighters[0], b = this.fighters[1]; a.wins = b.wins = 0; a.meter = b.meter = 0; this.round = 1; a.stats = { hits: 0, dmg: 0, maxCombo: 0, specials: 0, supers: 0 }; this.matchFrames = 0; this.startRound(true); this.paused = false; }
      else if (l === 'CHARACTER SELECT') Game.go(new SelectScene(this.mode === 'arcade' ? 'arcade' : this.mode));
      else if (l === 'MAIN MENU') Game.go(new MenuScene());
    }
  }

  // --- render
  draw(ctx) {
    const [a, b] = this.fighters;
    // World layer. In pixel-art mode it is rendered on a low-res pixel grid buffer (1 px = PX.P units)
    // and blitted with nearest-neighbour; the HUD stays full resolution.
    const pix = pixelMode();
    let wc = ctx;
    if (pix) {
      if (!FightScene.wb) { FightScene.wb = makeCanvas(W / PX.P, H / PX.P); FightScene.wbx = FightScene.wb.getContext('2d', { alpha: false }); }
      wc = FightScene.wbx;
      wc.setTransform(1 / PX.P, 0, 0, 1 / PX.P, 0, 0);
      wc.imageSmoothingEnabled = false;
    }
    wc.save();
    if (this.shake > 0 && Settings.shake) {
      const g = pix ? PX.P : 1;
      wc.translate(Math.round(rand(-1, 1) * this.shake / g) * g, Math.round(rand(-1, 1) * this.shake * 0.6 / g) * g);
    }
    const camX = pix ? Math.round(this.camX / PX.P) * PX.P : this.camX;
    drawStage(wc, this.stage, camX, this.frame);
    wc.save();
    wc.translate(-camX, 0);
    if (this.freeze > 0) {
      wc.fillStyle = `rgba(0,0,10,${Math.min(0.7, (42 - this.freeze) / 8 * 0.7)})`;
      wc.fillRect(this.camX - 20, 0, W + 40, H);
    }
    // draw order: attacker on top
    const order = (a.state === 'attack' || a.state === 'throwing' || a.state === 'superlock') ? [b, a] : [a, b];
    for (const p of this.parts) if (p.type === 'ghost') drawPart(wc, p);
    for (const f of order) f.draw(wc, this);
    for (const p of this.projs) p.draw(wc, this);
    for (const p of this.parts) if (p.type !== 'ghost' && p.type !== 'text') drawPart(wc, p);
    wc.restore();
    wc.restore();
    if (pix) {
      ctx.save(); ctx.imageSmoothingEnabled = false;
      ctx.drawImage(FightScene.wb, 0, 0, W, H);
      ctx.restore();
    }
    ctx.save(); ctx.translate(-camX, 0);
    for (const p of this.parts) if (p.type === 'text') drawPart(ctx, p);
    if (this.tr.hitbox) this.drawBoxes(ctx);
    ctx.restore();
    if (this.freeze > 0) this.drawCutIn(ctx);
    this.drawHUD(ctx);
    if (this.phase === 'intro') {
      const pt = this.pt;
      if (pt > 10 && pt < 85) drawBubble(ctx, this.p1def.intro, a.x - this.camX, a.y - 215 * a.s, clamp((pt - 10) / 8, 0, 1) * clamp((85 - pt) / 8, 0, 1));
      if (pt > 90 && pt < 165) drawBubble(ctx, this.p2def.intro, b.x - this.camX, b.y - 215 * b.s, clamp((pt - 90) / 8, 0, 1) * clamp((165 - pt) / 8, 0, 1));
    }
    if (this.phase === 'call') {
      if (this.pt < 62) {
        const last = this.roundsToWin > 1 && (a.wins === this.roundsToWin - 1 && b.wins === this.roundsToWin - 1);
        bigText(ctx, last ? 'FINAL ROUND' : 'ROUND ' + this.round, this.pt / 62, { size: last ? 76 : 90 });
      } else bigText(ctx, 'FIGHT!', (this.pt - 62) / 40, { size: 120, cols: ['#FFFFFF', '#FF8A3D', '#E8202A'] });
    }
    if (this.phase === 'ko' && this.koInfo) {
      const k = this.koInfo.t;
      if (k < 90) bigText(ctx, 'K.O.', Math.min(0.8, k / 110), { size: 150, cols: ['#FFFFFF', '#FF5A5A', '#A00010'] });
    }
    if (this.phase === 'roundEnd') {
      const e = this.endInfo, pt = this.pt;
      if (e.time && pt < 60) bigText(ctx, 'TIME', Math.min(.8, pt / 80), { size: 120 });
      else if (pt > 25) {
        let s = e.winner === a ? 'YOU WIN' : e.winner === b ? 'YOU LOSE' : 'DRAW';
        if (e.winner && e.perfect) s = 'PERFECT!';
        if (e.double) s = 'DOUBLE K.O.';
        bigText(ctx, s, Math.min(0.8, (pt - 25) / 300), { size: 96, cols: e.winner === b ? ['#E0E0FF', '#8A8AFF', '#3030A0'] : undefined });
        if (e.winner && pt > 50) txt(ctx, e.winner.def.name + ' WINS', W / 2, H / 2 + 70, { size: 26, align: 'center', color: '#fff', stroke: '#000', sw: 6, italic: true });
      }
    }
    if (Game.flashT > 0) { ctx.fillStyle = `rgba(255,255,255,${Game.flashT / 10 * .8})`; ctx.fillRect(0, 0, W, H); Game.flashT--; }
    if (this.paused) this.drawPause(ctx);
  }
  drawBoxes(ctx) {
    for (const f of this.fighters) {
      ctx.lineWidth = 2;
      ctx.strokeStyle = f.inv > 0 ? 'rgba(255,255,255,.8)' : 'rgba(80,160,255,.9)'; ctx.fillStyle = 'rgba(80,160,255,.15)';
      for (const h of f.hurtboxes()) { ctx.fillRect(h.x, h.y, h.w, h.h); ctx.strokeRect(h.x, h.y, h.w, h.h); }
      const hb = f.hitbox();
      if (hb) { ctx.strokeStyle = 'rgba(255,40,40,.95)'; ctx.fillStyle = 'rgba(255,40,40,.25)'; ctx.fillRect(hb.x, hb.y, hb.w, hb.h); ctx.strokeRect(hb.x, hb.y, hb.w, hb.h); }
      const pb = f.pushbox(); ctx.strokeStyle = 'rgba(255,255,0,.5)'; ctx.strokeRect(pb.x, pb.y, pb.w, pb.h);
    }
    for (const p of this.projs) { if (!p.active) continue; const b = p.box(); ctx.strokeStyle = 'rgba(255,40,40,.95)'; ctx.strokeRect(b.x, b.y, b.w, b.h); }
  }
  drawCutIn(ctx) {
    const f = this.freezeBy, k = 42 - this.freeze;
    const slide = Ease.outCubic(clamp(k / 10, 0, 1)), out = clamp((k - 32) / 10, 0, 1);
    ctx.save();
    ctx.globalAlpha = 1 - out;
    const y = 150;
    ctx.translate(0, y);
    ctx.transform(1, -0.08, 0, 1, 0, 0);
    const left = f.side === 0;
    const bx = left ? -W + slide * W : W - slide * W;
    ctx.fillStyle = '#000'; ctx.fillRect(bx, -6, W, 132);
    const g = ctx.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, shade(f.def.color, -0.5)); g.addColorStop(0.5, f.def.color); g.addColorStop(1, shade(f.def.color, -0.5));
    ctx.fillStyle = g; ctx.fillRect(bx, 0, W, 120);
    ctx.strokeStyle = 'rgba(255,255,255,.2)'; ctx.lineWidth = 3;
    for (let i = 0; i < 20; i++) { const xx = bx + ((i * 60 + k * 30) % W); ctx.beginPath(); ctx.moveTo(xx, 0); ctx.lineTo(xx - 40, 120); ctx.stroke(); }
    ctx.save();
    ctx.beginPath(); ctx.rect(bx, 0, W, 120); ctx.clip();
    ctx.translate(bx + (left ? 200 : W - 200), 70);
    drawHeadArt(ctx, f.def, 80, 'angry', this.t, !left);
    ctx.restore();
    const name = this.freezeMove ? this.freezeMove.name : '';
    txt(ctx, name.toUpperCase(), bx + (left ? W - 40 : 40), 78, { size: 42, align: left ? 'right' : 'left', color: '#fff', stroke: '#000', sw: 8, italic: true });
    txt(ctx, 'SUPER ART', bx + (left ? W - 44 : 44), 36, { size: 18, align: left ? 'right' : 'left', color: '#FFE14D', stroke: '#000', sw: 4, italic: true });
    ctx.restore();
  }
  drawHUD(ctx) {
    const [a, b] = this.fighters, t = this.t;
    // top band gradient
    const g = ctx.createLinearGradient(0, 0, 0, 90); g.addColorStop(0, 'rgba(0,0,0,.55)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, 90);
    drawPortrait(ctx, a.def, 12, 12, 62, 62, false, t, a.exprNow());
    drawPortrait(ctx, b.def, W - 74, 12, 62, 62, true, t, b.exprNow());
    drawHealthBar(ctx, a, 84, 22, 334, 22, false, t);
    drawHealthBar(ctx, b, W - 84 - 334, 22, 334, 22, true, t);
    txt(ctx, a.def.name, 86, 66, { size: 18, color: '#fff', stroke: '#000', sw: 5, italic: true });
    txt(ctx, b.def.name, W - 86, 66, { size: 18, align: 'right', color: '#fff', stroke: '#000', sw: 5, italic: true });
    txt(ctx, '1P', 86, 16, { size: 11, color: '#FFC233', stroke: '#000', sw: 3 });
    txt(ctx, this.training ? 'DUMMY' : 'CPU', W - 86, 16, { size: 11, align: 'right', color: '#FF5A7A', stroke: '#000', sw: 3 });
    // round wins
    if (!this.training) {
      for (let i = 0; i < this.roundsToWin; i++) {
        this.winMark(ctx, 404 - i * 22, 62, i < a.wins);
        this.winMark(ctx, W - 404 + i * 22, 62, i < b.wins);
      }
    }
    // timer
    ctx.fillStyle = '#000'; rrect(ctx, W / 2 - 38, 12, 76, 56, 8); ctx.fill();
    ctx.strokeStyle = '#FFC233'; ctx.lineWidth = 2; ctx.stroke();
    const tm = this.training || !Settings.timer ? '∞' : String(this.timer).padStart(2, '0');
    txt(ctx, tm, W / 2, 58, { size: 40, align: 'center', color: this.timer <= 10 && Settings.timer && !this.training ? '#FF5A5A' : '#FFE9A8', stroke: '#000', sw: 3 });
    // super meters
    drawSuperBar(ctx, a, 24, H - 30, 220, false, t);
    drawSuperBar(ctx, b, W - 244, H - 30, 220, true, t);
    // combos
    this.combos.forEach((c, i) => {
      if (c.t <= 0) return;
      const x = i === 0 ? 44 : W - 44, al = i === 0 ? 'left' : 'right';
      const k = clamp((90 - c.t) / 6, 0, 1);
      ctx.save(); ctx.globalAlpha = Math.min(1, c.t / 15);
      txt(ctx, c.n + ' HITS', x + (i === 0 ? -1 : 1) * (1 - k) * 60, 200, { size: 38, align: al, color: '#FFE14D', stroke: '#000', sw: 7, italic: true });
      txt(ctx, 'COMBO!', x, 226, { size: 20, align: al, color: '#FF7A3D', stroke: '#000', sw: 5, italic: true });
      ctx.restore();
    });
    if (this.training) {
      panel(ctx, W / 2 - 150, 78, 300, 44);
      const tr = this.tr;
      txt(ctx, `DAMAGE ${tr.curHits ? tr.curDmg : tr.lastDmg}   HITS ${tr.curHits || tr.lastHits}`, W / 2, 98, { size: 15, align: 'center', color: '#fff', font: FONT_UI, weight: 800 });
      txt(ctx, 'H: hitboxes · R: reset · Esc: training menu', W / 2, 115, { size: 11, align: 'center', color: '#bbb', font: FONT_UI, weight: 600 });
    }
    if (Settings.inputDisplay) this.drawInputs(ctx);
  }
  drawInputs(ctx) {
    const f = this.fighters[0];
    const arrows = { 1: '↙', 2: '↓', 3: '↘', 4: '←', 5: '•', 6: '→', 7: '↖', 8: '↑', 9: '↗' };
    const hist = f.dirHist.slice(-10);
    hist.forEach((e, i) => txt(ctx, arrows[e.d], 20, 120 + i * 20, { size: 16, color: '#fff', stroke: '#000', sw: 3, font: FONT_UI }));
  }
  winMark(ctx, x, y, on) {
    ctx.save(); ctx.translate(x, y);
    star4Path(ctx, 9, 0.3);
    ctx.fillStyle = on ? '#FFE14D' : 'rgba(0,0,0,.6)'; ctx.fill();
    ctx.strokeStyle = on ? '#fff' : 'rgba(255,255,255,.4)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.restore();
  }
  drawPause(ctx) {
    ctx.fillStyle = 'rgba(0,0,10,.7)'; ctx.fillRect(0, 0, W, H);
    if (this.pauseView) { this.pauseView.draw(ctx); return; }
    txt(ctx, 'PAUSED', W / 2, 110, { size: 54, align: 'center', color: '#fff', stroke: '#000', sw: 9, italic: true });
    const items = this.pauseItems();
    menuList(ctx, items.map(i => ({ label: i.label, value: i.value })), this.pauseSel, W / 2 - (this.training ? 80 : 0), 175, { gap: 42, w: 420, valueX: 270, arrows: true });
    controlsHint(ctx, this.training ? 'Up/Down: select · Left/Right: change · Enter: confirm · Esc: resume' : 'Up/Down: select · Enter: confirm · Esc: resume');
  }
}

// ============ RESULTS ============
class ResultScene {
  constructor(info) {
    this.info = info; this.t = 0; this.sel = 0;
    const winDef = info.result === 'lose' ? info.p2 : info.p1;
    this.winDef = winDef;
    this.quote = choice(winDef.wins);
  }
  enter() { Sound.playMusic('select'); }
  get items() { return this.info.opts.mode === 'arcade' ? ['CONTINUE'] : ['REMATCH', 'CHARACTER SELECT', 'MAIN MENU']; }
  update() {
    this.t++;
    const n = this.items.length;
    if (Input.menuY()) { this.sel = (this.sel + Input.menuY() + n) % n; Sound.play('cursor'); }
    if (this.t > 30 && Input.confirm()) {
      Sound.play('confirm');
      const it = this.items[this.sel], i = this.info;
      if (it === 'REMATCH') Game.go(new VsScene(i.p1, i.p2, i.stage, i.opts));
      else if (it === 'CHARACTER SELECT') Game.go(new SelectScene(i.opts.mode));
      else if (it === 'MAIN MENU') Game.go(new MenuScene());
      else if (it === 'CONTINUE' && i.opts.next) i.opts.next();
    }
  }
  draw(ctx) {
    const t = this.t, d = this.winDef, info = this.info;
    drawMenuBg(ctx, t, shade(d.color, -0.75), '#05030F');
    ctx.save(); ctx.translate(230, 500); ctx.scale(1.6, 1.6);
    drawFighterRig(ctx, d, 0, 0, 1, lerpPose(idlePose(t, d), poseOf(d, 'win'), 0.85), { t, groundY: 0, expr: 'happy' });
    ctx.restore();
    const head = info.result === 'win' ? 'VICTORY!' : info.result === 'lose' ? 'DEFEAT' : 'DRAW GAME';
    txt(ctx, head, 660, 90, { size: 56, align: 'center', color: info.result === 'win' ? '#FFC233' : '#9AA0FF', stroke: '#000', sw: 9, italic: true });
    panel(ctx, 430, 120, 470, 150);
    txt(ctx, d.name + ':', 450, 152, { size: 20, color: d.color, stroke: '#000', sw: 4, italic: true });
    const shown = this.quote.slice(0, Math.floor(t * 1.2));
    ctx.font = `700 18px ${FONT_UI}`;
    wrapLines(ctx, '"' + shown + (shown.length < this.quote.length ? '' : '"'), 430).forEach((l, i) => txt(ctx, l, 450, 184 + i * 24, { size: 18, color: '#fff', font: FONT_UI, weight: 700 }));
    const s = info.stats;
    const secs = Math.round(info.frames / 60);
    txt(ctx, `Damage dealt ${s.dmg}   ·   Best combo ${s.maxCombo}   ·   Supers ${s.supers}   ·   Time ${secs}s`, 665, 300, { size: 13, align: 'center', color: '#ccc', font: FONT_UI, weight: 700 });
    menuList(ctx, this.items, this.sel, 665, 370, { gap: 46, w: 360 });
  }
}

// ============ ARCADE ============
class ArcadeRun {
  constructor(p1) {
    this.p1 = p1;
    this.order = shuffle(ROSTER.filter(c => c !== p1));
    this.idx = 0; this.continues = 0; this.frames = 0; this.totalDmg = 0;
  }
  level() {
    const base = Settings.difficulty;
    // ramps up through the ladder; the final opponent fights at full strength
    const last = this.idx === this.order.length - 1;
    return clamp(base - 0.35 + this.idx * 0.1 + (last ? 0.25 : 0), 0, 3);
  }
  next() {
    const opp = this.order[this.idx];
    Game.go(new VsScene(this.p1, opp, opp.stage, { mode: 'arcade', level: this.level(), arcade: this, onEnd: info => this.onEnd(info) }));
  }
  onEnd(info) {
    this.frames += info.frames; this.totalDmg += info.stats.dmg;
    if (info.result === 'win') {
      this.idx++;
      if (this.idx >= this.order.length) {
        Progress.cleared[this.p1.id] = true;
        saveProgress();
        Game.go(new EndingScene(this, false));
        return;
      }
      info.opts = Object.assign({}, info.opts, { next: () => this.next() });
      enqueueWarm(this.order[this.idx]);
      Game.go(new ResultScene(info));
    } else {
      Game.go(new ContinueScene(this, info));
    }
  }
}
class ContinueScene {
  constructor(run, info) { this.run = run; this.info = info; this.t = 0; this.count = 10; }
  enter() { Sound.stopMusic(); Sound.play('lose'); }
  update() {
    this.t++;
    if (this.t % 60 === 0 && this.t > 30) { this.count--; Sound.play('tick'); if (this.count >= 0 && this.count <= 9) Sound.say(String(this.count), { pitch: 0.45 }); }
    if (this.count < 0 || Input.back()) { Game.go(new GameOverScene()); return; }
    if (this.t > 20 && Input.confirm()) { this.run.continues++; Sound.play('confirm'); this.run.next(); }
    if (Input.pressed('lk') || Input.pressed('hp') || Input.pressed('hk')) { if (this.t % 60 > 10) this.t += 60 - (this.t % 60) - 1; }
  }
  draw(ctx) {
    const t = this.t, d = this.run.p1;
    drawMenuBg(ctx, t, '#100008', '#000');
    ctx.save(); ctx.translate(W / 2, 470); ctx.scale(1.25, 1.25);
    drawFighterRig(ctx, d, 0, 0, 1, poseOf(d, 'lose'), { t, groundY: 0, expr: 'hurt' });
    ctx.restore();
    txt(ctx, 'CONTINUE?', W / 2, 120, { size: 64, align: 'center', color: '#fff', stroke: '#000', sw: 10, italic: true });
    txt(ctx, String(Math.max(0, this.count)), W / 2, 230, { size: 96, align: 'center', color: '#FF3B30', stroke: '#000', sw: 10 });
    controlsHint(ctx, 'Confirm: continue    ·    Esc: give up', H - 24);
  }
}
class GameOverScene {
  constructor() { this.t = 0; }
  enter() { Sound.stopMusic(); Sound.say('Game over', { pitch: 0.4, rate: 0.85 }); }
  update() { this.t++; if (this.t > 60 && (Input.confirm() || Input.back()) || this.t > 300) Game.go(new TitleScene()); }
  draw(ctx) {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    bigText(ctx, 'GAME OVER', Math.min(0.8, this.t / 300), { size: 100, cols: ['#FFFFFF', '#AAAAAA', '#555555'] });
  }
}
class EndingScene {
  constructor(run, unlocked) { this.run = run; this.unlocked = unlocked; this.t = 0; }
  enter() { Sound.playMusic('ending'); Sound.say('Congratulations!', { pitch: 0.5 }); }
  update() {
    this.t++;
    if (this.t > 120 && Input.confirm()) Game.go(new CreditsScene(true));
  }
  draw(ctx) {
    const t = this.t, d = this.run.p1;
    drawMenuBg(ctx, t, shade(d.color, -0.6), '#0A0520');
    ctx.save(); ctx.translate(200, 490); ctx.scale(1.55, 1.55);
    drawFighterRig(ctx, d, 0, 0, 1, lerpPose(idlePose(t, d), poseOf(d, 'win'), 0.9), { t, groundY: 0, expr: 'happy' });
    ctx.restore();
    txt(ctx, 'ARCADE CLEAR!', 640, 80, { size: 48, align: 'center', color: '#FFC233', stroke: '#000', sw: 9, italic: true });
    panel(ctx, 380, 110, 540, 230);
    ctx.font = `600 17px ${FONT_UI}`;
    const shown = d.ending.slice(0, Math.floor(t * 0.9));
    wrapLines(ctx, shown, 500).forEach((l, i) => txt(ctx, l, 400, 145 + i * 25, { size: 17, color: '#fff', font: FONT_UI, weight: 600 }));
    const secs = Math.round(this.run.frames / 60);
    txt(ctx, `Total time ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}   ·   Continues ${this.run.continues}   ·   Damage ${this.run.totalDmg}`, 650, 370, { size: 14, align: 'center', color: '#ddd', font: FONT_UI, weight: 700 });
    if (this.unlocked && t > 60) {
      const k = (Math.sin(t * .1) + 1) / 2;
      txt(ctx, 'NEW CHALLENGER UNLOCKED: A.G.I.', 650, 420, { size: 24, align: 'center', color: `rgb(${200 + k * 55},${100 + k * 80},255)`, stroke: '#000', sw: 6, italic: true });
    }
    if (t > 120 && (t % 60) < 40) controlsHint(ctx, 'Press confirm', H - 20);
  }
}
class CreditsScene {
  constructor(fromEnding) { this.t = 0; this.fromEnding = fromEnding; }
  enter() { if (!this.fromEnding) Sound.playMusic('ending'); }
  update() { this.t++; if (this.t > 20 && (Input.confirm() || Input.back())) Game.go(this.fromEnding ? new TitleScene() : new MenuScene(5)); }
  draw(ctx) {
    drawMenuBg(ctx, this.t, '#08061A', '#1A0A2A');
    const lines = [
      ['TECH FIGHTER', 44, '#FFC233'], ['BATTLE OF THE BOTS', 20, '#fff'], ['', 20],
      ['Game design, code, art & audio', 15, '#BFB8E8'], ['Generated procedurally — every sprite is drawn in code,', 15, '#fff'], ['every sound is synthesized live.', 15, '#fff'], ['', 16],
      ['Built with Claude Code', 15, '#BFB8E8'], ['', 16],
      ['DISCLAIMER', 15, '#FF7A7A'],
      ['A non-commercial fan parody. All fighters are original caricatures inspired by', 13, '#ddd'],
      ['popular AI assistants. Names and likenesses belong to their respective owners;', 13, '#ddd'],
      ['this game is not affiliated with or endorsed by any of them.', 13, '#ddd'], ['', 16],
      ['Thanks for playing!', 22, '#FFE14D'],
    ];
    let y = 100;
    for (const [s, size, col] of lines) { if (s) txt(ctx, s, W / 2, y, { size, align: 'center', color: col, stroke: size > 18 ? '#000' : null, sw: 6, font: size > 18 ? FONT : FONT_UI, weight: size > 18 ? 900 : 700, italic: size > 18 }); y += size + 12; }
    controlsHint(ctx, 'Press confirm to return');
  }
}

// ============ OPTIONS ============
class OptionsScene {
  constructor(back) { this.back = back; this.t = 0; this.sel = 0; }
  items() {
    const S = Settings;
    return [
      { label: 'DIFFICULTY', value: DIFF_NAMES[S.difficulty], k: 'difficulty', vals: [0, 1, 2, 3] },
      { label: 'ROUNDS TO WIN', value: String(S.rounds), k: 'rounds', vals: [1, 2, 3] },
      { label: 'ROUND TIMER', value: S.timer ? String(S.timer) : 'OFF', k: 'timer', vals: [60, 99, 0] },
      { label: 'SFX VOLUME', value: Math.round(S.sfx * 10) + '', k: 'sfx', vals: [0, .1, .2, .3, .4, .5, .6, .7, .8, .9, 1] },
      { label: 'MUSIC VOLUME', value: Math.round(S.music * 10) + '', k: 'music', vals: [0, .1, .2, .3, .4, .5, .6, .7, .8, .9, 1] },
      { label: 'ANNOUNCER VOICE', value: S.announcer ? 'ON' : 'OFF', k: 'announcer', vals: [true, false] },
      { label: 'SCREEN SHAKE', value: S.shake ? 'ON' : 'OFF', k: 'shake', vals: [true, false] },
      { label: 'INPUT DISPLAY', value: S.inputDisplay ? 'ON' : 'OFF', k: 'inputDisplay', vals: [true, false] },
      { label: 'GRAPHICS', value: S.graphics === 'hd' ? 'SMOOTH VECTOR' : 'PIXEL ART', k: 'graphics', vals: ['pixel', 'hd'] },
      { label: 'FULLSCREEN', value: isFullscreen() ? 'ON' : 'OFF', k: 'fs' },
      { label: 'RESET PROGRESS', value: '', k: 'reset' },
      { label: 'BACK', k: 'back' },
    ];
  }
  change(it, d) {
    if (it.k === 'fs') { toggleFullscreen(); return; }
    if (!it.vals) return;
    const cur = typeof it.vals[0] === 'string' ? it.vals.indexOf(Settings[it.k]) : it.vals.findIndex(v => Math.abs((typeof v === 'number' ? v : v ? 1 : 0) - (typeof Settings[it.k] === 'number' ? Settings[it.k] : Settings[it.k] ? 1 : 0)) < 0.01);
    let i = (cur < 0 ? 0 : cur) + d;
    if (typeof it.vals[0] === 'number' && (it.k === 'sfx' || it.k === 'music')) i = clamp(i, 0, it.vals.length - 1);
    else i = (i + it.vals.length) % it.vals.length;
    Settings[it.k] = it.vals[i];
    saveSettings(); Sound.applyVolume();
    if (it.k === 'graphics') { for (const k in STAGES) STAGES[k]._cache = null; if (window.TF_applyGraphics) window.TF_applyGraphics(); }
    Sound.play('cursor');
  }
  update() {
    this.t++;
    const items = this.items(), n = items.length;
    if (Input.menuY()) { this.sel = (this.sel + Input.menuY() + n) % n; Sound.play('cursor'); }
    const it = items[this.sel];
    if (Input.menuX()) this.change(it, Input.menuX());
    if (Input.back()) { Sound.play('back'); this.back(); return; }
    if (Input.confirm()) {
      if (it.k === 'back') { Sound.play('back'); this.back(); return; }
      if (it.k === 'reset') {
        if (this.confirmReset) { Progress.cleared = {}; Progress.unlockedBoss = false; Progress.wins = 0; Progress.losses = 0; saveProgress(); this.confirmReset = false; Sound.play('confirm'); }
        else { this.confirmReset = true; Sound.play('cursor'); }
        return;
      }
      this.change(it, 1);
    }
    if (it.k !== 'reset') this.confirmReset = false;
  }
  draw(ctx) {
    drawMenuBg(ctx, this.t);
    txt(ctx, 'OPTIONS', W / 2, 60, { size: 44, align: 'center', color: '#fff', stroke: '#000', sw: 8, italic: true });
    const items = this.items().map(i => i.k === 'reset' && this.confirmReset ? Object.assign({}, i, { value: 'PRESS AGAIN TO CONFIRM' }) : i);
    menuList(ctx, items, this.sel, W / 2 - 150, 100, { gap: 32, w: 560, valueX: 330, arrows: true });
    controlsHint(ctx, 'Up/Down: select · Left/Right: change · Esc: back');
  }
}

// ============ HOW TO PLAY / MOVE LIST ============
class HowToScene {
  constructor(back, def, overlay) {
    this.back = back; this.t = 0; this.overlay = overlay;
    this.pages = ['CONTROLS', 'BASICS'].concat(ROSTER.filter(c => !c.boss || Progress.unlockedBoss).map(c => c.id));
    this.page = def ? this.pages.indexOf(def.id) : 0;
  }
  update() {
    this.t++;
    if (Input.menuX()) { this.page = (this.page + Input.menuX() + this.pages.length) % this.pages.length; Sound.play('cursor'); }
    if (Input.back() || Input.confirm() || Input.pressed('start')) { Sound.play('back'); this.back(); }
  }
  draw(ctx) {
    if (!this.overlay) drawMenuBg(ctx, this.t);
    const pg = this.pages[this.page];
    panel(ctx, 40, 30, W - 80, H - 70);
    txt(ctx, '◀', 64, 66, { size: 22, color: '#FFC233', font: FONT_UI });
    txt(ctx, '▶', W - 64, 66, { size: 22, align: 'right', color: '#FFC233', font: FONT_UI });
    txt(ctx, `${this.page + 1} / ${this.pages.length}`, W / 2, H - 52, { size: 12, align: 'center', color: '#999', font: FONT_UI, weight: 700 });
    const row = (a, b, y, ca) => { txt(ctx, a, 90, y, { size: 16, color: ca || '#FFE9A8', font: FONT_UI, weight: 800 }); txt(ctx, b, 380, y, { size: 16, color: '#fff', font: FONT_UI, weight: 600 }); };
    if (pg === 'CONTROLS') {
      txt(ctx, 'CONTROLS', W / 2, 72, { size: 34, align: 'center', color: '#fff', stroke: '#000', sw: 6, italic: true });
      const rows = [
        ['Move / Jump / Crouch', 'WASD  or  Arrow keys  ·  D-pad / Left stick'],
        ['Light Punch  (LP)', 'U  or  Z  ·  Pad X / □'],
        ['Heavy Punch  (HP)', 'I  or  X  ·  Pad Y / △'],
        ['Light Kick  (LK)', 'J  or  C  ·  Pad A / ✕'],
        ['Heavy Kick  (HK)', 'K  or  V  ·  Pad B / ○'],
        ['Special (easy specials)', 'L, B, O, Shift  ·  Pad bumpers / triggers'],
        ['Pause', 'Esc  or  Enter  ·  Pad Start'],
        ['Fullscreen', 'F'],
        ['Menus', 'Arrows + Enter (or U / J)  ·  Esc to go back'],
      ];
      rows.forEach((r, i) => row(r[0], r[1], 120 + i * 34));
      txt(ctx, 'Tip: press ◀ ▶ to flip through system basics and every move list.', W / 2, 440, { size: 14, align: 'center', color: '#BFB8E8', font: FONT_UI, weight: 600 });
    } else if (pg === 'BASICS') {
      txt(ctx, 'SYSTEM BASICS', W / 2, 72, { size: 34, align: 'center', color: '#fff', stroke: '#000', sw: 6, italic: true });
      const rows = [
        ['Block', 'Hold AWAY from your opponent. Hold down-away to block lows.'],
        ['Highs & lows', 'Sweeps/low kicks must be crouch-blocked; jump-ins must be stand-blocked.'],
        ['Throw', 'Close up: Forward or Back + HP. Tech a throw by pressing HP right away.'],
        ['Dash', 'Double-tap forward or back. Back-dash is briefly invincible.'],
        ['Chains', 'Light attacks chain into lights or heavies on contact.'],
        ['Cancels', 'Normals (not heavy kicks) cancel into specials; specials cancel into Super.'],
        ['Super Art', 'When the meter is full: ↓↘→↓↘→ + Punch, or Down + SP.'],
        ['Easy specials', 'SP alone = projectile · Fwd+SP = anti-air · Back+SP = rush (85% dmg).'],
        ['Counter hits', 'Hit someone during their startup for bonus damage and stun.'],
        ['Chip', 'Blocked specials still deal a little damage.'],
      ];
      rows.forEach((r, i) => { txt(ctx, r[0], 90, 116 + i * 33, { size: 16, color: '#FFE9A8', font: FONT_UI, weight: 800 }); txt(ctx, r[1], 250, 116 + i * 33, { size: 15, color: '#fff', font: FONT_UI, weight: 600 }); });
    } else {
      const d = CHARS[pg];
      ctx.save(); ctx.translate(800, 400); ctx.scale(1.15, 1.15);
      drawFighterRig(ctx, d, 0, 0, -1, idlePose(this.t, d), { t: this.t, groundY: 0 });
      ctx.restore();
      txt(ctx, d.name, 90, 82, { size: 36, color: '#fff', stroke: '#000', sw: 6, italic: true });
      txt(ctx, d.title.toUpperCase() + '  ·  ' + d.archetype + '  ·  ' + d.styleName, 92, 104, { size: 14, color: d.color, font: FONT_UI, weight: 900 });
      const sp = d.specials;
      const kindNote = { proj: 'Projectile', rise: 'Invincible anti-air', spin: 'Multi-hit advancing kick', flash: 'Lightning dash kick', dive: 'Overhead flying knee', slide: 'Low slide (crouch-block!)', roll: 'Rolling multi-hit', claw: 'Rapid claw flurry', teleport: 'Teleport (LK front · HK behind)', cmdgrab: 'Unblockable command grab', beam: 'Full-screen beam', rushsuper: 'Rushing cinematic combo', rain: 'Star rain from above', tsunami: 'Giant multi-hit wave' };
      const rows = [
        [sp.qcf.name, '↓ ↘ → + P', kindNote[sp.qcf.kind] + (sp.qcf.twin ? ' (fires two)' : '')],
        [sp.dp.name, '→ ↓ ↘ + P', kindNote[sp.dp.kind]],
        [sp.qcb.name, '↓ ↙ ← + K', kindNote[sp.qcb.kind]],
        [sp.super.name + '  (SUPER)', '↓↘→ ↓↘→ + P', kindNote[sp.super.kind]],
        ['Throw', '→ or ← + HP', 'Close range, unblockable'],
      ];
      txt(ctx, 'SPECIAL MOVES', 90, 146, { size: 14, color: '#BFB8E8', font: FONT_UI, weight: 900 });
      rows.forEach((r, i) => {
        const y = 178 + i * 52;
        txt(ctx, r[0], 90, y, { size: 18, color: i === 3 ? '#FFE14D' : '#fff', font: FONT_UI, weight: 900 });
        txt(ctx, r[1], 90, y + 20, { size: 15, color: '#FFC233', font: FONT_UI, weight: 800 });
        txt(ctx, r[2], 250, y + 20, { size: 14, color: '#cfcfe8', font: FONT_UI, weight: 600 });
      });
      txt(ctx, 'Easy mode: SP · Fwd+SP · Back+SP · Down+SP (super)', 90, 450, { size: 13, color: '#9a94c8', font: FONT_UI, weight: 700 });
    }
    controlsHint(ctx, '◀ ▶ change page · Esc / Enter: back', H - 14);
  }
}

// ---------- fullscreen helpers ----------
function isFullscreen() { try { return !!document.fullscreenElement; } catch (e) { return false; } }
function toggleFullscreen() {
  try {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
    else document.exitFullscreen().catch(() => {});
  } catch (e) { /* ignore */ }
}

'use strict';
// ---------- Synthesized audio: SFX, procedural music, announcer ----------
const Sound = (() => {
  let ac = null, master, sfxBus, musBus, noiseBuf, comp;
  const hasWindow = typeof window !== 'undefined';

  function init() {
    if (!hasWindow) return;
    if (ac) { if (ac.state === 'suspended') ac.resume().catch(() => {}); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      ac = new AC();
      master = ac.createGain(); master.gain.value = 0.9;
      comp = ac.createDynamicsCompressor();
      comp.threshold.value = -14; comp.ratio.value = 4;
      master.connect(comp); comp.connect(ac.destination);
      sfxBus = ac.createGain(); musBus = ac.createGain();
      sfxBus.connect(master); musBus.connect(master);
      applyVolume();
      const len = ac.sampleRate * 2;
      noiseBuf = ac.createBuffer(1, len, ac.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      if (pendingSong) { const s = pendingSong; pendingSong = null; playMusic(s); }
    } catch (e) { ac = null; }
  }
  function applyVolume() {
    if (!ac) return;
    sfxBus.gain.value = Settings.sfx;
    musBus.gain.value = Settings.music * 0.5;
  }

  function tone(o) {
    if (!ac) return;
    const t = (o.at || ac.currentTime) + (o.delay || 0);
    const dur = o.dur || 0.1;
    const osc = ac.createOscillator(), g = ac.createGain();
    osc.type = o.type || 'square';
    osc.frequency.setValueAtTime(o.f || 440, t);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.f2), t + dur);
    if (o.detune) osc.detune.value = o.detune;
    const v = Math.max(0.0002, o.vol == null ? 0.2 : o.vol);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + (o.atk || 0.004));
    if (o.hold) g.gain.setValueAtTime(v, t + o.hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node = osc;
    if (o.lp) { const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp; osc.connect(f); node = f; }
    node.connect(g); g.connect(o.bus || sfxBus);
    osc.start(t); osc.stop(t + dur + 0.03);
  }
  function noise(o) {
    if (!ac) return;
    const t = (o.at || ac.currentTime) + (o.delay || 0);
    const dur = o.dur || 0.1;
    const src = ac.createBufferSource(); src.buffer = noiseBuf;
    const f = ac.createBiquadFilter(); f.type = o.ft || 'lowpass';
    f.frequency.setValueAtTime(o.f || 2000, t);
    if (o.f2) f.frequency.exponentialRampToValueAtTime(o.f2, t + dur);
    f.Q.value = o.q || 1;
    const g = ac.createGain();
    const v = Math.max(0.0002, o.vol == null ? 0.3 : o.vol);
    g.gain.setValueAtTime(v, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(o.bus || sfxBus);
    src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.03);
  }

  const sfx = {
    light() { noise({ dur: .09, vol: .55, f: 3500, f2: 800 }); tone({ type: 'square', f: 260, f2: 90, dur: .07, vol: .18 }); },
    heavy() { noise({ dur: .2, vol: .8, f: 2200, f2: 300 }); tone({ type: 'sine', f: 170, f2: 38, dur: .28, vol: .7 }); tone({ type: 'square', f: 120, f2: 50, dur: .12, vol: .15 }); },
    special() { noise({ dur: .25, vol: .8, f: 4000, f2: 400 }); tone({ type: 'sawtooth', f: 400, f2: 60, dur: .3, vol: .3, lp: 2000 }); tone({ type: 'sine', f: 140, f2: 30, dur: .35, vol: .7 }); },
    block() { tone({ type: 'square', f: 1200, f2: 700, dur: .05, vol: .12 }); noise({ dur: .06, vol: .35, f: 5000, ft: 'highpass' }); },
    whiff() { noise({ dur: .13, vol: .22, f: 1600, f2: 500, ft: 'bandpass', q: 2 }); },
    whiffH() { noise({ dur: .2, vol: .3, f: 1000, f2: 250, ft: 'bandpass', q: 2 }); },
    jump() { tone({ type: 'sine', f: 220, f2: 420, dur: .1, vol: .12 }); },
    land() { noise({ dur: .07, vol: .25, f: 600 }); },
    dash() { noise({ dur: .18, vol: .3, f: 3000, f2: 600, ft: 'bandpass' }); },
    proj() { tone({ type: 'sawtooth', f: 180, f2: 700, dur: .18, vol: .2, lp: 3000 }); noise({ dur: .25, vol: .35, f: 2500, f2: 900, ft: 'bandpass' }); },
    rise() { tone({ type: 'square', f: 200, f2: 900, dur: .2, vol: .18 }); noise({ dur: .2, vol: .3, f: 1500, f2: 4000, ft: 'bandpass' }); },
    super() {
      tone({ type: 'sawtooth', f: 110, f2: 880, dur: .6, vol: .3, lp: 3000 });
      tone({ type: 'square', f: 220, f2: 1760, dur: .6, vol: .12, delay: .05 });
      noise({ dur: .7, vol: .4, f: 500, f2: 6000, ft: 'bandpass' });
    },
    beam() { tone({ type: 'sawtooth', f: 90, dur: .8, vol: .25, lp: 900, hold: .5 }); noise({ dur: .8, vol: .3, f: 1200, ft: 'bandpass', hold: .5 }); },
    ko() { tone({ type: 'sine', f: 120, f2: 30, dur: 1.2, vol: .8 }); noise({ dur: 1.0, vol: .6, f: 1500, f2: 100 }); },
    throw() { noise({ dur: .15, vol: .4, f: 900 }); tone({ type: 'sine', f: 90, f2: 40, dur: .3, vol: .6, delay: .05 }); },
    grab() { tone({ type: 'square', f: 300, f2: 150, dur: .08, vol: .15 }); },
    tele() { tone({ type: 'sine', f: 1200, f2: 200, dur: .2, vol: .15 }); tone({ type: 'sine', f: 200, f2: 1600, dur: .2, vol: .15, delay: .18 }); },
    counter() { tone({ type: 'square', f: 880, dur: .06, vol: .12 }); tone({ type: 'square', f: 1320, dur: .1, vol: .12, delay: .06 }); },
    cursor() { tone({ type: 'square', f: 660, dur: .04, vol: .08 }); },
    confirm() { tone({ type: 'square', f: 523, dur: .07, vol: .12 }); tone({ type: 'square', f: 1046, dur: .12, vol: .12, delay: .07 }); },
    back() { tone({ type: 'square', f: 440, f2: 220, dur: .1, vol: .1 }); },
    tick() { tone({ type: 'triangle', f: 1000, dur: .03, vol: .1 }); },
    pause() { tone({ type: 'triangle', f: 700, dur: .06, vol: .15 }); tone({ type: 'triangle', f: 500, dur: .08, vol: .15, delay: .06 }); },
    win() { [523, 659, 784, 1046].forEach((f, i) => tone({ type: 'square', f, dur: .18, vol: .12, delay: i * .1 })); tone({ type: 'square', f: 1046, dur: .5, vol: .12, delay: .4 }); },
    lose() { [392, 349, 311, 262].forEach((f, i) => tone({ type: 'triangle', f, dur: .3, vol: .18, delay: i * .18 })); },
    bell() { tone({ type: 'sine', f: 1568, dur: 1, vol: .18 }); tone({ type: 'sine', f: 2349, dur: .8, vol: .08 }); },
  };
  function play(name) { if (!ac) return; const f = sfx[name]; if (f) try { f(); } catch (e) { /* ignore */ } }

  // ---------- Procedural music ----------
  const NOTE = n => 440 * Math.pow(2, (n - 69) / 12);
  const MINOR = [0, 2, 3, 5, 7, 8, 10];
  const DORIAN = [0, 2, 3, 5, 7, 9, 10];
  const PHRYG = [0, 1, 3, 5, 7, 8, 10];
  const MAJOR = [0, 2, 4, 5, 7, 9, 11];
  function makeSong(seed, o) {
    const r = seededRng(seed);
    const scale = o.scale || MINOR;
    const prog = o.prog || [0, 5, 2, 6];
    const melody = [];
    let deg = 4;
    for (let i = 0; i < 32; i++) {
      if (r() < (o.density || 0.55) || i % 8 === 0) {
        deg += Math.floor(r() * 5) - 2;
        deg = clamp(deg, 0, 11);
        melody.push(deg);
      } else melody.push(null);
    }
    return {
      bpm: o.bpm || 140, root: o.root || 57, scale, prog, melody,
      kick: o.kick || [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0],
      snare: o.snare || [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1],
      hat: o.hat || [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0],
      bass: o.bass || [1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 2, 1],
      lead: o.lead || 'square', bassType: o.bassType || 'sawtooth', arp: o.arp !== false,
      leadVol: o.leadVol || 0.07,
    };
  }
  const SONGS = {
    title: makeSong(7, { bpm: 112, root: 50, prog: [0, 5, 3, 4], density: .4, kick: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0], snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0], lead: 'sawtooth', leadVol: .05 }),
    select: makeSong(21, { bpm: 128, root: 53, scale: DORIAN, prog: [0, 3, 0, 4], density: .5 }),
    claude: makeSong(101, { bpm: 132, root: 52, prog: [0, 5, 2, 6], scale: DORIAN, lead: 'triangle', leadVol: .1 }),
    gpt: makeSong(202, { bpm: 146, root: 55, prog: [0, 6, 5, 6], lead: 'square' }),
    gemini: makeSong(303, { bpm: 150, root: 57, prog: [0, 2, 5, 4], scale: DORIAN, lead: 'triangle', leadVol: .1 }),
    grok: makeSong(404, { bpm: 160, root: 52, prog: [0, 1, 0, 6], scale: PHRYG, lead: 'sawtooth', bassType: 'square', leadVol: .05 }),
    muse: makeSong(505, { bpm: 124, root: 56, prog: [0, 5, 3, 6], lead: 'triangle', leadVol: .1, snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0] }),
    copilot: makeSong(606, { bpm: 138, root: 55, prog: [0, 3, 4, 4], scale: MAJOR, lead: 'square', leadVol: .06 }),
    deepseek: makeSong(707, { bpm: 118, root: 45, prog: [0, 5, 6, 4], lead: 'triangle', leadVol: .1, density: .45 }),
    lechat: makeSong(808, { bpm: 152, root: 58, prog: [0, 3, 4, 0], scale: MAJOR, lead: 'square', leadVol: .06, density: .65 }),
    agi: makeSong(909, { bpm: 170, root: 49, prog: [0, 1, 6, 1], scale: PHRYG, lead: 'sawtooth', bassType: 'sawtooth', leadVol: .05, density: .6 }),
    ending: makeSong(1001, { bpm: 100, root: 55, prog: [0, 4, 5, 3], scale: MAJOR, lead: 'triangle', leadVol: .1, density: .5, kick: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0] }),
  };
  let song = null, songName = null, step = 0, nextT = 0, timer = null, pendingSong = null;

  function playMusic(name) {
    if (songName === name && timer) return;
    stopMusic();
    if (!ac) { pendingSong = name; return; }
    song = SONGS[name]; songName = name;
    if (!song) return;
    step = 0; nextT = ac.currentTime + 0.08;
    timer = setInterval(schedule, 25);
  }
  function stopMusic() { if (timer) clearInterval(timer); timer = null; song = null; songName = null; pendingSong = null; }
  function schedule() {
    if (!ac || !song) return;
    const spb = 60 / song.bpm / 4;
    while (nextT < ac.currentTime + 0.12) { playStep(step, nextT, spb); step++; nextT += spb; }
  }
  function degNote(s, deg) { const oct = Math.floor(deg / 7); return s.root + s.scale[((deg % 7) + 7) % 7] + oct * 12; }
  function playStep(i, t, spb) {
    const s = song, st = i % 16, bar = Math.floor(i / 16);
    const chord = s.prog[bar % s.prog.length];
    if (s.kick[st]) tone({ at: t, type: 'sine', f: 150, f2: 40, dur: .16, vol: .55, bus: musBus });
    if (s.snare[st]) { noise({ at: t, dur: .13, vol: .3, f: 1800, ft: 'bandpass', bus: musBus }); tone({ at: t, type: 'triangle', f: 210, f2: 120, dur: .06, vol: .12, bus: musBus }); }
    if (s.hat[st]) noise({ at: t, dur: .03, vol: .08, f: 8000, ft: 'highpass', bus: musBus });
    const b = s.bass[st];
    if (b) {
      const n = degNote(s, chord) - 24 + (b === 2 ? 12 : 0);
      tone({ at: t, type: s.bassType, f: NOTE(n), dur: spb * 0.95, vol: .13, lp: 900, bus: musBus });
    }
    if (s.arp && st % 2 === 0) {
      const tones = [0, 2, 4, 7];
      const n = degNote(s, chord + tones[(st / 2) % 4]);
      tone({ at: t, type: 'triangle', f: NOTE(n), dur: spb * 1.5, vol: .035, bus: musBus });
    }
    // lead: 2 bar motif transposed by chord; rest on every 4th pair of bars for breathing
    if (bar % 8 < 6) {
      const m = s.melody[(i % 32)];
      if (m != null) {
        const n = degNote(s, m + (bar % 2 === 1 ? 0 : 0) + (chord % 3 === 0 ? 0 : 0)) + 12;
        tone({ at: t, type: s.lead, f: NOTE(n), dur: spb * 1.8, vol: s.leadVol, lp: 4000, bus: musBus });
      }
    }
  }

  // ---------- Announcer (speech synthesis, offline system voices) ----------
  let voice = null;
  function pickVoice() {
    try {
      const vs = window.speechSynthesis.getVoices();
      voice = vs.find(v => /en(-|_)US/i.test(v.lang) && /David|Guy|Male|Daniel|Alex/i.test(v.name)) ||
              vs.find(v => /^en/i.test(v.lang)) || null;
    } catch (e) { voice = null; }
  }
  if (hasWindow && window.speechSynthesis) {
    pickVoice();
    try { window.speechSynthesis.onvoiceschanged = pickVoice; } catch (e) { /* ignore */ }
  }
  function say(text, o = {}) {
    if (!Settings.announcer || !hasWindow || !window.speechSynthesis) return;
    try {
      const u = new SpeechSynthesisUtterance(text);
      if (voice) u.voice = voice;
      u.pitch = o.pitch == null ? 0.55 : o.pitch;
      u.rate = o.rate == null ? 1.0 : o.rate;
      u.volume = clamp(Settings.sfx * 1.1, 0, 1);
      if (!o.queue) window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch (e) { /* ignore */ }
  }

  return { init, play, playMusic, stopMusic, applyVolume, say, get ready() { return !!ac; } };
})();

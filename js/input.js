'use strict';
// ---------- Keyboard + gamepad input → logical buttons ----------
const Input = (() => {
  const KEYMAP = {
    ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
    KeyU: 'lp', KeyZ: 'lp', KeyI: 'hp', KeyX: 'hp', KeyJ: 'lk', KeyC: 'lk', KeyK: 'hk', KeyV: 'hk',
    KeyL: 'sp', KeyB: 'sp', KeyO: 'sp', ShiftLeft: 'sp', ShiftRight: 'sp',
    Enter: 'start', NumpadEnter: 'start', KeyP: 'start', Escape: 'back', Backspace: 'back', Space: 'confirm',
    KeyF: 'fullscreen', KeyH: 'hitbox', KeyM: 'mute', KeyR: 'reset',
  };
  const PADMAP = { 0: ['lk', 'padA'], 1: ['hk', 'padB'], 2: ['lp'], 3: ['hp'], 4: ['sp'], 5: ['sp'], 6: ['sp'], 7: ['sp'], 8: ['back'], 9: ['start'], 12: ['up'], 13: ['down'], 14: ['left'], 15: ['right'] };
  const keysDown = new Set();
  const tapped = new Set();
  let held = new Set(), prev = new Set(), pressed = new Set();
  let padConnected = false, lastDevice = 'keyboard';
  const repeat = { x: 0, y: 0, tx: 0, ty: 0 };

  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', e => {
      const b = KEYMAP[e.code];
      if (b) {
        if (!e.repeat) tapped.add(b);
        keysDown.add(e.code);
        lastDevice = 'keyboard';
        if (e.code !== 'F11' && !(e.ctrlKey || e.metaKey)) e.preventDefault();
      }
      if (typeof Sound !== 'undefined') Sound.init();
    });
    window.addEventListener('keyup', e => {
      keysDown.delete(e.code);
    });
    window.addEventListener('blur', () => { keysDown.clear(); });
    window.addEventListener('gamepadconnected', () => { padConnected = true; });
    window.addEventListener('pointerdown', () => { if (typeof Sound !== 'undefined') Sound.init(); });
  }

  function poll() {
    prev = held;
    held = new Set();
    for (const c of keysDown) { const b = KEYMAP[c] || c; held.add(b); }
    // gamepads
    let pads = [];
    try { pads = (navigator.getGamepads && navigator.getGamepads()) || []; } catch (e) { pads = []; }
    for (const p of pads) {
      if (!p || !p.connected) continue;
      padConnected = true;
      p.buttons.forEach((btn, i) => {
        if ((btn.pressed || btn.value > 0.5) && PADMAP[i]) { PADMAP[i].forEach(b => held.add(b)); lastDevice = 'gamepad'; }
      });
      const ax = p.axes[0] || 0, ay = p.axes[1] || 0;
      if (ax < -0.5) held.add('left');
      if (ax > 0.5) held.add('right');
      if (ay < -0.5) held.add('up');
      if (ay > 0.5) held.add('down');
      if (Math.abs(ax) > .5 || Math.abs(ay) > .5) lastDevice = 'gamepad';
    }
    // a key tapped and released between two frames still counts as held for this frame
    for (const b of tapped) held.add(b);
    pressed = new Set();
    for (const b of held) if (!prev.has(b)) pressed.add(b);
    for (const b of tapped) pressed.add(b);
    tapped.clear();
    // menu repeat
    const x = (held.has('right') ? 1 : 0) - (held.has('left') ? 1 : 0);
    const y = (held.has('down') ? 1 : 0) - (held.has('up') ? 1 : 0);
    repeat.x = 0; repeat.y = 0;
    if (x !== 0) { if (pressed.has('left') || pressed.has('right')) { repeat.x = x; repeat.tx = 0; } else if (++repeat.tx > 16 && repeat.tx % 5 === 0) repeat.x = x; } else repeat.tx = 0;
    if (y !== 0) { if (pressed.has('up') || pressed.has('down')) { repeat.y = y; repeat.ty = 0; } else if (++repeat.ty > 16 && repeat.ty % 5 === 0) repeat.y = y; } else repeat.ty = 0;
  }

  return {
    poll,
    held: b => held.has(b),
    pressed: b => pressed.has(b),
    any: () => pressed.size > 0,
    menuX: () => repeat.x,
    menuY: () => repeat.y,
    confirm: () => pressed.has('start') || pressed.has('confirm') || pressed.has('lp') || pressed.has('lk') || pressed.has('padA'),
    back: () => pressed.has('back') || pressed.has('padB'),
    get device() { return lastDevice; },
    get padConnected() { return padConnected; },
    // simulate (used by tests)
    _inject(b, down) { if (down) { keysDown.add(b); tapped.add(b); } else keysDown.delete(b); },
    // raw fighting state for player one
    fightState() {
      return {
        up: held.has('up'), down: held.has('down'), left: held.has('left'), right: held.has('right'),
        press: { lp: pressed.has('lp'), hp: pressed.has('hp'), lk: pressed.has('lk'), hk: pressed.has('hk'), sp: pressed.has('sp') },
        hold: { lp: held.has('lp'), hp: held.has('hp'), lk: held.has('lk'), hk: held.has('hk'), sp: held.has('sp') },
      };
    },
  };
})();

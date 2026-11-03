// Browser playtest helpers (inject with: s=document.createElement('script');s.src='tests/bh.js';document.body.appendChild(s))
window.T = {};
T.new = (a, b, mode) => { Game.go(new FightScene(CHARS[a], CHARS[b], CHARS[b].stage, { mode: mode || 'training' })); T.sc = Game.scene; T.p = T.sc.fighters[0]; T.d = T.sc.fighters[1]; return T.sc.phase; };
T.step = n => { for (let i = 0; i < n; i++) { Input.poll(); T.sc.update(); } };
T.all = ['up', 'down', 'left', 'right', 'lp', 'hp', 'lk', 'hk', 'sp'];
T.seq = list => {
  const log = [];
  for (const [keys, n] of list) {
    for (const k of T.all) Input._inject(k, keys.includes(k));
    for (let i = 0; i < n; i++) { Input.poll(); T.sc.update(); log.push(T.p.state + (T.p.move ? ':' + T.p.move.key : '')); }
  }
  for (const k of T.all) Input._inject(k, false);
  const out = []; for (const l of log) if (out[out.length - 1] !== l) out.push(l);
  return out.join(' > ');
};
T.place = (gap) => { T.p.x = 700; T.d.x = 700 + gap; T.sc.camX = 700 - 480; T.p.facing = 1; T.d.facing = -1; };
'helpers loaded';

'use strict';
// ---------- Fighting styles ----------
// Each style gives a fighter its own stance, walk, guard and attack animations (pose overrides),
// plus frame-data changes (speed, reach, damage) so every character plays differently.
// Pose angles: limbs [upper, lower] from straight down, positive = toward the facing direction.
const S_ = P; // shorthand

const STYLES = {
  // ---- Karate: balanced, textbook (the shared pose library is already karate) ----
  karate: { label: 'KARATE', poses: {}, normals: {} },

  // ---- Zoning: upright, lecturing palm out, other hand behind the back; long slow pokes ----
  zoner: {
    label: 'LONG-RANGE ZONING',
    idle: { rate: 0.06 }, walk: { amp: 16, lift: 16, rate: 0.85, sway: 1 },
    poses: {
      stance: S_({ lean: 2, head: -6, fa: [80, 96], ba: [-26, 28], fl: [16, -2], bl: [-12, -6] }),
      crouch: S_({ lean: 24, head: -10, fa: [82, 96], ba: [-10, 40], fl: [82, -8], bl: [25, -95] }),
      block: S_({ lean: -6, head: 8, fa: [70, 172], ba: [55, 175], fl: [16, 0], bl: [-14, -8] }),
      jab: [S_({ lean: 2, fa: [60, 120], ba: [-26, 28] }), S_({ lean: 8, head: -6, fa: [94, 92], ba: [-26, 28], fl: [18, 0], bl: [-14, -8] })],
      straight: [S_({ lean: -4, fa: [150, 170], ba: [-26, 28] }), S_({ lean: 18, head: -8, fa: [100, 98], ba: [-30, 20], fl: [28, 4], bl: [-26, -16] })],
      lkick: [S_({ lean: 0, fl: [60, -10], fa: [80, 96], ba: [-26, 28] }), S_({ lean: -10, fl: [72, 76], bl: [-8, -6], fa: [80, 96], ba: [-26, 28] })],
      hkick: [S_({ lean: -6, fl: [100, 0], fa: [80, 96], ba: [-26, 28] }), S_({ lean: -24, head: 8, fl: [118, 118], bl: [-12, -8], fa: [60, 110], ba: [-30, 20] })],
      fireball: [S_({ lean: -6, fa: [130, 160], ba: [-26, 28] }), S_({ lean: 12, head: -8, fa: [96, 92], ba: [-26, 28], fl: [26, 2], bl: [-24, -14] })],
    },
    normals: {
      sLP: { su: 5, box: [24, -152, 84, 24], dmg: 30 },
      sHP: { su: 8, box: [24, -150, 112, 30], dmg: 80, hs: 20 },
      sLK: { su: 6, box: [20, -70, 104, 28], dmg: 38 },
      sHK: { su: 10, box: [20, -178, 118, 36], dmg: 88 },
      cLK: { box: [24, -28, 92, 26] }, cHK: { su: 9, box: [24, -28, 122, 28] },
    },
  },

  // ---- Whale karate: heavy, planted karate. Fists high, big chambered kicks, full-body palm blasts ----
  whale: {
    label: 'WHALE KARATE',
    idle: { rate: 0.07, bob: 2 }, walk: { amp: 16, lift: 14, rate: 0.8, sway: 3, bob: 2 },
    poses: {
      // near fist guarding the belly, far fist forward at chest height, wide planted base
      stance: S_({ lean: 8, head: -4, fa: [70, 140], ba: [-30, 126], fl: [48, -8], bl: [-48, -26] }),
      crouch: S_({ lean: 18, head: -6, fa: [58, 156], ba: [40, 162], fl: [82, -8], bl: [25, -95] }),
      block: S_({ lean: -6, head: 8, fa: [72, 170], ba: [58, 175], fl: [30, 0], bl: [-28, -16] }),
      // low kick to the shin
      lkick: [S_({ lean: 4, fl: [60, -20], fa: [52, 150], ba: [34, 158] }), S_({ lean: -4, fl: [64, 76], bl: [-10, -10], fa: [52, 150], ba: [30, 140] })],
      // chambered high roundhouse
      hkick: [S_({ lean: -8, fl: [100, -10], fa: [60, 150], ba: [30, 150] }), S_({ lean: -28, head: 10, fl: [128, 124], bl: [-14, -8], fa: [40, 120], ba: [-40, 10] })],
      // twin-palm blast
      fireball: [S_({ lean: -10, head: 4, fa: [-30, 40], ba: [-40, 30], fl: [32, 4], bl: [-30, -20] }), S_({ lean: 14, head: -6, fa: [90, 90], ba: [84, 86], fl: [42, 8], bl: [-40, -28] })],
      win: S_({ lean: -4, head: -10, fa: [170, 175], ba: [40, 150], fl: [18, 0], bl: [-16, -4] }),
      taunt: S_({ lean: 30, head: 14, fa: [40, 120], ba: [30, 120], fl: [16, 0], bl: [-14, -6] }),
    },
    normals: {
      sLP: { box: [24, -160, 92, 28] },
      sHP: { su: 9, dmg: 92, box: [30, -185, 92, 50] },
      sLK: { guard: 'low', box: [20, -44, 104, 34], dmg: 44 },
      sHK: { su: 11, dmg: 96, box: [16, -200, 112, 90], push: 12 },
      cHK: { su: 10, box: [20, -32, 132, 32] },
    },
  },

  // ---- Taekwondo: side-on, hands low, long fast kicks ----
  taekwondo: {
    label: 'TAEKWONDO',
    idle: { rate: 0.18, bob: 4 }, walk: { amp: 18, lift: 18, bob: 2, rate: 1.2 },
    poses: {
      stance: S_({ lean: 0, head: -4, fa: [28, 112], ba: [8, 96], fl: [30, 0], bl: [-28, -14] }),
      jab: [S_({ lean: 2, fa: [60, 150] }), S_({ lean: 6, head: -4, fa: [86, 100], ba: [8, 96], fl: [32, 0], bl: [-28, -14] })],
      lkick: [S_({ lean: -6, fl: [100, -10], fa: [28, 112], ba: [8, 96], bl: [-8, -8] }), S_({ lean: -14, head: 4, fl: [108, 110], bl: [-6, -6], fa: [20, 100], ba: [-14, 60] })],
      hkick: [S_({ lean: -22, head: 6, fl: [176, 174], bl: [-8, -6], fa: [40, 100], ba: [-30, 20] }), S_({ lean: -6, head: -4, fl: [92, 96], bl: [-10, -8], fa: [30, 110], ba: [-20, 40] })],
      ahkick: [S_({ lean: -4, fl: [70, -40], bl: [30, -60], fit: 0 }), S_({ lean: -24, head: 8, fl: [98, 98], bl: [-30, -80], fa: [30, 100], ba: [-20, 20], fit: 0 })],
    },
    normals: {
      sLP: { dmg: 26 }, sHP: { dmg: 72 },
      sLK: { su: 4, box: [22, -150, 88, 28], dmg: 44 },
      sHK: { su: 11, box: [20, -185, 96, 44], dmg: 94, hs: 22 },
      jHK: { box: [16, -80, 96, 40] },
    },
  },

  // ---- Street brawler: hunched, loose arms, haymakers, big boot ----
  brawler: {
    label: 'STREET BRAWLER',
    idle: { rate: 0.06 }, walk: { amp: 18, sway: 4, rate: 0.85 },
    poses: {
      stance: S_({ lean: 24, head: -12, fa: [24, 70], ba: [2, 44], fl: [32, 0], bl: [-30, -14] }),
      crouch: S_({ lean: 34, head: -4, fa: [40, 60], ba: [20, 40], fl: [84, -10], bl: [25, -95] }),
      jab: [S_({ lean: 22, fa: [60, 170] }), S_({ lean: 28, head: -2, fa: [100, 96], ba: [0, 40], fl: [34, 0], bl: [-30, -14] })],
      straight: [S_({ lean: 2, head: 2, ba: [-70, 30], fa: [20, 60], fl: [24, 0], bl: [-28, -16] }), S_({ lean: 40, head: -10, ba: [104, 98], fa: [10, 40], fl: [46, 8], bl: [-42, -32] })],
      hkick: [S_({ lean: 6, fl: [92, -30], fa: [30, 80], ba: [0, 40] }), S_({ lean: -20, head: 10, fl: [92, 90], bl: [-14, -8], fa: [50, 110], ba: [-30, 20] })],
    },
    normals: {
      sLP: { su: 5, dmg: 34 }, sHP: { su: 9, dmg: 102, hs: 22, push: 9 },
      sHK: { box: [20, -128, 92, 40], push: 15, dmg: 88 },
    },
  },

  // ---- Plush: bouncy belly bumps, paw bops and butt bounces ----
  plush: {
    label: 'PLUSH POWER',
    idle: { rate: 0.12, bob: 4 }, walk: { amp: 14, lift: 10, bob: 6, rate: 1.1, sway: 4 },
    poses: {
      stance: S_({ lean: 0, head: 0, fa: [14, 22], ba: [8, 16], fl: [10, 0], bl: [-10, 0] }),
      crouch: S_({ lean: 6, head: 4, fa: [50, 70], ba: [40, 60], fl: [80, -60], bl: [40, -100], dy: 6 }),
      block: S_({ lean: -8, head: 10, fa: [100, 150], ba: [90, 150], fl: [12, 0], bl: [-14, 0] }),
      cblock: S_({ lean: 2, head: 6, fa: [100, 150], ba: [90, 150], fl: [80, -60], bl: [40, -100], dy: 6 }),
      jab: [S_({ lean: -4, fa: [60, 120], ba: [24, 40] }), S_({ lean: 8, head: -4, fa: [96, 96], ba: [20, 40], dx: 6 })],
      // Bum Bump: turn around, bend over, bump
      straight: [S_({ lean: 24, head: -24, fa: [30, 40], ba: [20, 30], fl: [16, 0], bl: [-16, 0], dx: 4 }), S_({ lean: 52, head: -40, fa: [60, 60], ba: [50, 50], fl: [20, 0], bl: [-34, -20], dx: -26 })],
      lkick: [S_({ lean: -4, fl: [60, 20] }), S_({ lean: -12, fl: [90, 90], bl: [-8, -4], fa: [50, 70], ba: [20, 40] })],
      // Butt Bounce: hop and bounce backside-first
      hkick: [S_({ lean: 30, head: -30, fa: [100, 120], ba: [90, 120], fl: [40, -30], bl: [10, -50], dy: -14, dx: 2 }), S_({ lean: 62, head: -46, fa: [120, 130], ba: [110, 120], fl: [50, -10], bl: [0, -40], dy: -8, dx: -32 })],
      cjab: [S_({ lean: 6, fa: [60, 90], ba: [40, 60], fl: [80, -60], bl: [40, -100], dy: 6 }), S_({ lean: 12, fa: [92, 92], ba: [40, 60], fl: [80, -60], bl: [40, -100], dy: 6, dx: 6 })],
      cupper: [S_({ lean: 10, fa: [40, 60], ba: [30, 50], fl: [80, -60], bl: [40, -100], dy: 6 }), S_({ lean: -14, head: -20, fa: [170, 170], ba: [160, 170], fl: [20, 0], bl: [-20, -10], dy: -16 })],
      cshort: [S_({ lean: 6, fl: [80, -60], bl: [40, -100], dy: 6 }), S_({ lean: -6, fl: [80, 84], bl: [40, -100], dy: 6 })],
      // Bum Slide: sit down and slide in bottom-first
      sweep: [S_({ lean: 10, fl: [80, -60], bl: [40, -100], dy: 6 }), S_({ lean: -34, head: 14, fa: [-30, -20], ba: [-40, -30], fl: [80, 84], bl: [70, 76], dx: -30, dy: 10 })],
      // Bum Bomb: cannonball backside-first
      knee: [S_({ lean: 20, head: -20, fa: [140, 160], ba: [130, 150], fl: [80, -40], bl: [60, -60], fit: 0 }), S_({ lean: 58, head: -40, fa: [150, 170], ba: [140, 160], fl: [90, -20], bl: [70, -40], fit: 0, dx: -18 })],
      ahkick: [S_({ lean: 20, fl: [80, -40], bl: [60, -60], fit: 0 }), S_({ lean: 56, head: -40, fa: [140, 160], ba: [130, 150], fl: [86, -20], bl: [66, -40], fit: 0, dx: -16 })],
      // Bum Rush super: charge backwards, then a flurry of bum bumps
      rushpunch: [S_({ lean: 30, head: -30, fa: [60, 70], ba: [50, 60] }), S_({ lean: 50, head: -40, fa: [80, 90], ba: [70, 80], fl: [40, 0], bl: [-40, -20], dx: -20 })],
      flurryA: S_({ lean: 54, head: -40, fa: [60, 60], ba: [50, 50], fl: [20, 0], bl: [-34, -20], dx: -24 }),
      flurryB: S_({ lean: 36, head: -30, fa: [40, 50], ba: [30, 40], fl: [16, 0], bl: [-20, -6], dx: -8 }),
      flurryC: S_({ lean: 62, head: -46, fa: [120, 130], ba: [110, 120], fl: [50, -10], bl: [0, -40], dy: -8, dx: -30 }),
      win: S_({ lean: -4, head: -10, fa: [165, 170], ba: [24, 40], fl: [14, 0], bl: [-14, 0] }),
    },
    normals: {
      sHP: { box: [10, -140, 80, 90], dmg: 84, push: 11, turn: true },
      sHK: { box: [10, -150, 98, 90], dmg: 90, su: 10, turn: true },
      cHK: { box: [14, -44, 106, 44], turn: true },
      jHK: { box: [10, -100, 80, 70], turn: true },
      cHP: { box: [-10, -230, 70, 140] },
    },
  },

  // ---- Sumo: wide, low, palm thrusts and belly charges ----
  sumo: {
    label: 'SUMO WRESTLING',
    idle: { rate: 0.05 }, walk: { amp: 10, lift: 12, rate: 0.75, sway: 3 },
    poses: {
      stance: S_({ lean: 26, head: -14, fa: [72, 100], ba: [56, 96], fl: [46, -12], bl: [-46, -12] }),
      crouch: S_({ lean: 34, head: -16, fa: [70, 90], ba: [56, 86], fl: [86, -20], bl: [20, -100] }),
      block: S_({ lean: 10, head: 6, fa: [80, 170], ba: [70, 172], fl: [44, -10], bl: [-44, -12] }),
      jab: [S_({ lean: 24, fa: [50, 140] }), S_({ lean: 34, head: -14, fa: [94, 94], ba: [56, 96], fl: [50, -8], bl: [-46, -14] })],
      straight: [S_({ lean: 16, fa: [40, 130], ba: [36, 130] }), S_({ lean: 38, head: -14, fa: [92, 92], ba: [88, 88], fl: [56, -6], bl: [-50, -16], dx: 10 })],
      lkick: [S_({ lean: 10, fl: [100, 30], fa: [72, 100], ba: [56, 96] }), S_({ lean: 26, fl: [52, 10], bl: [-46, -12], fa: [72, 100], ba: [56, 96] })],
      hkick: [S_({ lean: 10, fa: [-10, 30], ba: [-20, 20], dx: -6 }), S_({ lean: 46, head: -18, fa: [-30, 10], ba: [-40, 0], fl: [50, 0], bl: [-50, -30], dx: 20 })],
    },
    normals: {
      sLP: { su: 5, dmg: 36, box: [24, -150, 66, 30] }, sHP: { su: 8, dmg: 92, box: [24, -152, 84, 44] },
      sLK: { su: 6, dmg: 46, guard: 'low', box: [20, -40, 70, 40] },
      sHK: { su: 10, dmg: 96, box: [14, -150, 92, 100], push: 14 },
      cHK: { su: 9, dmg: 82 },
    },
  },

};

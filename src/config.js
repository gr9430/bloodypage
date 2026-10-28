(function (CD) {
  // All durations are in ticks; the simulation runs at tickRate ticks per second.
  const CONFIG = {
    width: 960,
    height: 540,
    floorY: 470,
    tickRate: 60,
    maxHp: 100,
    roundTicks: 3600,
    roundsToWin: 2,
    citeCooldownTicks: 480,
    gravity: 0.9,
    jumpVel: -17,
    walkSpeed: 4,
    stageLeft: 40,
    stageRight: 920,
    introTicks: 120,
    roundEndTicks: 150,
    // Specialty bar: filled only by landed hits; the special needs a full bar.
    meterMax: 100,
    meterHit: 10,
    meterCrit: 30,
    // Critical hits: always on a counter-hit, sometimes at random.
    critChance: 0.08,
    critMultiplier: 1.5,
  };

  // The one place to change controls. Values are KeyboardEvent.code.
  const KEYMAP = [
    { left: 'KeyA', right: 'KeyD', up: 'KeyW', down: 'KeyS', attack: 'KeyF', special: 'KeyG', cite: 'KeyH' },
    { left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', down: 'ArrowDown', attack: 'KeyK', special: 'KeyL', cite: 'Semicolon' },
  ];

  const aiLevels = ['easy', 'medium', 'hard'];

  // mulberry32: small seeded RNG, so a given seed always plays out the same.
  function makeRng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  Object.assign(CD, { CONFIG, KEYMAP, aiLevels, makeRng });
})(globalThis.CD = globalThis.CD || {});

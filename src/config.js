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
  };

  // The one place to change controls. Values are KeyboardEvent.code.
  const KEYMAP = [
    { left: 'KeyA', right: 'KeyD', up: 'KeyW', down: 'KeyS', attack: 'KeyF', special: 'KeyG', cite: 'KeyH' },
    { left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', down: 'ArrowDown', attack: 'KeyK', special: 'KeyL', cite: 'Semicolon' },
  ];

  const aiLevels = ['easy', 'medium', 'hard'];

  Object.assign(CD, { CONFIG, KEYMAP, aiLevels });
})(globalThis.CD = globalThis.CD || {});

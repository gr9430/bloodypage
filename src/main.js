(function (CD) {
  const { CONFIG, KEYMAP } = CD;
  const STEP_MS = 1000 / CONFIG.tickRate;
  const WINNER_DELAY = 120;

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const keyboard = CD.createKeyboard(window, KEYMAP);
  const audio = CD.createAudio();
  window.addEventListener('keydown', () => audio.unlock());

  const game = {
    screen: 'menu',
    menu: CD.createMenuState(),
    match: null,
    ai: null,
    pause: null,
    endTimer: 0,
    tick: 0,
  };

  // cpu is a difficulty level, or null for two players.
  function startMatch(p1, p2, cpu) {
    CD.clearRenderEvents();
    game.match = CD.createMatch(p1, p2);
    game.match.cpu = cpu;
    game.ai = cpu ? CD.createAI(() => game.match, 1, cpu, Date.now()) : null;
    game.endTimer = 0;
    game.pause = null;
    game.screen = 'fight';
  }

  function toMenu(menuState) {
    game.menu = menuState;
    game.pause = null;
    game.screen = 'menu';
  }

  function updateMenu() {
    const start = CD.stepMenu(game.menu, keyboard.pressedGlobal);
    if (start) startMatch(start.p1, start.p2, start.cpu);
  }

  function updatePause() {
    const m = game.match;
    const action = CD.stepPause(game.pause, keyboard.pressedGlobal);
    if (action === 'resume') game.pause = null;
    else if (action === 'restart') startMatch(m.fighterIds[0], m.fighterIds[1], m.cpu);
    else if (action === 'select') { CD.backToSelect(game.menu); toMenu(game.menu); }
    else if (action === 'main') toMenu(CD.createMenuState());
  }

  function updateFight() {
    if (keyboard.pressedGlobal('Escape') || keyboard.pressedGlobal('KeyP')) {
      game.pause = CD.createPauseState();
      return;
    }
    const p1 = keyboard.controllers[0].read();
    const p2 = game.ai ? game.ai.read() : keyboard.controllers[1].read();
    const events = CD.stepMatch(game.match, [p1, p2]);
    CD.tickRenderFx();
    CD.pushRenderEvents(events);
    for (const e of events) audio.play(e);
    if (game.match.phase === 'matchEnd' && ++game.endTimer >= WINNER_DELAY) game.screen = 'winner';
  }

  function updateWinner() {
    const m = game.match;
    if (keyboard.pressedGlobal('Enter')) {
      startMatch(m.fighterIds[0], m.fighterIds[1], m.cpu);
    } else if (keyboard.pressedGlobal('Escape')) {
      toMenu(CD.createMenuState());
    }
  }

  function update() {
    game.tick++;
    if (keyboard.pressedGlobal('KeyM')) audio.toggleMute();
    if (game.screen === 'menu') updateMenu();
    else if (game.screen === 'fight') game.pause ? updatePause() : updateFight();
    else updateWinner();
    keyboard.endTick();
  }

  function render() {
    if (game.screen === 'menu') {
      if (game.menu.screen === 'select') CD.renderSelect(ctx, game.menu.sel, game.tick, game.menu.cpu);
      else CD.renderMenu(ctx, game.menu, game.tick);
    } else if (game.screen === 'fight') {
      if (game.pause) CD.renderPause(ctx, game.match, game.pause, game.tick);
      else CD.renderMatch(ctx, game.match, game.tick);
    }
    else CD.renderWinner(ctx, game.match, game.tick);
    CD.drawMuteIcon(ctx, audio.muted);
  }

  // Fixed-timestep simulation, rendered once per animation frame.
  let last = performance.now(), acc = 0;
  function frame(now) {
    acc += Math.min(now - last, 250);
    last = now;
    let steps = 0;
    while (acc >= STEP_MS && steps < 5) {
      update();
      acc -= STEP_MS;
      steps++;
    }
    if (steps === 5) acc = 0;
    render();
    requestAnimationFrame(frame);
  }
  render();
  requestAnimationFrame(frame);
})(globalThis.CD = globalThis.CD || {});

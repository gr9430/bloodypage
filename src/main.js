(function (CD) {
  const { CONFIG, KEYMAP } = CD;
  const STEP_MS = 1000 / CONFIG.tickRate;
  const WINNER_DELAY = 120;
  const AUTOSTART_TICKS = 30;

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const keyboard = CD.createKeyboard(window, KEYMAP);
  const audio = CD.createAudio();
  window.addEventListener('keydown', () => audio.unlock());

  const game = {
    screen: 'select',
    sel: { cursor: [0, 1], locked: [false, false], countdown: 0 },
    match: null,
    endTimer: 0,
    tick: 0,
  };

  function startMatch(p1, p2) {
    CD.clearRenderEvents();
    game.match = CD.createMatch(p1, p2);
    game.endTimer = 0;
    game.screen = 'fight';
  }

  function toSelect() {
    game.sel.locked = [false, false];
    game.sel.countdown = 0;
    game.screen = 'select';
  }

  function updateSelect() {
    const sel = game.sel;
    const n = CD.fighterIds.length;
    for (let i = 0; i < 2; i++) {
      const km = KEYMAP[i];
      if (!sel.locked[i]) {
        if (keyboard.pressedGlobal(km.left)) sel.cursor[i] = (sel.cursor[i] + n - 1) % n;
        if (keyboard.pressedGlobal(km.right)) sel.cursor[i] = (sel.cursor[i] + 1) % n;
        if (keyboard.pressedGlobal(km.punch)) { sel.locked[i] = true; audio.play({ type: 'cite' }); }
      } else if (keyboard.pressedGlobal(km.kick)) {
        sel.locked[i] = false;
      }
    }
    if (sel.locked[0] && sel.locked[1]) {
      sel.countdown++;
      if (sel.countdown >= AUTOSTART_TICKS || keyboard.pressedGlobal('Enter')) {
        startMatch(CD.fighterIds[sel.cursor[0]], CD.fighterIds[sel.cursor[1]]);
      }
    } else {
      sel.countdown = 0;
    }
  }

  function updateFight() {
    if (keyboard.pressedGlobal('Escape')) return toSelect();
    const inputs = keyboard.controllers.map((c) => c.read());
    const events = CD.stepMatch(game.match, inputs);
    CD.pushRenderEvents(events);
    for (const e of events) audio.play(e);
    if (game.match.phase === 'matchEnd' && ++game.endTimer >= WINNER_DELAY) game.screen = 'winner';
  }

  function updateWinner() {
    if (keyboard.pressedGlobal('Enter')) startMatch(...game.match.fighterIds);
    else if (keyboard.pressedGlobal('Escape')) toSelect();
  }

  function update() {
    game.tick++;
    if (keyboard.pressedGlobal('KeyM')) audio.toggleMute();
    if (game.screen === 'select') updateSelect();
    else if (game.screen === 'fight') updateFight();
    else updateWinner();
    keyboard.endTick();
  }

  function render() {
    if (game.screen === 'select') CD.renderSelect(ctx, game.sel, game.tick);
    else if (game.screen === 'fight') CD.renderMatch(ctx, game.match, game.tick);
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

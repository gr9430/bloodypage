(function (CD) {
  // InputFrame: directions are true while held; buttons (and jump) are true
  // only on the tick the key went down. Any Controller ({ read() }) can drive
  // a fighter, keyboard or (later) AI.
  function idleInput() {
    return { left: false, right: false, down: false, jump: false, attack: false, special: false, cite: false, dashLeft: false, dashRight: false };
  }

  const GLOBAL_KEYS = ['Enter', 'Escape', 'KeyM', 'KeyP'];
  const DOUBLE_TAP_TICKS = 15;

  function createKeyboard(target, keymap) {
    const held = new Set();
    const edges = new Set();
    // Double-tapping left or right dashes: remember when each direction key
    // was last pressed, counted in sim ticks.
    let tickCount = 0;
    const lastTap = new Map();
    const dashCodes = new Map();
    keymap.forEach((km) => { dashCodes.set(km.left, 'dash:' + km.left); dashCodes.set(km.right, 'dash:' + km.right); });
    const handled = new Set(GLOBAL_KEYS);
    for (const km of keymap) for (const code of Object.values(km)) handled.add(code);

    function onDown(e) {
      if (handled.has(e.code)) e.preventDefault();
      if (e.repeat) return;
      if (!held.has(e.code)) {
        edges.add(e.code);
        if (dashCodes.has(e.code)) {
          const prev = lastTap.get(e.code);
          if (prev !== undefined && tickCount - prev <= DOUBLE_TAP_TICKS) {
            edges.add(dashCodes.get(e.code));
            lastTap.delete(e.code);
          } else {
            lastTap.set(e.code, tickCount);
          }
        }
      }
      held.add(e.code);
    }
    function onUp(e) {
      held.delete(e.code);
    }
    function onBlur() {
      held.clear();
      edges.clear();
    }
    target.addEventListener('keydown', onDown);
    target.addEventListener('keyup', onUp);
    target.addEventListener('blur', onBlur);

    const controllers = keymap.map((km) => ({
      read() {
        return {
          left: held.has(km.left),
          right: held.has(km.right),
          down: held.has(km.down),
          jump: edges.has(km.up),
          attack: edges.has(km.attack),
          special: edges.has(km.special),
          cite: edges.has(km.cite),
          dashLeft: edges.has('dash:' + km.left),
          dashRight: edges.has('dash:' + km.right),
        };
      },
    }));

    return {
      controllers,
      pressedGlobal: (code) => edges.has(code),
      endTick: () => { edges.clear(); tickCount++; },
      detach() {
        target.removeEventListener('keydown', onDown);
        target.removeEventListener('keyup', onUp);
        target.removeEventListener('blur', onBlur);
      },
    };
  }

  Object.assign(CD, { idleInput, createKeyboard });
})(globalThis.CD = globalThis.CD || {});

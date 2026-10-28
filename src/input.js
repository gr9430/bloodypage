(function (CD) {
  // InputFrame: directions are true while held; buttons (and jump) are true
  // only on the tick the key went down. Any Controller ({ read() }) can drive
  // a fighter, keyboard or (later) AI.
  function idleInput() {
    return { left: false, right: false, down: false, jump: false, punch: false, kick: false, special: false, cite: false };
  }

  const GLOBAL_KEYS = ['Enter', 'Escape', 'KeyM'];

  function createKeyboard(target, keymap) {
    const held = new Set();
    const edges = new Set();
    const handled = new Set(GLOBAL_KEYS);
    for (const km of keymap) for (const code of Object.values(km)) handled.add(code);

    function onDown(e) {
      if (handled.has(e.code)) e.preventDefault();
      if (e.repeat) return;
      if (!held.has(e.code)) edges.add(e.code);
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
          punch: edges.has(km.punch),
          kick: edges.has(km.kick),
          special: edges.has(km.special),
          cite: edges.has(km.cite),
        };
      },
    }));

    return {
      controllers,
      pressedGlobal: (code) => edges.has(code),
      endTick: () => edges.clear(),
      detach() {
        target.removeEventListener('keydown', onDown);
        target.removeEventListener('keyup', onUp);
        target.removeEventListener('blur', onBlur);
      },
    };
  }

  Object.assign(CD, { idleInput, createKeyboard });
})(globalThis.CD = globalThis.CD || {});
